import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function getFlag(key: string) {
  const rows = await db.execute<{ value: string }>(sql`SELECT value FROM bot_flags WHERE key = ${key} LIMIT 1`);
  return rows[0]?.value ?? null;
}

export async function setFlag(key: string, value: string) {
  await db.execute(
    sql`INSERT INTO bot_flags (key, value) VALUES (${key}, ${value}) ON CONFLICT (key) DO UPDATE SET value = ${value}, updated_at = NOW()`
  );
}

