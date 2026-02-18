import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const guildId = searchParams.get('guildId');
  if (!guildId) return json({ error: 'guildId requerido' }, 400);

  const storyRows = await db.execute<{ id: string }>(
    sql`SELECT id FROM stories WHERE guild_id = ${guildId} LIMIT 1`
  );
  const storyId = storyRows[0]?.id;
  if (!storyId) return json({ error: 'Historia no encontrada' }, 404);

  const scenesRows = await db.execute<{ scene_number: number; narrative: string }>(
    sql`SELECT scene_number, narrative FROM scenes WHERE story_id = ${storyId}::uuid ORDER BY scene_number DESC LIMIT 5`
  );
  const scenes = scenesRows.map((r) => ({
    sceneNumber: r.scene_number,
    narrative: r.narrative
  }));

  const manusRows = await db.execute<{ version: number; content: string }>(
    sql`SELECT version, content FROM manuscripts WHERE story_id = ${storyId}::uuid ORDER BY version DESC LIMIT 1`
  );
  const manuscript = manusRows[0]
    ? { version: manusRows[0].version, content: manusRows[0].content }
    : null;

  const summaryRows = await db.execute<{ version: number; summary: string }>(
    sql`SELECT version, summary FROM summaries WHERE story_id = ${storyId}::uuid ORDER BY version DESC LIMIT 1`
  );
  const summary = summaryRows[0]
    ? { version: summaryRows[0].version, summary: summaryRows[0].summary }
    : null;

  return json({ scenes, manuscript, summary });
}
