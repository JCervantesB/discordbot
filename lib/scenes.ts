import { db } from '@/lib/db';
import { characters, scenes, stories } from '@/drizzle/schema';
import { and, desc, eq } from 'drizzle-orm';

export async function getRecentScenesByStory(storyId: string, limit: number) {
  const rows = await db
    .select()
    .from(scenes)
    .where(eq(scenes.storyId, storyId))
    .orderBy(desc(scenes.sceneNumber))
    .limit(limit);
  return rows;
}

export async function getNextSceneNumberForStory(storyId: string) {
  const rows = await db
    .select({ sceneNumber: scenes.sceneNumber })
    .from(scenes)
    .where(eq(scenes.storyId, storyId))
    .orderBy(desc(scenes.sceneNumber))
    .limit(1);
  const last = rows[0];
  return last ? last.sceneNumber + 1 : 1;
}

export async function findCharacterForUser(storyId: string, userId: string) {
  const rows = await db
    .select()
    .from(characters)
    .where(and(eq(characters.storyId, storyId), eq(characters.userId, userId)))
    .limit(1);
  return rows[0];
}

export async function incrementStorySceneCount(storyId: string) {
  const rows = await db
    .select({ sceneCount: stories.sceneCount })
    .from(stories)
    .where(eq(stories.id, storyId))
    .limit(1);
  const current = rows[0];
  const currentValue = current?.sceneCount ?? 0;
  const next = currentValue + 1;
  await db.update(stories).set({ sceneCount: next }).where(eq(stories.id, storyId));
  return next;
}
