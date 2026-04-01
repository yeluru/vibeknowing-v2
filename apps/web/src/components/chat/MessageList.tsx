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
                <div className="mb-4 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-[#383e59] p-4 shadow-sm">
                    <Bot className="h-8 w-8 text-indigo-500" />
                </div>
                <h3 className="mb-2 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Ask anything!</h3>
                <p className="max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">
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
                                ? "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
                                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-[#383e59] text-slate-600 dark:text-slate-400"
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
                                ? "bg-emerald-100 dark:bg-emerald-900/25 text-emerald-900 dark:text-emerald-100 rounded-tr-sm"
                                : "bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-[#383e59] text-slate-900 dark:text-slate-100 rounded-tl-sm"
                        )}
                    >
                        {message.role === "user" ? (
                            <p className="whitespace-pre-wrap tracking-wide font-medium">{message.content}</p>
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
