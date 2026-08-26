import {
  ApplicationIntegrationType,
  AttachmentBuilder,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import { store } from "../data/json-store.js";
import { buildStandings } from "../domain/standings.js";
import { formatTable } from "../utils/table.js";

export const data = new SlashCommandBuilder()
  .setName("show_table")
  .setDescription("Mostra a tabela de um torneio (padrão: ativo)")
  .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
  .setContexts(InteractionContextType.Guild)
  .addStringOption((option) =>
    option
      .setName("name")
      .setDescription("Nome do torneio")
      .setMinLength(1)
      .setMaxLength(100)
      .setRequired(false),
  );

export async function execute(interaction) {
  const state = await store.load();
  const requestedTournament = interaction.options.getString("name");
  const active = requestedTournament || state.active;

  if (!active) {
    await interaction.reply({
      content: " Não há torneio ativo nem nome especificado.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!Object.hasOwn(state.tournaments, active)) {
    await interaction.reply({
      content: " Esse torneio não existe.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const players = state.tournaments[active].players;
  if (Object.keys(players).length === 0) {
    await interaction.reply({
      content: ` O torneio **${active}** ainda não tem jogadores.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const standings = buildStandings(players);
  const table = formatTable(
    ["Pos", "Jogador", "J", "V", "E", "D", "Pts", "Win %", "Win % Ponderada"],
    standings.map((row) => [
      row.position,
      row.name,
      row.played,
      row.wins,
      row.draws,
      row.losses,
      row.points,
      `${row.winPercentage.toFixed(2)}%`,
      `${row.weightedWinPercentage.toFixed(2)}%`,
    ]),
  );
  const codeBlockSafeTable = table.replaceAll("```", "``\u200b`");
  const message = `**Tabela: ${active}**\n\`\`\`${codeBlockSafeTable}\`\`\``;

  if (message.length <= 2_000) {
    await interaction.reply(message);
    return;
  }

  const attachment = new AttachmentBuilder(
    Buffer.from(`Tabela: ${active}\n\n${table}\n`, "utf8"),
    { name: "tabela.txt" },
  );
  await interaction.reply({
    content: "A tabela completa está no arquivo anexado.",
    files: [attachment],
  });
}
