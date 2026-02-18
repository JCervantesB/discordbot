import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';

export async function acquireStoryLock(storyId: string, lockedBy: string) {
  await db.execute(
    sql`INSERT INTO synthesis_locks (story_id, locked_by) VALUES (${storyId}::uuid, ${lockedBy}) ON CONFLICT (story_id) DO NOTHING`
  );
  const rows = await db.execute<{ exists: number }>(
    sql`SELECT 1 AS exists FROM synthesis_locks WHERE story_id = ${storyId}::uuid`
  );
  return rows.length > 0;
}

export async function releaseStoryLock(storyId: string) {
  await db.execute(sql`DELETE FROM synthesis_locks WHERE story_id = ${storyId}::uuid`);
}
