import { db } from '@/lib/db';
import { scenes } from '@/drizzle/schema';
import { generateNarrative } from '@/lib/venice-client';
import { asc, eq } from 'drizzle-orm';

type InconsistencyReport = {
  consistent: boolean;
  temporal: string[];
  character: string[];
  canonical: string[];
};

function normalize(t: string) {
  return t.toLowerCase();
}

function containsWord(haystack: string, needle: string) {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`\\b${escaped}\\b`, 'i');
  return re.test(haystack);
}

function hasDeathMarker(text: string, name: string) {
  const t = normalize(text);
  const markers = [
    'murió',
    'murio',
    'muere',
    'está muerto',
    'esta muerto',
    'fue asesinado',
    'fue asesinada',
    'falleció',
    'fallecio',
    'se suicidó',
    'se suicido'
  ];
  if (!containsWord(text, name)) return false;
  return markers.some((m) => t.includes(m));
}

function hasRevivalMarker(text: string) {
  const t = normalize(text);
  const markers = [
    'revive',
    'resucita',
    'resucitar',
    'vuelve a la vida',
    'aparece vivo',
    'aparece viva',
    'está vivo',
    'esta vivo',
    'está viva',
    'esta viva'
  ];
  return markers.some((m) => t.includes(m));
}

export async function detectInconsistencies(input: {
  action: string;
  characterName: string;
  recentScenes: Array<{ sceneNumber: number; narrative: string }>;
  prd: string;
}): Promise<InconsistencyReport> {
  const temporal: string[] = [];
  const character: string[] = [];
  const canonical: string[] = [];

  const prdText = input.prd || '';
  const actionText = input.action || '';
  const name = input.characterName || '';

  if (name && prdText && !containsWord(prdText, name)) {
    character.push(`El personaje ${name} no figura en el canon.`);
  }

  const lastDeath = input.recentScenes.some((s) => hasDeathMarker(s.narrative, name));
  const revivalInAction = hasRevivalMarker(actionText);
  if (lastDeath && revivalInAction) {
    character.push(`La acción contradice una muerte previa de ${name}.`);
  }

  const timeTravelMarkers = ['viaja en el tiempo', 'viajar en el tiempo', 'retrocede en el tiempo'];
  if (timeTravelMarkers.some((m) => normalize(actionText).includes(m))) {
    canonical.push('Se detecta viaje en el tiempo en la acción.');
  }

  const chronoMarkersRecent = ['hoy', 'presente', 'ahora'];
  const chronoMarkersAction = ['ayer', 'antes', 'semana pasada', 'anoche'];
  const recentHasPresent = input.recentScenes
    .map((s) => normalize(s.narrative))
    .some((t) => chronoMarkersRecent.some((m) => t.includes(m)));
  const actionHasPast = chronoMarkersAction.some((m) => normalize(actionText).includes(m));
  if (recentHasPresent && actionHasPast) {
    temporal.push('La acción parece situarse en el pasado respecto al contexto reciente.');
  }

  const consistent = temporal.length === 0 && character.length === 0 && canonical.length === 0;
  return { consistent, temporal, character, canonical };
}

export async function loadCanonicalPRD(): Promise<string> {
  const res = await fetch('file:///d:/Proyectos/discord-storyapp/PRD.md');
  if (!res.ok) return '';
  return await res.text();
}

export async function validateContribution(input: {
  action: string;
  characterName: string;
  recentScenes: Array<{ sceneNumber: number; narrative: string }>;
  prd: string;
}) {
  const report = await detectInconsistencies(input);
  if (!report.consistent) {
    const reasons = [
      ...report.character.map((r) => `Personaje: ${r}`),
      ...report.temporal.map((r) => `Temporal: ${r}`),
      ...report.canonical.map((r) => `Canon: ${r}`)
    ].join('\n');
    return { valid: false, reasons };
  }
  const rules = [
    'Debe ser en tercera persona.',
    'Longitud entre 1 y 300 caracteres.',
    'No contradice eventos clave definidos en el PRD.',
    'Mantiene coherencia con las últimas escenas.'
  ].join('\n');

  const prompt = [
    'Eres un verificador de coherencia narrativa.',
    'Devuelve "VALID" o "INVALID" y en caso de inválido lista razones breves.',
    '',
    'Reglas:',
    rules,
    '',
    'PRD:',
    input.prd.slice(0, 4000),
    '',
    'Últimas escenas:',
    input.recentScenes
      .map((s) => `#${s.sceneNumber}: ${s.narrative.slice(0, 200)}`)
      .join('\n'),
    '',
    `Acción propuesta por ${input.characterName}: "${input.action}"`
  ].join('\n');

  const result = await generateNarrative(prompt);
  const txt = result.trim().toUpperCase();
  const valid = txt.startsWith('VALID');
  const reasons = valid ? [] : result;
  return { valid, reasons };
}

export async function compileManuscript(storyId: string) {
  const all = await db
    .select({
      sceneNumber: scenes.sceneNumber,
      narrative: scenes.narrative
    })
    .from(scenes)
    .where(eq(scenes.storyId, storyId))
    .orderBy(asc(scenes.sceneNumber));
  const content = all
    .map((s) => `Escena #${s.sceneNumber}\n\n${s.narrative}\n`)
    .join('\n---\n');
  return content;
}

export async function summarizeManuscript(manuscript: string) {
  const prompt = [
    'Resume la historia en 10-12 líneas, destacando eventos y desarrollo de personajes.',
    'Tono editorial claro y orden cronológico.',
    'Texto en español.',
    '',
    manuscript.slice(0, 15000)
  ].join('\n');
  const summary = await generateNarrative(prompt);
  return summary;
}
