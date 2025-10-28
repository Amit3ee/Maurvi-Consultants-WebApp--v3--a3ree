# Data Sync Troubleshooting Guide

This guide helps diagnose and resolve issues when data stops reflecting on the web app from Google Sheets.

## Quick Diagnosis

### Step 1: Run Health Check

Open Google Apps Script editor and run the `checkDataSyncHealth()` function:

```javascript
checkDataSyncHealth()
```

This will provide a comprehensive health report including:
- Sheet existence verification
- Data row counts
- Cache status
- Data fetch performance
- Signal freshness

### Step 2: Check Execution Logs

1. Go to Apps Script Editor
2. Click "Executions" in the left sidebar
3. Look for any failed executions or errors
4. Check execution times - should be under 30 seconds for getDashboardData

### Step 3: Verify Sheets Exist

Check that today's sheets exist:
- `Indicator1_YYYY-MM-DD`
- `Indicator2_YYYY-MM-DD`
- `DebugLogs_YYYY-MM-DD`

If missing, run:
```javascript
dailySetupAndMaintenance()
```

## Common Issues and Solutions

### Issue 1: Data Not Updating in Real-Time

**Symptoms:**
- Web app shows old data
- New signals don't appear
- Data is stale (30+ seconds old)

**Solutions:**

1. **Cache TTL Fixed**: Cache now expires every 5 seconds instead of 30 seconds
2. **Cache Invalidation**: Cache is automatically cleared when new data is written via webhooks
3. **Verify polling interval**: Frontend polls every 5 seconds - check browser console for errors

**Manual Fix:**
Clear cache manually by running:
```javascript
const cache = CacheService.getScriptCache();
const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
cache.remove(`sheetData_Indicator1_${today}`);
cache.remove(`sheetData_Indicator2_${today}`);
```

### Issue 2: Quota Exhaustion

**Symptoms:**
- Errors mentioning "quota" or "rate limit"
- Errors like "Service invoked too many times"
- Data fetching stops working

**Solutions:**

1. **Retry Logic Implemented**: System now retries failed operations up to 3 times with exponential backoff
2. **Monitor Quota Usage**:
   - Go to Apps Script dashboard
   - Check quota usage for the day
   - Script quotas reset daily at midnight Pacific Time

**Google Apps Script Quotas (Consumer Gmail):**
- Execution time: 6 minutes per execution
- Total execution time: 90 minutes per day
- URL Fetch calls: 20,000 per day
- Triggers: 20 per script, 90 minutes total runtime per day

**Optimization Tips:**
- Reduce frontend polling if too aggressive
- Check for infinite loops in error handlers
- Ensure daily trigger runs only once per day

### Issue 3: Cache Service Failures

**Symptoms:**
- Errors mentioning "cache"
- Intermittent failures
- Data works sometimes but not others

**Solutions:**

1. **Safe Cache Wrappers Implemented**: All cache operations now use error-safe wrappers
2. **Graceful Degradation**: System continues working even if cache fails
3. **Automatic Fallback**: Falls back to direct sheet reads if cache unavailable

**No manual action required** - the system now handles cache failures automatically.

### Issue 4: Sheet Not Found Errors

**Symptoms:**
- Error: "Sheet not found: Indicator1_YYYY-MM-DD"
- 404 or missing sheet errors
- Data suddenly stops after midnight

**Solutions:**

1. **Daily Maintenance**: Ensure daily trigger is set up and running
2. **Manual Sheet Creation**: Run `dailySetupAndMaintenance()` manually
3. **Auto-Creation Enabled**: System will auto-create today's sheets if missing

**Set Up Daily Trigger:**
1. Open Apps Script Editor
2. Click "Triggers" (clock icon)
3. Add Trigger:
   - Function: `dailySetupAndMaintenance`
   - Event source: Time-driven
   - Type: Day timer
   - Time of day: 12am to 1am
4. Save

### Issue 5: Lock Timeout Errors

**Symptoms:**
- Error: "Lock timeout: another process was holding the lock"
- Webhook requests fail
- Concurrent request issues

**Solutions:**

1. **Lock Timeout Increased**: Now 120 seconds (was 30 seconds)
2. **Retry Logic**: System retries up to 3 times with exponential backoff
3. **Concurrent Requests**: System properly queues concurrent webhook requests

**If still occurring:**
- Check if multiple triggers are running simultaneously
- Verify no infinite loops in webhook handlers
- Check execution logs for long-running operations

## Monitoring Best Practices

### Daily Checks

1. **Morning Check** (9 AM):
   - Run `checkDataSyncHealth()`
   - Verify today's sheets exist
   - Check signal count is growing

2. **Afternoon Check** (3 PM):
   - Verify data is updating in web app
   - Check execution logs for errors
   - Monitor quota usage if errors occur

### Weekly Maintenance

1. **Review Old Sheets**:
   - Sheets older than 14 days should be auto-deleted
   - Verify purge is working correctly

2. **Check Triggers**:
   - Verify daily trigger is running
   - Check trigger execution history

3. **Quota Review**:
   - Check quota usage trends
   - Identify any spikes or issues

## Performance Metrics

### Expected Performance

| Operation | Expected Time | Warning Threshold |
|-----------|--------------|-------------------|
| getDashboardData | 200-800ms | > 2000ms |
| Webhook processing | 120-250ms | > 1000ms |
| Sheet data fetch | 100-400ms | > 1000ms |
| Cache hit | < 10ms | > 50ms |

### Health Check Interpretation

**Healthy System:**
```
✅ Sheets exist
✅ Cache exists with N symbols
✅ Indicator1 data cache: Present
✅ Indicator2 data cache: Present
✅ getDashboardData succeeded in <800ms
✅ Latest signal is <30 minutes old
```

**Unhealthy System:**
```
❌ ERROR: Sheet not found
⚠️ No cache found for symbol row map
❌ Indicator1 data cache: Missing
⚠️ Latest signal is 120 minutes old
```

## Advanced Troubleshooting

### Enable Detailed Logging

Add this to your webhook handler for debugging:

```javascript
Logger.log(`Webhook received at ${new Date().toISOString()}`);
Logger.log(`Data: ${JSON.stringify(data)}`);
Logger.log(`Cache cleared: ${dateSuffix}`);
```

### Test Webhook Manually

Use curl to send test webhook:

```bash
curl -X POST "YOUR_WEB_APP_URL" \
  -H "Content-Type: application/json" \
  -d '{"scrip": "TESTSTOCK", "reason": "Test Signal"}'
```

### Check Browser Console

Open browser DevTools (F12) and check:
- Network tab for failed API calls
- Console tab for JavaScript errors
- Verify polling is active (should see requests every 5 seconds)

### Verify Cache State

Run this to check cache contents:

```javascript
const cache = CacheService.getScriptCache();
const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

// Check symbol map
const symbolMapKey = `symbolRowMap_${today}`;
const symbolMap = cache.get(symbolMapKey);
Logger.log(`Symbol map: ${symbolMap ? 'EXISTS' : 'MISSING'}`);

// Check data cache
const ind1Key = `sheetData_Indicator1_${today}`;
const ind1Cache = cache.get(ind1Key);
Logger.log(`Indicator1 cache: ${ind1Cache ? 'EXISTS' : 'MISSING'}`);
```

## Escalation

If issues persist after trying all solutions:

1. **Check Recent Changes**: Review recent deployments or code changes
2. **Review Execution Logs**: Look for patterns in errors
3. **Check Google Status**: Visit [Google Workspace Status Dashboard](https://www.google.com/appsstatus)
4. **Clear All Cache**: Run `eraseMockData()` then `dailySetupAndMaintenance()`
5. **Redeploy Web App**: Create new deployment with fresh execution

## Changes Made to Fix Data Sync

### Version 3.1 - Data Sync Improvements

1. **Cache TTL Reduction** (High Impact)
   - Old: 30 seconds
   - New: 5 seconds
   - Impact: Data appears 6x faster in web app

2. **Retry Logic** (High Impact)
   - Added exponential backoff for failed operations
   - 3 retries with 500ms, 1s, 2s delays
   - Handles quota exhaustion gracefully

3. **Safe Cache Operations** (Medium Impact)
   - Added error-safe wrappers for all cache operations
   - System continues working even if cache fails
   - Prevents cascading failures

4. **Health Check Function** (Medium Impact)
   - Manual diagnostics tool
   - Comprehensive system status
   - Performance metrics

5. **Enhanced Logging** (Low Impact)
   - Timing metrics for all operations
   - Better error context
   - Easier troubleshooting

## Summary

The primary issue was **cache TTL too long** (30 seconds) combined with **no retry logic** for API failures. 

**Key fixes:**
1. Reduced cache to 5 seconds → Data updates 6x faster
2. Added retry logic → Handles temporary failures
3. Safe cache wrappers → Prevents cache-related crashes
4. Health check tool → Easy diagnostics

The system now:
- ✅ Updates data every 5 seconds (matches polling interval)
- ✅ Automatically retries failed operations
- ✅ Handles cache failures gracefully
- ✅ Provides detailed health diagnostics
- ✅ Logs performance metrics

**Expected result:** Data should now reflect on the web app within 5-10 seconds of being written to sheets, with no more "stopped reflecting" issues.
