import { useState, useRef, useEffect } from 'react';
import { useLocation, useSearchParams } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Mic, Square, Loader2, Save, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from '@google/genai';
import { api } from '../lib/api';
import { cn } from '../lib/utils';

export function RecordPage() {
  const [location, setLocation] = useLocation();
  const [searchParams] = useSearchParams();
  const initialPageId = searchParams.get('pageId');

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [reviewData, setReviewData] = useState<{ urduText: string; englishTranscription: string; duration: number } | null>(null);
  
  const [title, setTitle] = useState('');
  const [selectedPageId, setSelectedPageId] = useState<number | null>(initialPageId ? parseInt(initialPageId) : null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const { data: tabs = [] } = useQuery({ queryKey: ['tabs'], queryFn: api.getTabs });
  const { data: pages = [] } = useQuery({ queryKey: ['pages'], queryFn: api.getPages });

  const transcribeMutation = useMutation({
    mutationFn: async (audioBlob: Blob) => {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
      });
      reader.readAsDataURL(audioBlob);
      const base64 = await base64Promise;
      const base64Data = base64.replace(/^data:audio\/\w+;base64,/, '');

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      // 1. Transcribe to Urdu using Gemini
      const transcriptionResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: 'audio/webm',
              },
            },
            {
              text: 'Transcribe this audio exactly as spoken in Urdu. Output only the Urdu text, no other comments.',
            },
          ],
        },
      });

      const urduText = transcriptionResponse.text?.trim() || '';

      // 2. Translate to English using Gemini
      const translationResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Translate the following Urdu text to English. Output only the English translation, no other comments.\n\n${urduText}`,
      });

      const englishTranscription = translationResponse.text?.trim() || '';

      return {
        urduText,
        englishTranscription,
        duration: recordingTime,
      };
    },
    onSuccess: (data) => {
      setReviewData(data);
      setTranscribing(false);
      setTitle(`Note ${new Date().toLocaleDateString()}`);
    },
    onError: (error) => {
      console.error('Transcription error:', error);
      alert('Transcription failed');
      setTranscribing(false);
    }
  });

  const saveMutation = useMutation({
    mutationFn: api.createNote,
    onSuccess: () => {
      setLocation(selectedPageId ? `/notes?page=${selectedPageId}` : '/notes');
    }
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setTranscribing(true);
        transcribeMutation.mutate(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Microphone access is required to record notes.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSave = () => {
    if (!reviewData) return;
    saveMutation.mutate({
      title: title.trim() || 'Untitled Note',
      urduText: reviewData.urduText,
      englishTranscription: reviewData.englishTranscription,
      audioDuration: reviewData.duration,
      pageId: selectedPageId,
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] max-w-3xl mx-auto w-full">
      <AnimatePresence mode="wait">
        {!reviewData && !transcribing && (
          <motion.div
            key="record"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-8"
          >
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Capture your thoughts</h1>
              <p className="text-gray-500">Speak in Urdu, we'll transcribe and translate.</p>
            </div>

            <div className="relative flex items-center justify-center w-48 h-48">
              {isRecording && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-[#C4622D]/20"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={cn(
                  "relative z-10 flex items-center justify-center w-24 h-24 rounded-full shadow-xl transition-all duration-300",
                  isRecording ? "bg-red-500 hover:bg-red-600" : "bg-[#C4622D] hover:bg-[#A85325]"
                )}
              >
                {isRecording ? <Square className="w-8 h-8 text-white fill-current" /> : <Mic className="w-10 h-10 text-white" />}
              </button>
            </div>

            <div className="text-2xl font-mono text-gray-700">
              {formatTime(recordingTime)}
            </div>
          </motion.div>
        )}

        {transcribing && (
          <motion.div
            key="transcribing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4"
          >
            <Loader2 className="w-12 h-12 text-[#C4622D] animate-spin" />
            <p className="text-lg text-gray-600 animate-pulse">Transcribing and translating...</p>
          </motion.div>
        )}

        {reviewData && !transcribing && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-6 bg-white p-6 rounded-3xl shadow-sm border border-[#F0E8DF]"
          >
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-2xl font-bold bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-[#C4622D] focus:outline-none transition-colors w-full sm:w-auto"
                placeholder="Note Title"
              />
              
              {pages.length > 0 && (
                <div className="relative group">
                  <select
                    value={selectedPageId || ''}
                    onChange={(e) => setSelectedPageId(e.target.value ? parseInt(e.target.value) : null)}
                    className="appearance-none bg-[#F0E8DF] text-gray-700 px-4 py-2 pr-10 rounded-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#C4622D]/50 cursor-pointer"
                  >
                    <option value="">No page</option>
                    {tabs.map(tab => (
                      <optgroup key={tab.id} label={tab.name}>
                        {pages.filter(p => p.tabId === tab.id).map(page => (
                          <option key={page.id} value={page.id}>{page.title}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Urdu (Original)</h3>
                <div className="p-4 bg-[#FAF6F1] rounded-2xl min-h-[150px]">
                  <p className="text-xl leading-loose font-serif text-gray-800" dir="rtl" style={{ fontFamily: "'Noto Nastaliq Urdu', 'Gulzar', serif" }}>
                    {reviewData.urduText}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">English (Translated)</h3>
                <div className="p-4 bg-[#FAF6F1] rounded-2xl min-h-[150px]">
                  <p className="text-lg leading-relaxed text-gray-700">
                    {reviewData.englishTranscription}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#F0E8DF]">
              <button
                onClick={() => {
                  setReviewData(null);
                  setRecordingTime(0);
                }}
                className="px-6 py-2 rounded-full text-gray-600 hover:bg-gray-100 font-medium transition-colors flex items-center gap-2"
                disabled={saveMutation.isPending}
              >
                <X className="w-4 h-4" /> Discard
              </button>
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="px-6 py-2 rounded-full bg-[#C4622D] text-white hover:bg-[#A85325] font-medium transition-colors flex items-center gap-2 shadow-sm"
              >
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Note
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
