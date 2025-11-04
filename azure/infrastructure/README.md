# Infrastructure as Code

This directory contains Infrastructure as Code (IaC) templates for Azure resource deployment.

## Options

### Bicep (Recommended)
Bicep is Azure's domain-specific language for deploying resources. It's more concise than ARM templates.

**Files:**
- `bicep/main.bicep` - Main deployment template
- `bicep/function-app.bicep` - Function App resources
- `bicep/database.bicep` - Database (Cosmos DB/Table Storage)
- `bicep/storage.bicep` - Storage accounts
- `bicep/monitoring.bicep` - Application Insights

**Deploy:**
```bash
az deployment group create \
  --resource-group your-resource-group \
  --template-file bicep/main.bicep \
  --parameters location=eastus
```

### Terraform (Alternative)
Terraform is a popular multi-cloud IaC tool.

**Files:**
- `terraform/main.tf` - Main configuration
- `terraform/variables.tf` - Variable definitions
- `terraform/outputs.tf` - Output values

**Deploy:**
```bash
cd terraform
terraform init
terraform plan
terraform apply
```

## Quick Start

The migration plan includes Bicep templates for:
- Resource Group
- Function App (Consumption plan)
- Cosmos DB (Serverless)
- Redis Cache (Basic tier)
- Application Insights
- Static Web App
- Key Vault

See [AZURE_MIGRATION_PLAN.md](../AZURE_MIGRATION_PLAN.md) for Azure CLI commands to create resources manually.

## Best Practices

1. **Parameterize**: Use parameters for values that change between environments
2. **Modularize**: Split templates by resource type
3. **Version Control**: Keep IaC in git
4. **Test**: Use `az deployment group validate` before deploying
5. **State Management**: For Terraform, use remote state (Azure Storage)
