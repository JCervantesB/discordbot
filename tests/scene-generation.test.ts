import { orchestrateSceneGenerationWithDeps } from '../lib/story-orchestrator';

async function testSuccessfulGeneration() {
  const input = {
    action: 'entra a la taberna y pide información',
    character: { characterName: 'Aria' } as any,
    recentScenes: []
  };
  const deps = {
    generateNarrativeFn: async () =>
      'Aria empuja la puerta de la taberna. Observa el brillo cálido y respira el aire a especias.\n\nSe acerca al mostrador y pregunta por rumores. Una sombra la escucha.',
    generatePromptFn: async ({ characterName, action }: { characterName: string; action: string; narrative: string }) =>
      `${characterName} ${action} | fantasy tavern interior, warm candlelight, detailed, cinematic, high detail`,
    generateImageFn: async () => 'data:image/png;base64,AAA',
    uploadImageFn: async () => 'https://res.cloudinary.com/demo/image/upload/v123/scene.png'
  };
  const result = await orchestrateSceneGenerationWithDeps(input, deps);
  if (!result.narrative || result.narrative.length < 10) {
    throw new Error('Narrativa vacía');
  }
  if (!result.imageUrl || !result.imageUrl.startsWith('https://')) {
    throw new Error('URL de imagen inválida');
  }
  if (!result.imagePrompt || result.imagePrompt.length > 200) {
    throw new Error('Prompt de imagen inválido');
  }
}

async function testPromptRespectsNarrativeDevice() {
  const narrative =
    'Un dispositivo desconocido aparece suspendido sobre la mano de Aria. Emeten un brillo azulado intenso que ilumina sus dedos y proyecta sombras nerviosas sobre la barra.';
  const input = {
    action: 'observa el dispositivo que flota sobre su mano',
    character: { characterName: 'Aria', description: 'exploradora de Restos Grisáceos' } as any,
    recentScenes: []
  };
  const deps = {
    generateNarrativeFn: async () => narrative,
    generatePromptFn: async ({
      characterName,
      action,
      narrative: fullNarrative
    }: {
      characterName: string;
      action: string;
      narrative: string;
    }) =>
      `${characterName} ${action} | ${fullNarrative.slice(
        0,
        120
      )} | unknown floating device above hand, strong blue glow lighting fingers, bar interior, cinematic`,
    generateImageFn: async () => 'data:image/png;base64,AAA',
    uploadImageFn: async () => 'https://res.cloudinary.com/demo/image/upload/v123/scene.png'
  };
  const result = await orchestrateSceneGenerationWithDeps(input, deps);
  if (!result.imagePrompt.includes('floating device') && !result.imagePrompt.includes('device above hand')) {
    throw new Error('El prompt no prioriza el dispositivo flotando sobre la mano como elemento clave.');
  }
  if (!/blue glow/i.test(result.imagePrompt)) {
    throw new Error('El prompt no refleja el brillo azulado del dispositivo.');
  }
}

async function testImageFailureFallback() {
  const input = {
    action: 'observa el bosque oscuro',
    character: { characterName: 'Kael' } as any,
    recentScenes: []
  };
  const deps = {
    generateNarrativeFn: async () =>
      'Kael se adentra en el bosque. El crujir de las ramas acompaña su avance.',
    generatePromptFn: async ({ characterName, action }: { characterName: string; action: string; narrative: string }) =>
      `${characterName} ${action} | dark forest, misty, moody, high detail`,
    generateImageFn: async () => {
      throw new Error('SinkIn fallo');
    },
    uploadImageFn: async () => 'https://res.cloudinary.com/demo/image/upload/v123/scene.png'
  };
  const result = await orchestrateSceneGenerationWithDeps(input, deps);
  if (result.imageUrl !== null) {
    throw new Error('Debe ser null cuando falla generación de imagen');
  }
}

async function testPixelArtConsistency() {
  const input = {
    action: 'explora las ruinas de Neoterra',
    character: {
      id: 'char-1',
      characterName: 'Kael',
      description: 'Capa roja, armadura metálica, ojos neón',
      currentRegionSlug: 'neoterra',
      storyId: 'story-1',
      userId: 'user-1'
    } as any,
    recentScenes: []
  };

  const deps = {
    generateNarrativeFn: async () => 'Kael camina entre los escombros de Neoterra.',
    generatePromptFn: async (args: any) => {
      if (!args.narrative.includes('Kael')) throw new Error('Falta personaje en prompt');
      return '16-bit pixel art, Kael in Neoterra ruins, red cape, metallic armor, neon eyes, snes style';
    },
    generateImageFn: async () => 'data:image/png;base64,AAA',
    uploadImageFn: async () => 'https://res.cloudinary.com/demo/image/upload/v123/scene.png'
  };

  const result = await orchestrateSceneGenerationWithDeps(input, deps);
  
  // Validación de keywords técnicas de Pixel Art
  const technicalKeywords = ['16-bit', 'pixel art', 'snes style'];
  const hasTechnical = technicalKeywords.every(k => result.imagePrompt.toLowerCase().includes(k));
  if (!hasTechnical) {
    throw new Error(`El prompt no contiene las especificaciones técnicas requeridas: ${result.imagePrompt}`);
  }

  // Validación de consistencia de personaje
  const characterKeywords = ['red cape', 'metallic armor', 'neon eyes'];
  const hasCharacter = characterKeywords.every(k => result.imagePrompt.toLowerCase().includes(k));
  if (!hasCharacter) {
    throw new Error(`El prompt no mantiene la consistencia del personaje: ${result.imagePrompt}`);
  }
}

async function run() {
  const cases = [
    { name: 'Generación exitosa', fn: testSuccessfulGeneration },
    { name: 'Fallback cuando falla imagen', fn: testImageFailureFallback },
    { name: 'Respeto a dispositivo en narrativa', fn: testPromptRespectsNarrativeDevice },
    { name: 'Consistencia Pixel Art y Personaje', fn: testPixelArtConsistency }
  ];
  for (const c of cases) {
    try {
      await c.fn();
      console.log(`[OK] ${c.name}`);
    } catch (e) {
      console.error(`[FAIL] ${c.name}: ${(e as Error).message}`);
      process.exitCode = 1;
    }
  }
}

run();
