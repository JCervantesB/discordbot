import { db } from '@/lib/db';
import { stories } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

export async function getOrCreateStory(guildId: string) {
  const existing = await db.select().from(stories).where(eq(stories.guildId, guildId)).limit(1);
  if (existing.length) return existing[0];
  const inserted = await db.insert(stories).values({ guildId }).returning();
  return inserted[0];
}
