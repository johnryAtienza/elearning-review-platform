/** Minimum percentage score required to pass a quiz (0–100). */
export const PASSING_SCORE_PCT = 70

/**
 * Converts a zero-based choice index to its letter label.
 * 0 → 'A', 1 → 'B', 2 → 'C', etc.
 */
export function answerLabel(index: number): string {
  return String.fromCharCode(65 + index)
}
