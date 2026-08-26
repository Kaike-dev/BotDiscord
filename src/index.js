import 'dotenv/config';

import {
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
} from 'discord.js';

import { commandMap } from './commands/index.js';

const token = process.env.DISCORD_TOKEN?.trim();
const configuredGuildId = process.env.GUILD_ID?.trim();

if (!token) {
  throw new Error(
    'A variável DISCORD_TOKEN não foi definida. Copie .env.example para .env e informe o token do bot.',
  );
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  allowedMentions: { parse: [] },
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Bot online: ${readyClient.user.tag}`);

  if (!configuredGuildId) {
    console.warn(
      'GUILD_ID não está definido. Todos os servidores compartilharão o mesmo arquivo de torneios.',
    );
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  if (configuredGuildId && interaction.guildId !== configuredGuildId) {
    await interaction.reply({
      content: 'Este bot não está configurado para este servidor.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const command = commandMap.get(interaction.commandName);

  if (!command) {
    console.warn(`Comando recebido sem implementação: /${interaction.commandName}`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Falha ao executar /${interaction.commandName}:`, error);

    const content = 'Não foi possível executar esse comando. Tente novamente em instantes.';

    try {
      if (interaction.deferred) {
        await interaction.editReply({ content });
      } else if (interaction.replied) {
        await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ content, flags: MessageFlags.Ephemeral });
      }
    } catch (replyError) {
      console.error('Também não foi possível enviar a resposta de erro:', replyError);
    }
  }
});

client.on(Events.Error, (error) => {
  console.error('Erro no cliente do Discord:', error);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    console.log(`Encerrando o bot após ${signal}...`);
    client.destroy();
  });
}

try {
  await client.login(token);
} catch (error) {
  console.error('Não foi possível conectar o bot ao Discord:', error);
  process.exitCode = 1;
}
