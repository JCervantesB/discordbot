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
import { validateContribution, compileManuscript, summarizeManuscript } from '@/lib/narrator';
import { sql } from 'drizzle-orm';
import { logSceneGeneration } from '@/lib/logger';

const CharacterSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().min(1).max(500)
});

const GenerateSchema = z.object({
  action: z.string().min(1).max(300)
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

  if (payload.type === 2 && payload.data?.name === 'story') {
    const baseUrl = process.env.APP_BASE_URL || 'https://discord-storyapp.vercel.app';
    const url = `${baseUrl}/historia/${encodeURIComponent('GLOBAL_STORY')}`;
    return json({
      type: 4,
      data: {
        content: `📚 You can read this server's story here:\n${url}`
      }
    });
  }

  if (payload.type === 2 && payload.data?.name === 'story_start') {
    const userId: string = payload.member?.user?.id;
    const username: string = payload.member?.user?.username;
    const allowed = userId === '433851566961852419' || username === 'imjcervantes';
    if (!allowed) {
      return json({
        type: 4,
        data: { content: "You don't have permission to run this command." }
      });
    }
    const { getFlag, setFlag } = await import('@/lib/bot-flags');
    const started = await getFlag('story_started');
    if (started === 'true') {
      return json({ type: 4, data: { content: 'The story has already been initialized.' } });
    }
    const { getOrCreateStory } = await import('@/lib/stories');
    const { generateNarrative } = await import('@/lib/venice-client');
    const { generateImageFromSinkIn } = await import('@/lib/sinkin-client');
    const { uploadImageToCloudinary } = await import('@/lib/cloudinary');
    const { scenes } = await import('@/drizzle/schema');
    const { sql } = await import('drizzle-orm');
    const { db } = await import('@/lib/db');
    const story = await getOrCreateStory('GLOBAL_STORY');
    const prompt = [
      'Genera el prólogo cinematográfico de la novela comunitaria “Ecos de Neón - Crónicas del Último Horizonte”.',
      'Tono melancólico, poético, con dilemas morales; voz del narrador ECHO-9, cronista IA.',
      'Contexto: Año 2198 tras el Silencio Global; regiones: Neoterra, Restos Grisáceos, Vasto Delta, El Hueco, Cielorritos.',
      'Extensión: 2-3 párrafos. Español. Sin instrucciones ni metatexto.'
    ].join('\n');
    const narrative = await generateNarrative(prompt);
    const imagePrompt = [
      'Cinematic cyberpunk prologue illustration, melancholic atmosphere',
      'Neoterra dome skyline, neon blue light, dust and ruins in foreground',
      'Echo-9 presence hinted as holographic fragment',
      'High detail, dramatic lighting'
    ].join(', ');
    let imageUrl: string | null = null;
    try {
      const rawImage = await generateImageFromSinkIn(imagePrompt);
      imageUrl = await uploadImageToCloudinary(rawImage, { folder: 'discord-storyapp/scenes' });
    } catch {
      imageUrl = null;
    }
    const now = new Date();
    const sceneNumber = 1;
    const [scene] = await db
      .insert(scenes)
      .values({
        storyId: story.id,
        sceneNumber,
        characterId: null,
        userId,
        userPrompt: 'PRÓLOGO',
        narrative,
        imageUrl,
        location: 'Neoterra',
        transitionType: 'main',
        contextUsed: [],
        createdAt: now
      })
      .returning();
    await db.execute(
      sql`INSERT INTO manuscripts (story_id, version, content) VALUES (${story.id}::uuid, ${scene.sceneNumber}, ${narrative}) ON CONFLICT (story_id, version) DO NOTHING`
    );
    await setFlag('story_started', 'true');
    return json({
      type: 4,
      data: {
        embeds: [
          {
            title: `🟣 Prólogo iniciado · Escena #${scene.sceneNumber}`,
            description: scene.narrative,
            color: 0x7d3cff,
            image: scene.imageUrl && !scene.imageUrl.startsWith('data:') ? { url: scene.imageUrl } : undefined,
            footer: { text: 'Ecos de Neón - Crónicas del Último Horizonte' },
            timestamp: new Date().toISOString()
          }
        ]
      }
    });
  }
  if (payload.type === 2 && payload.data?.name === 'character') {
    const guildId: string = payload.guild_id;
    const userId: string = payload.member.user.id;
    const userName: string = payload.member.user.username;
    const optionsList = (payload.data.options || []) as Array<{ name: string; value: string }>;
    const options = Object.fromEntries(optionsList.map((o) => [o.name, o.value]));
    const parsed = CharacterSchema.safeParse({
      name: options.name,
      description: options.description
    });
    if (!parsed.success) {
      return json({
        type: 4,
        data: {
          content: 'Invalid data. Check name (<=50) and description (<=500).'
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
        characterName: parsed.data.name,
        description: parsed.data.description,
        traits: {},
        professionSlug:
          typeof options.role === 'string' && options.role.length > 0 ? options.role : null,
        currentRegionSlug:
          typeof options.region === 'string' && options.region.length > 0 ? options.region : null,
        createdAt: now,
        updatedAt: now
      })
      .onConflictDoUpdate({
        target: [characters.storyId, characters.userId],
        set: {
          userName,
          characterName: parsed.data.name,
          description: parsed.data.description,
          professionSlug:
            typeof options.role === 'string' && options.role.length > 0 ? options.role : null,
          currentRegionSlug:
            typeof options.region === 'string' && options.region.length > 0 ? options.region : null,
          updatedAt: now
        }
      })
      .returning();
    let factionField: { name: string; value: string; inline?: boolean } | null = null;
    if (typeof options.faction === 'string' && options.faction.length > 0) {
      try {
        const { setPrimaryFactionForCharacter, getFactionBySlug } = await import('@/lib/factions');
        const faction = await setPrimaryFactionForCharacter(character.id, options.faction);
        factionField = { name: 'Faction', value: faction.name, inline: true };
      } catch {
        factionField = { name: 'Faction', value: 'Invalid', inline: true };
      }
    }

    let professionField: { name: string; value: string; inline?: boolean } | null = null;
    if (typeof options.role === 'string' && options.role.length > 0) {
      try {
        const { getProfessionBySlug } = await import('@/lib/professions');
        const profession = await getProfessionBySlug(options.role);
        professionField = profession
          ? { name: 'Role', value: profession.name, inline: true }
          : { name: 'Role', value: 'Invalid', inline: true };
      } catch {
        professionField = { name: 'Role', value: 'Invalid', inline: true };
      }
    }

    return json({
      type: 4,
      data: {
        embeds: [
          {
            title: '✨ Character Registered',
            color: 0x5865f2,
            fields: [
              { name: 'Name', value: character.characterName, inline: true },
              { name: 'User', value: `@${userName}`, inline: true },
              { name: 'Description', value: character.description },
              ...(character.currentRegionSlug
                ? [{ name: 'Region', value: character.currentRegionSlug, inline: true }]
                : []),
              ...(professionField ? [professionField] : []),
              ...(factionField ? [factionField] : [])
            ],
            footer: { text: 'Use /generate to begin your story' }
          }
        ]
      }
    });
  }

  if (payload.type === 2 && payload.data?.name === 'generate') {
    const guildId: string = payload.guild_id;
    const userId: string = payload.member.user.id;
    const applicationId: string = payload.application_id;
    const interactionToken: string = payload.token;
    const optionsList = (payload.data.options || []) as Array<{ name: string; value: string }>;
    const options = Object.fromEntries(optionsList.map((o) => [o.name, o.value]));
    const parsed = GenerateSchema.safeParse({
      action: options.action
    });
    if (!parsed.success) {
      return json({
        type: 4,
        data: {
          content: 'Invalid action. Must be 1–300 characters.'
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

    const started = Date.now();
    (async () => {
      try {
        const recentScenes = await getRecentScenesByStory(story.id, 3);
        const validation = await validateContribution({
          action: parsed.data.action,
          characterName: character.characterName,
          recentScenes
        });
        if (!validation.valid) {
          await fetch(
            `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`,
            {
              method: 'PATCH',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                content:
                  'The action is not coherent with the canon. Reasons:\n' + validation.reasons
              })
            }
          );
          logSceneGeneration({
            storyId: story.id,
            userId,
            success: false,
            stage: 'validation_failed',
            durationMs: Date.now() - started
          });
          return;
        }

        const locked = await acquireStoryLock(story.id, userId);
        if (!locked) {
          await fetch(
            `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`,
            {
              method: 'PATCH',
              headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                content:
                  '⏳ Story is synthesizing. Try again in a few seconds.'
              })
            }
          );
          logSceneGeneration({
            storyId: story.id,
            userId,
            success: false,
            stage: 'lock_unavailable',
            durationMs: Date.now() - started
          });
          return;
        }
        try {
          const generation = await orchestrateSceneGeneration({
            action: parsed.data.action,
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
              userPrompt: parsed.data.action,
              narrative: generation.narrative,
              imageUrl: generation.imageUrl,
              location: character.currentRegionSlug || generation.imagePrompt,
              regionSlug: character.currentRegionSlug || null,
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
          await fetch(
            `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`,
            {
              method: 'PATCH',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
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
                    },
                    timestamp: new Date().toISOString()
                  }
                ]
              })
            }
          );
          logSceneGeneration({
            storyId: story.id,
            userId,
            sceneNumber: scene.sceneNumber,
            success: true,
            durationMs: Date.now() - started
          });
        } finally {
          await releaseStoryLock(story.id);
        }
      } catch (e: unknown) {
        try {
          await fetch(
            `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`,
            {
              method: 'PATCH',
              headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                content: 'Ocurrió un error al generar la escena.'
              })
            }
          );
          const errMsg = e instanceof Error ? e.message : 'Error desconocido';
          logSceneGeneration({
            storyId: story.id,
            userId,
            success: false,
            stage: 'unexpected_error',
            error: errMsg,
            durationMs: Date.now() - started
          });
        } catch {
        }
      }
    })();

    return json({ type: 5 });
  }
  return json({ type: 4, data: { content: 'Comando no soportado' } });
}
