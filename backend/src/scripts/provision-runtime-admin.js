'use strict';

const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

async function main() {
  const email = String(process.env.PROVISION_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.PROVISION_ADMIN_PASSWORD || '';
  if (!email.includes('@') || password.length < 12) throw new Error('Runtime admin email and 12+ character password are required');
  await pool.query(
    `INSERT INTO users (email, password, name, role)
     VALUES ($1, $2, 'Runtime Administrator', 'admin')
     ON CONFLICT (email) DO UPDATE SET password=EXCLUDED.password, name=EXCLUDED.name, role=EXCLUDED.role`,
    [email, await bcrypt.hash(password, 12)]
  );
  console.log('Runtime administrator provisioned.');
}

main().then(() => pool.end()).catch(async (error) => {
  console.error(error.message);
  await pool.end().catch(() => {});
  process.exitCode = 1;
});
