#!/bin/bash
# ============================================================================
# Karzintell — Server-side Deploy Script
#
# این اسکریپت روی سرور cPanel/CloudLinux اجرا می‌شود.
# توسط GitHub Actions فراخوانی می‌شود.
#
# فرض می‌کند:
#   - tarball های api-deploy.tar.gz و web-deploy.tar.gz در STAGING هستند
#   - فایل .env در مسیر API app وجود دارد (برای migration)
#   - Node.js 20 از مسیر /opt/alt/alt-nodejs20/root/usr/bin قابل دسترس است
# ============================================================================

set -euo pipefail

# ── Configuration ──────────────────────────────────────────────────────────
NODE_BIN=/opt/alt/alt-nodejs20/root/usr/bin
API_APP=/home/karzinte/karzinte/karzintell-api
WEB_APP=/home/karzinte/karzintell-web
STAGING=/home/karzinte/deploy-staging
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log()  { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"; }
ok()   { echo -e "${GREEN}[$(date '+%H:%M:%S')] ✅${NC} $1"; }
warn() { echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠️${NC} $1"; }
err()  { echo -e "${RED}[$(date '+%H:%M:%S')] ❌${NC} $1"; }

# ── Pre-flight checks ──────────────────────────────────────────────────────
log "=========================================="
log "  Karzintell Deploy — $(date '+%Y-%m-%d %H:%M:%S')"
log "=========================================="

# Check node binary
if [ ! -f "$NODE_BIN/node" ]; then
    err "Node.js not found at $NODE_BIN/node"
    exit 1
fi
NODE_VERSION=$("$NODE_BIN/node" -v)
log "Node.js: $NODE_VERSION"
log "npm:     $($NODE_BIN/npm -v)"

# Check tarballs exist
if [ ! -f "$STAGING/api-deploy.tar.gz" ] || [ ! -f "$STAGING/web-deploy.tar.gz" ]; then
    err "Deployment tarballs not found in $STAGING"
    ls -la "$STAGING/" 2>/dev/null || true
    exit 1
fi

# Check app directories exist
if [ ! -d "$API_APP" ] || [ ! -d "$WEB_APP" ]; then
    err "App directories not found:"
    err "  API: $API_APP"
    err "  Web: $WEB_APP"
    exit 1
fi

ok "Pre-flight checks passed"

# ───────────────────────────────────────────────────────────────────────────
# 1) Deploy API
# ───────────────────────────────────────────────────────────────────────────
log ""
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "  [1/5] Deploying API (NestJS Backend)"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd "$API_APP"

# Backup current dist (for rollback)
log "Backing up current dist/..."
if [ -d "dist" ]; then
    rm -rf dist.bak 2>/dev/null || true
    cp -a dist dist.bak
    ok "Backup: dist/ → dist.bak/"
else
    warn "No existing dist/ to backup"
fi

# REMOVE old dist completely before extracting new one
# This prevents stale .js files from old modules lingering on the server
log "Removing old dist/..."
rm -rf dist 2>/dev/null || true
ok "Old dist/ removed"

# Extract new files (overwrites dist/, package.json, package-lock.json, .npmrc)
log "Extracting new API files..."
tar -xzf "$STAGING/api-deploy.tar.gz" -C "$API_APP"
ok "Files extracted"

# Verify sellers module exists in the new dist
if [ -d "dist/modules/sellers" ]; then
    ok "Sellers module found in new dist/"
else
    warn "WARNING: Sellers module NOT found in dist/modules/sellers/!"
    warn "This means vendor endpoints will return 404."
fi

# Also clean npm cache to ensure fresh install
log "Cleaning npm cache..."
"$NODE_BIN/npm" cache clean --force 2>/dev/null || true
ok "npm cache cleaned"

# Install production dependencies
log "Installing production dependencies (this may take a minute)..."
"$NODE_BIN/npm" install --omit=dev --no-audit --no-fund --legacy-peer-deps 2>&1 | tail -5
ok "Dependencies installed"

# Run database migrations
log "Running database migrations..."
if [ -f ".env" ]; then
    "$NODE_BIN/node" dist/database/run-migrations.js 2>&1 || {
        err "Migration failed! Rolling back dist/..."
        rm -rf dist
        mv dist.bak dist 2>/dev/null || true
        err "Rolled back. Please check .env and database credentials."
        exit 1
    }
    ok "Migrations completed"
else
    warn "No .env file found at $API_APP/.env"
    warn "Trying to source env vars from nodevenv..."

    # Try to find env vars in nodevenv
    ENVVARS_FILE="$HOME/nodevenv/karzinte/karzintell-api/20/etc/envvars"
    if [ -f "$ENVVARS_FILE" ]; then
        log "Found envvars at: $ENVVARS_FILE"
        set -a
        source "$ENVVARS_FILE"
        set +a
        "$NODE_BIN/node" dist/database/run-migrations.js 2>&1 || {
            err "Migration failed even with nodevenv envvars!"
            err "Please create .env file at: $API_APP/.env"
            rm -rf dist
            mv dist.bak dist 2>/dev/null || true
            exit 1
        }
        ok "Migrations completed (using nodevenv envvars)"
    else
        warn "envvars file not found. Skipping migrations."
        warn "To enable migrations, create: $API_APP/.env"
        warn "With at least: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME"
    fi
fi

# Clean up dist backup on success
rm -rf dist.bak 2>/dev/null || true

# Restart API app (lsnode/Passenger restart mechanism)
log "Triggering API restart..."
mkdir -p tmp
touch tmp/restart.txt
ok "API restart triggered"

# ───────────────────────────────────────────────────────────────────────────
# 2) Deploy Web
# ───────────────────────────────────────────────────────────────────────────
log ""
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "  [2/5] Deploying Web (Next.js Frontend)"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd "$WEB_APP"

# Backup current .next (for rollback)
log "Backing up current .next/..."
if [ -d ".next" ]; then
    rm -rf .next.bak 2>/dev/null || true
    cp -a .next .next.bak
    ok "Backup: .next/ → .next.bak/"
else
    warn "No existing .next/ to backup"
fi

# REMOVE old .next completely before extracting new one
# This prevents stale cached pages from old routes lingering on the server
log "Removing old .next/..."
rm -rf .next 2>/dev/null || true
ok "Old .next/ removed"

# Extract new files
log "Extracting new Web files..."
tar -xzf "$STAGING/web-deploy.tar.gz" -C "$WEB_APP"
ok "Files extracted"

# Verify vendor route exists in the new build
if [ -d ".next/server/app/vendor" ] || [ -f ".next/server/app/vendor/page.html" ] || [ -d ".next/server/app/vendor/products" ]; then
    ok "Vendor routes found in new .next/"
else
    warn "Vendor routes not clearly found — checking build manifest..."
    if [ -f ".next/routes-manifest.json" ]; then
        if grep -q '"\/vendor"' .next/routes-manifest.json 2>/dev/null || grep -q '/vendor/' .next/routes-manifest.json 2>/dev/null; then
            ok "Vendor routes confirmed in routes-manifest.json"
        else
            warn "Vendor routes NOT found in routes-manifest.json!"
        fi
    fi
fi

# Also clean npm cache for web
log "Cleaning npm cache..."
"$NODE_BIN/npm" cache clean --force 2>/dev/null || true
ok "npm cache cleaned"

# Install production dependencies
log "Installing production dependencies (this may take a minute)..."
"$NODE_BIN/npm" install --omit=dev --no-audit --no-fund --legacy-peer-deps 2>&1 | tail -5
ok "Dependencies installed"

# Clean up .next backup on success
rm -rf .next.bak 2>/dev/null || true

# Restart Web app
log "Triggering Web restart..."
mkdir -p tmp
touch tmp/restart.txt
ok "Web restart triggered"

# ───────────────────────────────────────────────────────────────────────────
# 3) Trigger restart via HTTP requests
# ───────────────────────────────────────────────────────────────────────────
log ""
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "  [3/5] Triggering restart via HTTP"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sleep 3

# Touch restart.txt again + curl to trigger the restart
touch "$API_APP/tmp/restart.txt"
touch "$WEB_APP/tmp/restart.txt"

log "Sending test requests to trigger lsnode restart..."
API_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 https://api.karzintell.com/api/v1/health 2>/dev/null || echo "000")
log "  API  health: HTTP $API_CODE"

WEB_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 https://karzintell.com 2>/dev/null || echo "000")
log "  Web  home:   HTTP $WEB_CODE"

# Wait and re-check
sleep 5
API_CODE2=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 https://api.karzintell.com/api/v1/health 2>/dev/null || echo "000")
WEB_CODE2=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 https://karzintell.com 2>/dev/null || echo "000")
log "  API  health (retry): HTTP $API_CODE2"
log "  Web  home   (retry): HTTP $WEB_CODE2"

# ───────────────────────────────────────────────────────────────────────────
# 4) Verify processes are running
# ───────────────────────────────────────────────────────────────────────────
log ""
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "  [4/5] Verifying processes"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

API_PIDS=$(ps aux | grep "lsnode.*karzintell-api" | grep -v grep | awk '{print $2}' || true)
WEB_PIDS=$(ps aux | grep "lsnode.*karzintell-web" | grep -v grep | awk '{print $2}' || true)

if [ -n "$API_PIDS" ]; then
    ok "API process running (PID: $(echo $API_PIDS | tr '\n' ' '))"
else
    warn "API process not found — it may need a manual restart from cPanel"
fi

if [ -n "$WEB_PIDS" ]; then
    ok "Web process running (PID: $(echo $WEB_PIDS | tr '\n' ' '))"
else
    warn "Web process not found — it may need a manual restart from cPanel"
fi

# ───────────────────────────────────────────────────────────────────────────
# 5) Cleanup
# ───────────────────────────────────────────────────────────────────────────
log ""
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "  [5/5] Cleanup"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Remove staging files
rm -f "$STAGING/api-deploy.tar.gz" "$STAGING/web-deploy.tar.gz" "$STAGING/deploy-on-server.sh"
ok "Staging files cleaned"

# Show disk usage
log "Disk usage:"
du -sh "$API_APP" "$WEB_APP" 2>/dev/null || true

# ───────────────────────────────────────────────────────────────────────────
# Summary
# ───────────────────────────────────────────────────────────────────────────
log ""
log "=========================================="
ok "Deploy completed successfully!"
log "  Time: $(date '+%Y-%m-%d %H:%M:%S')"
log "=========================================="
log ""
log "💡 If the site isn't loading correctly:"
log "   1. Check cPanel → Node.js Apps → Restart both apps"
log "   2. Check stderr.log in each app directory"
log "   3. Verify .env exists at: $API_APP/.env"
log ""
