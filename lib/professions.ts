import { db } from '@/lib/db';
import { professions } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

export async function listProfessions() {
  const rows = await db.select().from(professions);
  return rows;
}

export async function getProfessionBySlug(slug: string) {
  const rows = await db.select().from(professions).where(eq(professions.slug, slug)).limit(1);
  return rows[0] || null;
}

