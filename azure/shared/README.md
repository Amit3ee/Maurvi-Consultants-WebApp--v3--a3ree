# Shared Modules

This directory contains shared utilities and modules used across Azure Functions.

## Structure

- **database/** - Database clients (Cosmos DB, Table Storage)
- **cache/** - Redis cache client
- **auth/** - Authentication utilities (session management, OTP generation, email)
- **models/** - Data models (Signal, Session, User)
- **utils/** - General utilities (date formatting, validation, logging)

## Usage

```javascript
// Example: Using the Cosmos DB client
const cosmosService = require('../shared/database/cosmos-client');

async function handler(request, context) {
  const signals = await cosmosService.getSignalsByDate('2025-01-15');
  // ...
}
```

## Best Practices

1. **Singleton Pattern**: Database and cache clients should be singletons
2. **Error Handling**: All functions should handle errors gracefully
3. **Logging**: Use context.log() for structured logging
4. **Environment Variables**: Access via process.env

## Implementation

See [../AZURE_MIGRATION_PLAN.md](../AZURE_MIGRATION_PLAN.md) for code examples of each module.
