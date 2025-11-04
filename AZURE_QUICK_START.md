# Azure Migration - Quick Start Guide

This is a concise guide for migrating the Maurvi Consultants Trading Signals app from Google Apps Script to Microsoft Azure.

## 📋 Overview

**Current Platform**: Google Apps Script + Google Sheets  
**Target Platform**: Azure Functions + Azure SQL Database  
**Deployment Method**: GitHub Actions (CI/CD)

## 🎯 What You Get

### Benefits of Azure Migration
✅ **Performance**: 10x faster database queries vs Google Sheets  
✅ **Scalability**: Handle 100x more webhooks concurrently  
✅ **Monitoring**: Full Application Insights telemetry  
✅ **Professional**: Industry-standard REST APIs  
✅ **CI/CD**: Automated deployments via GitHub Actions  
✅ **Reliability**: 99.95% SLA with Azure Functions  

### Cost Comparison
- **Google Apps Script**: Free (with hard limits)
- **Azure**: ~$35-50/month (with much higher limits)

## 🏗️ Architecture

```
┌─────────────────┐
│  TradingView    │
│    Alerts       │
└────────┬────────┘
         │ HTTPS POST
         ▼
┌─────────────────┐
│ Azure Functions │ ◄─── GitHub Actions (CI/CD)
│  (Node.js 18)   │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌──────────┐
│ Azure  │ │  Redis   │
│   SQL  │ │  Cache   │
└────────┘ └──────────┘
         ▲
         │
┌─────────────────┐
│ Static Web App  │
│   (Frontend)    │
└─────────────────┘
         ▲
         │
      Browser
```

## 📚 Documentation Structure

1. **[AZURE_MIGRATION_PLAN.md](AZURE_MIGRATION_PLAN.md)** - Read this first
   - High-level architecture decisions
   - Component mapping (GAS → Azure)
   - Technology stack recommendations
   - Timeline and phases (6 weeks)

2. **[AZURE_DEPLOYMENT_GUIDE.md](AZURE_DEPLOYMENT_GUIDE.md)** - Step-by-step guide
   - Azure resources setup (CLI commands)
   - GitHub Actions configuration
   - Deployment procedures
   - Monitoring and troubleshooting

3. **[GAS_TO_AZURE_COMPARISON.md](GAS_TO_AZURE_COMPARISON.md)** - Code comparison
   - Side-by-side code examples
   - API differences
   - Data model transformation
   - Best practices

4. **[azure-sample/](azure-sample/)** - Sample implementation
   - Working Azure Functions code
   - Database schema scripts
   - Shared utilities

## ⚡ Quick Start (15 Minutes)

### Prerequisites
- Azure subscription ([Free trial](https://azure.microsoft.com/free/))
- Azure CLI installed
- Node.js 18+ installed
- Git installed

### Step 1: Set Up Azure (5 min)

```bash
# Login to Azure
az login

# Create resource group
az group create --name maurvi-trading-rg --location eastus

# Create SQL Database (Basic tier)
az sql server create \
  --name maurvi-sql-$(openssl rand -hex 4) \
  --resource-group maurvi-trading-rg \
  --location eastus \
  --admin-user sqladmin \
  --admin-password "YourSecurePassword123!"

az sql db create \
  --name maurvi_signals \
  --server maurvi-sql-XXXX \
  --resource-group maurvi-trading-rg \
  --service-objective Basic

# Create Function App
az functionapp create \
  --name maurvi-functions-$(openssl rand -hex 4) \
  --resource-group maurvi-trading-rg \
  --storage-account maurvistorage \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4 \
  --consumption-plan-location eastus
```

### Step 2: Set Up GitHub Actions (5 min)

```bash
# Create service principal for GitHub Actions
az ad sp create-for-rbac \
  --name maurvi-github-sp \
  --role contributor \
  --scopes /subscriptions/$(az account show --query id -o tsv)/resourceGroups/maurvi-trading-rg \
  --sdk-auth

# Copy the JSON output to GitHub Secrets as AZURE_CREDENTIALS
```

Add these secrets to your GitHub repository:
- `AZURE_CREDENTIALS` - Service principal JSON
- `AZURE_FUNCTIONAPP_NAME` - Your function app name
- `SQL_CONNECTION_STRING` - Database connection string

### Step 3: Deploy Code (5 min)

```bash
# Clone your new Azure repository
git clone https://github.com/YOUR_USERNAME/maurvi-azure.git
cd maurvi-azure

# Copy sample code
cp -r ../Maurvi-Consultants-WebApp--v3--a3ree/azure-sample/* .

# Push to trigger deployment
git add .
git commit -m "Initial Azure deployment"
git push origin main
```

GitHub Actions will automatically:
1. Build the application
2. Run tests
3. Deploy to Azure
4. Configure settings

## 📖 Detailed Migration Steps

### Phase 1: Preparation (Week 1)
- [ ] Review [AZURE_MIGRATION_PLAN.md](AZURE_MIGRATION_PLAN.md)
- [ ] Set up Azure subscription
- [ ] Create resource group and resources
- [ ] Configure GitHub repository

### Phase 2: Backend Development (Week 2-3)
- [ ] Port webhook handler (doPost → Azure Function)
- [ ] Port API endpoints (getDashboardData, etc.)
- [ ] Set up database schema
- [ ] Configure Redis caching
- [ ] Test locally with `func start`

### Phase 3: Frontend Migration (Week 3-4)
- [ ] Update API calls (`google.script.run` → `fetch`)
- [ ] Configure Azure Static Web App
- [ ] Test authentication flow
- [ ] Deploy to staging

### Phase 4: Data Migration (Week 4)
- [ ] Export historical data from Google Sheets
- [ ] Transform to SQL format
- [ ] Import to Azure SQL
- [ ] Verify data integrity

### Phase 5: Testing (Week 5)
- [ ] End-to-end testing
- [ ] Load testing
- [ ] Security testing
- [ ] User acceptance testing

### Phase 6: Deployment (Week 6)
- [ ] Update TradingView webhook URLs
- [ ] Monitor for errors
- [ ] Parallel run (1 week)
- [ ] Final cutover
- [ ] Decommission Google Apps Script

## 🔑 Key Files to Migrate

### Backend (Google Apps Script → Azure Functions)

| Google Apps Script | Azure Function | Notes |
|-------------------|----------------|-------|
| `doPost()` | `webhook-handler/index.js` | Receives TradingView alerts |
| `getDashboardData()` | `api-dashboard/index.js` | Returns dashboard data |
| `generateOTPServer()` | `api-auth/generate-otp.js` | Generates OTP codes |
| `verifyOTPServer()` | `api-auth/verify-otp.js` | Verifies OTP codes |
| `analyzeSignalWithGemini()` | `api-gemini/analyze.js` | AI analysis |
| `dailySetupAndMaintenance()` | `daily-maintenance/index.js` | Timer trigger |

### Data (Google Sheets → Azure SQL)

| Google Sheets | Azure SQL Table | Notes |
|--------------|-----------------|-------|
| `Indicator1_YYYY-MM-DD` | `Signals` (indicator_type='Indicator1') | Normalized table |
| `Indicator2_YYYY-MM-DD` | `Signals` (indicator_type='Indicator2') | Same table |
| `DebugLogs_YYYY-MM-DD` | `DebugLogs` | Error logs |
| CacheService | Redis Cache | Session & caching |

### Frontend (Minimal Changes)

- Replace `google.script.run` with `fetch()` API calls
- Update API endpoints to Azure Function URLs
- Add proper error handling for HTTP responses

## 🛠️ Local Development

### Test Azure Functions Locally

```bash
cd functions

# Install dependencies
npm install

# Start local Functions runtime
func start

# Test webhook in another terminal
curl -X POST http://localhost:7071/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"scrip":"AAPL","reason":"Volume Surge"}'

# Test dashboard API
curl http://localhost:7071/api/dashboard
```

### Test Database Connection

```bash
# Install sqlcmd
# Windows: Download from Microsoft
# Linux: apt-get install mssql-tools

# Connect to Azure SQL
sqlcmd -S your-server.database.windows.net \
  -d maurvi_signals \
  -U sqladmin \
  -P "YourPassword" \
  -Q "SELECT COUNT(*) FROM Signals"
```

## 🚀 Deployment via GitHub Actions

GitHub Actions automatically triggers on:
- Push to `main` branch
- Changes to `functions/**` or `frontend/**`
- Manual workflow dispatch

View workflow status:
```
https://github.com/YOUR_USERNAME/YOUR_REPO/actions
```

## 📊 Monitoring

### Application Insights
```bash
# View logs
az monitor app-insights query \
  --app maurvi-app-insights \
  --analytics-query "requests | top 10 by timestamp desc"

# View errors
az monitor app-insights query \
  --app maurvi-app-insights \
  --analytics-query "exceptions | top 10 by timestamp desc"
```

### Function App Logs
```bash
# Stream logs in real-time
az webapp log tail \
  --name YOUR_FUNCTION_APP_NAME \
  --resource-group maurvi-trading-rg
```

## 🆘 Troubleshooting

### Common Issues

**Issue**: Function not receiving webhooks
```bash
# Check if function is running
az functionapp show --name YOUR_FUNCTION_APP --resource-group maurvi-trading-rg

# Check CORS settings
az functionapp cors show --name YOUR_FUNCTION_APP --resource-group maurvi-trading-rg
```

**Issue**: Database connection timeout
```bash
# Check firewall rules
az sql server firewall-rule list \
  --server YOUR_SQL_SERVER \
  --resource-group maurvi-trading-rg

# Allow Azure services
az sql server firewall-rule create \
  --name AllowAzure \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

**Issue**: Deployment fails
- Check GitHub Actions logs
- Verify all secrets are set correctly
- Ensure resource names are unique

## 💰 Cost Management

### Monitor Costs
```bash
# View cost analysis
az consumption usage list \
  --start-date 2025-01-01 \
  --end-date 2025-01-31

# Set budget alert
az consumption budget create \
  --budget-name "maurvi-monthly-budget" \
  --amount 100 \
  --time-grain Monthly
```

### Optimization Tips
- Start with Basic SQL tier ($5/month)
- Use Consumption plan for Functions (pay-per-use)
- Use Free tier for Static Web Apps
- Set up auto-scaling limits

## 📞 Support

### Resources
- Azure Documentation: https://docs.microsoft.com/azure
- Azure Functions: https://docs.microsoft.com/azure/azure-functions/
- GitHub Actions: https://docs.github.com/actions

### Getting Help
1. Check [AZURE_DEPLOYMENT_GUIDE.md](AZURE_DEPLOYMENT_GUIDE.md) troubleshooting section
2. Review Application Insights logs
3. Check GitHub Actions workflow logs
4. Contact Azure Support (if subscription includes support)

## ✅ Success Checklist

Before going live:
- [ ] All Azure resources created
- [ ] Database schema deployed
- [ ] Functions deployed and tested
- [ ] Frontend deployed and accessible
- [ ] TradingView webhooks updated
- [ ] Authentication working
- [ ] Monitoring configured
- [ ] Cost alerts set up
- [ ] Backup GAS code archived
- [ ] Documentation updated

## 🎓 Next Steps

1. **Read the full documentation**:
   - Start with [AZURE_MIGRATION_PLAN.md](AZURE_MIGRATION_PLAN.md)
   - Follow [AZURE_DEPLOYMENT_GUIDE.md](AZURE_DEPLOYMENT_GUIDE.md) step-by-step

2. **Review sample code**:
   - Examine [azure-sample/](azure-sample/) directory
   - Understand the patterns in [GAS_TO_AZURE_COMPARISON.md](GAS_TO_AZURE_COMPARISON.md)

3. **Start small**:
   - Deploy a single function first
   - Test thoroughly
   - Gradually migrate more features

4. **Monitor and optimize**:
   - Use Application Insights
   - Optimize database queries
   - Tune Function App settings

---

**Good luck with your Azure migration! 🚀**

For questions or issues, refer to the detailed documentation or contact the development team.

**Document Version**: 1.0  
**Last Updated**: November 2025  
**Author**: Maurvi Consultants Development Team
