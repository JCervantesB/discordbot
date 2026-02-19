import { generateNarrative } from '@/lib/venice-client';
import { generateImageFromSinkIn } from '@/lib/sinkin-client';
import { uploadImageToCloudinary } from '@/lib/cloudinary';
import { type scenes, type characters as charactersTable } from '@/drizzle/schema';
import { logStage } from '@/lib/logger';
import { getPrimaryFactionForCharacter } from '@/lib/factions';
import { getRegionBySlug } from '@/lib/regions';
import { rollEventForScene } from '@/lib/events-engine';
import { getProfessionBySlug } from '@/lib/professions';

type Scene = typeof scenes.$inferSelect;
type Character = typeof charactersTable.$inferSelect;

type OrchestratorInput = {
  action: string;
  character: Character;
  recentScenes: Scene[];
};

export type SceneGenerationResult = {
  narrative: string;
  imagePrompt: string;
  imageUrl: string | null;
};

async function generateSceneNarrative(input: OrchestratorInput) {
  logStage({ event: 'orchestrator', stage: 'narrative_start' });
  const contextSummary = input.recentScenes
    .map((s) => `#${s.sceneNumber}: ${s.narrative.slice(0, 160)}`)
    .join('\n');

  const faction = await getPrimaryFactionForCharacter(input.character.id);
  const region = input.character.currentRegionSlug
    ? await getRegionBySlug(input.character.currentRegionSlug)
    : null;
  const eventContext = await rollEventForScene({
    storyId: input.character.storyId,
    userId: input.character.userId,
    regionSlug: input.character.currentRegionSlug,
    factionSlug: faction?.slug ?? null
  });

  const prompt = [
    faction?.promptBase ? faction.promptBase : '',
    region?.promptNarrative ? region.promptNarrative : '',
    `Ha ocurrido un evento narrativo clasificado como ${eventContext.type} tras una tirada de dado con resultado ${eventContext.dice.finalRoll}.`,
    eventContext.narrativeInstruction,
    'Eres un narrador omnisciente de historias de fantasía/aventura.',
    'Genera una escena narrativa coherente, breve y descriptiva que incorpore este evento.',
    `Acción del personaje (${input.character.characterName}): "${input.action}"`,
    contextSummary ? `Contexto previo:\n${contextSummary}` : 'No hay escenas previas.',
    'Requisitos:',
    '- Perspectiva en tercera persona.',
    '- Escena en un máximo de 2 párrafos.',
    '- Cada párrafo con 2 a 4 frases.',
    '- No más de 180 palabras en total.',
    '- Incluye algunos detalles sensoriales (sonidos, olores, texturas).',
    '- Mantén tono épico/aventurero.',
    '- Si el evento implica peligro, ofrece al menos dos opciones claras que el personaje podría tomar para enfrentarlo o escapar, basadas en la situación descrita.',
    '- Termina con una frase gancho que invite al usuario a realizar otra acción para continuar la historia.'
  ].join('\n');

  const narrative = await generateNarrative(prompt);
  const paragraphs = narrative
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  const limited = paragraphs.slice(0, 3).join('\n\n');
  const result = limited || narrative;
  logStage({ event: 'orchestrator', stage: 'narrative_done' });
  return result;
}

async function designImagePrompt(input: {
  action: string;
  characterName: string;
  characterDescription: string;
  narrative: string;
  regionSlug?: string | null;
  regionPromptImage?: string | null;
  eventType?: string;
  eventImageInstruction?: string;
  professionClothing?: string | null;
  enemyName?: string | null;
  enemyDescription?: string | null;
}) {
  logStage({ event: 'orchestrator', stage: 'prompt_start' });
  const regionImageStyle = input.regionPromptImage || '';
  const characterVisual = [
    `Character: ${input.characterName}`,
    input.professionClothing ? `Outfit: ${input.professionClothing}` : '',
    input.characterDescription ? `Appearance: ${input.characterDescription}` : ''
  ]
    .filter((part) => part.length > 0)
    .join('. ');
  const enemyVisual =
    input.enemyName || input.enemyDescription
      ? [
          input.enemyName ? `Enemy: ${input.enemyName}` : '',
          input.enemyDescription ? `EnemyAppearance: ${input.enemyDescription}` : ''
        ]
          .filter((part) => part.length > 0)
          .join('. ')
      : '';
  const eventFocusLines: string[] = [];
  if (input.eventType === 'hostile_encounter' && (input.enemyName || input.enemyDescription)) {
    eventFocusLines.push(
      '- Focus on the confrontation between character and enemy in the same frame.',
      '- The enemy design must match the described enemy and feel dangerous.'
    );
  } else if (input.eventType === 'environmental_hazard') {
    eventFocusLines.push(
      '- Emphasize the environmental hazard as the main danger; do not invent extra enemies.'
    );
  } else if (input.eventType === 'rest_refuge') {
    eventFocusLines.push(
      '- Emphasize a calm but fragile refuge; no overt enemies should appear.'
    );
  } else if (input.eventType === 'resource_find' || input.eventType === 'equipment_gain') {
    eventFocusLines.push(
      '- Highlight the discovered resource or equipment as the main visual focal point.'
    );
  }
  const prompt = [
    'You are a concept artist creating a detailed text-to-image prompt for a single frame of a graphic novel.',
    'The image must clearly show the environment as a full scene, with the main character placed inside it (never as a centered portrait or selfie).',
    'Requirements:',
    '- English only.',
    '- One or two short sentences, maximum 320 characters total.',
    '- Start by describing the environment (landscape, structures, weather, light) and then place the character within that space.',
    '- Show the character as a full-body or three-quarter figure integrated into the scene, possibly at medium distance or from behind; never as a close-up face or bust.',
    '- If there is an enemy, describe its body and threat clearly in the same composition, sharing the scene with the character.',
    '- Avoid abstract phrases about colors or vague energy; focus on concrete objects, silhouettes and spatial relationships.',
    '- Do not include words like selfie, portrait, headshot, profile picture or user interface text.',
    ...eventFocusLines,
    input.eventType ? `EventType: ${input.eventType}` : '',
    // Environment must be built only from regionPromptImage
    regionImageStyle ? `Environment: ${regionImageStyle}` : '',
    characterVisual,
    enemyVisual,
    `Action: ${input.action}`,
    'Narrative in Spanish:',
    input.narrative
  ].join('\n');

  try {
    const raw = await generateNarrative(prompt);
    const singleLine = raw.replace(/\s+/g, ' ').trim();
    const limited = singleLine.slice(0, 320);
    logStage({ event: 'orchestrator', stage: 'prompt_done' });
    return limited;
  } catch {
    const baseline = `${input.characterName} ${input.action} | detailed fantasy scene, rich lighting, cinematic, high detail, 4k`;
    const singleLine = baseline.replace(/\s+/g, ' ').trim();
    const limited = singleLine.slice(0, 200);
    logStage({ event: 'orchestrator', stage: 'prompt_fallback' });
    return limited;
  }
}

export async function orchestrateSceneGeneration(input: OrchestratorInput): Promise<SceneGenerationResult> {
  const narrative = await generateSceneNarrative(input);
  const faction = await getPrimaryFactionForCharacter(input.character.id);
  const region = input.character.currentRegionSlug
    ? await getRegionBySlug(input.character.currentRegionSlug)
    : null;
  const eventContext = await rollEventForScene({
    storyId: input.character.storyId,
    userId: input.character.userId,
    regionSlug: input.character.currentRegionSlug,
    factionSlug: faction?.slug ?? null
  });
  const profession = input.character.professionSlug
    ? await getProfessionBySlug(input.character.professionSlug)
    : null;
  const imagePrompt = await designImagePrompt({
    action: input.action,
    characterName: input.character.characterName,
    characterDescription: input.character.description,
    narrative,
    regionSlug: input.character.currentRegionSlug,
    regionPromptImage: region?.promptImage || null,
    eventType: eventContext.type,
    eventImageInstruction: eventContext.imageInstruction,
    professionClothing: profession?.clothingDescription || null,
    enemyName: eventContext.enemy?.name ?? null,
    enemyDescription: eventContext.enemy?.description ?? null
  });

  let imageUrl: string | null = null;
  try {
    logStage({ event: 'orchestrator', stage: 'image_start' });
    const rawImage = await generateImageFromSinkIn(imagePrompt);
    imageUrl = await uploadImageToCloudinary(rawImage, {
      folder: 'discord-storyapp/scenes'
    });
    logStage({ event: 'orchestrator', stage: 'image_done' });
  } catch {
    imageUrl = null;
    logStage({ event: 'orchestrator', stage: 'image_failed' });
  }

  return {
    narrative,
    imagePrompt,
    imageUrl
  };
}

export async function orchestrateSceneGenerationWithDeps(
  input: OrchestratorInput,
  deps: {
    generateNarrativeFn: (prompt: string) => Promise<string>;
    generatePromptFn: (args: { action: string; characterName: string; narrative: string }) => Promise<string>;
    generateImageFn: (prompt: string) => Promise<string>;
    uploadImageFn: (file: string, options?: { folder?: string }) => Promise<string>;
  }
): Promise<SceneGenerationResult> {
  const narrativePrompt = [
    'Eres un narrador omnisciente de historias de fantasía/aventura.',
    'Genera una escena narrativa coherente, breve y descriptiva.',
    `Acción del personaje (${input.character.characterName}): "${input.action}"`,
    input.recentScenes
      .map((s) => `#${s.sceneNumber}: ${s.narrative.slice(0, 160)}`)
      .join('\n') || 'No hay escenas previas.',
    'Requisitos:',
    '- Perspectiva en tercera persona.',
    '- Escena en un máximo de 2 párrafos.',
    '- Cada párrafo con 2 a 4 frases.',
    '- No más de 180 palabras en total.',
    '- Incluye algunos detalles sensoriales (sonidos, olores, texturas).',
    '- Mantén tono épico/aventurero.',
    '- Termina con una frase gancho que invite a continuar la historia.'
  ].join('\n');
  const narrativeRaw = await deps.generateNarrativeFn(narrativePrompt);
  const narrative = narrativeRaw
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .slice(0, 3)
    .join('\n\n') || narrativeRaw;
  const imagePrompt = await deps.generatePromptFn({
    action: input.action,
    characterName: input.character.characterName,
    narrative
  });
  let imageUrl: string | null = null;
  try {
    const rawImage = await deps.generateImageFn(imagePrompt);
    imageUrl = await deps.uploadImageFn(rawImage, { folder: 'discord-storyapp/scenes' });
  } catch {
    imageUrl = null;
  }
  return { narrative, imagePrompt, imageUrl };
}
