"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Link2, Loader2, Paperclip, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function UrlInput() {
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [forceOcr, setForceOcr] = useState(false);
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { isAuthenticated } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!input.trim() && !file) || isLoading) return;

        // Access Control Logic
        if (!isAuthenticated) {
            const guestCount = parseInt(localStorage.getItem('guest_project_count') || '0');
            if (guestCount >= 1) {
                // Trial Expired
                toast.error("Free trial limit reached. Please sign up to create more projects.");
                // Add a small delay for the toast to be seen, then redirect
                setTimeout(() => {
                    router.push("/auth/signup");
                }, 1000);
                return;
            }
            // Increment trial count (will be set to 1 on success)
        }

        setIsLoading(true);
        try {
            const formData = new FormData();

            const token = localStorage.getItem("token");
            const headers: HeadersInit = {};
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }

            // Handle file upload
            if (file) {
                formData.append("file", file);
                formData.append("project_id", "default");
                if (forceOcr) {
                    formData.append("force_ocr", "true");
                }

                const response = await fetch(`${API_BASE}/ingest/file`, {
                    method: "POST",
                    headers: headers,
                    body: formData,
                });

                if (response.ok) {
                    const data = await response.json();
                    if (!isAuthenticated) {
                        localStorage.setItem('guest_project_count', '1');

                        // Save guest project metadata
                        const guestProjects = JSON.parse(localStorage.getItem('guest_projects') || '[]');
                        if (!guestProjects.find((p: any) => p.id === data.project_id)) {
                            guestProjects.unshift({
                                id: data.project_id,
                                title: data.project_title,
                                created_at: new Date().toISOString(),
                                first_source_id: data.source_id,
                                category_id: null,
                                source_count: 1
                            });
                            localStorage.setItem('guest_projects', JSON.stringify(guestProjects));
                        }
                    }
                    window.dispatchEvent(new Event('refresh-sidebar'));
                    router.push(`/source/${data.source_id}`);
                } else {
                    const error = await response.json();
                    alert(error.detail || "Failed to upload file");
                }
            }
            // Handle URL ingestion
            else {
                // Send all URLs to the ingestion endpoint (backend handles async/sync decision)
                const response = await fetch(`${API_BASE}/ingest/youtube`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...headers
                    },
                    body: JSON.stringify({ url: input, project_id: "default" }),
                });

                if (response.ok) {
                    const data = await response.json();
                    if (!isAuthenticated) {
                        localStorage.setItem('guest_project_count', '1');

                        // Save guest project metadata
                        const guestProjects = JSON.parse(localStorage.getItem('guest_projects') || '[]');
                        if (!guestProjects.find((p: any) => p.id === data.project_id)) {
                            guestProjects.unshift({
                                id: data.project_id,
                                title: data.project_title,
                                created_at: new Date().toISOString(),
                                first_source_id: data.source_id,
                                category_id: null,
                                source_count: 1
                            });
                            localStorage.setItem('guest_projects', JSON.stringify(guestProjects));
                        }
                    }
                    if (!isAuthenticated) {
                        // Force full reload for guests to ensure Sidebar picks up localStorage changes
                        window.location.href = `/source/${data.source_id}`;
                    } else {
                        window.dispatchEvent(new Event('refresh-sidebar'));
                        router.push(`/source/${data.source_id}`);
                    }
                } else {
                    const error = await response.json();
                    alert(error.detail || "Failed to process URL");
                }
            }
        } catch (error) {
            console.error("Error:", error);
            alert("An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            // Clear URL input when file is selected to avoid confusion
            setInput("");
        }
    };

    const removeFile = () => {
        setFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const canSubmit = (input.trim().length > 0 || file) && !isLoading;

    return (
        <div className="w-full">
            <form onSubmit={handleSubmit} className="relative">
                {/* File Preview Badge */}
                {file && (
                    <div className="mb-2 inline-flex items-center gap-2 px-3 py-1.5 vk-pill vk-pill-muted text-sm">
                        <Paperclip className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        <span className="text-purple-900 dark:text-purple-200 font-medium">{file.name}</span>
                        <button
                            type="button"
                            onClick={removeFile}
                            className="vk-btn vk-btn-ghost p-1 text-purple-600 dark:text-purple-400 hover:text-purple-800 transition-colors"
                            aria-label="Remove selected file"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {/* Main Input Container - Premium Styling */}
                <div className="vk-panel flex flex-col md:flex-row items-stretch md:items-center gap-3 p-2 rounded-3xl transition-all duration-300">

                    {/* Input Wrapper */}
                    <div className="flex-1 flex items-center bg-slate-50/80 dark:bg-slate-950/30 rounded-2xl border border-transparent focus-within:border-purple-200 dark:focus-within:border-purple-800 focus-within:bg-white/70 dark:focus-within:bg-slate-950/40 transition-all duration-300">
                        {/* File Upload Button */}
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="vk-btn vk-btn-ghost p-3 ml-1 text-gray-400 dark:text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50/70 dark:hover:bg-purple-900/20 rounded-xl transition-colors"
                            title="Upload file (audio, video, PDF, text)"
                            aria-label="Upload a file"
                        >
                            <Paperclip className="h-5 w-5" />
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept=".mp3,.mp4,.wav,.m4a,.webm,.pdf,.docx,.txt,.md,.csv,.json"
                            onChange={handleFileSelect}
                        />

                        {/* URL Icon - Desktop Only */}
                        <div className="hidden md:flex items-center justify-center w-8">
                            <Link2 className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                        </div>

                        {/* Text Input */}
                        <input
                            type="text"
                            placeholder="Paste URL (YouTube/Web) or upload file..."
                            className="flex-1 border-none bg-transparent px-3 py-4 h-14 text-base md:text-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-0 w-full"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={!!file}
                        />
                    </div>

                    {/* Submit Button - Full Width Mobile, Auto Desktop */}
                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className={cn(
                            "vk-btn vk-btn-primary h-14 md:h-auto md:py-3 flex items-center justify-center rounded-2xl px-8 text-base font-bold shadow-lg shadow-purple-500/25 transition-all hover:shadow-purple-500/35 hover:scale-[1.01] active:scale-[0.99] w-full md:w-auto shrink-0",
                            !canSubmit && "cursor-not-allowed opacity-50 grayscale"
                        )}
                        aria-busy={isLoading}
                    >
                        {isLoading ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span className="md:hidden">Analyzing...</span>
                            </div>
                        ) : (
                            <span className="flex items-center gap-2">
                                Analyze <span className="hidden md:inline">Now</span>
                            </span>
                        )}
                    </button>
                </div>

                {/* Helper Text and Options */}
                <div className="mt-2 flex flex-col items-center gap-2">
                    <p className="text-xs text-gray-500 dark:text-slate-400 text-center">
                        Supports: YouTube, TED Talks, Websites, Audio/Video files (MP3, MP4, WAV), PDFs, Word (.docx), and Text files
                    </p>

                    {file && file.name.toLowerCase().endsWith('.pdf') && (
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={forceOcr}
                                onChange={(e) => setForceOcr(e.target.checked)}
                                className="w-4 h-4 text-purple-600 dark:text-purple-400 rounded border-gray-300 dark:border-slate-600 focus:ring-purple-500 bg-white dark:bg-slate-800"
                            />
                            <span className="text-xs text-gray-600 dark:text-slate-300 group-hover:text-purple-700 dark:text-purple-300 transition-colors">
                                Force OCR (Use for scanned/complex PDFs)
                            </span>
                        </label>
                    )}
                </div>
            </form>
        </div>
    );
}
