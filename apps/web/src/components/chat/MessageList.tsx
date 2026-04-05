"use client";

import { useEffect, useRef } from "react";
import { Bot, User, Sparkles } from "lucide-react";
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
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                <div className="relative mb-6">
                    <div className="absolute inset-0 bg-emerald-500/10 dark:bg-emerald-400/10 blur-3xl rounded-full scale-150" />
                    <div className="relative h-20 w-20 rounded-3xl glass-card flex items-center justify-center shadow-2xl group transition-all duration-500 hover:rotate-3 hover:scale-105 cursor-default">
                        <Bot className="h-10 w-10 text-emerald-600 dark:text-emerald-400 transition-transform group-hover:scale-110" />
                        <div className="status-dot-live absolute -top-1 -right-1" />
                    </div>
                </div>
                <h3 className="mb-2 text-2xl font-mono font-black tracking-tight text-slate-900 dark:text-white">Ask anything!</h3>
                <p className="max-w-xs text-[11px] leading-relaxed text-slate-500 dark:text-slate-500 font-bold uppercase tracking-widest">
                    Your private intelligence layer.
                </p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {messages.map((message) => (
                <div
                    key={message.id}
                    className={cn(
                        "flex gap-3",
                        message.role === "user" ? "flex-row-reverse" : "flex-row"
                    )}
                >
                    {/* Avatar */}
                    <div
                        className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border shadow-sm transition-all duration-300",
                            message.role === "user"
                                ? "bg-gradient-to-br from-emerald-500 to-indigo-600 border-emerald-400/30 text-white shadow-emerald-500/20"
                                : "glass-card border-slate-200/50 dark:border-white/[0.08] text-emerald-600 dark:text-emerald-400"
                        )}
                    >
                        {message.role === "user" ? (
                            <User className="h-4 w-4" />
                        ) : (
                            <div className="relative">
                                <Bot className="h-4 w-4" />
                                <div className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 bg-emerald-400 rounded-full shadow-[0_0_4px_rgba(34,197,94,0.8)]" />
                            </div>
                        )}
                    </div>

                    {/* Bubble */}
                    <div
                        className={cn(
                            "max-w-[85%] rounded-2xl px-5 py-3.5 text-[15px] leading-relaxed relative overflow-hidden transition-all duration-300",
                            message.role === "user"
                                ? "bg-gradient-to-br from-emerald-500/90 to-indigo-600/90 dark:from-emerald-500/80 dark:to-indigo-600/80 text-white rounded-tr-sm border border-emerald-400/20 shadow-lg shadow-emerald-500/10 dark:shadow-emerald-500/5"
                                : "glass-card text-slate-800 dark:text-slate-100 rounded-tl-sm shadow-lg"
                        )}
                    >
                        {message.role === "user" ? (
                            <p className="whitespace-pre-wrap tracking-tight font-medium">{message.content}</p>
                        ) : (
                            <div className="prose prose-sm dark:prose-invert max-w-none
                                            prose-p:leading-relaxed
                                            prose-p:text-slate-800 dark:prose-p:text-slate-200
                                            prose-pre:bg-slate-50 dark:prose-pre:bg-[#0a0f1e]
                                            prose-pre:border prose-pre:border-slate-200 dark:prose-pre:border-white/[0.08]
                                            prose-code:text-emerald-700 dark:prose-code:text-emerald-400
                                            prose-headings:font-mono prose-headings:font-bold prose-headings:tracking-tight
                                            citation-content">
                                <ReactMarkdown
                                    components={{
                                        p: ({ children }) => {
                                            const processPart = (part: any) => {
                                                if (typeof part === 'string') {
                                                    const subParts = part.split(/(\[\d+\])/g);
                                                    return subParts.map((sub, i) => {
                                                        const match = sub.match(/\[(\d+)\]/);
                                                        if (match) {
                                                            return (
                                                                <span
                                                                    key={i}
                                                                    className="inline-flex items-center justify-center bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px] font-black min-w-4 h-4 rounded-sm mx-0.5 cursor-help hover:bg-emerald-200 dark:hover:bg-emerald-500/25 transition-colors shadow-sm align-top mt-0.5"
                                                                    title={`Source Fragment ${match[1]}`}
                                                                >
                                                                    {match[1]}
                                                                </span>
                                                            );
                                                        }
                                                        return sub;
                                                    });
                                                }
                                                return part;
                                            };
                                            const processed = Array.isArray(children)
                                                ? children.map(processPart)
                                                : processPart(children);
                                            return <p>{processed}</p>;
                                        }
                                    }}
                                >
                                    {message.content}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>
                </div>
            ))}

            {isLoading && (
                <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full glass-card border-slate-200 dark:border-white/[0.08] text-emerald-600 dark:text-emerald-400 shadow-sm">
                        <Bot className="h-4 w-4" />
                    </div>
                    <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm glass-card px-5 py-4 shadow-sm">
                        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400 dark:bg-emerald-500 [animation-delay:-0.3s]" />
                        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400/70 dark:bg-emerald-500/70 [animation-delay:-0.15s]" />
                        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400/40 dark:bg-emerald-500/40" />
                    </div>
                </div>
            )}

            <div ref={bottomRef} />
        </div>
    );
}
