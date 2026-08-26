import {
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import { store } from "../data/json-store.js";

export const data = new SlashCommandBuilder()
  .setName("set_active")
  .setDescription("Define qual torneio será usado como ativo")
  .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
  .setContexts(InteractionContextType.Guild)
  .addStringOption((option) =>
    option
      .setName("name")
      .setDescription("Nome do torneio")
      .setMinLength(1)
      .setMaxLength(100)
      .setRequired(true),
  );

export async function execute(interaction) {
  const name = interaction.options.getString("name", true);
  let missing = false;

  await store.update((state) => {
    if (!Object.hasOwn(state.tournaments, name)) {
      missing = true;
      return;
    }

    state.active = name;
  });

  if (missing) {
    await interaction.reply({
      content: " Não existe torneio com esse nome.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.reply(` O torneio ativo agora é **${name}**.`);
}
