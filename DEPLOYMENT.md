# Deployment Guide - Maurvi Consultants Trading Signals Web App

## Overview
This web app processes trading signals from TradingView indicators with intelligent data synchronization and real-time dashboard visualization.

## Architecture

### Sheet Structure
The app creates date-suffixed sheets daily:

1. **Indicator1_YYYY-MM-DD** (Main tracking sheet)
   - Column A: Symbol
   - Columns B-K: Indicator1 signals (5 pairs: Reason 1, Time 1, Reason 2, Time 2, ...)
   - Columns L-U: Indicator2 sync signals (5 pairs: Sync Reason 1, Sync Time 1, ...)

2. **Indicator2_YYYY-MM-DD** (Append-only log)
   - Columns: Date, Time, Symbol, Reason, Capital (Cr)

3. **Nifty_YYYY-MM-DD** (NIFTY-specific signals)
   - Columns: Date, Time, Ticker, Reason

4. **DebugLogs_YYYY-MM-DD** (Error logging)
   - Columns: Timestamp, Context, Error Message, Details, Stack

## Deployment Steps

### 1. Create Google Sheet
1. Go to Google Sheets (sheets.google.com)
2. Create a new spreadsheet
3. Copy the Sheet ID from the URL (between `/d/` and `/edit`)
4. Update `SHEET_ID` in `code.gs` (line 3)

### 2. Set Up Google Apps Script Project
1. In your Google Sheet, go to **Extensions > Apps Script**
2. Delete any default code in `Code.gs`
3. Copy the entire contents of `code.gs` into the script editor
4. Click **File > New > HTML File**
5. Name it `index` (it will create `index.html`)
6. Replace its contents with the contents of the `index.html` file

### 3. Configure Settings
Update these values in `code.gs`:

```javascript
// Line 3: Your Google Sheet ID
const SHEET_ID = 'YOUR_SHEET_ID_HERE';

// Line 13: Admin email for OTP
const ADMIN_EMAIL = 'your-email@gmail.com';

// Line 18: Get Gemini API key from https://aistudio.google.com/app/apikey
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY";
```

### 4. Deploy as Web App
1. In Apps Script editor, click **Deploy > New deployment**
2. Click the gear icon ⚙️ next to "Select type"
3. Choose **Web app**
4. Configure:
   - **Description**: Trading Signals Web App
   - **Execute as**: Me
   - **Who has access**: Anyone (for webhook access) or Anyone with the link (more secure)
5. Click **Deploy**
6. Copy the **Web app URL** - this is your webhook endpoint

### 5. Set Up Daily Maintenance Trigger
1. In Apps Script editor, click the clock icon ⏰ (Triggers)
2. Click **+ Add Trigger**
3. Configure:
   - **Function**: `dailySetupAndMaintenance`
   - **Event source**: Time-driven
   - **Type**: Day timer
   - **Time of day**: 12am to 1am (or preferred maintenance window)
4. Click **Save**

### 6. Test the Setup
1. In Apps Script editor, select `testDailySetup` function
2. Click **Run** (▶️)
3. Grant permissions when prompted
4. Check the **Execution log** for success messages
5. Verify that today's sheets were created in your Google Sheet

### 7. Configure TradingView Alerts

#### Alert Message Format

**For Indicator1 Signals:**
```json
{
  "symbol": "{{ticker}}",
  "source": "Indicator1",
  "reason": "Volume Surge"
}
```

**For Indicator2 Signals:**
```json
{
  "symbol": "{{ticker}}",
  "source": "Indicator2",
  "reason": "Bullish Engulfing",
  "capital_deployed_cr": "150"
}
```

**For NIFTY Signals:**
```json
{
  "symbol": "NIFTY",
  "source": "Indicator1",
  "reason": "Gap Up Opening"
}
```

#### TradingView Alert Setup:
1. Create an alert in TradingView
2. In the alert creation dialog:
   - **Webhook URL**: Paste your Web app URL from step 4
   - **Message**: Use one of the JSON formats above
3. Save the alert

### 8. Test Dynamic Row Mapping
1. In Apps Script editor, select `testDynamicRowMapping` function
2. Click **Run**
3. Check the Indicator1 sheet:
   - RELIANCE should have multiple Indicator1 signals in columns B-K
   - RELIANCE should have Indicator2 signal in columns L-U
   - HDFCBANK should be in a different row
   - All signals for same symbol should be in the same row

## Usage

### Accessing the Web App
1. Open the Web app URL from deployment step
2. Click **Generate OTP**
3. Check your email for the 6-digit OTP
4. Enter the OTP (you can paste all 6 digits at once)
5. Access the dashboard

### Dashboard Features
- **Dashboard Tab**: KPIs, synced signals, and tickers
- **Live Feed Tab**: All signals with sync status
- **Logs Tab**: Categorized signals (HVD, Bullish, Bearish, Oversold, Overbought)
- **Historical Tab**: View signals from past dates (up to 14 days)

### Gemini AI Integration
- Click on any synced signal to view details
- Click "Analyze with Gemini AI" to get market context and analysis
- Use the floating chat button for general trading questions

## How It Works

### Signal Flow
1. **TradingView Alert Triggered** → Webhook POST request
2. **doPost() Function** → Validates and processes signal
3. **Dynamic Row Mapping**:
   - Each symbol gets assigned a fixed row for the day
   - Row assignment is cached for performance
   - Indicator1 signals → Columns B-K
   - Indicator2 signals → Columns L-U (same row as Indicator1)
4. **Frontend Polling** → Updates UI every 15 seconds
5. **Dashboard Rendering** → Shows live feed, logs, and synced signals

### Synchronization Logic
- When Indicator1 signal arrives: Creates row for symbol (if new)
- When Indicator2 signal arrives: Finds existing row for symbol and adds sync data
- Both signals for same symbol appear in the same row
- Dashboard identifies "synced" signals as symbols with both Indicator1 and Indicator2 events

### Daily Maintenance
- Runs automatically at configured time (12-1 AM)
- Creates new date-suffixed sheets for today
- Deletes sheets older than 14 days
- Clears cache to start fresh for new day

## Troubleshooting

### Webhook Not Working
1. Check that Web app is deployed with "Anyone" access
2. Verify the webhook URL is correct in TradingView
3. Check DebugLogs sheet for error messages
4. Ensure JSON format in TradingView alert is valid

### OTP Not Received
1. Check spam/junk folder
2. Verify ADMIN_EMAIL is correct in code.gs
3. Ensure your Google account can send emails
4. Check execution logs for email sending errors

### Sheets Not Created
1. Verify daily trigger is set up correctly
2. Run `testDailySetup()` manually to check for errors
3. Check SHEET_ID is correct
4. Ensure you have edit access to the Google Sheet

### Data Not Syncing
1. Verify signals have matching symbols
2. Check that both Indicator1 and Indicator2 signals are being received
3. Run `testDynamicRowMapping()` to verify row mapping works
4. Check cache is being populated correctly (view execution logs)

## Performance Notes
- Uses script lock to prevent race conditions
- Caches symbol-row mapping for 24 hours
- Caches sheet data for 60 seconds
- Frontend polls every 15 seconds for updates
- Supports up to 5 signals per indicator per symbol per day

## Security
- OTP-based authentication (3-minute validity)
- Session tokens (24-hour validity)
- Only configured admin email can access
- Webhook data validated before processing
- All errors logged for audit

## Maintenance
- Old sheets auto-deleted after 14 days
- Cache automatically cleared daily
- Logs persist for 14 days for debugging
- No manual cleanup required

## Support
For issues or questions:
1. Check the DebugLogs sheet for errors
2. Review execution logs in Apps Script editor
3. Verify all configuration values are correct
4. Test individual functions to isolate issues
