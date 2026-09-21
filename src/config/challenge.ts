export const CHALLENGE_CONFIG = {
  startDate: '2026-09-23',
  endDate: '2026-12-31', // techo absoluto — un reset nunca puede correr más allá de esta fecha
  totalDays: 100,
  studyBlockMinutes: 90,
  trainingMinutes: 45,
  dailyPagesGoal: 10,
  stepsGoal: 10000,
  cycleLengthDays: 14,
} as const
