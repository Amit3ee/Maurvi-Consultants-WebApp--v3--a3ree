/**
 * Azure Function: Webhook Handler
 * Receives TradingView alerts and stores them in Azure SQL Database
 * 
 * This replaces the doPost() function from Google Apps Script
 */

const sql = require('mssql');
const { getConnection } = require('../shared/database');
const { logError } = require('../shared/logging');

module.exports = async function (context, req) {
  context.log('Webhook received at:', new Date().toISOString());
  
  try {
    const data = req.body;
    
    // Validate input
    if (!data) {
      context.res = {
        status: 400,
        body: { error: 'No data provided' }
      };
      return;
    }
    
    // Determine indicator type based on JSON keys
    // Indicator 1 uses "scrip" key, Indicator 2 uses "ticker" key
    let indicatorType = null;
    let symbol = null;
    
    if (data.scrip) {
      indicatorType = 'Indicator1';
      symbol = data.scrip;
    } else if (data.ticker) {
      indicatorType = 'Indicator2';
      symbol = data.ticker;
    } else {
      context.res = {
        status: 400,
        body: { error: 'Missing required field: must have either "scrip" or "ticker"' }
      };
      return;
    }
    
    // Validate reason
    if (!data.reason) {
      context.res = {
        status: 400,
        body: { error: 'Missing required field: reason' }
      };
      return;
    }
    
    context.log(`Processing ${indicatorType} signal:`, symbol, data.reason);
    
    // Get database connection (uses connection pooling)
    const pool = await getConnection();
    
    // Use server time for consistency (ignores indicator timestamps)
    const currentDate = new Date();
    
    // Insert signal into database
    // Database transaction ensures consistency (no need for LockService)
    const result = await pool.request()
      .input('date', sql.Date, currentDate)
      .input('symbol', sql.VarChar(50), symbol.toUpperCase())
      .input('indicatorType', sql.VarChar(20), indicatorType)
      .input('reason', sql.VarChar(500), data.reason)
      .input('capitalDeployed', sql.Decimal(10, 2), data.capital_deployed_cr || null)
      .query(`
        INSERT INTO Signals 
          (date, symbol, indicator_type, reason, time, capital_deployed_cr, created_at)
        VALUES 
          (@date, @symbol, @indicatorType, @reason, 
           CONVERT(time, GETDATE()), @capitalDeployed, GETDATE())
      `);
    
    context.log('Signal saved successfully. Rows affected:', result.rowsAffected[0]);
    
    // Return success response
    context.res = {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        status: 'success',
        message: 'Signal processed successfully',
        data: {
          symbol: symbol,
          indicatorType: indicatorType,
          reason: data.reason,
          timestamp: currentDate.toISOString()
        }
      }
    };
    
  } catch (error) {
    context.log.error('Error processing webhook:', error);
    
    // Log error to database for debugging
    await logError(context, 'webhook-handler', error, JSON.stringify(req.body));
    
    context.res = {
      status: 500,
      body: {
        error: 'Internal server error',
        message: 'Failed to process signal'
      }
    };
  }
};
