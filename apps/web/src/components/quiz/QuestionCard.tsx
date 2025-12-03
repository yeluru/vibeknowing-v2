"use client";

import { CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Question {
    id: string;
    question: string;
    options: string[];
    correctAnswer: number; // Index of correct answer
    explanation?: string;
}

interface QuestionCardProps {
    question: Question;
    selectedAnswer: number | null;
    onSelectAnswer: (index: number) => void;
    showFeedback: boolean;
}

export function QuestionCard({
    question,
    selectedAnswer,
    onSelectAnswer,
    showFeedback,
}: QuestionCardProps) {
    return (
        <div className="space-y-6">
            <h3 className="text-2xl font-bold text-gray-900 leading-tight">{question.question}</h3>

            <div className="space-y-4">
                {question.options.map((option, index) => {
                    const isSelected = selectedAnswer === index;
                    const isCorrect = question.correctAnswer === index;

                    let buttonStyle = "border-gray-200 hover:bg-gray-50 hover:border-purple-200";
                    let icon = null;

                    if (showFeedback) {
                        if (isCorrect) {
                            buttonStyle = "bg-green-50 border-green-200 text-green-800";
                            icon = <CheckCircle className="h-5 w-5 text-green-600" />;
                        } else if (isSelected && !isCorrect) {
                            buttonStyle = "bg-red-50 border-red-200 text-red-800";
                            icon = <XCircle className="h-5 w-5 text-red-600" />;
                        } else {
                            buttonStyle = "opacity-50 border-gray-200";
                        }
                    } else if (isSelected) {
                        buttonStyle = "bg-purple-50 border-purple-500 text-purple-900 ring-1 ring-purple-500";
                    }

                    return (
                        <button
                            key={index}
                            onClick={() => !showFeedback && onSelectAnswer(index)}
                            disabled={showFeedback}
                            className={cn(
                                "flex w-full items-center justify-between rounded-xl border p-5 text-left transition-all hover:shadow-md",
                                buttonStyle
                            )}
                        >
                            <span className="font-medium text-lg">{option}</span>
                            {icon}
                        </button>
                    );
                })}
            </div>

            {showFeedback && question.explanation && (
                <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
                    <p className="font-semibold mb-1">Explanation:</p>
                    {question.explanation}
                </div>
            )}
        </div>
    );
}
