import {
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import { store } from "../data/json-store.js";

export const data = new SlashCommandBuilder()
  .setName("record_match")
  .setDescription("Registra o resultado entre dois jogadores em um torneio")
  .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
  .setContexts(InteractionContextType.Guild)
  .addStringOption((option) =>
    option
      .setName("player1")
      .setDescription("Primeiro jogador")
      .setMinLength(1)
      .setMaxLength(100)
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName("player2")
      .setDescription("Segundo jogador")
      .setMinLength(1)
      .setMaxLength(100)
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName("resultado")
      .setDescription("Resultado da partida")
      .setRequired(true)
      .addChoices(
        { name: "Vitória jogador1", value: "1" },
        { name: "Vitória jogador2", value: "2" },
        { name: "Empate", value: "draw" },
      ),
  )
  .addStringOption((option) =>
    option
      .setName("torneio")
      .setDescription("Nome do torneio")
      .setMinLength(1)
      .setMaxLength(100)
      .setRequired(false),
  );

const resultLabels = new Map([
  ["1", "Vitória jogador1"],
  ["2", "Vitória jogador2"],
  ["draw", "Empate"],
]);

export async function execute(interaction) {
  const player1 = interaction.options.getString("player1", true);
  const player2 = interaction.options.getString("player2", true);
  const result = interaction.options.getString("resultado", true);
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

    const tournament = state.tournaments[active];
    const players = tournament.players;
    if (!Object.hasOwn(players, player1) || !Object.hasOwn(players, player2)) {
      error = " Ambos os jogadores precisam estar cadastrados no torneio.";
      return;
    }

    if (player1 === player2) {
      error = " Um jogador não pode disputar uma partida contra si mesmo.";
      return;
    }

    const first = players[player1];
    const second = players[player2];
    first.played += 1;
    second.played += 1;

    if (result === "1") {
      first.wins += 1;
      second.losses += 1;
      first.points += 3;
    } else if (result === "2") {
      second.wins += 1;
      first.losses += 1;
      second.points += 3;
    } else {
      first.draws += 1;
      second.draws += 1;
      first.points += 1;
      second.points += 1;
    }

    tournament.matches.push({ p1: player1, p2: player2, result });
  });

  if (error) {
    await interaction.reply({ content: error, flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.reply(
    ` Resultado registrado em **${active}**: **${player1}** vs **${player2}** → ${resultLabels.get(result) ?? result}`,
  );
}
