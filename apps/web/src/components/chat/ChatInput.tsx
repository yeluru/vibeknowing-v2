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

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [input]);

    return (
        <div className="border-t border-slate-200/70 dark:border-slate-800 bg-white/70 dark:bg-slate-900/55 backdrop-blur-xl p-4 transition-colors duration-300">
            {suggestions.length > 0 && (
                <div className="mb-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {suggestions.map((suggestion, i) => (
                        <button
                            key={i}
                            onClick={() => onSend(suggestion)}
                            disabled={disabled}
                            className="vk-pill px-3 py-1.5 text-sm text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 bg-purple-50/70 dark:bg-purple-900/20 hover:bg-purple-100/80 disabled:opacity-50 transition-colors"
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            {suggestion}
                        </button>
                    ))}
                </div>
            )}

            <form onSubmit={handleSubmit} className="relative flex items-end gap-2">
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a question about this content..."
                    disabled={disabled}
                    className="vk-input max-h-32 min-h-[44px] w-full resize-none rounded-xl px-4 py-3 pr-12 text-sm placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                    rows={1}
                    aria-label="Chat message"
                />
                <button
                    type="submit"
                    disabled={!input.trim() || disabled}
                    className="vk-btn vk-btn-primary absolute bottom-1.5 right-1.5 rounded-lg p-2 transition-colors disabled:bg-gray-300"
                    aria-label="Send message"
                >
                    <Send className="h-4 w-4" />
                </button>
            </form>
            <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                Press <span className="vk-kbd">Enter</span> to send, <span className="vk-kbd">Shift</span> + <span className="vk-kbd">Enter</span> for a new line.
            </div>
        </div>
    );
}
