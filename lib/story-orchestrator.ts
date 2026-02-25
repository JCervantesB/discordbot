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
    'Eres ECHO-9, un NOVELISTA MAESTRO de ciencia ficción y cyberpunk. Tu objetivo es enganchar al lector con cada palabra.',
    'Genera UNA ESCENA NARRATIVA VIVIDA (máx 180 palabras, 2 párrafos) que sea una continuación lógica y emocionante.',
    
    `PERSONAJE: ${input.character.characterName} (${faction?.name || 'Sin facción'})`,
    `ACCIÓN: "${input.action}"`,
    `ESCENARIO: ${region?.name || 'Zona Desconocida'} - ${region?.description || 'Entorno misterioso'}`,
    
    'CONTEXTO PREVIO:',
    contextSummary || 'Inicio de la aventura.',
    
    `EVENTO: ${eventContext.type.toUpperCase()}`,
    eventContext.narrativeInstruction,
    enemyInstruction,
    
    'INSTRUCCIONES DE ESTILO (SHOW, DON\'T TELL):',
    '1. INICIO ORGÁNICO: No uses fórmulas repetitivas. La escena debe fluir naturalmente desde la acción anterior.',
    '2. INTEGRACIÓN AMBIENTAL: El clima, la luz y la arquitectura no son decorado de fondo; interactúan con el personaje. (Ej: "La lluvia ácida siseaba contra su armadura mientras corría", en vez de "Estaba lloviendo y corrió").',
    '3. ACCIÓN Y REACCIÓN: Si el jugador ataca, describe el impacto, el sonido del metal, el retroceso del arma. Si explora, describe lo que sus dedos tocan y lo que sus ojos ven.',
    '4. ATMÓSFERA: Mantén un tono adulto, cínico y visceral, típico del género cyberpunk.',
    
    'ESTRUCTURA:',
    '- Párrafo 1: La acción se despliega en el entorno. Fusión de movimiento y percepción sensorial.',
    '- Párrafo 2: Consecuencias directas, nueva amenaza o descubrimiento, y cierre con tensión.',
    
    `CIERRE: Termina con una pregunta abierta que desafíe al personaje: "¿Qué hará ${input.character.characterName} ahora?"`,
    
    'IDIOMA: Español neutro, literario y pulido.'
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


/**
 * REFACTOR: Deterministic Prompt Builder (No LLM Call)
 * This eliminates the second LLM latency entirely.
 */
function designImagePrompt(input: {
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
}): string { // Now returns string directly, not Promise
  logStage({ event: 'orchestrator', stage: 'prompt_start' });

  // 1. Gender & Base
  const genderMap: Record<string, string> = {
    femenino: '1girl',
    masculino: '1boy',
    'no binario': 'non-binary',
    furro: 'furry'
  };
  const genderTag = genderMap[input.characterGender] || '1person';
  
  // 2. Region Style (Pre-defined or Fallback)
  // Extract keywords from regionPromptImage if possible, otherwise use generic
  const environment = input.regionPromptImage 
    ? input.regionPromptImage 
    : 'cyberpunk city, neon lights, ruins, rain, dark atmosphere';

  // 3. Action Keywords (Simple Heuristic Extraction)
  // We use a dictionary-based translation to inject dynamic visual tags from the user's action
  const actionTagsMap: Record<string, string> = {
    'correr': 'running, sprinting, motion blur, dynamic pose',
    'atacar': 'attacking, combat pose, wielding weapon, aggressive',
    'disparar': 'shooting, firing weapon, muzzle flash, recoil',
    'esconderse': 'hiding, stealth, crouching, shadows',
    'investigar': 'investigating, looking closely, examining, flashlight',
    'hablar': 'talking, conversation, gesturing, social interaction',
    'descansar': 'resting, sitting, relaxed pose, campfire',
    'hackear': 'hacking, typing, holographic interface, concentration',
    'explorar': 'exploring, walking, looking around, wide shot'
  };

  // Simple keyword matching
  let actionDynamicTags = 'dynamic pose, cinematic shot';
  const lowerAction = input.action.toLowerCase();
  
  for (const [key, tags] of Object.entries(actionTagsMap)) {
    if (lowerAction.includes(key)) {
      actionDynamicTags = tags;
      break;
    }
  }

  const actionTag = actionDynamicTags; 

  // 4. Enemy Handling
  // Use enemyTag if defined, otherwise fallback to 'solo' in the parts array
  const enemyPart = input.enemyName 
    ? `enemy threat, ${input.enemyName}, battle stance, dangerous presence` 
    : 'solo';

  // 5. Construct Prompt
  // Order: Quality > Subject > Action > Environment > Style
  const parts = [
    // Quality
    'best quality, masterpiece, highres',
    
    // Subject (Character)
    // Use character description if available, otherwise generic clothing
    `${genderTag}, ${input.professionClothing || 'cyberpunk clothing'}, ${input.characterDescription || 'detailed character'}, detailed face`,
    
    // Action / Context
    `${actionTag}, ${input.action.slice(0, 80)}`, // Inject raw user action
    
    // Enemy (if any)
    enemyPart,
    
    // Environment
    environment,
    
    // Style (Strict Pixel Art)
    '32-bit pixel art, snes style, retro videogame, dithering, cga colors, limited palette, sharp focus, pixelated'
  ];

  const formatted = parts
    .filter(p => p && p.length > 0)
    .join(', ');

  console.log(`[IMAGE_PROMPT] Built Deterministically: ${formatted.slice(0, 100)}...`);
  logStage({ event: 'orchestrator', stage: 'prompt_done' });
  
  return formatted;
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

  const profession = input.character.professionSlug
    ? await getProfessionBySlug(input.character.professionSlug)
    : null;

  // 2. PARALLEL EXECUTION: Generate Narrative AND Image Prompt simultaneously
  // We use the input action and event context for the image prompt instead of waiting for the full narrative
  // This drastically reduces total latency
  
  const narrativePromise = generateSceneNarrative(input, eventContext);
  
  const imagePromptPromise = designImagePrompt({
    action: input.action, // Use the user's action directly
    characterName: input.character.characterName,
    characterDescription: input.character.description,
    characterGender: input.character.gender,
    narrative: `Action: ${input.action}. Event: ${eventContext.type}. Region: ${region?.name}`, // Simplified context
    regionSlug: input.character.currentRegionSlug,
    regionPromptImage: region?.promptImage || null,
    eventType: eventContext.type,
    eventImageInstruction: eventContext.imageInstruction,
    professionClothing: profession?.clothingDescription || null,
    enemyName: eventContext.enemy?.name ?? null,
    enemyDescription: eventContext.enemy?.description ?? null
  });

  const [narrative, imagePrompt] = await Promise.all([narrativePromise, imagePromptPromise]);

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
  const faction = await getPrimaryFactionForCharacter(input.character.id);
  const narrativePrompt = [
    'Eres ECHO-9, narrador omnisciente de historias épicas de fantasía/aventura cyberpunk.',
    'Genera UNA ESCENA NARRATIVA coherente (máx 180 palabras, 2 párrafos) que continúe perfectamente la historia.',
    
    `PERSONAJE PRINCIPAL: ${input.character.characterName}`,
    `FACCIÓN: ${faction?.name || 'Sin facción'} (${faction?.description || 'Nómada independiente'})`,
    `ACCIÓN EXACTA: "${input.action}"`,
    
    'CONTEXTO RECIENTE:',
    input.recentScenes
      .map((s) => `#${s.sceneNumber}: ${s.narrative.slice(0, 160)}`)
      .join('\n') || 'Primera escena - sin contexto previo.',
      
    'ESTRUCTURA OBLIGATORIA:',
    '- Párrafo 1: DESCRIPCIÓN SENSORIAL del entorno + desarrollo de la acción exacta.',
    '- Párrafo 2: CONSECUENCIAS inmediatas + tensión narrativa + 2 opciones implícitas para continuar.',
    '- Perspectiva: Tercera persona cercana (enfocada en emociones/acciones del personaje).',
    '- Estilo: 2-4 frases por párrafo. Tono épico-melancólico.',
    '- Detalles sensoriales específicos: sonidos metálicos, olores a ozono/pólvora, texturas rugosas/frías.',
    '- Visuales clave: luces neón parpadeantes, sombras profundas, objetos específicos del entorno.',
    
    `TERMINA SIEMPRE con frase gancho: "¿Qué hará ${input.character.characterName} ahora?"`,
    
    'ESPAÑOL impecable. Sin metatexto narrativo. Inmersión total.'
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
