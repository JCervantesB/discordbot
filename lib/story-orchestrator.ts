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
  const checklistIntro = [
    'Before writing the final image prompt, internally build a mental checklist from the narrative and action with these items:',
    '- Key objects explicitly mentioned (devices, artifacts, weapons, tools, consoles, screens, symbols).',
    '- For each object: its approximate position (on the hand, floating above, on the floor, behind the character).',
    '- Visual properties: brightness or glow, color, material, texture.',
    '- Environment and atmosphere: landscape, structures, weather, light sources, particles or glitches.',
    '- Composition: where the character stands in the scene relative to the key object and environment.',
    'Then write a single concise English description that satisfies that checklist and NEVER contradicts the narrative.'
  ].join('\n');
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
    'Eres artista de CONCEPT ART para novela gráfica cyberpunk. Creas prompts T2I precisos que RECREAN escenas exactas.',
    
    'ANALIZA NARRATIVA y construye CHECKLIST interna:',
    '- OBJETOS CLAVE mencionados (armas, dispositivos, enemigos, recursos).',
    '- POSICIÓN EXACTA: mano personaje, suelo, flotando, detrás, horizonte.',
    '- PROPIEDADES VISUALES: glow, color dominante, material (óxido, neón, cristal), textura.',
    '- COMPOSICIÓN: personaje MEDIUM SHOT (cintura arriba) INTEGRADO en entorno, NO retrato.',
    '- ATMÓSFERA: clima, partículas (polvo, glitches, lluvia), fuentes luz específicas.',
    
    'REGLAS ABSOLUTAS:',
    '- PERSONAJE: full-body o 3/4 shot, integrado escena, perspectiva dinámica (ángulo 3/4, ligeramente bajo).',
    '- NUNCA: close-up cara, selfie, portrait, headshot, UI texto.',
    '- FOCO: acción + evento en UN SOLO FRAME coherente.',
    '- PRIORIDAD: narrativa > estética genérica.',
    
    ...eventFocusLines,
    
    `REGIÓN: ${regionImageStyle || 'cyberpunk post-apocalíptico'}`,
    `PERSONAJE: ${characterVisual}`,
    ...(enemyVisual ? [`ENEMIGO: ${enemyVisual}`] : []),
    `ACCIÓN: ${input.action}`,
    `EVENTO: ${input.eventType}`,
    `NARRATIVA BASE:\n${input.narrative}`,
    
    'OUTPUT: 1-2 oraciones Inglés, máx 320 chars. Sintaxis: [Entorno amplio] + [Personaje posicionado + acción] + [Elemento evento/objeto clave] + [atmósfera específica].',
    'Estilo: Blade Runner 2049 × Cyberpunk 2077, cinematic lighting, 8k, ultra detailed.'
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
