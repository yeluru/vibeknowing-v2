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
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{question.question}</h3>

            <div className="space-y-4">
                {question.options.map((option, index) => {
                    const isSelected = selectedAnswer === index;
                    const isCorrect = question.correctAnswer === index;

                    let buttonStyle = "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-purple-200 dark:hover:border-purple-600 text-gray-900 dark:text-white";
                    let icon = null;

                    if (showFeedback) {
                        if (isCorrect) {
                            buttonStyle = "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 text-green-800 dark:text-green-200";
                            icon = <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />;
                        } else if (isSelected && !isCorrect) {
                            buttonStyle = "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-800 dark:text-red-200";
                            icon = <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
                        } else {
                            buttonStyle = "opacity-50 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white";
                        }
                    } else if (isSelected) {
                        buttonStyle = "bg-purple-50 dark:bg-purple-900/30 border-purple-500 dark:border-purple-600 text-purple-900 dark:text-purple-200 ring-1 ring-purple-500 dark:ring-purple-600";
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
                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/30 p-4 text-sm text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700">
                    <p className="font-semibold mb-1 text-blue-900 dark:text-blue-100">Explanation:</p>
                    <p className="text-blue-800 dark:text-blue-200">{question.explanation}</p>
                </div>
            )}
        </div>
    );
}
