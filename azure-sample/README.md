# Azure Sample Code - Quick Reference

This directory contains sample Azure Functions code to help understand the migration structure. These are simplified examples showing the key patterns.

## Directory Structure

```
azure-sample/
├── functions/                    # Azure Functions backend
│   ├── webhook-handler/         # Webhook receiver
│   ├── api-dashboard/           # Dashboard API
│   ├── shared/                  # Shared utilities
│   ├── host.json               # Functions host configuration
│   ├── local.settings.json     # Local development settings
│   └── package.json            # Node.js dependencies
│
└── database/                    # Database scripts
    ├── schema.sql              # Table definitions
    └── stored-procedures.sql   # Cleanup procedures
```

## Usage

These are reference examples only. They show:
1. How to structure Azure Functions
2. How to interact with Azure SQL Database
3. How to use Redis for caching
4. How to send emails via SendGrid

For the full migration, you would:
1. Create a new repository
2. Use these as templates
3. Port all GAS functions to Azure Functions
4. Test locally with `func start`
5. Deploy via GitHub Actions

## Key Files

- `webhook-handler/index.js` - Receives TradingView webhooks
- `api-dashboard/index.js` - Serves dashboard data
- `shared/database.js` - Database connection pooling
- `shared/redis.js` - Redis cache client
- `shared/email.js` - Email sending utility
- `database/schema.sql` - Full database schema

## Local Testing

```bash
# Install dependencies
cd functions
npm install

# Start Functions locally
func start

# Test webhook endpoint
curl -X POST http://localhost:7071/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"scrip":"AAPL","reason":"Volume Surge"}'

# Test dashboard endpoint
curl http://localhost:7071/api/dashboard
```

## Next Steps

1. Review the sample code
2. Understand the patterns
3. Create your new repository
4. Follow the AZURE_DEPLOYMENT_GUIDE.md
5. Migrate code systematically
