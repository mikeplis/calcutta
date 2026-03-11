export type SeedProbs = {
  s16: number   // Sweet 16
  e8: number    // Elite 8
  f4: number    // Final Four
  final: number // Championship game
  win: number   // Champion
}

// Historical advancement rates by seed, 1985–2024
export const SEED_PROBS: Record<number, SeedProbs> = {
  1:  { s16: 0.99, e8: 0.87, f4: 0.63, final: 0.40, win: 0.25 },
  2:  { s16: 0.93, e8: 0.68, f4: 0.44, final: 0.22, win: 0.12 },
  3:  { s16: 0.85, e8: 0.56, f4: 0.28, final: 0.12, win: 0.07 },
  4:  { s16: 0.79, e8: 0.44, f4: 0.19, final: 0.08, win: 0.04 },
  5:  { s16: 0.65, e8: 0.33, f4: 0.13, final: 0.05, win: 0.02 },
  6:  { s16: 0.62, e8: 0.27, f4: 0.11, final: 0.04, win: 0.02 },
  7:  { s16: 0.57, e8: 0.23, f4: 0.09, final: 0.03, win: 0.02 },
  8:  { s16: 0.50, e8: 0.20, f4: 0.09, final: 0.03, win: 0.02 },
  9:  { s16: 0.50, e8: 0.16, f4: 0.06, final: 0.02, win: 0.01 },
  10: { s16: 0.43, e8: 0.18, f4: 0.07, final: 0.02, win: 0.01 },
  11: { s16: 0.38, e8: 0.17, f4: 0.08, final: 0.03, win: 0.01 },
  12: { s16: 0.35, e8: 0.14, f4: 0.04, final: 0.01, win: 0.00 },
  13: { s16: 0.21, e8: 0.05, f4: 0.01, final: 0.00, win: 0.00 },
  14: { s16: 0.15, e8: 0.03, f4: 0.00, final: 0.00, win: 0.00 },
  15: { s16: 0.07, e8: 0.01, f4: 0.00, final: 0.00, win: 0.00 },
  16: { s16: 0.01, e8: 0.00, f4: 0.00, final: 0.00, win: 0.00 },
}
