import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { scenes } from '@/drizzle/schema';
import { getOrCreateStory } from '@/lib/stories';
import { findCharacterForUser, getNextSceneNumberForStory, getRecentScenesByStory, incrementStorySceneCount } from '@/lib/scenes';
import { orchestrateSceneGeneration } from '@/lib/story-orchestrator';
import { loadCanonicalPRD, validateContribution, compileManuscript, summarizeManuscript } from '@/lib/narrator';
import { acquireStoryLock, releaseStoryLock } from '@/lib/lock';
import { sql } from 'drizzle-orm';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const guildId: string = body.guildId;
    const userId: string = body.userId;
    const action: string = body.accion;
    if (!guildId || !userId || !action) {
      return json({ error: 'guildId, userId y accion son requeridos' }, 400);
    }
    const story = await getOrCreateStory(guildId);
    const character = await findCharacterForUser(story.id, userId);
    if (!character) return json({ error: 'Debes registrar personaje primero' }, 400);
    const recentScenes = await getRecentScenesByStory(story.id, 3);
    const prd = await loadCanonicalPRD();
    const validation = await validateContribution({
      action,
      characterName: character.characterName,
      recentScenes,
      prd
    });
    if (!validation.valid) {
      return json({ error: 'INVALID', reasons: validation.reasons }, 422);
    }

    const locked = await acquireStoryLock(story.id, userId);
    if (!locked) return json({ error: 'Historia en síntesis, intenta más tarde' }, 423);
    try {
      const generation = await orchestrateSceneGeneration({
        action,
        character,
        recentScenes
      });
      const sceneNumber = await getNextSceneNumberForStory(story.id);
      const now = new Date();
      const [scene] = await db
        .insert(scenes)
        .values({
          storyId: story.id,
          sceneNumber,
          characterId: character.id,
          userId,
          userPrompt: action,
          narrative: generation.narrative,
          imageUrl: generation.imageUrl,
          location: generation.imagePrompt,
          transitionType: 'main',
          contextUsed: recentScenes.map((s) => s.sceneNumber),
          createdAt: now
        })
        .returning();
      await incrementStorySceneCount(story.id);

      const manuscript = await compileManuscript(story.id);
      // Guardar versión
      const version = sceneNumber;
      await db.execute(
        sql`INSERT INTO manuscripts (story_id, version, content) VALUES (${story.id}::uuid, ${version}, ${manuscript}) ON CONFLICT (story_id, version) DO NOTHING`
      );
      if (version % 50 === 0) {
        const summary = await summarizeManuscript(manuscript);
        await db.execute(
          sql`INSERT INTO summaries (story_id, version, summary) VALUES (${story.id}::uuid, ${version}, ${summary}) ON CONFLICT (story_id, version) DO NOTHING`
        );
      }

      return json({ ok: true, sceneId: scene.id, sceneNumber: scene.sceneNumber });
    } finally {
      await releaseStoryLock(story.id);
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return json({ error: String(message) }, 500);
  }
}
