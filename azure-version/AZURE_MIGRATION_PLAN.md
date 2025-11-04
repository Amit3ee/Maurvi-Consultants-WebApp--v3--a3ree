# Azure Functions Migration Plan

## Executive Summary

This document outlines the complete plan for migrating the Maurvi Consultants Trading Signals Web App from Google Apps Script to Microsoft Azure Functions.

## Current Architecture (Google Apps Script)

### Components
1. **Backend**: Google Apps Script (JavaScript runtime)
2. **Data Storage**: Google Sheets with date-suffixed sheets
3. **Authentication**: Email-based OTP using Gmail
4. **Caching**: Google CacheService (in-memory)
5. **Configuration**: Google PropertiesService (key-value store)
6. **Web Serving**: Apps Script Web App deployment
7. **Scheduling**: Time-based triggers for daily maintenance
8. **External APIs**: Gemini AI for signal analysis

### Key Features
- Real-time webhook processing from TradingView
- Dynamic row mapping for signal synchronization
- Date-suffixed data organization (14-day retention)
- OTP-based authentication
- Live dashboard with multiple views
- Historical data access
- AI-powered signal analysis

## Target Architecture (Azure)

### Azure Services Mapping

| Current (GAS) | Azure Service | Purpose |
|---------------|---------------|---------|
| Apps Script Functions | Azure Functions | Serverless compute |
| Google Sheets | Azure Cosmos DB or Table Storage | NoSQL data storage |
| Gmail/MailApp | Azure Communication Services / SendGrid | Email delivery |
| CacheService | Azure Redis Cache | Distributed caching |
| PropertiesService | Azure Key Vault | Secrets management |
| Script Triggers | Azure Timer Triggers | Scheduled tasks |
| Web App Hosting | Azure Static Web Apps | Frontend hosting |
| UrlFetchApp | Node.js fetch/axios | HTTP requests |

### Recommended Azure Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Azure Front Door                     │
│              (Global load balancing, CDN)               │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼─────────┐    ┌─────────▼──────────┐
│  Azure Static   │    │  Azure Functions   │
│    Web Apps     │    │   (Node.js v18+)   │
│  (Frontend UI)  │    │                    │
└─────────────────┘    └──────┬─────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
         ┌──────────▼────────┐  ┌──────▼───────────┐
         │  Azure Cosmos DB  │  │  Azure Redis     │
         │  (NoSQL Database) │  │  Cache           │
         │                   │  │                  │
         └───────────────────┘  └──────────────────┘
                    │
         ┌──────────┴────────────────────┐
         │                               │
┌────────▼────────┐         ┌───────────▼──────────┐
│  Azure Key      │         │  Azure Comm Services │
│  Vault          │         │  or SendGrid         │
│  (Secrets)      │         │  (Email)             │
└─────────────────┘         └──────────────────────┘
```

## Recommended Folder Structure for Azure Version

```
azure-version/
├── README.md                           # Azure-specific documentation
├── DEPLOYMENT_GUIDE.md                 # Step-by-step deployment instructions
├── .gitignore                          # Azure-specific ignores
├── package.json                        # Node.js dependencies
├── package-lock.json
├── host.json                           # Azure Functions host configuration
├── local.settings.json.template        # Template for local development
│
├── functions/                          # Azure Functions
│   ├── webhook-handler/                # Handles TradingView webhooks
│   │   ├── index.js                    # Function code
│   │   └── function.json               # Function configuration
│   │
│   ├── daily-maintenance/              # Daily cleanup task
│   │   ├── index.js
│   │   └── function.json
│   │
│   ├── get-dashboard-data/             # API for dashboard
│   │   ├── index.js
│   │   └── function.json
│   │
│   ├── get-historical-data/            # API for historical signals
│   │   ├── index.js
│   │   └── function.json
│   │
│   ├── auth-generate-otp/              # OTP generation
│   │   ├── index.js
│   │   └── function.json
│   │
│   ├── auth-verify-otp/                # OTP verification
│   │   ├── index.js
│   │   └── function.json
│   │
│   ├── auth-verify-session/            # Session validation
│   │   ├── index.js
│   │   └── function.json
│   │
│   ├── gemini-analyze/                 # AI signal analysis
│   │   ├── index.js
│   │   └── function.json
│   │
│   └── gemini-chat/                    # AI chat interface
│       ├── index.js
│       └── function.json
│
├── shared/                             # Shared utilities and services
│   ├── database/
│   │   ├── cosmos-client.js            # Cosmos DB client
│   │   ├── signal-repository.js        # Signal data operations
│   │   └── user-repository.js          # User data operations
│   │
│   ├── cache/
│   │   └── redis-client.js             # Redis cache client
│   │
│   ├── email/
│   │   └── email-service.js            # Email sending service
│   │
│   ├── auth/
│   │   ├── otp-manager.js              # OTP generation/validation
│   │   └── session-manager.js          # Session management
│   │
│   ├── utils/
│   │   ├── date-utils.js               # Date formatting utilities
│   │   ├── validation.js               # Input validation
│   │   └── constants.js                # Application constants
│   │
│   └── models/
│       ├── signal.js                   # Signal data model
│       └── user.js                     # User data model
│
├── frontend/                           # Static web app files
│   ├── index.html                      # Main HTML (modified for Azure)
│   ├── styles/
│   │   └── main.css                    # CSS (if separated)
│   ├── scripts/
│   │   └── app.js                      # JavaScript (if separated)
│   └── staticwebapp.config.json        # Azure Static Web Apps config
│
├── infrastructure/                     # Infrastructure as Code
│   ├── bicep/                          # Azure Bicep templates
│   │   ├── main.bicep                  # Main infrastructure
│   │   ├── function-app.bicep          # Function App resources
│   │   ├── cosmos-db.bicep             # Cosmos DB resources
│   │   ├── redis-cache.bicep           # Redis Cache resources
│   │   └── static-web-app.bicep        # Static Web App resources
│   │
│   └── terraform/                      # Terraform templates (alternative)
│       └── main.tf
│
├── scripts/                            # Utility scripts
│   ├── setup-azure-resources.sh        # Azure resource setup
│   ├── deploy-functions.sh             # Deploy functions
│   ├── deploy-frontend.sh              # Deploy frontend
│   └── migrate-data.js                 # Data migration from Google Sheets
│
├── tests/                              # Test files
│   ├── unit/
│   │   ├── signal-repository.test.js
│   │   └── otp-manager.test.js
│   │
│   └── integration/
│       └── webhook-handler.test.js
│
└── docs/                               # Additional documentation
    ├── API.md                          # API documentation
    ├── DATABASE_SCHEMA.md              # Database design
    └── TROUBLESHOOTING.md              # Common issues and solutions
```

## Key Technical Decisions

### Database Choice: Azure Cosmos DB

**Why Cosmos DB:**
- NoSQL document database (similar to Sheets rows as documents)
- Serverless billing model (pay per request)
- Automatic scaling
- Global distribution capability
- JSON-native storage
- Rich query capabilities

**Data Model:**
```javascript
// Signals Collection
{
  "id": "2025-01-15-RELIANCE-1",
  "partitionKey": "2025-01-15", // Date for partition
  "symbol": "RELIANCE",
  "date": "2025-01-15",
  "indicator1Signals": [
    { "reason": "Volume Surge", "time": "09:20:05" }
  ],
  "indicator2SyncEvents": [
    { "reason": "HVD (350 Cr)", "time": "09:42:00" }
  ],
  "createdAt": "2025-01-15T09:20:05Z",
  "updatedAt": "2025-01-15T09:42:00Z"
}

// Indicator2 Log Collection
{
  "id": "unique-guid",
  "partitionKey": "2025-01-15",
  "date": "2025-01-15",
  "time": "09:42:00",
  "ticker": "RELIANCE",
  "reason": "HVD",
  "capitalDeployedCr": "350",
  "createdAt": "2025-01-15T09:42:00Z"
}

// Users Collection
{
  "id": "user-email@example.com",
  "partitionKey": "users",
  "email": "user-email@example.com",
  "name": "User Name",
  "provider": "google",
  "approved": true,
  "approvedAt": "2025-01-15T10:00:00Z",
  "registeredAt": "2025-01-14T15:30:00Z"
}
```

## Cost Estimation (Monthly)

### Development Environment
- Azure Functions (Consumption): ~$10
- Cosmos DB (Serverless): ~$25
- Redis Cache (Basic C0): ~$17
- Static Web Apps (Free tier): $0
- Communication Services: ~$5
**Total Dev: ~$57/month**

### Production Environment (Low Traffic)
- Azure Functions (Premium EP1): ~$140
- Cosmos DB (Serverless): ~$100
- Redis Cache (Standard C1): ~$75
- Static Web Apps (Standard): $9
- Communication Services: ~$20
- Key Vault: ~$3
- Application Insights: ~$10
**Total Prod: ~$357/month**

## Migration Timeline

| Week | Focus Area | Deliverables |
|------|------------|-------------|
| 1 | Infrastructure | Azure resources provisioned |
| 2 | Backend Core | Webhook handler, data layer |
| 3 | Backend APIs | All API endpoints migrated |
| 4 | Frontend & Testing | UI working with Azure backend |
| 5 | Data Migration | Historical data in Cosmos DB |
| 6 | Go-Live | Production deployment complete |

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Author**: Development Team
