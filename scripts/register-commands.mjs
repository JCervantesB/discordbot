import 'dotenv/config';
import { REST, Routes, ApplicationCommandOptionType } from 'discord.js';

const characterCommand = {
  name: 'character',
  description: 'Registra o actualiza tu personaje',
  options: [
    {
      name: 'name',
      type: ApplicationCommandOptionType.String,
      description: 'Nombre del personaje',
      required: true
    },
    {
      name: 'description',
      type: ApplicationCommandOptionType.String,
      description: 'Descripción del personaje',
      required: true
    },
    {
      name: 'faction',
      type: ApplicationCommandOptionType.String,
      description: 'Facción del personaje (opcional)',
      required: false,
      choices: [
        { name: 'Restauradores', value: 'restauradores' },
        { name: 'Axis Prime', value: 'axis_prime' },
        { name: 'Ecos Libres', value: 'ecos_libres' },
        { name: 'Zeladores del Silencio', value: 'zeladores_silencio' },
        { name: 'Cónclave de la Aurora', value: 'conclave_aurora' }
      ]
    },
    {
      name: 'region',
      type: ApplicationCommandOptionType.String,
      description: 'Región inicial del personaje (opcional)',
      required: false,
      choices: [
        { name: 'Neoterra', value: 'neoterra' },
        { name: 'Restos Grisáceos', value: 'restos_grisaceos' },
        { name: 'Vasto Delta', value: 'vasto_delta' },
        { name: 'El Hueco', value: 'el_hueco' },
        { name: 'Cielorritos', value: 'cielorritos' }
      ]
    },
    {
      name: 'role',
      type: ApplicationCommandOptionType.String,
      description: 'Rol o profesión del personaje (opcional)',
      required: false,
      choices: [
        { name: 'Operador de Ecos', value: 'operador_eco' },
        { name: 'Tecnomédico de Campaña', value: 'tecnomedico' },
        { name: 'Chatarrero Nómada', value: 'chatarrero_nómada' },
        { name: 'Vigía de Cúpula', value: 'vigia_cupula' },
        { name: 'Contrabandista de Datos', value: 'contrabandista_datos' },
        { name: 'Analista de Núcleo Lúmen', value: 'analista_lumen' },
        { name: 'Custodio Espectral', value: 'custodio_espectral' },
        { name: 'Artesano del Óxido', value: 'artesano_del_oxido' },
        { name: 'Ingeniero Solar de Caravana', value: 'ingeniero_solar' },
        { name: 'Cartógrafo de Glitches', value: 'cartografo_glitch' },
        { name: 'Acólito de Ceniza', value: 'acolito_ceniza' },
        { name: 'Cronista de la Sincronía', value: 'cronista_sincronia' },
        { name: 'Buzo del Delta', value: 'buzo_delta' }
      ]
    }
  ]
};

const generateCommand = {
  name: 'generate',
  description: 'Genera una nueva escena en la historia',
  options: [
    {
      name: 'action',
      type: ApplicationCommandOptionType.String,
      description: 'Acción, diálogo o descripción de tu personaje',
      required: true
    }
  ]
};

const storyCommand = {
  name: 'story',
  description: 'Obtén el enlace a la visual novel de este servidor'
};

const storyStartCommand = {
  name: 'story_start',
  description: 'Inicializa la historia fija única (uso exclusivo)'
};
async function main() {
  const token = process.env.DISCORD_BOT_TOKEN;
  const appId = process.env.DISCORD_APPLICATION_ID;
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!token || !appId) {
    throw new Error('Faltan DISCORD_BOT_TOKEN o DISCORD_APPLICATION_ID');
  }
  const rest = new REST().setToken(token);
  await rest.put(Routes.applicationCommands(appId), {
    body: [characterCommand, generateCommand, storyCommand, storyStartCommand]
  });
  console.log('Comandos globales registrados correctamente');
  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(appId, guildId), {
      body: [characterCommand, generateCommand, storyCommand, storyStartCommand]
    });
    console.log(`Comandos de guild ${guildId} registrados correctamente`);
  } else {
    console.log('DISCORD_GUILD_ID no definido: solo registro global (puede tardar en propagarse)');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
