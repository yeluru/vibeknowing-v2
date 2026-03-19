"use client";

import { useState, useEffect } from "react";
import { Send, Loader2, Sparkles, BookOpen } from "lucide-react";
import { API_BASE } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { v4 as uuidv4 } from "uuid";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

export default function GlobalChatPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const suggestions = [
        "Summarize the key ideas across all my documents",
        "What common themes appear across my content?",
        "Compare the perspectives from different sources",
        "What are the most actionable takeaways from everything I've uploaded?"
    ];

    useEffect(() => {
        loadHistory();
    }, []);



    const loadHistory = async () => {
        try {
            const token = localStorage.getItem("token");
            const headers: Record<string, string> = {};
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const response = await fetch(`${API_BASE}/ai/chat/history-global`, { headers });
            if (response.ok) {
                const history = await response.json();
                setMessages(history.map((msg: any) => ({
                    id: uuidv4(),
                    role: msg.role,
                    content: msg.content,
                    timestamp: msg.created_at ? new Date(msg.created_at) : new Date()
                })));
            }
        } catch (error) {
            console.error("Failed to load global chat history:", error);
        }
    };

    const buildHeaders = (): Record<string, string> => {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        const token = localStorage.getItem("token");
        if (token) headers["Authorization"] = `Bearer ${token}`;

        try {
            const keys = JSON.parse(localStorage.getItem("vk_provider_keys") || "{}");
            const prefs = JSON.parse(localStorage.getItem("vk_ai_prefs") || "{}");
            if (keys.openai) headers["X-OpenAI-Key"] = keys.openai;
            if (keys.anthropic) headers["X-Anthropic-Key"] = keys.anthropic;
            if (keys.google) headers["X-Google-Key"] = keys.google;
            if (prefs.defaultProvider) headers["X-AI-Provider"] = prefs.defaultProvider;
            if (prefs.taskModels && Object.keys(prefs.taskModels).length > 0) {
                headers["X-AI-Task-Models"] = JSON.stringify(prefs.taskModels);
            }
        } catch (e) { /* localStorage unavailable */ }

        return headers;
    };

    const handleSend = async (content?: string) => {
        const text = content || input.trim();
        if (!text || isLoading) return;

        const userMessage: Message = {
            id: uuidv4(),
            role: "user",
            content: text,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE}/ai/chat`, {
                method: "POST",
                headers: buildHeaders(),
                body: JSON.stringify({
                    message: text,
                    source_id: null,
                    scope: "all",
                    history: messages.slice(-10).map(m => ({ role: m.role, content: m.content }))
                }),
            });

            if (!response.ok) throw new Error("Failed to send message");
            if (!response.body) throw new Error("No response body");

            const aiMessageId = uuidv4();
            setMessages((prev) => [...prev, {
                id: aiMessageId,
                role: "assistant",
                content: "",
                timestamp: new Date(),
            }]);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let aiContent = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                aiContent += chunk;
                setMessages((prev) =>
                    prev.map(m => m.id === aiMessageId ? { ...m, content: aiContent } : m)
                );
            }
        } catch (error) {
            console.error("Chat error:", error);
            setMessages((prev) => [...prev, {
                id: uuidv4(),
                role: "assistant",
                content: "Sorry, I encountered an error. Please make sure you have documents uploaded and try again.",
                timestamp: new Date(),
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="h-full flex flex-col gap-4">

            {/* ── Chat panel (same card style as workspace header) ── */}
            <div className="flex-1 flex flex-col bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-sm overflow-hidden relative">

                {/* Decorative blurs matching other panels */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-400/[0.04] rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-400/[0.04] rounded-full blur-3xl pointer-events-none"></div>

                {/* Title bar */}
                <div className="flex-none flex items-center gap-3 px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800/80 relative z-10">
                    <div className="p-2.5 bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 rounded-2xl shadow-md">
                        <BookOpen className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Knowledge Base Chat</h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Ask anything across all your uploaded documents</p>
                    </div>
                </div>

                {/* Input area — at the top */}
                <div className="flex-none border-b border-slate-100 dark:border-slate-800/80 px-6 py-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm relative z-10">
                    <div className="max-w-3xl mx-auto">
                        <div className="relative flex items-end bg-white/80 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-300 dark:focus-within:border-indigo-700 transition-all">
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask anything across all your documents…"
                                rows={1}
                                className="flex-1 resize-none bg-transparent px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none min-h-[44px] max-h-[120px]"
                                style={{ height: "auto", overflowY: input.split("\n").length > 3 ? "auto" : "hidden" }}
                            />
                            <button
                                onClick={() => handleSend()}
                                disabled={!input.trim() || isLoading}
                                className="m-1.5 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                {isLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center mt-2">
                            Searches across all your uploaded documents using vector similarity
                        </p>
                    </div>
                </div>

                {/* Messages area — latest first */}
                <div className="flex-1 overflow-y-auto px-6 py-6 relative">
                    <div className="max-w-3xl mx-auto space-y-5">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/30 rounded-2xl flex items-center justify-center mb-5 shadow-sm border border-indigo-200/50 dark:border-indigo-800/40">
                                    <Sparkles className="h-7 w-7 text-indigo-500 dark:text-indigo-400" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1.5">Infinite Knowledge Base</h2>
                                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mb-8 leading-relaxed">
                                    Ask questions across every document you&apos;ve ever uploaded. The AI searches your entire library using vector similarity to find the most relevant context.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                                    {suggestions.map((s, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSend(s)}
                                            className="text-left px-4 py-3 text-sm text-slate-600 dark:text-slate-300 bg-white/60 dark:bg-slate-800/40 backdrop-blur-sm border border-slate-200/70 dark:border-slate-700/60 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 hover:text-indigo-700 dark:hover:text-indigo-300 transition-all duration-200 shadow-sm hover:shadow-md"
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {isLoading && messages[messages.length - 1]?.role === "user" && (
                            <div className="flex justify-start">
                                <div className="bg-white/90 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200/70 dark:border-slate-700/60 rounded-2xl rounded-bl-md px-5 py-4 shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                                        <span className="text-sm text-slate-500 dark:text-slate-400">Searching your knowledge base…</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {(() => {
                            // Group messages into Q&A pairs, then reverse pair order
                            const pairs: Message[][] = [];
                            for (let i = 0; i < messages.length; i++) {
                                if (messages[i].role === "user") {
                                    const pair = [messages[i]];
                                    if (i + 1 < messages.length && messages[i + 1].role === "assistant") {
                                        pair.push(messages[i + 1]);
                                        i++; // skip the assistant message
                                    }
                                    pairs.push(pair);
                                } else {
                                    // orphan assistant message
                                    pairs.push([messages[i]]);
                                }
                            }
                            return [...pairs].reverse().map((pair, pairIdx) => (
                                <div key={pairIdx} className="space-y-3">
                                    {/* Timestamp label */}
                                    <div className="flex justify-center">
                                        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 bg-slate-100/80 dark:bg-slate-800/50 px-3 py-1 rounded-full">
                                            {pair[0].timestamp.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}{' · '}
                                            {pair[0].timestamp.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    {pair.map((message) => (
                                        <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                                            <div className={`max-w-[85%] ${
                                                message.role === "user"
                                                    ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-900 dark:text-emerald-100 border border-emerald-200/70 dark:border-emerald-800/50 rounded-2xl rounded-br-md px-5 py-3 shadow-sm"
                                                    : "bg-white/90 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200/70 dark:border-slate-700/60 rounded-2xl rounded-bl-md px-5 py-4 shadow-sm"
                                            }`}>
                                                {message.role === "assistant" ? (
                                                    <div className="prose prose-sm prose-slate dark:prose-invert max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:mt-1 [&>ol]:mt-1">
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                            {message.content || "..."}
                                                        </ReactMarkdown>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ));
                        })()}
                    </div>
                </div>
            </div>
        </div>
    );
}
