import 'dotenv/config';
import postgres from 'postgres';

async function reset() {
  const sql = postgres(process.env.POSTGRES_URL);
  const tables = [
    'events',
    'scenes',
    'character_factions',
    'characters',
    'factions',
    'regions',
    'manuscripts',
    'summaries',
    'synthesis_locks',
    'bot_flags',
    'professions',
    'stories'
  ];
  for (const t of tables) {
    try {
      await sql.unsafe(`DROP TABLE IF EXISTS ${t} CASCADE;`);
      console.log(`Dropped: ${t}`);
    } catch (e) {
      console.error(`Failed dropping ${t}:`, e);
    }
  }
  await sql.end({ timeout: 5 });
}

reset()
  .then(() => {
    console.log('Database reset complete.');
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

