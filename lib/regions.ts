import { db } from '@/lib/db';
import { regions } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

export async function listRegions() {
  const rows = await db.select().from(regions);
  return rows;
}

export async function getRegionBySlug(slug: string) {
  const rows = await db.select().from(regions).where(eq(regions.slug, slug)).limit(1);
  return rows[0] || null;
}

