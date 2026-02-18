import { NextRequest } from 'next/server';
import { verifyKey } from 'discord-interactions';
import { z } from 'zod';
import { db } from '@/lib/db';
import { characters, scenes } from '@/drizzle/schema';
import { getOrCreateStory } from '@/lib/stories';
import {
  getNextSceneNumberForStory,
  getRecentScenesByStory,
  findCharacterForUser,
  incrementStorySceneCount
} from '@/lib/scenes';
import { orchestrateSceneGeneration } from '@/lib/story-orchestrator';
import { acquireStoryLock, releaseStoryLock } from '@/lib/lock';
import { loadCanonicalPRD, validateContribution, compileManuscript, summarizeManuscript } from '@/lib/narrator';
import { sql } from 'drizzle-orm';

const PersonajeSchema = z.object({
  nombre: z.string().min(1).max(50),
  descripcion: z.string().min(1).max(500)
});

const GenerateSchema = z.object({
  accion: z.string().min(1).max(300)
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-signature-ed25519') || '';
  const timestamp = request.headers.get('x-signature-timestamp') || '';
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKey) return json({ error: 'Missing public key' }, 500);

  const bodyText = await request.text();
  const isValid = verifyKey(new TextEncoder().encode(bodyText), signature, timestamp, publicKey);
  if (!isValid) return json({ error: 'Bad signature' }, 401);

  const payload = JSON.parse(bodyText);
  if (payload.type === 1) return json({ type: 1 });

  if (payload.type === 2 && payload.data?.name === 'personaje') {
    const guildId: string = payload.guild_id;
    const userId: string = payload.member.user.id;
    const userName: string = payload.member.user.username;
    const optionsList = (payload.data.options || []) as Array<{ name: string; value: string }>;
    const options = Object.fromEntries(optionsList.map((o) => [o.name, o.value]));
    const parsed = PersonajeSchema.safeParse({
      nombre: options.nombre,
      descripcion: options.descripcion
    });
    if (!parsed.success) {
      return json({
        type: 4,
        data: {
          content: 'Datos inválidos. Revisa nombre (<=50) y descripción (<=500).'
        }
      });
    }
    const story = await getOrCreateStory(guildId);
    const now = new Date();
    const [character] = await db
      .insert(characters)
      .values({
        storyId: story.id,
        userId,
        userName,
        characterName: parsed.data.nombre,
        description: parsed.data.descripcion,
        traits: {},
        createdAt: now,
        updatedAt: now
      })
      .onConflictDoUpdate({
        target: [characters.storyId, characters.userId],
        set: {
          userName,
          characterName: parsed.data.nombre,
          description: parsed.data.descripcion,
          updatedAt: now
        }
      })
      .returning();

    return json({
      type: 4,
      data: {
        embeds: [
          {
            title: '✨ Personaje Registrado',
            color: 0x5865f2,
            fields: [
              { name: 'Nombre', value: character.characterName, inline: true },
              { name: 'Usuario', value: `@${userName}`, inline: true },
              { name: 'Descripción', value: character.description }
            ],
            footer: { text: 'Usa /generate para comenzar tu historia' }
          }
        ]
      }
    });
  }

  if (payload.type === 2 && payload.data?.name === 'generate') {
    const guildId: string = payload.guild_id;
    const userId: string = payload.member.user.id;
    const optionsList = (payload.data.options || []) as Array<{ name: string; value: string }>;
    const options = Object.fromEntries(optionsList.map((o) => [o.name, o.value]));
    const parsed = GenerateSchema.safeParse({
      accion: options.accion
    });
    if (!parsed.success) {
      return json({
        type: 4,
        data: {
          content: 'Acción inválida. Debe tener entre 1 y 300 caracteres.'
        }
      });
    }

    const story = await getOrCreateStory(guildId);
    const character = await findCharacterForUser(story.id, userId);
    if (!character) {
      return json({
        type: 4,
        data: {
          content: 'Primero registra tu personaje con /personaje.'
        }
      });
    }

    const recentScenes = await getRecentScenesByStory(story.id, 3);
    const prd = await loadCanonicalPRD();
    const validation = await validateContribution({
      action: parsed.data.accion,
      characterName: character.characterName,
      recentScenes,
      prd
    });
    if (!validation.valid) {
      return json({
        type: 4,
        data: { content: 'La acción no es coherente con el canon. Razones:\n' + validation.reasons }
      });
    }

    const locked = await acquireStoryLock(story.id, userId);
    if (!locked) {
      return json({
        type: 4,
        data: { content: '⏳ La historia está en síntesis. Intenta de nuevo en unos segundos.' }
      });
    }
    try {
      const generation = await orchestrateSceneGeneration({
        action: parsed.data.accion,
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
          userPrompt: parsed.data.accion,
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
      await db.execute(
        sql`INSERT INTO manuscripts (story_id, version, content) VALUES (${story.id}::uuid, ${scene.sceneNumber}, ${manuscript}) ON CONFLICT (story_id, version) DO NOTHING`
      );
      if (scene.sceneNumber % 50 === 0) {
        const summary = await summarizeManuscript(manuscript);
        await db.execute(
          sql`INSERT INTO summaries (story_id, version, summary) VALUES (${story.id}::uuid, ${scene.sceneNumber}, ${summary}) ON CONFLICT (story_id, version) DO NOTHING`
        );
      }
      return json({
        type: 4,
        data: {
          embeds: [
            {
              title: `📖 Escena #${scene.sceneNumber}`,
              description: scene.narrative,
              color: 0x2ecc71,
              image:
                scene.imageUrl && !scene.imageUrl.startsWith('data:')
                  ? { url: scene.imageUrl }
                  : undefined,
              footer: {
                text: `Generado por ${character.characterName}`
              }
            }
          ]
        }
      });
    } finally {
      await releaseStoryLock(story.id);
    }

  }
  return json({ type: 4, data: { content: 'Comando no soportado' } });
}
