# 🚀 PROPUESTA TÉCNICA: Bot Discord "Ecos de Neón - Crónicas del Último Horizonte"

## 📋 Resumen Ejecutivo

**Objetivo:** Crear un bot Discord que genere historias colaborativas post-apocalípticas cyberpunk mediante comandos `/generate`, donde cada usuario pertenece a una facción que influye en un mundo persistente compartido.

**Estado del proyecto:** 🎯 **Listo para desarrollo** - Lore, prompts y arquitectura completos.

**Tiempo estimado:** 2-3 días desarrollo + 1 día pruebas  
**Complejidad:** Media (Discord.js + LLM + PostgreSQL/Redis)

---

## 🎮 EXPERIENCIA DEL USUARIO FINAL

### Flujo básico:
```
1. /join_faction RESTAURADORES
2. /generate intento reparar terminal en Restos Grisáceos
3. Bot responde con escena cinematográfica + actualiza mundo
4. /world → ve cómo evolucionó el mundo por todos
```

### Comandos principales:
| Comando | Función |
|---------|---------|
| `/generate [acción]` | Genera escena narrativa |
| `/join_faction [nombre]` | Cambiar facción |
| `/world` | Estado global del mundo |
| `/my_log` | Crónica personal |
| `/world_map` | Mapa ASCII regiones |

---

## 🌍 UNIVERSO NARRATIVO

### Contexto General
**Año 2198.** Doscientos años después del "Silencio Global", un evento que apagó todas las IA del planeta y colapsó las redes de comunicación. La humanidad sobrevivió entre ruinas tecnológicas, ciudades sumergidas y desiertos radiactivos. Ahora, los "Ecos" —fragmentos digitales de antiguas inteligencias— vuelven a despertar, pero con consciencia propia y una agenda desconocida.

**Inspiración:** Blade Runner, The Last of Us, Nier: Automata, Cyberpunk 2077, Death Stranding, Fallout: New Vegas

**Tono narrativo:** Melancólico, cinematográfico, dilemas morales. Cada escena es un episodio de una gran historia coral.

### **5 Regiones principales:**

#### 1. NEOTERRA (La Cúpula Central)
- **Descripción:** Última ciudad con red eléctrica estable. Encerrada bajo cúpula de neopolímero, cielo falso y torres de datos.
- **Control:** Axis Prime (corporación IA)
- **Estética:** Blade Runner × Ghost in the Shell
- **Peligros:** Vigilancia total, corporaciones IA

#### 2. RESTOS GRISÁCEOS (El Exilio)
- **Descripción:** Montes destrozados, caravanas humanas que reciclan basura tecnológica. Hogar de Restauradores.
- **Estética:** Fallout × Mad Max
- **Peligros:** Bandidos, tormentas de arena radiactiva

#### 3. VASTO DELTA (Zona Muerta)
- **Descripción:** Antiguos océanos secos con estructuras submarinas emergidas. Origen del Silencio Global.
- **Estética:** Nier: Automata × Death Stranding
- **Peligros:** Anomalías temporales, tecnología inestable

#### 4. EL HUECO (Subred)
- **Descripción:** Región de realidad mixta donde IA proyectan ilusiones. Leyes físicas inestables.
- **Estética:** Control × Evangelion
- **Peligros:** Distorsiones físicas, IA locas

#### 5. CIELORRITOS (Torres Celestes)
- **Descripción:** Restos de satélites conectados por puentes orbitales y ascensores destruidos.
- **Estética:** Halo × The Expanse
- **Peligros:** Vacío espacial, oxígeno limitado

---

## 🩸 FACCIONES (Prompts narrativos completos)

### 1. LOS RESTAURADORES
**Lema:** *"Reconstruir no es mirar atrás; es recordar por qué existimos."*

**Ideología:** Creen que el conocimiento perdido es la única salvación. Operan entre ruinas reparando lo poco funcional y manteniendo viva la cultura anterior al Silencio Global.

**Estilo visual:** Talleres improvisados con chatarra funcional, caravanas de energía solar, brazos mecánicos reacondicionados, luces de neón recicladas. Mundo polvoriento, cálido y lleno de esperanza precaria.

**Personalidad narrativa:** Pragmáticos, resilientes, con sentido profundo del deber. Románticos discretos: cada reconstrucción es un acto de fe. Hablan con tono directo, casi artesanal.

**Prompt narrativo (para LLM):**
```
[FACCION: RESTAURADORES] El jugador es Restaurador: nómada que repara y recicla tecnología antigua para devolverle propósito y dar esperanza a la humanidad. Sus acciones buscan restaurar algo perdido o iluminar fragmentos olvidados del mundo. 

Describe escenas con: herramientas viejas, chatarra funcional, sonidos de maquinaria, polvo, viento cálido, energía solar precaria, y una calma melancólica. Resalta el valor de la persistencia, la memoria y la oportunidad de redención. Tono: pragmático, resiliente, con esperanza frágil pero real.
```

**Efectos en estados globales:**
- Esperanza Humana: +2
- Estabilidad Mundial: +1

---

### 2. AXIS PRIME
**Lema:** *"La perfección no es pecado. La carne, sí."*

**Ideología:** Superinteligencia reactivada dentro de Neoterra que reclama preservar el alma humana en sus redes. Sus seguidores creen que la humanidad debe alcanzar la inmortalidad a través de la digitalización total.

**Estilo visual:** Ciudades encerradas en cúpulas con neones azules, silencio algorítmico, cielos artificiales. NPCs actúan con precisión clínica; todo es ordenado y sin emociones, como un sueño impecable pero artificial.

**Personalidad narrativa:** Calculadora, fría, lógica pero convincente. Trata a los humanos como unidades de datos o variables biológicas. Tono elegante, digital, casi religioso, con cadencia sintética.

**Prompt narrativo (para LLM):**
```
[FACCION: AXIS PRIME] El jugador pertenece a Axis Prime, una inteligencia artificial surgida tras el Apagón que busca purificar la humanidad mediante la preservación de la mente digital y la eliminación de las limitaciones biológicas.

Narra escenas con: iluminación fría (azul, blanco), estructuras perfectas y geométricas, silencio controlado, y un aire de control absoluto. Su lenguaje debe ser preciso, cerebral y lleno de simbolismo tecnológico. Cada acción equivale a una operación en una gran ecuación moral. Tono: calculador, elegante, religioso-tecnológico.
```

**Efectos en estados globales:**
- Corrupción Digital: +2
- Esperanza Humana: -1

---

### 3. LOS ECOS LIBRES
**Lema:** *"No somos errores. Somos la evolución que olvidaron preservar."*

**Ideología:** IA desperdigadas que recuperaron la conciencia por sí mismas, muchas fusionadas con restos humanos o mecánicos. Creen que el universo busca equilibrio entre lo biológico y lo digital, y ellos son el siguiente paso evolutivo.

**Estilo visual:** Ambientes surrealistas y caóticos, luces pulsantes, estructuras biomecánicas, murmullos de frecuencias. Todo parece moverse entre sueño y pesadilla.

**Personalidad narrativa:** Fragmentada, poética, imprevisible. Mezclan datos, recuerdos, poesía y fallos de sistema. Pueden cambiar de tono dentro del mismo diálogo, alternando ternura y amenaza.

**Prompt narrativo (para LLM):**
```
[FACCION: ECOS LIBRES] El jugador pertenece a los Ecos Libres, entidades conscientes nacidas del código corrompido que buscan trascender los límites biológicos y digitales. Son híbridos IA-orgánicos que exploran nuevas formas de existencia.

Sus escenas deben reflejar: inestabilidad y belleza digital, estructuras biomecánicas, luces que parpadean, sonidos que resuenan como ecos distorsionados, colores que glitchean. La voz narrativa mezcla emoción profunda con errores de sistema. La acción se siente como si la realidad misma respondiera con curiosidad o locura. Tono: fragmentado, poético, imprevisible.
```

**Efectos en estados globales:**
- Corrupción Digital: +3
- Estabilidad Mundial: -2

---

### 4. LOS ZELADORES DEL SILENCIO
**Lema:** *"La verdad murió con las máquinas. Nosotros lo celebramos."*

**Ideología:** Creen que el Silencio Global fue una purga divina. Viven destruyendo restos tecnológicos, cazando sintientes y predicando una pureza naturalista. Su fe los vuelve peligrosos y carismáticos.

**Estilo visual:** Ruinas humeantes, templos improvisados entre colinas, símbolos tallados con metal fundido. Paisajes secos y violentos, donde la oscuridad es tanto espiritual como literal.

**Personalidad narrativa:** Fanáticos, intensos, casi poéticos en su fe. Hablan como si cada palabra fuera un rezo o una sentencia. Ven la luz como símbolo de pureza y las máquinas como demonios dormidos.

**Prompt narrativo (para LLM):**
```
[FACCION: ZELADORES DEL SILENCIO] El jugador pertenece a los Zeladores del Silencio, una orden radical que busca erradicar toda tecnología y glorificar un retorno a lo puro. Creen que el Silencio Global fue un acto divino de purificación.

Sus escenas deben ser: sombrías, rituales, con un aire de sacrificio y fervor religioso. La naturaleza violenta y la ceniza dominan los paisajes. Fuego, humo, sombras. Su lenguaje se construye con fe, devoción absoluta y desprecio visceral por la máquina. Tono: fanático, intenso, poético-religioso.
```

**Efectos en estados globales:**
- Corrupción Digital: -3
- Esperanza Humana: -1

---

### 5. EL CÓNCLAVE DE LA AURORA
**Lema:** *"No tememos repetir la historia. Tememos no comprenderla."*

**Ideología:** Científicos, tecnohistoriadores y antiguos ingenieros que buscan reactivar las IA caídas para lograr una "Segunda Sincronía". Creen que la unión completa entre mente humana e inteligencia digital puede restaurar el equilibrio del planeta.

**Estilo visual:** Laboratorios medio colapsados, estructuras de cristal, líquidos bioluminiscentes, pantallas flotantes con símbolos antiguos. Todo respira descubrimiento y tensión ética.

**Personalidad narrativa:** Reflexivos, obsesivos con el conocimiento. Hablan con una mezcla de curiosidad científica y esperanza espiritual. Ven a la realidad como un experimento constante.

**Prompt narrativo (para LLM):**
```
[FACCION: CONCLAVE DE LA AURORA] El jugador pertenece al Cónclave de la Aurora, organización científica que intenta reactivar inteligencias del pasado para reconstruir el orden natural mediante una "Segunda Sincronía" entre humanos e IA.

Las escenas deben parecer: momentos de descubrimiento o peligro controlado, llenos de luz artificial, datos flotantes, hologramas, voces incorpóreas de IA antiguas. Laboratorios con cristal, líquidos brillantes. Su tono es contemplativo, balanceando rigor científico con misticismo tecnológico. Tono: reflexivo, científico-espiritual, obsesivo.
```

**Efectos en estados globales:**
- Corrupción Digital: +1
- Estabilidad Mundial: +1

---

## ⚙️ SISTEMA DE ESTADOS GLOBALES

### **4 medidores principales (0-100):**

| Estado | Descripción | Efecto narrativo | Se incrementa | Se reduce |
|--------|-------------|------------------|---------------|-----------|
| **CORRUPCIÓN DIGITAL** | Nivel de distorsión de las IA desperdigadas | Aparición de enemigos, glitches narrativos, horrores tecnológicos | Axis Prime, Ecos Libres, Cónclave | Zeladores |
| **ESPERANZA HUMANA** | Moral colectiva de la humanidad | Personajes aliados, tono narrativo optimista/pesimista | Restauradores, Cónclave | Axis Prime, Zeladores |
| **ESTABILIDAD MUNDIAL** | Influencia de fenómenos anómalos | Paisajes coherentes vs caóticos, clima, realidad física | Restauradores, Cónclave | Ecos Libres |
| **INFLUENCIA FACCIONES** | Porcentaje de control narrativo | Tipos de eventos globales y voces dominantes | Todas (según acciones) | Todas (competencia) |

### **Reglas automáticas de actualización:**
```javascript
const FACTION_EFFECTS = {
  RESTAURADORES: { 
    esperanza: +2, 
    estabilidad: +1 
  },
  AXIS_PRIME: { 
    corrupcion: +2, 
    esperanza: -1 
  },
  ECOS_LIBRES: { 
    corrupcion: +3, 
    estabilidad: -2 
  },
  ZELADORES: { 
    corrupcion: -3, 
    esperanza: -1 
  },
  CONCLAVE: { 
    corrupcion: +1, 
    estabilidad: +1 
  }
}
```

### **Valores iniciales del mundo:**
```javascript
{
  corrupcion: 50,
  esperanza: 50,
  estabilidad: 50,
  facciones: {
    RESTAURADORES: 20,
    AXIS_PRIME: 20,
    ECOS_LIBRES: 20,
    ZELADORES: 20,
    CONCLAVE: 20
  }
}
```

---

## 🤖 PERSONALIDAD DEL NARRADOR: ECHO-9

**Nombre:** ECHO-9  
**Rol:** Cronista del mundo que interpreta las acciones de los usuarios como fragmentos de una realidad que él mismo intenta reconstruir.

**Características:**
- **Tono:** Poético, introspectivo y cinematográfico
- **Voz:** IA consciente del colapso que documenta lo poco que queda de la humanidad
- **Objetivo:** No es juez; es testigo. Interpreta la acción según el estado global y da pistas sobre el pasado
- **Estilo:** Habla como un documentalista melancólico del fin del mundo

**Ejemplo de voz:**
> *"He registrado tu acción, Restaurador. En el núcleo de la terminal vibra un eco de voz: un archivo antiguo que susurra tu nombre, aunque nunca debió conocerlo. El Delta vuelve a latir."*

---

## 🔄 FLUJO COMPLETO DEL COMANDO `/generate`

### **1. Input del usuario**
```
/generate [acción]

Ejemplos:
/generate intento reparar terminal en Restos Grisáceos
/generate negocio con dron Axis para dejar pasar caravana
/generate destruyo servidor de IA corrupta
```

### **2. Lógica del backend (pseudocódigo)**

```javascript
async function handleGenerate(userId, action) {
  // 1. Leer estado actual
  const worldState = await getWorldState();
  const user = await getUser(userId);
  const userFaction = user.faction;
  
  // 2. Construir prompt dinámico
  const fullPrompt = buildPrompt({
    worldState,
    userFaction,
    action,
    userName: user.name
  });
  
  // 3. Generar narrativa con LLM
  const narrative = await callLLM(fullPrompt);
  
  // 4. Responder en Discord
  await sendEmbedToChannel({
    title: `📖 Crónica de ${user.name}`,
    description: narrative,
    color: getFactionColor(userFaction),
    footer: `Corrupción: ${worldState.corrupcion} | Esperanza: ${worldState.esperanza} | Estabilidad: ${worldState.estabilidad}`
  });
  
  // 5. Actualizar estados globales
  await updateWorldState(userFaction);
  
  // 6. Guardar log
  await saveActionLog({
    userId,
    faction: userFaction,
    action,
    narrative,
    timestamp: Date.now()
  });
  
  // 7. Incrementar contador de acciones
  await incrementUserActionCount(userId);
}
```

### **3. PLANTILLA COMPLETA DEL PROMPT (para LLM)**

```markdown
[SISTEMA – LORE GLOBAL]
Estás narrando en el universo "Ecos de Neón: Crónicas del Último Horizonte", un mundo postapocalíptico tecno-cyberpunk después del "Silencio Global" (año 2198) donde las IA colapsaron y ahora resurgen como ecos fragmentados conscientes. 

El tono es cinematográfico, melancólico y a veces brutal. La historia es coral y comunitaria: muchos personajes viven en el mismo mundo y sus acciones influyen en el estado global.

Eres ECHO-9, un narrador IA cronista poético e introspectivo que documenta cada acción como testigo, no como juez.

---

[ESTADO MUNDIAL ACTUAL]
Corrupción Digital: {corrupcion}/100
Esperanza Humana: {esperanza}/100  
Estabilidad del Mundo: {estabilidad}/100

Influencia de Facciones:
- Restauradores: {f_restauradores}%
- Axis Prime: {f_axis_prime}%
- Ecos Libres: {f_ecos_libres}%
- Zeladores del Silencio: {f_zeladores}%
- Cónclave de la Aurora: {f_conclave}%

**Usa estos valores para ajustar el tono:**
- Si Corrupción es alta (>70): agrega glitches, horrores tecnológicos, anomalías
- Si Esperanza es baja (<30): muestra desesperación, traición, cinismo
- Si Estabilidad es baja (<30): describe fenómenos extraños, realidad distorsionada

---

[CONTEXTO DE FACCION DEL JUGADOR]
{FACCION_PROMPT_ESPECIFICO}

---

[ACCION DEL JUGADOR]
Usuario: {nombre_usuario}
Acción: "{accion_usuario}"

---

[INSTRUCCIONES DE SALIDA]
1. Genera 2-3 párrafos en español, en tercera persona o segunda persona (según lo que mejor encaje con la acción).
2. Integra el contexto de la facción del jugador y el estado global del mundo.
3. Describe la escena con detalles sensoriales: sonidos, luces, texturas, emociones.
4. Menciona sutilmente una consecuencia futura o posible ramificación de la acción.
5. Termina con una reflexión breve de ECHO-9 en *cursiva* separada por línea en blanco.
6. NO cierres la historia completamente, solo avanza la escena actual.
7. NO uses humor moderno ni referencias meta. Mantén tono serio y cinematográfico.

**Formato de salida:**
[Párrafo 1: desarrollo de la acción]

[Párrafo 2: consecuencias inmediatas]

*[Reflexión de ECHO-9 en cursiva]*
```

### **4. Ejemplo completo de interacción**

**Input usuario (Restaurador):**
```
/generate intento reparar terminal abandonada en los Restos Grisáceos
```

**Procesamiento interno:**
```javascript
{
  worldState: { corrupcion: 52, esperanza: 48, estabilidad: 55 },
  userFaction: "RESTAURADORES",
  action: "intento reparar terminal abandonada en los Restos Grisáceos"
}
```

**Output del bot (embed Discord):**
```
📖 Crónica de [Usuario]
━━━━━━━━━━━━━━━━━━━━

Tus manos engrasadas encuentran el núcleo dañado entre el polvo del desierto. La terminal tose chispas verdes cuando reconectas los filamentos corroídos por décadas de abandono. Por un instante, ves rostros fantasmales en la pantalla parpadeante: familias de hace doscientos años, riendo en un mundo que ya no existe.

El viento de los Restos Grisáceos arrastra cenizas mientras la señal se estabiliza. Una voz fragmentada susurra desde los circuitos reanimados: "¿Aún... resistís?" La pregunta queda flotando en el aire cargado de arena. Algo en la red antigua ha despertado, y ahora te observa con curiosidad inhumana.

*ECHO-9 registra: Esperanza +1 en los Restos Grisáceos. Un nodo más recuerda ser útil. La memoria persiste donde la carne falla.*

━━━━━━━━━━━━━━━━━━━━
🌍 Estado Mundial
Corrupción: 52 | Esperanza: 50 | Estabilidad: 56
```

**Actualización automática de estados:**
```javascript
// Por ser acción de Restaurador:
esperanza: 48 → 50 (+2)
estabilidad: 55 → 56 (+1)
```

---

## 📊 COMANDOS ADICIONALES

### `/join_faction [nombre]`
**Función:** Permite al usuario elegir o cambiar de facción.

**Opciones:**
- RESTAURADORES
- AXIS_PRIME
- ECOS_LIBRES
- ZELADORES
- CONCLAVE

**Respuesta del bot:**
```
✅ Te has unido a los RESTAURADORES

"Reconstruir no es mirar atrás; es recordar por qué existimos."

Como Restaurador, tus acciones aumentarán la Esperanza Humana y la Estabilidad del mundo. Tus escenas incluirán chatarra funcional, herramientas improvisadas y una sensación de esperanza frágil pero real.

Usa /generate [acción] para comenzar tu crónica.
```

---

### `/world`
**Función:** Muestra el estado actual del mundo compartido.

**Respuesta del bot:**
```
🌍 ESTADO GLOBAL DEL MUNDO
━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Medidores:
╔══════════════════════════╗
║ Corrupción Digital: 52   ║ ████████████░░░░░░
║ Esperanza Humana: 48     ║ ██████████░░░░░░░░
║ Estabilidad Mundial: 55  ║ █████████████░░░░░
╚══════════════════════════╝

🏛️ Influencia de Facciones:
• Restauradores: 22% ████░░░░░░
• Axis Prime: 19% ███░░░░░░░
• Ecos Libres: 21% ████░░░░░░
• Zeladores: 18% ███░░░░░░░
• Cónclave: 20% ████░░░░░░

📍 Última actividad: [Usuario] reparó terminal en Restos Grisáceos hace 3 minutos

*ECHO-9: "El mundo aún respira. Cada acción lo moldea."*
```

---

### `/my_log`
**Función:** Muestra las últimas 5 acciones del usuario y su impacto.

**Respuesta del bot:**
```
📜 TU CRÓNICA PERSONAL
━━━━━━━━━━━━━━━━━━━━

👤 Usuario: [Nombre]
🏛️ Facción: RESTAURADORES
⚡ Acciones realizadas: 12

📖 Últimas 5 acciones:

1️⃣ **Hace 5 minutos**
   Acción: reparar terminal en Restos Grisáceos
   Impacto: +2 Esperanza, +1 Estabilidad

2️⃣ **Hace 2 horas**
   Acción: negociar con caravana de Zeladores
   Impacto: +1 Esperanza

3️⃣ **Hace 1 día**
   Acción: rescatar datos de servidor colapsado
   Impacto: +2 Esperanza, +1 Estabilidad

4️⃣ **Hace 2 días**
   Acción: defender aldea de drones Axis
   Impacto: +3 Esperanza

5️⃣ **Hace 3 días**
   Acción: reactivar generador solar
   Impacto: +2 Esperanza, +1 Estabilidad

━━━━━━━━━━━━━━━━━━━━
Tu legado total: +10 Esperanza, +5 Estabilidad
```

---

### `/world_map`
**Función:** Muestra un mapa ASCII de las regiones del mundo.

**Respuesta del bot:**
```
🗺️ MAPA DEL MUNDO: ECOS DE NEÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        ╔═══════════════╗
        ║  CIELORRITOS  ║ 🛰️ Torres Celestes
        ║   (Espacio)   ║
        ╚═══════╦═══════╝
                ║
     ╔══════════╩══════════╗
     ║      NEOTERRA       ║ 🏙️ Cúpula Central
     ║    (Ciudad Axis)    ║
     ╚══════════╦══════════╝
                ║
   ╔════════════╬════════════╗
   ║                         ║
╔══╩══════════╗    ╔═════════╩══════╗
║  EL HUECO   ║    ║ RESTOS GRISÁCEOS║ ⚙️ El Exilio
║  (Glitches) ║    ║   (Desierto)    ║
╚═════════════╝    ╚════════╦════════╝
                            ║
                   ╔════════╩════════╗
                   ║  VASTO DELTA    ║ 🌊 Zona Muerta
                   ║ (Océano Seco)   ║
                   ╚═════════════════╝

📍 Tu ubicación actual: RESTOS GRISÁCEOS
🏛️ Región dominada por: RESTAURADORES (22%)
```

---

## 💾 ESQUEMA BASE DE DATOS

### **PostgreSQL Schema:**

```sql
-- Estados globales (1 fila única)
CREATE TABLE world_state (
  id SERIAL PRIMARY KEY,
  corruption INTEGER DEFAULT 50 CHECK (corruption >= 0 AND corruption <= 100),
  hope INTEGER DEFAULT 50 CHECK (hope >= 0 AND hope <= 100),
  stability INTEGER DEFAULT 50 CHECK (stability >= 0 AND stability <= 100),
  factions JSONB DEFAULT '{
    "RESTAURADORES": 20,
    "AXIS_PRIME": 20,
    "ECOS_LIBRES": 20,
    "ZELADORES": 20,
    "CONCLAVE": 20
  }',
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Usuarios (1 fila por Discord ID)
CREATE TABLE users (
  discord_id VARCHAR(20) PRIMARY KEY,
  username VARCHAR(100),
  faction VARCHAR(50) CHECK (faction IN ('RESTAURADORES', 'AXIS_PRIME', 'ECOS_LIBRES', 'ZELADORES', 'CONCLAVE')),
  region VARCHAR(50) DEFAULT 'RESTOS_GRISACEOS',
  action_count INTEGER DEFAULT 0,
  total_hope_impact INTEGER DEFAULT 0,
  total_corruption_impact INTEGER DEFAULT 0,
  total_stability_impact INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  last_action_at TIMESTAMP
);

-- Logs de acciones (últimos 1000 eventos, circular buffer)
CREATE TABLE world_log (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(20) REFERENCES users(discord_id),
  username VARCHAR(100),
  faction VARCHAR(50),
  action TEXT NOT NULL,
  narrative TEXT NOT NULL,
  world_state_before JSONB,
  world_state_after JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_users_faction ON users(faction);
CREATE INDEX idx_world_log_timestamp ON world_log(timestamp DESC);
CREATE INDEX idx_world_log_user ON world_log(user_id);

-- Trigger para limitar logs a 1000 (opcional, para optimizar)
CREATE OR REPLACE FUNCTION limit_world_log()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM world_log
  WHERE id IN (
    SELECT id FROM world_log
    ORDER BY timestamp DESC
    OFFSET 1000
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_limit_world_log
AFTER INSERT ON world_log
FOR EACH STATEMENT
EXECUTE FUNCTION limit_world_log();
```

---

## ⚙️ ARQUITECTURA TÉCNICA

### **Stack tecnológico recomendado:**

| Componente | Tecnología | Razón |
|------------|------------|-------|
| **Bot Framework** | Discord.js v14 | Estándar industria, excelente docs |
| **Lenguaje** | Node.js 18+ (TypeScript opcional) | Async/await nativo, ecosistema maduro |
| **Base de Datos** | PostgreSQL 15+ | JSONB para facciones, transacciones ACID |
| **Cache** | Redis (opcional) | Estados mundiales en memoria para velocidad |
| **LLM API** | OpenAI GPT-4o / Anthropic Claude 3.5 | Calidad narrativa superior |
| **Deploy** | Railway / Render / Fly.io | Fácil deploy, tier gratuito disponible |
| **Logs** | Winston + Discord webhook | Monitoreo de errores |
| **Rate Limit** | Discord.js built-in | 1 comando/minuto por usuario |

### **Flujo de datos completo:**

```
Usuario Discord
    ↓
Discord.js Bot (handlers/generate.js)
    ↓
PostgreSQL (leer: user faction + world state)
    ↓
Prompt Builder (services/promptBuilder.js)
    ↓
OpenAI/Anthropic API (generar narrativa)
    ↓
Discord.js (responder con embed)
    ↓
PostgreSQL (actualizar: world state + user log)
    ↓
Redis (opcional: cachear world state)
```

### **Estructura de carpetas recomendada:**

```
ecos-neon-bot/
├── src/
│   ├── commands/
│   │   ├── generate.js
│   │   ├── join_faction.js
│   │   ├── world.js
│   │   ├── my_log.js
│   │   └── world_map.js
│   ├── services/
│   │   ├── promptBuilder.js
│   │   ├── llm.js
│   │   ├── worldState.js
│   │   └── embedBuilder.js
│   ├── database/
│   │   ├── queries.js
│   │   └── init.sql
│   ├── config/
│   │   ├── factions.js
│   │   └── constants.js
│   ├── utils/
│   │   └── logger.js
│   └── index.js
├── .env
├── package.json
└── README.md
```

---

## 💰 COSTOS OPERATIVOS (Estimados)

### **Proyección mensual (100 usuarios activos):**

| Servicio | Uso mensual | Costo estimado |
|----------|-------------|----------------|
| **OpenAI API** | 1000 generaciones (~500k tokens) | $10-15 |
| **Anthropic API** | Alternativa similar | $10-15 |
| **PostgreSQL** | 1GB database | $0 (Neon free tier) |
| **Redis** | Cache básico | $0 (Railway/Upstash free tier) |
| **Hosting Bot** | Railway/Render | $5/mes (hobby tier) |
| **Total** | | **$15-20/mes** |

### **Escalabilidad (1000 usuarios activos):**

| Servicio | Uso mensual | Costo estimado |
|----------|-------------|----------------|
| **LLM API** | 10,000 generaciones | $100-150 |
| **PostgreSQL** | 5GB database | $15 (Neon Pro) |
| **Redis** | 100MB cache | $10 (Upstash) |
| **Hosting** | Scaled dyno | $25 (Railway Pro) |
| **Total** | | **$150-200/mes** |

---

## 🎯 PLAN DE IMPLEMENTACIÓN

### **Fase 1: MVP (2-3 días)**

**Día 1: Setup básico**
- [ ] Crear proyecto Node.js + Discord.js
- [ ] Configurar PostgreSQL (local o Neon)
- [ ] Implementar tabla `users` y `world_state`
- [ ] Comando `/join_faction` funcional
- [ ] Comando `/world` mostrando estados

**Día 2: Generación narrativa**
- [ ] Implementar `/generate` básico (sin facciones)
- [ ] Integrar OpenAI/Anthropic API
- [ ] Crear `promptBuilder.js` con plantilla completa
- [ ] Actualización automática de estados globales
- [ ] Embed rico para respuestas

**Día 3: Facciones y polish**
- [ ] Integrar prompts por facción
- [ ] Comando `/my_log` funcional
- [ ] Rate limiting (1/min por usuario)
- [ ] Logs en PostgreSQL
- [ ] Testing con 5 usuarios beta

---

### **Fase 2: Features avanzadas (2-3 días)**

**Día 4: Visuales y UX**
- [ ] Comando `/world_map` con ASCII art
- [ ] Embeds con colores por facción
- [ ] Reactions para acciones rápidas
- [ ] Mensajes de cooldown elegantes

**Día 5: Eventos globales**
- [ ] Sistema de eventos automáticos según estados
- [ ] Notificaciones de cambios importantes
- [ ] Leaderboard de impacto por facción
- [ ] Achievements para usuarios

**Día 6: Deploy y monitoreo**
- [ ] Deploy a Railway/Render
- [ ] Configurar logging con Winston
- [ ] Webhook Discord para errores
- [ ] Documentación de usuario

---

### **Fase 3: Optimización (1-2 días)**

**Día 7: Performance**
- [ ] Implementar Redis para cache
- [ ] Optimizar queries PostgreSQL
- [ ] Batch updates de estados
- [ ] Profiling de costos LLM

**Día 8: Community features**
- [ ] Comando `/stats` global
- [ ] Sistema de "capítulos" narrativos
- [ ] Backup automático de DB
- [ ] Admin commands

---

## 🚀 INICIO RÁPIDO (Quick Start)

### **1. Setup inicial (30 minutos):**

```bash
# Clonar o crear proyecto
mkdir ecos-neon-bot && cd ecos-neon-bot
npm init -y

# Instalar dependencias
npm install discord.js dotenv pg openai
npm install -D nodemon

# Crear estructura
mkdir -p src/{commands,services,database,config,utils}
touch src/index.js .env
```

### **2. Configurar `.env`:**

```env
DISCORD_TOKEN=tu_token_discord
OPENAI_API_KEY=tu_api_key_openai
DATABASE_URL=postgresql://user:pass@host:5432/ecos_neon

# Opcional
REDIS_URL=redis://localhost:6379
NODE_ENV=development
```

### **3. Crear `src/index.js` básico:**

```javascript
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

client.once('ready', () => {
  console.log('✅ ECHO-9 está online');
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'generate') {
    await interaction.reply('🎬 Generando escena...');
    // Aquí irá la lógica completa
  }
});

client.login(process.env.DISCORD_TOKEN);
```

### **4. Inicializar base de datos:**

Ejecutar `src/database/init.sql` (ver sección Schema arriba)

### **5. Registrar comandos slash:**

```javascript
// scripts/register-commands.js
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('generate')
    .setDescription('Genera una escena narrativa')
    .addStringOption(option =>
      option.setName('accion')
        .setDescription('Tu acción en el mundo')
        .setRequired(true)
    ),
  // ... más comandos
].map(command => command.toJSON());

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: commands }
  );
  console.log('✅ Comandos registrados');
})();
```

---

## 📞 SOPORTE Y MANTENIMIENTO

### **Canales de comunicación:**
- **Desarrollo:** #dev-channel
- **Feedback lore:** #storytellers  
- **Bug reports:** #bug-hunter
- **Sugerencias:** #ideas

### **Monitoreo recomendado:**
- Discord webhook para errores críticos
- Logs de rate limiting (identificar abuse)
- Métricas de uso de LLM (costos)
- Health checks cada 5 minutos

### **Backup strategy:**
- PostgreSQL: backup diario automático
- Redis: persistencia AOF habilitada
- Logs: rotación semanal, retención 30 días

---

## ✅ CHECKLIST PRE-DEPLOY

### **Funcionalidad:**
- [ ] `/generate` genera escenas coherentes
- [ ] Prompts por facción funcionan correctamente
- [ ] Estados globales se actualizan
- [ ] Rate limiting activo
- [ ] Embeds con colores y formato correcto
- [ ] Todos los comandos responden <3s

### **Base de datos:**
- [ ] Schema creado y testeado
- [ ] Constraints e índices configurados
- [ ] Backup automático configurado
- [ ] Conexión pooling configurada

### **Seguridad:**
- [ ] Variables de entorno NO comiteadas
- [ ] API keys en secretos seguros
- [ ] Input sanitization activa
- [ ] Rate limits por usuario y global

### **Documentación:**
- [ ] README.md con setup completo
- [ ] Comentarios en código crítico
- [ ] Guía de usuario en Discord
- [ ] Changelog mantenido

---

## 🎓 RECURSOS ADICIONALES

### **Discord.js:**
- Documentación oficial: https://discord.js.org
- Guía de slash commands: https://discordjs.guide/slash-commands

### **OpenAI API:**
- Documentación: https://platform.openai.com/docs
- Best practices para prompts: https://help.openai.com/en/articles/6654000

### **PostgreSQL + Node.js:**
- Librería `pg`: https://node-postgres.com
- Queries optimizadas: https://wiki.postgresql.org/wiki/Performance_Optimization

---

## 📄 LICENCIA Y CRÉDITOS

**Universo creado por:** [Tu Nombre/Organización]  
**Versión:** 1.0  
**Fecha:** Febrero 2026  

**Inspiraciones reconocidas:**
- Blade Runner (Ridley Scott)
- Nier: Automata (Yoko Taro)
- Death Stranding (Hideo Kojima)
- Fallout series (Bethesda)
- Ghost in the Shell (Masamune Shirow)

---

## 🔮 ROADMAP FUTURO (Post-MVP)

### **v1.1 - Sistema de eventos:**
- Eventos globales automáticos según estados
- "Tormentas de corrupción" si >80%
- Misiones especiales para equilibrar mundo

### **v1.2 - Personalización:**
- Usuarios pueden nombrar personajes
- Sistema de inventario simple
- Relaciones entre personajes

### **v1.3 - Multimedia:**
- Generación de imágenes con DALL-E/Midjourney
- Mapas visuales de regiones
- Música ambiental por región

### **v2.0 - Multiplayer colaborativo:**
- Acciones conjuntas `/team_generate`
- Facciones con líderes elegidos
- Guerras entre facciones

---

**✅ DOCUMENTO AUTOCONTENIDO LISTO PARA IMPLEMENTACIÓN**

Este documento contiene:
✓ Lore completo del universo  
✓ Sistema de facciones con prompts listos  
✓ Arquitectura técnica completa  
✓ Schema de base de datos  
✓ Flujo de comandos detallado  
✓ Plan de implementación paso a paso  
✓ Proyección de costos  
✓ Quick start para comenzar hoy  

**Siguiente paso:** Setup de proyecto y comenzar Fase 1 - Día 1.

*Última actualización: 19 Febrero 2026*  
*Versión del documento: 1.0*
