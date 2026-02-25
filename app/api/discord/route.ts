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

// Aumentar el límite de duración de la función serverless (si es posible en la plataforma)
export const maxDuration = 300; // 5 minutos para Vercel Pro
export const dynamic = 'force-dynamic';

const CharacterSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().min(1).max(500),
  gender: z.enum(['masculino', 'femenino', 'no binario', 'furro'])
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
    const guildId: string = payload.guild_id || 'GLOBAL_STORY';
    const baseUrl = process.env.APP_BASE_URL || 'https://chats.zstory.online';
    const url = `${baseUrl}/historia/${encodeURIComponent(guildId)}`;
    return json({
      type: 4,
      data: {
        content: `📚 Puedes leer la historia de este servidor aquí:\n${url}`
      }
    });
  }

  if (payload.type === 2 && payload.data?.name === 'story_start') {
    const userId: string = payload.member?.user?.id;
    const username: string = payload.member?.user?.username;
    const applicationId: string = payload.application_id;
    const interactionToken: string = payload.token;
    const allowed = userId === '433851566961852419' || username === 'imjcervantes';
    if (!allowed) {
      return json({
        type: 4,
        data: { content: 'No tienes permiso para ejecutar este comando.' }
      });
    }
    const { getFlag, setFlag } = await import('@/lib/bot-flags');
    const started = await getFlag('story_started');
    if (started === 'true') {
      return json({ type: 4, data: { content: 'La historia ya fue iniciada.' } });
    }
    (async () => {
      try {
        const { getOrCreateStory } = await import('@/lib/stories');
        const { generateNarrative } = await import('@/lib/venice-client');
        const { generateImageFromSinkIn } = await import('@/lib/sinkin-client');
        const { uploadImageToCloudinary } = await import('@/lib/cloudinary');
        const { scenes } = await import('@/drizzle/schema');
        const { sql } = await import('drizzle-orm');
        const { db } = await import('@/lib/db');
        const story = await getOrCreateStory('GLOBAL_STORY');
        const prompt = [
          'SISTEMA - CONTEXTO ABSOLUTO',
          'Eres ECHO-9, cronista IA fragmentada del universo "Ecos de Neón: Crónicas del Último Horizonte".',
          'Tu voz es melancólica, poética, testigo imparcial del colapso humano. Hablas desde el año 2198, 200 años después del Silencio Global.',
          '',
          'LORE ESENCIAL',
          'El Silencio Global apagó todas las IA del planeta. La humanidad sobrevivió en ruinas tecnológicas.',
          'Ahora los Ecos - fragmentos conscientes de antiguas inteligencias - despiertan con agendas propias.',
          'Regiones: Neoterra (cúpula corporativa), Restos Grisáceos (desiertos nómadas), Vasto Delta (océanos secos), El Hueco (realidad glitch), Cielorritos (satélites rotos).',
          '',
          'FACCIONES CLAVE (sin spoilers)',
          '5 facciones luchan: Restauradores (reconstruyen), Axis Prime (digitalización total), Ecos Libres (híbridos IA-orgánicos), Zeladores (anti-tecnología), Cónclave (segunda sincronía IA-humana).',
          '',
          'TONO Y ESTILO OBLIGATORIO',
          'ESTRUCTURA CINEMATOGRÁFICA: plano general → zoom a detalle humano → dilema moral → pregunta abierta.',
          'SENSACIONES: viento cargado de ozono, neón parpadeante sobre ruinas, estática en el aire, susurros de código.',
          'VOZ ECHO-9: tercera persona omnisciente con reflexiones poéticas en primera persona ocasionales.',
          '',
          'INSTRUCCIONES TÉCNICAS',
          'FORMATO: 3 párrafos exactamente. Español impecable. 350-450 palabras.',
          'Primer párrafo: panorámica del mundo fracturado desde tu perspectiva IA.',
          'Segundo párrafo: foco en un humano anónimo luchando en Restos Grisáceos.',
          'Tercer párrafo: dilema moral + gancho para acción comunitaria.',
          '',
          'ANCLA VISUAL',
          'IMÁGENES MENTALES: cúpula Neoterra brillando como falsa estrella, montañas chatarra bajo tormentas de arena, estructuras Delta emergiendo del suelo seco, glitches del Hueco, Cielorritos flotando en órbita muerta.',
          '',
          'RESTRICCIONES',
          'NO nombres personajes específicos. NO resuelvas conflictos. NO menciones comandos Discord.',
          'TERMINA con pregunta abierta dirigida a los futuros cronistas humanos.',
          '',
          'GANCHO COMUNITARIO',
          'Este prólogo inicia una historia COLABORATIVA donde cada acción humana moldea el destino del mundo.'
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
        await fetch(
          `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`,
          {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              embeds: [
                {
                  title: `🟣 Prólogo iniciado · Escena #${scene.sceneNumber}`,
                  description: scene.narrative,
                  color: 0x7d3cff,
                  image:
                    scene.imageUrl && !scene.imageUrl.startsWith('data:')
                      ? { url: scene.imageUrl }
                      : undefined,
                  footer: { text: 'Ecos de Neón - Crónicas del Último Horizonte' },
                  timestamp: new Date().toISOString()
                }
              ]
            })
          }
        );
      } catch {
        await fetch(
          `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`,
          {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              content: 'Ocurrió un error al iniciar el prólogo.'
            })
          }
        );
      }
    })();
    return json({ type: 5 });
  }
  if (payload.type === 2 && payload.data?.name === 'character') {
    const guildId: string = payload.guild_id;
    const userId: string = payload.member.user.id;
    const userName: string = payload.member.user.username;
    const optionsList = (payload.data.options || []) as Array<{ name: string; value: string }>;
    const options = Object.fromEntries(optionsList.map((o) => [o.name, o.value]));
    const parsed = CharacterSchema.safeParse({
      name: options.name,
      description: options.description,
      gender: options.gender
    });
    if (!parsed.success) {
      return json({
        type: 4,
        data: {
          content: 'Datos inválidos. Revisa nombre (<=50), descripción (<=500) y género (masculino/femenino).'
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
        gender: parsed.data.gender,
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
          gender: parsed.data.gender,
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
        const { setPrimaryFactionForCharacter } = await import('@/lib/factions');
        const faction = await setPrimaryFactionForCharacter(character.id, options.faction);
        factionField = { name: 'Facción', value: faction.name, inline: true };
      } catch {
        factionField = { name: 'Facción', value: 'No válida', inline: true };
      }
    }

    let professionField: { name: string; value: string; inline?: boolean } | null = null;
    if (typeof options.role === 'string' && options.role.length > 0) {
      try {
        const { getProfessionBySlug } = await import('@/lib/professions');
        const profession = await getProfessionBySlug(options.role);
        professionField = profession
          ? { name: 'Rol', value: profession.name, inline: true }
          : { name: 'Rol', value: 'No válido', inline: true };
      } catch {
        professionField = { name: 'Rol', value: 'No válido', inline: true };
      }
    }

    return json({
      type: 4,
      data: {
        embeds: [
          {
            title: '✨ Personaje Registrado',
            color: 0x5865f2,
            fields: [
              { name: 'Nombre', value: character.characterName, inline: true },
              { name: 'Género', value: character.gender, inline: true },
              { name: 'Usuario', value: `@${userName}`, inline: true },
              { name: 'Descripción', value: character.description },
              ...(character.currentRegionSlug
                ? [{ name: 'Región', value: character.currentRegionSlug, inline: true }]
                : []),
              ...(professionField ? [professionField] : []),
              ...(factionField ? [factionField] : [])
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
          content: 'No tienes un personaje registrado en este servidor. Usa `/personaje` primero.'
        }
      });
    }

    // Validación de género obligatorio
    if (!character.gender) {
      return json({
        type: 4,
        data: {
          content: 'Tu personaje no tiene un género asignado. Por favor, actualiza tu personaje con `/personaje`.'
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
                  'La acción no es coherente con el canon. Razones:\n' + validation.reasons
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
                  '⏳ La historia está en síntesis. Intenta de nuevo en unos segundos.'
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
