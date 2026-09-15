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
 * استفاده:
 *   node scripts/ci-listener.js
 * ============================================================================
 */

const https = require('https');
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
  process.exit(1);
}

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  Karzintell CI Listener                                  ║');
console.log('╠════════════════════════════════════════════════════════════╣');
console.log(`║  SMEE URL:      ${SMEE_URL.padEnd(45).slice(0, 45)}║`);
console.log(`║  Repo:          ${REPO_OWNER}/${REPO_NAME}`.slice(0, 59).padEnd(60) + '║');
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

  const child = spawn('node', [deployScript], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env, DEPLOY_COMMIT: commitSha },
    shell: false,
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

// ── Parse smee.io event data ──────────────────────────────────────────────
function parseSmeeEvent(data) {
  // smee.io sends SSE events in this format:
  //   data: {"x-github-event":"push","body":{...},"x-hub-signature-256":"...","timestamp":...}
  //
  // The actual GitHub payload is in data.body
  // The event type is in data['x-github-event']
  // The signature is in data['x-hub-signature-256']

  let event = null;
  let body = null;
  let signature = null;

  // Event type — smee.io stores it as 'x-github-event' in the wrapper
  event = data['x-github-event'] ||
          data['X-Github-Event'] ||
          data['X-GitHub-Event'] ||
          null;

  // Signature — smee.io stores it as 'x-hub-signature-256'
  signature = data['x-hub-signature-256'] ||
             data['X-Hub-Signature-256'] ||
             data['x-hub-signature'] ||
             data['X-Hub-Signature'] ||
             null;

  // Body — the actual GitHub payload is in data.body
  if (data.body) {
    if (typeof data.body === 'string') {
      try {
        body = JSON.parse(data.body);
      } catch {
        body = null;
      }
    } else {
      body = data.body;
    }
  }

  return { event, body, signature };
}

// ── Handle webhook payload ─────────────────────────────────────────────────
function handleWebhook(rawData) {
  // Debug: log first 200 chars to see structure
  const debugStr = typeof rawData === 'string' ? rawData : JSON.stringify(rawData);
  console.log(`[debug] handleWebhook received: ${debugStr.slice(0, 200)}...`);

  const { event, body, signature } = parseSmeeEvent(rawData);

  // Debug: log parsed result
  console.log(`[debug] parsed: event=${event || 'null'}, body=${body ? 'yes' : 'no'}, signature=${signature ? 'yes' : 'no'}`);

  // Debug: log what we received (truncated)
  const eventDisplay = event || 'unknown';
  log('📨', colors.cyan, `Webhook دریافت شد: event=${eventDisplay}`);

  // Only handle push events
  if (event !== 'push') {
    if (event === 'ping') {
      log('🏓', colors.gray, 'GitHub ping event — نادیده گرفته شد');
    } else if (!event) {
      log('⚠️', colors.gray, `event type نامشخص — نادیده گرفته شد`);
    } else {
      log('⏭️', colors.gray, `نادیده گرفته شد (فقط push پردازش می‌شود)`);
    }
    return;
  }

  if (!body) {
    log('❌', colors.red, 'بدنه webhook خالی است');
    return;
  }

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
  if (WEBHOOK_SECRET && signature) {
    const payloadStr = typeof rawData.body === 'string'
      ? rawData.body
      : JSON.stringify(body);
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

// ── Connect to smee.io ─────────────────────────────────────────────────────
let isConnecting = false;
let currentRequest = null;
let reconnectTimeout = null;

function connectToSmee() {
  // Prevent multiple concurrent connections
  if (isConnecting) {
    log('⚠️', colors.gray, 'در حال اتصال... صبر کنید');
    return;
  }

  // Cancel any pending reconnect
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  // Destroy existing connection if any
  if (currentRequest) {
    try { currentRequest.destroy(); } catch {}
    currentRequest = null;
  }

  isConnecting = true;

  const url = new URL(SMEE_URL);
  log('🔌', colors.blue, `اتصال به smee.io${url.pathname}...`);

  currentRequest = https.get({
    hostname: url.hostname,
    path: url.pathname,
    headers: {
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
    timeout: 60000,
  }, (res) => {
    isConnecting = false;

    if (res.statusCode !== 200) {
      log('❌', colors.red, `خطا در اتصال به smee.io: HTTP ${res.statusCode}`);
      scheduleReconnect();
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
            // Not valid JSON, ignore
          }
        }
      }
    });

    res.on('end', () => {
      log('⚠️', colors.yellow, 'اتصال قطع شد');
      currentRequest = null;
      scheduleReconnect();
    });

    res.on('error', (err) => {
      isConnecting = false;
      log('❌', colors.red, `خطا: ${err.message}`);
      currentRequest = null;
      scheduleReconnect();
    });
  });

  currentRequest.on('error', (err) => {
    isConnecting = false;
    log('❌', colors.red, `خطا در اتصال: ${err.message}`);
    currentRequest = null;
    scheduleReconnect();
  });

  currentRequest.on('timeout', () => {
    isConnecting = false;
    log('⏰', colors.yellow, 'timeout در اتصال — تلاش مجدد...');
    try { currentRequest.destroy(); } catch {}
    currentRequest = null;
    scheduleReconnect();
  });
}

function scheduleReconnect() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    connectToSmee();
  }, 5000);
}

// ── Start ───────────────────────────────────────────────────────────────────
console.log('');
connectToSmee();

// Keep process alive
process.on('SIGINT', () => {
  console.log('\n');
  log('👋', colors.yellow, 'خروج...');
  if (currentRequest) {
    try { currentRequest.destroy(); } catch {}
  }
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
