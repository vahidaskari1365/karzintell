# GitHub Actions Workflows

This folder is intentionally empty.

Karzintell uses a **webhook-based CI/CD** approach instead of GitHub Actions,
because the hostiran (Iran shared hosting) firewall blocks:

1. GitHub Actions runner IP addresses
2. Azure Blob Storage endpoints (used by GitHub to store logs)

## How CI/CD Works

```
GitHub (push to main)
    ↓
GitHub Webhook → smee.io (proxy)
    ↓
Local Listener Script (on developer's Windows machine)
    ↓
Local Deploy Script:
    ├── Build API + Web locally
    ├── SCP upload to cPanel server
    └── SSH: run deploy-on-server.sh
```

## Setup

See [`../DEPLOY-CICD.md`](../DEPLOY-CICD.md) for complete setup instructions.

## Files

- [`../scripts/ci-listener.js`](../scripts/ci-listener.js) — Local webhook listener
- [`../scripts/local-deploy.js`](../scripts/local-deploy.js) — Build + deploy script
- [`../scripts/start-listener.bat`](../scripts/start-listener.bat) — Windows launcher
- [`../scripts/deploy-on-server.sh`](../scripts/deploy-on-server.sh) — Server-side deploy
