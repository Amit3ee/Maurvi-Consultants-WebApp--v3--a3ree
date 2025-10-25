# TradingView Alert Message Formats

This document specifies the exact alert message formats required for each indicator.

## Important Notes

1. **Timestamps are IGNORED**: The system uses server-side timestamps for all signals. Any timestamp sent in the alert message will be ignored to reduce latency.
2. **Indicator Detection**: The system determines which indicator generated the signal based on the JSON keys:
   - **Indicator 1**: Uses the key `"scrip"`
   - **Indicator 2**: Uses the key `"ticker"`

## Indicator 1 Format

Indicator 1 generates signals when specific technical conditions are met.

### Alert Message Format
```json
{
  "scrip": "RELIANCE",
  "timestamp": "{{timenow}}",
  "reason": "Volume Surge"
}
```

### Field Descriptions
- `scrip` (required): Stock symbol/name (e.g., "RELIANCE", "HDFCBANK", "TCS")
- `timestamp` (optional, ignored): Any timestamp value - will be ignored by the system
- `reason` (required): Description of why the signal was generated

### TradingView Alert Configuration
```
Webhook URL: [Your deployed web app URL]
Message:
{
  "scrip": "{{ticker}}",
  "timestamp": "{{timenow}}",
  "reason": "Volume Surge"
}
```

**Note**: You can customize the `reason` field based on your indicator logic.

## Indicator 2 Formats

Indicator 2 has three different alert types, all using the `"ticker"` key.

### Type 1: High Volume Deployment (HVD)

Triggered when significant capital is deployed.

```json
{
  "timestamp": "{{timenow}}",
  "ticker": "HDFCBANK",
  "reason": "HVD",
  "capital_deployed_cr": "150"
}
```

#### Field Descriptions
- `ticker` (required): Stock symbol/name
- `timestamp` (optional, ignored): Will be ignored by the system
- `reason` (required): Must be "HVD"
- `capital_deployed_cr` (required for HVD): Capital deployed in crores (e.g., "150", "250.5")

#### TradingView Alert Configuration
```
Webhook URL: [Your deployed web app URL]
Message:
{
  "timestamp": "{{timenow}}",
  "ticker": "{{ticker}}",
  "reason": "HVD",
  "capital_deployed_cr": "150"
}
```

### Type 2: Pattern Alerts

Triggered when candlestick patterns are detected.

```json
{
  "timestamp": "{{timenow}}",
  "ticker": "TCS",
  "reason": "Bullish Engulfing"
}
```

#### Field Descriptions
- `ticker` (required): Stock symbol/name
- `timestamp` (optional, ignored): Will be ignored by the system
- `reason` (required): Pattern name (e.g., "Bullish Engulfing", "Bearish Harami", "Morning Star")

#### TradingView Alert Configuration
```
Webhook URL: [Your deployed web app URL]
Message:
{
  "timestamp": "{{timenow}}",
  "ticker": "{{ticker}}",
  "reason": "Bullish Engulfing"
}
```

**Supported Patterns**:
- Bullish patterns: "Bullish Engulfing", "Bullish Pin Bar", "Morning Star", "Hammer", etc.
- Bearish patterns: "Bearish Harami", "Evening Star", "Shooting Star", etc.

### Type 3: Standalone Alerts (Oversold/Overbought)

Triggered for oversold or overbought conditions.

```json
{
  "timestamp": "{{timenow}}",
  "ticker": "INFY",
  "reason": "Oversold - RSI Below 30"
}
```

#### Field Descriptions
- `ticker` (required): Stock symbol/name
- `timestamp` (optional, ignored): Will be ignored by the system
- `reason` (required): Condition description (must contain "Oversold" or "Overbought")

#### TradingView Alert Configuration

**For Oversold**:
```
Webhook URL: [Your deployed web app URL]
Message:
{
  "timestamp": "{{timenow}}",
  "ticker": "{{ticker}}",
  "reason": "Oversold - RSI Below 30"
}
```

**For Overbought**:
```
Webhook URL: [Your deployed web app URL]
Message:
{
  "timestamp": "{{timenow}}",
  "ticker": "{{ticker}}",
  "reason": "Overbought - RSI Above 70"
}
```

## Nifty Signals

Nifty signals use the same Indicator 2 format but with specific ticker values.

### Supported Ticker Values for Nifty
- `"NIFTY"`
- `"Nifty"`
- `"NIFTY1!"`
- `"Nifty1!"`

### Example
```json
{
  "timestamp": "{{timenow}}",
  "ticker": "NIFTY",
  "reason": "Gap Up Opening"
}
```

### TradingView Alert Configuration
```
Webhook URL: [Your deployed web app URL]
Message:
{
  "timestamp": "{{timenow}}",
  "ticker": "NIFTY",
  "reason": "Gap Up Opening"
}
```

## Data Flow

### Indicator 1 Signals
1. Received with `"scrip"` key
2. Timestamped with server time
3. Written to Indicator1 sheet (columns B-K, up to 5 signals per symbol)
4. Symbol assigned a dedicated row (dynamic row mapping)

### Indicator 2 Signals (Non-Nifty)
1. Received with `"ticker"` key
2. Timestamped with server time
3. Written to Indicator2 sheet (append-only log)
4. Also written to Indicator1 sheet sync columns (L-BA, up to 21 sync events per symbol)
5. Uses same row as Indicator 1 signal for that symbol (if exists)

### Nifty Signals
1. Received with `"ticker"` key = "NIFTY" or "Nifty1!"
2. Timestamped with server time
3. Written to Indicator2 sheet only
4. No row mapping (displayed separately in UI)

## Signal Synchronization

A symbol is considered "synced" when:
1. It has at least one Indicator 1 signal (in columns B-K)
2. AND it has at least one Indicator 2 signal (in columns L-BA)
3. Both signals are for the same symbol
4. This correlation is maintained through dynamic row mapping

## UI Display Categories

### Dashboard
- **Nifty Card**: Shows latest Nifty signal (filtered by ticker)
- **Total Signals**: Count of Indicator 1 signals
- **Synced Signals**: Count of symbols with both indicators
- **Latest Signal**: Most recent Indicator 1 signal

### Live Feed
- Shows all Indicator 1 signals
- Status: "Synced" if has Indicator 2 events, "Awaiting" otherwise

### Logs Tab
1. **Significant Deployed Capital**: HVD signals (reason contains "HVD")
2. **Bullish Activity**: Pattern signals with "bullish" in reason
3. **Bearish Activity**: Pattern signals with "bearish" in reason
4. **Oversold**: Standalone signals with "oversold" in reason
5. **Overbought**: Standalone signals with "overbought" in reason

### Historical Tab
- Shows past 13 days of data
- Same structure as current day
- Click date card to view signals for that day

## Latency Optimizations

1. **Server-side timestamps**: Eliminates need to parse indicator timestamps
2. **JSON key detection**: Direct indicator identification without additional logic
3. **Single write to Indicator2**: No duplicate data processing
4. **Cached row mapping**: O(1) lookups for symbol rows
5. **Direct Nifty filtering**: No separate sheet to query

## Testing Alert Messages

You can test your alert messages using curl:

```bash
# Test Indicator 1
curl -X POST "YOUR_WEB_APP_URL" \
  -H "Content-Type: application/json" \
  -d '{"scrip": "RELIANCE", "timestamp": "2025-01-15T09:30:00", "reason": "Volume Surge"}'

# Test Indicator 2 HVD
curl -X POST "YOUR_WEB_APP_URL" \
  -H "Content-Type: application/json" \
  -d '{"ticker": "HDFCBANK", "timestamp": "2025-01-15T09:35:00", "reason": "HVD", "capital_deployed_cr": "150"}'

# Test Indicator 2 Pattern
curl -X POST "YOUR_WEB_APP_URL" \
  -H "Content-Type: application/json" \
  -d '{"ticker": "TCS", "timestamp": "2025-01-15T09:40:00", "reason": "Bullish Engulfing"}'

# Test Nifty
curl -X POST "YOUR_WEB_APP_URL" \
  -H "Content-Type: application/json" \
  -d '{"ticker": "NIFTY", "timestamp": "2025-01-15T09:15:00", "reason": "Gap Up Opening"}'
```

## Common Issues

### Signal not appearing
- Check if JSON format is correct
- Verify webhook URL is correct
- Check if required fields are present
- Look in DebugLogs sheet for errors

### Wrong indicator detection
- Ensure Indicator 1 uses `"scrip"` key
- Ensure Indicator 2 uses `"ticker"` key
- Do not mix both keys in same alert

### Sync not working
- Ensure both indicators use same exact symbol name
- Check Indicator1 sheet to see if sync columns are populated
- Verify signals arrived after daily maintenance ran

### Nifty not showing
- Verify ticker value is exactly "NIFTY", "Nifty", "NIFTY1!", or "Nifty1!"
- Check Indicator2 sheet to confirm signal was received
- Refresh dashboard if data is stale

## Support

For additional support or questions about alert formats:
1. Check the DebugLogs sheet in your Google Sheets
2. Review the Apps Script logs
3. Verify your webhook URL is accessible
4. Test with curl commands above
