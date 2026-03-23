export interface Tab {
  id: number;
  name: string;
  color: string;
  createdAt: string;
}

export interface Page {
  id: number;
  tabId: number;
  title: string;
  createdAt: string;
}

export interface Note {
  id: number;
  pageId: number | null;
  title: string;
  urduText: string;
  englishTranscription: string;
  audioDuration: number | null;
  dueDate: string | null;
  createdAt: string;
}

export const api = {
  getTabs: async (): Promise<Tab[]> => {
    const res = await fetch('/api/tabs');
    if (!res.ok) throw new Error('Failed to fetch tabs');
    return res.json();
  },
  createTab: async (name: string, color?: string): Promise<Tab> => {
    const res = await fetch('/api/tabs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color }),
    });
    if (!res.ok) throw new Error('Failed to create tab');
    return res.json();
  },
  updateTab: async (id: number, data: { name?: string; color?: string }): Promise<Tab> => {
    const res = await fetch(`/api/tabs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update tab');
    return res.json();
  },
  deleteTab: async (id: number): Promise<void> => {
    const res = await fetch(`/api/tabs/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete tab');
  },
  getPages: async (): Promise<Page[]> => {
    const res = await fetch('/api/pages');
    if (!res.ok) throw new Error('Failed to fetch pages');
    return res.json();
  },
  createPage: async (title: string, tabId: number): Promise<Page> => {
    const res = await fetch('/api/pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, tabId }),
    });
    if (!res.ok) throw new Error('Failed to create page');
    return res.json();
  },
  updatePage: async (id: number, title: string): Promise<Page> => {
    const res = await fetch(`/api/pages/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error('Failed to update page');
    return res.json();
  },
  deletePage: async (id: number): Promise<void> => {
    const res = await fetch(`/api/pages/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete page');
  },
  getNotes: async (): Promise<Note[]> => {
    const res = await fetch('/api/notes');
    if (!res.ok) throw new Error('Failed to fetch notes');
    return res.json();
  },
  createNote: async (note: Partial<Note>): Promise<Note> => {
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note),
    });
    if (!res.ok) throw new Error('Failed to create note');
    return res.json();
  },
  updateNote: async (id: number, data: { title?: string; dueDate?: string | null }): Promise<Note> => {
    const res = await fetch(`/api/notes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update note');
    return res.json();
  },
  deleteNote: async (id: number): Promise<void> => {
    const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete note');
  },
};
