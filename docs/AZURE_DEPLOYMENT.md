# Azure Deployment Guide

This guide provides step-by-step instructions for deploying the Trading Signals Web App to Microsoft Azure.

> **Note**: This is a companion to [AZURE_MIGRATION_PLAN.md](../AZURE_MIGRATION_PLAN.md), which includes the complete migration strategy and code examples.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Azure Resource Setup](#azure-resource-setup)
3. [Local Development Setup](#local-development-setup)
4. [Function Deployment](#function-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [Configuration](#configuration)
7. [Testing](#testing)
8. [Monitoring](#monitoring)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

Install the following before beginning:

```bash
# Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Azure Functions Core Tools (v4)
npm install -g azure-functions-core-tools@4 --unsafe-perm true

# Node.js (v18 LTS or v20 LTS)
# Download from: https://nodejs.org/

# Git
sudo apt-get install git  # On Ubuntu/Debian
```

### Azure Account

- Active Azure subscription ([sign up for free](https://azure.microsoft.com/free/))
- Owner or Contributor role on subscription

### Verify Installation

```bash
az --version
func --version
node --version
npm --version
```

---

## Azure Resource Setup

### 1. Login to Azure

```bash
az login
az account list --output table
az account set --subscription "YOUR_SUBSCRIPTION_NAME"
```

### 2. Set Variables

```bash
# Configure these variables
export RESOURCE_GROUP="rg-maurvi-trading-signals"
export LOCATION="eastus"  # or westus2, westeurope, etc.
export FUNCTION_APP_NAME="func-maurvi-signals-$(whoami)"  # Must be globally unique
export STORAGE_ACCOUNT="stmaurvifunc$(whoami)"  # 3-24 lowercase alphanumeric
export COSMOS_ACCOUNT="cosmos-maurvi-signals-$(whoami)"
export REDIS_NAME="redis-maurvi-$(whoami)"
export STATIC_WEB_APP="web-maurvi-signals"
```

### 3. Create Resource Group

```bash
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION
```

### 4. Create Storage Account

```bash
az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2
```

### 5. Create Function App

```bash
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

### 6. Create Cosmos DB (Option A - Recommended)

```bash
# Create Cosmos DB account with serverless
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

az cosmosdb sql container create \
  --account-name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --database-name TradingSignals \
  --name DebugLogs \
  --partition-key-path "/date" \
  --throughput 400
```

### 7. Create Redis Cache

```bash
az redis create \
  --name $REDIS_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Basic \
  --vm-size c0
```

### 8. Create Application Insights

```bash
az monitor app-insights component create \
  --app maurvi-signals-insights \
  --location $LOCATION \
  --resource-group $RESOURCE_GROUP \
  --application-type web
```

### 9. Create Key Vault (Optional, for production)

```bash
az keyvault create \
  --name kv-maurvi-signals \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION
```

---

## Local Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/Amit3ee/Maurvi-Consultants-WebApp--v3--a3ree.git
cd Maurvi-Consultants-WebApp--v3--a3ree/azure
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Local Settings

```bash
cp local.settings.json.example local.settings.json
```

Edit `local.settings.json` with your configuration:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    
    "AZURE_COSMOS_ENDPOINT": "https://your-cosmos.documents.azure.com:443/",
    "AZURE_COSMOS_KEY": "your-cosmos-key",
    "AZURE_REDIS_CONNECTION_STRING": "localhost:6379",
    
    "ADMIN_EMAIL": "amit3ree@gmail.com",
    "GEMINI_API_KEY": "your-gemini-key"
  }
}
```

To get Cosmos DB connection details:
```bash
az cosmosdb show --name $COSMOS_ACCOUNT --resource-group $RESOURCE_GROUP --query documentEndpoint -o tsv
az cosmosdb keys list --name $COSMOS_ACCOUNT --resource-group $RESOURCE_GROUP --query primaryMasterKey -o tsv
```

### 4. Start Local Functions

```bash
cd functions
func start
```

Functions will be available at `http://localhost:7071/api/`

---

## Function Deployment

### 1. Configure Application Settings

```bash
# Get connection strings
COSMOS_ENDPOINT=$(az cosmosdb show --name $COSMOS_ACCOUNT --resource-group $RESOURCE_GROUP --query documentEndpoint -o tsv)
COSMOS_KEY=$(az cosmosdb keys list --name $COSMOS_ACCOUNT --resource-group $RESOURCE_GROUP --query primaryMasterKey -o tsv)
REDIS_KEY=$(az redis list-keys --name $REDIS_NAME --resource-group $RESOURCE_GROUP --query primaryKey -o tsv)
APPINSIGHTS_KEY=$(az monitor app-insights component show --app maurvi-signals-insights --resource-group $RESOURCE_GROUP --query instrumentationKey -o tsv)

# Set application settings
az functionapp config appsettings set \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    "AZURE_COSMOS_ENDPOINT=$COSMOS_ENDPOINT" \
    "AZURE_COSMOS_KEY=$COSMOS_KEY" \
    "AZURE_REDIS_CONNECTION_STRING=${REDIS_NAME}.redis.cache.windows.net:6380,password=${REDIS_KEY},ssl=True" \
    "APPINSIGHTS_INSTRUMENTATIONKEY=$APPINSIGHTS_KEY" \
    "ADMIN_EMAIL=amit3ree@gmail.com" \
    "OTP_VALIDITY_MINUTES=3" \
    "SESSION_VALIDITY_HOURS=24" \
    "DATA_RETENTION_DAYS=14" \
    "GEMINI_API_KEY=your-gemini-key-here"
```

### 2. Deploy Functions

```bash
cd azure/functions
func azure functionapp publish $FUNCTION_APP_NAME
```

### 3. Verify Deployment

```bash
# List deployed functions
az functionapp function list --name $FUNCTION_APP_NAME --resource-group $RESOURCE_GROUP --output table

# Get function URL
WEBHOOK_URL=$(az functionapp function show \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --function-name webhook-handler \
  --query invokeUrlTemplate -o tsv)

echo "Webhook URL: $WEBHOOK_URL"
```

---

## Frontend Deployment

### Option 1: Azure Static Web Apps (Recommended)

```bash
# Create Static Web App
az staticwebapp create \
  --name $STATIC_WEB_APP \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --source azure/web/src \
  --branch main \
  --app-location "/" \
  --output-location "src"

# Get the Static Web App URL
az staticwebapp show \
  --name $STATIC_WEB_APP \
  --resource-group $RESOURCE_GROUP \
  --query defaultHostname -o tsv
```

### Option 2: Azure Storage Static Website

```bash
# Enable static website hosting
az storage blob service-properties update \
  --account-name $STORAGE_ACCOUNT \
  --static-website \
  --index-document index.html

# Upload files
az storage blob upload-batch \
  --account-name $STORAGE_ACCOUNT \
  --destination '$web' \
  --source azure/web/src

# Get the website URL
az storage account show \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --query primaryEndpoints.web -o tsv
```

---

## Configuration

### Update Frontend API Endpoint

Edit `azure/web/src/js/api-client.js`:

```javascript
const API_BASE_URL = 'https://func-maurvi-signals-yourusername.azurewebsites.net/api';
```

### Configure TradingView Webhook

1. Go to your TradingView alerts
2. Update webhook URL to: `https://func-maurvi-signals-yourusername.azurewebsites.net/api/webhook-handler`
3. Keep the same JSON payload format

### Configure Email Service

**Option A: SendGrid**
```bash
az functionapp config appsettings set \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    "SENDGRID_API_KEY=your-sendgrid-key" \
    "SENDER_EMAIL=noreply@yourdomain.com"
```

**Option B: Azure Communication Services**
```bash
# Create ACS resource
az communication create \
  --name acs-maurvi-signals \
  --resource-group $RESOURCE_GROUP \
  --location global \
  --data-location UnitedStates

# Get connection string
ACS_CONNECTION=$(az communication list-key \
  --name acs-maurvi-signals \
  --resource-group $RESOURCE_GROUP \
  --query primaryConnectionString -o tsv)

az functionapp config appsettings set \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings "ACS_CONNECTION_STRING=$ACS_CONNECTION"
```

---

## Testing

### Test Webhook Endpoint

```bash
curl -X POST https://$FUNCTION_APP_NAME.azurewebsites.net/api/webhook-handler \
  -H "Content-Type: application/json" \
  -d '{
    "scrip": "RELIANCE",
    "reason": "Volume Surge",
    "timestamp": "2025-01-15T10:30:00"
  }'
```

Expected response:
```json
{
  "status": "success",
  "indicator": "Indicator1",
  "symbol": "RELIANCE",
  "time": "10:30:15"
}
```

### Test Authentication

```bash
# Generate OTP
curl -X POST https://$FUNCTION_APP_NAME.azurewebsites.net/api/generate-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "amit3ree@gmail.com"}'

# Verify OTP (replace with actual OTP from email)
curl -X POST https://$FUNCTION_APP_NAME.azurewebsites.net/api/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "amit3ree@gmail.com", "otp": "123456"}'
```

### Test Frontend

Visit your Static Web App URL and test:
1. Login with OTP
2. View dashboard
3. Check live feed
4. Test historical data
5. Try AI analysis

---

## Monitoring

### View Logs

```bash
# Stream logs in real-time
az webapp log tail \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP

# View logs in Application Insights
az monitor app-insights query \
  --app maurvi-signals-insights \
  --resource-group $RESOURCE_GROUP \
  --analytics-query "traces | where timestamp > ago(1h) | limit 50"
```

### Set Up Alerts

```bash
# Alert for function failures
az monitor metrics alert create \
  --name "Function Failures Alert" \
  --resource-group $RESOURCE_GROUP \
  --scopes "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/$FUNCTION_APP_NAME" \
  --condition "count http5xx > 10" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action email amit3ree@gmail.com

# Alert for high latency
az monitor metrics alert create \
  --name "High Latency Alert" \
  --resource-group $RESOURCE_GROUP \
  --scopes "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/$FUNCTION_APP_NAME" \
  --condition "avg HttpResponseTime > 5000" \
  --window-size 5m \
  --evaluation-frequency 1m
```

---

## Troubleshooting

### Common Issues

#### 1. Functions Not Appearing After Deployment

**Solution**: Check the deployment logs
```bash
az functionapp deployment list --name $FUNCTION_APP_NAME --resource-group $RESOURCE_GROUP
```

#### 2. Connection Refused to Redis

**Solution**: Verify Redis cache is running and firewall rules allow Functions
```bash
az redis show --name $REDIS_NAME --resource-group $RESOURCE_GROUP --query provisioningState
az redis firewall-rules create \
  --name AllowAzure \
  --resource-group $RESOURCE_GROUP \
  --redis-name $REDIS_NAME \
  --start-ip 0.0.0.0 \
  --end-ip 0.0.0.0
```

#### 3. Cosmos DB Throttling (429 Errors)

**Solution**: Increase throughput or switch to autoscale
```bash
az cosmosdb sql container throughput update \
  --account-name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --database-name TradingSignals \
  --name Signals \
  --throughput 1000
```

#### 4. CORS Errors in Frontend

**Solution**: Enable CORS for Function App
```bash
az functionapp cors add \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --allowed-origins "https://your-static-web-app-url.azurestaticapps.net"
```

### Check Function Health

```bash
# Get function status
az functionapp show \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query state

# Restart function app if needed
az functionapp restart \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP
```

---

## Cost Management

### View Current Costs

```bash
az consumption usage list \
  --resource-group $RESOURCE_GROUP \
  --start-date $(date -d '7 days ago' +%Y-%m-%d) \
  --end-date $(date +%Y-%m-%d)
```

### Set Budget Alert

```bash
az consumption budget create \
  --resource-group $RESOURCE_GROUP \
  --budget-name maurvi-monthly-budget \
  --amount 100 \
  --time-grain Monthly \
  --time-period start-date=$(date +%Y-%m-01) \
  --category Cost
```

---

## Cleanup (Development Only)

To delete all resources:

```bash
# ⚠️ WARNING: This will delete everything!
az group delete --name $RESOURCE_GROUP --yes --no-wait
```

---

## Next Steps

1. ✅ Resources deployed
2. ✅ Functions tested
3. ✅ Frontend deployed
4. → Migrate historical data (see [AZURE_MIGRATION_PLAN.md](../AZURE_MIGRATION_PLAN.md))
5. → Set up CI/CD pipeline
6. → Configure custom domain
7. → Enable authentication (Azure AD B2C) if needed
8. → Performance optimization

---

## Support

- **Documentation**: See [AZURE_MIGRATION_PLAN.md](../AZURE_MIGRATION_PLAN.md) for detailed migration guide
- **Azure Documentation**: https://docs.microsoft.com/azure/
- **Issues**: Contact repository owner

---

**Last Updated**: January 2025
