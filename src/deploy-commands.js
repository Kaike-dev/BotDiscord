import 'dotenv/config';

import { REST, Routes } from 'discord.js';

import { commands } from './commands/index.js';

const token = process.env.DISCORD_TOKEN?.trim();
const clientId = process.env.CLIENT_ID?.trim();
const guildId = process.env.GUILD_ID?.trim();

const missingVariables = [
  ['DISCORD_TOKEN', token],
  ['CLIENT_ID', clientId],
]
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (missingVariables.length > 0) {
  throw new Error(
    `Variáveis obrigatórias ausentes: ${missingVariables.join(', ')}. Confira o arquivo .env.`,
  );
}

const commandDefinitions = commands.map((command) => command.data.toJSON());
const commandNames = commandDefinitions.map((command) => command.name);

if (new Set(commandNames).size !== commandNames.length) {
  throw new Error('Existem comandos duplicados e o registro foi cancelado.');
}

const rest = new REST({ version: '10' }).setToken(token);
const route = guildId
  ? Routes.applicationGuildCommands(clientId, guildId)
  : Routes.applicationCommands(clientId);

const scope = guildId ? `servidor ${guildId}` : 'escopo global';
console.log(`Registrando ${commandDefinitions.length} comandos no ${scope}...`);

try {
  const registeredCommands = await rest.put(route, { body: commandDefinitions });
  console.log(`${registeredCommands.length} comandos registrados com sucesso.`);
} catch (error) {
  console.error('Não foi possível registrar os comandos no Discord:', error);
  process.exitCode = 1;
}
