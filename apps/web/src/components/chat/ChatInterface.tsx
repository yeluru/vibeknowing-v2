"use client";

import { useState, useEffect } from "react";
import { MessageList, Message } from "./MessageList";
import { API_BASE } from "@/lib/api";
import { ChatInput } from "./ChatInput";
import { v4 as uuidv4 } from "uuid";

interface ChatInterfaceProps {
    sourceId: string;
    initialMessage?: string;
}

export function ChatInterface({ sourceId, initialMessage }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Default suggestions
    const suggestions = [
        "What is the single most important idea here?",
        "What would someone commonly misunderstand about this?",
        "Give me a real-world example of the main concept",
        "What should I look up to go deeper on this?"
    ];

    useEffect(() => {
        loadHistory();
    }, [sourceId]);

    const loadHistory = async () => {
        try {
            const response = await fetch(`${API_BASE}/ai/chat/history/${sourceId}`);
            if (response.ok) {
                const history = await response.json();
                setMessages(history.map((msg: any) => ({
                    id: uuidv4(),
                    role: msg.role,
                    content: msg.content,
                    timestamp: new Date()
                })));
            }
        } catch (error) {
            console.error("Failed to load chat history:", error);
        }
    };

    const handleSend = async (content: string) => {
        const userMessage: Message = {
            id: uuidv4(),
            role: "user",
            content,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);

        try {
            // Build headers matching the axios interceptor in api.ts
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

            const response = await fetch(`${API_BASE}/ai/chat`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    message: content,
                    source_id: sourceId,
                    scope: "source",
                    history: messages.map(m => ({ role: m.role, content: m.content }))
                }),
            });

            if (!response.ok) throw new Error("Failed to send message");
            if (!response.body) throw new Error("No response body");

            const aiMessageId = uuidv4();
            const aiMessage: Message = {
                id: aiMessageId,
                role: "assistant",
                content: "",
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, aiMessage]);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let aiContent = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                aiContent += chunk;

                setMessages((prev) =>
                    prev.map(m =>
                        m.id === aiMessageId
                            ? { ...m, content: aiContent }
                            : m
                    )
                );
            }
        } catch (error) {
            console.error("Chat error:", error);
            setMessages((prev) => [...prev, {
                id: uuidv4(),
                role: "assistant",
                content: "Sorry, I encountered an error processing your request. Please try again.",
                timestamp: new Date(),
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-full flex-col bg-slate-50 dark:bg-[#0f1117] relative">
            <MessageList messages={messages} isLoading={isLoading} />
            <ChatInput onSend={handleSend} disabled={isLoading} suggestions={messages.length === 0 ? suggestions : []} />
        </div>
    );
}

