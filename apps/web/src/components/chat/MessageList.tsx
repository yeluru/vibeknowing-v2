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
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-slate-500">
                <div className="mb-4 rounded-full bg-slate-50 border border-slate-200 p-4 shadow-sm">
                    <Bot className="h-8 w-8 text-indigo-500" />
                </div>
                <h3 className="mb-2 text-xl font-bold tracking-tight text-slate-900">Ask anything!</h3>
                <p className="max-w-sm text-sm leading-relaxed text-slate-500">
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
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border shadow-sm",
                            message.role === "user"
                                ? "bg-emerald-100 border-emerald-200 text-emerald-700"
                                : "bg-white border-slate-200 text-slate-600"
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
                            "max-w-[80%] rounded-2xl px-5 py-3 text-[15px] shadow-sm leading-relaxed",
                            message.role === "user"
                                ? "bg-emerald-100 text-emerald-900 rounded-tr-sm"
                                : "bg-white border border-slate-200 text-slate-900 rounded-tl-sm"
                        )}
                    >
                        {message.role === "user" ? (
                            <p className="whitespace-pre-wrap tracking-wide font-medium">{message.content}</p>
                        ) : (
                            <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-p:text-slate-800 prose-pre:bg-slate-50 prose-pre:border prose-pre:border-slate-200 prose-code:text-slate-900 prose-headings:font-bold prose-headings:tracking-tight">
                                <ReactMarkdown>{message.content}</ReactMarkdown>
                            </div>
                        )}
                    </div>
                </div>
            ))}

            {isLoading && (
                <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm">
                        <Bot className="h-5 w-5" />
                    </div>
                    <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-4 shadow-sm">
                        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                    </div>
                </div>
            )}

            <div ref={bottomRef} />
        </div>
    );
}
