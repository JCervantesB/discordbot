import { REST, Routes, ApplicationCommandOptionType } from 'discord.js';

const personajeCommand = {
  name: 'personaje',
  description: 'Registra o actualiza tu personaje',
  options: [
    {
      name: 'nombre',
      type: ApplicationCommandOptionType.String,
      description: 'Nombre del personaje',
      required: true
    },
    {
      name: 'descripcion',
      type: ApplicationCommandOptionType.String,
      description: 'Descripción del personaje',
      required: true
    }
  ]
};

const generateCommand = {
  name: 'generate',
  description: 'Genera una nueva escena en la historia',
  options: [
    {
      name: 'accion',
      type: ApplicationCommandOptionType.String,
      description: 'Acción, diálogo o descripción de tu personaje',
      required: true
    }
  ]
};

async function main() {
  const token = process.env.DISCORD_BOT_TOKEN;
  const appId = process.env.DISCORD_APPLICATION_ID;
  if (!token || !appId) {
    throw new Error('Faltan DISCORD_BOT_TOKEN o DISCORD_APPLICATION_ID');
  }
  const rest = new REST().setToken(token);
  await rest.put(Routes.applicationCommands(appId), {
    body: [personajeCommand, generateCommand]
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
