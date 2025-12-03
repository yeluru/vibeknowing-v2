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
        <div className="border-t border-gray-200 bg-white p-4">
            {suggestions.length > 0 && (
                <div className="mb-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {suggestions.map((suggestion, i) => (
                        <button
                            key={i}
                            onClick={() => onSend(suggestion)}
                            disabled={disabled}
                            className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-sm text-purple-700 hover:bg-purple-100 disabled:opacity-50"
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
                    className="max-h-32 min-h-[44px] w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-12 text-sm focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                    rows={1}
                />
                <button
                    type="submit"
                    disabled={!input.trim() || disabled}
                    className="absolute bottom-1.5 right-1.5 rounded-lg bg-purple-600 p-2 text-white transition-colors hover:bg-purple-700 disabled:bg-gray-300"
                >
                    <Send className="h-4 w-4" />
                </button>
            </form>
        </div>
    );
}
