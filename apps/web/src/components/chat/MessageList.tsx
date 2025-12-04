"use client";

import { useEffect, useRef } from "react";
import { Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

export interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

interface MessageListProps {
    messages: Message[];
    isLoading?: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    if (messages.length === 0) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-gray-500 dark:text-slate-400">
                <div className="mb-4 rounded-full bg-purple-100 p-4">
                    <Bot className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Ask anything!</h3>
                <p className="max-w-sm text-sm">
                    I can answer questions about this content, summarize key points, or help you understand complex topics.
                </p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {messages.map((message) => (
                <div
                    key={message.id}
                    className={cn(
                        "flex gap-3",
                        message.role === "user" ? "flex-row-reverse" : "flex-row"
                    )}
                >
                    <div
                        className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                            message.role === "user"
                                ? "bg-purple-100 border-purple-200 text-purple-700"
                                : "bg-white border-gray-200 text-gray-600"
                        )}
                    >
                        {message.role === "user" ? (
                            <User className="h-5 w-5" />
                        ) : (
                            <Bot className="h-5 w-5" />
                        )}
                    </div>

                    <div
                        className={cn(
                            "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
                            message.role === "user"
                                ? "bg-purple-600 text-white"
                                : "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white shadow-sm"
                        )}
                    >
                        {message.role === "user" ? (
                            <p className="whitespace-pre-wrap">{message.content}</p>
                        ) : (
                            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:text-gray-900 dark:prose-p:text-white prose-pre:bg-gray-50 dark:prose-pre:bg-slate-700 prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-slate-700 prose-code:text-gray-900 dark:prose-code:text-white">
                                <ReactMarkdown>{message.content}</ReactMarkdown>
                            </div>
                        )}
                    </div>
                </div>
            ))}

            {isLoading && (
                <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300">
                        <Bot className="h-5 w-5" />
                    </div>
                    <div className="flex items-center gap-1 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 shadow-sm">
                        <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
                        <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
                        <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                    </div>
                </div>
            )}

            <div ref={bottomRef} />
        </div>
    );
}
