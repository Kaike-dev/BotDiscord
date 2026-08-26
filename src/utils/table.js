function stringifyCell(value) {
  return String(value ?? "").replace(/[\r\n]+/g, " ").replace(/\t/g, " ");
}

function displayLength(value) {
  return Array.from(value).length;
}

function padCell(value, width) {
  return value + " ".repeat(Math.max(0, width - displayLength(value)));
}

/**
 * Formats a small, dependency-free ASCII table suitable for a Discord code
 * block or a text attachment.
 */
export function formatTable(headers, rows) {
  if (!Array.isArray(headers) || headers.length === 0) {
    throw new TypeError("headers must be a non-empty array");
  }

  if (!Array.isArray(rows)) {
    throw new TypeError("rows must be an array");
  }

  const normalizedHeaders = headers.map(stringifyCell);
  const normalizedRows = rows.map((row) => {
    if (!Array.isArray(row) || row.length !== normalizedHeaders.length) {
      throw new TypeError("every row must have the same number of cells as headers");
    }

    return row.map(stringifyCell);
  });

  const widths = normalizedHeaders.map((header, column) =>
    Math.max(
      displayLength(header),
      ...normalizedRows.map((row) => displayLength(row[column])),
    ),
  );
  const divider = `+${widths.map((width) => "-".repeat(width + 2)).join("+")}+`;
  const renderRow = (row) =>
    `| ${row.map((cell, column) => padCell(cell, widths[column])).join(" | ")} |`;

  return [
    divider,
    renderRow(normalizedHeaders),
    divider,
    ...normalizedRows.map(renderRow),
    divider,
  ].join("\n");
}
