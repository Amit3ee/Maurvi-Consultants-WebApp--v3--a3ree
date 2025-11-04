# Testing Guide

This guide helps you test the updated system to ensure all components are working correctly.

## Prerequisites

1. Google Sheet with code.gs and index.html deployed
2. Web app deployed and accessible
3. Apps Script editor access

## Phase 1: Backend Function Testing

### Test 1: Daily Setup and Maintenance

This test verifies that the daily maintenance function creates the correct sheets.

**Steps:**
1. Open Apps Script editor
2. Select function: `testDailySetup`
3. Click Run
4. Check Execution log (View > Logs)
5. Verify your Google Sheet now has:
   - `Indicator1_YYYY-MM-DD` (today's date)
   - `Indicator2_YYYY-MM-DD` (today's date)
   - `DebugLogs_YYYY-MM-DD` (today's date)
   - **NOT** a Nifty sheet

**Expected Headers:**

Indicator1 sheet:
```
A: Symbol
B-K: Reason 1, Time 1, Reason 2, Time 2, ... Reason 5, Time 5
L-BA: Sync Reason 1, Sync Time 1, ... Sync Reason 21, Sync Time 21
```

Indicator2 sheet:
```
A: Date
B: Time
C: Ticker
D: Reason
E: Capital (Cr)
```

### Test 2: Dynamic Row Mapping

This test verifies the row mapping system and indicator detection.

**Steps:**
1. Open Apps Script editor
2. Select function: `testDynamicRowMapping`
3. Click Run
4. Check Execution log
5. Verify Indicator1 sheet shows:
   - Row 2: RELIANCE (with reasons in columns B and D)
   - Row 3: HDFCBANK (with reasons in columns B and L)
6. Verify Indicator2 sheet shows:
   - Multiple rows with different tickers
   - NIFTY and Nifty1! entries
7. Verify NIFTY signals are **NOT** in Indicator1 sheet

**What to Look For:**
- Same symbol should have same row in Indicator1 sheet
- Indicator1 signals go to columns B-K
- Indicator2 signals go to columns L-BA
- Nifty signals only in Indicator2 sheet

### Test 3: Mock Data Population

This test creates realistic test data.

**Steps:**
1. Open Apps Script editor
2. Select function: `populateLargeMockData`
3. Click Run (may take 30-60 seconds)
4. Check Execution log for summary
5. Verify both sheets have data
6. Check that Nifty signals are in Indicator2 sheet only

## Phase 2: Webhook Testing

### Test 4: Indicator 1 Signal

Test that Indicator 1 signals are correctly received and stored.

**Using curl:**
```bash
curl -X POST "YOUR_WEB_APP_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "scrip": "TESTSTOCK1",
    "timestamp": "2025-01-15T10:00:00",
    "reason": "Test Volume Surge"
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "indicator": "Indicator1",
  "symbol": "TESTSTOCK1",
  "row": 2,
  "time": "HH:MM:SS"
}
```

**Verify in Sheet:**
1. Open Indicator1 sheet
2. Find TESTSTOCK1 in a row
3. Check that reason appears in column B
4. Check that time in column C matches the timestamp from TradingView (10:00:00 in IST)

### Test 5: Indicator 2 HVD Signal

Test High Volume Deployment signal.

**Using curl:**
```bash
curl -X POST "YOUR_WEB_APP_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "TESTSTOCK1",
    "timestamp": "2025-01-15T10:05:00",
    "reason": "HVD",
    "capital_deployed_cr": "250"
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "indicator": "Indicator2",
  "symbol": "TESTSTOCK1",
  "row": 2,
  "time": "HH:MM:SS"
}
```

**Verify in Sheets:**
1. **Indicator2 sheet:** New row with TESTSTOCK1, HVD reason, 250 in capital column
2. **Indicator1 sheet:** Same row as before, now has sync data in column L-M

### Test 6: Indicator 2 Pattern Signal

Test candlestick pattern signal.

**Using curl:**
```bash
curl -X POST "YOUR_WEB_APP_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "TESTSTOCK2",
    "timestamp": "2025-01-15T10:10:00",
    "reason": "Bullish Engulfing"
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "indicator": "Indicator2",
  "symbol": "TESTSTOCK2",
  "row": 3,
  "time": "HH:MM:SS"
}
```

**Verify in Sheets:**
1. **Indicator2 sheet:** New row with TESTSTOCK2 and "Bullish Engulfing"
2. **Indicator1 sheet:** New row for TESTSTOCK2 with sync data in column L-M

### Test 7: Nifty Signal

Test Nifty index signal.

**Using curl:**
```bash
curl -X POST "YOUR_WEB_APP_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "NIFTY",
    "timestamp": "2025-01-15T09:15:00",
    "reason": "Gap Up Opening"
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "indicator": "Indicator2",
  "symbol": "NIFTY",
  "time": "HH:MM:SS"
}
```

**Verify in Sheets:**
1. **Indicator2 sheet:** New row with NIFTY ticker and reason
2. **Indicator1 sheet:** No row for NIFTY (it should not appear here)

### Test 8: Multiple Signals Same Symbol

Test that multiple signals for same symbol use same row.

**Send these in sequence:**
```bash
# First Indicator 1 signal
curl -X POST "YOUR_WEB_APP_URL" \
  -H "Content-Type: application/json" \
  -d '{"scrip": "MULTITEST", "reason": "Signal 1"}'

# Second Indicator 1 signal  
curl -X POST "YOUR_WEB_APP_URL" \
  -H "Content-Type: application/json" \
  -d '{"scrip": "MULTITEST", "reason": "Signal 2"}'

# First Indicator 2 signal
curl -X POST "YOUR_WEB_APP_URL" \
  -H "Content-Type: application/json" \
  -d '{"ticker": "MULTITEST", "reason": "Sync 1"}'

# Second Indicator 2 signal
curl -X POST "YOUR_WEB_APP_URL" \
  -H "Content-Type: application/json" \
  -d '{"ticker": "MULTITEST", "reason": "Sync 2"}'
```

**Verify in Indicator1 Sheet:**
- Only ONE row for MULTITEST
- "Signal 1" in column B, "Signal 2" in column D
- "Sync 1" in column L, "Sync 2" in column N
- All times are server times

## Phase 3: Frontend Testing

### Test 9: Dashboard View

**Steps:**
1. Open the web app in browser
2. Login with OTP
3. Check Dashboard tab

**Verify:**
- **Nifty Card:** Shows latest Nifty signal reason (from Test 7)
- **Total Signals:** Shows count of Indicator 1 signals
- **Synced Signals:** Shows count of symbols with both indicators
- **Latest Signal:** Shows most recent Indicator 1 signal
- **HVD Ticker:** Shows scrolling HVD signals
- **Pattern Ticker:** Shows scrolling bullish/bearish patterns
- **Synced Signals Feed:** Shows symbols with both indicators

### Test 10: Live Feed View

**Steps:**
1. Click "Live Feed" tab

**Verify:**
- All Indicator 1 signals shown
- Each signal shows:
  - Symbol name
  - Reason (from Indicator 1)
  - Time (server time, not indicator time)
  - Status: "Synced" (green dot) or "Awaiting" (orange dot)
- Can sort by Time or Status
- Click signal to see details

### Test 11: Logs View

**Steps:**
1. Click "Logs" tab

**Verify Five Columns:**
1. **Significant Deployed Capital:** Shows HVD signals only
2. **Bullish Activity:** Shows signals with "bullish" in reason
3. **Bearish Activity:** Shows signals with "bearish" in reason
4. **Oversold:** Shows signals with "oversold" in reason
5. **Overbought:** Shows signals with "overbought" in reason

**Check:**
- Each signal shows symbol, reason, time
- Capital shown for HVD signals
- Status indicator (synced/awaiting) visible

### Test 12: Historical View

**Steps:**
1. Click "Historical" tab
2. Should see date cards for past days

**Verify:**
- Date cards show up to 13 past days
- Click a date card
- Shows signals for that specific date
- Can click individual signals for details
- "Back to Dates" button returns to date list

## Phase 4: Performance Testing

### Test 13: Timestamp Verification

**Purpose:** Verify server-side timestamps are used

**Steps:**
1. Send alert with timestamp far in past:
```bash
curl -X POST "YOUR_WEB_APP_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "scrip": "TIMETEST",
    "timestamp": "2020-01-01T00:00:00",
    "reason": "Old Timestamp Test"
  }'
```

2. Check Indicator1 sheet
3. Verify time in column C is current server time, NOT 00:00:00

### Test 14: Indicator Detection Verification

**Purpose:** Verify JSON key detection works

**Steps:**
1. Send signal with "scrip" key - should go to Indicator1
2. Send signal with "ticker" key - should go to Indicator2
3. Verify in Execution log that correct indicator type is logged

### Test 15: Sync Status Verification

**Purpose:** Verify sync status is correctly detected

**Steps:**
1. Send Indicator 1 signal for "SYNCTEST"
2. Refresh web app - should show status "Awaiting"
3. Send Indicator 2 signal for "SYNCTEST"
4. Refresh web app - should show status "Synced"

### Test 16: Capacity Testing

**Purpose:** Verify column limits work

**Steps:**
1. Send 6 Indicator 1 signals for same symbol
2. Check Indicator1 sheet
3. Verify only 5 signals stored (columns B-K full)
4. 6th signal should be logged as warning

**Similar for Indicator 2:**
1. Send 22 sync signals for same symbol
2. Check Indicator1 sheet
3. Verify only 21 sync events stored (columns L-BA full)

## Phase 5: Error Handling

### Test 17: Missing Required Fields

**Test missing "scrip" and "ticker":**
```bash
curl -X POST "YOUR_WEB_APP_URL" \
  -H "Content-Type: application/json" \
  -d '{"reason": "No Symbol"}'
```

**Expected Response:**
```json
{
  "status": "error",
  "message": "Missing required field: must have either 'scrip' or 'ticker'"
}
```

### Test 18: Missing Reason Field

```bash
curl -X POST "YOUR_WEB_APP_URL" \
  -H "Content-Type: application/json" \
  -d '{"scrip": "TEST"}'
```

**Expected Response:**
```json
{
  "status": "error",
  "message": "Missing required field: reason"
}
```

### Test 19: Invalid JSON

```bash
curl -X POST "YOUR_WEB_APP_URL" \
  -H "Content-Type: application/json" \
  -d 'invalid json'
```

**Expected Response:**
```json
{
  "status": "error",
  "message": "..."
}
```

## Common Issues and Solutions

### Issue: Sheets not created
**Solution:** Run `testDailySetup()` function manually

### Issue: Signals not appearing
**Check:**
1. Webhook URL is correct
2. JSON format is valid
3. Required fields present
4. Check DebugLogs sheet for errors

### Issue: Wrong indicator detection
**Check:**
- Indicator 1 must use "scrip" key
- Indicator 2 must use "ticker" key
- Don't mix both keys in same alert

### Issue: Timestamps wrong
**Verify:**
- Time shown should be server time
- Indicator timestamp should be ignored
- Check timezone in Apps Script settings

### Issue: Nifty appearing in wrong sheet
**Check:**
- Nifty should ONLY be in Indicator2 sheet
- Ticker must be "NIFTY", "Nifty", "NIFTY1!", or "Nifty1!"
- Should not have row in Indicator1 sheet

### Issue: Sync not working
**Check:**
1. Symbol names match exactly between indicators
2. Both indicators have signals for same symbol
3. Check Indicator1 sheet columns L-BA for sync data
4. Refresh web app to see updated status

## Test Results Log

Use this template to log your test results:

```
Date: ___________
Tester: ___________

Phase 1: Backend Function Testing
- Test 1 (Daily Setup): [ ] Pass [ ] Fail
- Test 2 (Row Mapping): [ ] Pass [ ] Fail
- Test 3 (Mock Data): [ ] Pass [ ] Fail

Phase 2: Webhook Testing
- Test 4 (Indicator 1): [ ] Pass [ ] Fail
- Test 5 (Indicator 2 HVD): [ ] Pass [ ] Fail
- Test 6 (Indicator 2 Pattern): [ ] Pass [ ] Fail
- Test 7 (Nifty): [ ] Pass [ ] Fail
- Test 8 (Multiple Signals): [ ] Pass [ ] Fail

Phase 3: Frontend Testing
- Test 9 (Dashboard): [ ] Pass [ ] Fail
- Test 10 (Live Feed): [ ] Pass [ ] Fail
- Test 11 (Logs): [ ] Pass [ ] Fail
- Test 12 (Historical): [ ] Pass [ ] Fail

Phase 4: Performance Testing
- Test 13 (Timestamps): [ ] Pass [ ] Fail
- Test 14 (Detection): [ ] Pass [ ] Fail
- Test 15 (Sync Status): [ ] Pass [ ] Fail
- Test 16 (Capacity): [ ] Pass [ ] Fail

Phase 5: Error Handling
- Test 17 (Missing Fields): [ ] Pass [ ] Fail
- Test 18 (Missing Reason): [ ] Pass [ ] Fail
- Test 19 (Invalid JSON): [ ] Pass [ ] Fail

Notes:
_________________________________
_________________________________
_________________________________
```

## Support

If tests fail:
1. Check Apps Script Execution logs
2. Check DebugLogs sheet in Google Sheets
3. Verify sheet structure matches documentation
4. Ensure daily maintenance has run
5. Check webhook URL is accessible

For additional help, refer to:
- [ALERT_FORMATS.md](ALERT_FORMATS.md) - Alert message specifications
- [ARCHITECTURE.md](ARCHITECTURE.md) - Technical architecture
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide
