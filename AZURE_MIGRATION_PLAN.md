# Azure Migration Plan for Maurvi Consultants Trading Signals Web App

## Executive Summary

This document provides a comprehensive plan for migrating the existing Google Apps Script (GAS) application to Microsoft Azure. The migration will transform the application into a modern, scalable cloud-native solution using Azure Functions, Azure SQL Database (or Cosmos DB), and Azure Static Web Apps.

## Current Architecture (Google Apps Script)

### Components
1. **Backend**: Google Apps Script (JavaScript)
   - Webhook receiver (doPost)
   - Web app server (doGet)
   - Authentication (OTP via email)
   - Data processing logic

2. **Database**: Google Sheets
   - Date-suffixed sheets for data organization
   - Indicator1, Indicator2, and DebugLogs sheets
   - 14-day data retention

3. **Frontend**: HTML/JavaScript/Tailwind CSS
   - Single-page application served via doGet
   - Real-time polling (15-second intervals)
   - Dashboard, Live Feed, Logs, Historical tabs

4. **Authentication**: Email OTP system
   - 3-minute OTP validity
   - 24-hour session tokens
   - Cache-based session storage

5. **Integrations**:
   - TradingView webhooks
   - Gmail API for OTP delivery
   - Gemini AI for signal analysis

## Recommended Azure Architecture

### Architecture Diagram
```
TradingView Alerts
    ↓ (HTTPS POST)
Azure Function App (Webhook Handler)
    ↓
Azure SQL Database / Cosmos DB
    ↑↓
Azure Function App (API)
    ↑ (HTTPS GET/POST)
Azure Static Web Apps (Frontend)
    ↑
Users (Browser)
```

### Components Mapping

| Google Apps Script Component | Azure Equivalent | Justification |
|------------------------------|------------------|---------------|
| Apps Script Backend | Azure Functions (Node.js) | Serverless, event-driven, similar execution model |
| Google Sheets | Azure SQL Database or Cosmos DB | Structured data storage with better query performance |
| doGet (Web App) | Azure Static Web Apps | Modern static hosting with CDN |
| GAS Cache Service | Azure Redis Cache | Distributed caching for session management |
| Gmail API | Azure Communication Services or SendGrid | Email delivery service |
| Script Properties | Azure Key Vault | Secure configuration storage |
| Time-based Triggers | Azure Timer Functions | Scheduled job execution |

### Recommended Technology Stack

#### Option A: SQL-Based (Recommended for Structured Data)
- **Backend Runtime**: Node.js 18+ (TypeScript optional)
- **Functions**: Azure Functions v4
- **Database**: Azure SQL Database (or PostgreSQL)
- **Frontend Hosting**: Azure Static Web Apps
- **Caching**: Azure Cache for Redis
- **Email**: SendGrid or Azure Communication Services
- **Storage**: Azure Table Storage (for logs)
- **Authentication**: Azure AD B2C or custom JWT
- **CI/CD**: GitHub Actions

#### Option B: NoSQL-Based (Better for Flexibility)
- **Database**: Azure Cosmos DB (SQL API)
- Everything else same as Option A

**Recommendation**: Start with **Option A (Azure SQL Database)** for the following reasons:
1. Data is structured and relational
2. Easier migration from Google Sheets
3. Better for complex queries and joins
4. Lower cost for this scale
5. Familiar SQL syntax

## Detailed Component Design

### 1. Azure Function App - Webhook Handler

**Purpose**: Receive TradingView webhooks and process signals

**File Structure**:
```
webhook-handler/
├── function.json          # Function configuration
├── index.js              # Main handler
├── validation.js         # Input validation
└── database.js           # Database operations
```

**Configuration** (function.json):
```json
{
  "bindings": [
    {
      "authLevel": "anonymous",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["post"],
      "route": "webhook"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ]
}
```

**Key Changes from GAS**:
- Replace `LockService` with database transactions
- Replace `SpreadsheetApp` with SQL queries
- Replace `CacheService` with Redis
- Use environment variables instead of script properties

### 2. Azure Function App - API Handler

**Purpose**: Serve data to frontend

**Endpoints**:
- `GET /api/dashboard` - Dashboard data
- `GET /api/historical?date=YYYY-MM-DD` - Historical signals
- `POST /api/auth/generate-otp` - Generate OTP
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/verify-session` - Validate session
- `POST /api/gemini/analyze` - AI analysis
- `POST /api/gemini/chat` - AI chat

### 3. Database Schema (Azure SQL)

**Tables**:

```sql
-- Signals table (replaces Indicator1 sheets)
CREATE TABLE Signals (
    id BIGINT IDENTITY PRIMARY KEY,
    date DATE NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    indicator_type VARCHAR(20) NOT NULL, -- 'Indicator1' or 'Indicator2'
    reason VARCHAR(500) NOT NULL,
    time TIME NOT NULL,
    capital_deployed_cr DECIMAL(10,2),
    created_at DATETIME2 DEFAULT GETDATE(),
    INDEX idx_date_symbol (date, symbol),
    INDEX idx_date_indicator (date, indicator_type)
);

-- Session table (replaces CacheService for sessions)
CREATE TABLE Sessions (
    session_token VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    user_name VARCHAR(255),
    expires_at DATETIME2 NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE()
);

-- OTP table (replaces CacheService for OTPs)
CREATE TABLE OTPs (
    email VARCHAR(255) PRIMARY KEY,
    otp VARCHAR(6) NOT NULL,
    expires_at DATETIME2 NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE()
);

-- Debug logs table (replaces DebugLogs sheets)
CREATE TABLE DebugLogs (
    id BIGINT IDENTITY PRIMARY KEY,
    timestamp DATETIME2 DEFAULT GETDATE(),
    context VARCHAR(500),
    error_message TEXT,
    details TEXT,
    stack_trace TEXT
);

-- User approvals table
CREATE TABLE UserApprovals (
    email VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255),
    provider VARCHAR(50),
    approved BIT DEFAULT 0,
    approved_at DATETIME2,
    registered_at DATETIME2 DEFAULT GETDATE()
);

-- Stored procedures for data cleanup (replaces daily trigger)
CREATE PROCEDURE CleanupOldData
AS
BEGIN
    -- Delete signals older than 14 days
    DELETE FROM Signals WHERE date < DATEADD(day, -14, CAST(GETDATE() AS DATE));
    
    -- Delete expired sessions
    DELETE FROM Sessions WHERE expires_at < GETDATE();
    
    -- Delete expired OTPs
    DELETE FROM OTPs WHERE expires_at < GETDATE();
    
    -- Delete logs older than 30 days
    DELETE FROM DebugLogs WHERE timestamp < DATEADD(day, -30, GETDATE());
END;
```

### 4. Azure Static Web Apps (Frontend)

**Structure**:
```
frontend/
├── index.html            # Main HTML (from current index.html)
├── css/
│   └── styles.css       # Extracted styles
├── js/
│   ├── app.js          # Main application logic
│   ├── auth.js         # Authentication
│   ├── api.js          # API calls
│   └── config.js       # Configuration
├── staticwebapp.config.json  # Routing configuration
└── package.json         # Build configuration
```

**Changes**:
- Replace `google.script.run` calls with `fetch()` to Azure Functions
- Update API endpoints to Azure Function URLs
- Add environment-specific configuration
- Implement proper error handling for API calls

### 5. Azure Timer Function - Daily Maintenance

**Purpose**: Replace GAS time-based trigger for daily cleanup

**Configuration** (function.json):
```json
{
  "bindings": [
    {
      "name": "myTimer",
      "type": "timerTrigger",
      "direction": "in",
      "schedule": "0 0 1 * * *"
    }
  ]
}
```

**Tasks**:
- Execute cleanup stored procedure
- Clear Redis cache
- Send daily summary email (optional)

## Migration Strategy

### Phase 1: Preparation (Week 1)

1. **Azure Resource Setup**
   - Create Azure subscription (if not exists)
   - Create resource group
   - Set up development environment

2. **Repository Setup**
   - Create new repository: `Maurvi-Consultants-Azure`
   - Set up branch protection
   - Configure GitHub Actions secrets

3. **Database Design**
   - Finalize schema
   - Create migration scripts from Google Sheets data

### Phase 2: Backend Development (Week 2-3)

1. **Develop Azure Functions**
   - Webhook handler
   - API endpoints
   - Timer function for maintenance

2. **Database Implementation**
   - Deploy Azure SQL Database
   - Run schema creation scripts
   - Set up connection pooling

3. **Testing**
   - Unit tests for functions
   - Integration tests with database
   - Load testing for webhook handler

### Phase 3: Frontend Migration (Week 3-4)

1. **Update Frontend Code**
   - Replace GAS calls with API calls
   - Update authentication flow
   - Test all features

2. **Deploy Static Web App**
   - Configure Azure Static Web Apps
   - Set up custom domain (optional)
   - Configure CORS

### Phase 4: Data Migration (Week 4)

1. **Export from Google Sheets**
   - Write script to export all historical data
   - Transform to SQL format

2. **Import to Azure SQL**
   - Bulk insert historical data
   - Verify data integrity

### Phase 5: Testing & Validation (Week 5)

1. **End-to-End Testing**
   - Test all user flows
   - Verify webhook processing
   - Test authentication

2. **Performance Testing**
   - Load test webhook endpoint
   - Measure API response times
   - Verify caching effectiveness

### Phase 6: Deployment & Cutover (Week 6)

1. **Parallel Running**
   - Run both systems simultaneously
   - Compare results for accuracy

2. **Cutover**
   - Update TradingView webhook URLs
   - Monitor for errors
   - Keep GAS as backup for 1 week

3. **Decommission**
   - Archive GAS code
   - Final data export
   - Documentation update

## Cost Estimation

### Azure Resources (Monthly, USD)

| Resource | SKU/Tier | Estimated Cost |
|----------|----------|----------------|
| Azure Functions | Consumption Plan | $10-30 (based on executions) |
| Azure SQL Database | Basic (5 DTU) | $5 |
| Azure Static Web Apps | Free tier | $0 |
| Azure Cache for Redis | Basic C0 (250MB) | $16 |
| SendGrid | Free tier (100 emails/day) | $0 |
| Azure Key Vault | Standard | $0.03 |
| Application Insights | First 5GB free | $0-5 |
| **Total** | | **$31-56/month** |

**Note**: Costs can be optimized further with reserved instances and appropriate scaling.

### Cost Comparison with Google Apps Script

| Platform | Monthly Cost | Limitations |
|----------|--------------|-------------|
| Google Apps Script | Free (in quotas) | 6-min execution limit, 20K URL fetches/day |
| Azure (Estimated) | $31-56 | Much higher limits, better performance |

## Key Benefits of Azure Migration

### Technical Benefits
1. **Better Performance**: Lower latency, faster database queries
2. **Scalability**: Auto-scaling for high load
3. **Reliability**: 99.95% SLA for Functions
4. **Monitoring**: Application Insights for detailed telemetry
5. **Security**: Azure AD integration, Key Vault for secrets
6. **Modern Stack**: TypeScript support, better tooling

### Operational Benefits
1. **CI/CD**: Automated deployments via GitHub Actions
2. **Version Control**: Proper Git workflow for all code
3. **Testing**: Unit and integration tests
4. **Rollback**: Easy rollback to previous versions
5. **Staging Environment**: Test changes before production

### Business Benefits
1. **Professional**: Enterprise-grade platform
2. **Compliance**: Better audit trails
3. **Extensibility**: Easier to add new features
4. **Integration**: Connect with other Azure services

## Risks and Mitigation

### Risk 1: Data Loss During Migration
**Mitigation**:
- Export full backup before migration
- Run parallel systems during cutover
- Implement data validation scripts

### Risk 2: Downtime
**Mitigation**:
- Plan migration during low-traffic period
- Use blue-green deployment strategy
- Have rollback plan ready

### Risk 3: Cost Overrun
**Mitigation**:
- Start with smallest SKUs
- Set up cost alerts in Azure
- Monitor usage patterns first week

### Risk 4: Learning Curve
**Mitigation**:
- Comprehensive documentation
- Training sessions for team
- Gradual feature rollout

## Success Criteria

### Technical Metrics
- [ ] All webhooks processed successfully (99.9%+)
- [ ] API response time < 500ms (p95)
- [ ] Zero data loss during migration
- [ ] All tests passing (100% critical paths)

### Business Metrics
- [ ] User login success rate > 98%
- [ ] All TradingView alerts captured
- [ ] Dashboard loads in < 2 seconds
- [ ] No user-facing errors

## Timeline Summary

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| Preparation | Week 1 | Azure setup, repository |
| Backend Development | Week 2-3 | Functions, database |
| Frontend Migration | Week 3-4 | Updated UI, API integration |
| Data Migration | Week 4 | Historical data imported |
| Testing | Week 5 | All tests passing |
| Deployment | Week 6 | Production cutover |

**Total Duration**: 6 weeks

## Next Steps

1. **Get Approval**: Review this plan with stakeholders
2. **Azure Account**: Set up Azure subscription
3. **Create Repository**: Initialize new Azure repository
4. **Follow Deployment Guide**: See `AZURE_DEPLOYMENT_GUIDE.md`

## References

- [Azure Functions Documentation](https://docs.microsoft.com/en-us/azure/azure-functions/)
- [Azure Static Web Apps Documentation](https://docs.microsoft.com/en-us/azure/static-web-apps/)
- [Azure SQL Database Documentation](https://docs.microsoft.com/en-us/azure/azure-sql/)
- [GitHub Actions for Azure](https://docs.microsoft.com/en-us/azure/developer/github/)

---

**Document Version**: 1.0  
**Last Updated**: November 2025  
**Author**: Maurvi Consultants Development Team
