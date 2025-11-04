# Azure Deployment Guide - Step-by-Step

This guide provides detailed, actionable steps to deploy the Maurvi Consultants Trading Signals application to Microsoft Azure using GitHub Actions for CI/CD.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Azure Resources Setup](#azure-resources-setup)
3. [Repository Structure](#repository-structure)
4. [Local Development Setup](#local-development-setup)
5. [GitHub Actions Configuration](#github-actions-configuration)
6. [Deployment Steps](#deployment-steps)
7. [Post-Deployment Configuration](#post-deployment-configuration)
8. [Monitoring and Troubleshooting](#monitoring-and-troubleshooting)

---

## Prerequisites

### Required Tools

1. **Azure CLI** (version 2.40+)
   ```bash
   # Install on Windows (PowerShell)
   winget install -e --id Microsoft.AzureCLI
   
   # Install on macOS
   brew install azure-cli
   
   # Install on Linux
   curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
   ```

2. **Node.js** (version 18+ LTS)
   ```bash
   # Download from https://nodejs.org/
   # Or use nvm
   nvm install 18
   nvm use 18
   ```

3. **Git**
   ```bash
   # Download from https://git-scm.com/
   git --version  # Verify installation
   ```

4. **Azure Functions Core Tools** (version 4)
   ```bash
   npm install -g azure-functions-core-tools@4
   ```

### Azure Account Requirements

1. Active Azure subscription
   - If you don't have one: [Create free account](https://azure.microsoft.com/free/)
   - Free tier includes: $200 credit for 30 days

2. Required permissions:
   - Contributor role on subscription (or resource group)
   - Ability to create service principals

---

## Azure Resources Setup

### Step 1: Login to Azure

```bash
# Login via browser
az login

# List subscriptions
az account list --output table

# Set default subscription (if you have multiple)
az account set --subscription "Your-Subscription-Name-Or-ID"
```

### Step 2: Create Resource Group

```bash
# Set variables
export RESOURCE_GROUP="maurvi-trading-signals-rg"
export LOCATION="eastus"  # Change to your preferred region

# Create resource group
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION
```

### Step 3: Create Azure SQL Database

```bash
# Set variables
export SQL_SERVER_NAME="maurvi-sql-$(openssl rand -hex 4)"
export SQL_ADMIN_USER="sqladmin"
export SQL_ADMIN_PASSWORD="$(openssl rand -base64 16)P@ssw0rd!"  # Generate strong password
export DATABASE_NAME="maurvi_signals"

# Create SQL Server
az sql server create \
  --name $SQL_SERVER_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --admin-user $SQL_ADMIN_USER \
  --admin-password "$SQL_ADMIN_PASSWORD"

# Allow Azure services to access server
az sql server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --server $SQL_SERVER_NAME \
  --name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# Create database
az sql db create \
  --resource-group $RESOURCE_GROUP \
  --server $SQL_SERVER_NAME \
  --name $DATABASE_NAME \
  --service-objective Basic \
  --backup-storage-redundancy Local

# Get connection string
export SQL_CONNECTION_STRING=$(az sql db show-connection-string \
  --client ado.net \
  --server $SQL_SERVER_NAME \
  --name $DATABASE_NAME \
  --output tsv)

# Replace placeholders in connection string
SQL_CONNECTION_STRING="${SQL_CONNECTION_STRING/<username>/$SQL_ADMIN_USER}"
SQL_CONNECTION_STRING="${SQL_CONNECTION_STRING/<password>/$SQL_ADMIN_PASSWORD}"

echo "SQL Connection String: $SQL_CONNECTION_STRING"
# IMPORTANT: Save this connection string securely!
```

### Step 4: Create Storage Account (for Functions)

```bash
export STORAGE_ACCOUNT="maurvistorage$(openssl rand -hex 4)"

az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS
```

### Step 5: Create Azure Function App

```bash
export FUNCTION_APP_NAME="maurvi-functions-$(openssl rand -hex 4)"

# Create Function App
az functionapp create \
  --resource-group $RESOURCE_GROUP \
  --name $FUNCTION_APP_NAME \
  --storage-account $STORAGE_ACCOUNT \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4 \
  --os-type Linux \
  --consumption-plan-location $LOCATION
```

### Step 6: Create Azure Redis Cache

```bash
export REDIS_NAME="maurvi-redis-$(openssl rand -hex 4)"

# Create Redis Cache (Basic C0 - 250MB)
az redis create \
  --name $REDIS_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Basic \
  --vm-size C0

# Get Redis connection details
export REDIS_HOST=$(az redis show \
  --name $REDIS_NAME \
  --resource-group $RESOURCE_GROUP \
  --query hostName \
  --output tsv)

export REDIS_KEY=$(az redis list-keys \
  --name $REDIS_NAME \
  --resource-group $RESOURCE_GROUP \
  --query primaryKey \
  --output tsv)

export REDIS_CONNECTION_STRING="$REDIS_HOST:6380,password=$REDIS_KEY,ssl=True,abortConnect=False"

echo "Redis Connection String: $REDIS_CONNECTION_STRING"
# IMPORTANT: Save this connection string securely!
```

### Step 7: Create Azure Static Web App

```bash
export STATIC_WEBAPP_NAME="maurvi-webapp"

# Note: Static Web Apps are typically created during GitHub Actions deployment
# But you can pre-create it:
az staticwebapp create \
  --name $STATIC_WEBAPP_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Free

# Get deployment token (for GitHub Actions)
export STATIC_WEBAPP_TOKEN=$(az staticwebapp secrets list \
  --name $STATIC_WEBAPP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query properties.apiKey \
  --output tsv)

echo "Static Web App Token: $STATIC_WEBAPP_TOKEN"
# IMPORTANT: Save this token securely!
```

### Step 8: Create Key Vault (for Secrets)

```bash
export KEYVAULT_NAME="maurvi-kv-$(openssl rand -hex 4)"

# Create Key Vault
az keyvault create \
  --name $KEYVAULT_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION

# Store secrets
az keyvault secret set \
  --vault-name $KEYVAULT_NAME \
  --name "SqlConnectionString" \
  --value "$SQL_CONNECTION_STRING"

az keyvault secret set \
  --vault-name $KEYVAULT_NAME \
  --name "RedisConnectionString" \
  --value "$REDIS_CONNECTION_STRING"

# Grant Function App access to Key Vault
export FUNCTION_APP_PRINCIPAL_ID=$(az functionapp identity assign \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query principalId \
  --output tsv)

az keyvault set-policy \
  --name $KEYVAULT_NAME \
  --object-id $FUNCTION_APP_PRINCIPAL_ID \
  --secret-permissions get list
```

### Step 9: Create Service Principal for GitHub Actions

```bash
# Create service principal
export SP_NAME="maurvi-github-actions-sp"

# Create service principal and get credentials
SP_OUTPUT=$(az ad sp create-for-rbac \
  --name $SP_NAME \
  --role contributor \
  --scopes /subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP \
  --sdk-auth)

echo "$SP_OUTPUT"
# IMPORTANT: Save this entire JSON output for GitHub Secrets!
```

### Step 10: Summary of Created Resources

Save these values for later configuration:

```bash
# Print summary
echo "=== Azure Resources Created ==="
echo "Resource Group: $RESOURCE_GROUP"
echo "SQL Server: $SQL_SERVER_NAME"
echo "Database: $DATABASE_NAME"
echo "Function App: $FUNCTION_APP_NAME"
echo "Storage Account: $STORAGE_ACCOUNT"
echo "Redis Cache: $REDIS_NAME"
echo "Static Web App: $STATIC_WEBAPP_NAME"
echo "Key Vault: $KEYVAULT_NAME"
echo ""
echo "=== Connection Strings (Keep Secure!) ==="
echo "SQL: $SQL_CONNECTION_STRING"
echo "Redis: $REDIS_CONNECTION_STRING"
echo ""
echo "=== Tokens (Keep Secure!) ==="
echo "Static Web App Token: $STATIC_WEBAPP_TOKEN"
echo ""
echo "Service Principal JSON: (see above)"
```

---

## Repository Structure

Create a new repository with the following structure:

```
maurvi-consultants-azure/
├── .github/
│   └── workflows/
│       ├── deploy-functions.yml      # Deploy Azure Functions
│       ├── deploy-frontend.yml       # Deploy Static Web App
│       └── deploy-database.yml       # Deploy database schema
│
├── functions/                         # Azure Functions backend
│   ├── webhook-handler/              # HTTP Trigger for TradingView
│   │   ├── function.json
│   │   └── index.js
│   ├── api-dashboard/                # HTTP Trigger for dashboard data
│   │   ├── function.json
│   │   └── index.js
│   ├── api-auth/                     # HTTP Trigger for authentication
│   │   ├── function.json
│   │   └── index.js
│   ├── api-gemini/                   # HTTP Trigger for AI features
│   │   ├── function.json
│   │   └── index.js
│   ├── daily-maintenance/            # Timer Trigger for cleanup
│   │   ├── function.json
│   │   └── index.js
│   ├── shared/                       # Shared utilities
│   │   ├── database.js
│   │   ├── redis.js
│   │   ├── email.js
│   │   └── validation.js
│   ├── host.json
│   ├── local.settings.json
│   └── package.json
│
├── frontend/                          # Static Web App
│   ├── index.html
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── app.js
│   │   ├── auth.js
│   │   ├── api.js
│   │   └── config.js
│   ├── staticwebapp.config.json
│   └── package.json
│
├── database/                          # Database scripts
│   ├── schema.sql                    # Table definitions
│   ├── stored-procedures.sql         # Stored procedures
│   ├── seed-data.sql                 # Initial data (if any)
│   └── migration-from-sheets.js      # Migration script
│
├── docs/                              # Documentation
│   ├── AZURE_MIGRATION_PLAN.md
│   ├── AZURE_DEPLOYMENT_GUIDE.md
│   └── API_DOCUMENTATION.md
│
├── .gitignore
├── README.md
└── package.json
```

---

## Local Development Setup

### Step 1: Clone the New Repository

```bash
# Create new repository on GitHub first, then clone
git clone https://github.com/YOUR_USERNAME/maurvi-consultants-azure.git
cd maurvi-consultants-azure
```

### Step 2: Initialize Functions Project

```bash
# Create functions directory
mkdir -p functions
cd functions

# Initialize Functions project
func init . --worker-runtime node --language javascript

# Install dependencies
npm init -y
npm install mssql redis nodemailer jsonwebtoken
npm install --save-dev @azure/functions
```

### Step 3: Create Local Settings

Create `functions/local.settings.json`:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "SQL_CONNECTION_STRING": "YOUR_SQL_CONNECTION_STRING",
    "REDIS_CONNECTION_STRING": "YOUR_REDIS_CONNECTION_STRING",
    "ADMIN_EMAIL": "amit3ree@gmail.com",
    "GEMINI_API_KEY": "YOUR_GEMINI_API_KEY",
    "SENDGRID_API_KEY": "YOUR_SENDGRID_API_KEY"
  }
}
```

### Step 4: Create Database Schema

Create `database/schema.sql` (see migration plan for full schema).

Run the schema:

```bash
# Install sqlcmd (if not already installed)
# Windows: Download from Microsoft
# Linux/Mac: Use Docker or install via package manager

sqlcmd -S $SQL_SERVER_NAME.database.windows.net \
  -d $DATABASE_NAME \
  -U $SQL_ADMIN_USER \
  -P "$SQL_ADMIN_PASSWORD" \
  -i database/schema.sql
```

---

## GitHub Actions Configuration

### Step 1: Add GitHub Secrets

Go to your repository on GitHub:
1. Settings → Secrets and variables → Actions → New repository secret

Add these secrets:

| Secret Name | Value |
|-------------|-------|
| `AZURE_CREDENTIALS` | Service Principal JSON from Step 9 |
| `AZURE_FUNCTIONAPP_NAME` | Value of $FUNCTION_APP_NAME |
| `AZURE_STATICWEBAPP_TOKEN` | Value of $STATIC_WEBAPP_TOKEN |
| `SQL_CONNECTION_STRING` | Your SQL connection string |
| `REDIS_CONNECTION_STRING` | Your Redis connection string |
| `ADMIN_EMAIL` | amit3ree@gmail.com |
| `GEMINI_API_KEY` | Your Gemini API key |
| `SENDGRID_API_KEY` | Your SendGrid API key |

### Step 2: Create Workflow - Deploy Functions

Create `.github/workflows/deploy-functions.yml`:

```yaml
name: Deploy Azure Functions

on:
  push:
    branches:
      - main
    paths:
      - 'functions/**'
  workflow_dispatch:

env:
  AZURE_FUNCTIONAPP_PACKAGE_PATH: 'functions'
  NODE_VERSION: '18.x'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install dependencies
        run: |
          cd ${{ env.AZURE_FUNCTIONAPP_PACKAGE_PATH }}
          npm ci

      - name: Login to Azure
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Deploy to Azure Functions
        uses: Azure/functions-action@v1
        with:
          app-name: ${{ secrets.AZURE_FUNCTIONAPP_NAME }}
          package: ${{ env.AZURE_FUNCTIONAPP_PACKAGE_PATH }}

      - name: Configure Function App Settings
        run: |
          az functionapp config appsettings set \
            --name ${{ secrets.AZURE_FUNCTIONAPP_NAME }} \
            --resource-group maurvi-trading-signals-rg \
            --settings \
              "SQL_CONNECTION_STRING=${{ secrets.SQL_CONNECTION_STRING }}" \
              "REDIS_CONNECTION_STRING=${{ secrets.REDIS_CONNECTION_STRING }}" \
              "ADMIN_EMAIL=${{ secrets.ADMIN_EMAIL }}" \
              "GEMINI_API_KEY=${{ secrets.GEMINI_API_KEY }}" \
              "SENDGRID_API_KEY=${{ secrets.SENDGRID_API_KEY }}"

      - name: Logout from Azure
        run: az logout
```

### Step 3: Create Workflow - Deploy Frontend

Create `.github/workflows/deploy-frontend.yml`:

```yaml
name: Deploy Static Web App

on:
  push:
    branches:
      - main
    paths:
      - 'frontend/**'
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Build and Deploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATICWEBAPP_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: 'upload'
          app_location: 'frontend'
          output_location: ''
```

### Step 4: Create Workflow - Deploy Database

Create `.github/workflows/deploy-database.yml`:

```yaml
name: Deploy Database Schema

on:
  push:
    branches:
      - main
    paths:
      - 'database/**'
  workflow_dispatch:

jobs:
  deploy-schema:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Login to Azure
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Install sqlcmd
        run: |
          curl https://packages.microsoft.com/keys/microsoft.asc | sudo apt-key add -
          curl https://packages.microsoft.com/config/ubuntu/20.04/prod.list | sudo tee /etc/apt/sources.list.d/mssql-release.list
          sudo apt-get update
          sudo ACCEPT_EULA=Y apt-get install -y mssql-tools unixodbc-dev

      - name: Deploy Schema
        run: |
          /opt/mssql-tools/bin/sqlcmd \
            -S ${{ secrets.SQL_SERVER_NAME }}.database.windows.net \
            -d ${{ secrets.DATABASE_NAME }} \
            -U ${{ secrets.SQL_ADMIN_USER }} \
            -P "${{ secrets.SQL_ADMIN_PASSWORD }}" \
            -i database/schema.sql

      - name: Logout from Azure
        run: az logout
```

---

## Deployment Steps

### Step 1: Prepare Code for Migration

1. **Port Functions**: Convert GAS functions to Azure Functions format
2. **Update Frontend**: Replace `google.script.run` with `fetch()` API calls
3. **Test Locally**: Run Functions locally with `func start`

### Step 2: Initial Database Deployment

```bash
# Deploy schema
cd database
sqlcmd -S $SQL_SERVER_NAME.database.windows.net \
  -d $DATABASE_NAME \
  -U $SQL_ADMIN_USER \
  -P "$SQL_ADMIN_PASSWORD" \
  -i schema.sql

# Deploy stored procedures
sqlcmd -S $SQL_SERVER_NAME.database.windows.net \
  -d $DATABASE_NAME \
  -U $SQL_ADMIN_USER \
  -P "$SQL_ADMIN_PASSWORD" \
  -i stored-procedures.sql
```

### Step 3: Push Code to GitHub

```bash
# Stage all changes
git add .

# Commit
git commit -m "Initial Azure migration"

# Push to main branch (triggers GitHub Actions)
git push origin main
```

### Step 4: Monitor Deployment

1. Go to GitHub Actions tab in your repository
2. Watch the workflow runs
3. Check logs for any errors
4. Verify deployment status

### Step 5: Verify Deployment

```bash
# Test Function App endpoint
curl https://$FUNCTION_APP_NAME.azurewebsites.net/api/health

# Test Static Web App
curl https://$STATIC_WEBAPP_NAME.azurestaticapps.net
```

---

## Post-Deployment Configuration

### Step 1: Configure Custom Domain (Optional)

For Static Web App:
```bash
# Add custom domain
az staticwebapp hostname set \
  --name $STATIC_WEBAPP_NAME \
  --resource-group $RESOURCE_GROUP \
  --hostname "yourdomain.com"
```

### Step 2: Update TradingView Webhooks

1. Login to TradingView
2. Edit each alert
3. Update webhook URL to:
   ```
   https://<FUNCTION_APP_NAME>.azurewebsites.net/api/webhook
   ```

### Step 3: Configure CORS

```bash
# Allow frontend to access Function App
az functionapp cors add \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --allowed-origins "https://$STATIC_WEBAPP_NAME.azurestaticapps.net"
```

### Step 4: Enable Application Insights

```bash
# Create Application Insights
az monitor app-insights component create \
  --app maurvi-app-insights \
  --location $LOCATION \
  --resource-group $RESOURCE_GROUP \
  --application-type web

# Get instrumentation key
export APP_INSIGHTS_KEY=$(az monitor app-insights component show \
  --app maurvi-app-insights \
  --resource-group $RESOURCE_GROUP \
  --query instrumentationKey \
  --output tsv)

# Configure Function App
az functionapp config appsettings set \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings "APPINSIGHTS_INSTRUMENTATIONKEY=$APP_INSIGHTS_KEY"
```

### Step 5: Set Up Alerts

```bash
# Create alert for failed requests
az monitor metrics alert create \
  --name "High Failed Requests" \
  --resource-group $RESOURCE_GROUP \
  --scopes "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/$FUNCTION_APP_NAME" \
  --condition "count Http5xx > 10" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action-group "your-action-group-id"
```

---

## Monitoring and Troubleshooting

### View Function App Logs

```bash
# Stream logs in real-time
az webapp log tail \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP

# Or in Azure Portal:
# Function App → Monitor → Log Stream
```

### Check Application Insights

```bash
# Query failed requests
az monitor app-insights query \
  --app maurvi-app-insights \
  --resource-group $RESOURCE_GROUP \
  --analytics-query "requests | where success == false | top 10 by timestamp desc"
```

### Common Issues and Solutions

#### Issue 1: Function not receiving webhooks
**Solution**:
- Check CORS settings
- Verify Function authentication level is "anonymous"
- Check firewall rules

#### Issue 2: Database connection timeout
**Solution**:
- Verify SQL Server firewall allows Azure services
- Check connection string format
- Increase connection timeout in code

#### Issue 3: Static Web App shows blank page
**Solution**:
- Check browser console for errors
- Verify API endpoints in config.js
- Check CORS configuration

#### Issue 4: High costs
**Solution**:
- Review Azure Cost Management
- Check for excessive logging
- Optimize database queries
- Consider scaling down resources during off-hours

### Rollback Procedure

If you need to rollback:

```bash
# Rollback Function App to previous deployment
az functionapp deployment source sync \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP

# Or use specific deployment slot
az functionapp deployment slot swap \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot staging \
  --target-slot production
```

---

## Maintenance Tasks

### Weekly Tasks
- [ ] Review Application Insights for errors
- [ ] Check database size and performance
- [ ] Review cost alerts
- [ ] Test critical user flows

### Monthly Tasks
- [ ] Review and optimize database queries
- [ ] Update Node.js packages
- [ ] Review security advisories
- [ ] Backup database (automated but verify)

### Quarterly Tasks
- [ ] Review and optimize Azure resource SKUs
- [ ] Update documentation
- [ ] Security audit
- [ ] Disaster recovery test

---

## Additional Resources

- [Azure Functions Best Practices](https://docs.microsoft.com/en-us/azure/azure-functions/functions-best-practices)
- [Azure Static Web Apps Documentation](https://docs.microsoft.com/en-us/azure/static-web-apps/)
- [Azure SQL Database Tutorials](https://docs.microsoft.com/en-us/azure/azure-sql/)
- [GitHub Actions for Azure](https://github.com/Azure/actions)

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Application Insights logs
3. Consult Azure documentation
4. Contact the development team

---

**Document Version**: 1.0  
**Last Updated**: November 2025  
**Maintained by**: Maurvi Consultants Development Team
