/**
 * VibeLearn – Learning stats tracker
 * Persists streak, daily card/quiz counts to localStorage.
 * Safe to call server-side (guards with typeof window check).
 */

export interface LearnStats {
  streak: number;        // consecutive active days
  bestStreak: number;    // all-time best streak
  lastActiveDate: string; // YYYY-MM-DD of last activity
  todayCards: number;    // cards reviewed today
  todayQuizzes: number;  // quizzes finished today
  totalCards: number;    // all-time cards reviewed
  totalQuizzes: number;  // all-time quizzes finished
}

const STORAGE_KEY = "vl_learn_stats";

const today = (): string => new Date().toISOString().slice(0, 10);

const defaultStats = (): LearnStats => ({
  streak: 0,
  bestStreak: 0,
  lastActiveDate: "",
  todayCards: 0,
  todayQuizzes: 0,
  totalCards: 0,
  totalQuizzes: 0,
});

export function getStats(): LearnStats {
  if (typeof window === "undefined") return defaultStats();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStats();
    const stored: LearnStats = JSON.parse(raw);
    // Reset today counts if it's a new day
    if (stored.lastActiveDate !== today()) {
      return {
        ...stored,
        todayCards: 0,
        todayQuizzes: 0,
        // Streak is preserved — it will be updated on next activity
      };
    }
    return stored;
  } catch {
    return defaultStats();
  }
}

function saveStats(stats: LearnStats): LearnStats {
  if (typeof window === "undefined") return stats;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {}
  return stats;
}

/** Call once per card rated in a review session */
export function recordCardReview(count = 1): LearnStats {
  const stats = getStats();
  const t = today();
  const wasActiveYesterday =
    stats.lastActiveDate === new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const isNewDay = stats.lastActiveDate !== t;

  const newStreak = isNewDay
    ? wasActiveYesterday || stats.streak === 0
      ? stats.streak + 1
      : 1 // broke streak
    : stats.streak;

  const updated: LearnStats = {
    ...stats,
    streak: newStreak,
    bestStreak: Math.max(stats.bestStreak, newStreak),
    lastActiveDate: t,
    todayCards: (isNewDay ? 0 : stats.todayCards) + count,
    totalCards: stats.totalCards + count,
  };
  return saveStats(updated);
}

/** Call once when a quiz is completed */
export function recordQuizComplete(): LearnStats {
  const stats = getStats();
  const t = today();
  const wasActiveYesterday =
    stats.lastActiveDate === new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const isNewDay = stats.lastActiveDate !== t;

  const newStreak = isNewDay
    ? wasActiveYesterday || stats.streak === 0
      ? stats.streak + 1
      : 1
    : stats.streak;

  const updated: LearnStats = {
    ...stats,
    streak: newStreak,
    bestStreak: Math.max(stats.bestStreak, newStreak),
    lastActiveDate: t,
    todayQuizzes: (isNewDay ? 0 : stats.todayQuizzes) + 1,
    totalQuizzes: stats.totalQuizzes + 1,
  };
  return saveStats(updated);
}
