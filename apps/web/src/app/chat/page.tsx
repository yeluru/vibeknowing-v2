"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Loader2, Sparkles, BookOpen, Compass, MapIcon, ChevronRight, Search, MessageSquare, History } from "lucide-react";
import api, { API_BASE, categoriesApi, buildAIHeaders, Category } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { v4 as uuidv4 } from "uuid";
import { cn } from "@/lib/utils";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    scope?: string;
    pathName?: string;
    metadata?: any[];
}

export default function GlobalChatPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedPathId, setSelectedPathId] = useState<string | null>(null); // null = global
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const suggestions = [
        "Summarize the key ideas across this path",
        "What are the common themes in my content?",
        "Explain the most actionable takeaways here",
        "What am I missing in this learning roadmap?"
    ];

    useEffect(() => {
        loadCategories();
        loadHistory();
    }, [selectedPathId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const loadCategories = async () => {
        try {
            const cats = await categoriesApi.list();
            setCategories(cats);
        } catch (e) { 
            console.error("Failed to load categories for context:", e); 
        }
    };

    const loadHistory = async () => {
        try {
            const headers = buildAIHeaders();
            const url = selectedPathId 
                ? `${API_BASE}/ai/chat/history-path/${selectedPathId}`
                : `${API_BASE}/ai/chat/history-global`;

            // Reset messages before loading new context to prevent layout shift
            setMessages([]);

            const response = await fetch(url, { headers });
            if (response.ok) {
                const history = await response.json();
                if (Array.isArray(history)) {
                    setMessages(history.map((msg: any) => ({
                        id: uuidv4(),
                        role: msg.role,
                        content: msg.content,
                        timestamp: msg.created_at ? new Date(msg.created_at) : new Date(),
                        metadata: msg.metadata // Backend might return metadata for citations too
                    })));
                }
            } else {
                console.error("Chat history fetch failed with status:", response.status);
            }
        } catch (error) {
            console.error("Failed to load chat history:", error);
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
        } catch (e) { }

        return headers;
    };

    const handleSend = async (content?: string) => {
        const text = content || input.trim();
        if (!text || isLoading) return;

        const pathName = selectedPathId 
            ? categories.find(c => c.id === selectedPathId)?.name 
            : "Global Library";

        const userMessage: Message = {
            id: uuidv4(),
            role: "user",
            content: text,
            timestamp: new Date(),
            scope: selectedPathId ? "category" : "all",
            pathName
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
                    category_id: selectedPathId,
                    scope: selectedPathId ? "category" : "all",
                    history: messages.slice(-6).map(m => ({ role: m.role, content: m.content }))
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
            let metadata: any[] | undefined = undefined;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                aiContent += chunk;

                // Check for metadata tags
                if (aiContent.includes("__METADATA__:") && aiContent.includes("__END_METADATA__")) {
                    const match = aiContent.match(/__METADATA__:([\s\S]*?)__END_METADATA__/);
                    if (match && match[1]) {
                        try {
                            metadata = JSON.parse(match[1]);
                            // Strip metadata from displayed content
                            aiContent = aiContent.replace(/__METADATA__:([\s\S]*?)__END_METADATA__/, "");
                        } catch (e) { console.error("Metadata parse error", e); }
                    }
                }

                setMessages((prev) =>
                    prev.map(m => m.id === aiMessageId ? { ...m, content: aiContent, metadata } : m)
                );
            }
        } catch (error) {
            console.error("Chat error:", error);
            setMessages((prev) => [...prev, {
                id: uuidv4(),
                role: "assistant",
                content: "Sorry, I encountered an error. Please ensure you have content in this Learning Path and try again.",
                timestamp: new Date(),
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const currentPathName = selectedPathId 
        ? categories.find(c => c.id === selectedPathId)?.name 
        : "Global Library";

    return (
        <div className="h-full flex flex-col bg-white/40 dark:bg-[var(--surface-input)]/40 rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-500">
            
            {/* Header / Context Selector */}
            <div className="flex-none p-6 border-b border-slate-100 dark:border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white/80 dark:bg-[var(--surface-input)]/80 backdrop-blur-md relative z-20">
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "p-3 rounded-2xl shadow-lg transition-colors",
                        selectedPathId ? "bg-indigo-600" : "bg-emerald-600"
                    )}>
                        {selectedPathId ? <MapIcon className="h-5 w-5 text-white" /> : <Compass className="h-5 w-5 text-white" />}
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                            {selectedPathId ? `Chat with ${currentPathName}` : "Global Knowledge Base"}
                        </h1>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Vector Search Active</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    {/* Knowledge Context Dropdown */}
                    <div className="relative flex-1 md:flex-none min-w-[200px]">
                        <select 
                            value={selectedPathId || "global"}
                            onChange={(e) => setSelectedPathId(e.target.value === "global" ? null : e.target.value)}
                            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 appearance-none cursor-pointer transition-all hover:bg-slate-100 dark:hover:bg-white/10"
                        >
                            <option value="global" className="bg-white dark:bg-[var(--surface-input)] py-2">🌍 Global Library</option>
                            <optgroup label="Learning Paths" className="bg-white dark:bg-[var(--surface-input)] font-black text-[var(--secondary)]">
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id} className="bg-white dark:bg-[var(--surface-input)] py-2 font-bold">
                                        🛤 {cat.name}
                                    </option>
                                ))}
                            </optgroup>
                        </select>
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                            <Sparkles className="h-3.5 w-3.5 text-[var(--secondary)]" />
                        </div>
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                            <ChevronRight className="h-3.5 w-3.5 text-slate-400 rotate-90" />
                        </div>
                    </div>

                    <button onClick={() => setMessages([])} className="p-2.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-all shadow-sm" title="Clear History">
                        <History className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-6 md:px-12 space-y-8 custom-scrollbar">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-12 text-center max-w-lg mx-auto">
                        <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-500/10 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-inner border border-indigo-100 dark:border-indigo-500/20 rotate-3 animate-pulse">
                            <MessageSquare className="h-10 w-10 text-[var(--secondary)]" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-3">Begin Mastery Chat</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-10 leading-relaxed">
                            Ask questions across your {selectedPathId ? "path specific context" : "entire library"}. 
                            Our RAG engine extracts relevant fragments from your documents to ground every response.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                            {suggestions.map((s, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSend(s)}
                                    className="text-left px-5 py-4 text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl hover:border-indigo-500/30 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all shadow-sm"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-10 pb-10">
                        {messages.map((m, i) => (
                            <div key={m.id} className={cn(
                                "flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
                                m.role === "user" ? "items-end" : "items-start"
                            )}>
                                <div className={cn(
                                    "max-w-[90%] md:max-w-[80%] px-6 py-4 rounded-[2rem] shadow-sm",
                                    m.role === "user" 
                                        ? "bg-slate-900 dark:bg-indigo-600 text-white rounded-br-md" 
                                        : "bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 text-slate-900 dark:text-slate-100 rounded-bl-md shadow-md backdrop-blur-md"
                                )}>
                                    {m.role === "assistant" ? (
                                        <div className="space-y-4">
                                            <div className="prose prose-sm prose-slate dark:prose-invert max-w-none [&>p]:mb-4 [&>p:last-child]:mb-0">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {m.content || "..."}
                                                </ReactMarkdown>
                                            </div>
                                            
                                            {/* Source Citations */}
                                            {m.metadata && m.metadata.length > 0 && (
                                                <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                                                    <div className="flex items-center gap-1.5 mb-2.5">
                                                        <BookOpen className="h-3 w-3 text-[var(--secondary)]" />
                                                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Sources & Citations</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {m.metadata.map((source, idx) => (
                                                            <div 
                                                                key={idx}
                                                                title={source.content_text}
                                                                className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl cursor-help group transition-all hover:border-indigo-300 dark:hover:border-indigo-500/30"
                                                            >
                                                                <div className="h-4 w-4 rounded-md bg-indigo-500 flex items-center justify-center text-[8px] font-black text-white shrink-0">
                                                                    {source.id}
                                                                </div>
                                                                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 truncate max-w-[120px]">
                                                                    {source.source_title}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-sm leading-relaxed font-semibold">{m.content}</p>
                                    )}
                                </div>
                                <div className="px-3 flex items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                        {m.role === "user" ? "You" : "VibeKnowledge AI"}
                                    </span>
                                    <span className="text-[10px] text-slate-300 dark:text-slate-600">•</span>
                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tabular-nums">
                                        {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {isLoading && messages[messages.length-1].role === 'user' && (
                            <div className="flex items-start gap-4 animate-pulse">
                                <div className="px-6 py-5 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-[2rem] rounded-bl-md shadow-md">
                                    <div className="flex items-center gap-3">
                                        <div className="flex gap-1">
                                            <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce"></span>
                                            <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                            <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                        </div>
                                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Synthesizing knowledge…</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="flex-none p-6 md:px-12 bg-white/80 dark:bg-[var(--surface-input)]/80 border-t border-slate-100 dark:border-white/5 backdrop-blur-xl relative z-10">
                <div className="max-w-4xl mx-auto relative group">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder={`Ask about ${currentPathName}...`}
                        rows={1}
                        className="w-full pl-6 pr-24 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none shadow-inner"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                         <button
                            onClick={() => handleSend()}
                            disabled={!input.trim() || isLoading}
                            className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-lg disabled:opacity-40 transition-all hover:scale-105 active:scale-95"
                        >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </button>
                    </div>
                </div>
                <div className="mt-3 flex justify-center items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <BookOpen className="h-3 w-3 text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Semantic Context: {currentPathName}</span>
                    </div>
                    <div className="h-1 w-1 rounded-full bg-slate-200 dark:bg-white/10"></div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Shift + Enter for new line</span>
                </div>
            </div>
        </div>
    );
}
