"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCw } from "lucide-react";

interface Flashcard {
    id: string;
    front: string;
    back: string;
}

interface FlashcardDeckProps {
    card: Flashcard;
    onNext: (difficulty: 'easy' | 'medium' | 'hard') => void;
}

export function FlashcardDeck({ card, onNext }: FlashcardDeckProps) {
    const [isFlipped, setIsFlipped] = useState(false);

    const handleFlip = () => setIsFlipped(!isFlipped);

    const handleRate = (difficulty: 'easy' | 'medium' | 'hard') => {
        setIsFlipped(false);
        onNext(difficulty);
    };

    return (
        <div className="w-full max-w-3xl mx-auto space-y-8">
            {/* Card */}
            <div
                className="relative h-[460px] w-full cursor-pointer select-none"
                onClick={handleFlip}
                style={{ perspective: "1200px" }}
            >
                <motion.div
                    className="relative h-full w-full"
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.55, type: "spring", stiffness: 280, damping: 22 }}
                    style={{ transformStyle: "preserve-3d" }}
                >
                    {/* Front */}
                    <div
                        className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center
                                   rounded-3xl glass-card
                                   border-2 border-slate-200/60 dark:border-white/[0.07]
                                   shadow-2xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)]
                                   hover:border-emerald-200/60 dark:hover:border-emerald-500/15
                                   transition-colors duration-300 group"
                        style={{ backfaceVisibility: "hidden" }}
                    >
                        {/* Top badge */}
                        <div className="absolute top-5 left-5 flex items-center gap-1.5">
                            <div className="status-dot-live" />
                            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em]">Question</span>
                        </div>

                        <p className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white leading-relaxed tracking-tight">
                            {card.front}
                        </p>

                        <div className="absolute bottom-5 flex items-center gap-1.5 text-slate-400 dark:text-slate-600 text-xs font-medium">
                            <RotateCw className="h-3.5 w-3.5 group-hover:rotate-180 transition-transform duration-500" />
                            Tap to reveal answer
                        </div>
                    </div>

                    {/* Back */}
                    <div
                        className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center
                                   rounded-3xl
                                   bg-gradient-to-br from-emerald-500 to-indigo-600
                                   dark:from-emerald-600/90 dark:to-indigo-700/90
                                   shadow-2xl shadow-emerald-500/20 dark:shadow-emerald-500/10
                                   border border-emerald-400/20"
                        style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                    >
                        <div className="absolute top-5 left-5">
                            <span className="text-[10px] font-black text-emerald-100/80 uppercase tracking-[0.2em]">Answer</span>
                        </div>
                        <p className="text-2xl font-semibold text-white leading-relaxed tracking-tight">
                            {card.back}
                        </p>
                    </div>
                </motion.div>
            </div>

            {/* Rating buttons */}
            <AnimatePresence>
                {isFlipped && (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.25 }}
                        className="flex justify-center gap-3"
                    >
                        <button
                            onClick={(e) => { e.stopPropagation(); handleRate('hard'); }}
                            className="px-6 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 cursor-pointer
                                       bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400
                                       border border-red-200 dark:border-red-500/20
                                       hover:bg-red-100 dark:hover:bg-red-500/20 hover:scale-105 shadow-sm"
                        >
                            Hard
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleRate('medium'); }}
                            className="px-6 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 cursor-pointer
                                       bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400
                                       border border-amber-200 dark:border-amber-500/20
                                       hover:bg-amber-100 dark:hover:bg-amber-500/20 hover:scale-105 shadow-sm"
                        >
                            Medium
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleRate('easy'); }}
                            className="px-6 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 cursor-pointer
                                       bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400
                                       border border-emerald-200 dark:border-emerald-500/20
                                       hover:bg-emerald-100 dark:hover:bg-emerald-500/20 hover:scale-105 shadow-sm"
                        >
                            Easy
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
