/**
 * Shared Module: Database Connection
 * Provides connection pooling for Azure SQL Database
 */

const sql = require('mssql');

// Connection pool (reused across function invocations)
let pool = null;

// Database configuration from environment variables
const config = {
  server: process.env.SQL_SERVER,
  database: process.env.SQL_DATABASE,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  options: {
    encrypt: true, // Required for Azure SQL
    trustServerCertificate: false,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

/**
 * Get or create database connection pool
 * @returns {Promise<sql.ConnectionPool>}
 */
async function getConnection() {
  if (pool && pool.connected) {
    return pool;
  }
  
  try {
    pool = await new sql.ConnectionPool(config).connect();
    console.log('Database connection pool created');
    return pool;
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}

/**
 * Close database connection pool (for cleanup)
 */
async function closeConnection() {
  if (pool) {
    await pool.close();
    pool = null;
    console.log('Database connection pool closed');
  }
}

module.exports = {
  getConnection,
  closeConnection,
  sql // Export sql types for use in queries
};
