#!/usr/bin/env node
/**
 * ============================================================================
 * Karzintell Local Deploy Script
 * ============================================================================
 *
 * این اسکریپت روی ویندوز شما اجرا می‌شود و:
 *   1. کد را از git pull می‌کند
 *   2. API و Web را build می‌کند
 *   3. فایل‌های build شده را با SCP به سرور آپلود می‌کند
 *   4. اسکریپت deploy-on-server.sh را از طریق SSH اجرا می‌کند
 *
 * استفاده:
 *   node scripts/local-deploy.js
 *
 * تنظیمات از فایل .env.local در ریشه پروژه:
 *   SSH_HOST=linux25.centraldnserver.com
 *   SSH_PORT=22
 *   SSH_USER=karzinte
 *   SSH_PRIVATE_KEY_PATH=C:\Users\YOU\.ssh\karzintell_github_actions
 * ============================================================================
 */

const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// ── Load .env.local ────────────────────────────────────────────────────────
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const idx = line.indexOf('=');
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  });
}

// ── Configuration ───────────────────────────────────────────────────────────
const SSH_HOST = process.env.SSH_HOST;
const SSH_PORT = process.env.SSH_PORT || '22';
const SSH_USER = process.env.SSH_USER;
const SSH_KEY = process.env.SSH_PRIVATE_KEY_PATH || path.join(os.homedir(), '.ssh', 'karzintell_github_actions');
const PROJECT_ROOT = path.join(__dirname, '..');
const COMMIT_SHA = process.env.DEPLOY_COMMIT || 'HEAD';

if (!SSH_HOST || !SSH_USER) {
  console.error('❌ SSH_HOST یا SSH_USER تنظیم نشده. فایل .env.local را چک کنید.');
  process.exit(1);
}

// ── Color helpers ───────────────────────────────────────────────────────────
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(icon, color, msg) {
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`${colors.gray}[${ts}]${colors.reset} ${color}${icon}${colors.reset} ${msg}`);
}

function step(name) {
  console.log('');
  log('━━━', colors.blue, ` ${name} ` + '━'.repeat(Math.max(0, 50 - name.length)));
}

// ── Run command helper ──────────────────────────────────────────────────────
function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    cwd: options.cwd || PROJECT_ROOT,
    stdio: options.stdio || 'inherit',
    shell: options.shell !== false,
    env: { ...process.env, ...options.env },
  });

  if (result.status !== 0 && !options.allowFail) {
    throw new Error(`Command failed: ${cmd} ${args.join(' ')} (exit ${result.status})`);
  }

  return result;
}

// ── SSH helpers ────────────────────────────────────────────────────────────
function sshKeyArgs() {
  // Normalize path for Windows/Git Bash
  const keyPath = SSH_KEY.replace(/\\/g, '/');
  return ['-i', keyPath, '-o', 'StrictHostKeyChecking=no', '-o', 'BatchMode=yes'];
}

function sshRemote(command) {
  const args = [
    'ssh',
    ...sshKeyArgs(),
    '-p', SSH_PORT,
    `${SSH_USER}@${SSH_HOST}`,
    command,
  ];
  log('🔌', colors.cyan, `SSH: ${command.slice(0, 80)}${command.length > 80 ? '...' : ''}`);
  const result = spawnSync(args[0], args.slice(1), { stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    throw new Error(`SSH command failed: ${command}`);
  }
}

function scpUpload(localPath, remotePath) {
  const args = [
    'scp',
    ...sshKeyArgs(),
    '-P', SSH_PORT,
    localPath,
    `${SSH_USER}@${SSH_HOST}:${remotePath}`,
  ];
  log('📤', colors.cyan, `Upload: ${path.basename(localPath)} → ${remotePath}`);
  const result = spawnSync(args[0], args.slice(1), { stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    throw new Error(`SCP failed: ${localPath}`);
  }
}

// ── Main deploy function ────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Karzintell Deploy Script                                ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  Commit:  ${COMMIT_SHA.slice(0, 45).padEnd(45)}║`);
  console.log(`║  Server:  ${SSH_USER}@${SSH_HOST}:${SSH_PORT}`.slice(0, 59).padEnd(60) + '║');
  console.log(`║  SSH Key: ${SSH_KEY.slice(0, 45).padEnd(45)}║`);
  console.log('╚════════════════════════════════════════════════════════════╝');

  // ─── Step 1: Git pull ─────────────────────────────────────────────────
  step('۱) Git Pull');
  try {
    // First fetch to get latest changes from remote
    run('git', ['fetch', 'origin'], { cwd: PROJECT_ROOT });
    // Then hard reset to ensure we have the EXACT code from remote
    // This prevents stale local changes from breaking the deploy
    run('git', ['reset', '--hard', 'origin/main'], { cwd: PROJECT_ROOT });
    log('✅', colors.green, 'کد از remote به‌روز شد (git fetch + reset --hard)');
  } catch (e) {
    log('⚠️', colors.yellow, `git fetch/reset ناموفق بود: ${e.message}`);
    log('ℹ️', colors.gray, 'تلاش با git pull معمولی...');
    try {
      run('git', ['pull', 'origin', 'main'], { cwd: PROJECT_ROOT });
      log('✅', colors.green, 'کد به‌روز شد (git pull)');
    } catch (e2) {
      log('⚠️', colors.yellow, `git pull هم ناموفق بود: ${e2.message}`);
      log('ℹ️', colors.gray, 'ادامه با کد فعلی...');
    }
  }

  // ─── Step 2: Build API ───────────────────────────────────────────────
  step('۲) Build API (NestJS)');
  log('📦', colors.cyan, 'Installing dependencies...');
  run('npm', ['ci', '--legacy-peer-deps'], { cwd: path.join(PROJECT_ROOT, 'apps', 'api') });

  log('🔨', colors.cyan, 'Building...');
  run('npm', ['run', 'build'], { cwd: path.join(PROJECT_ROOT, 'apps', 'api') });

  // Verify dist exists
  const apiDist = path.join(PROJECT_ROOT, 'apps', 'api', 'dist');
  if (!fs.existsSync(apiDist)) {
    throw new Error('Build failed: dist/ not found');
  }
  log('✅', colors.green, 'API build complete');

  // ─── Step 3: Build Web ───────────────────────────────────────────────
  step('۳) Build Web (Next.js)');
  log('📦', colors.cyan, 'Installing dependencies...');
  run('npm', ['ci', '--legacy-peer-deps'], { cwd: path.join(PROJECT_ROOT, 'apps', 'web') });

  log('🔨', colors.cyan, 'Building...');
  run('npm', ['run', 'build'], {
    cwd: path.join(PROJECT_ROOT, 'apps', 'web'),
    env: {
      NEXT_PUBLIC_API_URL: '/api/v1',
      NEXT_PUBLIC_SITE_URL: 'https://karzintell.com',
      NEXT_PUBLIC_APP_URL: 'https://karzintell.com',
      BACKEND_URL: 'https://api.karzintell.com',
    },
  });

  // Verify .next exists
  const webNext = path.join(PROJECT_ROOT, 'apps', 'web', '.next');
  if (!fs.existsSync(webNext)) {
    throw new Error('Build failed: .next/ not found');
  }
  log('✅', colors.green, 'Web build complete');

  // ─── Step 4: Package tarballs ────────────────────────────────────────
  step('۴) Package Tarballs');
  const apiTarball = path.join(PROJECT_ROOT, 'api-deploy.tar.gz');
  const webTarball = path.join(PROJECT_ROOT, 'web-deploy.tar.gz');

  log('📦', colors.cyan, 'Creating api-deploy.tar.gz...');
  run('tar', ['-czf', apiTarball, '-C', 'apps/api', 'dist', 'package.json', 'package-lock.json', '.npmrc']);

  log('📦', colors.cyan, 'Creating web-deploy.tar.gz...');
  run('tar', ['-czf', webTarball, '-C', 'apps/web', '.next', 'public', 'server.js', 'package.json', 'package-lock.json', 'next.config.mjs', 'middleware.ts', 'postcss.config.mjs', '.npmrc']);

  log('✅', colors.green, `API tarball: ${(fs.statSync(apiTarball).size / 1024 / 1024).toFixed(2)} MB`);
  log('✅', colors.green, `Web tarball: ${(fs.statSync(webTarball).size / 1024 / 1024).toFixed(2)} MB`);

  // ─── Step 5: Upload to server ───────────────────────────────────────
  step('۵) Upload to Server');
  sshRemote('mkdir -p /home/karzinte/deploy-staging');
  scpUpload(apiTarball, '/home/karzinte/deploy-staging/');
  scpUpload(webTarball, '/home/karzinte/deploy-staging/');
  scpUpload(path.join(PROJECT_ROOT, 'scripts', 'deploy-on-server.sh'), '/home/karzinte/deploy-staging/');
  log('✅', colors.green, 'فایل‌ها آپلود شدند');

  // ─── Step 6: Deploy on server ────────────────────────────────────────
  step('۶) Deploy on Server');
  sshRemote('bash /home/karzinte/deploy-staging/deploy-on-server.sh 2>&1');

  // ─── Step 7: Verify ──────────────────────────────────────────────────
  step('۷) Verify Deployment');
  log('⏳', colors.blue, 'صبر ۱۰ ثانیه برای restart اپ‌ها...');
  await new Promise(r => setTimeout(r, 10000));

  try {
    log('🌐', colors.cyan, 'تست API...');
    const apiResult = spawnSync('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', 'https://api.karzintell.com/api/v1/health'], { shell: true });
    log('📊', colors.gray, `  API: HTTP ${apiResult.stdout.toString().trim()}`);

    log('🌐', colors.cyan, 'تست Web...');
    const webResult = spawnSync('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', 'https://karzintell.com'], { shell: true });
    log('📊', colors.gray, `  Web: HTTP ${webResult.stdout.toString().trim()}`);
  } catch (e) {
    log('⚠️', colors.yellow, 'تست خودکار ناموفق بود — دستی چک کنید');
  }

  // ─── Cleanup ────────────────────────────────────────────────────────
  step('۸) Cleanup');
  try {
    fs.unlinkSync(apiTarball);
    fs.unlinkSync(webTarball);
    log('✅', colors.green, 'فایل‌های موقت محلی پاک شدند');
  } catch {}

  // ─── Done ────────────────────────────────────────────────────────────
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ Deploy موفقیت‌آمیز بود!                                ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  log('🌐', colors.cyan, 'سایت: https://karzintell.com');
  log('🌐', colors.cyan, 'API:  https://api.karzintell.com/api/v1/health');
  log('🔐', colors.cyan, 'پنل:  https://karzintell.com/admin');
}

main().catch((err) => {
  console.log('');
  log('💥', colors.red, `Deploy شکست خورد: ${err.message}`);
  console.log('');
  process.exit(1);
});
