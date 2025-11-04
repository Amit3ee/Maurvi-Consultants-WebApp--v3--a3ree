# Google Apps Script to Azure Functions - Comparison Guide

This document provides a detailed comparison between the current Google Apps Script implementation and the proposed Azure Functions architecture, helping understand the migration changes.

## High-Level Comparison

| Aspect | Google Apps Script | Azure Functions |
|--------|-------------------|-----------------|
| **Runtime** | JavaScript (Rhino/V8) | Node.js 18+ (standard V8) |
| **Execution Model** | Script-based, synchronous | Event-driven, async/await |
| **Data Storage** | Google Sheets | Azure SQL Database |
| **Caching** | CacheService | Azure Redis Cache |
| **Authentication** | Built-in session | Custom JWT/session tokens |
| **Email** | GmailApp | SendGrid/Azure Communication Services |
| **Triggers** | Time-based, installable | Timer, HTTP, Queue |
| **Deployment** | Manual via UI | CI/CD with GitHub Actions |
| **Scaling** | Automatic (limited) | Automatic (unlimited) |
| **Cost** | Free (with quotas) | Pay-as-you-go |
| **Monitoring** | Basic logs | Application Insights (full telemetry) |

## Code Comparison Examples

### Example 1: HTTP Endpoint (Webhook Handler)

#### Google Apps Script (doPost)

```javascript
function doPost(e) {
  const lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(30000);
    
    const postData = e.postData.contents;
    const data = JSON.parse(postData);
    
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName('Indicator1');
    
    // Write to sheet
    sheet.appendRow([data.symbol, data.reason, new Date()]);
    
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } finally {
    lock.releaseLock();
  }
}
```

#### Azure Functions (webhook-handler/index.js)

```javascript
const sql = require('mssql');
const { getConnection } = require('../shared/database');

module.exports = async function (context, req) {
  context.log('Webhook received:', req.body);
  
  try {
    // No explicit locking needed - database handles concurrency
    const data = req.body;
    
    // Validate input
    if (!data.symbol || !data.reason) {
      context.res = {
        status: 400,
        body: { error: 'Missing required fields' }
      };
      return;
    }
    
    // Get database connection
    const pool = await getConnection();
    
    // Insert data
    await pool.request()
      .input('symbol', sql.VarChar, data.symbol)
      .input('reason', sql.VarChar, data.reason)
      .input('date', sql.Date, new Date())
      .query(`
        INSERT INTO Signals (date, symbol, indicator_type, reason, time)
        VALUES (@date, @symbol, 'Indicator1', @reason, CONVERT(time, GETDATE()))
      `);
    
    context.res = {
      status: 200,
      body: { status: 'success' }
    };
    
  } catch (error) {
    context.log.error('Error processing webhook:', error);
    
    context.res = {
      status: 500,
      body: { error: 'Internal server error' }
    };
  }
};
```

**Key Differences**:
1. **Async/await**: Azure Functions use native Promise-based async operations
2. **No explicit locking**: Database transactions handle concurrency
3. **Structured logging**: `context.log` with different levels
4. **Connection pooling**: Reuse database connections efficiently
5. **Error handling**: Standard try-catch with proper HTTP status codes

---

### Example 2: Data Retrieval (Dashboard Data)

#### Google Apps Script (getDashboardData)

```javascript
function getDashboardData() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const cache = CacheService.getScriptCache();
  
  // Try cache first
  const cacheKey = 'dashboardData';
  const cached = cache.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Get data from sheet
  const sheet = ss.getSheetByName('Indicator1');
  const data = sheet.getDataRange().getValues();
  
  // Process data
  const signals = data.slice(1).map(row => ({
    symbol: row[0],
    reason: row[1],
    time: row[2]
  }));
  
  const result = {
    signals: signals,
    count: signals.length
  };
  
  // Cache for 60 seconds
  cache.put(cacheKey, JSON.stringify(result), 60);
  
  return result;
}
```

#### Azure Functions (api-dashboard/index.js)

```javascript
const sql = require('mssql');
const redis = require('redis');
const { getConnection } = require('../shared/database');
const { getRedisClient } = require('../shared/redis');

module.exports = async function (context, req) {
  try {
    const redisClient = await getRedisClient();
    const cacheKey = 'dashboardData';
    
    // Try cache first
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      context.log('Cache hit');
      context.res = {
        status: 200,
        body: JSON.parse(cached)
      };
      return;
    }
    
    // Get data from database
    const pool = await getConnection();
    const result = await pool.request()
      .query(`
        SELECT 
          symbol,
          reason,
          time,
          created_at
        FROM Signals
        WHERE date = CAST(GETDATE() AS DATE)
          AND indicator_type = 'Indicator1'
        ORDER BY created_at DESC
      `);
    
    const signals = result.recordset;
    
    const response = {
      signals: signals,
      count: signals.length
    };
    
    // Cache for 60 seconds
    await redisClient.setEx(cacheKey, 60, JSON.stringify(response));
    
    context.res = {
      status: 200,
      body: response
    };
    
  } catch (error) {
    context.log.error('Error getting dashboard data:', error);
    
    context.res = {
      status: 500,
      body: { error: 'Failed to retrieve data' }
    };
  }
};
```

**Key Differences**:
1. **Redis instead of CacheService**: More powerful caching with TTL
2. **SQL queries instead of sheet operations**: Better performance at scale
3. **Proper error handling**: Structured error responses
4. **Connection pooling**: Reuse connections across invocations

---

### Example 3: Authentication (OTP Generation)

#### Google Apps Script (generateOTPServer)

```javascript
function generateOTPServer(email) {
  if (email !== ADMIN_EMAIL) {
    return { error: 'Unauthorized email' };
  }
  
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Store in cache (3 minutes)
  const cache = CacheService.getScriptCache();
  cache.put(`otp_${email}`, otp, 180);
  
  // Send email
  GmailApp.sendEmail(
    email,
    'Your OTP Code',
    `Your OTP is: ${otp}\n\nValid for 3 minutes.`
  );
  
  return { success: true };
}
```

#### Azure Functions (api-auth/generate-otp.js)

```javascript
const { getRedisClient } = require('../shared/redis');
const { sendEmail } = require('../shared/email');

module.exports = async function (context, req) {
  try {
    const { email } = req.body;
    const adminEmail = process.env.ADMIN_EMAIL;
    
    // Validate email
    if (email !== adminEmail) {
      context.res = {
        status: 403,
        body: { error: 'Unauthorized email' }
      };
      return;
    }
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store in Redis (3 minutes = 180 seconds)
    const redisClient = await getRedisClient();
    await redisClient.setEx(`otp_${email}`, 180, otp);
    
    // Send email via SendGrid
    await sendEmail({
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP is: ${otp}\n\nValid for 3 minutes.`,
      html: `<p>Your OTP is: <strong>${otp}</strong></p><p>Valid for 3 minutes.</p>`
    });
    
    context.res = {
      status: 200,
      body: { success: true }
    };
    
  } catch (error) {
    context.log.error('Error generating OTP:', error);
    
    context.res = {
      status: 500,
      body: { error: 'Failed to generate OTP' }
    };
  }
};
```

**Key Differences**:
1. **Environment variables**: Configuration via `process.env`
2. **External email service**: SendGrid instead of GmailApp
3. **Async operations**: All I/O is async
4. **Better error handling**: Proper HTTP status codes

---

### Example 4: Scheduled Task (Daily Maintenance)

#### Google Apps Script (Time-based Trigger)

```javascript
function dailySetupAndMaintenance() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const today = new Date();
  const dateSuffix = Utilities.formatDate(
    today, 
    Session.getScriptTimeZone(), 
    'yyyy-MM-dd'
  );
  
  // Create today's sheet
  const sheetName = `Indicator1_${dateSuffix}`;
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.getRange('A1:C1').setValues([['Symbol', 'Reason', 'Time']]);
  }
  
  // Delete old sheets (14 days)
  const purgeDate = new Date();
  purgeDate.setDate(today.getDate() - 14);
  const purgeSuffix = Utilities.formatDate(
    purgeDate,
    Session.getScriptTimeZone(),
    'yyyy-MM-dd'
  );
  
  const allSheets = ss.getSheets();
  allSheets.forEach(sheet => {
    if (sheet.getName().includes(purgeSuffix)) {
      ss.deleteSheet(sheet);
    }
  });
  
  // Clear cache
  const cache = CacheService.getScriptCache();
  cache.remove('dashboardData');
}
```

#### Azure Functions (daily-maintenance/index.js)

```javascript
const sql = require('mssql');
const { getConnection } = require('../shared/database');
const { getRedisClient } = require('../shared/redis');

module.exports = async function (context, myTimer) {
  context.log('Daily maintenance started at:', new Date().toISOString());
  
  try {
    const pool = await getConnection();
    
    // Execute cleanup stored procedure
    await pool.request()
      .execute('CleanupOldData');
    
    context.log('Database cleanup completed');
    
    // Clear Redis cache
    const redisClient = await getRedisClient();
    await redisClient.flushDb();
    
    context.log('Cache cleared');
    
    // Optional: Send summary email
    const result = await pool.request()
      .query(`
        SELECT 
          COUNT(*) as total_signals,
          COUNT(DISTINCT symbol) as unique_symbols
        FROM Signals
        WHERE date = CAST(GETDATE() AS DATE)
      `);
    
    context.log('Daily summary:', result.recordset[0]);
    
  } catch (error) {
    context.log.error('Error in daily maintenance:', error);
    throw error; // Will trigger Azure Monitor alert
  }
};
```

**function.json** for Timer Trigger:
```json
{
  "bindings": [
    {
      "name": "myTimer",
      "type": "timerTrigger",
      "direction": "in",
      "schedule": "0 0 1 * * *"
    }
  ]
}
```

**Key Differences**:
1. **CRON expression**: Standard scheduling format
2. **Stored procedure**: Database handles complex logic
3. **Monitoring**: Failures automatically logged and alerted
4. **No sheet management**: Database automatically handles data organization

---

## Data Model Comparison

### Google Sheets Structure

**Sheet: Indicator1_2025-01-15**
```
| Symbol | Reason 1 | Time 1 | Reason 2 | Time 2 | ... |
|--------|----------|--------|----------|--------|-----|
| AAPL   | Surge    | 10:30  | Pattern  | 14:15  |     |
| TSLA   | Volume   | 11:00  |          |        |     |
```

**Limitations**:
- Fixed column structure
- Manual row mapping needed
- Sheet size limits (5 million cells)
- No indexing or query optimization

### Azure SQL Database Structure

**Table: Signals**
```sql
CREATE TABLE Signals (
    id BIGINT IDENTITY PRIMARY KEY,
    date DATE NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    indicator_type VARCHAR(20) NOT NULL,
    reason VARCHAR(500) NOT NULL,
    time TIME NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    INDEX idx_date_symbol (date, symbol),
    INDEX idx_date_indicator (date, indicator_type)
);
```

**Sample Data**:
```
| id | date       | symbol | indicator_type | reason  | time     |
|----|------------|--------|----------------|---------|----------|
| 1  | 2025-01-15 | AAPL   | Indicator1     | Surge   | 10:30:00 |
| 2  | 2025-01-15 | AAPL   | Indicator2     | Pattern | 14:15:00 |
| 3  | 2025-01-15 | TSLA   | Indicator1     | Volume  | 11:00:00 |
```

**Advantages**:
- Normalized data structure
- Automatic indexing
- Complex queries possible
- No size limits (for this scale)
- Built-in backup and recovery

---

## API Comparison

### Google Apps Script - Frontend Integration

```javascript
// Frontend code calling GAS backend
google.script.run
  .withSuccessHandler(response => {
    console.log('Data:', response);
  })
  .withFailureHandler(error => {
    console.error('Error:', error);
  })
  .getDashboardData();
```

**Limitations**:
- GAS-specific API
- No standard HTTP methods
- Limited error handling
- Coupled to Google infrastructure

### Azure Functions - Frontend Integration

```javascript
// Frontend code calling Azure Functions
async function getDashboardData() {
  try {
    const response = await fetch(
      'https://maurvi-functions.azurewebsites.net/api/dashboard',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Data:', data);
    return data;
    
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}
```

**Advantages**:
- Standard REST API
- Full HTTP control
- Better error handling
- Works with any frontend framework
- Can use API management tools

---

## Deployment Comparison

### Google Apps Script Deployment

**Manual Steps**:
1. Open Apps Script editor
2. Copy/paste code
3. Deploy → New deployment
4. Select version and permissions
5. Copy deployment URL
6. Update TradingView webhooks manually

**Limitations**:
- Manual process
- No version control integration
- Difficult to rollback
- No automated testing
- No staging environment

### Azure Functions Deployment (GitHub Actions)

**Automated Process**:
1. Push code to GitHub
2. GitHub Actions automatically:
   - Runs tests
   - Builds application
   - Deploys to Azure
   - Updates configuration
   - Runs smoke tests

**Advantages**:
- Full CI/CD pipeline
- Automatic rollback on failure
- Staging slots for testing
- Version control integrated
- Comprehensive testing

---

## Monitoring and Debugging Comparison

### Google Apps Script

**Tools Available**:
- Execution logs (limited retention)
- Logger.log() output
- Stackdriver (basic)
- Manual error logging to sheets

**Limitations**:
- Limited historical data
- No real-time monitoring
- Basic metrics only
- No alerting (without custom setup)

### Azure Functions + Application Insights

**Tools Available**:
- Real-time log streaming
- Application Insights (full telemetry)
- Custom metrics and events
- Automated alerting
- Performance profiling
- Dependency tracking
- User analytics

**Query Examples**:

```kusto
// Failed requests in last 24 hours
requests
| where success == false
| where timestamp > ago(24h)
| summarize count() by resultCode
| render piechart

// Slow requests (>1 second)
requests
| where duration > 1000
| order by duration desc
| take 10

// Exception rate
exceptions
| summarize count() by type
| render barchart
```

---

## Cost Comparison

### Google Apps Script

**Costs**: Free within quotas
- 6 min max execution time
- 20,000 URL fetches/day
- 100 email/day (Gmail)
- 5 million cells per sheet

**Cost when exceeded**: Not possible - hard limits

### Azure (Estimated Monthly)

| Resource | Usage | Cost |
|----------|-------|------|
| Functions | ~500K executions | $10-20 |
| SQL Database | Basic tier | $5 |
| Redis Cache | 250MB | $16 |
| Static Web App | Free tier | $0 |
| SendGrid | 100 emails/day | $0 |
| **Total** | | **$31-41** |

**Scaling**: Costs increase linearly with usage, but limits are much higher

---

## Migration Checklist

### Pre-Migration
- [ ] Review current GAS code and dependencies
- [ ] Create Azure subscription
- [ ] Set up development environment
- [ ] Create new repository

### During Migration
- [ ] Convert GAS functions to Azure Functions
- [ ] Set up Azure SQL Database
- [ ] Update frontend API calls
- [ ] Configure GitHub Actions
- [ ] Migrate historical data
- [ ] Test all features

### Post-Migration
- [ ] Update TradingView webhooks
- [ ] Monitor for errors
- [ ] Verify data accuracy
- [ ] Decommission GAS (after validation period)
- [ ] Update documentation

---

## Conclusion

The migration from Google Apps Script to Azure Functions provides:

✅ **Better performance** - Faster execution, optimized database queries  
✅ **Better scalability** - Handle much higher load  
✅ **Better monitoring** - Comprehensive telemetry and alerting  
✅ **Better deployment** - Automated CI/CD with GitHub Actions  
✅ **Better development** - Modern tools, TypeScript support, testing  
✅ **Industry standard** - REST APIs, SQL database, standard practices  

The trade-off is moving from a free (but limited) platform to a paid (but much more capable) platform. For a production application, this is a worthwhile investment.

---

**Document Version**: 1.0  
**Last Updated**: November 2025  
**Author**: Maurvi Consultants Development Team
