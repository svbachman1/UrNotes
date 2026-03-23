import express from 'express';
import { createServer as createViteServer } from 'vite';
import { db } from './src/db';
import { tabs, pages, notes } from './src/db/schema';
import { eq, desc } from 'drizzle-orm';
import { runMigrations } from './src/db/migrate';
import path from 'path';

const app = express();
const PORT = 3000;

// Increase limit for audio uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Run migrations on startup
try {
  runMigrations();
  console.log('Database migrated successfully');
} catch (error) {
  console.error('Database migration failed:', error);
}

// API Routes

// GET /api/tabs
app.get('/api/tabs', async (req, res) => {
  try {
    const allTabs = await db.select().from(tabs).orderBy(desc(tabs.createdAt));
    res.json(allTabs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tabs' });
  }
});

// POST /api/tabs
app.post('/api/tabs', async (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const newTab = await db.insert(tabs).values({ name, color: color || '#C4622D' }).returning();
    res.json(newTab[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create tab' });
  }
});

// PATCH /api/tabs/:id
app.patch('/api/tabs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;
    const updateData: any = {};
    if (name) updateData.name = name;
    if (color) updateData.color = color;
    
    if (Object.keys(updateData).length === 0) return res.status(400).json({ error: 'No data to update' });
    
    const updatedTab = await db.update(tabs).set(updateData).where(eq(tabs.id, Number(id))).returning();
    if (updatedTab.length === 0) return res.status(404).json({ error: 'Tab not found' });
    res.json(updatedTab[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update tab' });
  }
});

// DELETE /api/tabs/:id
app.delete('/api/tabs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(tabs).where(eq(tabs.id, Number(id)));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete tab' });
  }
});

// GET /api/pages
app.get('/api/pages', async (req, res) => {
  try {
    const allPages = await db.select().from(pages).orderBy(desc(pages.createdAt));
    res.json(allPages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pages' });
  }
});

// POST /api/pages
app.post('/api/pages', async (req, res) => {
  try {
    const { title, tabId } = req.body;
    if (!title || !tabId) return res.status(400).json({ error: 'Title and tabId are required' });
    const newPage = await db.insert(pages).values({ title, tabId }).returning();
    res.json(newPage[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create page' });
  }
});

// PATCH /api/pages/:id
app.patch('/api/pages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const updatedPage = await db.update(pages).set({ title }).where(eq(pages.id, Number(id))).returning();
    if (updatedPage.length === 0) return res.status(404).json({ error: 'Page not found' });
    res.json(updatedPage[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update page' });
  }
});

// DELETE /api/pages/:id
app.delete('/api/pages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(pages).where(eq(pages.id, Number(id)));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete page' });
  }
});

// GET /api/notes
app.get('/api/notes', async (req, res) => {
  try {
    const allNotes = await db.select().from(notes).orderBy(desc(notes.createdAt));
    res.json(allNotes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// POST /api/notes
app.post('/api/notes', async (req, res) => {
  try {
    const { title, urduText, englishTranscription, audioDuration, pageId, dueDate } = req.body;
    const newNote = await db.insert(notes).values({
      title,
      urduText,
      englishTranscription,
      audioDuration,
      pageId: pageId || null,
      dueDate: dueDate ? new Date(dueDate) : null,
    }).returning();
    res.json(newNote[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// PATCH /api/notes/:id
app.patch('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, dueDate } = req.body;
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    
    if (Object.keys(updateData).length === 0) return res.status(400).json({ error: 'No data to update' });
    
    const updatedNote = await db.update(notes).set(updateData).where(eq(notes.id, Number(id))).returning();
    if (updatedNote.length === 0) return res.status(404).json({ error: 'Note not found' });
    res.json(updatedNote[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// DELETE /api/notes/:id
app.delete('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(notes).where(eq(notes.id, Number(id)));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
