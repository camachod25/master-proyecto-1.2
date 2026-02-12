import dotenv from 'dotenv';
import { z } from 'zod';

// Cargar variables de entorno desde .env (si existe)
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  PORT: z
    .preprocess((val) => {
      if (typeof val === 'string' && val.length > 0) return Number(val);
      if (typeof val === 'number') return val;
      return undefined;
    }, z.number().int().positive().default(3000)),

  HOST: z.string().default('0.0.0.0'),

  DB_HOST: z.string().default('localhost'),
  DB_PORT: z
    .preprocess((val) => {
      if (typeof val === 'string' && val.length > 0) return Number(val);
      if (typeof val === 'number') return val;
      return undefined;
    }, z.number().int().positive().default(5432)),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default('postgres'),
  DB_NAME: z.string().default('orders_db'),
  DATABASE_URL: z.string().optional(),
  PERSISTENCE_DRIVER: z.enum(['memory', 'postgres']).default('memory'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const err = parsed.error.issues
    .map((i) => `${i.path.join('.')}: ${i.message}`)
    .join('; ');
  throw new Error(`Invalid environment configuration: ${err}`);
}

export type EnvSchema = z.infer<typeof envSchema>;

export const config: {
  nodeEnv: EnvSchema['NODE_ENV'];
  port: number;
  host: string;
  persistenceDriver: EnvSchema['PERSISTENCE_DRIVER'];
  db: {
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
    url: string;
  };
} = {
  nodeEnv: parsed.data.NODE_ENV,
  port: parsed.data.PORT,
  host: parsed.data.HOST,
  persistenceDriver: parsed.data.PERSISTENCE_DRIVER,
  db: {
    host: parsed.data.DB_HOST,
    port: parsed.data.DB_PORT,
    user: parsed.data.DB_USER,
    password: parsed.data.DB_PASSWORD,
    name: parsed.data.DB_NAME,
    url: `postgresql://${parsed.data.DB_USER}:${parsed.data.DB_PASSWORD}@${parsed.data.DB_HOST}:${parsed.data.DB_PORT}/${parsed.data.DB_NAME}`,
  },
};

export function getDatabaseUrl(): string {
  return parsed.data.DATABASE_URL ?? config.db.url;
}

export default config;
