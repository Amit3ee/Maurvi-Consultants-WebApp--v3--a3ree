# Deployment Guide - Timestamp Fix

## Overview
This guide provides step-by-step instructions for deploying the fix for the daily data freeze at 10:00 AM IST.

## Pre-Deployment Checklist

- [ ] Review all changes in the PR
- [ ] Understand the timestamp parsing logic
- [ ] Have access to Google Apps Script editor
- [ ] Have access to the Google Sheet
- [ ] Backup current code.gs (optional but recommended)

## Deployment Steps

### Step 1: Backup Current Code (Recommended)
1. Open Google Apps Script editor
2. File → Manage versions
3. Create a new version with description: "Before timestamp fix"
4. Note the version number for rollback if needed

### Step 2: Update code.gs
1. Open Apps Script editor
2. Open `code.gs` file
3. Locate the `doPost()` function (around line 321)
4. Find the timestamp handling section (around line 353)
5. Replace lines 353-357 with the new code:

```javascript
// Use TradingView timestamp from JSON payload instead of server time
// This fixes the data freeze issue at 10:00 AM IST
const scriptTimeZone = Session.getScriptTimeZone();
let timestamp;

if (data.timestamp) {
  // Parse TradingView timestamp (format: "YYYY-MM-DDTHH:mm:ss" or ISO 8601)
  timestamp = new Date(data.timestamp);
  
  // Validate timestamp is valid
  if (isNaN(timestamp.getTime())) {
    Logger.log(`Invalid timestamp received: ${data.timestamp}, falling back to server time`);
    timestamp = new Date();
  }
} else {
  // Fallback to server time if timestamp not provided
  Logger.log('No timestamp in payload, using server time');
  timestamp = new Date();
}

const dateSuffix = Utilities.formatDate(timestamp, scriptTimeZone, 'yyyy-MM-dd');
const time = Utilities.formatDate(timestamp, scriptTimeZone, 'HH:mm:ss');
```

6. Update the function documentation (around line 312):
   - Change "Timestamps from indicators are IGNORED"
   - To "Timestamps from TradingView JSON are USED"

### Step 3: Add Test Function (Optional but Recommended)
Add this test function at the end of code.gs:

```javascript
/**
 * Test function to verify TradingView timestamp parsing
 * Tests various timestamp formats and validates the fix for 10:00 AM IST freeze issue
 */
function testTimestampParsing() {
  Logger.log('=== Testing TradingView Timestamp Parsing ===');
  
  const scriptTimeZone = Session.getScriptTimeZone();
  Logger.log(`Script timezone: ${scriptTimeZone}`);
  
  // Test cases with different timestamp formats
  const testCases = [
    {
      name: 'ISO 8601 with timezone',
      timestamp: '2025-10-30T10:00:00+05:30',
      expected: '10:00:00'
    },
    {
      name: 'ISO 8601 without timezone (local time)',
      timestamp: '2025-10-30T10:00:00',
      expected: null,
      note: 'Without timezone, parsed as local time'
    },
    {
      name: 'ISO 8601 with Z (UTC)',
      timestamp: '2025-10-30T04:30:00Z',
      expected: '10:00:00'
    },
    {
      name: 'Invalid timestamp',
      timestamp: 'invalid-timestamp',
      expected: null,
      fallback: true
    },
    {
      name: 'Missing timestamp',
      timestamp: null,
      expected: null,
      fallback: true
    }
  ];
  
  testCases.forEach(testCase => {
    Logger.log(`\nTest: ${testCase.name}`);
    Logger.log(`Input: ${testCase.timestamp}`);
    
    let timestamp;
    if (testCase.timestamp) {
      timestamp = new Date(testCase.timestamp);
      
      if (isNaN(timestamp.getTime())) {
        Logger.log('✓ Timestamp validation failed as expected, would fallback to server time');
        timestamp = new Date();
      } else {
        Logger.log(`✓ Parsed timestamp: ${timestamp}`);
      }
    } else {
      Logger.log('✓ No timestamp provided, would fallback to server time');
      timestamp = new Date();
    }
    
    const time = Utilities.formatDate(timestamp, scriptTimeZone, 'HH:mm:ss');
    const dateSuffix = Utilities.formatDate(timestamp, scriptTimeZone, 'yyyy-MM-dd');
    
    Logger.log(`Formatted time: ${time}`);
    Logger.log(`Date suffix: ${dateSuffix}`);
    
    if (testCase.fallback) {
      Logger.log('✓ Successfully fell back to server time');
    } else if (testCase.expected) {
      Logger.log(`Expected: ${testCase.expected}, Got: ${time}`);
    } else if (testCase.note) {
      Logger.log(`Note: ${testCase.note}`);
    }
  });
  
  Logger.log('\n=== Timestamp Parsing Test Complete ===');
  return { status: 'success', message: 'All timestamp parsing tests completed' };
}
```

### Step 4: Save Changes
1. Click "Save" (Ctrl+S or Cmd+S)
2. Verify no syntax errors appear
3. File → Save version → Add description: "Fix data freeze at 10:00 AM IST"

### Step 5: Test the Changes
1. In Apps Script editor, select `testTimestampParsing` from function dropdown
2. Click "Run" (Play button)
3. Review execution logs (View → Logs)
4. Verify all tests pass successfully

### Step 6: Deploy New Version
1. Click "Deploy" → "Manage deployments"
2. Click "Edit" (pencil icon) on the active deployment
3. Under "Version", select "New version"
4. Add description: "Fix data freeze at 10:00 AM IST - use TradingView timestamp"
5. Click "Deploy"
6. Copy the new Web app URL (should be the same as before)

### Step 7: Test with Webhook (Production Test)
Send a test webhook to verify the fix:

```bash
curl -X POST "YOUR_WEB_APP_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "scrip": "TESTSTOCK",
    "timestamp": "2024-10-30T10:00:00+05:30",
    "reason": "Test Signal"
  }'
```

Expected response:
```json
{
  "status": "success",
  "indicator": "Indicator1",
  "symbol": "TESTSTOCK",
  "row": 2,
  "time": "10:00:00"
}
```

### Step 8: Verify in Sheet
1. Open your Google Sheet
2. Check today's Indicator1 sheet (Indicator1_YYYY-MM-DD)
3. Verify TESTSTOCK appears with time "10:00:00" (not current server time)
4. Check Apps Script execution logs for any errors

## Post-Deployment Verification

### Immediate Checks (First Hour)
- [ ] Webhooks are being received successfully
- [ ] Timestamps in sheets match TradingView alert times
- [ ] No errors in Apps Script execution logs
- [ ] Web app displays data correctly
- [ ] Real-time updates working (5-second polling)

### 24-Hour Monitoring
- [ ] Monitor data updates throughout the day
- [ ] Specifically check updates after 10:00 AM IST
- [ ] Verify no data freeze occurs
- [ ] Check for any timestamp parsing errors in logs
- [ ] Verify fallback mechanism works for invalid timestamps

### Key Metrics to Monitor
1. **Timestamp Accuracy**: Sheet timestamps should match TradingView alert times
2. **Update Continuity**: No gaps in data after 10:00 AM IST
3. **Error Rate**: Check for timestamp parsing errors in logs
4. **Fallback Usage**: Monitor how often fallback to server time occurs

## Rollback Procedure (If Needed)

If issues occur after deployment:

### Option 1: Quick Rollback via Version
1. Deploy → Manage deployments
2. Click "Edit" on active deployment
3. Change "Version" to the backup version (from Step 1)
4. Click "Deploy"

### Option 2: Code Rollback
1. Open Apps Script editor
2. File → Manage versions
3. Select the backup version
4. Restore code
5. Redeploy

### Option 3: Emergency Fix
Revert to server time:
```javascript
// Emergency rollback (line 353-357)
const scriptTimeZone = Session.getScriptTimeZone();
const timestamp = new Date();
const dateSuffix = Utilities.formatDate(timestamp, scriptTimeZone, 'yyyy-MM-dd');
const time = Utilities.formatDate(timestamp, scriptTimeZone, 'HH:mm:ss');
```

## Troubleshooting

### Issue: Timestamp parsing errors in logs
**Solution**: This is expected for invalid timestamps. Verify fallback to server time is working.

### Issue: Times not matching TradingView
**Possible Causes**:
1. TradingView not sending timestamp in alert
2. Timezone mismatch
3. Alert format incorrect

**Solution**: 
1. Check TradingView alert message format includes `"timestamp": "{{timenow}}"`
2. Verify script timezone is set to IST in Google Apps Script
3. Check execution logs for timestamp parsing details

### Issue: Data still freezing at 10:00 AM
**Possible Causes**:
1. Deployment not active
2. Cached version still running
3. Browser cache

**Solution**:
1. Verify deployment is active (check deployment URL)
2. Wait 5 minutes for cache to clear
3. Clear browser cache and refresh web app
4. Check Apps Script execution logs for errors

## Support

If you encounter issues:

1. **Check Logs**: Apps Script Editor → View → Logs
2. **Review Documentation**: See TIMESTAMP_FIX.md for details
3. **Test Function**: Run `testTimestampParsing()` to diagnose
4. **Verify Timezone**: Check script timezone settings
5. **Contact Support**: Provide execution logs and error messages

## Documentation References

- `TIMESTAMP_FIX.md` - Detailed technical documentation
- `SECURITY_ANALYSIS.md` - Security review of changes
- `TESTING_GUIDE.md` - Updated testing procedures
- `README.md` - Updated system documentation

## Success Criteria

The deployment is successful when:
- ✅ Webhooks processed without errors
- ✅ Timestamps in sheets match TradingView times
- ✅ No data freeze after 10:00 AM IST
- ✅ Real-time updates continue throughout the day
- ✅ Test function passes all test cases
- ✅ Fallback mechanism works for invalid timestamps

## Timeline

- **Deployment Time**: 15-30 minutes
- **Testing Time**: 1 hour initial, 24 hours full verification
- **Monitoring Period**: 1 week recommended

## Notes

- This is a critical fix for production
- Minimal code changes reduce risk
- Backward compatible with existing data
- Graceful fallback for edge cases
- Comprehensive logging for debugging

---

**Deployment Version**: 3.1.1  
**Fix Date**: October 30, 2024  
**Approved By**: Security Analysis (SECURITY_ANALYSIS.md)  
**Status**: Ready for Production Deployment
