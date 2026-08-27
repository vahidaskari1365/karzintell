import 'reflect-metadata';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import * as express from 'express';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { env } from './config/configuration';

async function bootstrap() {
  // رصد خطا با Sentry — فقط اگر SENTRY_DSN تنظیم شده باشد (import تنبل، بدون هزینه در غیر اینصورت)
  if (env.sentryDsn) {
    try {
      // @ts-ignore — پکیج اختیاری است؛ فقط با SENTRY_DSN لود می‌شود
      const Sentry = await import('@sentry/node');
      Sentry.init({ dsn: env.sentryDsn, environment: env.nodeEnv, tracesSampleRate: 0.1 });
    } catch {
      // پکیج نصب نیست → ادامه بدون رصد خارجی
    }
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: env.isProd ? ['log', 'warn', 'error'] : ['log', 'debug', 'warn', 'error'],
  });

  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cookieParser());
  app.useBodyParser('json', { limit: '1mb' });
  app.enableCors({
    origin: env.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Cart-Session', 'X-Request-Id'],
  });

  app.setGlobalPrefix(env.globalPrefix);

  // سرو فایل‌های آپلودشده (درایور local) از مسیر /uploads — روی همان هاست
  if (env.storage.driver === 'local') {
    const uploadsDir = resolve(process.cwd(), env.storage.dir);
    try {
      mkdirSync(uploadsDir, { recursive: true });
    } catch {
      // اگر ساخت نشود فقط warning بدهد؛ آپلود بعداً خطای مناسب می‌دهد
      console.warn(`[uploads] could not create dir: ${uploadsDir}`);
    }
    app.use(
      '/uploads',
      express.static(uploadsDir, {
        maxAge: '7d',
        immutable: false,
        fallthrough: false,
        setHeaders: (res) => {
          res.setHeader('X-Content-Type-Options', 'nosniff');
        },
      }),
    );
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  if (env.swagger && !env.isProd) {
    const config = new DocumentBuilder()
      .setTitle('Karzintell API')
      .setDescription('API فروشگاه کارزینتل — نسخه ۱')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      customSiteTitle: 'کارزینتل API',
      swaggerOptions: { persistAuthorization: true, docExpansion: 'none' },
    });
  }

  // cPanel/CloudLinux متغیر PORT را تعیین می‌کند؛ در غیر اینصورت env.port (API_PORT)
  const listenPort = process.env.PORT || env.port;
  await app.listen(listenPort, '0.0.0.0');
  const url = await app.getUrl();
  console.log(`\n🚀 Karzintell API ready: ${url}/${env.globalPrefix}`);
  if (env.swagger && !env.isProd) console.log(`📚 Swagger: ${url}/api/docs\n`);
}

bootstrap();
