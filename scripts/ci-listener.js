#!/usr/bin/env node
/**
 * ============================================================================
 * Karzintell CI Listener — Webhook-based CI/CD
 * ============================================================================
 *
 * این اسکریپت روی ویندوز شما اجرا می‌شود و به smee.io متصل می‌شود.
 * وقتی GitHub یک webhook می‌فرستد، این اسکریپت آن را دریافت کرده و
 * اسکریپت deploy را اجرا می‌کند.
 *
 * نحوه کار:
 *   1. GitHub → webhook → smee.io (پروکسی رایگان)
 *   2. این اسکریپت به smee.io متصل می‌شود (Server-Sent Events)
 *   3. وقتی webhook دریافت شد، signature را بررسی می‌کند
 *   4. اگر معتبر بود، scripts/local-deploy.js را اجرا می‌کند
 *
 * استفاده:
 *   node scripts/ci-listener.js
 *
 * تنظیمات از طریق متغیرهای محیطی یا فایل .env.local در ریشه پروژه:
 *   SMEE_URL=https://smee.io/your-channel
 *   WEBHOOK_SECRET=your-webhook-secret
 *   REPO_OWNER=vahidaskari1365
 *   REPO_NAME=karzintell
 *   BRANCH=main
 * ============================================================================
 */

const https = require('https');
const http = require('http');
const crypto = require('crypto');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// ── Load .env.local if exists ──────────────────────────────────────────────
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
    // Remove surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  });
}

// ── Configuration ──────────────────────────────────────────────────────────
const SMEE_URL = process.env.SMEE_URL;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';
const REPO_OWNER = process.env.REPO_OWNER || 'vahidaskari1365';
const REPO_NAME = process.env.REPO_NAME || 'karzintell';
const BRANCH = process.env.BRANCH || 'main';

if (!SMEE_URL) {
  console.error('❌ SMEE_URL تنظیم نشده. لطفاً فایل .env.local را بسازید.');
  console.error('   نمونه:');
  console.error('   SMEE_URL=https://smee.io/your-unique-channel');
  console.error('   WEBHOOK_SECRET=your-secret');
  process.exit(1);
}

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  Karzintell CI Listener                                  ║');
console.log('╠════════════════════════════════════════════════════════════╣');
console.log(`║  SMEE URL:      ${SMEE_URL.padEnd(45).slice(0, 45)}║`);
console.log(`║  Repo:          ${REPO_OWNER}/${REPO_NAME}`.padEnd(60) + '║');
console.log(`║  Branch:        ${BRANCH.padEnd(45).slice(0, 45)}║`);
console.log(`║  Webhook Secret: ${WEBHOOK_SECRET ? '✅ Set' : '⚠️  Not set'}`.padEnd(60) + '║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');

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

// ── Verify webhook signature ────────────────────────────────────────────────
function verifySignature(payload, signature) {
  if (!WEBHOOK_SECRET) return true;
  if (!signature) return false;

  const expected = 'sha256=' + crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

// ── Run deploy script ───────────────────────────────────────────────────────
let isDeploying = false;

function runDeploy(commitSha, pusher) {
  if (isDeploying) {
    log('⏭️', colors.yellow, 'Deploy در حال اجراست — این webhook نادیده گرفته شد');
    return;
  }

  isDeploying = true;
  log('🚀', colors.magenta, `شروع deploy برای commit ${commitSha.slice(0, 7)}`);
  if (pusher) log('👤', colors.cyan, `Push توسط: ${pusher}`);

  const deployScript = path.join(__dirname, 'local-deploy.js');
  const shortSha = commitSha.slice(0, 7);

  // Run deploy script
  const child = spawn('node', [deployScript], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env, DEPLOY_COMMIT: commitSha },
    shell: true,
  });

  child.on('close', (code) => {
    isDeploying = false;
    if (code === 0) {
      log('✅', colors.green, `Deploy موفقیت‌آمیز بود! (${shortSha})`);
    } else {
      log('❌', colors.red, `Deploy شکست خورد با کد ${code} (${shortSha})`);
    }
    log('⏳', colors.blue, 'منتظر webhook بعدی...');
  });
}

// ── Connect to smee.io ─────────────────────────────────────────────────────
function connectToSmee() {
  const url = new URL(SMEE_URL);
  log('🔌', colors.blue, `اتصال به ${url.host}...`);

  const req = https.get({
    hostname: url.hostname,
    path: url.pathname + '/events',
    headers: {
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
    timeout: 30000,
  }, (res) => {
    if (res.statusCode !== 200) {
      log('❌', colors.red, `خطا در اتصال به smee.io: HTTP ${res.statusCode}`);
      log('🔄', colors.yellow, 'تلاش مجدد در ۵ ثانیه...');
      setTimeout(connectToSmee, 5000);
      return;
    }

    log('✅', colors.green, 'متصل شدیم! منتظر webhook...');
    log('⏳', colors.blue, 'برای خروج Ctrl+C بزن');

    let buffer = '';

    res.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete line

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            handleWebhook(data);
          } catch (e) {
            // Not JSON, ignore
          }
        }
      }
    });

    res.on('end', () => {
      log('⚠️', colors.yellow, 'اتصال قطع شد');
      log('🔄', colors.yellow, 'تلاش مجدد در ۵ ثانیه...');
      setTimeout(connectToSmee, 5000);
    });

    res.on('error', (err) => {
      log('❌', colors.red, `خطا: ${err.message}`);
      setTimeout(connectToSmee, 5000);
    });
  });

  req.on('error', (err) => {
    log('❌', colors.red, `خطا در اتصال: ${err.message}`);
    log('🔄', colors.yellow, 'تلاش مجدد در ۵ ثانیه...');
    setTimeout(connectToSmee, 5000);
  });

  req.on('timeout', () => {
    log('⏰', colors.yellow, 'timeout در اتصال — تلاش مجدد...');
    req.destroy();
    setTimeout(connectToSmee, 5000);
  });
}

// ── Handle webhook payload ─────────────────────────────────────────────────
function handleWebhook(data) {
  // smee.io wraps the original payload in data.body (when forwarded)
  // or it might be the raw payload itself
  const payload = data.body || data;
  const event = data['x-github-event'] || payload['x-github-event'];

  log('📨', colors.cyan, `Webhook دریافت شد: event=${event || 'unknown'}`);

  // Only handle push events
  if (event !== 'push') {
    log('⏭️', colors.gray, `نادیده گرفته شد (فقط push پردازش می‌شود)`);
    return;
  }

  const body = typeof payload === 'string' ? JSON.parse(payload) : payload;
  const ref = body.ref;
  const repoFullName = body.repository?.full_name;

  // Check repo
  if (repoFullName !== `${REPO_OWNER}/${REPO_NAME}`) {
    log('⏭️', colors.gray, `ریپو متفاوت: ${repoFullName} — نادیده گرفته شد`);
    return;
  }

  // Check branch
  const pushedBranch = ref?.replace('refs/heads/', '');
  if (pushedBranch !== BRANCH) {
    log('⏭️', colors.gray, `برنچ متفاوت: ${pushedBranch} — نادیده گرفته شد`);
    return;
  }

  // Verify signature
  const signature = data['x-hub-signature-256'] || data['x-hub-signature'];
  if (WEBHOOK_SECRET && signature) {
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    if (!verifySignature(payloadStr, signature)) {
      log('❌', colors.red, 'اعتبارسنجی signature ناموفق بود — webhook رد شد');
      return;
    }
    log('✅', colors.green, 'signature معتبر');
  }

  // Get commit info
  const commitSha = body.after || body.head_commit?.id;
  const pusher = body.pusher?.name || body.sender?.login;

  if (!commitSha || commitSha === '0000000000000000000000000000000000000000') {
    log('⏭️', colors.gray, 'commit نامعتبر (احتمالاً حذف برنچ)');
    return;
  }

  log('🎯', colors.magenta, `push به ${BRANCH} — commit: ${commitSha.slice(0, 7)}`);

  // Trigger deploy
  runDeploy(commitSha, pusher);
}

// ── Start ───────────────────────────────────────────────────────────────────
console.log('');
connectToSmee();

// Keep process alive
process.on('SIGINT', () => {
  console.log('\n');
  log('👋', colors.yellow, 'خروج...');
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  log('💥', colors.red, `خطای غیرمنتظره: ${err.message}`);
  log('🔄', colors.yellow, 'ادامه کار...');
});

process.on('unhandledRejection', (err) => {
  log('💥', colors.red, `Promise rejection: ${err}`);
  log('🔄', colors.yellow, 'ادامه کار...');
});
