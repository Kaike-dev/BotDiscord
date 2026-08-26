import assert from "node:assert/strict";
import test from "node:test";

import { formatTable } from "../src/utils/table.js";

test("formatTable renders headers, aligned rows and borders", () => {
  const table = formatTable(
    ["Pos", "Jogador", "Pts"],
    [
      [1, "Ana", 6],
      [2, "Beatriz", 3],
    ],
  );

  assert.equal(
    table,
    [
      "+-----+---------+-----+",
      "| Pos | Jogador | Pts |",
      "+-----+---------+-----+",
      "| 1   | Ana     | 6   |",
      "| 2   | Beatriz | 3   |",
      "+-----+---------+-----+",
    ].join("\n"),
  );
});

test("formatTable normalizes multiline cells", () => {
  const table = formatTable(["Nome"], [["linha 1\nlinha 2"]]);

  assert.match(table, /linha 1 linha 2/);
  assert.doesNotMatch(table, /linha 1\nlinha 2/);
});

test("formatTable rejects malformed input", () => {
  assert.throws(() => formatTable([], []), /headers/);
  assert.throws(() => formatTable(["A", "B"], [["only one"]]), /same number/);
  assert.throws(() => formatTable(["A"], null), /rows/);
});
