import { INestApplication, RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { Env } from './config/env.schema';

export const ROOT_ROUTES = [
  { path: 'join/:credential', method: RequestMethod.GET },
  { path: '.well-known/assetlinks.json', method: RequestMethod.GET },
  { path: 'health', method: RequestMethod.GET },
];

export function configureApp(app: INestApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const corsOrigins = config.get('CORS_ORIGINS', { infer: true });

  app.use(helmet());
  app.enableCors({
    origin: corsOrigins === '*' ? true : corsOrigins.split(',').map((origin) => origin.trim()),
  });
  app.setGlobalPrefix('api/v1', { exclude: ROOT_ROUTES });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.enableShutdownHooks();
}
