# Lock Timeout and Debug Error Resolution Guide

## Overview
This guide addresses the "Lock timeout: another process was holding the lock for too long" errors that occur when multiple TradingView alerts arrive simultaneously.

## Understanding Lock Timeouts

### What is a Lock?
The application uses **LockService** to ensure that only one request can write to the Google Sheet at a time. This prevents data corruption and race conditions when multiple alerts arrive simultaneously.

### Why Lock Timeouts Occur
Lock timeouts happen when:
1. **High Alert Volume**: Multiple TradingView alerts arrive at the same time (e.g., market open, major event)
2. **Long Processing Time**: A single request takes too long to process
3. **Concurrent Requests**: Many requests are queued waiting for the lock
4. **Google Sheets API Limits**: Sheet operations can be slow during peak times

## Current Implementation (Fixed)

### Lock Timeout Settings
- **Timeout**: 120 seconds (2 minutes)
- **Retry Attempts**: 3 retries with exponential backoff
- **Backoff Timing**: 1s, 2s, 4s between retries

### Retry Logic
```javascript
let lockAcquired = false;
let retryCount = 0;
const maxRetries = 3;
const lockTimeout = 120000; // 120 seconds

while (!lockAcquired && retryCount < maxRetries) {
  try {
    lock.waitLock(lockTimeout);
    lockAcquired = true;
  } catch (lockErr) {
    retryCount++;
    if (retryCount >= maxRetries) {
      throw new Error(`Failed to acquire lock after ${maxRetries} retries`);
    }
    // Exponential backoff: wait 1s, 2s, 4s
    Utilities.sleep(Math.pow(2, retryCount - 1) * 1000);
  }
}
```

## Monitoring Lock Timeouts

### Check Debug Logs
1. Open your Google Sheet
2. Go to the `DebugLogs_YYYY-MM-DD` sheet
3. Look for errors with context "doPost Error"
4. Filter for "Lock timeout" in the Error Message column

### Analyze Error Patterns
Check if errors occur:
- **Time-based**: During market open (9:15-9:30 AM), major events
- **Symbol-based**: Specific symbols generating many alerts
- **Volume-based**: High alert volume periods

### Using Script Logs
1. Open Apps Script editor (Extensions > Apps Script)
2. Click **Executions** icon (left sidebar)
3. View recent executions and their logs
4. Look for "doPost CRITICAL ERROR" entries

## Preventing Lock Timeouts

### 1. Alert Configuration in TradingView
**Reduce concurrent alerts:**
- Stagger alerts by 1-2 seconds if possible
- Use different time frames for different indicators
- Avoid triggering multiple alerts for the same symbol simultaneously

**Example Alert Timing:**
- Indicator1 alerts: Every minute at :00
- Indicator2 alerts: Every minute at :30
- This creates a 30-second gap between alert types

### 2. Optimize Sheet Operations
The application already implements several optimizations:
- **Caching**: Symbol row map is cached for 24 hours
- **Batching**: Single `appendRow()` call per Indicator2 signal
- **Minimal Reads**: Uses cached data when possible

### 3. Scale Considerations
**Current Capacity:**
- Can handle ~100 concurrent requests with retry logic
- Lock timeout at 120 seconds allows for reasonable queue processing

**If you exceed capacity:**
- Consider splitting alerts across multiple sheet instances
- Use separate sheets for different market segments (NSE, BSE, Crypto)
- Implement webhook queuing on TradingView side

## Error Recovery

### Automatic Recovery
The application includes automatic recovery mechanisms:
1. **Retry Logic**: Up to 3 retries with backoff
2. **Error Logging**: All failures logged to DebugLogs sheet
3. **Graceful Degradation**: Failed requests return error status to TradingView

### Manual Recovery
If alerts are lost due to lock timeouts:

1. **Check Indicator2 Sheet**: Verify if the signal was recorded
   - Even if lock timeout occurred, Indicator2 signal may have been saved
   
2. **Check Symbol Row Map**: Verify symbol exists in Indicator1 sheet
   - If missing, the signal may have been intentionally skipped (Indicator2-only)
   
3. **Manual Signal Entry** (if critical):
   - Add symbol to Indicator1 sheet manually
   - Add sync reason to appropriate sync column
   - Format: Time in HH:mm:ss, Reason as text

### TradingView Alert Retry
Configure TradingView alerts to retry on failure:
1. In TradingView, edit your alert
2. Enable "Retry on failure" if available
3. Set retry interval to 60 seconds

## Best Practices

### 1. Alert Design
- **Use meaningful delays**: Space out alerts by 5-10 seconds per symbol
- **Batch similar signals**: Combine multiple conditions into one alert when possible
- **Prioritize critical signals**: Use different webhooks for high-priority vs. low-priority

### 2. Monitoring
- **Daily Log Review**: Check DebugLogs sheet daily for patterns
- **Set up notifications**: Configure email alerts for critical errors
- **Track metrics**: Monitor alert success rate and lock timeout frequency

### 3. Peak Period Handling
During high-volume periods (market open, major news):
- **Accept some delays**: 2-3 minute delays are acceptable
- **Don't resend manually**: Retries are automatic
- **Monitor logs**: Watch for persistent failures (>3 retries)

## Troubleshooting Specific Scenarios

### Scenario 1: Persistent Lock Timeouts
**Symptoms**: Lock timeouts occur constantly, even with retries
**Causes**: Sheet is corrupted, too many rows, or external access
**Solutions**:
1. Run `refreshRearrangeCurrentData()` to clean up data
2. Check for external scripts accessing the sheet
3. Verify sheet is not being manually edited during trading hours
4. Consider purging old data more frequently

### Scenario 2: Lock Timeouts During Specific Times
**Symptoms**: Errors only during market open or close
**Causes**: High concurrent alert volume during these periods
**Solutions**:
1. Increase retry count to 5 for peak hours (edit code)
2. Stagger TradingView alerts across 30-second windows
3. Accept that some delays are normal during peak times

### Scenario 3: Single Symbol Causing Issues
**Symptoms**: One symbol consistently causes lock timeouts
**Causes**: Too many alerts for single symbol, data corruption
**Solutions**:
1. Check TradingView alert configuration for that symbol
2. Verify alert logic isn't triggering too frequently
3. Check Indicator1 sheet for row corruption (too many sync events)

### Scenario 4: All Requests Failing
**Symptoms**: Every request gets lock timeout, no data recorded
**Causes**: Sheet ID incorrect, permissions issue, script error
**Solutions**:
1. Verify SHEET_ID in code.gs matches your sheet
2. Check script permissions (Re-authorize if needed)
3. Run `testOpenSheet()` to verify sheet access
4. Check Apps Script quota limits

## Advanced Optimization (Optional)

### For High-Volume Environments (>500 alerts/hour)

1. **Implement Queue System**:
   - Use Google Cloud Tasks or Pub/Sub for queuing
   - Process alerts asynchronously
   - Better handling of bursts

2. **Database Alternative**:
   - Consider Google Cloud SQL or Firestore
   - Faster write operations
   - Better concurrency handling

3. **Multiple Sheet Strategy**:
   - Split data across multiple sheets by symbol category
   - Use separate web app deployments for each
   - Reduces lock contention

## Monitoring Dashboard

### Key Metrics to Track
1. **Error Rate**: Lock timeouts per hour
2. **Average Lock Wait Time**: Time spent waiting for lock
3. **Retry Success Rate**: How often retries succeed
4. **Peak Load Times**: When most errors occur

### Creating a Monitoring Script
```javascript
function analyzeDebugLogs() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const logSheet = ss.getSheetByName(`DebugLogs_${today}`);
  
  if (!logSheet) {
    Logger.log('No debug logs found for today');
    return;
  }
  
  const data = logSheet.getDataRange().getValues();
  const lockErrors = data.filter(row => 
    row[2] && row[2].toString().includes('Lock timeout')
  );
  
  Logger.log(`Total lock timeout errors today: ${lockErrors.length}`);
  
  // Analyze by hour
  const errorsByHour = {};
  lockErrors.forEach(row => {
    const timestamp = new Date(row[0]);
    const hour = timestamp.getHours();
    errorsByHour[hour] = (errorsByHour[hour] || 0) + 1;
  });
  
  Logger.log('Errors by hour:', errorsByHour);
  return { total: lockErrors.length, byHour: errorsByHour };
}
```

## Support and Further Help

If lock timeout errors persist after implementing these solutions:

1. **Document the Pattern**: Note when errors occur, frequency, and affected symbols
2. **Share Logs**: Export DebugLogs sheet and execution logs
3. **Review Configuration**: Verify TradingView alert setup and timing
4. **Check Quotas**: Review Google Apps Script quotas and limits
5. **Contact Support**: Provide detailed error analysis and patterns

## Summary of Fixes Applied

✅ **Lock timeout increased**: 60s → 120s
✅ **Retry logic added**: 3 retries with exponential backoff
✅ **Enhanced error handling**: Detailed error types and messages
✅ **Better logging**: Context and error details in DebugLogs
✅ **Documentation**: This guide and DAILY_TRIGGER_SETUP.md

## Next Steps

1. Monitor lock timeout frequency over the next week
2. Adjust alert timing in TradingView if needed
3. Consider implementing monitoring dashboard
4. Review and optimize based on patterns observed
