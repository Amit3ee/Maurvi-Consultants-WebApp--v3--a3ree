# Maurvi Consultants Trading Signals - Azure Version

This directory contains the **Azure Functions version** of the Maurvi Consultants Trading Signals Web App, refactored from the original Google Apps Script implementation.

## 📚 Documentation

### Essential Reading
1. **[AZURE_MIGRATION_PLAN.md](./AZURE_MIGRATION_PLAN.md)** - Complete migration strategy, architecture, and design decisions
2. **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Step-by-step deployment instructions for Azure

### Quick Links
- [Original Google Apps Script Version](../)
- [Azure Portal](https://portal.azure.com)
- [Azure Functions Documentation](https://docs.microsoft.com/en-us/azure/azure-functions/)

## 🎯 What's Different from Google Apps Script Version?

| Aspect | Google Apps Script | Azure Functions |
|--------|-------------------|-----------------|
| **Runtime** | Google's V8 JavaScript | Node.js 18+ |
| **Data Storage** | Google Sheets | Azure Cosmos DB (NoSQL) |
| **Email** | Gmail/MailApp | SendGrid / Azure Comm Services |
| **Caching** | CacheService (in-memory) | Azure Redis Cache (distributed) |
| **Secrets** | PropertiesService | Azure Key Vault |
| **Frontend** | Apps Script Web App | Azure Static Web Apps |
| **Triggers** | Time-based triggers | Azure Timer Triggers |
| **Deployment** | clasp or web IDE | Azure CLI / VS Code / GitHub Actions |
| **Scaling** | Automatic | Consumption or Premium plans |
| **Cost** | Free (within quotas) | Pay-as-you-go (~$300-500/month) |

## 🏗️ Azure Architecture

```
Internet
    │
    ├─→ Azure Static Web Apps (Frontend)
    │       │
    │       └─→ API calls
    │
    └─→ Azure Functions (Backend APIs)
            │
            ├─→ Azure Cosmos DB (Data)
            ├─→ Azure Redis Cache (Sessions/OTP)
            ├─→ Azure Key Vault (Secrets)
            └─→ SendGrid (Email)
```

## 📁 Folder Structure

```
azure-version/
├── AZURE_MIGRATION_PLAN.md     # Migration strategy and architecture
├── DEPLOYMENT_GUIDE.md          # Deployment instructions
├── README.md                    # This file
│
├── functions/                   # Azure Functions (to be created)
│   ├── webhook-handler/
│   ├── daily-maintenance/
│   ├── get-dashboard-data/
│   └── auth-*/
│
├── shared/                      # Shared libraries (to be created)
│   ├── database/
│   ├── cache/
│   ├── email/
│   └── auth/
│
├── frontend/                    # Static web app (to be created)
│   └── index.html
│
└── infrastructure/              # IaC templates (to be created)
    └── bicep/
```

## 🚀 Quick Start

### Prerequisites
- Azure subscription
- Azure CLI installed
- Node.js 18+ installed
- SendGrid or Azure Communication Services account
- Gemini API key (optional)

### Deployment Steps (High-Level)

1. **Read the documentation:**
   ```bash
   # Start with the migration plan
   cat AZURE_MIGRATION_PLAN.md
   
   # Then follow the deployment guide
   cat DEPLOYMENT_GUIDE.md
   ```

2. **Provision Azure resources:**
   ```bash
   # Follow Part 1 of DEPLOYMENT_GUIDE.md
   az group create --name rg-maurvi-signals --location eastus
   # ... (see deployment guide for full steps)
   ```

3. **Deploy functions:**
   ```bash
   # Follow Part 3 of DEPLOYMENT_GUIDE.md
   npm install
   npm run build
   az functionapp deployment source config-zip ...
   ```

4. **Deploy frontend:**
   ```bash
   # Follow Part 3 of DEPLOYMENT_GUIDE.md
   cd frontend
   az staticwebapp deploy ...
   ```

5. **Update TradingView webhooks:**
   ```
   Old: https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
   New: https://func-maurvi-signals.azurewebsites.net/api/webhook-handler
   ```

## 💰 Cost Estimates

### Development Environment (~$57/month)
- Azure Functions (Consumption): ~$10
- Cosmos DB (Serverless): ~$25
- Redis Cache (Basic C0): ~$17
- Static Web Apps: Free
- Email: ~$5

### Production Environment (~$357/month)
- Azure Functions (Premium EP1): ~$140
- Cosmos DB (Serverless): ~$100
- Redis Cache (Standard C1): ~$75
- Static Web Apps (Standard): ~$9
- Email: ~$20
- Key Vault: ~$3
- Application Insights: ~$10

**Cost Optimization Tips:**
- Use Consumption plan for Functions in dev
- Use serverless Cosmos DB for variable workloads
- Enable autoscale for predictable cost management
- Set budget alerts to prevent overruns

## 🔑 Key Benefits of Azure Version

1. **Scalability** - Auto-scale to handle high TradingView alert volumes
2. **Reliability** - 99.9% SLA with global distribution options
3. **Security** - Key Vault for secrets, managed identities, RBAC
4. **Monitoring** - Application Insights for detailed telemetry
5. **DevOps** - CI/CD pipelines with GitHub Actions
6. **Flexibility** - Not tied to Google ecosystem
7. **Professional** - Enterprise-grade infrastructure

## 🛠️ Development Status

This directory currently contains:
- ✅ Migration plan and architecture documentation
- ✅ Complete deployment guide
- ⏳ Azure Functions code (to be implemented)
- ⏳ Cosmos DB data layer (to be implemented)
- ⏳ Frontend adaptations (to be implemented)
- ⏳ Infrastructure as Code templates (to be implemented)

## 📋 Migration Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Planning & Architecture | 1 week | ✅ Complete |
| Infrastructure Setup | 1 week | ⏳ Pending |
| Backend Migration | 2 weeks | ⏳ Pending |
| Frontend Migration | 1 week | ⏳ Pending |
| Testing & Validation | 1 week | ⏳ Pending |
| Data Migration | 1 week | ⏳ Pending |
| Go-Live | 1 week | ⏳ Pending |

**Total Estimated Time:** 6-8 weeks

## 🎓 Learning Resources

### Azure Services
- [Azure Functions](https://docs.microsoft.com/en-us/azure/azure-functions/)
- [Azure Cosmos DB](https://docs.microsoft.com/en-us/azure/cosmos-db/)
- [Azure Redis Cache](https://docs.microsoft.com/en-us/azure/azure-cache-for-redis/)
- [Azure Static Web Apps](https://docs.microsoft.com/en-us/azure/static-web-apps/)
- [Azure Key Vault](https://docs.microsoft.com/en-us/azure/key-vault/)

### Development Tools
- [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/)
- [Azure Functions Core Tools](https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local)
- [VS Code Azure Extensions](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-azurefunctions)

## 🤝 Support

For questions or issues with the Azure migration:
1. Check the [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) troubleshooting section
2. Review Azure service status at [status.azure.com](https://status.azure.com)
3. Contact the development team

## 📄 License

Private and confidential. All rights reserved by Maurvi Consultants.

---

**Version:** 1.0 (Azure Migration)  
**Last Updated:** January 2025  
**Status:** Documentation Complete, Implementation Pending
