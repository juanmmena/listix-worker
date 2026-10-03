import { z } from 'zod';

const playStoreUrl = z.url().refine((value) => {
  const url = new URL(value);
  return url.protocol === 'https:' && url.hostname === 'play.google.com';
}, 'PLAY_STORE_URL must be an https://play.google.com URL');

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(90),
  CORS_ORIGINS: z.string().default('*'),
  PUBLIC_BASE_URL: z.url(),
  INVITE_TTL_DAYS: z.coerce.number().int().positive().default(7),
  THROTTLE_TTL_MS: z.coerce.number().int().positive().default(60000),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(30),
  PLAY_STORE_URL: playStoreUrl,
  APP_SCHEME: z.string().regex(/^[a-z][a-z0-9+.-]*$/).default('listix'),
  ANDROID_PACKAGE_NAME: z.string().min(1),
  ANDROID_SHA256_FINGERPRINTS: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  return envSchema.parse(config);
}
