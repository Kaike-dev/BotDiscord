import assert from "node:assert/strict";
import test from "node:test";

import { buildStandings } from "../src/domain/standings.js";

test("buildStandings orders by points, wins and then win percentage", () => {
  const standings = buildStandings({
    MenosPontos: { played: 1, wins: 1, draws: 0, losses: 0, points: 2 },
    MenorWinPct: { played: 4, wins: 2, draws: 0, losses: 2, points: 6 },
    MaisVitorias: { played: 5, wins: 3, draws: 0, losses: 2, points: 6 },
    MaiorWinPct: { played: 3, wins: 2, draws: 0, losses: 1, points: 6 },
    MaisPontos: { played: 4, wins: 2, draws: 1, losses: 1, points: 7 },
  });

  assert.deepEqual(
    standings.map(({ name }) => name),
    ["MaisPontos", "MaisVitorias", "MaiorWinPct", "MenorWinPct", "MenosPontos"],
  );
  assert.deepEqual(
    standings.map(({ position }) => position),
    [1, 2, 3, 4, 5],
  );
});

test("buildStandings calculates both percentages and handles zero matches", () => {
  const [played, idle] = buildStandings({
    Played: { played: 4, wins: 2, draws: 1, losses: 1, points: 7 },
    Idle: { played: 0, wins: 0, draws: 0, losses: 0, points: 0 },
  });

  assert.equal(played.winPercentage, 50);
  assert.equal(played.weightedWinPercentage, 62.5);
  assert.equal(idle.winPercentage, 0);
  assert.equal(idle.weightedWinPercentage, 0);
});

test("buildStandings keeps insertion order for complete ties", () => {
  const standings = buildStandings({
    Primeiro: { played: 0, wins: 0, draws: 0, losses: 0, points: 0 },
    Segundo: { played: 0, wins: 0, draws: 0, losses: 0, points: 0 },
  });

  assert.deepEqual(
    standings.map(({ name }) => name),
    ["Primeiro", "Segundo"],
  );
});
