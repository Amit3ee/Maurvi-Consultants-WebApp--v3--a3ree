# Technical Architecture - Trading Signal Web App

## System Overview
A real-time trading signal aggregation and synchronization system built on Google Apps Script, processing webhooks from TradingView and displaying data through a web interface.

## Core Architecture Principles

### 1. Dynamic Row Mapping
**Problem**: Multiple signals for the same symbol need to be displayed in a single row for easy correlation.

**Solution**: "Fixed Address" system using cached symbol-to-row mapping:
- First signal for a symbol creates a new row
- Row number cached with symbol as key
- Subsequent signals for same symbol use cached row number
- Separate columns for Indicator1 (B-K) and Indicator2 (L-U)

**Benefits**:
- O(1) row lookup via cache
- No need to scan sheet for symbol
- Prevents row duplication
- Enables fast webhook processing

### 2. Date-Suffixed Sheet Architecture
**Problem**: Need to maintain historical data while keeping sheets organized and performant.

**Solution**: Create new sheets daily with date suffix (YYYY-MM-DD):
```
Indicator1_2025-01-15
Indicator1_2025-01-16
Indicator2_2025-01-15
...
```

**Benefits**:
- Automatic data organization by date
- Easy historical data access
- Prevents single sheet from becoming too large
- Enables efficient data purging (delete old sheets)
- No need for date filtering queries

### 3. Two-Sheet Pattern for Indicator2
**Problem**: Indicator2 signals need to appear in both:
1. Indicator2 sheet (for logs/history)
2. Indicator1 sheet (for synchronization)

**Solution**: Dual write pattern:
```javascript
if (data.source === "Indicator2") {
  // Write to Indicator2 sheet (append-only log)
  ind2Sheet.appendRow([...]);
  
  // Continue to write to Indicator1 sheet (sync columns)
  // Falls through to dynamic row mapping logic
}
```

**Benefits**:
- Complete audit trail in Indicator2 sheet
- Synchronization data in Indicator1 sheet
- No data duplication issues
- Each sheet optimized for its use case

## Data Flow

### Incoming Webhook (doPost)
```
TradingView Alert
    ↓
[Webhook POST] → JSON payload
    ↓
[Lock Acquisition] → Prevent race conditions
    ↓
[Validation] → Check required fields
    ↓
[Source Routing]
    ├─ Indicator2? → Write to Indicator2 sheet
    ├─ NIFTY? → Write to Nifty sheet & return
    └─ Continue to row mapping
    ↓
[Cache Lookup] → symbolRowMap_{date}
    ├─ Found? → Use existing row
    └─ Not found? → Create new row & cache
    ↓
[writeDataToRow] → Write to appropriate columns
    ↓
[Response] → Return success JSON
    ↓
[Lock Release]
```

### Data Reading (getDashboardData)
```
Frontend Request
    ↓
[Date Calculation] → Get today's date
    ↓
[Sheet Names] → Construct date-suffixed names
    ↓
[Parallel Read] → _getSheetData() with caching
    ├─ Indicator1_{date}
    ├─ Indicator2_{date}
    └─ Nifty_{date}
    ↓
[Data Processing]
    ├─ Build liveFeed from Indicator1 (cols B-K)
    ├─ Build logs from Indicator2 (categorized)
    └─ Build dashboardSyncedList (symbols with sync events from cols L-U)
    ↓
[KPI Calculation]
    ├─ Total signals
    ├─ Synced signals
    └─ Latest signal
    ↓
[Response] → Return structured data
```

## Column Layout - Indicator1 Sheet

```
A      B-C      D-E      F-G      H-I      J-K      L-M      N-O      P-Q      R-S      T-U
Symbol Ind1-1   Ind1-2   Ind1-3   Ind1-4   Ind1-5   Ind2-1   Ind2-2   Ind2-3   Ind2-4   Ind2-5
       Rsn|Time Rsn|Time Rsn|Time Rsn|Time Rsn|Time Rsn|Time Rsn|Time Rsn|Time Rsn|Time Rsn|Time
```

**Indicator1 Signals** (Columns B-K):
- B: Reason 1, C: Time 1
- D: Reason 2, E: Time 2
- F: Reason 3, G: Time 3
- H: Reason 4, I: Time 4
- J: Reason 5, K: Time 5

**Indicator2 Sync Events** (Columns L-U):
- L: Sync Reason 1, M: Sync Time 1
- N: Sync Reason 2, O: Sync Time 2
- P: Sync Reason 3, Q: Sync Time 3
- R: Sync Reason 4, S: Sync Time 4
- T: Sync Reason 5, U: Sync Time 5

## Key Functions

### writeDataToRow(sheet, row, source, reason, time)
**Purpose**: Write signal data to the correct columns in a row

**Logic**:
1. Determine start column based on source:
   - Indicator1 → Column B (index 2)
   - Indicator2 → Column L (index 12)
2. Read current values in target range (10 columns = 5 pairs)
3. Find first empty pair (check reason column, not time)
4. Write [reason, time] to empty pair
5. If all 5 pairs full, log error and skip

**Performance**: O(1) with constant 10-column read

### Dynamic Row Mapping Logic
```javascript
// Get cache
const cache = CacheService.getScriptCache();
const cacheKey = `symbolRowMap_${dateSuffix}`;
const cachedMap = cache.get(cacheKey);
let symbolMap = JSON.parse(cachedMap || '{}');

// Check if symbol exists
let targetRow = symbolMap[symbol];

if (targetRow === undefined) {
  // New symbol - assign next available row
  targetRow = sheet.getLastRow() + 1;
  
  // Write symbol to column A
  sheet.getRange(targetRow, 1).setValue(symbol);
  
  // Update cache
  symbolMap[symbol] = targetRow;
  cache.put(cacheKey, JSON.stringify(symbolMap), 86400); // 24 hours
}

// Use targetRow for writing
writeDataToRow(sheet, targetRow, source, reason, time);
```

### Daily Maintenance (dailySetupAndMaintenance)
**Schedule**: Time-driven trigger at 12-1 AM

**Operations**:
1. Calculate current date and purge date (14 days ago)
2. Create today's sheets if they don't exist:
   - Indicator1_{today}
   - Indicator2_{today}
   - Nifty_{today}
   - DebugLogs_{today}
3. Add headers to new sheets
4. Delete all sheets with purge date suffix
5. Clear cache for new day (self-healing)

**Self-Healing**: Even if cache gets corrupted, daily maintenance clears it, allowing fresh start.

## Caching Strategy

### Symbol Row Map Cache
- **Key**: `symbolRowMap_YYYY-MM-DD`
- **Value**: JSON string of `{symbol: rowNumber}` mapping
- **TTL**: 86400 seconds (24 hours)
- **Purpose**: Fast O(1) row lookup for symbols

### Sheet Data Cache
- **Key**: `sheetData_{sheetName}`
- **Value**: JSON string of 2D array
- **TTL**: 60 seconds
- **Purpose**: Reduce sheet reads for dashboard

### Cache Clearing
- Daily maintenance clears symbol row map
- Sheet data cache expires naturally (60s TTL)
- Manual clear: `cache.remove(key)` or `cache.removeAll([keys])`

## Concurrency Control

### Script Lock
```javascript
const lock = LockService.getScriptLock();
lock.waitLock(30000); // Wait up to 30 seconds
try {
  // Process webhook
} finally {
  lock.releaseLock(); // Always release
}
```

**Why Needed**:
- Multiple webhooks can arrive simultaneously
- Prevents race conditions in row mapping
- Ensures cache consistency
- Protects sheet write operations

**Timeout**: 30 seconds (generous for script execution time)

## Error Handling

### Layered Approach
1. **Validation Layer**: Check required fields before processing
2. **Try-Catch Blocks**: Catch and log all errors
3. **Error Logging**: Write to DebugLogs sheet with context
4. **Graceful Degradation**: Return error JSON instead of failing silently

### Error Log Entry
```javascript
_logErrorToSheet(logSheet, context, error, details);
// Writes: [Timestamp, Context, Error.message, Details, Error.stack]
```

### Common Error Scenarios
- Sheet not found → Create via daily maintenance
- Invalid JSON → Logged with full payload
- Cache parse error → Falls back to empty map
- Lock timeout → Returns error, doesn't process webhook

## Frontend Architecture

### State Management
```javascript
const AppState = {
  sessionToken: null,
  userInfo: null,
  currentTab: 'dashboard',
  narrationEnabled: false,
  data: {},
  pollingInterval: null,
  sortType: { livefeed: 'time', historical: 'time' },
  sortDirection: { livefeed: 'desc', historical: 'desc' }
};
```

### Polling Mechanism
```javascript
// Initial load on login
loadAppData();

// Set up polling (every 15 seconds)
AppState.pollingInterval = setInterval(loadAppData, 15000);
```

**Why Polling**: 
- Google Apps Script doesn't support WebSockets
- Push notifications not available
- 15-second interval balances freshness vs. quota usage

### Real-time Updates
1. Frontend calls `getDashboardData()` every 15 seconds
2. Backend reads latest data from sheets
3. Frontend compares with previous data
4. New synced signals trigger voice notification
5. UI updates with smooth animations

## Authentication Flow

### OTP Generation
```
User enters email → Frontend calls generateOTPServer()
    ↓
Backend generates 6-digit OTP
    ↓
Store in cache: key=`otp_{email}`, TTL=180s
    ↓
Send formatted email with OTP
    ↓
Return success (doesn't reveal OTP)
```

### OTP Verification
```
User enters OTP → Frontend calls verifyOTPServer()
    ↓
Backend retrieves stored OTP from cache
    ↓
Compare submitted vs. stored
    ↓
Match? → Generate session token (HMAC-SHA256)
    ↓
Store in cache: key=`session_{token}`, TTL=86400s
    ↓
Return {sessionToken, userInfo}
    ↓
Frontend stores token in localStorage
```

### Session Validation
```
Page load → Frontend calls verifySessionServer()
    ↓
Backend checks if session token exists in cache
    ↓
Valid? → Refresh TTL and return userInfo
Invalid? → Return error, show login
```

## Performance Optimizations

### 1. Script Lock Duration
- Acquire lock only during write operations
- Release immediately after webhook processing
- Minimizes blocking for concurrent requests

### 2. Batch Operations
- `sheet.getDataRange().getDisplayValues()` - Single read for entire sheet
- `sheet.getRange(row, col, rows, cols).setValues(2DArray)` - Batch write

### 3. Cache-First Strategy
- Check cache before reading sheets
- Update cache after writes
- Set appropriate TTLs based on update frequency

### 4. Date-Suffixed Sheets
- Smaller sheets = faster operations
- No need to filter by date
- Parallel reads possible (multiple sheets)

### 5. Frontend Optimizations
- Debounced input handlers
- Virtual scrolling (hide-scrollbar)
- CSS animations (GPU-accelerated)
- Conditional rendering (show/hide vs. re-render)

## Security Considerations

### Authentication
- OTP expires in 3 minutes
- Session expires in 24 hours
- Only configured admin email allowed
- No password storage (OTP only)

### Webhook Security
- Validate JSON structure
- Check required fields
- Log all errors with context
- No sensitive data in logs

### Data Access
- Web app can be set to "Anyone with link" for security
- Session required for dashboard access
- Webhook endpoint is public (by design)

### Rate Limiting
- Script lock prevents concurrent abuse
- Google Apps Script has built-in quotas
- Email sending has daily limits

## Scalability Limits

### Google Apps Script Quotas
- **Execution time**: 6 minutes max per execution
- **URL Fetch calls**: 20,000 per day
- **Spreadsheet reads**: No hard limit, but slow if too many
- **Spreadsheet writes**: Limited by execution time
- **Email sends**: 100 per day (Gmail), 1500 (G Suite)

### Application Limits
- **Signals per symbol per day**: 10 (5 Indicator1 + 5 Indicator2)
- **Historical retention**: 14 days
- **Concurrent webhooks**: Limited by script lock (queued)
- **Frontend polling**: Every 15 seconds

### Scaling Strategies
If limits are hit:
1. Increase retention by reducing purge frequency
2. Add more indicator columns (extend writeDataToRow)
3. Use multiple sheets per day (morning/afternoon)
4. Implement server-side pagination
5. Consider migrating to Cloud Functions + Firebase

## Testing Functions

### testDailySetup()
- Tests daily maintenance function
- Verifies sheet creation
- Checks header setup
- Validates date calculation

### testDynamicRowMapping()
- Simulates webhook calls
- Tests row assignment logic
- Verifies cache operations
- Checks column writing

### Usage
```javascript
// In Apps Script editor
1. Select function from dropdown
2. Click Run (▶️)
3. Check Execution log for results
4. Verify data in sheets
```

## Monitoring and Debugging

### Execution Logs
- View in Apps Script: **Executions** tab
- Shows all function calls
- Displays console.log() / Logger.log() output
- Reveals errors and stack traces

### Debug Logs Sheet
- Automatically created daily
- Contains all errors with full context
- Includes stack traces
- Useful for post-mortem analysis

### What to Monitor
- Daily maintenance execution status
- Webhook response times
- Cache hit rates (via logs)
- Error frequency in DebugLogs sheet
- Sheet row counts (approaching limits?)

## Future Enhancements

### Potential Improvements
1. **Multi-user support**: Multiple admin emails
2. **Custom retention periods**: Per-user preferences
3. **Alert notifications**: Email/SMS for specific signals
4. **Export functionality**: Download data as CSV/Excel
5. **Advanced analytics**: Pattern recognition, signal statistics
6. **Mobile app**: Native iOS/Android apps
7. **Real-time sync**: WebSocket alternative (e.g., Firebase)
8. **AI-enhanced analysis**: Advanced text analysis and market insights via Gemini

### Migration Path
If outgrowing Google Apps Script:
1. **Backend**: Migrate to Cloud Functions or AWS Lambda
2. **Database**: Use Firestore or PostgreSQL instead of Sheets
3. **Frontend**: Host on Vercel/Netlify with React/Vue
4. **Real-time**: Implement WebSocket connections
5. **Auth**: Use Firebase Auth or Auth0

## Conclusion
This architecture provides a robust, scalable foundation for trading signal aggregation with intelligent synchronization. The dynamic row mapping system ensures clean data organization, while the date-suffixed sheet approach maintains performance and enables easy historical access.
