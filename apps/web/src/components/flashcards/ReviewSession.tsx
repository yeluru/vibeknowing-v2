"use client";

import { useState, useEffect } from "react";
import { Loader2, Layers, CheckCircle, Flame, CalendarClock, Repeat2 } from "lucide-react";
import { API_BASE, buildAIHeaders } from "@/lib/api";
import { FlashcardDeck } from "./FlashcardDeck";
import { updateCard, getNextReviewSummary, getDueCount, type Difficulty } from "@/lib/spacedRepetition";
import { recordCardReview, getStats } from "@/lib/learnStats";

interface Flashcard {
    id: string;
    front: string;
    back: string;
}

interface ReviewSessionProps {
    sourceId: string;
    title?: string;
}

export function ReviewSession({ sourceId, title = "Flashcards" }: ReviewSessionProps) {
    const [cards, setCards] = useState<Flashcard[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [completed, setCompleted] = useState(false);
    const [sessionStats, setSessionStats] = useState({ easy: 0, medium: 0, hard: 0 });
    const [reviewSummary, setReviewSummary] = useState({ today: 0, tomorrow: 0, later: 0 });

    // Load existing flashcards on mount
    useEffect(() => {
        const loadExistingCards = async () => {
            try {
                const response = await fetch(`${API_BASE}/ai/flashcards/${sourceId}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.flashcards && data.flashcards.length > 0) {
                        const formattedCards: Flashcard[] = data.flashcards.map((c: any, index: number) => ({
                            id: `c-${index}`,
                            front: c.front,
                            back: c.back
                        }));
                        setCards(formattedCards);
                    }
                }
            } catch (error) {
                console.error("Failed to load existing flashcards:", error);
            }
        };
        loadExistingCards();
    }, [sourceId]);

    const generateCards = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/ai/flashcards/${sourceId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...buildAIHeaders() }
            });

            if (!response.ok) throw new Error('Failed to generate flashcards');

            const data = await response.json();
            const apiCards = data.flashcards || [];

            const formattedCards: Flashcard[] = apiCards.map((c: any, index: number) => ({
                id: `c-${index}`,
                front: c.front,
                back: c.back
            }));

            setCards(formattedCards);
            setCurrentIndex(0);
            setCompleted(false);
            setSessionStats({ easy: 0, medium: 0, hard: 0 });
        } catch (error) {
            console.error("Failed to generate cards:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleNext = (difficulty: Difficulty) => {
        const card = cards[currentIndex];

        // SM-2: update scheduling data for this card
        updateCard(sourceId, card.id, difficulty);

        // Track stats for this session
        setSessionStats(prev => ({ ...prev, [difficulty]: prev[difficulty] + 1 }));

        // Record in global learn stats (streak, daily count)
        recordCardReview(1);

        if (currentIndex < cards.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            // Session complete — compute next-review summary
            const allIds = cards.map(c => c.id);
            setReviewSummary(getNextReviewSummary(sourceId, allIds));
            setCompleted(true);
        }
    };

    const dueCount = cards.length > 0 ? getDueCount(sourceId, cards.map(c => c.id)) : 0;
    const stats = typeof window !== "undefined" ? getStats() : null;

    return (
        <div className="bg-white dark:bg-[var(--background-elevated)] rounded-xl border border-slate-200 dark:border-[var(--surface-border)] shadow-sm transition-colors duration-300">
            <div className="border-b border-slate-200 dark:border-[var(--surface-border)] px-5 py-4 flex items-center justify-end">
                {stats && stats.streak > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-2.5 py-1 rounded-full">
                        <Flame className="h-3.5 w-3.5" />
                        {stats.streak} day streak
                    </span>
                )}
            </div>

            <div className="p-5 sm:p-6">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
                        <p className="text-sm text-slate-500 dark:text-slate-400">Creating flashcards…</p>
                    </div>

                ) : cards.length === 0 ? (
                    <div className="text-center py-14 rounded-xl border border-dashed border-slate-200 dark:border-[var(--surface-border)] bg-slate-50/50 dark:bg-[var(--background-elevated)/40]">
                        <Layers className="h-10 w-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                        <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-1">Master this topic</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Generate flashcards to memorize key concepts.</p>
                        <button
                            onClick={generateCards}
                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-sm transition-colors cursor-pointer"
                        >
                            Create Flashcards
                        </button>
                    </div>

                ) : completed ? (
                    <div className="text-center py-10">
                        {/* Completion icon */}
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 dark:bg-emerald-500/15 rounded-full mb-5">
                            <CheckCircle className="h-9 w-9 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Session Complete!</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                            Reviewed {cards.length} card{cards.length !== 1 ? "s" : ""}
                        </p>

                        {/* Session breakdown */}
                        <div className="flex items-center justify-center gap-3 mb-6">
                            {sessionStats.easy > 0 && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-semibold border border-emerald-200 dark:border-emerald-500/20">
                                    Easy · {sessionStats.easy}
                                </span>
                            )}
                            {sessionStats.medium > 0 && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold border border-amber-200 dark:border-amber-500/20">
                                    Medium · {sessionStats.medium}
                                </span>
                            )}
                            {sessionStats.hard > 0 && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 text-xs font-semibold border border-red-200 dark:border-red-500/20">
                                    Hard · {sessionStats.hard}
                                </span>
                            )}
                        </div>

                        {/* Next review schedule */}
                        <div className="max-w-xs mx-auto bg-slate-50 dark:bg-[var(--background-elevated)/60] rounded-xl border border-slate-200 dark:border-[var(--surface-border)] p-4 mb-6 text-left space-y-2">
                            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <CalendarClock className="h-3.5 w-3.5" /> Next review schedule
                            </p>
                            {reviewSummary.today > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600 dark:text-slate-400">Due today</span>
                                    <span className="font-semibold text-red-500">{reviewSummary.today} cards</span>
                                </div>
                            )}
                            {reviewSummary.tomorrow > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600 dark:text-slate-400">Due tomorrow</span>
                                    <span className="font-semibold text-amber-500">{reviewSummary.tomorrow} cards</span>
                                </div>
                            )}
                            {reviewSummary.later > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600 dark:text-slate-400">Due later</span>
                                    <span className="font-semibold text-emerald-500">{reviewSummary.later} cards</span>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => { setCurrentIndex(0); setCompleted(false); setSessionStats({ easy: 0, medium: 0, hard: 0 }); }}
                            className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-sm transition-colors cursor-pointer"
                        >
                            <Repeat2 className="h-4 w-4" />
                            Review Again
                        </button>
                    </div>

                ) : (
                    <div className="py-4">
                        {/* Progress header */}
                        <div className="flex items-center justify-between mb-5 text-sm text-slate-500 dark:text-slate-400">
                            <span>Card {currentIndex + 1} of {cards.length}</span>
                            {dueCount > 0 && (
                                <span className="text-xs font-medium text-indigo-500 dark:text-indigo-400">
                                    {dueCount} due for review
                                </span>
                            )}
                        </div>

                        {/* Progress bar */}
                        <div className="w-full h-1 bg-slate-100 dark:bg-[var(--surface-border)] rounded-full mb-6 overflow-hidden">
                            <div
                                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                                style={{ width: `${((currentIndex) / cards.length) * 100}%` }}
                            />
                        </div>

                        <FlashcardDeck
                            card={cards[currentIndex]}
                            onNext={handleNext}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
