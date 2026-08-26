import {
  ApplicationIntegrationType,
  AttachmentBuilder,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import { store } from "../data/json-store.js";

export const data = new SlashCommandBuilder()
  .setName("list_tournaments")
  .setDescription("Lista todos os torneios criados")
  .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
  .setContexts(InteractionContextType.Guild);

export function buildTournamentListReply(state) {
  const tournamentNames = Object.keys(state.tournaments);

  if (tournamentNames.length === 0) {
    return {
      content: " Nenhum torneio criado ainda.",
      flags: MessageFlags.Ephemeral,
    };
  }

  const text = tournamentNames
    .map((name) => `• ${name} ${name === state.active ? "(ativo)" : ""}`)
    .join("\n");
  const message = ` Torneios:\n${text}`;

  if (message.length <= 2_000) {
    return message;
  }

  const attachment = new AttachmentBuilder(
    Buffer.from(`Torneios:\n${text}\n`, "utf8"),
    { name: "torneios.txt" },
  );
  return {
    content: "A lista completa de torneios está no arquivo anexado.",
    files: [attachment],
  };
}

export async function execute(interaction) {
  const state = await store.load();
  await interaction.reply(buildTournamentListReply(state));
}
