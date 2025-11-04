# Azure Migration Plan - Trading Signals Web App

## Overview

This document provides a comprehensive plan for refactoring the existing Google Apps Script trading signals application to be deployable on Microsoft Azure as Azure Functions.

## Current Architecture (Google Apps Script)

### Key Components
1. **Backend**: Google Apps Script (code.gs - 2,681 lines)
   - Webhook endpoint (doPost) for TradingView alerts
   - OTP authentication via email
   - Session management
   - Gemini AI integration
   - Daily maintenance tasks

2. **Frontend**: Single HTML file (index.html - 3,691 lines)
   - Real-time dashboard with polling (15s intervals)
   - Multiple tabs: Dashboard, Live Feed, Logs, Historical
   - Glassmorphic UI with dark/light themes
   - Voice narration for signals

3. **Data Storage**: Google Sheets
   - Date-suffixed sheets (14-day retention)
   - Indicator1_YYYY-MM-DD (main tracking)
   - Indicator2_YYYY-MM-DD (append-only log)
   - DebugLogs_YYYY-MM-DD (error logging)

4. **External Services**
   - Gmail for OTP delivery
   - TradingView webhooks
   - Gemini AI API

### Key Features to Preserve
- Real-time webhook processing with locking mechanism
- Dynamic row mapping for signal synchronization
- OTP-based authentication
- Session management
- Daily maintenance scheduling
- Historical data retention (14 days)
- AI-powered analysis

---

## Recommended Folder Structure

```
Maurvi-Consultants-WebApp--v3--a3ree/
│
├── apps-script/                          # Existing Google Apps Script version
│   ├── code.gs
│   ├── index.html
│   └── README.md (link to main docs)
│
├── azure/                                # New Azure version
│   ├── functions/                        # Azure Functions
│   │   ├── webhook-handler/              # HTTP trigger for TradingView webhooks
│   │   │   ├── index.js                  # Main webhook handler
│   │   │   ├── function.json             # Function configuration
│   │   │   └── webhook.test.js           # Unit tests
│   │   │
│   │   ├── api/                          # HTTP triggers for API endpoints
│   │   │   ├── auth/
│   │   │   │   ├── generate-otp.js       # Generate OTP endpoint
│   │   │   │   ├── verify-otp.js         # Verify OTP endpoint
│   │   │   │   ├── verify-session.js     # Session verification
│   │   │   │   └── function.json
│   │   │   │
│   │   │   ├── data/
│   │   │   │   ├── get-dashboard.js      # Dashboard data endpoint
│   │   │   │   ├── get-historical.js     # Historical data endpoint
│   │   │   │   └── function.json
│   │   │   │
│   │   │   └── ai/
│   │   │       ├── analyze-signal.js     # Gemini AI analysis
│   │   │       ├── chat.js               # AI chat endpoint
│   │   │       └── function.json
│   │   │
│   │   └── scheduled/                    # Timer triggers
│   │       ├── daily-maintenance.js      # Daily cleanup & setup
│   │       └── function.json
│   │
│   ├── shared/                           # Shared utilities & modules
│   │   ├── database/
│   │   │   ├── cosmos-client.js          # Azure Cosmos DB client
│   │   │   ├── storage-client.js         # Azure Table Storage client
│   │   │   └── queries.js                # Common database queries
│   │   │
│   │   ├── cache/
│   │   │   └── redis-client.js           # Azure Redis Cache client
│   │   │
│   │   ├── auth/
│   │   │   ├── session-manager.js        # Session management
│   │   │   ├── otp-generator.js          # OTP generation
│   │   │   └── email-sender.js           # SendGrid/Azure Communication Services
│   │   │
│   │   ├── models/
│   │   │   ├── signal.js                 # Signal data model
│   │   │   ├── session.js                # Session model
│   │   │   └── user.js                   # User model
│   │   │
│   │   ├── utils/
│   │   │   ├── date-utils.js             # Date formatting utilities
│   │   │   ├── validator.js              # Input validation
│   │   │   └── logger.js                 # Structured logging
│   │   │
│   │   └── constants.js                  # Shared constants
│   │
│   ├── web/                              # Static web app (frontend)
│   │   ├── src/
│   │   │   ├── index.html                # Main HTML (refactored)
│   │   │   ├── js/
│   │   │   │   ├── app.js                # Main app logic
│   │   │   │   ├── api-client.js         # API communication
│   │   │   │   ├── auth.js               # Authentication logic
│   │   │   │   └── ui-manager.js         # UI state management
│   │   │   │
│   │   │   ├── css/
│   │   │   │   └── styles.css            # Extracted styles
│   │   │   │
│   │   │   └── assets/
│   │   │       └── images/
│   │   │
│   │   └── staticwebapp.config.json      # Azure Static Web Apps config
│   │
│   ├── infrastructure/                   # Infrastructure as Code
│   │   ├── bicep/                        # Azure Bicep templates
│   │   │   ├── main.bicep                # Main deployment template
│   │   │   ├── function-app.bicep        # Function App resources
│   │   │   ├── database.bicep            # Database resources
│   │   │   ├── storage.bicep             # Storage resources
│   │   │   └── monitoring.bicep          # Application Insights
│   │   │
│   │   └── terraform/                    # Alternative: Terraform (optional)
│   │       ├── main.tf
│   │       ├── variables.tf
│   │       └── outputs.tf
│   │
│   ├── tests/                            # Integration tests
│   │   ├── webhook.integration.test.js
│   │   ├── auth.integration.test.js
│   │   └── data.integration.test.js
│   │
│   ├── scripts/                          # Deployment & utility scripts
│   │   ├── deploy.sh                     # Deployment script
│   │   ├── migrate-data.js               # Data migration from Sheets
│   │   ├── seed-database.js              # Database seeding
│   │   └── local-setup.sh                # Local development setup
│   │
│   ├── .env.example                      # Environment variables template
│   ├── .funcignore                       # Azure Functions ignore file
│   ├── .gitignore                        # Azure-specific gitignore
│   ├── host.json                         # Function App host configuration
│   ├── local.settings.json.example       # Local development settings
│   ├── package.json                      # Node.js dependencies
│   ├── package-lock.json
│   └── README.md                         # Azure-specific documentation
│
├── docs/                                 # Shared documentation
│   ├── ARCHITECTURE.md                   # (existing, updated)
│   ├── DEPLOYMENT.md                     # (existing, kept for Apps Script)
│   ├── AZURE_DEPLOYMENT.md               # New: Azure deployment guide
│   ├── AZURE_ARCHITECTURE.md             # New: Azure architecture details
│   ├── MIGRATION_GUIDE.md                # New: Migration from Apps Script to Azure
│   └── API_REFERENCE.md                  # New: API endpoint documentation
│
├── .gitignore                            # Root gitignore (updated)
├── README.md                             # Root README (updated with both versions)
└── AZURE_MIGRATION_PLAN.md              # This document
```

### Folder Structure Rationale

1. **Separation of Concerns**: Apps Script and Azure versions are completely separated under `apps-script/` and `azure/` directories
2. **Azure Functions Best Practices**: Functions organized by trigger type (HTTP, Timer)
3. **Shared Code**: Common utilities in `shared/` to avoid duplication
4. **Infrastructure as Code**: Bicep templates for reproducible deployments
5. **Static Web App**: Frontend separated for deployment to Azure Static Web Apps
6. **Testing**: Dedicated test directory for integration tests
7. **Documentation**: Centralized docs with both platform guides

---

## Azure Services Mapping

| Current (Google) | Azure Equivalent | Purpose |
|------------------|------------------|---------|
| Google Apps Script | Azure Functions (Node.js) | Backend API & webhook processing |
| Google Sheets | Azure Cosmos DB (NoSQL) OR Azure Table Storage | Signal data storage |
| Apps Script Cache | Azure Redis Cache | Session & row mapping cache |
| Gmail API | Azure Communication Services OR SendGrid | OTP email delivery |
| Apps Script Properties | Azure Key Vault + App Configuration | Configuration & secrets |
| Apps Script Triggers | Azure Functions Timer Triggers | Daily maintenance scheduling |
| HTML Service | Azure Static Web Apps | Frontend hosting |
| Apps Script Logger | Azure Application Insights | Logging & monitoring |
| N/A | Azure API Management (optional) | API gateway for rate limiting |

---

## Step-by-Step Azure Deployment Guide

### Prerequisites

Before starting the migration, ensure you have:

- **Azure Account**: Active subscription ([free trial available](https://azure.microsoft.com/free/))
- **Node.js**: Version 18.x or 20.x LTS
- **Azure CLI**: [Install instructions](https://docs.microsoft.com/cli/azure/install-azure-cli)
- **Azure Functions Core Tools**: `npm install -g azure-functions-core-tools@4`
- **VS Code** (recommended): With Azure Functions extension
- **Git**: For version control

### Phase 1: Initial Setup (1-2 hours)

#### Step 1.1: Install Required Tools

```bash
# Install Azure CLI (if not already installed)
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Install Azure Functions Core Tools
npm install -g azure-functions-core-tools@4 --unsafe-perm true

# Login to Azure
az login

# Set default subscription (if you have multiple)
az account set --subscription "YOUR_SUBSCRIPTION_NAME"
```

#### Step 1.2: Create Azure Resources

```bash
# Set variables
RESOURCE_GROUP="rg-maurvi-trading-signals"
LOCATION="eastus"  # Choose: eastus, westus2, westeurope, etc.
FUNCTION_APP_NAME="func-maurvi-signals"  # Must be globally unique
STORAGE_ACCOUNT="stmaurvifunc"  # Must be globally unique, 3-24 lowercase chars
COSMOS_ACCOUNT="cosmos-maurvi-signals"
REDIS_NAME="redis-maurvi-cache"

# Create resource group
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION

# Create storage account (for function app)
az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS

# Create Function App (Consumption plan - free tier available)
az functionapp create \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --storage-account $STORAGE_ACCOUNT \
  --consumption-plan-location $LOCATION \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4 \
  --os-type Linux
```

#### Step 1.3: Create Database Resources

**Option A: Azure Cosmos DB (Recommended for flexibility)**

```bash
# Create Cosmos DB account (serverless for cost efficiency)
az cosmosdb create \
  --name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --default-consistency-level Session \
  --locations regionName=$LOCATION \
  --capabilities EnableServerless

# Create database
az cosmosdb sql database create \
  --account-name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --name TradingSignals

# Create containers
az cosmosdb sql container create \
  --account-name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --database-name TradingSignals \
  --name Signals \
  --partition-key-path "/date" \
  --throughput 400

az cosmosdb sql container create \
  --account-name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --database-name TradingSignals \
  --name Sessions \
  --partition-key-path "/userId" \
  --throughput 400
```

**Option B: Azure Table Storage (Simpler, more cost-effective)**

```bash
# Create storage account for Table Storage
az storage account create \
  --name stmaurvidata \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS

# Tables will be created automatically by the application
```

#### Step 1.4: Create Cache and Additional Services

```bash
# Create Redis Cache (Basic tier for development)
az redis create \
  --name $REDIS_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Basic \
  --vm-size c0

# Create Application Insights
az monitor app-insights component create \
  --app maurvi-signals-insights \
  --location $LOCATION \
  --resource-group $RESOURCE_GROUP \
  --application-type web

# Create Key Vault for secrets
az keyvault create \
  --name kv-maurvi-signals \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION
```

### Phase 2: Project Initialization (1 hour)

#### Step 2.1: Create Azure Functions Project

```bash
# Navigate to repository
cd /path/to/Maurvi-Consultants-WebApp--v3--a3ree

# Create Azure directory structure
mkdir -p azure/functions
cd azure

# Initialize Node.js project
npm init -y

# Install dependencies
npm install @azure/cosmos @azure/data-tables @azure/identity \
  @azure/communication-email redis axios dotenv \
  @google/generative-ai

# Install dev dependencies
npm install --save-dev jest @types/node

# Create Functions
func init functions --worker-runtime node --language javascript --model V4
```

#### Step 2.2: Configure Environment Variables

Create `azure/.env.example`:

```env
# Azure Configuration
AZURE_COSMOS_ENDPOINT=https://your-cosmos-account.documents.azure.com:443/
AZURE_COSMOS_KEY=your-cosmos-key
AZURE_TABLE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
AZURE_REDIS_CONNECTION_STRING=your-redis.redis.cache.windows.net:6380,password=...

# Application Configuration
ADMIN_EMAIL=amit3ree@gmail.com
OTP_VALIDITY_MINUTES=3
SESSION_VALIDITY_HOURS=24
DATA_RETENTION_DAYS=14

# External Services
GEMINI_API_KEY=your-gemini-api-key
SENDGRID_API_KEY=your-sendgrid-key  # OR use Azure Communication Services
SENDER_EMAIL=noreply@yourdomain.com

# Azure Communication Services (alternative to SendGrid)
ACS_CONNECTION_STRING=endpoint=https://...

# Application Insights
APPINSIGHTS_INSTRUMENTATIONKEY=your-instrumentation-key
```

#### Step 2.3: Create Basic Function Structure

```bash
cd functions

# Create webhook handler
func new --name webhook-handler --template "HTTP trigger" --authlevel anonymous

# Create API endpoints
func new --name generate-otp --template "HTTP trigger" --authlevel anonymous
func new --name verify-otp --template "HTTP trigger" --authlevel anonymous
func new --name get-dashboard --template "HTTP trigger" --authlevel anonymous

# Create scheduled function
func new --name daily-maintenance --template "Timer trigger"
```

### Phase 3: Code Migration (4-8 hours)

#### Step 3.1: Create Shared Modules

Create `azure/shared/database/cosmos-client.js`:

```javascript
const { CosmosClient } = require('@azure/cosmos');

class CosmosService {
  constructor() {
    this.client = new CosmosClient({
      endpoint: process.env.AZURE_COSMOS_ENDPOINT,
      key: process.env.AZURE_COSMOS_KEY
    });
    this.database = this.client.database('TradingSignals');
    this.signalsContainer = this.database.container('Signals');
    this.sessionsContainer = this.database.container('Sessions');
  }

  async createSignal(signal) {
    const { resource } = await this.signalsContainer.items.create(signal);
    return resource;
  }

  async getSignalsByDate(date) {
    const query = {
      query: 'SELECT * FROM c WHERE c.date = @date',
      parameters: [{ name: '@date', value: date }]
    };
    const { resources } = await this.signalsContainer.items.query(query).fetchAll();
    return resources;
  }

  async getSession(sessionToken) {
    try {
      const { resource } = await this.sessionsContainer.item(sessionToken, sessionToken).read();
      return resource;
    } catch (error) {
      if (error.code === 404) return null;
      throw error;
    }
  }

  async createSession(session) {
    const { resource } = await this.sessionsContainer.items.create(session);
    return resource;
  }
}

module.exports = new CosmosService();
```

Create `azure/shared/cache/redis-client.js`:

```javascript
const redis = require('redis');

class RedisCache {
  constructor() {
    this.client = redis.createClient({
      url: process.env.AZURE_REDIS_CONNECTION_STRING,
      socket: { tls: true }
    });
    this.client.on('error', (err) => console.error('Redis Client Error', err));
    this.connect();
  }

  async connect() {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  async get(key) {
    await this.connect();
    return await this.client.get(key);
  }

  async set(key, value, expirationInSeconds) {
    await this.connect();
    if (expirationInSeconds) {
      await this.client.setEx(key, expirationInSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async delete(key) {
    await this.connect();
    await this.client.del(key);
  }
}

module.exports = new RedisCache();
```

#### Step 3.2: Migrate Webhook Handler

Create `azure/functions/webhook-handler/index.js`:

```javascript
const { app } = require('@azure/functions');
const cosmosService = require('../../shared/database/cosmos-client');
const redisCache = require('../../shared/cache/redis-client');

app.http('webhook-handler', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    const startTime = Date.now();
    
    try {
      // Parse request body
      const data = await request.json();
      
      // Determine indicator type
      const indicatorType = data.scrip ? 'Indicator1' : data.ticker ? 'Indicator2' : null;
      if (!indicatorType) {
        return {
          status: 400,
          jsonBody: { error: "Missing required field: must have either 'scrip' or 'ticker'" }
        };
      }
      
      const symbol = data.scrip || data.ticker;
      
      if (!data.reason) {
        return {
          status: 400,
          jsonBody: { error: "Missing required field: reason" }
        };
      }
      
      // Generate timestamp and date
      const timestamp = new Date();
      const date = timestamp.toISOString().split('T')[0];
      const time = timestamp.toISOString().split('T')[1].split('.')[0];
      
      // Create signal document
      const signal = {
        id: `${symbol}-${indicatorType}-${timestamp.getTime()}`,
        date,
        time,
        timestamp: timestamp.toISOString(),
        symbol,
        indicatorType,
        reason: data.reason,
        capitalDeployed: data.capital_deployed_cr || null,
        rawData: data
      };
      
      // Store signal in database
      await cosmosService.createSignal(signal);
      
      // Handle row mapping for Indicator1 sheet synchronization
      if (indicatorType === 'Indicator1') {
        const cacheKey = `symbolRowMap_${date}`;
        let symbolMap = await redisCache.get(cacheKey);
        symbolMap = symbolMap ? JSON.parse(symbolMap) : {};
        
        if (!symbolMap[symbol]) {
          // New symbol - assign next row
          const rowCount = Object.keys(symbolMap).length;
          symbolMap[symbol] = rowCount + 2; // +2 for header row
          await redisCache.set(cacheKey, JSON.stringify(symbolMap), 86400);
        }
      }
      
      // Clear cache for immediate updates
      await redisCache.delete(`dashboardData_${date}`);
      
      const duration = Date.now() - startTime;
      context.log(`Webhook processed in ${duration}ms: ${indicatorType} - ${symbol}`);
      
      return {
        status: 200,
        jsonBody: {
          status: 'success',
          indicator: indicatorType,
          symbol,
          time,
          processingTime: `${duration}ms`
        }
      };
      
    } catch (error) {
      context.error('Webhook error:', error);
      
      return {
        status: 500,
        jsonBody: {
          status: 'error',
          message: error.message
        }
      };
    }
  }
});
```

#### Step 3.3: Migrate Authentication Functions

Similar migrations for `generate-otp`, `verify-otp`, and other API endpoints...

#### Step 3.4: Migrate Daily Maintenance

Create `azure/functions/scheduled/daily-maintenance.js`:

```javascript
const { app } = require('@azure/functions');
const cosmosService = require('../../shared/database/cosmos-client');
const redisCache = require('../../shared/cache/redis-client');

app.timer('daily-maintenance', {
  schedule: '0 0 1 * * *', // Run at 1:00 AM daily
  handler: async (myTimer, context) => {
    try {
      const today = new Date();
      const purgeDate = new Date(today);
      purgeDate.setDate(today.getDate() - 14);
      
      context.log('Starting daily maintenance...', today.toISOString());
      
      // Clear old cache entries
      const dateStr = today.toISOString().split('T')[0];
      await redisCache.delete(`symbolRowMap_${dateStr}`);
      
      // Delete old signals (14+ days old)
      const purgeDateStr = purgeDate.toISOString().split('T')[0];
      context.log(`Deleting signals older than ${purgeDateStr}`);
      
      // Query and delete old signals from Cosmos DB
      const query = {
        query: 'SELECT * FROM c WHERE c.date < @purgeDate',
        parameters: [{ name: '@purgeDate', value: purgeDateStr }]
      };
      
      const { resources } = await cosmosService.signalsContainer.items
        .query(query)
        .fetchAll();
      
      for (const signal of resources) {
        await cosmosService.signalsContainer.item(signal.id, signal.date).delete();
      }
      
      context.log(`Daily maintenance completed. Deleted ${resources.length} old signals.`);
      
    } catch (error) {
      context.error('Daily maintenance error:', error);
      throw error;
    }
  }
});
```

### Phase 4: Frontend Migration (2-4 hours)

#### Step 4.1: Create Static Web App Structure

```bash
cd azure
mkdir -p web/src/{js,css,assets}
```

#### Step 4.2: Extract and Refactor HTML

Split the monolithic `index.html` into:
- `web/src/index.html` - Main structure
- `web/src/js/app.js` - Application logic
- `web/src/js/api-client.js` - API communication
- `web/src/css/styles.css` - Extracted styles

Update API endpoints to point to Azure Functions:

```javascript
// web/src/js/api-client.js
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:7071/api'
  : 'https://func-maurvi-signals.azurewebsites.net/api';

class ApiClient {
  async generateOTP(email) {
    const response = await fetch(`${API_BASE_URL}/generate-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return response.json();
  }

  async verifyOTP(email, otp) {
    const response = await fetch(`${API_BASE_URL}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp })
    });
    return response.json();
  }

  async getDashboardData(sessionToken) {
    const response = await fetch(`${API_BASE_URL}/get-dashboard`, {
      headers: { 'Authorization': `Bearer ${sessionToken}` }
    });
    return response.json();
  }
}

export default new ApiClient();
```

#### Step 4.3: Create Static Web App Configuration

Create `azure/web/staticwebapp.config.json`:

```json
{
  "routes": [
    {
      "route": "/api/*",
      "allowedRoles": ["anonymous"]
    },
    {
      "route": "/*",
      "serve": "/index.html",
      "statusCode": 200
    }
  ],
  "navigationFallback": {
    "rewrite": "/index.html"
  },
  "responseOverrides": {
    "404": {
      "rewrite": "/index.html",
      "statusCode": 200
    }
  },
  "globalHeaders": {
    "content-security-policy": "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
  }
}
```

### Phase 5: Local Testing (1-2 hours)

#### Step 5.1: Configure Local Settings

Create `azure/local.settings.json`:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AZURE_COSMOS_ENDPOINT": "your-local-or-dev-cosmos-endpoint",
    "AZURE_COSMOS_KEY": "your-cosmos-key",
    "AZURE_REDIS_CONNECTION_STRING": "localhost:6379",
    "ADMIN_EMAIL": "amit3ree@gmail.com",
    "GEMINI_API_KEY": "your-gemini-key"
  },
  "Host": {
    "CORS": "*",
    "CORSCredentials": false
  }
}
```

#### Step 5.2: Run Locally

```bash
# Start Azure Functions locally
cd azure/functions
func start

# In another terminal, serve frontend (if testing locally)
cd azure/web
npx http-server src -p 8080
```

#### Step 5.3: Test Webhook

```bash
# Test webhook with curl
curl -X POST http://localhost:7071/api/webhook-handler \
  -H "Content-Type: application/json" \
  -d '{
    "scrip": "RELIANCE",
    "reason": "Volume Surge",
    "timestamp": "2025-01-15T10:30:00"
  }'
```

### Phase 6: Deployment to Azure (1-2 hours)

#### Step 6.1: Configure Application Settings

```bash
# Set environment variables in Function App
az functionapp config appsettings set \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    "AZURE_COSMOS_ENDPOINT=$(az cosmosdb show --name $COSMOS_ACCOUNT --resource-group $RESOURCE_GROUP --query documentEndpoint -o tsv)" \
    "AZURE_COSMOS_KEY=$(az cosmosdb keys list --name $COSMOS_ACCOUNT --resource-group $RESOURCE_GROUP --query primaryMasterKey -o tsv)" \
    "AZURE_REDIS_CONNECTION_STRING=$(az redis list-keys --name $REDIS_NAME --resource-group $RESOURCE_GROUP --query primaryKey -o tsv)" \
    "ADMIN_EMAIL=amit3ree@gmail.com" \
    "GEMINI_API_KEY=your-gemini-key"
```

#### Step 6.2: Deploy Functions

```bash
cd azure/functions

# Deploy to Azure
func azure functionapp publish $FUNCTION_APP_NAME
```

#### Step 6.3: Deploy Static Web App

```bash
# Create Static Web App
az staticwebapp create \
  --name maurvi-signals-web \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --source azure/web/src \
  --branch main \
  --app-location "/" \
  --api-location "" \
  --output-location "src"

# Or deploy manually
cd azure/web
az staticwebapp deploy \
  --name maurvi-signals-web \
  --resource-group $RESOURCE_GROUP \
  --source ./src
```

#### Step 6.4: Configure Custom Domain (Optional)

```bash
# Add custom domain to Static Web App
az staticwebapp hostname set \
  --name maurvi-signals-web \
  --resource-group $RESOURCE_GROUP \
  --hostname signals.yourdomain.com
```

### Phase 7: Post-Deployment Configuration (30 minutes)

#### Step 7.1: Update TradingView Webhook URL

Replace the Google Apps Script webhook URL with:
```
https://func-maurvi-signals.azurewebsites.net/api/webhook-handler
```

#### Step 7.2: Set Up Monitoring

```bash
# Enable Application Insights for Function App
az monitor app-insights component connect-webapp \
  --app maurvi-signals-insights \
  --resource-group $RESOURCE_GROUP \
  --web-app $FUNCTION_APP_NAME
```

#### Step 7.3: Configure Alerts

```bash
# Create alert for function failures
az monitor metrics alert create \
  --name "Function Failures" \
  --resource-group $RESOURCE_GROUP \
  --scopes "/subscriptions/{subscription-id}/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/$FUNCTION_APP_NAME" \
  --condition "count http5xx > 10" \
  --window-size 5m \
  --evaluation-frequency 1m
```

### Phase 8: Data Migration (1-2 hours)

#### Step 8.1: Export Data from Google Sheets

Create migration script `azure/scripts/migrate-data.js`:

```javascript
const { google } = require('googleapis');
const cosmosService = require('../shared/database/cosmos-client');

async function migrateHistoricalData() {
  // Authenticate with Google Sheets API
  const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = 'YOUR_SHEET_ID';
  
  // Get list of sheets
  const response = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetList = response.data.sheets;
  
  for (const sheet of sheetList) {
    const sheetName = sheet.properties.title;
    
    // Only migrate Indicator1 and Indicator2 sheets
    if (!sheetName.startsWith('Indicator1_') && !sheetName.startsWith('Indicator2_')) {
      continue;
    }
    
    console.log(`Migrating sheet: ${sheetName}`);
    
    // Read sheet data
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: sheetName
    });
    
    const rows = dataResponse.data.values;
    if (!rows || rows.length === 0) continue;
    
    // Parse and migrate data
    // Implementation details...
  }
}

migrateHistoricalData().catch(console.error);
```

Run migration:
```bash
cd azure/scripts
node migrate-data.js
```

---

## Cost Estimation

### Azure Resources (Monthly Estimates)

| Resource | Tier | Estimated Cost |
|----------|------|----------------|
| Azure Functions | Consumption Plan | $0-20 (first 1M executions free) |
| Azure Cosmos DB | Serverless | $1-50 (depends on operations) |
| Azure Redis Cache | Basic C0 | ~$16 |
| Azure Static Web Apps | Free | $0 |
| Application Insights | Basic | $0-10 (first 5GB free) |
| Azure Communication Services | Pay-as-you-go | ~$0.50 per 1000 emails |
| **Total Estimated** | | **$20-100/month** |

### Cost Optimization Tips

1. **Use Serverless**: Cosmos DB Serverless and Function Consumption plans scale to zero
2. **Free Tiers**: Many services have free tiers suitable for development
3. **Data Retention**: 14-day retention reduces storage costs
4. **Caching**: Redis reduces database reads
5. **Static Hosting**: Static Web Apps free tier is generous

---

## Advantages of Azure Migration

### Technical Benefits
1. **Scalability**: Auto-scaling to handle traffic spikes
2. **Reliability**: 99.95% SLA with Azure Functions
3. **Performance**: Global CDN for frontend, regional deployment
4. **Security**: Managed identities, Key Vault integration, built-in DDoS protection
5. **Monitoring**: Application Insights provides deep telemetry
6. **DevOps**: CI/CD integration with GitHub Actions or Azure DevOps

### Operational Benefits
1. **No Quota Limits**: Unlike Apps Script's 6-minute execution limit
2. **Better Debugging**: Full stack traces and logging
3. **API Management**: Add rate limiting, throttling, API versioning
4. **Multi-Region**: Deploy to multiple regions for global availability
5. **Professional Grade**: Enterprise-ready infrastructure

### Development Benefits
1. **Modern Tooling**: VS Code, debugging, testing frameworks
2. **Version Control**: Proper Git workflow
3. **Package Management**: npm ecosystem
4. **Testing**: Unit and integration tests
5. **Type Safety**: Optional TypeScript migration

---

## Migration Checklist

### Pre-Migration
- [ ] Review current Apps Script functionality
- [ ] Document all API endpoints and their contracts
- [ ] Export historical data from Google Sheets
- [ ] Set up Azure account and subscription
- [ ] Install required tools (Azure CLI, Functions Core Tools)

### Infrastructure Setup
- [ ] Create resource group
- [ ] Create Function App
- [ ] Create Cosmos DB or Table Storage
- [ ] Create Redis Cache
- [ ] Create Application Insights
- [ ] Create Key Vault
- [ ] Set up SendGrid or Azure Communication Services

### Code Migration
- [ ] Initialize Azure Functions project
- [ ] Create shared modules (database, cache, auth)
- [ ] Migrate webhook handler
- [ ] Migrate authentication endpoints
- [ ] Migrate data retrieval endpoints
- [ ] Migrate AI integration
- [ ] Migrate daily maintenance function
- [ ] Refactor frontend code
- [ ] Update API endpoint URLs

### Testing
- [ ] Test webhook locally
- [ ] Test authentication flow
- [ ] Test dashboard data retrieval
- [ ] Test AI features
- [ ] Test daily maintenance
- [ ] Load testing (optional)

### Deployment
- [ ] Configure environment variables
- [ ] Deploy Functions to Azure
- [ ] Deploy Static Web App
- [ ] Update TradingView webhook URL
- [ ] Configure custom domain (optional)
- [ ] Set up monitoring and alerts
- [ ] Migrate historical data

### Post-Deployment
- [ ] Verify webhook processing
- [ ] Test end-to-end user flow
- [ ] Monitor logs and metrics
- [ ] Update documentation
- [ ] Train users on any changes
- [ ] Keep Apps Script version as backup initially

---

## Rollback Plan

In case of issues with Azure deployment:

1. **Keep Apps Script Running**: Don't disable until Azure is fully validated
2. **Dual Webhooks**: TradingView can send to both URLs during transition
3. **Data Sync**: Keep both systems in sync for 1-2 weeks
4. **Quick Rollback**: Update TradingView to point back to Apps Script URL
5. **Documentation**: Keep both deployment guides updated

---

## Next Steps

### Immediate Actions
1. Review this migration plan with stakeholders
2. Set up Azure account if not already available
3. Estimate budget and get approval
4. Schedule migration window (recommend weekend or low-traffic period)

### Phase 1 - Proof of Concept (1 week)
1. Set up basic Azure resources
2. Migrate webhook handler only
3. Test with TradingView alerts
4. Validate data storage

### Phase 2 - Full Migration (2-3 weeks)
1. Migrate all functions
2. Migrate frontend
3. Comprehensive testing
4. Deploy to production

### Phase 3 - Stabilization (1 week)
1. Monitor for issues
2. Optimize performance
3. Fine-tune costs
4. Update documentation

---

## Support and Resources

### Azure Documentation
- [Azure Functions Docs](https://docs.microsoft.com/azure/azure-functions/)
- [Cosmos DB Docs](https://docs.microsoft.com/azure/cosmos-db/)
- [Static Web Apps Docs](https://docs.microsoft.com/azure/static-web-apps/)

### Learning Resources
- [Azure Functions on Microsoft Learn](https://docs.microsoft.com/learn/azure/)
- [Serverless on Azure](https://azure.microsoft.com/solutions/serverless/)

### Community
- [Azure Functions GitHub](https://github.com/Azure/azure-functions)
- [Stack Overflow - Azure Functions Tag](https://stackoverflow.com/questions/tagged/azure-functions)

---

## Conclusion

This migration plan provides a structured approach to refactoring the Google Apps Script application for Azure deployment. The phased approach allows for incremental progress, testing at each stage, and minimizes risk.

The recommended folder structure separates concerns, making the codebase maintainable and scalable. Azure services provide enterprise-grade reliability, security, and performance that will support the application's growth.

**Estimated Total Migration Time**: 15-25 hours of development work over 2-4 weeks

**Key Success Factors**:
- Thorough testing at each phase
- Keeping Apps Script running as backup initially
- Monitoring closely after deployment
- Iterative optimization based on real usage

For questions or clarification on any section, please refer to the detailed Azure documentation or reach out for support.
