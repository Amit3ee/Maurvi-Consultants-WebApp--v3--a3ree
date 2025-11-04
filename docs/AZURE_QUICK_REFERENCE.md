# Azure Migration - Quick Reference

This is a quick reference guide for the Azure migration. For the complete plan, see [AZURE_MIGRATION_PLAN.md](../AZURE_MIGRATION_PLAN.md).

## Folder Structure Overview

```
Maurvi-Consultants-WebApp--v3--a3ree/
├── apps-script/              # Original Google Apps Script version
│   ├── code.gs              # Backend (2,681 lines)
│   ├── index.html           # Frontend (3,691 lines)
│   └── README.md
│
├── azure/                    # New Azure Functions version
│   ├── functions/           # Azure Functions (HTTP & Timer triggers)
│   ├── shared/              # Shared utilities (database, cache, auth)
│   ├── web/                 # Static web app (frontend)
│   ├── infrastructure/      # IaC (Bicep/Terraform)
│   ├── tests/               # Integration tests
│   ├── scripts/             # Deployment scripts
│   ├── package.json
│   ├── .env.example
│   └── README.md
│
├── docs/                     # Documentation
│   ├── AZURE_DEPLOYMENT.md  # Step-by-step Azure deployment
│   └── ...other docs...
│
├── AZURE_MIGRATION_PLAN.md  # Complete migration plan (THIS IS KEY)
├── README.md                 # Updated main README
└── .gitignore                # Updated for Azure files
```

## Azure Services Used

| Service | Purpose | Cost (Monthly) |
|---------|---------|----------------|
| Azure Functions | Backend API & webhooks | $0-20 (Consumption) |
| Cosmos DB | Signal data storage | $1-50 (Serverless) |
| Redis Cache | Session & cache | ~$16 (Basic) |
| Static Web Apps | Frontend hosting | $0 (Free tier) |
| Application Insights | Monitoring | $0-10 |
| **Total** | | **~$20-100** |

## Quick Start Commands

### Setup Azure Resources
```bash
# Variables
export RESOURCE_GROUP="rg-maurvi-trading-signals"
export LOCATION="eastus"
export FUNCTION_APP_NAME="func-maurvi-signals-$(whoami)"

# Create resources
az group create --name $RESOURCE_GROUP --location $LOCATION
az functionapp create --name $FUNCTION_APP_NAME --resource-group $RESOURCE_GROUP ...
```

### Local Development
```bash
cd azure
npm install
cp local.settings.json.example local.settings.json
# Edit local.settings.json
cd functions && func start
```

### Deploy to Azure
```bash
cd azure/functions
func azure functionapp publish $FUNCTION_APP_NAME
```

## Key Files to Review

1. **[AZURE_MIGRATION_PLAN.md](../AZURE_MIGRATION_PLAN.md)** - THE complete guide
   - Detailed folder structure explanation
   - Azure services mapping
   - Step-by-step deployment (8 phases)
   - Code examples for all components
   - Cost estimation
   - Migration checklist

2. **[docs/AZURE_DEPLOYMENT.md](AZURE_DEPLOYMENT.md)** - Practical deployment commands
   - All Azure CLI commands
   - Configuration steps
   - Testing procedures
   - Troubleshooting

3. **[azure/README.md](../azure/README.md)** - Azure version overview

## Migration Phases

1. **Initial Setup** (1-2 hours) - Install tools, create Azure resources
2. **Project Initialization** (1 hour) - Set up project structure
3. **Code Migration** (4-8 hours) - Migrate backend logic
4. **Frontend Migration** (2-4 hours) - Refactor and deploy frontend
5. **Local Testing** (1-2 hours) - Test all functionality locally
6. **Deployment** (1-2 hours) - Deploy to Azure
7. **Post-Deployment** (30 mins) - Configure and verify
8. **Data Migration** (1-2 hours) - Migrate historical data

**Total Time**: 15-25 hours over 2-4 weeks

## Next Actions

### For Planning
→ Review [AZURE_MIGRATION_PLAN.md](../AZURE_MIGRATION_PLAN.md) in detail

### For Implementation
→ Follow [docs/AZURE_DEPLOYMENT.md](AZURE_DEPLOYMENT.md) step-by-step

### For Development
→ Start with folder structure and shared modules

## Key Differences: Apps Script vs Azure

| Aspect | Apps Script | Azure Functions |
|--------|-------------|-----------------|
| **Execution Time** | 6 minutes max | No limit |
| **URL Fetches** | 20K/day | No limit |
| **Scalability** | Limited | Auto-scales |
| **Monitoring** | Basic logs | Application Insights |
| **Cost** | Free | ~$20-100/month |
| **Setup Time** | Minutes | Hours/days |
| **Professional Grade** | ❌ | ✅ |

## Support

- **Complete Guide**: [AZURE_MIGRATION_PLAN.md](../AZURE_MIGRATION_PLAN.md)
- **Deployment Steps**: [docs/AZURE_DEPLOYMENT.md](AZURE_DEPLOYMENT.md)
- **Azure Docs**: https://docs.microsoft.com/azure/
- **Repository Owner**: Contact for questions

---

**Remember**: The complete migration plan with all code examples is in [AZURE_MIGRATION_PLAN.md](../AZURE_MIGRATION_PLAN.md). This is just a quick reference!
