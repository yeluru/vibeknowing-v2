"use client";

import { useState, useEffect } from "react";
import { Loader2, Trophy, RefreshCw, ArrowRight } from "lucide-react";
import { QuestionCard } from "./QuestionCard";

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
                const response = await fetch(`http://localhost:8000/ai/quiz/${sourceId}`);
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
            const response = await fetch(`http://localhost:8000/ai/quiz/${sourceId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
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
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600 dark:text-purple-400 mb-4" />
                <p className="text-gray-500 dark:text-slate-400">Generating quiz from content...</p>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="text-center py-16 bg-gray-50 dark:bg-slate-700 rounded-xl border border-dashed border-gray-200 dark:border-slate-700 transition-colors duration-300">
                <Trophy className="h-12 w-12 mx-auto mb-3 text-gray-400 dark:text-slate-500" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Ready to test your knowledge?</h3>
                <p className="text-gray-700 dark:text-slate-300 mb-6">Generate a quiz based on this content to reinforce your learning.</p>
                <button
                    onClick={generateQuiz}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors duration-300"
                >
                    Generate Quiz
                </button>
            </div>
        );
    }

    if (quizCompleted) {
        return (
            <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 rounded-full mb-6">
                    <Trophy className="h-10 w-10 text-yellow-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Quiz Completed!</h2>
                <p className="text-gray-900 dark:text-white mb-8">
                    You scored <span className="font-bold text-purple-600 dark:text-purple-400">{score}</span> out of <span className="font-bold text-gray-900 dark:text-white">{questions.length}</span>
                </p>
                <button
                    onClick={generateQuiz}
                    className="flex items-center mx-auto px-6 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 font-medium transition-colors duration-300"
                >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Another Quiz
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm transition-colors duration-300">
            <div className="border-b border-gray-200 dark:border-slate-700 px-6 py-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
            </div>
            <div className="p-6">
                <div className="mb-6 flex items-center justify-between text-sm text-gray-500 dark:text-slate-400">
                    <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                    <span>Score: {score}</span>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm mb-6 transition-colors duration-300">
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
                            className="flex items-center px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors duration-300"
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
