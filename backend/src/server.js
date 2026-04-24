const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { pool, initDatabase, featureTables } = require('./config/database');
const features = require('./config/features');
const authRoutes = require('./routes/auth');
const { createFeatureRouter } = require('./routes/features');
const bcrypt = require('bcryptjs');
const { authMiddleware } = require('./middleware/auth');

const app = express();
const PORT = parseInt(process.env.BACKEND_PORT, 10) || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Feature routes
for (const [key, config] of Object.entries(features)) {
  app.use(`/api/${key}`, createFeatureRouter(config));
}

// Features metadata endpoint
app.get('/api/features', (req, res) => {
  const featureList = Object.values(features).map(({ key, name, description, icon, fields, tableName }) => ({
    key,
    name,
    description,
    icon,
    fields,
    tableName,
  }));
  res.json({ features: featureList });
});

// ── Analytics endpoint ──────────────────────────────────────────
app.get('/api/analytics', authMiddleware, async (req, res) => {
  try {
    const statusCounts = {};
    const recentItems = [];

    for (const [key, config] of Object.entries(features)) {
      const statusResult = await pool.query(
        `SELECT status, COUNT(*) as count FROM ${config.tableName} GROUP BY status`
      );
      statusCounts[key] = {};
      for (const row of statusResult.rows) {
        statusCounts[key][row.status] = parseInt(row.count, 10);
      }

      const recentResult = await pool.query(
        `SELECT id, name, status, created_at, updated_at FROM ${config.tableName} ORDER BY updated_at DESC LIMIT 3`
      );
      for (const row of recentResult.rows) {
        recentItems.push({ ...row, feature_key: key, feature_name: config.name });
      }
    }

    // Sort recent items by updated_at and take top 10
    recentItems.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    const topRecent = recentItems.slice(0, 10);

    // Totals
    let totalDraft = 0, totalInProgress = 0, totalCompleted = 0, totalItems = 0;
    for (const counts of Object.values(statusCounts)) {
      totalDraft += counts.draft || 0;
      totalInProgress += counts['in-progress'] || 0;
      totalCompleted += counts.completed || 0;
      totalItems += Object.values(counts).reduce((s, c) => s + c, 0);
    }

    res.json({
      statusCounts,
      recentItems: topRecent,
      totals: { totalItems, totalDraft, totalInProgress, totalCompleted },
    });
  } catch (err) {
    console.error('Analytics error:', err.message);
    res.status(500).json({ error: 'Failed to load analytics.' });
  }
});

// ── Activity log endpoint ──────────────────────────────────────
app.get('/api/activity', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const result = await pool.query(
      `SELECT a.*, u.name as user_name FROM activity_log a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.created_at DESC LIMIT $1`,
      [limit]
    );
    res.json({ activities: result.rows });
  } catch (err) {
    console.error('Activity log error:', err.message);
    res.status(500).json({ error: 'Failed to load activity log.' });
  }
});

// ── User favorites list ────────────────────────────────────────
app.get('/api/favorites', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT * FROM favorites WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    res.json({ favorites: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load favorites.' });
  }
});

// ── Profile update ─────────────────────────────────────────────
app.put('/api/auth/profile', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    const result = await pool.query(
      `UPDATE users SET name = $1 WHERE id = $2 RETURNING id, email, name, created_at`,
      [name, req.user.id]
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Profile update error:', err.message);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// ── Change password ────────────────────────────────────────────
app.put('/api/auth/password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const valid = await bcrypt.compare(currentPassword, userResult.rows[0].password);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, req.user.id]);

    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Password change error:', err.message);
    res.status(500).json({ error: 'Failed to change password.' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error.' });
});

// Start server
async function start() {
  try {
    await initDatabase();
    console.log('Database initialized successfully');

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Features loaded: ${Object.keys(features).join(', ')}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
