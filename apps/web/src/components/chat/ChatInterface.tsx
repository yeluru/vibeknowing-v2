"use client";

import { useState, useEffect } from "react";
import { MessageList, Message } from "./MessageList";
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
        "Summarize the key points",
        "What are the main takeaways?",
        "Explain the technical concepts",
        "Create a quiz from this"
    ];

    useEffect(() => {
        loadHistory();
    }, [sourceId]);

    const loadHistory = async () => {
        try {
            const response = await fetch(`http://localhost:8001/ai/chat/history/${sourceId}`);
            if (response.ok) {
                const history = await response.json();
                setMessages(history.map((msg: any) => ({
                    id: uuidv4(),
                    role: msg.role,
                    content: msg.content,
                    timestamp: new Date() // Backend doesn't return timestamp yet, use current
                })));
            }
        } catch (error) {
            console.error("Failed to load chat history:", error);
        }
    };

    const handleSend = async (content: string) => {
        // Add user message
        const userMessage: Message = {
            id: uuidv4(),
            role: "user",
            content,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);

        try {
            const response = await fetch("http://localhost:8001/ai/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: content,
                    source_id: sourceId,
                    history: messages.map(m => ({ role: m.role, content: m.content }))
                }),
            });

            if (!response.ok) throw new Error("Failed to send message");
            if (!response.body) throw new Error("No response body");

            // Create placeholder for AI message
            const aiMessageId = uuidv4();
            const aiMessage: Message = {
                id: aiMessageId,
                role: "assistant",
                content: "",
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, aiMessage]);

            // Stream response
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
            // Add error message
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
        <div className="flex h-full flex-col bg-gray-50">
            <MessageList messages={messages} isLoading={isLoading} />
            <ChatInput onSend={handleSend} disabled={isLoading} suggestions={messages.length === 0 ? suggestions : []} />
        </div>
    );
}
