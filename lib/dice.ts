export type DiceCategory =
  | 'critical_bad'
  | 'bad'
  | 'neutral'
  | 'good'
  | 'critical_good';

export type DiceRollResult = {
  baseRoll: number;
  finalRoll: number;
  category: DiceCategory;
  modifiers: number[];
};

export function categorizeRoll(roll: number): DiceCategory {
  if (roll <= 5) return 'critical_bad';
  if (roll <= 10) return 'bad';
  if (roll <= 15) return 'neutral';
  if (roll <= 19) return 'good';
  return 'critical_good';
}

export function rollNarrativeDie(modifiers: number[] = []): DiceRollResult {
  const baseRoll = Math.floor(Math.random() * 20) + 1;
  const sumMods = modifiers.reduce((acc, v) => acc + v, 0);
  let finalRoll = baseRoll + sumMods;
  if (finalRoll < 1) finalRoll = 1;
  if (finalRoll > 20) finalRoll = 20;
  const category = categorizeRoll(finalRoll);
  return {
    baseRoll,
    finalRoll,
    category,
    modifiers
  };
}

