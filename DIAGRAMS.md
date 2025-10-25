# Visual Architecture Diagrams

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TRADINGVIEW ALERTS                          │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         │ Webhook POST (JSON)
                         │ {"symbol": "RELIANCE",
                         │  "source": "Indicator1",
                         │  "reason": "Volume Surge"}
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      GOOGLE APPS SCRIPT                             │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    doPost() Function                          │  │
│  │  1. Acquire Script Lock (prevent race conditions)            │  │
│  │  2. Parse & Validate JSON                                    │  │
│  │  3. Route by source:                                         │  │
│  │     - Indicator2 → Write to Indicator2 sheet                 │  │
│  │     - NIFTY → Write to Nifty sheet & return                  │  │
│  │     - Others → Continue to row mapping                       │  │
│  │  4. Dynamic Row Mapping                                      │  │
│  │  5. Write to Indicator1 sheet                                │  │
│  │  6. Release Lock & Return Response                           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              Dynamic Row Mapping System                       │  │
│  │                                                               │  │
│  │  ┌─────────────────────┐                                     │  │
│  │  │  Cache Lookup       │                                     │  │
│  │  │  Key: symbolRowMap  │                                     │  │
│  │  │  {                  │                                     │  │
│  │  │   "RELIANCE": 2,    │                                     │  │
│  │  │   "HDFCBANK": 3,    │                                     │  │
│  │  │   "TCS": 4          │                                     │  │
│  │  │  }                  │                                     │  │
│  │  └─────────────────────┘                                     │  │
│  │           │                                                   │  │
│  │           ├─ Found? → Use existing row                       │  │
│  │           └─ Not found? → Create new row, update cache       │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        GOOGLE SHEETS                                │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │             Indicator1_2025-01-15 (Main Sheet)               │  │
│  ├──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬─────┤  │
│  │ A    │ B-C  │ D-E  │ F-G  │ H-I  │ J-K  │ L-M  │ N-O  │ ... │  │
│  ├──────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┼─────┤  │
│  │Symbol│Ind1-1│Ind1-2│Ind1-3│Ind1-4│Ind1-5│Ind2-1│Ind2-2│ ... │  │
│  │      │Rsn|Tm│Rsn|Tm│Rsn|Tm│Rsn|Tm│Rsn|Tm│Rsn|Tm│Rsn|Tm│     │  │
│  ├──────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┼─────┤  │
│  │RELI  │Vol   │52Wk  │      │      │      │Bull  │HVD   │     │  │
│  │ANCE  │Surge │High  │      │      │      │Eng   │150Cr │     │  │
│  │      │09:15 │10:30 │      │      │      │09:35 │11:00 │     │  │
│  ├──────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┼─────┤  │
│  │HDFC  │Price │MACD  │      │      │      │      │      │     │  │
│  │BANK  │Break │Cross │      │      │      │      │      │     │  │
│  │      │09:25 │10:10 │      │      │      │      │      │     │  │
│  └──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┴─────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │             Indicator2_2025-01-15 (Log Sheet)                │  │
│  ├──────┬──────┬───────┬──────────────────┬────────────────────┤  │
│  │Date  │Time  │Symbol │Reason            │Capital (Cr)        │  │
│  ├──────┼──────┼───────┼──────────────────┼────────────────────┤  │
│  │01-15 │09:35 │RELI   │Bullish Engulfing │                    │  │
│  │01-15 │11:00 │RELI   │HVD               │150                 │  │
│  └──────┴──────┴───────┴──────────────────┴────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                 Nifty_2025-01-15 (NIFTY)                     │  │
│  ├──────┬──────┬───────┬──────────────────┐                     │  │
│  │Date  │Time  │Ticker │Reason            │                     │  │
│  ├──────┼──────┼───────┼──────────────────┤                     │  │
│  │01-15 │09:15 │NIFTY  │Gap Up Opening    │                     │  │
│  └──────┴──────┴───────┴──────────────────┘                     │  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              DebugLogs_2025-01-15 (Errors)                   │  │
│  ├───────────┬─────────┬──────────┬─────────┬──────────────────┤  │
│  │Timestamp  │Context  │Error Msg │Details  │Stack             │  │
│  └───────────┴─────────┴──────────┴─────────┴──────────────────┘  │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         │ google.script.run API
                         │ getDashboardData()
                         │ getHistoricalDates()
                         │ getSignalsForDate()
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        WEB APP FRONTEND                             │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    index.html (UI)                            │  │
│  │                                                               │  │
│  │  ┌───────────┬────────────┬────────┬──────────────┐         │  │
│  │  │ Dashboard │ Live Feed  │  Logs  │  Historical  │         │  │
│  │  └───────────┴────────────┴────────┴──────────────┘         │  │
│  │                                                               │  │
│  │  Dashboard Tab:                                              │  │
│  │  ├─ KPIs (Total, Synced, Latest)                            │  │
│  │  ├─ NIFTY Tracker                                           │  │
│  │  ├─ Live Tickers (HVD, Patterns)                            │  │
│  │  └─ Synced Signals Grid                                     │  │
│  │                                                               │  │
│  │  Live Feed Tab:                                              │  │
│  │  ├─ All Indicator1 signals                                  │  │
│  │  ├─ Sync status (Synced/Awaiting)                           │  │
│  │  └─ Sort by time/status                                     │  │
│  │                                                               │  │
│  │  Logs Tab:                                                   │  │
│  │  ├─ HVD Signals                                              │  │
│  │  ├─ Bullish Patterns                                         │  │
│  │  ├─ Bearish Patterns                                         │  │
│  │  ├─ Oversold Conditions                                      │  │
│  │  └─ Overbought Conditions                                    │  │
│  │                                                               │  │
│  │  Historical Tab:                                             │  │
│  │  ├─ Date cards (last 14 days)                               │  │
│  │  └─ Historical signals viewer                               │  │
│  │                                                               │  │
│  │  ┌─────────────────────────────────────────────────────┐    │  │
│  │  │          Gemini AI Integration                      │    │  │
│  │  │  - Analyze synced signals                           │    │  │
│  │  │  - Market context via Google Search                 │    │  │
│  │  │  - Chat interface for questions                     │    │  │
│  │  └─────────────────────────────────────────────────────┘    │  │
│  │                                                               │  │
│  │  Polling: Every 15 seconds                                   │  │
│  │  Authentication: OTP + Session tokens                        │  │
│  │  Voice: Text-to-speech (Indian English)                     │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Daily Maintenance Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              Time-Driven Trigger (12-1 AM)                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
           ┌────────────────────────────────┐
           │  dailySetupAndMaintenance()    │
           └────────────────┬───────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
    ┌───────────────────┐   ┌─────────────────────┐
    │  Create Today's   │   │  Delete Old Sheets  │
    │     Sheets        │   │   (14 days old)     │
    └─────────┬─────────┘   └──────────┬──────────┘
              │                        │
              │                        │
              ├─ Indicator1_YYYY-MM-DD │
              ├─ Indicator2_YYYY-MM-DD │
              ├─ Nifty_YYYY-MM-DD      │
              └─ DebugLogs_YYYY-MM-DD  │
              │                        │
              ▼                        ▼
    ┌───────────────────┐   ┌─────────────────────┐
    │  Add Headers to   │   │  Clear Cache for    │
    │   New Sheets      │   │   New Day           │
    └───────────────────┘   └─────────────────────┘
                            
              Self-Healing Complete ✅
```

## Signal Synchronization Example

```
Timeline: Trading Day (09:00 - 15:30)

09:15 - Indicator1 Signal
┌──────────────────────────────────────┐
│ TradingView Alert                    │
│ Symbol: RELIANCE                     │
│ Source: Indicator1                   │
│ Reason: Volume Surge                 │
└──────────────────┬───────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │ Dynamic Row Mapping  │
        │ RELIANCE → Row 2     │
        │ (New symbol, cache)  │
        └──────────┬───────────┘
                   │
                   ▼
Indicator1 Sheet:
┌────────┬──────────────┬──────┬──────┬──────┐
│ Symbol │   Reason 1   │Time 1│  ... │  ... │
├────────┼──────────────┼──────┼──────┼──────┤
│RELIANCE│ Volume Surge │09:15 │      │      │
└────────┴──────────────┴──────┴──────┴──────┘

════════════════════════════════════════════════

09:35 - Indicator2 Signal (Sync Event)
┌──────────────────────────────────────┐
│ TradingView Alert                    │
│ Symbol: RELIANCE                     │
│ Source: Indicator2                   │
│ Reason: Bullish Engulfing            │
└──────────────────┬───────────────────┘
                   │
                   ├─► Append to Indicator2 sheet
                   │
                   ▼
        ┌──────────────────────┐
        │ Dynamic Row Mapping  │
        │ RELIANCE → Row 2     │
        │ (Found in cache!)    │
        └──────────┬───────────┘
                   │
                   ▼
Indicator1 Sheet (Updated):
┌────────┬──────────────┬──────┬──────┬─────────────────┬──────┐
│ Symbol │   Reason 1   │Time 1│  ... │ Sync Reason 1   │Sync 1│
├────────┼──────────────┼──────┼──────┼─────────────────┼──────┤
│RELIANCE│ Volume Surge │09:15 │      │Bullish Engulfing│09:35 │
└────────┴──────────────┴──────┴──────┴─────────────────┴──────┘

Status: SYNCED ✅
Dashboard shows RELIANCE as synced signal!

════════════════════════════════════════════════

10:30 - Another Indicator1 Signal
┌──────────────────────────────────────┐
│ TradingView Alert                    │
│ Symbol: RELIANCE                     │
│ Source: Indicator1                   │
│ Reason: 52 Week High                 │
└──────────────────┬───────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │ Dynamic Row Mapping  │
        │ RELIANCE → Row 2     │
        │ (Found in cache!)    │
        └──────────┬───────────┘
                   │
                   ▼
Indicator1 Sheet (Updated):
┌────────┬──────────────┬──────┬─────────────┬──────┬─────────────────┬──────┐
│ Symbol │   Reason 1   │Time 1│  Reason 2   │Time 2│ Sync Reason 1   │Sync 1│
├────────┼──────────────┼──────┼─────────────┼──────┼─────────────────┼──────┤
│RELIANCE│ Volume Surge │09:15 │52 Week High │10:30 │Bullish Engulfing│09:35 │
└────────┴──────────────┴──────┴─────────────┴──────┴─────────────────┴──────┘

All signals for RELIANCE in one row!
Easy to see the complete picture 📊
```

## Authentication Flow

```
┌────────────────────────────────────────────────────────────────┐
│                      User Opens Web App                        │
└────────────────────────────┬───────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ Has Session    │◄──── localStorage
                    │    Token?      │
                    └────┬───────────┘
                         │
            ┌────────────┴────────────┐
            │                         │
           YES                       NO
            │                         │
            ▼                         ▼
   ┌─────────────────┐      ┌───────────────────┐
   │ Verify Session  │      │  Show Login Form  │
   │   Token         │      │  (Enter Email)    │
   └────┬────────────┘      └─────────┬─────────┘
        │                             │
        │                             ▼
        │                   ┌───────────────────┐
        │                   │ Click Generate    │
        │                   │      OTP          │
        │                   └─────────┬─────────┘
        │                             │
        │                             ▼
        │                   ┌───────────────────┐
        │                   │ Backend Generates │
        │                   │   6-digit OTP     │
        │                   │ Cache: 3 minutes  │
        │                   └─────────┬─────────┘
        │                             │
        │                             ▼
        │                   ┌───────────────────┐
        │                   │  Email Sent with  │
        │                   │   Formatted OTP   │
        │                   └─────────┬─────────┘
        │                             │
        │                             ▼
        │                   ┌───────────────────┐
        │                   │  User Enters OTP  │
        │                   │   (6 digits)      │
        │                   └─────────┬─────────┘
        │                             │
        │                             ▼
        │                   ┌───────────────────┐
        │                   │  Backend Verifies │
        │                   │      OTP          │
        │                   └─────────┬─────────┘
        │                             │
        │                    ┌────────┴─────────┐
        │                    │                  │
        │                  VALID             INVALID
        │                    │                  │
        │                    ▼                  ▼
        │          ┌──────────────────┐  ┌──────────────┐
        │          │ Generate Session │  │ Show Error   │
        │          │     Token        │  │ Shake UI     │
        │          │ Cache: 24 hours  │  └──────────────┘
        │          └────────┬─────────┘
        │                   │
        │                   ▼
        │          ┌──────────────────┐
        │          │  Save Token to   │
        │          │  localStorage    │
        │          └────────┬─────────┘
        │                   │
        └───────────────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │  Transition to App    │
                │  Show Dashboard       │
                │  Start Polling (15s)  │
                └───────────────────────┘
```

## Performance Optimization Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    Incoming Webhook                             │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────────┐
              │  Layer 1: Script Lock       │
              │  - Prevents race conditions │
              │  - 30 second timeout        │
              │  - Queues concurrent calls  │
              └──────────┬──────────────────┘
                         │
                         ▼
              ┌─────────────────────────────┐
              │  Layer 2: Cache Lookup      │
              │  - Symbol-row map (24h)     │
              │  - O(1) row lookup          │
              │  - Avoids sheet scanning    │
              └──────────┬──────────────────┘
                         │
                         ▼
              ┌─────────────────────────────┐
              │  Layer 3: Batch Operations  │
              │  - Single range read        │
              │  - Find empty slot          │
              │  - Single range write       │
              └──────────┬──────────────────┘
                         │
                         ▼
              ┌─────────────────────────────┐
              │  Result: Fast Processing    │
              │  - Typically <1 second      │
              │  - Lock released quickly    │
              │  - Ready for next webhook   │
              └─────────────────────────────┘

════════════════════════════════════════════════════════════════════

Frontend Performance:

┌─────────────────────────────────────────────────────────────────┐
│              Dashboard Data Request                             │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────────┐
              │  Layer 1: Sheet Data Cache  │
              │  - 60 second TTL            │
              │  - Reduces sheet reads      │
              │  - Per-sheet caching        │
              └──────────┬──────────────────┘
                         │
                         ▼
              ┌─────────────────────────────┐
              │  Layer 2: Batch Read        │
              │  - getDataRange() once      │
              │  - All data in single call  │
              │  - No cell-by-cell reads    │
              └──────────┬──────────────────┘
                         │
                         ▼
              ┌─────────────────────────────┐
              │  Layer 3: Frontend Polling  │
              │  - 15 second interval       │
              │  - Balances freshness vs    │
              │    quota usage              │
              └──────────┬──────────────────┘
                         │
                         ▼
              ┌─────────────────────────────┐
              │  Result: Smooth Updates     │
              │  - Real-time feel           │
              │  - Low quota consumption    │
              │  - Efficient rendering      │
              └─────────────────────────────┘
```

---

**End of Visual Diagrams**

These diagrams provide a visual representation of the key architectural components, data flows, and optimization strategies used in the trading signals web app.
