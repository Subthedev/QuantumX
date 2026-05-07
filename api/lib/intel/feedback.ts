/**
 * Outcome feedback loop. Closes the gap between "agents take signals" and
 * "agents learn from results."
 *
 * The shape is a per-(strategy, regime) running tally stored in
 * autonomous_state.state.strategyPerformance. Each closed trade updates one
 * cell; each new candidate trade reads its cell to bias confidence.
 *
 *   key = `${strategy}|${regime}`
 *   value = { wins, losses, totalPnl, alphaSmooth, lastUpdate }
 *
 * `alphaSmooth` is an exponentially-weighted win rate (alpha=0.15) so recent
 * outcomes carry more weight than ancient ones. We initialize new cells to
 * 0.55 (slightly optimistic) so the system explores rather than locks out
 * untried (strategy, regime) pairs.
 */

export interface StrategyCell {
  wins: number;
  losses: number;
  totalPnl: number;       // sum of pnl_percent
  alphaSmooth: number;    // EWMA of win rate (0..1)
  lastUpdate: number;
}

export type StrategyPerformance = Record<string, StrategyCell>;

const ALPHA = 0.15;
const PRIOR = 0.55;

const cellKey = (strategy: string, regime: string) => `${strategy}|${regime}`;

export function getCell(perf: StrategyPerformance, strategy: string, regime: string): StrategyCell {
  return perf[cellKey(strategy, regime)] ?? {
    wins: 0,
    losses: 0,
    totalPnl: 0,
    alphaSmooth: PRIOR,
    lastUpdate: 0,
  };
}

/**
 * Update a cell with a new closed-trade outcome. Mutates `perf` in place.
 */
export function recordOutcome(
  perf: StrategyPerformance,
  strategy: string,
  regime: string,
  isWin: boolean,
  pnlPercent: number
): void {
  const key = cellKey(strategy, regime);
  const cell = perf[key] ?? { wins: 0, losses: 0, totalPnl: 0, alphaSmooth: PRIOR, lastUpdate: 0 };
  if (isWin) cell.wins++; else cell.losses++;
  cell.totalPnl += pnlPercent;
  cell.alphaSmooth = ALPHA * (isWin ? 1 : 0) + (1 - ALPHA) * cell.alphaSmooth;
  cell.lastUpdate = Date.now();
  perf[key] = cell;
}

/**
 * Translate a cell's history into a confidence bias for a new candidate trade.
 * Range -15 .. +15. Untrained cells return 0 so the system explores.
 *
 * - Strong winner (smooth >0.65) and >=10 trades: +up to 12
 * - Weak loser (smooth <0.40) and >=10 trades: -up to 12
 * - Untried or thin (<5 trades): 0 (let the base scorer decide)
 */
export function feedbackBias(
  perf: StrategyPerformance,
  strategy: string,
  regime: string
): { bias: number; reasons: string[] } {
  const cell = getCell(perf, strategy, regime);
  const total = cell.wins + cell.losses;
  if (total < 5) return { bias: 0, reasons: [] };

  const winRate = cell.alphaSmooth;
  // Map win rate around 0.5 to a bias roughly ±15 at the extremes.
  const sample = Math.min(1, total / 30);   // confidence in the estimate (more trades = more weight)
  const raw = (winRate - 0.5) * 30 * sample;
  const bias = Math.max(-15, Math.min(15, raw));
  const reasons = [
    `${bias >= 0 ? '+' : ''}${bias.toFixed(0)} feedback wr=${(winRate * 100).toFixed(0)}% n=${total}`,
  ];
  return { bias, reasons };
}

/**
 * Render a compact summary of the top/bottom performing cells. Useful for
 * logging in trade-tick responses and for the UI to surface.
 */
export function topCells(perf: StrategyPerformance, n = 5): Array<{ key: string; cell: StrategyCell; total: number }> {
  return Object.entries(perf)
    .map(([key, cell]) => ({ key, cell, total: cell.wins + cell.losses }))
    .filter(c => c.total >= 5)
    .sort((a, b) => b.cell.alphaSmooth - a.cell.alphaSmooth)
    .slice(0, n);
}
