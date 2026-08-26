import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const EPHEMERAL_FLAG = 64;

function mockInteraction(optionValues = {}) {
  const replies = [];

  return {
    interaction: {
      options: {
        getString(name, required = false) {
          const value = Object.hasOwn(optionValues, name)
            ? optionValues[name]
            : null;

          if (required && value === null) {
            throw new Error(`Missing required mock option: ${name}`);
          }

          return value;
        },
      },
      async reply(response) {
        replies.push(response);
      },
    },
    replies,
  };
}

async function runCommand(command, optionValues) {
  const { interaction, replies } = mockInteraction(optionValues);
  await command.execute(interaction);
  assert.equal(replies.length, 1, `${command.data.name} should reply once`);
  return replies[0];
}

test("the six commands complete a tournament flow using isolated persisted data", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "discord-command-test-"));
  const dataFile = path.join(directory, "tournaments.json");
  const previousDataFile = process.env.DATA_FILE;

  process.env.DATA_FILE = dataFile;
  t.after(async () => {
    if (previousDataFile === undefined) {
      delete process.env.DATA_FILE;
    } else {
      process.env.DATA_FILE = previousDataFile;
    }
    await rm(directory, { recursive: true, force: true });
  });

  const [
    newTournament,
    addPlayer,
    recordMatch,
    showTable,
    listTournaments,
    setActive,
  ] = await Promise.all([
    import("../src/commands/new-tournament.js"),
    import("../src/commands/add-player.js"),
    import("../src/commands/record-match.js"),
    import("../src/commands/show-table.js"),
    import("../src/commands/list-tournaments.js"),
    import("../src/commands/set-active.js"),
  ]);

  assert.deepEqual(
    [
      newTournament,
      addPlayer,
      recordMatch,
      showTable,
      listTournaments,
      setActive,
    ].map((command) => command.data.name),
    [
      "new_tournament",
      "add_player",
      "record_match",
      "show_table",
      "list_tournaments",
      "set_active",
    ],
  );

  const reserveReply = await runCommand(newTournament, {
    name: "Copa Reserva",
    tipo: "mata_mata",
  });
  assert.match(reserveReply, /Copa Reserva/);
  assert.match(reserveReply, /Mata-mata/);

  const tournamentReply = await runCommand(newTournament, {
    name: "Copa Principal",
    tipo: "pontos_corridos",
  });
  assert.match(tournamentReply, /Copa Principal/);
  assert.match(tournamentReply, /Pontos Corridos/);

  const firstPlayerReply = await runCommand(addPlayer, { nome: "Ana" });
  assert.match(firstPlayerReply, /Ana/);
  assert.match(firstPlayerReply, /Copa Principal/);

  const secondPlayerReply = await runCommand(addPlayer, { nome: "Bruno" });
  assert.match(secondPlayerReply, /Bruno/);
  assert.match(secondPlayerReply, /Copa Principal/);

  const matchReply = await runCommand(recordMatch, {
    player1: "Ana",
    player2: "Bruno",
    resultado: "1",
  });
  assert.match(matchReply, /Copa Principal/);
  assert.match(matchReply, /Ana/);
  assert.match(matchReply, /Bruno/);

  const persistedAfterMatch = JSON.parse(await readFile(dataFile, "utf8"));
  assert.deepEqual(persistedAfterMatch.tournaments["Copa Principal"], {
    type: "pontos_corridos",
    players: {
      Ana: { wins: 1, losses: 0, draws: 0, played: 1, points: 3 },
      Bruno: { wins: 0, losses: 1, draws: 0, played: 1, points: 0 },
    },
    matches: [{ p1: "Ana", p2: "Bruno", result: "1" }],
  });

  const tableReply = await runCommand(showTable, {});
  assert.equal(typeof tableReply, "string");
  assert.match(tableReply, /\*\*Tabela: Copa Principal\*\*/);
  assert.match(tableReply, /Jogador/);
  assert.match(tableReply, /Ana/);
  assert.match(tableReply, /Bruno/);
  assert.ok(tableReply.indexOf("Ana") < tableReply.indexOf("Bruno"));

  const listReply = await runCommand(listTournaments, {});
  assert.equal(typeof listReply, "string");
  assert.match(listReply, /Copa Reserva/);
  assert.match(listReply, /Copa Principal \(ativo\)/);

  const selfMatchReply = await runCommand(recordMatch, {
    player1: "Ana",
    player2: "Ana",
    resultado: "draw",
  });
  assert.equal(typeof selfMatchReply, "object");
  assert.match(selfMatchReply.content, /contra si mesmo/);
  assert.equal(selfMatchReply.flags, EPHEMERAL_FLAG);

  const persistedAfterRejection = JSON.parse(await readFile(dataFile, "utf8"));
  assert.equal(
    persistedAfterRejection.tournaments["Copa Principal"].matches.length,
    1,
  );
  assert.deepEqual(
    persistedAfterRejection.tournaments["Copa Principal"].players.Ana,
    { wins: 1, losses: 0, draws: 0, played: 1, points: 3 },
  );

  const activeReply = await runCommand(setActive, { name: "Copa Reserva" });
  assert.match(activeReply, /Copa Reserva/);

  const finalPersistedState = JSON.parse(await readFile(dataFile, "utf8"));
  assert.equal(finalPersistedState.active, "Copa Reserva");
  assert.deepEqual(Object.keys(finalPersistedState.tournaments), [
    "Copa Reserva",
    "Copa Principal",
  ]);
});
