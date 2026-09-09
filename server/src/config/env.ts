import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  API_PREFIX: z.string().default('/api'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  AI_SERVICE_URL: z.string().default('http://localhost:8000'),

  // Internal Service Security (Section 18)
  INTERNAL_SERVICE_KEY: z.string().default('ctrlf_internal_service_key_2026_sec#'),

  // Oracle 21c XE Connection Settings
  ORACLE_USER: z.string().default('controlf_admin'),
  ORACLE_PASSWORD: z.string().default('ControlF2026_SecurePass'),
  ORACLE_CONNECTION_STRING: z.string().optional(),
  ORACLE_HOST: z.string().default('localhost'),
  ORACLE_PORT: z.coerce.number().default(1521),
  ORACLE_SERVICE_NAME: z.string().default('XEPDB1'),

  // Pool Configuration
  ORACLE_POOL_MIN: z.coerce.number().default(2),
  ORACLE_POOL_MAX: z.coerce.number().default(10),
  ORACLE_POOL_INCREMENT: z.coerce.number().default(2),
  ORACLE_POOL_TIMEOUT: z.coerce.number().default(60),

  // Authentication & Security
  JWT_ACCESS_SECRET: z.string().min(16).default('controlf_super_secret_access_jwt_key_2026_x99!'),
  JWT_REFRESH_SECRET: z.string().min(16).default('controlf_super_secret_refresh_jwt_key_2026_z88#'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  ENCRYPTION_KEY: z.string().length(64).default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),

  // File Upload & Video Limits (Phase 5)
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE_BYTES: z.coerce.number().default(524288000), // 500 MB
  MAX_VIDEO_SIZE_MB: z.coerce.number().default(100),
  MAX_VIDEO_DURATION_SECONDS: z.coerce.number().default(300), // 5 minutes
  MAX_CONCURRENT_SEARCH_JOBS: z.coerce.number().default(16),
  TARGET_PROCESS_FPS: z.coerce.number().default(15.0),
  EVIDENCE_SELECTION_POLICY: z.enum(['highest_confidence', 'first_confirmed']).default('highest_confidence'),

  // Rate Limiter
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000), // 15 mins
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(200),

  // Demo Mode Isolation (Phase 7: Production must use real detection mapping)
  DEMO_MODE: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables configuration:', parsed.error.format());
  throw new Error('Environment variables validation failed');
}

export const env = parsed.data;
