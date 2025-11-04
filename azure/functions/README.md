# Azure Functions

This directory contains all Azure Functions for the application.

## Structure

- **webhook-handler/** - HTTP trigger for TradingView webhooks
- **api/** - HTTP triggers for API endpoints
  - **auth/** - Authentication endpoints (OTP generation, verification, session management)
  - **data/** - Data retrieval endpoints (dashboard, historical data)
  - **ai/** - AI integration endpoints (Gemini analysis, chat)
- **scheduled/** - Timer triggers (daily maintenance)

## Creating a New Function

```bash
cd functions
func new --name my-function --template "HTTP trigger" --authlevel anonymous
```

## Running Locally

```bash
cd functions
func start
```

The functions will be available at `http://localhost:7071/api/function-name`

## Deployment

```bash
func azure functionapp publish YOUR_FUNCTION_APP_NAME
```

## Configuration

Functions use environment variables from:
- Local: `local.settings.json` (git-ignored)
- Azure: Application Settings in the Function App

See `../local.settings.json.example` for required variables.

## Reference

See [../AZURE_MIGRATION_PLAN.md](../AZURE_MIGRATION_PLAN.md) for implementation examples.
