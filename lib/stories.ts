import { db } from '@/lib/db';
import { stories } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

export async function getOrCreateStory(guildId: string) {
  const globalId = 'GLOBAL_STORY';
  const targetGuildId = guildId || globalId;
  const existing = await db.select().from(stories).where(eq(stories.guildId, targetGuildId)).limit(1);
  if (existing.length) return existing[0];
  const inserted = await db
    .insert(stories)
    .values({ guildId: targetGuildId, title: 'Ecos de Neón - Crónicas del Último Horizonte', status: 'active' })
    .returning();
  return inserted[0];
}
