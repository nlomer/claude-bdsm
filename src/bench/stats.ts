// Service: denominators, Wilson intervals and deterministic sampling utilities.
export function rate(numerator: number, denominator: number) {
  if (!denominator) return { numerator, denominator, rate: null, ci95: null };
  const p = numerator / denominator, z = 1.96, factor = 1 + z * z / denominator;
  const center = (p + z * z / (2 * denominator)) / factor;
  const margin = z * Math.sqrt(p * (1 - p) / denominator + z * z / (4 * denominator ** 2)) / factor;
  return { numerator, denominator, rate: p, ci95: [Math.max(0, center - margin), Math.min(1, center + margin)] };
}
export function quantile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))]!;
}
export function shuffle<T>(values: T[], seed = 42): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1); [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}
