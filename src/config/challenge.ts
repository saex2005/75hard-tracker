export const CHALLENGE_CONFIG = {
  startDate: '2026-07-06',
  totalDays: 75,
  bottleSizeMl: 500, // Santiago actualiza esto cuando mida su botella
  dailyWaterGoalL: 3.785, // 1 galón
  book: 'The Way of the Superior Man',
  dailyPagesGoal: 10,
} as const

// botellas por día = ceil(3785 / bottleSizeMl)
export const BOTTLES_PER_DAY = Math.ceil(
  (CHALLENGE_CONFIG.dailyWaterGoalL * 1000) / CHALLENGE_CONFIG.bottleSizeMl
)
