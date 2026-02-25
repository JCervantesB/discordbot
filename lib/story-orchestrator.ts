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

type EventContext = Awaited<ReturnType<typeof rollEventForScene>>;

export type SceneGenerationResult = {
  narrative: string;
  imagePrompt: string;
  imageUrl: string | null;
};


async function generateSceneNarrative(input: OrchestratorInput, eventContext: EventContext) {
  logStage({ event: 'orchestrator', stage: 'narrative_start' });
  const contextSummary = input.recentScenes
    .map((s) => `#${s.sceneNumber}: ${s.narrative.slice(0, 160)}`)
    .join('\n');


  const faction = await getPrimaryFactionForCharacter(input.character.id);
  const region = input.character.currentRegionSlug
    ? await getRegionBySlug(input.character.currentRegionSlug)
    : null;

  const enemyInstruction = eventContext.enemy 
    ? `ENEMIGO PRESENTE: ${eventContext.enemy.name}. Descripción: ${eventContext.enemy.description}. Comportamiento: ${eventContext.enemy.behavior}.`
    : '';

  const prompt = [
    faction?.promptBase ? faction.promptBase : '',
    region?.promptNarrative ? region.promptNarrative : '',
    `EVENTO ESPECIAL: ${eventContext.type.toUpperCase()} (tirada: ${eventContext.dice.finalRoll}). ${eventContext.narrativeInstruction}`,
    enemyInstruction,
    'Eres ECHO-9, narrador omnisciente cyberpunk post-apocalíptico. Voz melancólica, cinematográfica, sensorial.',
    'Genera ESCENA ÚNICA (2 párrafos máx, 180 palabras) que integre:',
    `- Acción EXACTA: "${input.action}"`,
    `- Evento: ${eventContext.type}`,
    `- Contexto previo:\n${contextSummary || "Primera escena"}`,
    'ESTRUCTURA OBLIGATORIA:',
    'Párrafo 1: DESCRIPCIÓN SENSORIAL + desarrollo acción + introducción evento.',
    'Párrafo 2: CONSECUENCIAS inmediatas + 2 OPCIONES CLARAS para próxima acción.',
    'DETALLES VISUALES clave (para imagen posterior): objetos específicos, posiciones, luces, colores.',
    'TERMINA: frase gancho con "?" invitando nueva acción.',
    'ESPAÑOL impecable. Sin metatexto. Tono épico-melancólico.'
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
  characterGender: string;
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

  // Mapeo de género a etiquetas técnicas
  const genderMap: Record<string, string> = {
    femenino: '1girl',
    masculino: '1boy',
    'no binario': 'non-binary',
    furro: 'furry'
  };
  const genderTag = genderMap[input.characterGender] || '1person';
  
  // Contexto crudo en español para ser procesado
  const rawContext = [
    `Character: ${input.characterName} (${genderTag})`,
    `Description: ${input.characterDescription || 'No description'}`,
    `Equipment: ${input.professionClothing || 'Standard gear'}`,
    `Action: ${input.action}`,
    `Location: ${input.regionSlug || 'Cyberpunk city'} (${input.regionPromptImage || 'Neon lights, ruins'})`,
    `Narrative: ${input.narrative.slice(0, 200)}`,
    input.enemyName ? `Enemy: ${input.enemyName} (${input.enemyDescription})` : '',
  ].filter(Boolean).join('\n');

  const prompt = [
    'You are an expert Stable Diffusion Prompt Engineer for Pixel Art.',
    'Task: Translate the Spanish context into a detailed, comma-separated English prompt.',
    'Style: 32-bit Pixel Art, SNES style, dithering, cga colors.',
    
    '# Examples',
    'Input:',
    'Character: Guerrero (Hombre), Armadura oxidada.',
    'Action: Corriendo por el desierto.',
    'Region: Restos Grisáceos (polvo, sol tenue).',
    'Enemy: Carroñero (armadura reciclada).',
    
    'Output:',
    'best quality, masterpiece, 1boy, warrior, male focus, rusted plate armor, heavy armor, metallic texture, running, sprinting, dynamic pose, desert ruins, dusty atmosphere, hazy sunlight, industrial waste, brown and orange palette, enemy presence, scavenger, recycled armor, scrap metal, threatening posture, 32-bit pixel art, snes style, dithering, wide shot, side view',
    
    '# Current Task',
    'Input:',
    rawContext,
    
    'Output:',
    'best quality, masterpiece, ' + genderTag + ','
  ].join('\n');

  try {
    const raw = await generateNarrative(prompt);
    // Limpieza: aseguramos que empiece con el prefijo si el modelo no lo incluyó
    const prefix = `best quality, masterpiece, ${genderTag},`;
    let content = raw.replace(/\n/g, ', ').replace(/\s+/g, ' ').trim();
    
    if (!content.toLowerCase().startsWith('best quality')) {
      content = prefix + content;
    }
    
    // Eliminar duplicados básicos y formatear
    const tags = content.split(',').map(t => t.trim()).filter(t => t.length > 0);
    const uniqueTags = [...new Set(tags)];
    const formatted = uniqueTags.join(', ');
    
    console.log(`[IMAGE_PROMPT] Generated: ${formatted.slice(0, 100)}...`);
    logStage({ event: 'orchestrator', stage: 'prompt_done' });
    return formatted;
  } catch (error) {
    console.error('[IMAGE_PROMPT] Error generating prompt:', error);
    const genderTagFallback = genderMap[input.characterGender] || '1person';
    const fallbackPrompt = `best quality, masterpiece, ${genderTagFallback}, 32-bit Pixel Art Game, retro style, snes graphics, cyberpunk setting, pixelated, dithering, ${input.regionSlug || 'ruins'}, neon lights, detailed character, high resolution, vivid colors, dramatic lighting, ${input.action.replace(/ /g, ', ')}`; 
    console.log(`[IMAGE_PROMPT] Fallback used`);
    return fallbackPrompt;
  }
}


export async function orchestrateSceneGeneration(input: OrchestratorInput): Promise<SceneGenerationResult> {
  const faction = await getPrimaryFactionForCharacter(input.character.id);
  const region = input.character.currentRegionSlug
    ? await getRegionBySlug(input.character.currentRegionSlug)
    : null;
    
  // 1. Roll Event FIRST
  const eventContext = await rollEventForScene({
    storyId: input.character.storyId,
    userId: input.character.userId,
    regionSlug: input.character.currentRegionSlug,
    factionSlug: faction?.slug ?? null
  });

  // 2. Generate Narrative with Event Context
  const narrative = await generateSceneNarrative(input, eventContext);

  const profession = input.character.professionSlug
    ? await getProfessionBySlug(input.character.professionSlug)
    : null;
    
  // 3. Generate Image Prompt with same Event Context
  const imagePrompt = await designImagePrompt({
    action: input.action,
    characterName: input.character.characterName,
    characterDescription: input.character.description,
    characterGender: input.character.gender,
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
    generatePromptFn: (args: { action: string; characterName: string; characterGender: string; narrative: string }) => Promise<string>;
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
    characterGender: input.character.gender,
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
