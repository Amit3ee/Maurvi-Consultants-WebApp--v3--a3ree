# Maurvi Consultants - Trading Signals Web App

A real-time trading signal aggregation and synchronization system that processes webhooks from TradingView indicators and displays data through an intelligent web interface.

## 🎯 Features

- **Real-time Signal Processing**: Webhook-based integration with TradingView alerts
- **Dynamic Row Mapping**: Intelligent system that syncs multiple indicators for the same symbol in a single row
- **Date-Suffixed Architecture**: Automatic daily sheet creation with 14-day retention
- **Live Dashboard**: Real-time KPIs, synced signals, and categorized logs
- **Historical Data**: Access up to 14 days of trading signals
- **AI-Powered Analysis**: Gemini AI integration for signal analysis and market context
- **OTP Authentication**: Secure email-based login with session management
- **Voice Narration**: Optional text-to-speech for new signals (Indian English)
- **Responsive UI**: Modern glassmorphic design with dark/light themes

## 🏗️ Architecture

### Signal Synchronization
The core innovation is the **dynamic row mapping system**:
- Each symbol gets a fixed row for the day
- Indicator1 signals → Columns B-K (5 signal slots)
- Indicator2 signals → Columns L-U (5 sync event slots)
- Both indicators for the same symbol appear in the same row
- Enables easy visual correlation of signals

### Sheet Structure
```
Indicator1_2025-01-15    [Main tracking sheet with row mapping]
Indicator2_2025-01-15    [Append-only log of sync events]
Nifty_2025-01-15         [NIFTY-specific signals]
DebugLogs_2025-01-15     [Error logging and debugging]
```

## 📋 Quick Start

### Prerequisites
- Google Account
- TradingView account with alert functionality
- Gemini API key (optional, for AI features)

### Installation

1. **Create Google Sheet**
   ```
   Go to sheets.google.com → Create new spreadsheet
   Copy the Sheet ID from URL: /d/{SHEET_ID}/edit
   ```

2. **Set Up Apps Script**
   ```
   Extensions → Apps Script
   Copy code.gs content → Paste in Code.gs
   File → New → HTML File (name: index)
   Copy index.html content → Paste in index.html
   ```

3. **Configure Settings**
   ```javascript
   // In code.gs:
   const SHEET_ID = 'YOUR_SHEET_ID';
   const ADMIN_EMAIL = 'your-email@gmail.com';
   const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY'; // Optional
   ```

4. **Deploy Web App**
   ```
   Deploy → New deployment → Web app
   Execute as: Me
   Who has access: Anyone (for webhooks)
   Copy the Web app URL
   ```

5. **Set Up Daily Trigger**
   ```
   Clock icon (Triggers) → Add Trigger
   Function: dailySetupAndMaintenance
   Event: Time-driven, Day timer, 12am-1am
   ```

### TradingView Alert Configuration

**Indicator1 Alert:**
```json
{
  "symbol": "{{ticker}}",
  "source": "Indicator1",
  "reason": "Volume Surge"
}
```

**Indicator2 Alert:**
```json
{
  "symbol": "{{ticker}}",
  "source": "Indicator2",
  "reason": "Bullish Engulfing",
  "capital_deployed_cr": "150"
}
```

Set webhook URL to your deployed Web app URL.

## 📚 Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Complete deployment guide with step-by-step instructions
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Technical architecture and design decisions

## 🔧 Testing

Run these functions in Apps Script to verify setup:

```javascript
// Test 1: Verify daily maintenance
testDailySetup()

// Test 2: Verify dynamic row mapping
testDynamicRowMapping()

// Test 3: Open sheet access
testOpenSheet()
```

## 🎨 UI Features

### Dashboard Tab
- **KPIs**: Total signals, synced signals, latest signal
- **NIFTY Tracker**: Real-time NIFTY 50 status
- **Live Tickers**: Scrolling HVD and pattern signals
- **Synced Feed**: Symbols with both Indicator1 and Indicator2 events

### Live Feed Tab
- All Indicator1 signals
- Real-time sync status (Synced/Awaiting)
- Sort by time or status
- Click signal for details

### Logs Tab
- **HVD**: High Volume Deployment signals
- **Bullish**: Bullish patterns
- **Bearish**: Bearish patterns
- **Oversold**: Oversold conditions
- **Overbought**: Overbought conditions

### Historical Tab
- Date cards for last 14 days
- Click date to view signals
- Same sorting and detail features as live feed

### Gemini AI Features
- Click synced signals for detailed view
- "Analyze with Gemini AI" button
- Get market context and analysis
- Floating chat for general questions

## 🔐 Security

- **OTP Authentication**: 6-digit code sent via email (3-minute validity)
- **Session Management**: 24-hour sessions with automatic refresh
- **Admin-Only Access**: Only configured email can access dashboard
- **Webhook Validation**: All incoming data validated before processing
- **Error Logging**: All errors logged with full context for audit

## ⚡ Performance

- **Script Lock**: Prevents race conditions in concurrent webhooks
- **Caching**: Symbol-row mapping cached for 24 hours (O(1) lookups)
- **Batch Operations**: Efficient sheet reads/writes
- **15-Second Polling**: Real-time updates without overwhelming quota
- **Date-Suffixed Sheets**: Keeps individual sheets small and fast

## 🌟 Key Innovations

1. **Dynamic Row Mapping**: Efficient system for correlating signals across indicators
2. **Date-Suffixed Architecture**: Self-maintaining, self-healing data organization
3. **Dual Write Pattern**: Indicator2 signals in both sheets for different purposes
4. **Voice Narration**: Accessibility feature with Indian English voice
5. **Glassmorphic UI**: Modern design with smooth animations
6. **AI Integration**: Gemini-powered analysis with Google Search grounding

## 📊 Limitations

- **Signals per symbol per day**: 10 (5 per indicator)
- **Historical retention**: 14 days
- **Concurrent webhooks**: Queued via script lock
- **Google Apps Script quotas**: 6-minute execution time, 20K URL fetches/day

## 🚀 Future Enhancements

- Multi-user support with role-based access
- Custom retention periods per user
- Email/SMS alerts for specific signals
- CSV/Excel export functionality
- Advanced analytics and pattern recognition
- Mobile apps (iOS/Android)
- Migration path to Cloud Functions + Firebase for scale

## 🤝 Contributing

This is a private repository for Maurvi Consultants. For support or questions, contact the repository owner.

## 📄 License

Private and confidential. All rights reserved by Maurvi Consultants.

## 🙏 Acknowledgments

- Google Apps Script for the platform
- TradingView for the alert system
- Gemini AI for market analysis
- Tailwind CSS for styling

---

**Version**: 3.0  
**Last Updated**: January 2025  
**Author**: Maurvi Consultants Development Team