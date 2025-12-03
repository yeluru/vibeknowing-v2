"use client";

import { useState, useEffect } from "react";
import { Loader2, Layers, CheckCircle } from "lucide-react";
import { FlashcardDeck } from "./FlashcardDeck";

interface Flashcard {
    id: string;
    front: string;
    back: string;
}

interface ReviewSessionProps {
    sourceId: string;
}

export function ReviewSession({ sourceId }: ReviewSessionProps) {
    const [cards, setCards] = useState<Flashcard[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [completed, setCompleted] = useState(false);

    // Load existing flashcards on mount
    useEffect(() => {
        const loadExistingCards = async () => {
            try {
                const response = await fetch(`http://localhost:8001/ai/flashcards/${sourceId}`);
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
            const response = await fetch(`http://localhost:8001/ai/flashcards/${sourceId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) throw new Error('Failed to generate flashcards');

            const data = await response.json();

            // API returns { flashcards: [...] }
            const apiCards = data.flashcards || [];

            const formattedCards: Flashcard[] = apiCards.map((c: any, index: number) => ({
                id: `c-${index}`,
                front: c.front,
                back: c.back
            }));

            setCards(formattedCards);
            setCurrentIndex(0);
            setCompleted(false);
        } catch (error) {
            console.error("Failed to generate cards:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleNext = (difficulty: 'easy' | 'medium' | 'hard') => {
        // Here we would send the difficulty rating to the backend for spaced repetition scheduling
        console.log(`Card ${cards[currentIndex].id} rated as ${difficulty}`);

        if (currentIndex < cards.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            setCompleted(true);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-4" />
                <p className="text-gray-500">Creating flashcards...</p>
            </div>
        );
    }

    if (cards.length === 0) {
        return (
            <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200 transition-colors duration-300">
                <Layers className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Master this topic</h3>
                <p className="text-gray-500 mb-6">Generate flashcards to memorize key concepts.</p>
                <button
                    onClick={generateCards}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors duration-300"
                >
                    Create Flashcards
                </button>
            </div>
        );
    }

    if (completed) {
        return (
            <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
                    <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Session Complete!</h2>
                <p className="text-gray-600 mb-8">
                    You've reviewed all {cards.length} cards. Come back later for your next spaced repetition session.
                </p>
                <button
                    onClick={() => { setCards([]); setCompleted(false); }}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors duration-300"
                >
                    Back to Source
                </button>
            </div>
        );
    }

    return (
        <div className="py-8">
            <div className="mb-8 text-center text-sm text-gray-500">
                Card {currentIndex + 1} of {cards.length}
            </div>
            <FlashcardDeck
                card={cards[currentIndex]}
                onNext={handleNext}
            />
        </div>
    );
}
