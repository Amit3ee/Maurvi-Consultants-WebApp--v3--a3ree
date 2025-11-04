# Azure Migration Quick Reference

This document provides a concise, high-level overview of the Azure Functions migration for quick reference.

## 📋 What You Need to Know

### The Goal
Migrate the Maurvi Consultants Trading Signals Web App from **Google Apps Script** to **Microsoft Azure Functions** for better scalability, reliability, and professional infrastructure.

### Timeline
**6-8 weeks** total migration time

### Estimated Cost
- **Development**: ~$57/month
- **Production**: ~$357/month (low traffic) to ~$541/month (medium traffic)

## 🗺️ Migration Path at a Glance

```
Google Apps Script          →          Microsoft Azure
├── Apps Script            →    Azure Functions (Node.js 18+)
├── Google Sheets          →    Azure Cosmos DB (NoSQL)
├── Gmail/MailApp          →    SendGrid / Azure Comm Services
├── CacheService           →    Azure Redis Cache
├── PropertiesService      →    Azure Key Vault
├── Script Triggers        →    Azure Timer Triggers
└── Web App Hosting        →    Azure Static Web Apps
```

## 🏗️ Recommended Azure Services

| Service | Purpose | Tier | Est. Cost/Month |
|---------|---------|------|----------------|
| Azure Functions | Backend APIs | Premium EP1 | $140 |
| Azure Cosmos DB | Data Storage | Serverless | $100 |
| Azure Redis Cache | Caching | Standard C1 | $75 |
| Azure Static Web Apps | Frontend | Standard | $9 |
| SendGrid | Email Delivery | Essentials | $20 |
| Azure Key Vault | Secrets | Standard | $3 |
| Application Insights | Monitoring | Basic | $10 |

## 📁 New Repository Structure

```
azure-version/
├── functions/              # 9 Azure Functions
│   ├── webhook-handler/    # Receives TradingView alerts
│   ├── daily-maintenance/  # Cleanup task
│   ├── get-dashboard-data/ # Dashboard API
│   ├── get-historical-data/# Historical API
│   ├── auth-generate-otp/  # OTP generation
│   ├── auth-verify-otp/    # OTP verification
│   ├── auth-verify-session/# Session validation
│   ├── gemini-analyze/     # AI analysis
│   └── gemini-chat/        # AI chat
│
├── shared/                 # Shared libraries
│   ├── database/           # Cosmos DB client & repositories
│   ├── cache/              # Redis client
│   ├── email/              # Email service
│   ├── auth/               # Auth managers
│   └── utils/              # Utilities
│
├── frontend/               # Static web files
│   └── index.html          # Modified for Azure APIs
│
└── infrastructure/         # IaC templates
    └── bicep/              # Azure resource definitions
```

## 🚀 Deployment Steps (TL;DR)

### Part 1: Infrastructure (Week 1)
```bash
# Login to Azure
az login

# Create resources
az group create --name rg-maurvi-signals --location eastus
az cosmosdb create --name cosmos-maurvi-signals ...
az redis create --name redis-maurvi-signals ...
az functionapp create --name func-maurvi-signals ...
az staticwebapp create --name swa-maurvi-signals ...
```

### Part 2: Backend Development (Weeks 2-3)
```bash
# Clone repo and install dependencies
git clone <repo>
cd azure-version
npm install

# Develop and test locally
npm run start

# Deploy to Azure
npm run build
az functionapp deployment source config-zip ...
```

### Part 3: Frontend Deployment (Week 3-4)
```bash
# Update API endpoints in index.html
# Deploy static web app
az staticwebapp deploy ...
```

### Part 4: Configuration (Week 4-5)
```bash
# Update TradingView webhook URLs
# Old: https://script.google.com/...
# New: https://func-maurvi-signals.azurewebsites.net/api/webhook-handler

# Migrate historical data
node scripts/migrate-data.js
```

### Part 5: Go-Live (Week 5-6)
```bash
# Monitor for 48 hours
az functionapp log tail --name func-maurvi-signals ...

# Decommission Google Apps Script
# (after successful validation)
```

## 🔄 Key Changes from Google Apps Script

### Data Model Transformation

**Before (Google Sheets):**
```
Indicator1_2025-01-15 (Sheet)
Row 1: Headers
Row 2: RELIANCE | Reason1 | Time1 | ... | SyncReason1 | SyncTime1 | ...
Row 3: TCS | ...
```

**After (Cosmos DB):**
```json
{
  "id": "2025-01-15-RELIANCE",
  "partitionKey": "2025-01-15",
  "symbol": "RELIANCE",
  "indicator1Signals": [
    { "reason": "Volume Surge", "time": "09:20:05" }
  ],
  "indicator2SyncEvents": [
    { "reason": "HVD (350 Cr)", "time": "09:42:00" }
  ]
}
```

### Authentication Flow

**Before:**
```
User → Email Input → OTP via Gmail → Validate via CacheService → Session in CacheService
```

**After:**
```
User → Email Input → OTP via SendGrid → Validate via Redis → JWT Token → Stored in Redis
```

### API Endpoints

| Function | Endpoint | Method |
|----------|----------|--------|
| Webhook Handler | `/api/webhook-handler` | POST |
| Dashboard Data | `/api/get-dashboard-data` | GET |
| Historical Data | `/api/get-historical-data?date=2025-01-15` | GET |
| Generate OTP | `/api/auth-generate-otp` | POST |
| Verify OTP | `/api/auth-verify-otp` | POST |
| Verify Session | `/api/auth-verify-session` | POST |
| Gemini Analyze | `/api/gemini-analyze` | POST |
| Gemini Chat | `/api/gemini-chat` | POST |

## 📊 Success Metrics

- [ ] **Functional Parity**: All features working
- [ ] **Performance**: < 500ms API response time
- [ ] **Reliability**: 99.9% uptime
- [ ] **Cost**: Within $500/month budget
- [ ] **Data Integrity**: 100% historical data preserved
- [ ] **User Satisfaction**: Zero complaints during transition

## ⚠️ Critical Migration Considerations

### Before You Start
1. ✅ Get Azure subscription with Owner/Contributor access
2. ✅ Budget approval for ~$357-541/month
3. ✅ Team training on Azure services
4. ✅ Backup all Google Sheets data
5. ✅ Plan for parallel running period

### During Migration
1. ⚠️ Keep Google Apps Script running until Azure is validated
2. ⚠️ Test thoroughly in staging before production deployment
3. ⚠️ Monitor costs daily during first month
4. ⚠️ Set up alerts for errors and high usage
5. ⚠️ Document all configuration and secrets

### After Go-Live
1. 📊 Monitor Application Insights for 48 hours
2. 📊 Verify all TradingView alerts are being received
3. 📊 Confirm email delivery success rate
4. 📊 Review cost reports weekly for first month
5. 📊 Collect user feedback

## 🛠️ Essential Azure CLI Commands

```bash
# Login and set subscription
az login
az account set --subscription "YOUR_SUBSCRIPTION_ID"

# View resources
az resource list --resource-group rg-maurvi-signals

# View Function logs
az functionapp log tail --name func-maurvi-signals --resource-group rg-maurvi-signals

# View costs
az consumption usage list --start-date "2025-01-01" --end-date "2025-01-31"

# Restart Function App
az functionapp restart --name func-maurvi-signals --resource-group rg-maurvi-signals

# View Key Vault secrets
az keyvault secret list --vault-name kv-maurvi-signals
```

## 📞 Support Resources

### Documentation
- [AZURE_MIGRATION_PLAN.md](./AZURE_MIGRATION_PLAN.md) - Full migration strategy
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Detailed deployment steps
- [README.md](./README.md) - Azure version overview

### Azure Resources
- [Azure Portal](https://portal.azure.com)
- [Azure Status](https://status.azure.com)
- [Azure Pricing Calculator](https://azure.microsoft.com/en-us/pricing/calculator/)
- [Azure Documentation](https://docs.microsoft.com/en-us/azure/)

### Getting Help
1. Check troubleshooting section in DEPLOYMENT_GUIDE.md
2. Review Azure service health
3. Contact development team
4. Open Azure support ticket (if needed)

## 🎯 Next Steps

1. **Review Full Documentation**
   - Read [AZURE_MIGRATION_PLAN.md](./AZURE_MIGRATION_PLAN.md)
   - Study [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

2. **Get Approvals**
   - Budget approval (~$357-541/month)
   - Timeline approval (6-8 weeks)
   - Resource allocation (developer time)

3. **Prepare Azure Subscription**
   - Create or use existing subscription
   - Ensure proper permissions (Owner/Contributor)
   - Set up billing alerts

4. **Begin Infrastructure Setup**
   - Follow DEPLOYMENT_GUIDE.md Part 1
   - Provision all Azure resources
   - Configure Key Vault with secrets

5. **Start Development**
   - Clone repository
   - Set up local development environment
   - Begin function development

---

**Remember**: This is a significant migration. Take time to understand the architecture, test thoroughly, and monitor closely after deployment.

**Document Version**: 1.0  
**Last Updated**: January 2025  
**For Questions**: Contact Development Team
