import {
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import { store } from "../data/json-store.js";

export const data = new SlashCommandBuilder()
  .setName("new_tournament")
  .setDescription("Cria um novo torneio e o torna ativo")
  .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
  .setContexts(InteractionContextType.Guild)
  .addStringOption((option) =>
    option
      .setName("name")
      .setDescription("Nome do torneio")
      .setMinLength(1)
      .setMaxLength(100)
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName("tipo")
      .setDescription("Tipo do torneio")
      .setRequired(true)
      .addChoices(
        { name: "Pontos Corridos", value: "pontos_corridos" },
        { name: "Fase de Grupos", value: "fase_de_grupos" },
        { name: "Suíço", value: "suico" },
        { name: "Mata-mata", value: "mata_mata" },
      ),
  );

const typeLabels = new Map([
  ["pontos_corridos", "Pontos Corridos"],
  ["fase_de_grupos", "Fase de Grupos"],
  ["suico", "Suíço"],
  ["mata_mata", "Mata-mata"],
]);

export async function execute(interaction) {
  const name = interaction.options.getString("name", true);
  const type = interaction.options.getString("tipo", true);
  let duplicate = false;

  await store.update((state) => {
    if (Object.hasOwn(state.tournaments, name)) {
      duplicate = true;
      return;
    }

    Object.defineProperty(state.tournaments, name, {
      value: { type, players: {}, matches: [] },
      enumerable: true,
      configurable: true,
      writable: true,
    });
    state.active = name;
  });

  if (duplicate) {
    await interaction.reply({
      content: " Já existe um torneio com esse nome.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.reply(
    ` Torneio **${name}** criado e definido como ativo (tipo: ${typeLabels.get(type) ?? type}).`,
  );
}
