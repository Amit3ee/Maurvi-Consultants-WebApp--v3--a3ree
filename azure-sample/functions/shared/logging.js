/**
 * Shared Module: Error Logging
 * Logs errors to database for debugging
 */

const { getConnection } = require('./database');
const sql = require('mssql');

/**
 * Log error to DebugLogs table
 * @param {Object} context - Azure Function context
 * @param {string} functionContext - Which function/context the error occurred in
 * @param {Error} error - The error object
 * @param {string} [details] - Additional details (optional)
 */
async function logError(context, functionContext, error, details = '') {
  try {
    const pool = await getConnection();
    
    await pool.request()
      .input('context', sql.VarChar(500), functionContext)
      .input('errorMessage', sql.Text, error.message || 'Unknown error')
      .input('details', sql.Text, details)
      .input('stackTrace', sql.Text, error.stack || '')
      .query(`
        INSERT INTO DebugLogs (timestamp, context, error_message, details, stack_trace)
        VALUES (GETDATE(), @context, @errorMessage, @details, @stackTrace)
      `);
    
    context.log('Error logged to database');
    
  } catch (logError) {
    // If logging fails, at least log to console
    context.log.error('Failed to log error to database:', logError);
  }
}

module.exports = {
  logError
};
