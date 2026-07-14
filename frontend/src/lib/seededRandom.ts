// Deterministic seeded PRNG wrapper around d3-random's linear congruential generator.
// See lib/radarGeometry.ts's computeBlipLayout for why this determinism matters (RADR-07).
import { randomLcg } from 'd3-random'

// randomLcg(seed): seed may be a real number in [0,1) or any integer (only the lower 32 bits
// are considered) -- a plain integer id is a valid seed directly, no hashing needed.
// Two instances created with the same seed always produce identical [0,1) sequences.
export function seededRng(seed: number): () => number {
  return randomLcg(seed)
}
