import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, Note } from '../lib/api';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday,
  startOfWeek,
  endOfWeek,
  parseISO
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['notes'],
    queryFn: api.getNotes,
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dateFormat = "MMMM yyyy";
  const days = eachDayOfInterval({
    start: startDate,
    end: endDate
  });

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Filter notes with due dates
  const notesWithDueDates = notes.filter(note => note.dueDate);

  const getNotesForDay = (day: Date) => {
    return notesWithDueDates.filter(note => {
      if (!note.dueDate) return false;
      const noteDate = parseISO(note.dueDate);
      return isSameDay(noteDate, day);
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C4622D]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-8rem)] flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-[#C4622D]" />
          <h2 className="text-lg font-semibold text-gray-900">Task Calendar</h2>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <span className="text-lg font-medium text-gray-900 min-w-[140px] text-center">
            {format(currentDate, dateFormat)}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Days of week */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {weekDays.map(day => (
            <div key={day} className="py-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto">
          {days.map((day, dayIdx) => {
            const dayNotes = getNotesForDay(day);
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={day.toString()}
                className={`
                  min-h-[100px] border-b border-r border-gray-100 p-2 flex flex-col gap-1
                  ${!isCurrentMonth ? 'bg-gray-50/50' : 'bg-white'}
                  ${dayIdx % 7 === 6 ? 'border-r-0' : ''}
                `}
              >
                <div className="flex items-center justify-between">
                  <span className={`
                    text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                    ${isCurrentDay ? 'bg-[#C4622D] text-white' : !isCurrentMonth ? 'text-gray-400' : 'text-gray-700'}
                  `}>
                    {format(day, 'd')}
                  </span>
                  {dayNotes.length > 0 && (
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md">
                      {dayNotes.length}
                    </span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto space-y-1 mt-1 pr-1 custom-scrollbar">
                  {dayNotes.map(note => (
                    <div
                      key={note.id}
                      onClick={() => setSelectedNote(note)}
                      className="text-xs p-1.5 rounded bg-[#C4622D]/10 text-[#C4622D] border border-[#C4622D]/20 cursor-pointer hover:bg-[#C4622D]/20 transition-colors truncate"
                      title={note.title || 'Untitled Note'}
                    >
                      {note.title || 'Untitled Note'}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Note Detail Modal */}
      <AnimatePresence>
        {selectedNote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h3 className="font-semibold text-gray-900 truncate pr-4">
                  {selectedNote.title || 'Untitled Note'}
                </h3>
                <button
                  onClick={() => setSelectedNote(null)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-4 overflow-y-auto flex-1">
                {selectedNote.dueDate && (
                  <div className="flex items-center gap-2 text-sm text-[#C4622D] mb-4 bg-[#C4622D]/10 px-3 py-2 rounded-lg w-fit">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">Due: {format(parseISO(selectedNote.dueDate), 'PPP')}</span>
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Urdu Text</h4>
                    <p className="text-gray-800 whitespace-pre-wrap text-right font-urdu text-lg leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                      {selectedNote.urduText}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">English Translation</h4>
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                      {selectedNote.englishTranscription}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                <button
                  onClick={() => setSelectedNote(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #e5e7eb;
          border-radius: 20px;
        }
      `}</style>
    </div>
  );
}
