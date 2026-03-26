"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles } from "lucide-react";

interface ChatInputProps {
    onSend: (message: string) => void;
    disabled?: boolean;
    suggestions?: string[];
}

export function ChatInput({ onSend, disabled, suggestions = [] }: ChatInputProps) {
    const [input, setInput] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (input.trim() && !disabled) {
            onSend(input.trim());
            setInput("");
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [input]);

    return (
        <div className="border-t border-slate-200/70 dark:border-slate-800 bg-white/70 dark:bg-slate-900/55 backdrop-blur-xl p-3 sm:p-4 transition-colors duration-300">

            {suggestions.length > 0 && (
                <>
                    {/* Mobile: first 2 chips only, stacked */}
                    <div className="mb-3 flex flex-col gap-1.5 sm:hidden">
                        {suggestions.slice(0, 2).map((suggestion, i) => (
                            <button
                                key={i}
                                onClick={() => onSend(suggestion)}
                                disabled={disabled}
                                className="flex items-center gap-1.5 w-full px-3 py-2 rounded-lg text-xs font-medium text-left
                                           text-slate-700 dark:text-slate-300
                                           border border-slate-200 dark:border-slate-700
                                           bg-slate-50 dark:bg-slate-800/60
                                           hover:bg-indigo-50 dark:hover:bg-indigo-900/20
                                           hover:border-indigo-200 dark:hover:border-indigo-800
                                           hover:text-indigo-700 dark:hover:text-indigo-300
                                           disabled:opacity-50 transition-colors"
                            >
                                <Sparkles className="h-3 w-3 flex-shrink-0 text-indigo-400" />
                                <span>{suggestion}</span>
                            </button>
                        ))}
                    </div>

                    {/* Desktop: 2×2 grid, fills full width */}
                    <div className="mb-3 hidden sm:grid grid-cols-2 gap-2">
                        {suggestions.map((suggestion, i) => (
                            <button
                                key={i}
                                onClick={() => onSend(suggestion)}
                                disabled={disabled}
                                className="flex items-start gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-left
                                           text-slate-700 dark:text-slate-300
                                           border border-slate-200 dark:border-slate-700
                                           bg-slate-50 dark:bg-slate-800/60
                                           hover:bg-indigo-50 dark:hover:bg-indigo-900/20
                                           hover:border-indigo-200 dark:hover:border-indigo-800
                                           hover:text-indigo-700 dark:hover:text-indigo-300
                                           disabled:opacity-50 transition-colors"
                            >
                                <Sparkles className="h-3 w-3 flex-shrink-0 text-indigo-400 mt-0.5" />
                                <span>{suggestion}</span>
                            </button>
                        ))}
                    </div>
                </>
            )}

            <form onSubmit={handleSubmit} className="relative flex items-end gap-2">
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a question about this content..."
                    disabled={disabled}
                    className="max-h-32 min-h-[44px] w-full resize-none rounded-xl px-4 py-3 pr-12 text-sm
                               bg-white dark:bg-slate-800/80
                               border border-slate-200 dark:border-slate-700
                               text-slate-900 dark:text-slate-100
                               placeholder-slate-400 dark:placeholder-slate-500
                               focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-500
                               disabled:opacity-50 transition-colors"
                    rows={1}
                    aria-label="Chat message"
                />
                <button
                    type="submit"
                    disabled={!input.trim() || disabled}
                    className="absolute bottom-1.5 right-1.5 rounded-lg p-2
                               bg-indigo-600 dark:bg-indigo-500 text-white
                               hover:bg-indigo-700 dark:hover:bg-indigo-400
                               disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    aria-label="Send message"
                >
                    <Send className="h-4 w-4" />
                </button>
            </form>

            <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                Press <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-[10px]">Enter</kbd> to send,{" "}
                <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-[10px]">Shift</kbd>{" "}+{" "}
                <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-[10px]">Enter</kbd> for a new line.
            </div>
        </div>
    );
}