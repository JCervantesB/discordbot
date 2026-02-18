import { generateNarrative } from '@/lib/venice-client';
import { generateImageFromSinkIn } from '@/lib/sinkin-client';
import { type scenes, type characters as charactersTable } from '@/drizzle/schema';

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
  const contextSummary = input.recentScenes
    .map((s) => `#${s.sceneNumber}: ${s.narrative.slice(0, 160)}`)
    .join('\n');

  const prompt = [
    'Eres un narrador omnisciente de historias de fantasía/aventura.',
    'Genera una escena narrativa coherente y literaria.',
    `Acción del personaje (${input.character.characterName}): "${input.action}"`,
    contextSummary ? `Contexto previo:\n${contextSummary}` : 'No hay escenas previas.',
    'Requisitos:',
    '- Perspectiva en tercera persona.',
    '- Longitud 200-300 palabras.',
    '- Incluye detalles sensoriales (sonidos, olores, texturas).',
    '- Mantén tono épico/aventurero.',
    '- Termina con una frase gancho que invite a continuar la historia.'
  ].join('\n');

  const narrative = await generateNarrative(prompt);
  return narrative;
}

async function designImagePrompt(input: {
  action: string;
  characterName: string;
  narrative: string;
}) {
  const prompt = [
    'You are a visual scene designer for a fantasy story.',
    'Based on the following narrative and character action, write a single concise text-to-image prompt.',
    'Requirements:',
    '- English only.',
    '- Max 200 characters.',
    '- No line breaks.',
    '- Focus on visual elements: setting, mood, lighting, style.',
    '- Do not include camera jargon or text overlays.',
    `Character name: ${input.characterName}`,
    `Action: ${input.action}`,
    'Narrative:',
    input.narrative
  ].join('\n');

  const raw = await generateNarrative(prompt);
  const singleLine = raw.replace(/\s+/g, ' ').trim();
  const limited = singleLine.slice(0, 200);
  return limited;
}

export async function orchestrateSceneGeneration(input: OrchestratorInput): Promise<SceneGenerationResult> {
  const narrative = await generateSceneNarrative(input);
  const imagePrompt = await designImagePrompt({
    action: input.action,
    characterName: input.character.characterName,
    narrative
  });

  let imageUrl: string | null = null;
  try {
    imageUrl = await generateImageFromSinkIn(imagePrompt);
  } catch {
    imageUrl = null;
  }

  return {
    narrative,
    imagePrompt,
    imageUrl
  };
}
