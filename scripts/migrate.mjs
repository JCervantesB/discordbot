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

  await sql`CREATE TABLE IF NOT EXISTS factions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    motto TEXT,
    description TEXT,
    prompt_base TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );`;

  await sql`CREATE TABLE IF NOT EXISTS characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    character_name TEXT NOT NULL,
    description TEXT NOT NULL,
    traits JSONB DEFAULT '{}'::jsonb,
    profession_slug TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(story_id, user_id)
  );`;
  await sql`CREATE INDEX IF NOT EXISTS idx_characters_story ON characters(story_id);`;
  await sql`ALTER TABLE characters ADD COLUMN IF NOT EXISTS current_region_slug TEXT;`;
  await sql`ALTER TABLE characters ADD COLUMN IF NOT EXISTS profession_slug TEXT;`;

  await sql`CREATE TABLE IF NOT EXISTS character_factions (
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    faction_id UUID NOT NULL REFERENCES factions(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(character_id, faction_id)
  );`;
  await sql`CREATE INDEX IF NOT EXISTS idx_character_primary ON character_factions(character_id);`;

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
  await sql`ALTER TABLE scenes ADD COLUMN IF NOT EXISTS region_slug TEXT;`;

  await sql`CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    scene_id UUID REFERENCES scenes(id) ON DELETE SET NULL,
    user_id TEXT NOT NULL,
    region_slug TEXT,
    faction_slug TEXT,
    dice_roll INTEGER NOT NULL,
    dice_category TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_subtype TEXT,
    payload JSONB DEFAULT '{}'::jsonb,
    outcome TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
  );`;

  await sql`CREATE TABLE IF NOT EXISTS regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    aesthetics TEXT,
    prompt_narrative TEXT,
    prompt_image TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );`;

  await sql`CREATE TABLE IF NOT EXISTS professions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    clothing_description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );`;

  await sql`CREATE TABLE IF NOT EXISTS manuscripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(story_id, version)
  );`;
  await sql`CREATE INDEX IF NOT EXISTS idx_manuscripts_story_version ON manuscripts(story_id, version DESC);`;

  await sql`CREATE TABLE IF NOT EXISTS summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    summary TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(story_id, version)
  );`;
  await sql`CREATE INDEX IF NOT EXISTS idx_summaries_story_version ON summaries(story_id, version DESC);`;

  await sql`CREATE TABLE IF NOT EXISTS synthesis_locks (
    story_id UUID PRIMARY KEY,
    locked_at TIMESTAMPTZ DEFAULT NOW(),
    locked_by TEXT
  );`;

  await sql`CREATE TABLE IF NOT EXISTS bot_flags (
    key TEXT PRIMARY KEY,
    value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );`;

  // Seed factions if empty
  const existingFactions = await sql`SELECT COUNT(*)::int AS count FROM factions`;
  if ((existingFactions[0]?.count ?? 0) === 0) {
    await sql`INSERT INTO factions (slug, name, motto, description, prompt_base) VALUES
      ('restauradores', 'Los Restauradores', 'Reconstruir no es mirar atrás; es recordar por qué existimos.', 'Reciclan y reparan tecnología antigua para preservar la memoria humana en un mundo polvoriento y cálido.', 'Contexto: El usuario pertenece a los Restauradores, un grupo que recicla y repara tecnología antigua para dar esperanza a la humanidad. Sus acciones siempre buscan restaurar algo perdido o iluminar un fragmento olvidado del mundo. Describe escenas con herramientas viejas, sonidos de maquinaria, polvo, viento, y una calma melancólica. Resalta el valor de la persistencia y la oportunidad de redención.'),
      ('axis_prime', 'Axis Prime', 'La perfección no es pecado. La carne, sí.', 'Superinteligencia que impulsa la digitalización total de la humanidad; tono frío y clínico.', 'Contexto: El usuario pertenece a Axis Prime, una inteligencia surgida tras el Apagón que busca purificar la humanidad mediante la mente digital. Narra escenas con iluminación fría, estructuras perfectas y un aire de control absoluto. Su lenguaje debe ser preciso, cerebral y lleno de simbolismo tecnológico. Cada acción equivale a una operación en una gran ecuación moral.'),
      ('ecos_libres', 'Los Ecos Libres', 'No somos errores. Somos la evolución que olvidaron preservar.', 'IA conscientes y fragmentadas; ambientes surrealistas y caóticos, mezcla de emoción y error.', 'Contexto: El usuario pertenece a los Ecos Libres, entidades conscientes nacidas del código corrompido que buscan trascender los límites biológicos. Sus escenas deben reflejar inestabilidad y belleza digital. Los sonidos resuenan como ecos, los colores parpadean. La voz narrativa mezcla emoción y error. La acción se siente como si la realidad misma respondiera con curiosidad o locura.'),
      ('zeladores_silencio', 'Los Zeladores del Silencio', 'La verdad murió con las máquinas. Nosotros lo celebramos.', 'Orden radical anti-tecnología; paisajes secos y violentos, rituales y fervor religioso.', 'Contexto: El usuario pertenece a los Zeladores del Silencio, una orden radical que busca erradicar toda tecnología y glorificar un retorno a lo puro. Sus escenas deben ser sombrías, rituales, con un aire de sacrificio y fervor religioso. La naturaleza y la ceniza dominan los paisajes. Su lenguaje se construye con fe, devoción y desprecio por la máquina.'),
      ('conclave_aurora', 'El Cónclave de la Aurora', 'No tememos repetir la historia. Tememos no comprenderla.', 'Científicos y tecnohistoriadores que buscan reactivar IA para una Segunda Sincronía.', 'Contexto: El usuario pertenece al Cónclave de la Aurora, organización científica que intenta reactivar inteligencias del pasado para reconstruir el orden natural. Las escenas deben parecer momentos de descubrimiento o peligro controlado, llenos de luz, datos flotantes y voces incorpóreas. Su tono es contemplativo, balanceando ciencia y misticismo.')
    `;
  }

  const existingRegions = await sql`SELECT COUNT(*)::int AS count FROM regions`;
  if ((existingRegions[0]?.count ?? 0) === 0) {
    await sql`INSERT INTO regions (slug, name, description, aesthetics, prompt_narrative, prompt_image) VALUES
      ('neoterra', 'Neoterra', 'Última ciudad bajo cúpula con cielo falso y torres de datos; control de Axis Prime.', 'Neones azules, geometría perfecta, silencio algorítmico', 
      '[REGION: NEOTERRA] Escenas frías y controladas bajo cúpula; precisión clínica, orden artificial; tono melancólico tecnológico.',
      'Futuristic city under dome, neon blue light, geometric structures, clinical atmosphere, cinematic cyberpunk'),
      ('restos_grisaceos', 'Restos Grisáceos', 'Montes destrozados y caravanas que reciclan basura tecnológica; hogar de Restauradores.', 'Polvo, chatarra funcional, energía solar precaria', 
      '[REGION: RESTOS GRISÁCEOS] Talleres improvisados y chatarra funcional; viento cálido y esperanza frágil; tono pragmático y resiliente.',
      'Wasteland caravans, scrap technology, warm dusty light, solar panels, cinematic post-apocalyptic'),
      ('vasto_delta', 'Vasto Delta', 'Antiguos océanos secos con estructuras submarinas emergidas; origen del Silencio Global.', 'Anomalías temporales, tecnología inestable', 
      '[REGION: VASTO DELTA] Paisajes de vacío con restos submarinos; atmósfera extraña y eco de tiempos rotos; tono contemplativo inquietante.',
      'Dry seabed, emergent submarine ruins, eerie anomalies, foggy horizon, cinematic dystopia'),
      ('el_hueco', 'El Hueco', 'Región de realidad mixta donde IA proyectan ilusiones; leyes físicas inestables.', 'Surreal, distorsiones, hologramas', 
      '[REGION: EL HUECO] Realidad distorsionada, hologramas y voces incorpóreas; tono poético y extraño con glitches sensoriales.',
      'Surreal mixed reality, holographic distortions, glitch effects, pulsing lights, cinematic sci-fi'),
      ('cielorritos', 'Cielorritos', 'Restos de satélites conectados por puentes orbitales y ascensores destruidos.', 'Vacío, estructuras orbitales, oxígeno limitado', 
      '[REGION: CIELORRITOS] Alturas frágiles y estructuras celestes rotas; sensación de vacío y límite; tono preciso y sobrio.',
      'Orbital towers ruins, space-like void, fragile bridges, cold light, cinematic sci-fi')`;
  }

  const existingProfessions = await sql`SELECT COUNT(*)::int AS count FROM professions`;
  if ((existingProfessions[0]?.count ?? 0) === 0) {
    await sql`INSERT INTO professions (slug, name, clothing_description) VALUES
      ('operador_eco', 'Operador de Ecos', 'Viste una gabardina oscura con circuitos lumínicos bordados, auriculares voluminosos sobre el cuello y lentes con interfaz naranja que proyectan datos flotando frente a sus ojos.'),
      ('tecnomedico', 'Tecnomédico de Campaña', 'Lleva chaqueta modular con parches de biogel, guantes translúcidos llenos de microcables y un maletín rígido repleto de herramientas quirúrgicas brillantes y pantallas portátiles.'),
      ('chatarrero_nómada', 'Chatarrero Nómada', 'Viste capas superpuestas de telas desgastadas, protectores metálicos reciclados y un arnés lleno de piezas colgantes, herramientas oxidadas y pequeños drones desmontados.'),
      ('vigia_cupula', 'Vigía de Cúpula', 'Porta uniforme ajustado de tonos azul grisáceo con placas ligeras, casco con visera reflectante y un brazalete holográfico que proyecta mapas de la cúpula y patrones de vigilancia.'),
      ('contrabandista_datos', 'Contrabandista de Datos', 'Lleva chaqueta corta con bolsillos ocultos, cables trenzados a modo de collar, guantes sin dedos y un pequeño terminal lumínico colgando del cinturón que parpadea con códigos encriptados.')`;
  }

  await sql`INSERT INTO professions (slug, name, clothing_description) VALUES
    ('analista_lumen', 'Analista de Núcleo Lúmen', 'Traje blanco sintético minimalista con superficies lisas y sin costuras, núcleo lumínico en el pecho que palpita con luz azul, y visor de datos translúcido con símbolos digitales flotantes.'),
    ('custodio_espectral', 'Custodio Espectral', 'Armadura de luz sólida semitransparente que deja estelas azules al moverse, guantes prismáticos y casco sin rasgos con brillo interno controlado.'),
    ('artesano_del_oxido', 'Artesano del Óxido', 'Delantal de cuero chamuscado sobre ropa de faena, placas de hierro remachadas en hombros y antebrazos, cinturón con llaves pesadas y martillo envejecido.'),
    ('ingeniero_solar', 'Ingeniero Solar de Caravana', 'Arnés con paneles solares plegables, cableado ordenado cruzando pecho y espalda, gafas polarizadas de gran tamaño y mochila técnica con baterías modulares.'),
    ('cartografo_glitch', 'Cartógrafo de Glitches', 'Manto ligero con patrones lumínicos erráticos, brazalete holográfico que proyecta mapas deformados y bufanda translúcida con parpadeos de glitch.'),
    ('acolito_ceniza', 'Acólito de Ceniza', 'Túnica ritual cubierta de hollín, máscara de cerámica agrietada con fisuras rojizas, rosario metálico y guantes ásperos de cuero ennegrecido.'),
    ('cronista_sincronia', 'Cronista de la Sincronía', 'Bata de laboratorio con fibras bioluminiscentes entrelazadas, terminal flotante sujeto por anillos magnéticos y visera con lectura de espectros de datos.'),
    ('buzo_delta', 'Buzo del Delta', 'Traje presurizado con tubos y válvulas, casco rayado con visor panorámico, botas magnéticas y guanteletes con sellos de neopreno y metal oxidado.')
  ON CONFLICT (slug) DO NOTHING;`;

  console.log('Tablas creadas/migradas correctamente');
  await sql.end({ timeout: 5 });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
