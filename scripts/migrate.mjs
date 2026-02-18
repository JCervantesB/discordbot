import 'dotenv/config';
import postgres from 'postgres';

async function main() {
  const sql = postgres(process.env.POSTGRES_URL);

  await sql`CREATE TABLE IF NOT EXISTS stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id TEXT UNIQUE NOT NULL,
    title TEXT DEFAULT 'Historia Colaborativa',
    status TEXT DEFAULT 'active',
    scene_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );`;
  await sql`CREATE INDEX IF NOT EXISTS idx_stories_guild ON stories(guild_id);`;

  await sql`CREATE TABLE IF NOT EXISTS characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    character_name TEXT NOT NULL,
    description TEXT NOT NULL,
    traits JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(story_id, user_id)
  );`;
  await sql`CREATE INDEX IF NOT EXISTS idx_characters_story ON characters(story_id);`;

  await sql`CREATE TABLE IF NOT EXISTS scenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    scene_number INTEGER NOT NULL,
    character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
    user_id TEXT NOT NULL,
    user_prompt TEXT NOT NULL,
    narrative TEXT NOT NULL,
    image_url TEXT,
    location TEXT,
    transition_type TEXT DEFAULT 'main',
    context_used JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(story_id, scene_number)
  );`;
  await sql`CREATE INDEX IF NOT EXISTS idx_scenes_story_order ON scenes(story_id, scene_number DESC);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_scenes_created ON scenes(story_id, created_at DESC);`;

  console.log('Tablas creadas/migradas correctamente');
  await sql.end({ timeout: 5 });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
