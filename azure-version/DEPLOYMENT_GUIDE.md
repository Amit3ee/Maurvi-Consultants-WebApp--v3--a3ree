# Azure Deployment Guide

This guide provides step-by-step instructions for deploying the Maurvi Consultants Trading Signals Web App to Microsoft Azure.

## Prerequisites

### Required Tools
- [ ] Azure CLI (v2.50+)
- [ ] Node.js (v18+ LTS)
- [ ] npm or yarn
- [ ] Git
- [ ] Visual Studio Code (recommended) with Azure extensions

### Required Accounts
- [ ] Microsoft Azure subscription (with Owner/Contributor access)
- [ ] SendGrid account OR Azure Communication Services
- [ ] Gemini API key (for AI features)

### Azure Extensions for VS Code (Recommended)
- Azure Account
- Azure Functions
- Azure Resources
- Azure Static Web Apps

## Part 1: Azure Infrastructure Setup

### Step 1: Create Azure Resource Group

```bash
# Login to Azure
az login

# Set your subscription
az account set --subscription "YOUR_SUBSCRIPTION_ID"

# Create resource group
az group create \
  --name rg-maurvi-signals \
  --location eastus

# Verify creation
az group show --name rg-maurvi-signals
```

### Step 2: Create Azure Cosmos DB Account

```bash
# Create Cosmos DB account (serverless mode for cost efficiency)
az cosmosdb create \
  --name cosmos-maurvi-signals \
  --resource-group rg-maurvi-signals \
  --locations regionName=eastus failoverPriority=0 \
  --capabilities EnableServerless \
  --default-consistency-level Session

# Create database
az cosmosdb sql database create \
  --account-name cosmos-maurvi-signals \
  --resource-group rg-maurvi-signals \
  --name trading-signals

# Create containers
az cosmosdb sql container create \
  --account-name cosmos-maurvi-signals \
  --database-name trading-signals \
  --resource-group rg-maurvi-signals \
  --name signals \
  --partition-key-path "/partitionKey"

az cosmosdb sql container create \
  --account-name cosmos-maurvi-signals \
  --database-name trading-signals \
  --resource-group rg-maurvi-signals \
  --name indicator2-logs \
  --partition-key-path "/partitionKey"

az cosmosdb sql container create \
  --account-name cosmos-maurvi-signals \
  --database-name trading-signals \
  --resource-group rg-maurvi-signals \
  --name users \
  --partition-key-path "/partitionKey"

# Get connection string (save this!)
az cosmosdb keys list \
  --name cosmos-maurvi-signals \
  --resource-group rg-maurvi-signals \
  --type connection-strings \
  --query "connectionStrings[0].connectionString" \
  --output tsv
```

### Step 3: Create Azure Redis Cache

```bash
# Create Redis Cache (Basic C0 for dev, Standard C1+ for production)
az redis create \
  --name redis-maurvi-signals \
  --resource-group rg-maurvi-signals \
  --location eastus \
  --sku Basic \
  --vm-size C0

# Get connection string (save this!)
az redis list-keys \
  --name redis-maurvi-signals \
  --resource-group rg-maurvi-signals \
  --query "primaryKey" \
  --output tsv

# Get host name
az redis show \
  --name redis-maurvi-signals \
  --resource-group rg-maurvi-signals \
  --query "hostName" \
  --output tsv
```

### Step 4: Create Azure Storage Account (for Functions)

```bash
# Create storage account
az storage account create \
  --name stmaurvisignals \
  --resource-group rg-maurvi-signals \
  --location eastus \
  --sku Standard_LRS

# Get connection string (save this!)
az storage account show-connection-string \
  --name stmaurvisignals \
  --resource-group rg-maurvi-signals \
  --query "connectionString" \
  --output tsv
```

### Step 5: Create Azure Key Vault

```bash
# Create Key Vault
az keyvault create \
  --name kv-maurvi-signals \
  --resource-group rg-maurvi-signals \
  --location eastus

# Add secrets
az keyvault secret set \
  --vault-name kv-maurvi-signals \
  --name CosmosDbConnectionString \
  --value "YOUR_COSMOS_CONNECTION_STRING"

az keyvault secret set \
  --vault-name kv-maurvi-signals \
  --name RedisConnectionString \
  --value "YOUR_REDIS_CONNECTION_STRING"

az keyvault secret set \
  --vault-name kv-maurvi-signals \
  --name GeminiApiKey \
  --value "YOUR_GEMINI_API_KEY"

az keyvault secret set \
  --vault-name kv-maurvi-signals \
  --name SendGridApiKey \
  --value "YOUR_SENDGRID_API_KEY"

az keyvault secret set \
  --vault-name kv-maurvi-signals \
  --name AdminEmail \
  --value "your-admin@email.com"
```

### Step 6: Create Azure Function App

```bash
# Create Function App (Consumption plan for dev)
az functionapp create \
  --name func-maurvi-signals \
  --resource-group rg-maurvi-signals \
  --consumption-plan-location eastus \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4 \
  --storage-account stmaurvisignals

# Enable managed identity
az functionapp identity assign \
  --name func-maurvi-signals \
  --resource-group rg-maurvi-signals

# Grant Key Vault access to Function App
FUNCTION_PRINCIPAL_ID=$(az functionapp identity show \
  --name func-maurvi-signals \
  --resource-group rg-maurvi-signals \
  --query "principalId" \
  --output tsv)

az keyvault set-policy \
  --name kv-maurvi-signals \
  --object-id $FUNCTION_PRINCIPAL_ID \
  --secret-permissions get list

# Configure CORS for Function App
az functionapp cors add \
  --name func-maurvi-signals \
  --resource-group rg-maurvi-signals \
  --allowed-origins "*"
```

### Step 7: Create Azure Static Web App

```bash
# Create Static Web App (requires GitHub repo)
az staticwebapp create \
  --name swa-maurvi-signals \
  --resource-group rg-maurvi-signals \
  --location eastus2 \
  --sku Free

# Get deployment token (save this for GitHub Actions)
az staticwebapp secrets list \
  --name swa-maurvi-signals \
  --resource-group rg-maurvi-signals \
  --query "properties.apiKey" \
  --output tsv
```

## Part 2: Local Development Setup

### Step 1: Clone and Setup Project

```bash
# Clone repository
git clone <YOUR_REPO_URL>
cd Maurvi-Consultants-WebApp--v3--a3ree/azure-version

# Install dependencies
npm install

# Create local settings file
cp local.settings.json.template local.settings.json
```

### Step 2: Configure Local Settings

Edit `local.settings.json`:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "YOUR_STORAGE_CONNECTION_STRING",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "CosmosDbConnectionString": "YOUR_COSMOS_CONNECTION_STRING",
    "CosmosDbDatabaseName": "trading-signals",
    "RedisConnectionString": "YOUR_REDIS_CONNECTION_STRING",
    "SendGridApiKey": "YOUR_SENDGRID_API_KEY",
    "AdminEmail": "your-admin@email.com",
    "GeminiApiKey": "YOUR_GEMINI_API_KEY",
    "SessionValidityHours": "24",
    "OtpValidityMinutes": "3"
  },
  "Host": {
    "CORS": "*",
    "CORSCredentials": false
  }
}
```

### Step 3: Test Functions Locally

```bash
# Start Azure Functions Core Tools
npm run start

# Test webhook endpoint
curl -X POST http://localhost:7071/api/webhook-handler \
  -H "Content-Type: application/json" \
  -d '{"scrip":"RELIANCE","timestamp":"2025-01-15T09:20:05","reason":"Volume Surge"}'

# Test OTP generation
curl -X POST http://localhost:7071/api/auth-generate-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"your-admin@email.com"}'
```

## Part 3: Deploy to Azure

### Step 1: Deploy Azure Functions

```bash
# Build the project
npm run build

# Deploy to Azure
az functionapp deployment source config-zip \
  --name func-maurvi-signals \
  --resource-group rg-maurvi-signals \
  --src ./dist.zip

# Alternative: Using VS Code Azure Functions extension
# 1. Right-click on Functions folder
# 2. Select "Deploy to Function App"
# 3. Choose func-maurvi-signals
```

### Step 2: Configure Function App Settings

```bash
# Set environment variables
az functionapp config appsettings set \
  --name func-maurvi-signals \
  --resource-group rg-maurvi-signals \
  --settings \
    "CosmosDbConnectionString=@Microsoft.KeyVault(VaultName=kv-maurvi-signals;SecretName=CosmosDbConnectionString)" \
    "RedisConnectionString=@Microsoft.KeyVault(VaultName=kv-maurvi-signals;SecretName=RedisConnectionString)" \
    "SendGridApiKey=@Microsoft.KeyVault(VaultName=kv-maurvi-signals;SecretName=SendGridApiKey)" \
    "GeminiApiKey=@Microsoft.KeyVault(VaultName=kv-maurvi-signals;SecretName=GeminiApiKey)" \
    "AdminEmail=@Microsoft.KeyVault(VaultName=kv-maurvi-signals;SecretName=AdminEmail)" \
    "CosmosDbDatabaseName=trading-signals" \
    "SessionValidityHours=24" \
    "OtpValidityMinutes=3"
```

### Step 3: Deploy Frontend to Static Web App

```bash
# Update frontend API endpoints in index.html
# Change API base URL to: https://func-maurvi-signals.azurewebsites.net/api

# Deploy using Azure CLI
cd frontend
az staticwebapp deploy \
  --name swa-maurvi-signals \
  --resource-group rg-maurvi-signals \
  --app-location . \
  --api-location ../functions

# Alternative: Configure GitHub Actions (recommended)
# 1. Add deployment token to GitHub secrets as AZURE_STATIC_WEB_APPS_API_TOKEN
# 2. GitHub Actions will auto-deploy on push
```

### Step 4: Configure Custom Domain (Optional)

```bash
# For Static Web App
az staticwebapp hostname set \
  --name swa-maurvi-signals \
  --resource-group rg-maurvi-signals \
  --hostname "signals.yourdomain.com"

# Add CNAME record in your DNS:
# signals.yourdomain.com -> swa-maurvi-signals.azurestaticapps.net

# For Function App (if exposing directly)
az functionapp config hostname add \
  --webapp-name func-maurvi-signals \
  --resource-group rg-maurvi-signals \
  --hostname "api.signals.yourdomain.com"
```

## Part 4: Configure External Services

### Step 1: Update TradingView Webhooks

Replace Google Apps Script webhook URL with Azure Functions URL:

**Old URL:**
```
https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

**New URL:**
```
https://func-maurvi-signals.azurewebsites.net/api/webhook-handler
```

Update all TradingView alerts to use the new webhook URL.

### Step 2: Configure SendGrid (if using)

```bash
# Verify sender email in SendGrid dashboard
# Get API key from SendGrid → Settings → API Keys
# Already added to Key Vault in Step 5 above
```

### Step 3: Test Email Delivery

```bash
# Test OTP email
curl -X POST https://func-maurvi-signals.azurewebsites.net/api/auth-generate-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"your-admin@email.com"}'

# Check your inbox for OTP email
```

## Part 5: Monitoring and Alerts

### Step 1: Enable Application Insights

```bash
# Create Application Insights
az monitor app-insights component create \
  --app insights-maurvi-signals \
  --location eastus \
  --resource-group rg-maurvi-signals \
  --application-type web

# Get instrumentation key
INSTRUMENTATION_KEY=$(az monitor app-insights component show \
  --app insights-maurvi-signals \
  --resource-group rg-maurvi-signals \
  --query "instrumentationKey" \
  --output tsv)

# Configure Function App to use Application Insights
az functionapp config appsettings set \
  --name func-maurvi-signals \
  --resource-group rg-maurvi-signals \
  --settings "APPINSIGHTS_INSTRUMENTATIONKEY=$INSTRUMENTATION_KEY"
```

### Step 2: Configure Alerts

```bash
# Create alert for Function errors
az monitor metrics alert create \
  --name alert-function-errors \
  --resource-group rg-maurvi-signals \
  --scopes "/subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/rg-maurvi-signals/providers/Microsoft.Web/sites/func-maurvi-signals" \
  --condition "count Http5xx > 5" \
  --window-size 5m \
  --evaluation-frequency 1m

# Create alert for high Cosmos DB RU consumption
az monitor metrics alert create \
  --name alert-cosmos-high-ru \
  --resource-group rg-maurvi-signals \
  --scopes "/subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/rg-maurvi-signals/providers/Microsoft.DocumentDB/databaseAccounts/cosmos-maurvi-signals" \
  --condition "avg TotalRequestUnits > 1000" \
  --window-size 5m \
  --evaluation-frequency 1m
```

## Part 6: Data Migration

### Step 1: Export Data from Google Sheets

```javascript
// Run in Google Apps Script
function exportAllData() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const allSheets = ss.getSheets();
  const exportData = {};
  
  allSheets.forEach(sheet => {
    const name = sheet.getName();
    const data = sheet.getDataRange().getValues();
    exportData[name] = data;
  });
  
  Logger.log(JSON.stringify(exportData));
}
```

### Step 2: Transform and Import to Cosmos DB

```bash
# Use the migration script
node scripts/migrate-data.js \
  --input ./exported-data.json \
  --cosmos-connection "$COSMOS_CONNECTION_STRING" \
  --database trading-signals
```

## Part 7: Post-Deployment Verification

### Step 1: Verify All Endpoints

```bash
# Test webhook
curl -X POST https://func-maurvi-signals.azurewebsites.net/api/webhook-handler \
  -H "Content-Type: application/json" \
  -d '{"scrip":"TEST","timestamp":"2025-01-15T12:00:00","reason":"Test Signal"}'

# Test dashboard data
curl https://func-maurvi-signals.azurewebsites.net/api/get-dashboard-data

# Test frontend
curl https://swa-maurvi-signals.azurestaticapps.net/
```

### Step 2: Monitor Logs

```bash
# View Function logs
az functionapp log tail \
  --name func-maurvi-signals \
  --resource-group rg-maurvi-signals

# View Application Insights
# Navigate to Azure Portal → Application Insights → Live Metrics
```

### Step 3: Performance Testing

```bash
# Install artillery for load testing
npm install -g artillery

# Create load test config (test-webhook.yml):
config:
  target: "https://func-maurvi-signals.azurewebsites.net"
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - flow:
      - post:
          url: "/api/webhook-handler"
          json:
            scrip: "RELIANCE"
            timestamp: "2025-01-15T12:00:00"
            reason: "Volume Surge"

# Run load test
artillery run test-webhook.yml
```

## Troubleshooting

### Common Issues

**Issue: Function returns 500 error**
```bash
# Check logs
az functionapp log tail --name func-maurvi-signals --resource-group rg-maurvi-signals

# Check Key Vault access
az keyvault show --name kv-maurvi-signals
```

**Issue: Cosmos DB connection fails**
```bash
# Verify firewall rules
az cosmosdb show --name cosmos-maurvi-signals --resource-group rg-maurvi-signals

# Allow Azure services
az cosmosdb update \
  --name cosmos-maurvi-signals \
  --resource-group rg-maurvi-signals \
  --enable-public-network true
```

**Issue: Redis connection timeout**
```bash
# Check Redis status
az redis show --name redis-maurvi-signals --resource-group rg-maurvi-signals

# Verify connection string format
# Should be: redis-maurvi-signals.redis.cache.windows.net:6380,password=KEY,ssl=True
```

## Rollback Plan

If issues occur after deployment:

1. **Immediate rollback:**
   ```bash
   # Revert to previous deployment slot
   az functionapp deployment slot swap \
     --name func-maurvi-signals \
     --resource-group rg-maurvi-signals \
     --slot staging
   ```

2. **Revert webhook URLs in TradingView back to Google Apps Script**

3. **Restore Google Sheets data if needed**

## Cost Monitoring

```bash
# Check current month's costs
az consumption usage list \
  --start-date "2025-01-01" \
  --end-date "2025-01-31" \
  --query "[?contains(instanceName, 'maurvi')].{Service:consumedService, Cost:pretaxCost}"

# Set budget alert
az consumption budget create \
  --resource-group rg-maurvi-signals \
  --budget-name maurvi-signals-budget \
  --amount 500 \
  --time-grain monthly \
  --start-date 2025-01-01 \
  --end-date 2025-12-31
```

## Maintenance

### Regular Tasks

1. **Weekly:**
   - Review Application Insights logs
   - Check for anomalies in signal processing
   - Verify email delivery success rate

2. **Monthly:**
   - Review cost reports
   - Update dependencies (`npm update`)
   - Review and purge old data (>14 days)

3. **Quarterly:**
   - Security audit
   - Performance optimization review
   - Backup configuration and code

---

**Support:** For issues, contact the development team  
**Last Updated:** January 2025
