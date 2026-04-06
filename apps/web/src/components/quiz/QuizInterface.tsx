"use client";

import { useState, useEffect } from "react";
import { Loader2, Trophy, RefreshCw, ArrowRight, Flame } from "lucide-react";
import { API_BASE, buildAIHeaders } from "@/lib/api";
import { QuestionCard } from "./QuestionCard";
import { recordQuizComplete, getStats } from "@/lib/learnStats";

interface Question {
    id: string;
    question: string;
    options: string[];
    correctAnswer: number;
    explanation?: string;
}

interface QuizInterfaceProps {
    sourceId: string;
    title?: string;
}

export function QuizInterface({ sourceId, title = "Quiz" }: QuizInterfaceProps) {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [showFeedback, setShowFeedback] = useState(false);
    const [score, setScore] = useState(0);
    const [quizCompleted, setQuizCompleted] = useState(false);

    // Load existing quiz on mount
    useEffect(() => {
        const loadExistingQuiz = async () => {
            try {
                const response = await fetch(`${API_BASE}/ai/quiz/${sourceId}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.questions && data.questions.length > 0) {
                        const formattedQuestions: Question[] = data.questions.map((q: any, index: number) => ({
                            id: `q-${index}`,
                            question: q.question,
                            options: q.options,
                            correctAnswer: q.correctAnswer,
                            explanation: q.explanation
                        }));
                        setQuestions(formattedQuestions);
                    }
                }
            } catch (error) {
                console.error("Failed to load existing quiz:", error);
            }
        };
        loadExistingQuiz();
    }, [sourceId]);

    const generateQuiz = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/ai/quiz/${sourceId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...buildAIHeaders() }
            });

            if (!response.ok) throw new Error('Failed to generate quiz');

            const data = await response.json();

            // Map the API response to our internal Question format if needed
            // The API returns { questions: [...] }
            const apiQuestions = data.questions || [];

            const formattedQuestions: Question[] = apiQuestions.map((q: any, index: number) => ({
                id: `q-${index}`,
                question: q.question,
                options: q.options,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation
            }));

            setQuestions(formattedQuestions);


            setCurrentQuestionIndex(0);
            setScore(0);
            setQuizCompleted(false);
            setSelectedAnswer(null);
            setShowFeedback(false);
        } catch (error) {
            console.error("Failed to generate quiz:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerSelect = (index: number) => {
        setSelectedAnswer(index);
        setShowFeedback(true);

        if (index === questions[currentQuestionIndex].correctAnswer) {
            setScore(prev => prev + 1);
        }
    };

    const handleNextQuestion = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedAnswer(null);
            setShowFeedback(false);
        } else {
            setQuizCompleted(true);
            recordQuizComplete();
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400 mb-4" />
                <p className="text-gray-500 dark:text-slate-400">Generating quiz from content...</p>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="text-center py-16 bg-gray-50 dark:bg-slate-700 rounded-xl border border-dashed border-slate-200/30 dark:border-[#383e59]/40 transition-colors duration-300">
                <Trophy className="h-12 w-12 mx-auto mb-3 text-gray-400 dark:text-slate-500" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Ready to test your knowledge?</h3>
                <p className="text-gray-700 dark:text-slate-300 mb-6">Generate a quiz based on this content to reinforce your learning.</p>
                <button
                    onClick={generateQuiz}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors duration-300"
                >
                    Generate Quiz
                </button>
            </div>
        );
    }

    if (quizCompleted) {
        const pct = Math.round((score / questions.length) * 100);
        const grade = pct >= 90 ? { label: "Excellent", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-500/15" }
                    : pct >= 70 ? { label: "Good", color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-100 dark:bg-indigo-500/15" }
                    : pct >= 50 ? { label: "Keep going", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-500/15" }
                    : { label: "Keep practicing", color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-500/15" };
        const currentStats = getStats();
        return (
            <div className="text-center py-10">
                <div className={`inline-flex items-center justify-center w-16 h-16 ${grade.bg} rounded-full mb-4`}>
                    <Trophy className={`h-8 w-8 ${grade.color}`} />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Quiz Complete!</h2>
                <p className={`text-lg font-bold ${grade.color} mb-1`}>{grade.label}</p>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                    {score} / {questions.length} correct &nbsp;·&nbsp; {pct}%
                </p>
                {currentStats.streak > 0 && (
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-3 py-1.5 rounded-full mb-6">
                        <Flame className="h-3.5 w-3.5" />
                        {currentStats.streak} day streak · {currentStats.todayQuizzes} quiz{currentStats.todayQuizzes !== 1 ? "zes" : ""} today
                    </div>
                )}
                <button
                    onClick={generateQuiz}
                    className="flex items-center mx-auto gap-2 px-5 py-2 bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-[#252d3d] text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-[#131720] font-medium text-sm transition-colors cursor-pointer"
                >
                    <RefreshCw className="h-4 w-4" />
                    Try Another Quiz
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/30 dark:border-[#383e59]/40 shadow-sm transition-colors duration-300">
            <div className="border-b border-slate-200/30 dark:border-[#383e59]/40 px-4 sm:px-6 py-4">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
            </div>
            <div className="p-4 sm:p-6">
                <div className="mb-4 sm:mb-6 flex items-center justify-between text-sm text-gray-500 dark:text-slate-400">
                    <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                    <span>Score: {score}</span>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/30 dark:border-[#383e59]/40 p-4 sm:p-6 shadow-sm mb-4 sm:mb-6 transition-colors duration-300">
                    <QuestionCard
                        question={questions[currentQuestionIndex]}
                        selectedAnswer={selectedAnswer}
                        onSelectAnswer={handleAnswerSelect}
                        showFeedback={showFeedback}
                    />
                </div>

                {showFeedback && (
                    <div className="flex justify-end">
                        <button
                            onClick={handleNextQuestion}
                            className="flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors duration-300"
                        >
                            {currentQuestionIndex === questions.length - 1 ? "Finish Quiz" : "Next Question"}
                            <ArrowRight className="h-4 w-4 ml-2" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
