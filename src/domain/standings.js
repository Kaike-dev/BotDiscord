function numberOrZero(value) {
  return Number.isFinite(value) ? value : 0;
}

/**
 * Builds the ordered rows used by the tournament table.
 *
 * The stored points are authoritative. Ties are resolved by wins and then by
 * win percentage, matching the original Python command. A final input-order
 * comparison makes complete ties deterministic.
 */
export function buildStandings(players = {}) {
  const rows = Object.entries(players).map(([name, stats], inputOrder) => {
    const played = numberOrZero(stats?.played);
    const wins = numberOrZero(stats?.wins);
    const draws = numberOrZero(stats?.draws);
    const losses = numberOrZero(stats?.losses);
    const points = numberOrZero(stats?.points);
    const winPercentage = played > 0 ? (wins / played) * 100 : 0;
    const weightedWinPercentage =
      played > 0 ? ((wins + 0.5 * draws) / played) * 100 : 0;

    return {
      name,
      played,
      wins,
      draws,
      losses,
      points,
      winPercentage,
      weightedWinPercentage,
      inputOrder,
    };
  });

  rows.sort(
    (left, right) =>
      right.points - left.points ||
      right.wins - left.wins ||
      right.winPercentage - left.winPercentage ||
      left.inputOrder - right.inputOrder,
  );

  return rows.map(({ inputOrder: _inputOrder, ...row }, index) => ({
    position: index + 1,
    ...row,
  }));
}
