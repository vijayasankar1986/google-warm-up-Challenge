require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const boardRoutes = require('./routes/boards');
const listRoutes = require('./routes/lists');
const cardRoutes = require('./routes/cards');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..', 'client')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api', listRoutes);
app.use('/api', cardRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA fallback — serve index.html for non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
  }
});

async function startServer() {
  try {
    if (process.env.NODE_ENV === 'production') {
      console.log('Running database migrations...');
      const db = require('./config/db');
      await db.migrate.latest();
      console.log('Database migrations completed.');
    }
  } catch (err) {
    console.error('Failed to run migrations:', err);
    // Optionally continue or exit, but since DB is required, exiting might be better
    // However, sometimes it's okay to just log. Let's just log so server starts.
  }

  app.listen(PORT, () => {
    console.log(`\n🚀 Trello Board server running on http://localhost:${PORT}`);
    console.log(`📋 API: http://localhost:${PORT}/api/health`);
    console.log(`🌐 App: http://localhost:${PORT}\n`);
  });
}

startServer();
