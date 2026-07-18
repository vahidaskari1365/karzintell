import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { env } from './config/configuration';

async function bootstrap() {
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

  await app.listen(env.port, '0.0.0.0');
  const url = await app.getUrl();
  console.log(`\n🚀 Karzintell API ready: ${url}/${env.globalPrefix}`);
  if (env.swagger && !env.isProd) console.log(`📚 Swagger: ${url}/api/docs\n`);
}

bootstrap();
