const mysql = require('mysql2/promise');
const config = require('./index');

let db = null;

if (config.db.name) {
  db = mysql.createPool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.name,
    waitForConnections: true,
    connectionLimit: config.db.connectionLimit,
    queueLimit: 0,
    timezone: '+07:00',
    decimalNumbers: true,
  });
}

async function testDatabaseConnection() {
  if (!db) {
    console.warn('[db] DB_NAME is empty; project database connection is disabled');
    return;
  }

  const conn = await db.getConnection();

  try {
    await conn.query('SELECT 1');
    console.log(`[db] connected: ${config.db.name}@${config.db.host}:${config.db.port}`);
  } finally {
    conn.release();
  }
}

module.exports = {
  db,
  testDatabaseConnection,
};
