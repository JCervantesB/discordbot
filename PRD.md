# PRD - Discord Roleplay Storyteller Bot (MVP)

## 📄 Documento de Requisitos del Producto

**Versión:** 1.0 MVP  
**Fecha:** Febrero 2026  
**Proyecto:** Sistema de Narrativa Colaborativa con IA para Discord  
**Stack:** Next.js 15 + Vercel AI SDK + Venice AI + PostgreSQL + Discord.js

---

## 🎯 Visión del Producto

Crear un bot de Discord que permita a comunidades generar historias colaborativas de roleplay mediante IA. Los usuarios escriben acciones simples con comandos, y el sistema genera narrativas literarias coherentes acompañadas de imágenes, manteniendo continuidad entre todas las escenas para crear una "novela" comunitaria.

### Objetivos del MVP
- ✅ Permitir registro de personajes por usuario
- ✅ Generar escenas narrativas con continuidad básica
- ✅ Crear imágenes representativas de cada escena
- ✅ Mantener coherencia entre múltiples usuarios
- ✅ Almacenar historia persistente por servidor Discord

### Fuera del Alcance del MVP
- ❌ Historias paralelas simultáneas
- ❌ Edición de escenas generadas
- ❌ Exportación de novela completa (PDF/ebook)
- ❌ Sistema de votación de escenas
- ❌ Voz-to-text para generar escenas
- ❌ Múltiples historias por servidor

---

## 👥 Usuarios y Casos de Uso

### Usuario Principal: Jugador de Roleplay en Discord

**Persona:**
- Miembro activo de servidor Discord con 10-100 miembros
- Interesado en roleplay/escritura colaborativa
- Experiencia técnica: Usuario básico (solo comandos Discord)
- Expectativa: Generar escenas sin conocimientos de escritura narrativa

### Casos de Uso Principales

#### CU-01: Crear Personaje
```
Como usuario
Quiero registrar mi personaje con nombre y descripción
Para que el sistema genere escenas desde su perspectiva
```

**Flujo:**
1. Usuario escribe `/personaje nombre:"Aria" descripcion:"Maga elfa de 200 años, sabia y misteriosa"`
2. Sistema valida datos (no vacíos, max 500 caracteres)
3. Sistema guarda personaje vinculado a user_id + guild_id
4. Bot responde con confirmación embebida

**Criterios de Aceptación:**
- ✅ Personaje guardado en DB con éxito
- ✅ Un personaje por usuario por servidor
- ✅ Actualizable con mismo comando
- ✅ Respuesta < 2 segundos

---

#### CU-02: Generar Escena Individual
```
Como usuario con personaje registrado
Quiero escribir una acción/diálogo
Para obtener una narrativa literaria con imagen
```

**Flujo:**
1. Usuario escribe `/generate accion:"Aria entra a la taberna buscando información"`
2. Sistema valida personaje existe
3. Orquestador consulta últimas 3 escenas (contexto)
4. Narrador genera narrativa omnisciente (200-300 palabras)
5. Generador de imágenes crea representación visual
6. Sistema guarda escena en DB con número secuencial
7. Bot responde con embed: imagen + narrativa + gancho

**Criterios de Aceptación:**
- ✅ Narrativa generada en < 15 segundos
- ✅ Imagen generada y almacenada correctamente
- ✅ Narrativa incluye nombre del personaje
- ✅ Escena numerada secuencialmente (#1, #2, #3...)
- ✅ Embed formateado correctamente en Discord

---

#### CU-03: Continuidad entre Usuarios
```
Como segundo usuario
Quiero generar una escena que responda a la anterior
Para crear una historia conectada
```

**Flujo:**
1. Usuario B escribe `/generate accion:"Kael escucha el alboroto y entra a la taberna"`
2. Sistema carga contexto: últimas 3 escenas (incluyendo de Usuario A)
3. Agente de Continuidad detecta relación espacial (ambos en taberna)
4. Narrador genera escena que referencia contexto previo
5. Sistema guarda con metadata de continuidad
6. Bot responde con escena que menciona evento anterior

**Criterios de Aceptación:**
- ✅ Narrativa menciona eventos de escenas anteriores
- ✅ Coherencia espacial (misma ubicación si aplica)
- ✅ Coherencia temporal (referencias a "momentos atrás")
- ✅ No contradice información establecida

---

#### CU-04: Consultar Historia
```
Como usuario
Quiero ver las últimas escenas generadas
Para recordar el contexto actual
```

**Flujo:**
1. Usuario escribe `/historia cantidad:5`
2. Sistema consulta últimas N escenas ordenadas por timestamp
3. Bot responde con lista numerada: #N, autor, resumen (50 palabras)
4. Include enlaces a mensajes originales

**Criterios de Aceptación:**
- ✅ Muestra últimas N escenas (default: 5, max: 10)
- ✅ Ordenadas cronológicamente
- ✅ Incluye número de escena, usuario, timestamp
- ✅ Respuesta < 3 segundos

---

#### CU-05: Iniciar Nueva Historia
```
Como administrador del servidor
Quiero reiniciar la historia
Para comenzar una nueva narrativa
```

**Flujo:**
1. Admin escribe `/historia_nueva confirmar:true`
2. Sistema verifica permisos (MANAGE_GUILD)
3. Sistema archiva historia actual
4. Crea nueva entrada en tabla stories
5. Preserva personajes existentes
6. Bot confirma reset y número de escenas archivadas

**Criterios de Aceptación:**
- ✅ Solo ejecutable por administradores
- ✅ Requiere confirmación explícita
- ✅ Historia anterior accesible (no eliminada)
- ✅ Escena counter reseteado a 0

---

## 🏗️ Arquitectura Técnica

### Stack Tecnológico

| Capa | Tecnología | Versión |
|------|------------|---------|
| **Backend** | Next.js | 15.x |
| **Runtime** | Node.js | 20.x |
| **Framework IA** | Vercel AI SDK | 4.x |
| **LLM Provider** | Venice AI | API v1 |
| **Base de Datos** | PostgreSQL (Vercel Postgres) | 16+ |
| **ORM** | Drizzle ORM | 0.36+ |
| **Bot Discord** | discord.js | 14.x |
| **Cache** | Vercel KV (Redis) | Latest |
| **Storage** | Vercel Blob | Latest |
| **Hosting** | Vercel | Edge Runtime |

### Variables de Entorno Requeridas

```bash
# Discord
DISCORD_BOT_TOKEN=          # Bot token desde Discord Developer Portal
DISCORD_PUBLIC_KEY=         # Para verificar interactions
DISCORD_APPLICATION_ID=     # Application ID

# Venice AI
VENICE_API_KEY=             # API key de Venice AI
VENICE_BASE_URL=https://api.venice.ai/v1

# Database
POSTGRES_URL=               # Vercel Postgres connection string
POSTGRES_PRISMA_URL=        # Connection pooling
POSTGRES_URL_NON_POOLING=   # Direct connection

# Cache & Storage
KV_URL=                     # Vercel KV Redis
KV_REST_API_URL=
KV_REST_API_TOKEN=
BLOB_READ_WRITE_TOKEN=      # Vercel Blob storage

# Configuración
NODE_ENV=production
RATE_LIMIT_MAX_REQUESTS=5   # Por minuto por guild
```

---

## 🗄️ Modelo de Datos (PostgreSQL)

### Diagrama ER Simplificado

```
stories (1) ──< (N) characters
  │
  └──< (N) scenes
  │
  └──< (1) story_memory
```

### Tablas Principales

#### 1. `stories`
```sql
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT UNIQUE NOT NULL,
  title TEXT DEFAULT 'Historia Colaborativa',
  status TEXT DEFAULT 'active', -- 'active', 'archived'
  scene_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stories_guild ON stories(guild_id);
```

**Descripción:** Una historia por servidor Discord. El MVP solo soporta una historia activa por guild.

---

#### 2. `characters`
```sql
CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  character_name TEXT NOT NULL,
  description TEXT NOT NULL,
  traits JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, user_id)
);

CREATE INDEX idx_characters_story ON characters(story_id);
CREATE INDEX idx_characters_user ON characters(story_id, user_id);
```

**Campos:**
- `traits`: `{ "appearance": "...", "personality": "...", "abilities": [...] }`

**Reglas de Negocio:**
- Un personaje por usuario por historia
- Actualizable (sobrescribe con UPDATE)
- Se preserva al archivar historia

---

#### 3. `scenes`
```sql
CREATE TABLE scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  scene_number INTEGER NOT NULL,
  character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL,
  user_prompt TEXT NOT NULL,
  narrative TEXT NOT NULL,
  image_url TEXT,
  location TEXT,
  transition_type TEXT DEFAULT 'main', -- 'main', 'meanwhile', 'later'
  context_used JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, scene_number)
);

CREATE INDEX idx_scenes_story_order ON scenes(story_id, scene_number DESC);
CREATE INDEX idx_scenes_created ON scenes(story_id, created_at DESC);
```

**Campos:**
- `user_prompt`: Input original del usuario
- `narrative`: Texto generado por IA (200-400 palabras)
- `image_url`: URL en Vercel Blob
- `location`: Extraída por IA para coherencia espacial
- `transition_type`: Tipo de transición narrativa
- `context_used`: Array de scene_numbers usados como contexto

**Reglas de Negocio:**
- `scene_number` auto-incrementado por historia
- No editable una vez creada (MVP)
- Máximo 1000 escenas por historia (límite soft)

---

#### 4. `story_memory`
```sql
CREATE TABLE story_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID UNIQUE NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  compiled_narrative TEXT NOT NULL,
  key_events JSONB DEFAULT '[]',
  active_locations JSONB DEFAULT '[]',
  character_states JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_memory_story ON story_memory(story_id);
```

**Campos:**
- `compiled_narrative`: Resumen de historia hasta ahora (max 2000 palabras)
- `key_events`: `[{ scene_number, event, importance }]`
- `active_locations`: `["Taberna", "Bosque Oscuro"]`
- `character_states`: `{ "user_id": { "last_seen": "scene_number", "status": "..." } }`

**Actualización:** Cada 5 escenas nuevas o cuando narrativa excede threshold.

---

## 🤖 Sistema Multi-Agente

### Arquitectura de Agentes (Vercel AI SDK)

```typescript
// lib/agents/orchestrator.ts
import { createAgent } from 'ai';
import { venice } from '@/lib/venice-client';

const orchestratorAgent = createAgent({
  model: venice('llama-3.3-70b'), // Modelo principal
  name: 'orchestrator',
  instructions: `
    Eres el orquestador de un sistema de narrativa colaborativa.
    Coordinas agentes para generar escenas coherentes.
    
    Proceso:
    1. Analiza el prompt del usuario
    2. Consulta contexto (últimas 3 escenas)
    3. Llama al agente de continuidad
    4. Llama al agente narrador
    5. Llama al agente de imagen
    6. Actualiza memoria de largo plazo
  `,
  tools: {
    getContext: getContextTool,
    checkContinuity: continuityAgent,
    generateNarrative: narratorAgent,
    generateImage: imageAgent,
    updateMemory: memoryAgent,
  },
  maxSteps: 8,
});
```

### Agentes Individuales

#### 1. **Agente Orquestador** (Controlador Principal)
**Modelo:** `llama-3.3-70b` (Venice)  
**Responsabilidad:** Coordinar flujo completo de generación

**Input:**
```typescript
{
  storyId: string;
  userId: string;
  characterId: string;
  prompt: string; // "Aria entra a la taberna"
}
```

**Output:**
```typescript
{
  sceneNumber: number;
  narrative: string;
  imageUrl: string;
  location: string;
  transition: 'main' | 'meanwhile' | 'later';
}
```

**Lógica:**
1. Validar personaje existe
2. Obtener contexto (últimas 3 escenas + memoria)
3. Determinar tipo de transición necesaria
4. Invocar agente narrador
5. Invocar agente de imagen en paralelo
6. Guardar escena en DB
7. Invocar actualización de memoria (async)

---

#### 2. **Agente de Continuidad**
**Modelo:** `llama-3.3-70b`  
**Responsabilidad:** Garantizar coherencia con historia existente

**Input:**
```typescript
{
  newPrompt: string;
  recentScenes: Scene[]; // Últimas 3-5
  storyMemory: StoryMemory;
}
```

**Output:**
```typescript
{
  suggestedTransition: 'main' | 'meanwhile' | 'later';
  locationMatch: boolean;
  timeRelation: 'simultaneous' | 'after' | 'before';
  contradictions: string[];
  contextSummary: string; // Para narrador
}
```

**Prompts del Sistema:**
```
Analiza si esta nueva acción es coherente con las escenas previas.
- ¿Ocurre en la misma ubicación?
- ¿Es simultánea o posterior?
- ¿Contradice información establecida?
- Sugiere tipo de transición narrativa apropiada
```

---

#### 3. **Agente Narrador**
**Modelo:** `llama-3.3-70b`  
**Responsabilidad:** Generar narrativa literaria omnisciente

**Input:**
```typescript
{
  userPrompt: string;
  character: Character;
  contextSummary: string; // Del agente de continuidad
  transition: string;
}
```

**Output:**
```typescript
{
  narrative: string; // 200-400 palabras
  extractedLocation: string;
  mood: string;
  hook: string; // Última frase gancho
}
```

**Instrucciones del Sistema:**
```
Eres un narrador omnisciente de historias de fantasía/aventura.

Genera una escena narrativa que:
1. Use perspectiva de tercera persona
2. Incorpore la acción del personaje: "${userPrompt}"
3. Respete el contexto: "${contextSummary}"
4. Use transición: "${transition}" (ej: "Mientras tanto en la taberna...")
5. Longitud: 200-300 palabras
6. Incluya detalles sensoriales (sonidos, olores, texturas)
7. Termine con gancho narrativo que invite a continuar
8. Mantén tono consistente (épico, misterioso, aventurero)

NO incluyas diálogos directos del personaje a menos que el usuario los especifique.
Describe acciones e intenciones, no narres pensamientos internos.
```

**Ejemplo Output:**
```
El crepúsculo teñía las calles de Valdoria con tonos carmesí cuando Aria, 
la maga elfa, cruzó el umbral de la Taberna del Cuervo Dorado. El aroma 
a cerveza especiada y pan recién horneado contrastaba con el silencio tenso 
que impregnaba el lugar. Los parroquianos, habitualmente ruidosos, apenas 
susurraban entre sí, sus miradas esquivas evitando la entrada.

Aria avanzó con paso firme hacia la barra, sus ojos violetas escrutando 
cada rincón en busca de información sobre el artefacto perdido. El tabernero, 
un enano de barba gris, pulía una jarra con movimientos mecánicos, claramente 
incómodo. Algo había sucedido aquí, y el miedo aún flotaba en el aire como 
un espectro invisible.

En la mesa del rincón, una figura encapuchada observaba a la maga con 
interés perturbador. ¿Sería esta la fuente de información que buscaba... 
o una nueva amenaza en su ya peligroso camino?
```

---

#### 4. **Agente Generador de Imágenes**
**Responsabilidad:** Crear imagen representativa de la escena

**Input:**
```typescript
{
  narrative: string; // Narrativa completa
  character: Character;
  mood: string;
}
```

**Proceso:**
1. Extraer elementos visuales clave de la narrativa
2. Construir prompt optimizado para generación de imagen
3. Llamar a Venice AI Image API (o fallback: Replicate/Stability)
4. Almacenar imagen en Vercel Blob
5. Retornar URL pública

**Prompt de Imagen (generado por IA):**
```typescript
function buildImagePrompt(narrative: string, character: Character): string {
  // Agente extrae: setting, mood, character appearance, action
  return `
    Fantasy illustration, digital art.
    Scene: Elven mage woman with violet eyes entering a dimly lit tavern at dusk
    Setting: Medieval fantasy tavern interior, warm lighting from candles
    Mood: Tense, mysterious atmosphere
    Style: Cinematic, detailed, high fantasy art
    Perspective: Wide shot showing character and environment
    Quality: High detail, professional illustration
  `.trim();
}
```

**Configuración Imagen:**
- Aspect ratio: 16:9 (1024x576)
- Style: Fantasy illustration, cinematic
- Quality: Standard (balance velocidad/calidad)
- Safety: Content filtering activado

**Fallback:** Si generación falla, usar placeholder genérico con texto scene_number.

---

#### 5. **Agente de Memoria (Historiador)**
**Modelo:** `llama-3.3-70b`  
**Responsabilidad:** Actualizar memoria de largo plazo

**Trigger:** Cada 5 escenas nuevas o cuando compiled_narrative > 2000 palabras

**Input:**
```typescript
{
  storyId: string;
  newScenes: Scene[]; // Escenas desde última actualización
  currentMemory: StoryMemory;
}
```

**Output:**
```typescript
{
  updatedNarrative: string; // Resumen consolidado
  keyEvents: Array<{
    sceneNumber: number;
    event: string;
    importance: number; // 1-10
  }>;
  activeLocations: string[];
  characterStates: Record<string, CharacterState>;
}
```

**Instrucciones:**
```
Actualiza el resumen maestro de la historia incorporando las nuevas escenas.

Mantén:
1. Resumen conciso (max 2000 palabras)
2. Eventos clave ordenados cronológicamente
3. Estado actual de personajes principales
4. Ubicaciones activas en la narrativa
5. Conflictos sin resolver

Formato narrativo, como si escribieras sinopsis de novela.
```

---

## 🔌 Integración Discord

### Arquitectura Bot

**Enfoque:** Interactions API (Webhook) - Serverless-friendly

```
Usuario escribe comando en Discord
         ↓
Discord envía POST a /api/discord
         ↓
Vercel Edge Function procesa
         ↓
Responde a Discord (max 3s)
         ↓
Si proceso largo: defer → followup
```

### Comandos Slash (Slash Commands)

#### Comando 1: `/personaje`
```typescript
{
  name: 'personaje',
  description: 'Registra o actualiza tu personaje',
  options: [
    {
      name: 'nombre',
      type: ApplicationCommandOptionType.String,
      description: 'Nombre del personaje',
      required: true,
      maxLength: 50
    },
    {
      name: 'descripcion',
      type: ApplicationCommandOptionType.String,
      description: 'Descripción del personaje (personalidad, apariencia, habilidades)',
      required: true,
      maxLength: 500
    }
  ]
}
```

**Respuesta:**
```typescript
{
  embeds: [{
    title: '✨ Personaje Registrado',
    color: 0x5865F2,
    fields: [
      { name: 'Nombre', value: 'Aria', inline: true },
      { name: 'Usuario', value: '@username', inline: true },
      { name: 'Descripción', value: 'Maga elfa de 200 años...' }
    ],
    footer: { text: 'Usa /generate para comenzar tu historia' }
  }]
}
```

---

#### Comando 2: `/generate`
```typescript
{
  name: 'generate',
  description: 'Genera una nueva escena en la historia',
  options: [
    {
      name: 'accion',
      type: ApplicationCommandOptionType.String,
      description: 'Acción, diálogo o descripción de tu personaje',
      required: true,
      maxLength: 300
    }
  ]
}
```

**Respuesta (Deferred):**
```typescript
// 1. Respuesta inmediata (defer)
await interaction.deferReply();

// 2. Procesamiento (5-15s)
const scene = await orchestratorAgent.generateScene(...);

// 3. Followup con resultado
await interaction.editReply({
  embeds: [{
    title: `📖 Escena #${scene.number}`,
    description: scene.narrative,
    image: { url: scene.imageUrl },
    color: 0x2ECC71,
    footer: { 
      text: `Generado por ${character.name} • ${scene.location}` 
    },
    timestamp: new Date().toISOString()
  }]
});
```

---

#### Comando 3: `/historia`
```typescript
{
  name: 'historia',
  description: 'Consulta escenas recientes de la historia',
  options: [
    {
      name: 'cantidad',
      type: ApplicationCommandOptionType.Integer,
      description: 'Número de escenas a mostrar',
      required: false,
      minValue: 1,
      maxValue: 10
    }
  ]
}
```

**Respuesta:**
```typescript
{
  embeds: [{
    title: '📚 Historia Reciente',
    description: 'Últimas escenas generadas',
    fields: scenes.map(s => ({
      name: `#${s.scene_number} - ${s.character.name}`,
      value: `${s.narrative.slice(0, 100)}...\n🕐 ${formatTime(s.created_at)}`
    })),
    footer: { text: `Total de escenas: ${storyData.scene_count}` }
  }]
}
```

---

#### Comando 4: `/historia_nueva` (Admin)
```typescript
{
  name: 'historia_nueva',
  description: '[ADMIN] Archiva la historia actual y comienza una nueva',
  defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
  options: [
    {
      name: 'confirmar',
      type: ApplicationCommandOptionType.Boolean,
      description: 'Confirma que deseas archivar la historia actual',
      required: true
    }
  ]
}
```

---

### Registro de Comandos

```typescript
// scripts/register-commands.ts
import { REST, Routes } from 'discord.js';

const commands = [
  personajeCommand,
  generateCommand,
  historiaCommand,
  historiaNuevaCommand
];

const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN!);

await rest.put(
  Routes.applicationCommands(process.env.DISCORD_APPLICATION_ID!),
  { body: commands }
);
```

**Ejecutar:** `npm run register-commands` en deploy inicial.

---

## 🔐 Seguridad y Validaciones

### Verificación Discord

```typescript
// lib/discord/verify.ts
import { verifyKey } from 'discord-interactions';

export function verifyDiscordRequest(req: Request): boolean {
  const signature = req.headers.get('x-signature-ed25519');
  const timestamp = req.headers.get('x-signature-timestamp');
  const body = await req.text();
  
  return verifyKey(
    body,
    signature!,
    timestamp!,
    process.env.DISCORD_PUBLIC_KEY!
  );
}
```

**Regla:** Rechazar todos los requests sin firma válida (403).

---

### Rate Limiting

```typescript
// lib/rate-limit.ts
import { kv } from '@vercel/kv';

export async function checkRateLimit(guildId: string): Promise<boolean> {
  const key = `ratelimit:${guildId}`;
  const current = await kv.incr(key);
  
  if (current === 1) {
    await kv.expire(key, 60); // 1 minuto
  }
  
  return current <= 5; // Máximo 5 generaciones/minuto por guild
}
```

**Respuesta si excedido:**
```typescript
{
  content: '⏱️ Límite de generaciones alcanzado. Espera 1 minuto.',
  ephemeral: true
}
```

---

### Validación de Inputs

```typescript
// lib/validation.ts
import { z } from 'zod';

export const characterSchema = z.object({
  nombre: z.string()
    .min(2, 'Nombre muy corto')
    .max(50, 'Nombre muy largo')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'Solo letras y espacios'),
  
  descripcion: z.string()
    .min(20, 'Descripción muy corta (mínimo 20 caracteres)')
    .max(500, 'Descripción muy larga (máximo 500)')
});

export const generateSchema = z.object({
  accion: z.string()
    .min(10, 'Acción muy corta')
    .max(300, 'Acción muy larga')
});
```

---

### Moderación de Contenido

```typescript
// lib/moderation.ts
export async function moderateContent(text: string): Promise<{
  safe: boolean;
  reason?: string;
}> {
  // Filtro básico de palabras prohibidas
  const bannedWords = ['...', '...']; // Configurar
  
  const lowerText = text.toLowerCase();
  for (const word of bannedWords) {
    if (lowerText.includes(word)) {
      return { safe: false, reason: 'Contenido inapropiado detectado' };
    }
  }
  
  // Opcional: Llamar a API de moderación (OpenAI Moderation)
  // const result = await openai.moderations.create({ input: text });
  
  return { safe: true };
}
```

---

## 📊 Métricas y Monitoreo

### KPIs del MVP

| Métrica | Objetivo | Tracking |
|---------|----------|----------|
| Tiempo respuesta `/generate` | < 15 segundos (p95) | Vercel Analytics |
| Tasa de error generación | < 5% | Error logging |
| Escenas generadas/día | 50+ (primer mes) | DB query |
| Usuarios activos/semana | 10+ | DB unique users |
| Coherencia narrativa | Manual review | Feedback users |

### Logging

```typescript
// lib/logger.ts
export function logSceneGeneration(data: {
  storyId: string;
  userId: string;
  sceneNumber: number;
  duration: number;
  success: boolean;
  error?: string;
}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: 'scene_generated',
    ...data
  }));
}
```

**Almacenar en:** Vercel Logs (búsqueda por `event:scene_generated`)

---

### Error Handling

```typescript
// app/api/discord/route.ts
try {
  const scene = await orchestratorAgent.generateScene(...);
  return successResponse(scene);
} catch (error) {
  logError(error);
  
  if (error instanceof RateLimitError) {
    return rateLimitResponse();
  }
  
  if (error instanceof AIGenerationError) {
    return errorResponse('No pude generar la escena. Intenta con otra acción.');
  }
  
  return errorResponse('Error inesperado. Intenta nuevamente en unos segundos.');
}
```

---

## 🚀 Plan de Implementación

### Fase 1: Setup Base (Semana 1)

#### Día 1-2: Infraestructura
- [ ] Crear proyecto Next.js 15 con App Router
- [ ] Configurar Vercel Postgres (Drizzle ORM)
- [ ] Configurar Vercel KV (Redis)
- [ ] Configurar Vercel Blob
- [ ] Setup variables de entorno
- [ ] Crear schema DB y ejecutar migraciones

#### Día 3-4: Discord Bot Base
- [ ] Crear Discord Application
- [ ] Implementar `/api/discord` webhook endpoint
- [ ] Implementar verificación de firma
- [ ] Registrar comandos slash básicos
- [ ] Probar ping-pong interaction

#### Día 5-7: Comandos Básicos
- [ ] Implementar `/personaje` (CRUD characters)
- [ ] Implementar `/historia` (query scenes)
- [ ] Tests de integración Discord ↔ DB
- [ ] Rate limiting básico

---

### Fase 2: Sistema de Agentes (Semana 2)

#### Día 8-10: Agente Narrador
- [ ] Configurar Venice AI client (OpenAI-compatible)
- [ ] Implementar agente narrador con prompts
- [ ] Tests unitarios generación narrativa
- [ ] Ajustar prompts para calidad

#### Día 11-12: Agente de Continuidad
- [ ] Implementar lógica de contexto (últimas N escenas)
- [ ] Implementar detección de transiciones
- [ ] Tests de coherencia espacial/temporal

#### Día 13-14: Agente Orquestador
- [ ] Implementar orquestador multi-agente
- [ ] Conectar flujo completo: contexto → narrador → DB
- [ ] Implementar `/generate` end-to-end
- [ ] Tests de integración completa

---

### Fase 3: Imágenes y Memoria (Semana 3)

#### Día 15-17: Generación de Imágenes
- [ ] Implementar agente de imagen (Venice/Replicate)
- [ ] Integrar Vercel Blob storage
- [ ] Optimizar prompts de imagen
- [ ] Implementar fallback si falla generación
- [ ] Tests con diferentes estilos visuales

#### Día 18-19: Memoria de Largo Plazo
- [ ] Implementar agente historiador
- [ ] Lógica de actualización `story_memory`
- [ ] Tests de compilación narrativa
- [ ] Implementar trigger cada 5 escenas

#### Día 20-21: Integración Final
- [ ] Conectar todos los agentes
- [ ] Tests end-to-end completos
- [ ] Optimización de performance
- [ ] Ajuste de prompts basado en resultados

---

### Fase 4: Pulido y Deploy (Semana 4)

#### Día 22-24: Testing y QA
- [ ] Tests de carga (múltiples usuarios simultáneos)
- [ ] Tests de edge cases (escenas sin contexto, etc)
- [ ] Validación de coherencia narrativa manual
- [ ] Tests de moderación de contenido
- [ ] Fix de bugs críticos

#### Día 25-26: Documentación
- [ ] README con instrucciones setup
- [ ] Guía de comandos para usuarios
- [ ] Documentación de API interna
- [ ] Guía de troubleshooting

#### Día 27-28: Deploy y Monitoreo
- [ ] Deploy a producción en Vercel
- [ ] Configurar alertas (Vercel + Discord webhook)
- [ ] Invitar bot a servidor de prueba
- [ ] Monitorear primeras 24 horas
- [ ] Hotfixes según necesidad

---

## 🧪 Criterios de Éxito del MVP

### Funcionales
- ✅ Usuario puede registrar personaje
- ✅ Usuario puede generar escena con narrativa coherente
- ✅ Múltiples usuarios pueden crear historia conectada
- ✅ Imagen se genera para cada escena
- ✅ Historia persiste entre sesiones
- ✅ Comandos responden en < 15s (p95)

### No Funcionales
- ✅ Sistema soporta 10 usuarios concurrentes
- ✅ Tasa de error < 5%
- ✅ Narrativa mantiene calidad literaria consistente
- ✅ Imágenes son relevantes a la escena
- ✅ No hay contradicciones narrativas evidentes

### User Acceptance
- ✅ 5 usuarios beta completan historia de 20+ escenas
- ✅ Feedback positivo sobre calidad narrativa
- ✅ Usuarios regresan a generar más escenas
- ✅ Zero reportes de contenido inapropiado

---

## 📦 Entregables del MVP

### Código
- ✅ Repositorio Git con código fuente completo
- ✅ README con instrucciones de setup
- ✅ Scripts de migración DB
- ✅ Tests automatizados (cobertura > 70%)

### Infraestructura
- ✅ Aplicación desplegada en Vercel (producción)
- ✅ Bot de Discord funcionando 24/7
- ✅ Base de datos Postgres operativa
- ✅ Monitoreo y alertas configuradas

### Documentación
- ✅ PRD técnico (este documento)
- ✅ Guía de usuario (comandos Discord)
- ✅ Documentación de API
- ✅ Diagramas de arquitectura

---

## 🔮 Roadmap Post-MVP

### v1.1 - Mejoras de Usuario (Mes 2)
- Comando `/editar_personaje` para modificar traits
- Comando `/escena <numero>` para ver escena específica
- Reacciones en Discord para votar escenas favoritas
- Export de historia completa a TXT

### v1.2 - Multi-Historia (Mes 3)
- Soporte para múltiples historias por servidor
- Comando `/historia_cambiar` para alternar entre historias
- Categorías de historias (fantasía, sci-fi, horror)

### v1.3 - Personalización (Mes 4)
- Estilos narrativos configurables (épico, humorístico, oscuro)
- Estilos visuales de imágenes configurables
- Configuración de longitud de narrativa

### v2.0 - Features Avanzadas (Mes 5-6)
- Voz-to-text para generar escenas
- Export a PDF/EPUB con formato de libro
- Sistema de logros para usuarios activos
- API pública para integraciones externas

---

## 📞 Contacto y Soporte

**Desarrollador:** [Tu nombre]  
**Email:** [tu@email.com]  
**Discord Support Server:** [Link servidor]  
**Repositorio:** [GitHub URL]  
**Issues/Bugs:** [GitHub Issues URL]

---

## 📝 Changelog

### v1.0.0-MVP (Febrero 2026)
- ✨ Registro de personajes por usuario
- ✨ Generación de escenas con narrativa IA
- ✨ Generación de imágenes para escenas
- ✨ Sistema multi-agente (orquestador, narrador, continuidad, imagen, memoria)
- ✨ Memoria de largo plazo (novela compilada)
- ✨ Comandos Discord: `/personaje`, `/generate`, `/historia`, `/historia_nueva`
- ✨ Rate limiting y moderación básica
- ✨ Deploy en Vercel con Postgres + KV + Blob

---

**Aprobaciones Requeridas:**

| Rol | Nombre | Firma | Fecha |
|-----|--------|-------|-------|
| Product Owner | | | |
| Tech Lead | | | |
| Stakeholder | | | |

---

*Documento vivo - Se actualizará según aprendizajes del desarrollo*