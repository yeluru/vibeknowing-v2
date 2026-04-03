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
                    <div className="absolute inset-0 bg-indigo-500/20 dark:bg-indigo-400/20 blur-3xl rounded-full scale-150" />
                    <div className="relative h-20 w-20 rounded-3xl bg-white dark:bg-[#1a1e2b] glass-panel flex items-center justify-center shadow-2xl border-white/40 dark:border-white/10 group transition-all duration-500 hover:rotate-6">
                        <Bot className="h-10 w-10 text-indigo-500 transition-transform group-hover:scale-110" />
                        <Sparkles className="absolute -top-1 -right-1 h-6 w-6 text-amber-400 animate-pulse" />
                    </div>
                </div>
                <h3 className="mb-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Ask anything!</h3>
                <p className="max-w-xs text-sm leading-relaxed text-slate-500 dark:text-slate-400 font-bold opacity-80 uppercase tracking-widest text-[11px]">
                    Your private intelligence layer.
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
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border shadow-sm transition-all duration-300",
                            message.role === "user"
                                ? "bg-indigo-600 dark:bg-indigo-500 border-indigo-400/50 text-white shadow-indigo-500/20"
                                : "glass-panel dark:bg-zinc-800/80 border-slate-200 dark:border-white/10 text-indigo-600 dark:text-indigo-300"
                        )}
                    >
                        {message.role === "user" ? (
                            <User className="h-4 w-4" />
                        ) : (
                            <div className="relative">
                                <Bot className="h-4 w-4" />
                                <div className="absolute -top-1 -right-1 h-1.5 w-1.5 bg-amber-400 rounded-full animate-pulse shadow-[0_0_5px_rgba(251,191,36,0.8)]" />
                            </div>
                        )}
                    </div>

                    <div
                        className={cn(
                            "max-w-[85%] rounded-2xl px-6 py-4 text-[15px] shadow-lg leading-relaxed relative overflow-hidden transition-all duration-500",
                            message.role === "user"
                                ? "bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-tr-sm border border-indigo-400/30"
                                : "glass-panel dark:bg-[#1a1c25]/80 text-slate-900 dark:text-slate-100 rounded-tl-sm border border-slate-200/50 dark:border-white/5"
                        )}
                    >
                        {message.role === "assistant" && (
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl pointer-events-none" />
                        )}
                        {message.role === "user" ? (
                            <p className="whitespace-pre-wrap tracking-tight font-semibold">{message.content}</p>
                        ) : (
                            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:text-slate-800 dark:prose-p:text-slate-200 prose-pre:bg-slate-50 dark:prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-200 dark:prose-pre:border-slate-700 prose-code:text-slate-900 dark:prose-code:text-slate-200 prose-headings:font-bold prose-headings:tracking-tight citation-content">
                                <ReactMarkdown
                                    components={{
                                        // Custom component to handle text and find [1], [2] patterns
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
                                                                    className="inline-flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-black min-w-4 h-4 rounded-sm mx-0.5 cursor-help hover:bg-indigo-300 dark:hover:bg-indigo-700/60 transition-colors shadow-sm align-top mt-0.5"
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
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 dark:border-[#383e59] bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 shadow-sm">
                        <Bot className="h-5 w-5" />
                    </div>
                    <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-slate-200 dark:border-[#383e59] bg-white dark:bg-slate-800/80 px-4 py-4 shadow-sm">
                        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 dark:bg-slate-500 [animation-delay:-0.3s]" />
                        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 dark:bg-slate-500 [animation-delay:-0.15s]" />
                        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 dark:bg-slate-500" />
                    </div>
                </div>
            )}

            <div ref={bottomRef} />
        </div>
    );
}
