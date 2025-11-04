# Azure Functions Version

This directory will contain the Azure Functions implementation of the Trading Signals Web App.

## Status

🚧 **Under Development** - This is a planned migration from Google Apps Script to Azure Functions.

## Structure

```
azure/
├── functions/          # Azure Functions (HTTP & Timer triggers)
├── shared/            # Shared utilities and modules
├── web/               # Static web app (frontend)
├── infrastructure/    # Infrastructure as Code (Bicep/Terraform)
├── tests/            # Integration tests
├── scripts/          # Deployment and utility scripts
└── README.md         # This file
```

## Migration Plan

See [../AZURE_MIGRATION_PLAN.md](../AZURE_MIGRATION_PLAN.md) for the complete migration guide, including:
- Recommended folder structure
- Step-by-step deployment process
- Azure services mapping
- Cost estimation
- Migration checklist

## Prerequisites

Before starting with Azure deployment, you'll need:
- Azure account with active subscription
- Node.js (v18.x or v20.x LTS)
- Azure CLI
- Azure Functions Core Tools v4
- Git

## Quick Start (Planned)

```bash
# Install dependencies
cd azure
npm install

# Configure local settings
cp local.settings.json.example local.settings.json
# Edit local.settings.json with your configuration

# Run locally
cd functions
func start

# Deploy to Azure
func azure functionapp publish YOUR_FUNCTION_APP_NAME
```

## Documentation

- [AZURE_MIGRATION_PLAN.md](../AZURE_MIGRATION_PLAN.md) - Complete migration guide
- [Azure Functions Documentation](https://docs.microsoft.com/azure/azure-functions/)

## Support

For questions about Azure migration, please refer to the migration plan document or contact the development team.
