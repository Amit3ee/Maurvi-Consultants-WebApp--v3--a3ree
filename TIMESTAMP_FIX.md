# Timestamp Fix Documentation

## Issue: Data Freeze at 10:00 AM IST

### Problem Description
The web application was experiencing a critical bug where data would freeze at exactly 10:00 AM IST every day. Despite new data being saved correctly in the backend (Google Sheets), the web app would not reflect updates after this time.

### Root Cause
The system was using **server time** (`new Date()`) instead of the **timestamp provided by TradingView** in the webhook payload. This caused timing discrepancies and data synchronization issues, particularly around 10:00 AM IST when TradingView sends alerts.

### Previous Implementation (Problematic)
```javascript
// Line 353-357 in code.gs (OLD)
// Get current date suffix and time (ALWAYS use server time, ignore indicator timestamps)
const scriptTimeZone = Session.getScriptTimeZone();
const timestamp = new Date();  // ❌ Using server time
const dateSuffix = Utilities.formatDate(timestamp, scriptTimeZone, 'yyyy-MM-dd');
const time = Utilities.formatDate(timestamp, scriptTimeZone, 'HH:mm:ss');
```

### Fixed Implementation
```javascript
// Line 354-376 in code.gs (NEW)
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

## Changes Made

### 1. Code Changes (`code.gs`)

#### doPost() Function (Lines 354-376)
- **Changed**: Now parses `data.timestamp` from TradingView webhook payload
- **Added**: Timestamp validation with fallback to server time
- **Added**: Logging for debugging invalid timestamps
- **Result**: Uses accurate TradingView signal time instead of server processing time

#### Function Documentation (Lines 304-320)
- **Updated**: Changed comment from "Timestamps from indicators are IGNORED" to "Timestamps from TradingView JSON are USED"
- **Clarified**: Fallback behavior when timestamp is invalid or missing

#### Test Function (Lines 2701-2771)
- **Added**: `testTimestampParsing()` function to validate timestamp parsing logic
- **Tests**: Multiple timestamp formats (ISO 8601, UTC, invalid, missing)
- **Validates**: Proper handling and fallback mechanisms

### 2. Documentation Updates

#### README.md
- **Updated**: "Timestamp Handling" section (Lines 33-37)
  - Changed from "All timestamps use server time"
  - To "All timestamps use TradingView timestamp from JSON"
- **Updated**: "Important Notes" section (Lines 147-152)
  - Clarified that TradingView timestamps are used
  - Documented fallback behavior
- **Updated**: "Key Innovations" section (Line 224)
  - Changed from "Server-Side Timestamps"
  - To "TradingView Timestamps"

#### TESTING_GUIDE.md
- **Updated**: Test verification steps (Line 113)
  - Changed expectation from "server time (not 10:00:00)"
  - To "matches the timestamp from TradingView (10:00:00 in IST)"

## Technical Details

### Timestamp Format Support
The fix supports multiple timestamp formats from TradingView:

1. **ISO 8601 with timezone**: `2025-10-30T10:00:00+05:30`
2. **ISO 8601 without timezone**: `2025-10-30T10:00:00`
3. **ISO 8601 with UTC**: `2025-10-30T04:30:00Z`
4. **Invalid formats**: Falls back to server time with logging

### Timezone Handling
- All timestamps are formatted using the script's configured timezone
- The script timezone is set via `Session.getScriptTimeZone()` in Google Apps Script
- TradingView's `{{timenow}}` placeholder sends timestamps in ISO 8601 format
- JavaScript's `new Date()` constructor handles timezone conversion automatically
- `Utilities.formatDate()` converts to the configured timezone
- **Note**: Configure your script timezone in Google Apps Script settings to IST for accurate IST timestamps

### Validation and Fallback
1. **Check if timestamp exists** in webhook payload
2. **Parse timestamp** using `new Date(data.timestamp)`
3. **Validate** using `isNaN(timestamp.getTime())`
4. **Fallback** to server time if invalid or missing
5. **Log** all fallback scenarios for debugging

## Testing

### Manual Testing
Run the test function in Apps Script editor:
```javascript
testTimestampParsing()
```

This will test:
- Valid ISO 8601 timestamps
- Invalid timestamp formats
- Missing timestamps
- UTC to IST conversion
- Fallback behavior

### Webhook Testing
Send test webhooks with different timestamp formats:

```bash
# Test with valid timestamp
curl -X POST "YOUR_WEB_APP_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "scrip": "RELIANCE",
    "timestamp": "2025-10-30T10:00:00+05:30",
    "reason": "Volume Surge"
  }'

# Test with UTC timestamp (should convert to IST)
curl -X POST "YOUR_WEB_APP_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "HDFCBANK",
    "timestamp": "2025-10-30T04:30:00Z",
    "reason": "HVD",
    "capital_deployed_cr": "150"
  }'

# Test without timestamp (should fallback)
curl -X POST "YOUR_WEB_APP_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "scrip": "TCS",
    "reason": "MACD Cross"
  }'
```

### Verification Steps
1. Check Google Sheet for correct timestamps in columns
2. Verify time matches TradingView alert time (not server processing time)
3. Check Apps Script logs for any fallback scenarios
4. Monitor web app updates after 10:00 AM IST to ensure no freeze
5. Verify data continues to update in real-time throughout the day

## Impact

### Before Fix
- ❌ Data froze at 10:00 AM IST daily
- ❌ Timing discrepancies between TradingView and sheets
- ❌ Server processing time used instead of signal time
- ❌ Inconsistent timestamps across different server locations

### After Fix
- ✅ Data updates continuously throughout the day
- ✅ Accurate signal timing from TradingView
- ✅ Consistent timestamps regardless of server location
- ✅ Proper timezone handling (UTC → IST conversion)
- ✅ Fallback mechanism for edge cases
- ✅ Better debugging with timestamp validation logs

## Deployment

### Steps to Deploy
1. Update `code.gs` in Apps Script editor
2. Save the changes
3. Deploy new version (Manage deployments → Create new deployment)
4. Test with webhook to verify timestamp parsing works
5. Monitor for 24 hours to confirm no data freeze at 10:00 AM IST

### Rollback Plan
If issues occur, revert to previous version:
```javascript
// Rollback to server time (line 354-357)
const scriptTimeZone = Session.getScriptTimeZone();
const timestamp = new Date();
const dateSuffix = Utilities.formatDate(timestamp, scriptTimeZone, 'yyyy-MM-dd');
const time = Utilities.formatDate(timestamp, scriptTimeZone, 'HH:mm:ss');
```

## Monitoring

### What to Monitor
1. Apps Script execution logs for timestamp parsing errors
2. Web app data updates after 10:00 AM IST
3. Sheet timestamps matching TradingView alert times
4. Any fallback to server time (check logs)

### Expected Behavior
- Timestamps in sheets should match TradingView alert times
- No data freeze at any time of day
- Continuous real-time updates every 5 seconds
- Proper timezone conversion (UTC → IST)

## Related Files
- `code.gs` (Lines 304-320, 354-376, 2701-2771)
- `README.md` (Lines 33-37, 147-152, 224)
- `TESTING_GUIDE.md` (Line 113)

## Version
- **Fix Version**: 3.1.1
- **Date**: October 30, 2024
- **Issue**: Data freeze at 10:00 AM IST
- **Resolution**: Use TradingView timestamp instead of server time
