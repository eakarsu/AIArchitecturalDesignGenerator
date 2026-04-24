const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'arch_design_generator',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

const featureTables = [
  'building_designs',
  'compliance_checks',
  'energy_models',
  'material_estimations',
  'floor_plans',
  'structural_analyses',
  'cost_estimations',
  'site_analyses',
  'sustainability_assessments',
  'lighting_designs',
  'hvac_designs',
  'interior_designs',
  'landscape_designs',
  'construction_timelines',
  'parking_designs',
  'acoustic_analyses',
  'fire_safety_analyses',
];

async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    for (const table of featureTables) {
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${table} (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          data JSONB DEFAULT '{}',
          ai_result JSONB,
          status VARCHAR(50) DEFAULT 'draft',
          user_id INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
    }

    // Favorites table
    await client.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        feature_key VARCHAR(100) NOT NULL,
        item_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, feature_key, item_id)
      );
    `);

    // Notes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        feature_key VARCHAR(100) NOT NULL,
        item_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Activity log table
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        action VARCHAR(50) NOT NULL,
        feature_key VARCHAR(100),
        item_id INTEGER,
        item_name VARCHAR(255),
        details TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('Database tables initialized successfully');
  } catch (err) {
    console.error('Error initializing database:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, initDatabase, featureTables };
