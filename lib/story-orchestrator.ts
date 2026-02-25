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
    `EVENTO ESPECIAL: ${eventContext.type.toUpperCase()} (tirada: ${eventContext.dice.finalRoll}). ${eventContext.narrativeInstruction}`,
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
  
  // Consistencia de Personaje: Protocolo de Atributos Fijos
  const characterVisual = [
    `Character: ${input.characterName}`,
    input.professionClothing ? `Outfit: ${input.professionClothing}` : '',
    input.characterDescription ? `Physical Traits: ${input.characterDescription}` : ''
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
      '- COMPOSITION: Action-packed side-view battle between character and enemy.',
      '- ENEMY: Match enemy description exactly in pixel scale.'
    );
  } else if (input.eventType === 'environmental_hazard') {
    eventFocusLines.push(
      '- COMPOSITION: Wide shot showing character small against a massive environmental threat.',
      '- ATMOSPHERE: High contrast, dramatic pixel particles for the hazard.'
    );
  }

  // Protocolo de Coherencia de Entorno (Paletas Regionales)
  const REGIONAL_PALETTES: Record<string, string> = {
    neoterra: 'Palette: ultra-modern high-contrast, clinical whites, electric blue neons, glass reflections.',
    restos_grisaceos: 'Palette: dusty desaturated oranges, rusted browns, industrial grays, hazy sunlight.',
    vasto_delta: 'Palette: deep oceanic blues, bioluminescent cyans, wet dark grays, murky greens.',
    el_hueco: 'Palette: glitchy magentas, corrupted greens, pitch black voids, flickering purples.',
    cielorritos: 'Palette: cold stellar silvers, dark space violets, distant star whites, metallic alloys.'
  };

  const currentPalette = input.regionSlug ? REGIONAL_PALETTES[input.regionSlug] : 'Palette: cyberpunk industrial mixed colors.';

  // Sistema de Prompt Engineering Avanzado: PIXEL ART CORE
  const prompt = [
    'ROLE: You are a legendary 16-bit PIXEL ARTIST for SNES/MegaDrive era cyberpunk games.',
    
    'TECHNICAL SPECS (PIXEL ART):',
    '- STYLE: Authentic 16-bit pixel art, high-quality sprites, hand-placed pixels.',
    '- RENDERING: Crisp edges, visible pixel grid, intentional dithering for shadows, no blurs.',
    '- RESOLUTION: 320x224 internal resolution look, clean integer scaling.',
    
    'VISUAL CONSISTENCY PROTOCOL:',
    `- CHARACTER: Maintain fixed sprite traits for ${input.characterName}: ${characterVisual}.`,
    `- ENVIRONMENT: ${regionImageStyle || 'Cyberpunk ruins'}.`,
    `- ATMOSPHERE & COLOR: ${currentPalette} Dynamic pixel lighting, 16-bit dithering.`,
    
    'NARRATIVE COHERENCE CHECK:',
    `SCENE CONTEXT: ${input.narrative.slice(0, 300)}`,
    `CURRENT ACTION: ${input.action}`,
    `EVENT TYPE: ${input.eventType || 'exploration'}`,
    
    ...(enemyVisual ? [`HOSTILE ELEMENT: ${enemyVisual}`] : []),

    'OUTPUT FORMAT:',
    'Create a single-line English prompt (max 320 chars) that describes the scene as a 16-bit game screenshot.',
    'SINTAXIS: [Region Setting] + [Character sprite action/position] + [Key Narrative Element] + [16-bit technical specs].',
    'STYLE KEYWORDS: 16-bit pixel art, snes style, side-view or 3/4 isometric, detailed sprites, indexed colors, dithering.'
  ].join('\n');

  try {
    const raw = await generateNarrative(prompt);
    const singleLine = raw.replace(/\s+/g, ' ').trim();
    const limited = singleLine.slice(0, 320);
    logStage({ event: 'orchestrator', stage: 'prompt_done' });
    return limited;
  } catch {
    const baseline = `16-bit pixel art, ${input.characterName} in ${regionImageStyle || 'cyberpunk ruins'}, ${input.action}, snes style, vibrant colors`;
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
