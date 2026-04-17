import { Priority } from '@/types'

const ALL_PRIORITIES: Priority[] = [
  'safety', 'fuel_economy', 'reliability', 'cargo',
  'comfort', 'performance', 'tech', 'value',
]

// Converts a ranked priority list into a normalized weight vector.
// Rank 1 gets 2x the weight of rank 2, rank 2 gets 2x rank 3, etc. (exponential decay).
export function rankToWeights(ranked: Priority[]): Record<Priority, number> {
  const n = ranked.length
  const raw = ranked.map((_, i) => Math.pow(2, n - 1 - i))
  const sum = raw.reduce((a, b) => a + b, 0)

  const weights: Partial<Record<Priority, number>> = {}
  ranked.forEach((p, i) => { weights[p] = raw[i] / sum })

  // Unranked priorities get a tiny residual weight
  ALL_PRIORITIES.forEach(p => { if (!(p in weights)) weights[p] = 0.01 })

  return weights as Record<Priority, number>
}
