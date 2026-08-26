import assert from "node:assert/strict";
import test from "node:test";

import {
  ApplicationIntegrationType,
  AttachmentBuilder,
  InteractionContextType,
} from "discord.js";

import { commands } from "../src/commands/index.js";
import { buildTournamentListReply } from "../src/commands/list-tournaments.js";

const boundedOptionsByCommand = new Map([
  ["new_tournament", ["name"]],
  ["add_player", ["nome", "torneio"]],
  ["record_match", ["player1", "player2", "torneio"]],
  ["set_active", ["name"]],
  ["list_tournaments", []],
  ["show_table", ["name"]],
]);

test("all commands are limited to guild installs and guild interactions", () => {
  for (const command of commands) {
    const json = command.data.toJSON();

    assert.deepEqual(json.integration_types, [ApplicationIntegrationType.GuildInstall]);
    assert.deepEqual(json.contexts, [InteractionContextType.Guild]);
    assert.equal(json.default_member_permissions, undefined);
  }
});

test("all tournament and player name options allow between 1 and 100 characters", () => {
  for (const command of commands) {
    const json = command.data.toJSON();
    const boundedOptionNames = boundedOptionsByCommand.get(json.name);

    assert.ok(boundedOptionNames, `unexpected command: ${json.name}`);
    for (const optionName of boundedOptionNames) {
      const option = json.options?.find(({ name }) => name === optionName);
      assert.ok(option, `missing /${json.name} option ${optionName}`);
      assert.equal(option.min_length, 1);
      assert.equal(option.max_length, 100);
    }
  }
});

test("tournament list stays inline while it fits in a Discord message", () => {
  const reply = buildTournamentListReply({
    active: "Copa",
    tournaments: { Copa: {}, Liga: {} },
  });

  assert.equal(reply, " Torneios:\n• Copa (ativo)\n• Liga ");
});

test("tournament list becomes a UTF-8 attachment above 2000 characters", () => {
  const tournaments = Object.fromEntries(
    Array.from({ length: 25 }, (_, index) => [
      `${String(index).padStart(2, "0")}-${"a".repeat(97)}`,
      {},
    ]),
  );
  const reply = buildTournamentListReply({ active: null, tournaments });

  assert.equal(typeof reply, "object");
  assert.ok(reply.content.length <= 2_000);
  assert.equal(reply.files.length, 1);
  assert.ok(reply.files[0] instanceof AttachmentBuilder);
  assert.equal(reply.files[0].name, "torneios.txt");
  assert.match(reply.files[0].attachment.toString("utf8"), /^Torneios:\n• 00-/);
});
