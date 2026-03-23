import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useSearchParams } from 'wouter';
import { Search, LayoutGrid, List, AlignJustify, Plus, Pencil, X, Trash2, Mic, FileText, Check, BookOpen, ChevronDown, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { api, Note, Tab, Page } from '../lib/api';
import { cn } from '../lib/utils';

type ViewMode = 'compact' | 'list' | 'grid';

const TAB_COLORS = ['#C4622D', '#2D8C4A', '#2D62C4', '#8C2D8C', '#C4B22D', '#2DC4B2', '#4A4A4A'];

export function NotesPage() {
  const [location, setLocation] = useLocation();
  const [searchParams] = useSearchParams();
  const activePageParam = searchParams.get('page');
  const activePageId = activePageParam ? parseInt(activePageParam) : null;

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  
  // Tab state
  const [expandedTabs, setExpandedTabs] = useState<Set<number>>(new Set());
  const [editingTabId, setEditingTabId] = useState<number | null>(null);
  const [editingTabName, setEditingTabName] = useState('');
  const [editingTabColor, setEditingTabColor] = useState('');
  const [isAddingTab, setIsAddingTab] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  const [newTabColor, setNewTabColor] = useState(TAB_COLORS[0]);

  // Page state
  const [editingPageId, setEditingPageId] = useState<number | null>(null);
  const [editingPageTitle, setEditingPageTitle] = useState('');
  const [addingPageToTab, setAddingPageToTab] = useState<number | null>(null);
  const [newPageTitle, setNewPageTitle] = useState('');

  // Note state
  const [expandedNoteId, setExpandedNoteId] = useState<number | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingNoteTitle, setEditingNoteTitle] = useState('');
  const [editingNoteDueDate, setEditingNoteDueDate] = useState('');

  const queryClient = useQueryClient();

  const { data: tabs = [] } = useQuery({ queryKey: ['tabs'], queryFn: api.getTabs });
  const { data: pages = [] } = useQuery({ queryKey: ['pages'], queryFn: api.getPages });
  const { data: notes = [] } = useQuery({ queryKey: ['notes'], queryFn: api.getNotes });

  // Mutations
  const createTabMutation = useMutation({
    mutationFn: (data: { name: string; color: string }) => api.createTab(data.name, data.color),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tabs'] });
      setIsAddingTab(false);
      setNewTabName('');
    }
  });

  const updateTabMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: { name?: string; color?: string } }) => api.updateTab(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tabs'] });
      setEditingTabId(null);
    }
  });

  const deleteTabMutation = useMutation({
    mutationFn: api.deleteTab,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tabs'] });
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    }
  });

  const createPageMutation = useMutation({
    mutationFn: (data: { title: string; tabId: number }) => api.createPage(data.title, data.tabId),
    onSuccess: (newPage) => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      setAddingPageToTab(null);
      setNewPageTitle('');
      setLocation(`/notes?page=${newPage.id}`);
    }
  });

  const updatePageMutation = useMutation({
    mutationFn: ({ id, title }: { id: number, title: string }) => api.updatePage(id, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      setEditingPageId(null);
    }
  });

  const deletePageMutation = useMutation({
    mutationFn: api.deletePage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      if (activePageId) setLocation('/notes');
    }
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: { title?: string; dueDate?: string | null } }) => api.updateNote(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      setEditingNoteId(null);
    }
  });

  const deleteNoteMutation = useMutation({
    mutationFn: api.deleteNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    }
  });

  const toggleTab = (tabId: number) => {
    const newExpanded = new Set(expandedTabs);
    if (newExpanded.has(tabId)) newExpanded.delete(tabId);
    else newExpanded.add(tabId);
    setExpandedTabs(newExpanded);
  };

  const activePageObj = pages.find(p => p.id === activePageId);
  const activeTabObj = activePageObj ? tabs.find(t => t.id === activePageObj.tabId) : null;

  const filteredNotes = useMemo(() => {
    let filtered = notes;
    if (activePageId) {
      filtered = filtered.filter(n => n.pageId === activePageId);
    } else {
      filtered = []; // If no page selected, don't show notes unless searching globally? Let's say we only show notes for active page.
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      // If searching, search across all notes regardless of active page
      filtered = notes.filter(n => 
        n.title.toLowerCase().includes(q) || 
        n.englishTranscription.toLowerCase().includes(q) ||
        n.urduText.includes(q)
      );
    }
    return filtered;
  }, [notes, activePageId, searchQuery]);

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-8rem)]">
      {/* Sidebar - Notebook Structure */}
      <div className="w-full md:w-64 flex-shrink-0 bg-white rounded-2xl border border-[#F0E8DF] shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-[#F0E8DF] bg-[#FAF6F1]/50">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#C4622D]" />
            My Notebook
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {tabs.map(tab => {
            const isExpanded = expandedTabs.has(tab.id);
            const tabPages = pages.filter(p => p.tabId === tab.id);
            
            return (
              <div key={tab.id} className="space-y-1">
                {/* Tab Header */}
                <div className="group relative flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  {editingTabId === tab.id ? (
                    <div className="flex items-center gap-2 w-full">
                      <input
                        type="color"
                        value={editingTabColor}
                        onChange={(e) => setEditingTabColor(e.target.value)}
                        className="w-5 h-5 rounded cursor-pointer border-0 p-0"
                      />
                      <input
                        autoFocus
                        type="text"
                        value={editingTabName}
                        onChange={(e) => setEditingTabName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && editingTabName.trim()) updateTabMutation.mutate({ id: tab.id, data: { name: editingTabName.trim(), color: editingTabColor } });
                          if (e.key === 'Escape') setEditingTabId(null);
                        }}
                        className="text-sm outline-none bg-transparent flex-1 border-b border-[#C4622D]"
                      />
                      <button onClick={() => editingTabName.trim() && updateTabMutation.mutate({ id: tab.id, data: { name: editingTabName.trim(), color: editingTabColor } })} className="text-green-600">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingTabId(null)} className="text-gray-400">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button 
                        onClick={() => toggleTab(tab.id)}
                        className="flex items-center gap-2 flex-1 text-left"
                      >
                        <ChevronRight className={cn("w-4 h-4 text-gray-400 transition-transform", isExpanded && "rotate-90")} />
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tab.color || '#C4622D' }} />
                        <span className="font-medium text-sm text-gray-800 truncate">{tab.name}</span>
                      </button>
                      <div className="hidden group-hover:flex items-center gap-1">
                        <button onClick={() => { setEditingTabId(tab.id); setEditingTabName(tab.name); setEditingTabColor(tab.color || '#C4622D'); }} className="p-1 text-gray-400 hover:text-gray-700">
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button onClick={() => { if (window.confirm(`Delete tab "${tab.name}" and all its pages?`)) deleteTabMutation.mutate(tab.id); }} className="p-1 text-gray-400 hover:text-red-500">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Pages List */}
                {isExpanded && (
                  <div className="pl-6 space-y-1">
                    {tabPages.map(page => (
                      <div key={page.id} className="group relative flex items-center justify-between">
                        {editingPageId === page.id ? (
                          <div className="flex items-center gap-2 w-full p-1.5">
                            <input
                              autoFocus
                              type="text"
                              value={editingPageTitle}
                              onChange={(e) => setEditingPageTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && editingPageTitle.trim()) updatePageMutation.mutate({ id: page.id, title: editingPageTitle.trim() });
                                if (e.key === 'Escape') setEditingPageId(null);
                              }}
                              className="text-sm outline-none bg-transparent flex-1 border-b border-[#C4622D]"
                            />
                            <button onClick={() => editingPageTitle.trim() && updatePageMutation.mutate({ id: page.id, title: editingPageTitle.trim() })} className="text-green-600">
                              <Check className="w-3 h-3" />
                            </button>
                            <button onClick={() => setEditingPageId(null)} className="text-gray-400">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => setLocation(`/notes?page=${page.id}`)}
                              className={cn(
                                "flex-1 text-left p-1.5 rounded-md text-sm transition-colors flex items-center justify-between overflow-hidden",
                                activePageId === page.id ? "bg-[#F0E8DF] text-[#C4622D] font-medium" : "text-gray-600 hover:bg-gray-50"
                              )}
                            >
                              <span className="truncate">{page.title}</span>
                              <span className="text-xs text-gray-400 bg-white/60 px-1.5 py-0.5 rounded-full ml-2 flex-shrink-0">
                                {notes.filter(n => n.pageId === page.id).length}
                              </span>
                            </button>
                            <div className="hidden group-hover:flex items-center gap-1 pr-2">
                              <button onClick={() => { setEditingPageId(page.id); setEditingPageTitle(page.title); }} className="p-1 text-gray-400 hover:text-gray-700">
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button onClick={() => { if (window.confirm(`Delete page "${page.title}" and all its notes?`)) deletePageMutation.mutate(page.id); }} className="p-1 text-gray-400 hover:text-red-500">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    
                    {/* Add Page */}
                    {addingPageToTab === tab.id ? (
                      <div className="flex items-center gap-2 w-full p-1.5">
                        <input
                          autoFocus
                          type="text"
                          placeholder="Page title"
                          value={newPageTitle}
                          onChange={(e) => setNewPageTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newPageTitle.trim()) createPageMutation.mutate({ title: newPageTitle.trim(), tabId: tab.id });
                            if (e.key === 'Escape') setAddingPageToTab(null);
                          }}
                          className="text-sm outline-none bg-transparent flex-1 border-b border-[#C4622D]"
                        />
                        <button onClick={() => newPageTitle.trim() && createPageMutation.mutate({ title: newPageTitle.trim(), tabId: tab.id })} className="text-green-600">
                          <Check className="w-3 h-3" />
                        </button>
                        <button onClick={() => setAddingPageToTab(null)} className="text-gray-400">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setAddingPageToTab(tab.id)}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 p-1.5 ml-1"
                      >
                        <Plus className="w-3 h-3" /> Add Page
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add Tab */}
          {isAddingTab ? (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
              <input
                type="color"
                value={newTabColor}
                onChange={(e) => setNewTabColor(e.target.value)}
                className="w-5 h-5 rounded cursor-pointer border-0 p-0"
              />
              <input
                autoFocus
                type="text"
                placeholder="Tab name"
                value={newTabName}
                onChange={(e) => setNewTabName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTabName.trim()) createTabMutation.mutate({ name: newTabName.trim(), color: newTabColor });
                  if (e.key === 'Escape') setIsAddingTab(false);
                }}
                className="text-sm outline-none bg-transparent flex-1 border-b border-[#C4622D]"
              />
              <button onClick={() => newTabName.trim() && createTabMutation.mutate({ name: newTabName.trim(), color: newTabColor })} className="text-green-600">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => setIsAddingTab(false)} className="text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsAddingTab(true)}
              className="flex items-center gap-2 w-full p-2 text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors mt-2"
            >
              <Plus className="w-4 h-4" /> Add Tab
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            {searchQuery ? (
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Search Results</h1>
            ) : activePageObj ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: activeTabObj?.color || '#C4622D' }} />
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{activePageObj.title}</h1>
              </div>
            ) : (
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Select a Page</h1>
            )}
            <p className="text-gray-500 mt-1 text-sm">{filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'}</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white border border-[#F0E8DF] rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#C4622D]/50 w-full sm:w-64 transition-all shadow-sm"
              />
            </div>
            <div className="flex items-center bg-white border border-[#F0E8DF] rounded-full p-1 shadow-sm">
              <button onClick={() => setViewMode('compact')} className={cn("p-1.5 rounded-full transition-colors", viewMode === 'compact' ? "bg-[#F0E8DF] text-[#C4622D]" : "text-gray-400 hover:text-gray-600")}>
                <AlignJustify className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode('list')} className={cn("p-1.5 rounded-full transition-colors", viewMode === 'list' ? "bg-[#F0E8DF] text-[#C4622D]" : "text-gray-400 hover:text-gray-600")}>
                <List className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode('grid')} className={cn("p-1.5 rounded-full transition-colors", viewMode === 'grid' ? "bg-[#F0E8DF] text-[#C4622D]" : "text-gray-400 hover:text-gray-600")}>
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Notes Content */}
        <div className="flex-1 overflow-y-auto pb-12 pr-2">
          {!activePageId && !searchQuery ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                <BookOpen className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Notebook Empty</h3>
              <p className="text-gray-500 mb-6 max-w-sm">
                Select a page from the sidebar or create a new one to view and add notes.
              </p>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                <FileText className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No notes found</h3>
              <p className="text-gray-500 mb-6 max-w-sm">
                {searchQuery ? "We couldn't find any notes matching your search." : "You haven't recorded any notes on this page yet."}
              </p>
              {!searchQuery && activePageId && (
                <button
                  onClick={() => setLocation(`/?pageId=${activePageId}`)}
                  className="px-6 py-2.5 bg-[#C4622D] text-white rounded-full font-medium hover:bg-[#A85325] transition-colors shadow-sm flex items-center gap-2"
                >
                  <Mic className="w-4 h-4" /> Record Note
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {!searchQuery && activePageId && (
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => setLocation(`/?pageId=${activePageId}`)}
                    className="px-4 py-2 bg-white border border-[#C4622D] text-[#C4622D] rounded-full text-sm font-medium hover:bg-[#FAF6F1] transition-colors shadow-sm flex items-center gap-2"
                  >
                    <Mic className="w-4 h-4" /> Add Note
                  </button>
                </div>
              )}
              
              <div className={cn(
                "w-full",
                viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" : "flex flex-col gap-4",
                viewMode === 'compact' ? "bg-white rounded-2xl border border-[#F0E8DF] shadow-sm overflow-hidden p-0 gap-0" : ""
              )}>
                <AnimatePresence>
                  {filteredNotes.map((note, index) => (
                    <NoteCard 
                      key={note.id} 
                      note={note} 
                      index={index + 1}
                      viewMode={viewMode} 
                      isLast={index === filteredNotes.length - 1}
                      isExpanded={expandedNoteId === note.id}
                      onToggleExpand={() => setExpandedNoteId(expandedNoteId === note.id ? null : note.id)}
                      onDelete={() => {
                        if (window.confirm('Are you sure you want to delete this note?')) {
                          deleteNoteMutation.mutate(note.id);
                        }
                      }}
                      editingNoteId={editingNoteId}
                      setEditingNoteId={setEditingNoteId}
                      editingNoteTitle={editingNoteTitle}
                      setEditingNoteTitle={setEditingNoteTitle}
                      editingNoteDueDate={editingNoteDueDate}
                      setEditingNoteDueDate={setEditingNoteDueDate}
                      onSaveEdit={() => {
                        if (editingNoteTitle.trim()) {
                          updateNoteMutation.mutate({ 
                            id: note.id, 
                            data: { 
                              title: editingNoteTitle.trim(), 
                              dueDate: editingNoteDueDate || null 
                            } 
                          });
                        }
                      }}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NoteCard({ 
  note, 
  index,
  viewMode, 
  isLast,
  isExpanded,
  onToggleExpand,
  onDelete,
  editingNoteId,
  setEditingNoteId,
  editingNoteTitle,
  setEditingNoteTitle,
  editingNoteDueDate,
  setEditingNoteDueDate,
  onSaveEdit
}: { 
  key?: React.Key;
  note: Note; 
  index: number;
  viewMode: ViewMode; 
  isLast: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
  editingNoteId: number | null;
  setEditingNoteId: (id: number | null) => void;
  editingNoteTitle: string;
  setEditingNoteTitle: (title: string) => void;
  editingNoteDueDate: string;
  setEditingNoteDueDate: (date: string) => void;
  onSaveEdit: () => void;
}) {
  const dateStr = format(new Date(note.createdAt), 'MMM d, yyyy');
  const dueDateStr = note.dueDate ? format(new Date(note.dueDate), 'MMM d, yyyy') : null;
  const isEditing = editingNoteId === note.id;

  const handleEditStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNoteId(note.id);
    setEditingNoteTitle(note.title);
    setEditingNoteDueDate(note.dueDate ? new Date(note.dueDate).toISOString().split('T')[0] : '');
  };

  if (viewMode === 'compact') {
    return (
      <motion.div
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={cn(
          "group relative flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors",
          !isLast && "border-b border-gray-100"
        )}
      >
        <div className="w-6 text-center text-sm font-medium text-gray-400">#{index}</div>
        
        {isEditing ? (
          <div className="flex-1 flex items-center gap-2">
            <input
              autoFocus
              type="text"
              value={editingNoteTitle}
              onChange={(e) => setEditingNoteTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSaveEdit();
                if (e.key === 'Escape') setEditingNoteId(null);
              }}
              className="text-sm outline-none border border-gray-300 rounded px-2 py-1 flex-1"
            />
            <input
              type="date"
              value={editingNoteDueDate}
              onChange={(e) => setEditingNoteDueDate(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSaveEdit();
                if (e.key === 'Escape') setEditingNoteId(null);
              }}
              className="text-sm outline-none border border-gray-300 rounded px-2 py-1"
            />
            <button onClick={onSaveEdit} className="text-green-600 p-1"><Check className="w-4 h-4" /></button>
            <button onClick={() => setEditingNoteId(null)} className="text-gray-400 p-1"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <>
            <div className="flex-1 min-w-0 flex items-center gap-4">
              <h4 className="font-medium text-gray-900 truncate w-1/4">{note.title}</h4>
              <p className="text-sm text-gray-500 truncate flex-1">{note.englishTranscription}</p>
            </div>
            {dueDateStr && (
              <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-md whitespace-nowrap">
                <CalendarIcon className="w-3 h-3" /> {dueDateStr}
              </div>
            )}
            <div className="text-xs text-gray-400 whitespace-nowrap">{dateStr}</div>
            
            <div className="absolute right-4 opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-gray-50 pl-2">
              <button onClick={handleEditStart} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-md transition-all">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </motion.div>
    );
  }

  if (viewMode === 'list') {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="group relative bg-white rounded-2xl border border-[#F0E8DF] shadow-sm overflow-hidden"
      >
        <div 
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={!isEditing ? onToggleExpand : undefined}
        >
          <div className="flex items-center gap-4 flex-1">
            <div className="w-10 h-10 rounded-full bg-[#FAF6F1] flex items-center justify-center flex-shrink-0 relative">
              <span className="absolute -top-1 -left-1 w-5 h-5 bg-gray-800 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                {index}
              </span>
              <Mic className="w-4 h-4 text-[#C4622D]" />
            </div>
            
            {isEditing ? (
              <div className="flex-1 flex items-center gap-2 mr-4" onClick={e => e.stopPropagation()}>
                <input
                  autoFocus
                  type="text"
                  value={editingNoteTitle}
                  onChange={(e) => setEditingNoteTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onSaveEdit();
                    if (e.key === 'Escape') setEditingNoteId(null);
                  }}
                  className="text-sm outline-none border border-gray-300 rounded px-2 py-1 flex-1"
                />
                <input
                  type="date"
                  value={editingNoteDueDate}
                  onChange={(e) => setEditingNoteDueDate(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onSaveEdit();
                    if (e.key === 'Escape') setEditingNoteId(null);
                  }}
                  className="text-sm outline-none border border-gray-300 rounded px-2 py-1"
                />
                <button onClick={onSaveEdit} className="text-green-600 p-1 bg-green-50 rounded"><Check className="w-4 h-4" /></button>
                <button onClick={() => setEditingNoteId(null)} className="text-gray-400 p-1 bg-gray-100 rounded"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-gray-900">{note.title}</h4>
                  {dueDateStr && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-sm">
                      <CalendarIcon className="w-3 h-3" /> Due {dueDateStr}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">{dateStr} {note.audioDuration ? `• ${note.audioDuration}s` : ''}</p>
              </div>
            )}
          </div>
          
          {!isEditing && (
            <div className="flex items-center gap-2">
              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all">
                <button 
                  onClick={handleEditStart}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <ChevronDown className={cn("w-5 h-5 text-gray-400 transition-transform", isExpanded && "rotate-180")} />
            </div>
          )}
        </div>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-gray-100"
            >
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/50">
                <div className="space-y-2">
                  <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Urdu</h5>
                  <p className="text-lg leading-loose font-serif text-gray-800" dir="rtl" style={{ fontFamily: "'Noto Nastaliq Urdu', 'Gulzar', serif" }}>
                    {note.urduText}
                  </p>
                </div>
                <div className="space-y-2">
                  <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">English</h5>
                  <p className="text-sm leading-relaxed text-gray-700">
                    {note.englishTranscription}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // Grid view
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="group relative bg-white rounded-3xl border border-[#F0E8DF] shadow-sm p-5 flex flex-col h-full hover:shadow-md transition-shadow"
    >
      <div className="absolute -top-2 -left-2 w-6 h-6 bg-gray-800 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-md z-10">
        {index}
      </div>
      
      {isEditing ? (
        <div className="flex flex-col gap-2 mb-4">
          <input
            autoFocus
            type="text"
            value={editingNoteTitle}
            onChange={(e) => setEditingNoteTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveEdit();
              if (e.key === 'Escape') setEditingNoteId(null);
            }}
            className="text-sm font-semibold outline-none border border-gray-300 rounded px-2 py-1"
          />
          <input
            type="date"
            value={editingNoteDueDate}
            onChange={(e) => setEditingNoteDueDate(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveEdit();
              if (e.key === 'Escape') setEditingNoteId(null);
            }}
            className="text-xs outline-none border border-gray-300 rounded px-2 py-1"
          />
          <div className="flex gap-2">
            <button onClick={onSaveEdit} className="flex-1 text-xs bg-green-50 text-green-600 py-1 rounded font-medium">Save</button>
            <button onClick={() => setEditingNoteId(null)} className="flex-1 text-xs bg-gray-100 text-gray-600 py-1 rounded font-medium">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="flex justify-between items-start mb-4">
          <div>
            <h4 className="font-semibold text-gray-900 line-clamp-1">{note.title}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-gray-400">{dateStr}</p>
              {dueDateStr && (
                <span className="flex items-center gap-1 text-[10px] font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-sm">
                  <Clock className="w-3 h-3" /> {dueDateStr}
                </span>
              )}
            </div>
          </div>
          <div className="opacity-0 group-hover:opacity-100 flex items-center transition-all bg-white pl-1">
            <button onClick={handleEditStart} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-full">
              <Pencil className="w-3 h-3" />
            </button>
            <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 space-y-4">
        <div className="bg-[#FAF6F1] rounded-2xl p-4">
          <p className="text-base leading-loose font-serif text-gray-800 line-clamp-3" dir="rtl" style={{ fontFamily: "'Noto Nastaliq Urdu', 'Gulzar', serif" }}>
            {note.urduText}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
            {note.englishTranscription}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
