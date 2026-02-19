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
  narrative: string;
  regionSlug?: string | null;
  regionPromptImage?: string | null;
  eventType?: string;
  eventImageInstruction?: string;
  professionName?: string | null;
  professionClothing?: string | null;
}) {
  logStage({ event: 'orchestrator', stage: 'prompt_start' });
  let regionImageStyle = input.regionPromptImage || '';
  const regionAtmosphereHints: Record<string, string> = {
    neoterra: 'night neon under dome, clinical geometry, cold blue light',
    restos_grisaceos: 'warm dusty light, scrap tech, solar panels, wind',
    vasto_delta: 'foggy horizon, emergent submarine ruins, eerie anomalies',
    el_hueco: 'surreal mixed reality, holographic distortions, glitch pulses',
    cielorritos: 'thin atmosphere, cold daylight, orbital ruins and fragile bridges'
  };
  const regionHint =
    (input.regionSlug && regionAtmosphereHints[input.regionSlug]) || '';
  const prompt = [
    'You are a visual scene designer for a fantasy story.',
    'Based on the following narrative and character action, write a single concise text-to-image prompt.',
    'Requirements:',
    '- English only.',
    '- Max 200 characters.',
    '- No line breaks.',
    '- Focus on visual elements: setting, mood, lighting, style.',
    '- Do not include camera jargon or text overlays.',
    input.eventType ? `Event: ${input.eventType}` : '',
    input.eventImageInstruction ? `EventVisual: ${input.eventImageInstruction}` : '',
    regionHint ? `RegionAtmosphere: ${regionHint}` : '',
    regionImageStyle ? `RegionStyle: ${regionImageStyle}` : '',
    input.professionName ? `Profession: ${input.professionName}` : '',
    input.professionClothing ? `CharacterOutfit: ${input.professionClothing}` : '',
    `Character name: ${input.characterName}`,
    `Action: ${input.action}`,
    'Narrative:',
    input.narrative
  ].join('\n');

  try {
    const raw = await generateNarrative(prompt);
    const singleLine = raw.replace(/\s+/g, ' ').trim();
    const limited = singleLine.slice(0, 200);
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
    narrative,
    regionSlug: input.character.currentRegionSlug,
    regionPromptImage: region?.promptImage || null,
    eventType: eventContext.type,
    eventImageInstruction: eventContext.imageInstruction,
    professionName: profession?.name || null,
    professionClothing: profession?.clothingDescription || null
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
