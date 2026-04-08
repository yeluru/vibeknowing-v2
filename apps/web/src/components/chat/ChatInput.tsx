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
        <div className="border-t border-slate-200/50 dark:border-white/[0.05]
                        bg-white/60 dark:bg-[var(--background)/70]
                        backdrop-blur-2xl p-3 sm:p-5 transition-colors duration-300">

            {suggestions.length > 0 && (
                <>
                    {/* Mobile: first 2 chips */}
                    <div className="mb-3 flex flex-col gap-1.5 sm:hidden">
                        {suggestions.slice(0, 2).map((suggestion, i) => (
                            <button
                                key={i}
                                onClick={() => onSend(suggestion)}
                                disabled={disabled}
                                className="flex items-center gap-1.5 w-full px-3 py-2 rounded-xl text-xs font-medium text-left
                                           text-slate-700 dark:text-slate-300
                                           border border-slate-200 dark:border-white/[0.06]
                                           bg-slate-50 dark:bg-white/[0.03]
                                           hover:bg-emerald-50 dark:hover:bg-emerald-500/8
                                           hover:border-emerald-200 dark:hover:border-emerald-500/20
                                           hover:text-emerald-700 dark:hover:text-emerald-400
                                           disabled:opacity-50 transition-all duration-200 cursor-pointer"
                            >
                                <Sparkles className="h-3 w-3 flex-shrink-0 text-emerald-500" />
                                <span>{suggestion}</span>
                            </button>
                        ))}
                    </div>

                    {/* Desktop: 2×2 grid */}
                    <div className="mb-3 hidden sm:grid grid-cols-2 gap-2">
                        {suggestions.map((suggestion, i) => (
                            <button
                                key={i}
                                onClick={() => onSend(suggestion)}
                                disabled={disabled}
                                className="flex items-start gap-2 px-4 py-2.5 rounded-xl text-xs font-medium text-left
                                           text-slate-600 dark:text-slate-300
                                           border border-slate-100 dark:border-white/[0.06]
                                           bg-slate-50/80 dark:bg-white/[0.03] backdrop-blur-sm
                                           hover:bg-emerald-50 dark:hover:bg-emerald-500/8
                                           hover:border-emerald-200 dark:hover:border-emerald-500/20
                                           hover:text-emerald-700 dark:hover:text-emerald-400
                                           disabled:opacity-50 transition-all duration-200 shadow-sm cursor-pointer"
                            >
                                <Sparkles className="h-3 w-3 flex-shrink-0 text-emerald-500 mt-0.5" />
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
                    placeholder="Curious about something? Ask away..."
                    disabled={disabled}
                    className="max-h-32 min-h-[48px] w-full resize-none rounded-2xl px-4 py-3 pr-14 text-sm
                               bg-white/80 dark:bg-white/[0.04]
                               border border-slate-200 dark:border-white/[0.08]
                               text-slate-900 dark:text-slate-100
                               placeholder-slate-400 dark:placeholder-slate-600
                               focus:outline-none focus:ring-2 focus:ring-emerald-400/50 dark:focus:ring-emerald-500/40
                               focus:border-emerald-300 dark:focus:border-emerald-500/30
                               backdrop-blur-sm
                               disabled:opacity-50 transition-all duration-200"
                    rows={1}
                    aria-label="Chat message"
                />
                <button
                    type="submit"
                    disabled={!input.trim() || disabled}
                    className="absolute bottom-2 right-2 rounded-xl p-2.5
                               bg-emerald-600 dark:bg-emerald-500 text-white
                               hover:bg-emerald-700 dark:hover:bg-emerald-400
                               disabled:opacity-30 disabled:cursor-not-allowed
                               transition-all shadow-lg shadow-emerald-500/20
                               cursor-pointer"
                    aria-label="Send message"
                >
                    <Send className="h-4 w-4" />
                </button>
            </form>

            <div className="mt-2 text-[10px] text-slate-400 dark:text-slate-600">
                <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/[0.04] rounded border border-slate-200 dark:border-white/[0.06] text-[10px]">Enter</kbd> to send &nbsp;·&nbsp;
                <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/[0.04] rounded border border-slate-200 dark:border-white/[0.06] text-[10px]">Shift+Enter</kbd> for new line
            </div>
        </div>
    );
}
