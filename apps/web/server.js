/**
 * سرور Production فرانت‌اند کارزینتل برای cPanel/Shared Hosting (CloudLinux Node.js)
 *
 * - روی پورتی که cPanel در متغیر PORT تعیین می‌کند listen می‌کند (پیش‌فرض 3000)
 * - روت‌های /api/v1 و /uploads از طریق rewrites در next.config به Backend
 *   (BACKEND_URL / INTERNAL_API_URL / پیش‌فرض http://127.0.0.1:4000) فوروارد می‌شوند
 *
 * در cPanel:
 *   Application Root  : .../karzintell/apps/web
 *   Application URL   : https://karzintell.com
 *   Startup File      : server.js
 *   Build Command     : npm run build
 */
const { createServer } = require('http');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, dir: __dirname });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const server = createServer((req, res) => {
      handle(req, res);
    });

    server.listen(port, hostname, () => {
      console.log(`🚀 Karzintell web ready: http://${hostname}:${port} (${dev ? 'dev' : 'production'})`);
      console.log(`   API proxy  : /api/v1/* -> ${process.env.BACKEND_URL || process.env.INTERNAL_API_URL || 'http://127.0.0.1:4000'}`);
      console.log(`   Uploads    : /uploads/* -> Backend (storage local)`);
    });

    server.on('error', (err) => {
      console.error('❌ web server error:', err);
      process.exit(1);
    });
  })
  .catch((err) => {
    console.error('❌ failed to start Next.js:', err);
    process.exit(1);
  });
