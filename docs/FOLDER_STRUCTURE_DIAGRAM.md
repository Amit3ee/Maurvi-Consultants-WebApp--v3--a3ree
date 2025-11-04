# Azure Migration - Folder Structure Diagram

## Complete Repository Structure

```
Maurvi-Consultants-WebApp--v3--a3ree/
│
├── 📁 apps-script/                      # ✅ GOOGLE APPS SCRIPT VERSION (Current)
│   ├── 📄 code.gs                       # Backend script (2,681 lines)
│   ├── 📄 index.html                    # Frontend HTML (3,691 lines)
│   └── 📄 README.md                     # Version overview
│
├── 📁 azure/                            # 🔵 AZURE FUNCTIONS VERSION (New)
│   │
│   ├── 📁 functions/                    # Azure Functions
│   │   │
│   │   ├── 📁 webhook-handler/          # HTTP: TradingView webhooks
│   │   │   ├── index.js
│   │   │   ├── function.json
│   │   │   └── webhook.test.js
│   │   │
│   │   ├── 📁 api/                      # HTTP: API endpoints
│   │   │   ├── 📁 auth/                 # Authentication
│   │   │   │   ├── generate-otp.js
│   │   │   │   ├── verify-otp.js
│   │   │   │   └── verify-session.js
│   │   │   │
│   │   │   ├── 📁 data/                 # Data retrieval
│   │   │   │   ├── get-dashboard.js
│   │   │   │   └── get-historical.js
│   │   │   │
│   │   │   └── 📁 ai/                   # AI integration
│   │   │       ├── analyze-signal.js
│   │   │       └── chat.js
│   │   │
│   │   ├── 📁 scheduled/                # Timer: Scheduled tasks
│   │   │   ├── daily-maintenance.js
│   │   │   └── function.json
│   │   │
│   │   └── 📄 README.md
│   │
│   ├── 📁 shared/                       # Shared modules
│   │   ├── 📁 database/
│   │   │   ├── cosmos-client.js         # Cosmos DB client
│   │   │   ├── storage-client.js        # Table Storage client
│   │   │   └── queries.js
│   │   │
│   │   ├── 📁 cache/
│   │   │   └── redis-client.js          # Redis cache client
│   │   │
│   │   ├── 📁 auth/
│   │   │   ├── session-manager.js
│   │   │   ├── otp-generator.js
│   │   │   └── email-sender.js
│   │   │
│   │   ├── 📁 models/
│   │   │   ├── signal.js
│   │   │   ├── session.js
│   │   │   └── user.js
│   │   │
│   │   ├── 📁 utils/
│   │   │   ├── date-utils.js
│   │   │   ├── validator.js
│   │   │   └── logger.js
│   │   │
│   │   ├── 📄 constants.js
│   │   └── 📄 README.md
│   │
│   ├── 📁 web/                          # Static web app (frontend)
│   │   ├── 📁 src/
│   │   │   ├── 📄 index.html            # Main HTML
│   │   │   │
│   │   │   ├── 📁 js/
│   │   │   │   ├── app.js
│   │   │   │   ├── api-client.js
│   │   │   │   ├── auth.js
│   │   │   │   └── ui-manager.js
│   │   │   │
│   │   │   ├── 📁 css/
│   │   │   │   └── styles.css
│   │   │   │
│   │   │   └── 📁 assets/
│   │   │       └── 📁 images/
│   │   │
│   │   ├── 📄 staticwebapp.config.json
│   │   └── 📄 README.md
│   │
│   ├── 📁 infrastructure/               # Infrastructure as Code
│   │   ├── 📁 bicep/                    # Azure Bicep templates
│   │   │   ├── main.bicep
│   │   │   ├── function-app.bicep
│   │   │   ├── database.bicep
│   │   │   ├── storage.bicep
│   │   │   └── monitoring.bicep
│   │   │
│   │   ├── 📁 terraform/                # Terraform (alternative)
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   │
│   │   └── 📄 README.md
│   │
│   ├── 📁 tests/                        # Integration tests
│   │   ├── webhook.integration.test.js
│   │   ├── auth.integration.test.js
│   │   └── data.integration.test.js
│   │
│   ├── 📁 scripts/                      # Deployment scripts
│   │   ├── deploy.sh
│   │   ├── migrate-data.js
│   │   ├── seed-database.js
│   │   └── local-setup.sh
│   │
│   ├── 📄 package.json                  # Node.js dependencies
│   ├── 📄 .env.example                  # Environment variables template
│   ├── 📄 .funcignore                   # Azure Functions ignore file
│   ├── 📄 local.settings.json.example   # Local development settings
│   └── 📄 README.md
│
├── 📁 docs/                             # Documentation
│   ├── 📄 AZURE_DEPLOYMENT.md           # ⭐ Step-by-step Azure guide
│   ├── 📄 AZURE_QUICK_REFERENCE.md      # Quick reference
│   └── (other docs...)
│
├── 📄 AZURE_MIGRATION_PLAN.md           # 🌟 COMPLETE MIGRATION PLAN (READ THIS)
├── 📄 README.md                         # Main README (updated)
├── 📄 .gitignore                        # Git ignore (updated)
│
└── 📄 (existing documentation files)    # Original docs
    ├── ARCHITECTURE.md
    ├── DEPLOYMENT.md
    ├── ALERT_FORMATS.md
    └── ...
```

## Key Directories Explained

### 📁 apps-script/
- **Purpose**: Original Google Apps Script implementation
- **Status**: ✅ Current production version
- **Files**: 2 main files (code.gs, index.html)
- **Deployment**: Google Apps Script platform

### 📁 azure/functions/
- **Purpose**: Azure Functions for backend API
- **Contains**: HTTP triggers (webhooks, API) and Timer triggers (maintenance)
- **Language**: JavaScript (Node.js)
- **Deployment**: Azure Functions (Consumption or Premium plan)

### 📁 azure/shared/
- **Purpose**: Reusable modules across all functions
- **Contains**: Database clients, cache, auth, models, utilities
- **Pattern**: Singleton services for efficiency
- **Usage**: `require('../shared/database/cosmos-client')`

### 📁 azure/web/
- **Purpose**: Frontend application
- **Refactor**: Split monolithic index.html into modular structure
- **Deployment**: Azure Static Web Apps or Azure Storage
- **Features**: Separated HTML, CSS, JS modules

### 📁 azure/infrastructure/
- **Purpose**: Infrastructure as Code for reproducible deployments
- **Options**: Bicep (recommended) or Terraform
- **Benefits**: Version-controlled infrastructure, automated deployment
- **Resources**: Function App, Cosmos DB, Redis, Storage, etc.

### 📁 azure/tests/
- **Purpose**: Integration tests for Azure version
- **Framework**: Jest
- **Coverage**: Webhooks, authentication, data retrieval
- **Run**: `npm test`

### 📁 azure/scripts/
- **Purpose**: Deployment and utility scripts
- **Contains**: Deployment automation, data migration, database seeding
- **Usage**: Helper scripts for DevOps tasks

### 📁 docs/
- **Purpose**: Centralized documentation for both versions
- **Key Files**:
  - `AZURE_DEPLOYMENT.md` - Practical deployment commands
  - `AZURE_QUICK_REFERENCE.md` - Quick reference guide

## File Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    AZURE ARCHITECTURE FLOW                       │
└─────────────────────────────────────────────────────────────────┘

TradingView Alert
      │
      ▼
┌──────────────┐
│ Azure        │
│ Functions    │ ◄─── azure/functions/webhook-handler/
│ (Webhook)    │
└──────┬───────┘
       │
       ├──► ┌───────────────┐
       │    │ Cosmos DB     │ ◄─── azure/shared/database/
       │    │ (Signals)     │
       │    └───────────────┘
       │
       └──► ┌───────────────┐
            │ Redis Cache   │ ◄─── azure/shared/cache/
            │ (Row Mapping) │
            └───────────────┘

User Browser
      │
      ▼
┌──────────────┐
│ Azure        │ ◄─── azure/web/src/
│ Static Web   │
│ App          │
└──────┬───────┘
       │
       └──► ┌───────────────┐
            │ Azure         │ ◄─── azure/functions/api/
            │ Functions     │
            │ (API)         │
            └───────────────┘

Daily Schedule
      │
      ▼
┌──────────────┐
│ Timer        │ ◄─── azure/functions/scheduled/
│ Trigger      │
│ (Cron)       │
└──────────────┘
```

## Azure Resources Mapping

```
Google Apps Script          →    Azure Services
─────────────────────────────────────────────────────────────
Apps Script Code            →    Azure Functions (Node.js)
Google Sheets               →    Cosmos DB / Table Storage
Apps Script Cache           →    Azure Redis Cache
Gmail API                   →    SendGrid / Azure Communication
Apps Script Properties      →    Key Vault + App Configuration
Apps Script Triggers        →    Timer Triggers
HTML Service                →    Azure Static Web Apps
Apps Script Logger          →    Application Insights
```

## Implementation Status

| Component | Status | Location |
|-----------|--------|----------|
| Folder Structure | ✅ Complete | `/azure/` |
| Documentation | ✅ Complete | `AZURE_MIGRATION_PLAN.md` |
| Deployment Guide | ✅ Complete | `docs/AZURE_DEPLOYMENT.md` |
| Package Config | ✅ Complete | `azure/package.json` |
| Env Templates | ✅ Complete | `azure/.env.example` |
| Function Code | 🔄 Planned | `azure/functions/` |
| Shared Modules | 🔄 Planned | `azure/shared/` |
| Frontend Refactor | 🔄 Planned | `azure/web/` |
| IaC Templates | 🔄 Planned | `azure/infrastructure/` |

## Next Steps

1. **Review** the folder structure and understand the organization
2. **Read** `AZURE_MIGRATION_PLAN.md` for complete implementation details
3. **Follow** `docs/AZURE_DEPLOYMENT.md` for step-by-step deployment
4. **Implement** functions starting with webhook handler
5. **Test** locally before deploying to Azure
6. **Deploy** incrementally, one component at a time
7. **Monitor** using Application Insights

## Quick Access

- 📘 **Complete Guide**: [AZURE_MIGRATION_PLAN.md](../AZURE_MIGRATION_PLAN.md)
- 🚀 **Deployment Steps**: [docs/AZURE_DEPLOYMENT.md](../docs/AZURE_DEPLOYMENT.md)
- ⚡ **Quick Reference**: [docs/AZURE_QUICK_REFERENCE.md](../docs/AZURE_QUICK_REFERENCE.md)
- 📦 **Azure Directory**: [azure/](../azure/)
- 📜 **Apps Script**: [apps-script/](../apps-script/)

---

**Remember**: This structure supports **both** the current Apps Script version and the future Azure version in the same repository, making migration flexible and incremental.
