import { db } from '@/lib/db';
import { events } from '@/drizzle/schema';
import { DiceRollResult, DiceCategory, rollNarrativeDie } from '@/lib/dice';
import { eq, desc, and } from 'drizzle-orm';

export type EventType =
  | 'hostile_encounter'
  | 'environmental_hazard'
  | 'resource_find'
  | 'equipment_gain'
  | 'equipment_loss'
  | 'rest_refuge'
  | 'narrative_twist';

export type EnemyDescriptor = {
  id: string;
  name: string;
  faction: string;
  threatLevel: 'low' | 'medium' | 'high' | 'elite';
  behavior: string;
  weaknesses: string;
  description: string;
};

export type EventContext = {
  dice: DiceRollResult;
  category: DiceCategory;
  type: EventType;
  subtype: string;
  enemy?: EnemyDescriptor;
  narrativeInstruction: string;
  imageInstruction: string;
};

const REGION_ENEMIES: Record<string, EnemyDescriptor[]> = {
  neoterra: [
    {
      id: 'centinela_lumen',
      name: 'Centinela Lúmen',
      faction: 'axis_prime',
      threatLevel: 'medium',
      behavior: 'Patrulla lógica, reacciona a intrusiones y anomalías.',
      weaknesses: 'Saturación lumínica y sobrecarga de su núcleo.',
      description:
        'Figura humanoide perfecta de piel sintética blanca, ojos azul neón constantes, con núcleo lumínico en el pecho.'
    },
    {
      id: 'verdugo_hexadecimal',
      name: 'Verdugo Hexadecimal',
      faction: 'axis_prime',
      threatLevel: 'high',
      behavior: 'Caza objetivos marcados por el sistema central, implacable.',
      weaknesses: 'Interrupciones en el flujo de datos y ruido electromagnético.',
      description:
        'Alto y estilizado, máscara digital sin rasgos que proyecta símbolos binarios flotantes, empuña una hoja energética translúcida.'
    }
  ],
  restos_grisaceos: [
    {
      id: 'carronero_blindado',
      name: 'Carroñero Blindado',
      faction: 'restauradores',
      threatLevel: 'medium',
      behavior: 'Embosca caravanas y roba piezas reutilizables.',
      weaknesses: 'Puntos ciegos en las uniones de su armadura reciclada.',
      description: 'Armadura hecha de placas recicladas, pesado pero resistente.'
    }
  ],
  vasto_delta: [
    {
      id: 'espectro_datos',
      name: 'Espectro de Datos',
      faction: 'ecos_libres',
      threatLevel: 'medium',
      behavior: 'Aparece cerca de anomalías y distorsiones digitales.',
      weaknesses: 'Campos de anclaje y rituales de sincronización estable.',
      description: 'Humanoide compuesto por partículas digitales flotantes.'
    }
  ],
  el_hueco: [
    {
      id: 'oraculo_glitcheado',
      name: 'Oráculo Glitcheado',
      faction: 'ecos_libres',
      threatLevel: 'elite',
      behavior: 'Distorsiona la percepción y reescribe recuerdos.',
      weaknesses: 'Interrupción brusca de bucles de observación y espejos analógicos.',
      description:
        'Entidad suspendida con múltiples rostros humanos superpuestos, habla en eco desfasado.'
    }
  ],
  cielorritos: [
    {
      id: 'director_segunda_sincronia',
      name: 'Director de la Segunda Sincronía',
      faction: 'conclave_oscurecido',
      threatLevel: 'elite',
      behavior: 'Coordina experimentos a escala orbital y manipula enjambres.',
      weaknesses: 'Desincronización forzada de sus múltiples enlaces IA.',
      description:
        'Cuerpo suspendido en cápsula flotante conectado a múltiples inteligencias simultáneamente.'
    }
  ]
};

async function getRecentDiceCategories(
  storyId: string,
  userId: string,
  limit = 5
): Promise<DiceCategory[]> {
  const rows = await db
    .select({
      diceCategory: events.diceCategory
    })
    .from(events)
    .where(and(eq(events.storyId, storyId), eq(events.userId, userId)))
    .orderBy(desc(events.createdAt))
    .limit(limit);
  return rows.map((r) => r.diceCategory as DiceCategory);
}

function computeStreakModifiers(history: DiceCategory[]): number[] {
  if (!history.length) return [];
  const last = history[0];
  const negative = last === 'critical_bad' || last === 'bad';
  const positive = last === 'critical_good' || last === 'good';
  if (negative) return [2];
  if (positive) return [-1];
  return [];
}

function pickEventType(category: DiceCategory): EventType {
  if (category === 'critical_bad') return 'hostile_encounter';
  if (category === 'bad') return 'environmental_hazard';
  if (category === 'critical_good') return 'resource_find';
  if (category === 'good') return 'equipment_gain';
  return 'narrative_twist';
}

function buildEventContext(
  dice: DiceRollResult,
  storyId: string,
  userId: string,
  regionSlug?: string
): EventContext {
  const type = pickEventType(dice.category);
  let subtype = '';
  let enemy: EnemyDescriptor | undefined;
  let narrativeInstruction = '';
  let imageInstruction = '';

  if (type === 'hostile_encounter') {
    const enemies = (regionSlug && REGION_ENEMIES[regionSlug]) || [];
    if (enemies.length) {
      enemy = enemies[Math.floor(Math.random() * enemies.length)];
    }
    subtype = enemy ? `enemy_${enemy.id}` : 'enemy_generic';
    narrativeInstruction =
      'Ha ocurrido un encuentro hostil. Presenta claramente al enemigo, sus intenciones y la amenaza inmediata. ' +
      'Describe cómo el entorno reacciona a su presencia y al final de la escena ofrece dos opciones concretas que el personaje podría tomar para enfrentarlo o escapar.';
    imageInstruction =
      'Refuerza visualmente la presencia del enemigo y el peligro inminente, destacando su estética y el contraste con la región actual.';
  } else if (type === 'environmental_hazard') {
    subtype = 'hazard';
    narrativeInstruction =
      'Se desencadena un evento ambiental peligroso (tormenta, distorsión, derrumbe o similar) adaptado a la región actual. ' +
      'Muestra consecuencias inmediatas y cierra la escena con al menos dos caminos posibles para mitigar el peligro o retirarse.';
    imageInstruction =
      'Enfatiza el clima extremo, la distorsión ambiental y la vulnerabilidad del grupo en el paisaje regional.';
  } else if (type === 'resource_find') {
    subtype = 'resource';
    narrativeInstruction =
      'El grupo descubre un recurso valioso coherente con la tecnología y restos de la región. ' +
      'Sugiere cómo este hallazgo podría cambiar las probabilidades a su favor e incluye dos decisiones posibles sobre cómo usar o proteger el recurso.';
    imageInstruction =
      'Destaca el contraste entre ruina y hallazgo brillante, con foco en el objeto o lugar descubierto.';
  } else if (type === 'equipment_gain') {
    subtype = 'equipment';
    narrativeInstruction =
      'Aparece equipamiento o mejora tecnológica que puede integrarse a la historia. ' +
      'Describe brevemente cómo altera las capacidades del grupo e incluye dos opciones sobre quién lo usa o qué riesgo implica.';
    imageInstruction =
      'Muestra el nuevo equipo en primer plano, integrado en la estética de la región, con iluminación dramática.';
  } else if (type === 'equipment_loss') {
    subtype = 'loss';
    narrativeInstruction =
      'Algo esencial se rompe, se pierde o queda fuera de alcance. ' +
      'Enfatiza el impacto emocional y táctico, ofreciendo al final dos rutas para adaptarse a la pérdida.';
    imageInstruction =
      'Resalta la ausencia o destrucción del equipo, con foco en gestos del personaje y entorno inmediato.';
  } else if (type === 'rest_refuge') {
    subtype = 'rest';
    narrativeInstruction =
      'Se abre un espacio de paz o refugio improvisado. ' +
      'Aprovecha para profundizar en relaciones e introspección, incluyendo dos posibles decisiones sobre cómo aprovechar ese tiempo.';
    imageInstruction =
      'Escena más calma, iluminación suave, refugio precario en medio del paisaje hostil de la región.';
  } else {
    subtype = 'twist';
    narrativeInstruction =
      'Introduce un giro narrativo o información nueva conectada con la historia principal. ' +
      'Ofrece al menos dos caminos interpretativos o decisiones que podrían redefinir el rumbo de la trama.';
    imageInstruction =
      'Visualiza el momento del giro: descubrimiento, revelación o símbolo en el entorno que cambie la percepción del lugar.';
  }

  return {
    dice,
    category: dice.category,
    type,
    subtype,
    enemy,
    narrativeInstruction,
    imageInstruction
  };
}

export async function rollEventForScene(params: {
  storyId: string;
  userId: string;
  regionSlug?: string | null;
  factionSlug?: string | null;
}): Promise<EventContext> {
  const history = await getRecentDiceCategories(params.storyId, params.userId, 3);
  const modifiers = computeStreakModifiers(history);
  const dice = rollNarrativeDie(modifiers);
  const ctx = buildEventContext(dice, params.storyId, params.userId, params.regionSlug || undefined);

  await db.insert(events).values({
    storyId: params.storyId,
    sceneId: null,
    userId: params.userId,
    regionSlug: params.regionSlug ?? null,
    factionSlug: params.factionSlug ?? null,
    diceRoll: dice.finalRoll,
    diceCategory: dice.category,
    eventType: ctx.type,
    eventSubtype: ctx.subtype,
    payload: ctx.enemy ? { enemy: ctx.enemy } : {},
    outcome: null
  });

  return ctx;
}
