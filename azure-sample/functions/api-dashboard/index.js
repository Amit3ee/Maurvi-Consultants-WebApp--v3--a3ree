/**
 * Azure Function: Dashboard API
 * Returns dashboard data including signals, KPIs, and sync status
 * 
 * This replaces the getDashboardData() function from Google Apps Script
 */

const sql = require('mssql');
const { getConnection } = require('../shared/database');
const { getRedisClient } = require('../shared/redis');

module.exports = async function (context, req) {
  context.log('Dashboard data requested');
  
  try {
    const redisClient = await getRedisClient();
    const cacheKey = 'dashboardData';
    
    // Try cache first (60-second TTL)
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      context.log('Cache hit - returning cached data');
      context.res = {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT'
        },
        body: JSON.parse(cached)
      };
      return;
    }
    
    context.log('Cache miss - querying database');
    
    // Get database connection
    const pool = await getConnection();
    
    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    
    // Query 1: Get all Indicator1 signals for today
    const indicator1Result = await pool.request()
      .input('today', sql.Date, today)
      .query(`
        SELECT 
          id,
          symbol,
          reason,
          time,
          created_at,
          CONVERT(varchar, time, 108) as time_formatted
        FROM Signals
        WHERE date = @today
          AND indicator_type = 'Indicator1'
        ORDER BY created_at DESC
      `);
    
    // Query 2: Get all Indicator2 signals for today
    const indicator2Result = await pool.request()
      .input('today', sql.Date, today)
      .query(`
        SELECT 
          id,
          symbol,
          reason,
          time,
          capital_deployed_cr,
          created_at,
          CONVERT(varchar, time, 108) as time_formatted
        FROM Signals
        WHERE date = @today
          AND indicator_type = 'Indicator2'
        ORDER BY created_at DESC
      `);
    
    // Query 3: Get synced signals (symbols with both indicators)
    const syncedResult = await pool.request()
      .input('today', sql.Date, today)
      .query(`
        SELECT DISTINCT
          s1.symbol,
          MAX(s1.created_at) as last_ind1_time,
          MAX(s2.created_at) as last_ind2_time
        FROM Signals s1
        INNER JOIN Signals s2 ON s1.symbol = s2.symbol AND s1.date = s2.date
        WHERE s1.date = @today
          AND s1.indicator_type = 'Indicator1'
          AND s2.indicator_type = 'Indicator2'
        GROUP BY s1.symbol
        ORDER BY MAX(s2.created_at) DESC
      `);
    
    // Query 4: Get NIFTY signals
    const niftyResult = await pool.request()
      .input('today', sql.Date, today)
      .query(`
        SELECT TOP 10
          reason,
          time,
          CONVERT(varchar, time, 108) as time_formatted,
          created_at
        FROM Signals
        WHERE date = @today
          AND indicator_type = 'Indicator2'
          AND symbol IN ('NIFTY', 'NIFTY1!')
        ORDER BY created_at DESC
      `);
    
    // Build live feed with sync status
    const liveFeed = indicator1Result.recordset.map(sig => {
      const hasSyncEvent = syncedResult.recordset.some(
        sync => sync.symbol === sig.symbol
      );
      return {
        id: sig.id,
        symbol: sig.symbol,
        reason: sig.reason,
        time: sig.time_formatted,
        timestamp: sig.created_at,
        status: hasSyncEvent ? 'Synced' : 'Awaiting'
      };
    });
    
    // Categorize Indicator2 signals (logs)
    const logs = {
      hvd: [],
      bullish: [],
      bearish: [],
      oversold: [],
      overbought: []
    };
    
    indicator2Result.recordset.forEach(sig => {
      const logEntry = {
        id: sig.id,
        symbol: sig.symbol,
        reason: sig.reason,
        time: sig.time_formatted,
        timestamp: sig.created_at,
        capital: sig.capital_deployed_cr
      };
      
      const reason = sig.reason.toLowerCase();
      if (reason.includes('hvd')) {
        logs.hvd.push(logEntry);
      } else if (reason.includes('bullish')) {
        logs.bullish.push(logEntry);
      } else if (reason.includes('bearish')) {
        logs.bearish.push(logEntry);
      } else if (reason.includes('oversold')) {
        logs.oversold.push(logEntry);
      } else if (reason.includes('overbought')) {
        logs.overbought.push(logEntry);
      }
    });
    
    // Build synced list for dashboard
    const dashboardSyncedList = syncedResult.recordset.map(sync => {
      // Get latest reasons from both indicators
      const ind1Signals = indicator1Result.recordset.filter(
        s => s.symbol === sync.symbol
      );
      const ind2Signals = indicator2Result.recordset.filter(
        s => s.symbol === sync.symbol
      );
      
      return {
        symbol: sync.symbol,
        ind1Reasons: ind1Signals.map(s => s.reason),
        ind2Reasons: ind2Signals.map(s => s.reason),
        lastInd1Time: sync.last_ind1_time,
        lastInd2Time: sync.last_ind2_time
      };
    });
    
    // Calculate KPIs
    const kpis = {
      totalSignals: indicator1Result.recordset.length,
      syncedSignals: syncedResult.recordset.length,
      latestSignal: liveFeed.length > 0 ? liveFeed[0] : null,
      indicator2Count: indicator2Result.recordset.length
    };
    
    // Build response
    const response = {
      kpis: kpis,
      liveFeed: liveFeed,
      logs: logs,
      dashboardSyncedList: dashboardSyncedList,
      niftySignals: niftyResult.recordset,
      timestamp: new Date().toISOString()
    };
    
    // Cache for 60 seconds
    await redisClient.setEx(cacheKey, 60, JSON.stringify(response));
    
    context.log('Dashboard data prepared successfully');
    
    context.res = {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Cache': 'MISS'
      },
      body: response
    };
    
  } catch (error) {
    context.log.error('Error getting dashboard data:', error);
    
    context.res = {
      status: 500,
      body: {
        error: 'Failed to retrieve dashboard data',
        message: error.message
      }
    };
  }
};
