# Static Web App

This directory contains the frontend application for Azure Static Web Apps deployment.

## Structure

- **src/** - Source files
  - **index.html** - Main HTML file
  - **js/** - JavaScript modules
  - **css/** - Stylesheets
  - **assets/** - Images and other assets
- **staticwebapp.config.json** - Azure Static Web Apps configuration

## Development

```bash
cd web/src
npx http-server . -p 8080
```

Visit `http://localhost:8080`

## API Configuration

The frontend communicates with Azure Functions. Update the API base URL in `src/js/api-client.js`:

```javascript
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:7071/api'
  : 'https://your-function-app.azurewebsites.net/api';
```

## Deployment

Azure Static Web Apps can be deployed via:
1. **GitHub Actions** (automated)
2. **Azure CLI** (manual)

```bash
az staticwebapp deploy \
  --name your-static-web-app \
  --resource-group your-resource-group \
  --source ./src
```

## Migration Notes

The original `index.html` (3,691 lines) should be refactored into:
- Separate HTML, CSS, and JavaScript files
- Modular JavaScript (ES6 modules)
- External stylesheet

See [AZURE_MIGRATION_PLAN.md](../AZURE_MIGRATION_PLAN.md) for refactoring guidance.
