"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

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

    const handleFlip = () => {
        setIsFlipped(!isFlipped);
    };

    const handleRate = (difficulty: 'easy' | 'medium' | 'hard') => {
        setIsFlipped(false);
        onNext(difficulty);
    };

    return (
        <div className="w-full max-w-3xl mx-auto space-y-10">
            <div className="relative h-[500px] w-full perspective-1000 group cursor-pointer" onClick={handleFlip}>
                <motion.div
                    className="relative h-full w-full transition-all duration-500 preserve-3d"
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                    style={{ transformStyle: "preserve-3d" }}
                >
                    {/* Front */}
                    <div className="absolute inset-0 h-full w-full backface-hidden rounded-2xl bg-white border-2 border-purple-100 shadow-lg flex flex-col items-center justify-center p-8 text-center transition-colors duration-300">
                        <span className="absolute top-4 left-4 text-xs font-semibold text-purple-500 uppercase tracking-wider">Question</span>
                        <p className="text-3xl font-medium text-gray-900 leading-relaxed">{card.front}</p>
                        <div className="absolute bottom-4 text-gray-400 flex items-center gap-2 text-sm">
                            <RotateCw className="h-4 w-4" />
                            Click to flip
                        </div>
                    </div>

                    {/* Back */}
                    <div
                        className="absolute inset-0 h-full w-full backface-hidden rounded-2xl bg-purple-600 text-white shadow-lg flex flex-col items-center justify-center p-8 text-center"
                        style={{ transform: "rotateY(180deg)" }}
                    >
                        <span className="absolute top-4 left-4 text-xs font-semibold text-purple-200 uppercase tracking-wider">Answer</span>
                        <p className="text-2xl font-medium leading-relaxed">{card.back}</p>
                    </div>
                </motion.div>
            </div>

            {isFlipped && (
                <div className="flex justify-center gap-4">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleRate('hard'); }}
                        className="px-6 py-3 bg-red-100 text-red-700 rounded-xl font-medium hover:bg-red-200 transition-colors"
                    >
                        Hard
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleRate('medium'); }}
                        className="px-6 py-3 bg-yellow-100 text-yellow-700 rounded-xl font-medium hover:bg-yellow-200 transition-colors"
                    >
                        Medium
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleRate('easy'); }}
                        className="px-6 py-3 bg-green-100 text-green-700 rounded-xl font-medium hover:bg-green-200 transition-colors"
                    >
                        Easy
                    </button>
                </div>
            )}
        </div>
    );
}
