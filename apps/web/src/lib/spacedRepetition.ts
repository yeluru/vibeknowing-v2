/**
 * VibeLearn – SM-2 Spaced Repetition
 *
 * Classic SuperMemo-2 algorithm stored in localStorage per card.
 * Key format: `vl_sr_{sourceId}_{cardId}`
 *
 * Quality scale mapped from user ratings:
 *   hard   → 1  (incorrect, but remembered after seeing answer)
 *   medium → 3  (correct with significant hesitation)
 *   easy   → 5  (perfect response)
 */

export interface CardSRData {
  repetitions: number;  // successful consecutive reviews
  easeFactor: number;   // >= 1.3, starts at 2.5
  interval: number;     // days until next review
  nextReview: string;   // ISO date YYYY-MM-DD
  lastReviewed: string; // ISO date YYYY-MM-DD
}

export type Difficulty = "easy" | "medium" | "hard";

const QUALITY_MAP: Record<Difficulty, number> = {
  hard: 1,
  medium: 3,
  easy: 5,
};

function storageKey(sourceId: string, cardId: string): string {
  return `vl_sr_${sourceId}_${cardId}`;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

const defaultCard = (): CardSRData => ({
  repetitions: 0,
  easeFactor: 2.5,
  interval: 0,
  nextReview: toISODate(new Date()),
  lastReviewed: "",
});

export function getCardData(sourceId: string, cardId: string): CardSRData {
  if (typeof window === "undefined") return defaultCard();
  try {
    const raw = localStorage.getItem(storageKey(sourceId, cardId));
    return raw ? JSON.parse(raw) : defaultCard();
  } catch {
    return defaultCard();
  }
}

/** Apply SM-2 and persist; returns updated card data */
export function updateCard(
  sourceId: string,
  cardId: string,
  difficulty: Difficulty
): CardSRData {
  const data = getCardData(sourceId, cardId);
  const q = QUALITY_MAP[difficulty];

  let { repetitions, easeFactor, interval } = data;

  if (q < 3) {
    // Failed — reset streak
    repetitions = 0;
    interval = 1;
  } else {
    // Passed
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  }

  // Update ease factor (floor at 1.3)
  easeFactor = Math.max(
    1.3,
    easeFactor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)
  );

  const updated: CardSRData = {
    repetitions,
    easeFactor: Math.round(easeFactor * 100) / 100,
    interval,
    nextReview: addDays(interval),
    lastReviewed: toISODate(new Date()),
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(
        storageKey(sourceId, cardId),
        JSON.stringify(updated)
      );
    } catch {}
  }

  return updated;
}

/** True if the card is due for review today or is brand new */
export function isDue(sourceId: string, cardId: string): boolean {
  const data = getCardData(sourceId, cardId);
  if (!data.lastReviewed) return true; // never reviewed = new card = always due
  return data.nextReview <= toISODate(new Date());
}

/** Returns how many of the given cardIds are due */
export function getDueCount(sourceId: string, cardIds: string[]): number {
  return cardIds.filter((id) => isDue(sourceId, id)).length;
}

/**
 * Returns a summary of when cards will next be due.
 * e.g. { today: 2, tomorrow: 5, later: 3 }
 */
export function getNextReviewSummary(
  sourceId: string,
  cardIds: string[]
): { today: number; tomorrow: number; later: number } {
  const todayStr = toISODate(new Date());
  const tomorrowStr = addDays(1);
  let today = 0, tomorrow = 0, later = 0;

  cardIds.forEach((id) => {
    const d = getCardData(sourceId, id);
    if (!d.lastReviewed || d.nextReview <= todayStr) {
      today++;
    } else if (d.nextReview === tomorrowStr) {
      tomorrow++;
    } else {
      later++;
    }
  });

  return { today, tomorrow, later };
}
