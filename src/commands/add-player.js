import {
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import { store } from "../data/json-store.js";

export const data = new SlashCommandBuilder()
  .setName("add_player")
  .setDescription("Adiciona um jogador a um torneio (padrão: ativo)")
  .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
  .setContexts(InteractionContextType.Guild)
  .addStringOption((option) =>
    option
      .setName("nome")
      .setDescription("Nome do jogador")
      .setMinLength(1)
      .setMaxLength(100)
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName("torneio")
      .setDescription("Nome do torneio")
      .setMinLength(1)
      .setMaxLength(100)
      .setRequired(false),
  );

export async function execute(interaction) {
  const name = interaction.options.getString("nome", true);
  const requestedTournament = interaction.options.getString("torneio");
  let active;
  let error;

  await store.update((state) => {
    active = requestedTournament || state.active;
    if (!active) {
      error = " Não há torneio ativo nem foi especificado um.";
      return;
    }

    if (!Object.hasOwn(state.tournaments, active)) {
      error = " Esse torneio não existe.";
      return;
    }

    const players = state.tournaments[active].players;
    if (Object.hasOwn(players, name)) {
      error = " Jogador já cadastrado.";
      return;
    }

    Object.defineProperty(players, name, {
      value: { wins: 0, losses: 0, draws: 0, played: 0, points: 0 },
      enumerable: true,
      configurable: true,
      writable: true,
    });
  });

  if (error) {
    await interaction.reply({ content: error, flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.reply(` Jogador **${name}** adicionado ao torneio **${active}**.`);
}
