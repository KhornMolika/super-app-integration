import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { json, urlencoded } from 'express';
import { types } from 'pg';
import {
  getLocalIpAddress,
  resolveBackofficeBaseUrl,
} from './common/utils/network.utils';

// Parse PostgreSQL TIMESTAMP without time zone (OID 1114) as UTC Date objects
types.setTypeParser(1114, (stringValue: string) => {
  if (!stringValue) return null;
  return new Date(stringValue.endsWith('Z') || stringValue.includes('+') ? stringValue : `${stringValue.replace(' ', 'T')}Z`);
});

// Parse PostgreSQL TIMESTAMPTZ with time zone (OID 1184) as Date objects
types.setTypeParser(1184, (stringValue: string) => {
  if (!stringValue) return null;
  return new Date(stringValue);
});

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.use(json({ limit: '500mb' }));
  app.use(urlencoded({ extended: true, limit: '500mb' }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');

  const localIp = getLocalIpAddress();
  const backofficeUrl = resolveBackofficeBaseUrl();
  logger.log(`🚀 Backend API listening on: http://0.0.0.0:${port} (LAN: http://${localIp}:${port})`);
  logger.log(`🔗 Auto-detected Backoffice URL for notifications: ${backofficeUrl}`);
}
bootstrap();

