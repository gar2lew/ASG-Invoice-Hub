#!/usr/bin/env node
/**
 * E2E Test Server
 * Starts an isolated Express server for Playwright E2E testing
 */

require('dotenv').config({ path: '.env.e2e' });
const path = require('path');

// Use pg-mem for in-memory testing (same as smoke tests)
process.env.PG_DRIVER = path.join(__dirname, 'pg-mem-driver.js');

const PORT = process.env.E2E_PORT || 3110;
const E2E_DATABASE_URL = process.env.E2E_DATABASE_URL;

// Validate this is an E2E database, not production
const NORMAL_DB_URL = process.env.DATABASE_URL || '';
if (NORMAL_DB_URL && NORMAL_DB_URL === E2E_DATABASE_URL) {
  console.error('ERROR: E2E_DATABASE_URL matches DATABASE_URL - refusing to start E2E server');
  process.exit(1);
}

// Set environment for E2E
process.env.DATABASE_URL = E2E_DATABASE_URL;
process.env.PORT = PORT;
process.env.SESSION_SECRET = process.env.E2E_SESSION_SECRET || 'e2e-test-secret-do-not-use-in-production';
process.env.NODE_ENV = 'test';

// Initialize database and seed users BEFORE starting the app
const db = require('../src/db');
const bcrypt = require('bcryptjs');

async function initializeE2E() {
  console.log('Initializing E2E database...');
  await db.initDb();
  
  // Seed E2E test admin
  const adminUser = process.env.E2E_ADMIN_USERNAME || 'e2e_admin';
  const adminPass = process.env.E2E_ADMIN_PASSWORD || 'e2e_pass_123';
  const adminHash = bcrypt.hashSync(adminPass, 10);
  
  // Delete existing admin users and create fresh
  await db.getPool().query("DELETE FROM users WHERE username LIKE 'e2e_%' OR username = 'admin'");
  
  await db.getPool().query(`
    INSERT INTO users (username, password_hash, name, email, role)
    VALUES ($1, $2, $3, $4, $5)
  `, [adminUser, adminHash, 'E2E Test Administrator', 'e2e-admin@test.local', 'admin']);
  
  console.log(`Seeded E2E admin user: ${adminUser}`);
  
  // Create E2E test rep
  const repUser = process.env.E2E_REP_USERNAME || 'e2e_rep';
  const repPass = process.env.E2E_REP_PASSWORD || 'e2e_pass_123';
  const repPin = process.env.E2E_REP_PIN || '1234';
  const repHash = bcrypt.hashSync(repPass, 10);
  const pinHash = bcrypt.hashSync(repPin, 10);
  
  await db.getPool().query(`
    INSERT INTO users (username, password_hash, pin_hash, name, email, abn, bank_name, bank_bsb, bank_account, role, is_active)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `, [repUser, repHash, pinHash, 'E2E Test Representative', 'e2e-rep@test.local', '12 345 678 901', 'Test Bank', '123456', '12345678', 'rep', true]);
  
  console.log(`Seeded E2E rep user: ${repUser} (PIN: ${repPin})`);
  
  // Update settings for E2E
  await db.getPool().query(`
    UPDATE settings SET
      company_name = 'ASG Operations Pty Ltd',
      company_abn = '43 663 126 725',
      company_address = '14C, 1 The Esplanade, Mount Pleasant WA 6153',
      company_phone = '08 6147 7927',
      company_email = 'Natalie@sjssolutionscorp.com.au',
      accounts_email = 'accounts@asg.com.au',
      invoice_prefix = 'INV',
      next_invoice_number = 1,
      payment_terms = 'Payment due within 14 days',
      footer_note = 'Thank you for your business.'
    WHERE id = 1
  `);
  
  console.log('E2E database initialized successfully');
}

// Initialize database then start server
initializeE2E().then(() => {
  // Start the app
  const app = require('../src/app');

  const server = app.listen(PORT, () => {
    console.log(`E2E Test Server running at http://localhost:${PORT}`);
    console.log(`PID: ${process.pid}`);
  });

  // Track all sockets so we can force-close them on shutdown
  const sockets = new Set();
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });

  function shutdown(signal) {
    console.log(`${signal} received, shutting down E2E server...`);
    // Force-close all keep-alive connections so server.close() completes
    for (const socket of sockets) {
      socket.destroy();
    }
    server.close(() => {
      console.log('E2E server closed');
      process.exit(0);
    });
  }

  // Graceful shutdown
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}).catch(err => {
  console.error('E2E initialization failed:', err);
  process.exit(1);
});

module.exports = { server: null, app: null };