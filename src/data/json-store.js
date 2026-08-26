import { randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TOURNAMENT_TYPES = new Set([
  "pontos_corridos",
  "fase_de_grupos",
  "suico",
  "mata_mata",
]);
const MATCH_RESULTS = new Set(["1", "2", "draw"]);
const PLAYER_FIELDS = ["draws", "losses", "played", "points", "wins"];
const TOURNAMENT_FIELDS = ["matches", "players", "type"];
const MATCH_FIELDS = ["p1", "p2", "result"];
const ROOT_FIELDS = ["active", "tournaments"];

function createEmptyData() {
  return { active: null, tournaments: {} };
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function schemaError(location, expectation) {
  const error = new TypeError(
    `Invalid tournament data at ${location}: expected ${expectation}.`,
  );
  error.code = "ERR_INVALID_TOURNAMENT_DATA";
  return error;
}

function assertRecord(value, location) {
  if (!isRecord(value)) {
    throw schemaError(location, "an object");
  }
}

function assertExactFields(value, expectedFields, location) {
  const actualFields = Object.keys(value).sort();

  if (
    actualFields.length !== expectedFields.length ||
    actualFields.some((field, index) => field !== expectedFields[index])
  ) {
    throw schemaError(
      location,
      `exactly the fields ${expectedFields.join(", ")}`,
    );
  }
}

function assertString(value, location) {
  if (typeof value !== "string") {
    throw schemaError(location, "a string");
  }
}

function validatePlayer(player, location) {
  assertRecord(player, location);
  assertExactFields(player, PLAYER_FIELDS, location);

  for (const field of PLAYER_FIELDS) {
    const value = player[field];
    if (!Number.isInteger(value) || value < 0) {
      throw schemaError(`${location}.${field}`, "a non-negative integer");
    }
  }
}

function validateMatch(match, location) {
  assertRecord(match, location);
  assertExactFields(match, MATCH_FIELDS, location);
  assertString(match.p1, `${location}.p1`);
  assertString(match.p2, `${location}.p2`);

  if (!MATCH_RESULTS.has(match.result)) {
    throw schemaError(`${location}.result`, '"1", "2", or "draw"');
  }
}

function validateTournament(tournament, location) {
  assertRecord(tournament, location);
  assertExactFields(tournament, TOURNAMENT_FIELDS, location);

  if (!TOURNAMENT_TYPES.has(tournament.type)) {
    throw schemaError(
      `${location}.type`,
      "a supported tournament type",
    );
  }

  assertRecord(tournament.players, `${location}.players`);
  for (const [playerName, player] of Object.entries(tournament.players)) {
    validatePlayer(player, `${location}.players[${JSON.stringify(playerName)}]`);
  }

  if (!Array.isArray(tournament.matches)) {
    throw schemaError(`${location}.matches`, "an array");
  }
  tournament.matches.forEach((match, index) => {
    validateMatch(match, `${location}.matches[${index}]`);
  });
}

function validateData(data) {
  assertRecord(data, "$root");
  assertExactFields(data, ROOT_FIELDS, "$root");

  if (data.active !== null && typeof data.active !== "string") {
    throw schemaError("$root.active", "a string or null");
  }

  assertRecord(data.tournaments, "$root.tournaments");
  for (const [tournamentName, tournament] of Object.entries(data.tournaments)) {
    validateTournament(
      tournament,
      `$root.tournaments[${JSON.stringify(tournamentName)}]`,
    );
  }

  if (
    data.active !== null &&
    !Object.hasOwn(data.tournaments, data.active)
  ) {
    throw schemaError(
      "$root.active",
      "null or the name of an existing tournament",
    );
  }

  return data;
}

async function readData(filePath) {
  let contents;

  try {
    contents = await readFile(filePath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      return createEmptyData();
    }
    throw error;
  }

  if (contents.trim() === "") {
    return createEmptyData();
  }

  let data;
  try {
    data = JSON.parse(contents);
  } catch (cause) {
    const error = new SyntaxError(
      `Invalid JSON in tournament data file: ${filePath}`,
      { cause },
    );
    error.code = "ERR_INVALID_TOURNAMENT_JSON";
    throw error;
  }

  return validateData(data);
}

async function writeDataAtomically(filePath, data) {
  validateData(data);

  const directory = path.dirname(filePath);
  const temporaryPath = path.join(
    directory,
    `.${path.basename(filePath)}.${process.pid}.${randomUUID()}.tmp`,
  );

  await mkdir(directory, { recursive: true });

  try {
    await writeFile(temporaryPath, JSON.stringify(data, null, 2), {
      encoding: "utf8",
      flag: "wx",
    });
    await rename(temporaryPath, filePath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => {});
    throw error;
  }
}

export function createJsonStore(filePath) {
  if (typeof filePath !== "string" || filePath.trim() === "") {
    throw new TypeError("filePath must be a non-empty string");
  }

  const resolvedPath = path.resolve(filePath);
  let queue = Promise.resolve();

  function enqueue(operation) {
    const result = queue.then(operation);
    queue = result.catch(() => {});
    return result;
  }

  return Object.freeze({
    load() {
      return enqueue(() => readData(resolvedPath));
    },

    update(mutator) {
      return enqueue(async () => {
        if (typeof mutator !== "function") {
          throw new TypeError("mutator must be a function");
        }

        const data = await readData(resolvedPath);
        const contentsBeforeUpdate = JSON.stringify(data);
        await mutator(data);

        validateData(data);
        if (JSON.stringify(data) === contentsBeforeUpdate) {
          return data;
        }

        await writeDataAtomically(resolvedPath, data);
        return data;
      });
    },
  });
}

const rootDataFile = fileURLToPath(
  new URL("../../data/tournaments.json", import.meta.url),
);

export const store = createJsonStore(process.env.DATA_FILE || rootDataFile);
