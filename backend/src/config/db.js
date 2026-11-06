const { Pool } = require('pg');

let activePool = null;
let isInMemory = false;

const initInMemoryDb = async () => {
  const { newDb } = require('pg-mem');
  const db = newDb();
  const { Pool: MemPool } = db.adapters.createPg();
  const memPool = new MemPool();

  const wrapQuery = (origQuery) => {
    return function (text, params, callback) {
      if (typeof text === 'string') {
        text = text.replace(/FOR\s+UPDATE\s+SKIP\s+LOCKED/gi, 'FOR UPDATE');
      }
      return origQuery.call(this, text, params, callback);
    };
  };

  memPool.query = wrapQuery(memPool.query);
  const origConnect = memPool.connect.bind(memPool);
  memPool.connect = async function () {
    const client = await origConnect();
    client.query = wrapQuery(client.query);
    return client;
  };

  const client = await memPool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          SERIAL PRIMARY KEY,
        username    VARCHAR(80)  NOT NULL UNIQUE,
        email       VARCHAR(255) NOT NULL UNIQUE,
        password    VARCHAR(255) NOT NULL,
        role        VARCHAR(20)  NOT NULL DEFAULT 'user',
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS queue_state (
        id               INT          PRIMARY KEY DEFAULT 1,
        last_token_number INT         NOT NULL DEFAULT 0,
        current_serving   INT         NOT NULL DEFAULT 0,
        is_open           BOOLEAN     NOT NULL DEFAULT TRUE,
        opened_at         TIMESTAMPTZ,
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT single_row CHECK (id = 1)
      );
    `);
    await client.query(`
      INSERT INTO queue_state (id, last_token_number, current_serving, is_open, opened_at)
      VALUES (1, 0, 0, TRUE, NOW())
      ON CONFLICT (id) DO NOTHING;
    `);

    // Seed default demo accounts
    await client.query(`
      INSERT INTO users (username, email, password, role)
      VALUES 
        ('staff', 'staff@example.com', '$2a$10$3aIggQ6SZXdml0D1v2yVu.tFjtiGgQudi7RtmBj0V5JbFEijDfRxK', 'staff'),
        ('patient', 'patient@example.com', '$2a$10$3aIggQ6SZXdml0D1v2yVu.tFjtiGgQudi7RtmBj0V5JbFEijDfRxK', 'user')
      ON CONFLICT (email) DO NOTHING;
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS tokens (
        id           SERIAL       PRIMARY KEY,
        token_number INT          NOT NULL UNIQUE,
        user_id      INT          REFERENCES users(id) ON DELETE SET NULL,
        status       VARCHAR(20)  NOT NULL DEFAULT 'waiting',
        issued_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        served_at    TIMESTAMPTZ,
        CONSTRAINT status_check CHECK (status IN ('waiting', 'serving', 'served', 'skipped'))
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tokens_status       ON tokens (status);
      CREATE INDEX IF NOT EXISTS idx_tokens_token_number ON tokens (token_number);
      CREATE INDEX IF NOT EXISTS idx_tokens_user_id      ON tokens (user_id);
    `);
    await client.query('COMMIT');
    console.log('[PostgreSQL] In-memory database initialized and migrated successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  activePool = memPool;
  isInMemory = true;
};

const realPool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432'),
  user: process.env.PG_USER || 'queueuser',
  password: process.env.PG_PASSWORD || 'queuepass',
  database: process.env.PG_DATABASE || 'queuedb',
  max: 20,                  // max pool connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

realPool.on('error', (err) => {
  if (!isInMemory) {
    console.error('[PostgreSQL] Unexpected client error:', err.message);
  }
});

const pool = {
  query: (...args) => (activePool || realPool).query(...args),
  connect: (...args) => (activePool || realPool).connect(...args),
  end: (...args) => (activePool || realPool).end(...args),
  on: (...args) => (activePool || realPool).on(...args),
};

const connectPostgres = async () => {
  try {
    const client = await realPool.connect();
    await client.query('SELECT 1');
    client.release();
    activePool = realPool;
    console.log('[PostgreSQL] Connected successfully');
  } catch (err) {
    console.warn(`[PostgreSQL] Connection to external database failed (${err.message}). Using in-memory database.`);
    await initInMemoryDb();
  }
};

module.exports = { pool, connectPostgres };
