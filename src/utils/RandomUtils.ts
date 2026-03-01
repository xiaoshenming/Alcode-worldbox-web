/**
 * Pick a random item from an array using uniform distribution.
 */
export function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

/**
 * Pick a weighted random item from a list of types.
 *
 * @param types  - Array of type values (must sum to 1 in weights)
 * @param weights - Record mapping each type to its relative weight
 * @param fallback - Returned if no type is selected (e.g. floating point edge case)
 *
 * Extracted from 5 system implementations (DiplomaticSuccessionSystem,
 * DiplomaticTradeAgreementSystem, CreatureLegacySystem, CreatureOathSystem,
 * WorldMemorialSystem).
 */
export function pickWeighted<T extends string>(
  types: readonly T[],
  weights: Record<T, number>,
  fallback: T,
): T {
  const r = Math.random()
  let cum = 0
  for (const t of types) {
    cum += weights[t]
    if (r <= cum) return t
  }
  return fallback
}
