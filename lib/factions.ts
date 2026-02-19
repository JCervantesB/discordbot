import { db } from '@/lib/db';
import { and, eq } from 'drizzle-orm';
import { factions, characterFactions } from '@/drizzle/schema';

export async function getFactionBySlug(slug: string) {
  const rows = await db.select().from(factions).where(eq(factions.slug, slug)).limit(1);
  return rows[0] || null;
}

export async function getPrimaryFactionForCharacter(characterId: string) {
  const rows = await db
    .select({
      id: factions.id,
      slug: factions.slug,
      name: factions.name,
      motto: factions.motto,
      description: factions.description,
      promptBase: factions.promptBase
    })
    .from(characterFactions)
    .innerJoin(factions, eq(characterFactions.factionId, factions.id))
    .where(and(eq(characterFactions.characterId, characterId), eq(characterFactions.isPrimary, true)))
    .limit(1);
  return rows[0] || null;
}

export async function setPrimaryFactionForCharacter(characterId: string, factionSlug: string) {
  const faction = await getFactionBySlug(factionSlug);
  if (!faction) throw new Error(`Facción desconocida: ${factionSlug}`);
  // Desmarcar cualquier primaria previa
  await db
    .update(characterFactions)
    .set({ isPrimary: false })
    .where(eq(characterFactions.characterId, characterId));
  // Upsert relación con is_primary = true
  const existing = await db
    .select()
    .from(characterFactions)
    .where(and(eq(characterFactions.characterId, characterId), eq(characterFactions.factionId, faction.id)))
    .limit(1);
  if (existing.length) {
    await db
      .update(characterFactions)
      .set({ isPrimary: true })
      .where(and(eq(characterFactions.characterId, characterId), eq(characterFactions.factionId, faction.id)));
  } else {
    await db
      .insert(characterFactions)
      .values({ characterId, factionId: faction.id, isPrimary: true });
  }
  return faction;
}

