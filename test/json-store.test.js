import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createJsonStore, store as defaultStore } from "../src/data/json-store.js";

const EMPTY_DATA = { active: null, tournaments: {} };

function createPlayer(overrides = {}) {
  return {
    wins: 0,
    losses: 0,
    draws: 0,
    played: 0,
    points: 0,
    ...overrides,
  };
}

function createTournament(overrides = {}) {
  return {
    type: "pontos_corridos",
    players: {},
    matches: [],
    ...overrides,
  };
}

async function createTemporaryStore(t, nested = false) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "discord-json-store-"));
  t.after(() => rm(directory, { recursive: true, force: true }));

  const filePath = nested
    ? path.join(directory, "not-created-yet", "tournaments.json")
    : path.join(directory, "tournaments.json");

  return {
    directory,
    filePath,
    jsonStore: createJsonStore(filePath),
  };
}

test("exports the default store API", () => {
  assert.equal(typeof defaultStore.load, "function");
  assert.equal(typeof defaultStore.update, "function");
});

test("load returns fresh empty data for a missing or empty file", async (t) => {
  const { filePath, jsonStore } = await createTemporaryStore(t);

  const missing = await jsonStore.load();
  assert.deepEqual(missing, EMPTY_DATA);

  missing.active = "local-only-mutation";
  assert.deepEqual(await jsonStore.load(), EMPTY_DATA);

  await writeFile(filePath, " \r\n\t", "utf8");
  assert.deepEqual(await jsonStore.load(), EMPTY_DATA);
});

test("load preserves the existing tournaments.json schema", async (t) => {
  const { filePath, jsonStore } = await createTemporaryStore(t);
  const expected = {
    active: "Copa São Paulo",
    tournaments: {
      "Copa São Paulo": {
        type: "pontos_corridos",
        players: {
          "José": createPlayer({ wins: 1, played: 1, points: 3 }),
          Ana: createPlayer({ losses: 1, played: 1 }),
        },
        matches: [{ p1: "José", p2: "Ana", result: "1" }],
      },
    },
  };

  await writeFile(filePath, JSON.stringify(expected, null, 2), "utf8");

  assert.deepEqual(await jsonStore.load(), expected);
});

test("invalid JSON throws and is never overwritten", async (t) => {
  const { filePath, jsonStore } = await createTemporaryStore(t);
  const invalidContents = '{ "active": null, "tournaments": ';
  await writeFile(filePath, invalidContents, "utf8");

  await assert.rejects(
    jsonStore.update((data) => {
      data.active = null;
    }),
    { code: "ERR_INVALID_TOURNAMENT_JSON" },
  );
  assert.equal(await readFile(filePath, "utf8"), invalidContents);
});

test("invalid schema throws and is never overwritten", async (t) => {
  const { filePath, jsonStore } = await createTemporaryStore(t);
  const invalidData = {
    active: "missing tournament",
    tournaments: {},
  };
  const invalidContents = JSON.stringify(invalidData, null, 2);
  await writeFile(filePath, invalidContents, "utf8");

  await assert.rejects(jsonStore.load(), {
    code: "ERR_INVALID_TOURNAMENT_DATA",
  });
  await assert.rejects(jsonStore.update(() => {}), {
    code: "ERR_INVALID_TOURNAMENT_DATA",
  });
  assert.equal(await readFile(filePath, "utf8"), invalidContents);
});

test("schema validation covers player statistics and recorded matches", async (t) => {
  const invalidStates = [
    {
      active: "cup",
      tournaments: {
        cup: createTournament({
          players: { Ana: createPlayer({ points: -1 }) },
        }),
      },
    },
    {
      active: "cup",
      tournaments: {
        cup: createTournament({
          matches: [{ p1: "Ana", p2: "Bia", result: "victory" }],
        }),
      },
    },
    {
      active: "cup",
      tournaments: {
        cup: { type: "desconhecido", players: {}, matches: [] },
      },
    },
  ];

  for (const [index, invalidState] of invalidStates.entries()) {
    await t.test(`invalid state ${index + 1}`, async (subtest) => {
      const { filePath, jsonStore } = await createTemporaryStore(subtest);
      await writeFile(filePath, JSON.stringify(invalidState), "utf8");
      await assert.rejects(jsonStore.load(), {
        code: "ERR_INVALID_TOURNAMENT_DATA",
      });
    });
  }
});

test("update creates directories and writes UTF-8 JSON atomically", async (t) => {
  const { filePath, jsonStore } = await createTemporaryStore(t, true);

  const updated = await jsonStore.update((data) => {
    data.active = "Copa Ação";
    data.tournaments["Copa Ação"] = createTournament({
      players: { "José": createPlayer() },
    });
  });

  const contents = await readFile(filePath, "utf8");
  assert.equal(contents, JSON.stringify(updated, null, 2));
  assert.match(contents, /Copa Ação/);
  assert.match(contents, /José/);
  assert.deepEqual(await jsonStore.load(), updated);

  const files = await readdir(path.dirname(filePath));
  assert.deepEqual(files, ["tournaments.json"]);
});

test("a no-op update leaves the original file untouched", async (t) => {
  const { filePath, jsonStore } = await createTemporaryStore(t);
  const originalContents = JSON.stringify(EMPTY_DATA);
  await writeFile(filePath, originalContents, "utf8");

  await jsonStore.update(() => {});

  assert.equal(await readFile(filePath, "utf8"), originalContents);
});

test("all loads and updates run in invocation order", async (t) => {
  const { jsonStore } = await createTemporaryStore(t);
  let markFirstStarted;
  let releaseFirst;
  const firstStarted = new Promise((resolve) => {
    markFirstStarted = resolve;
  });
  const firstMayFinish = new Promise((resolve) => {
    releaseFirst = resolve;
  });

  const firstUpdate = jsonStore.update(async (data) => {
    data.tournaments.first = createTournament();
    markFirstStarted();
    await firstMayFinish;
  });

  await firstStarted;

  const secondUpdate = jsonStore.update((data) => {
    assert.ok(data.tournaments.first);
    data.tournaments.second = createTournament();
  });
  const queuedLoad = jsonStore.load();

  releaseFirst();

  const [firstResult, secondResult, loadedResult] = await Promise.all([
    firstUpdate,
    secondUpdate,
    queuedLoad,
  ]);

  assert.deepEqual(Object.keys(firstResult.tournaments), ["first"]);
  assert.deepEqual(Object.keys(secondResult.tournaments), ["first", "second"]);
  assert.deepEqual(Object.keys(loadedResult.tournaments), ["first", "second"]);
});

test("failed mutations do not overwrite data or break the operation queue", async (t) => {
  const { filePath, jsonStore } = await createTemporaryStore(t);
  const initialData = {
    active: "cup",
    tournaments: {
      cup: createTournament({ players: { Ana: createPlayer() } }),
    },
  };
  const initialContents = JSON.stringify(initialData, null, 2);
  await writeFile(filePath, initialContents, "utf8");

  await assert.rejects(
    jsonStore.update((data) => {
      data.tournaments.cup.players.Ana.points = -1;
    }),
    { code: "ERR_INVALID_TOURNAMENT_DATA" },
  );
  assert.equal(await readFile(filePath, "utf8"), initialContents);

  await assert.rejects(
    jsonStore.update(() => {
      throw new Error("cancel update");
    }),
    /cancel update/,
  );
  assert.equal(await readFile(filePath, "utf8"), initialContents);

  const recovered = await jsonStore.update((data) => {
    data.tournaments.cup.players.Ana.points = 3;
  });
  assert.equal(recovered.tournaments.cup.players.Ana.points, 3);
});
