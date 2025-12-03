"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Link2, Loader2, Paperclip, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function UrlInput() {
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [forceOcr, setForceOcr] = useState(false);
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!input.trim() && !file) || isLoading) return;

        setIsLoading(true);
        try {
            const formData = new FormData();

            // Handle file upload
            if (file) {
                formData.append("file", file);
                formData.append("project_id", "default");
                if (forceOcr) {
                    formData.append("force_ocr", "true");
                }

                const response = await fetch("http://localhost:8001/ingest/file", {
                    method: "POST",
                    body: formData,
                });

                if (response.ok) {
                    const data = await response.json();
                    window.dispatchEvent(new Event('refresh-sidebar'));
                    router.push(`/source/${data.source_id}`);
                } else {
                    const error = await response.json();
                    alert(error.detail || "Failed to upload file");
                }
            }
            // Handle URL ingestion
            else if (input.includes("youtube.com") || input.includes("youtu.be")) {
                const response = await fetch("http://localhost:8001/ingest/youtube", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url: input, project_id: "default" }),
                });

                if (response.ok) {
                    const data = await response.json();
                    window.dispatchEvent(new Event('refresh-sidebar'));
                    router.push(`/source/${data.source_id}`);
                } else {
                    const error = await response.json();
                    alert(error.detail || "Failed to process YouTube URL");
                }
            } else {
                // Default to web scraper for other URLs
                const response = await fetch("http://localhost:8001/ingest/web", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url: input, project_id: "default" }),
                });

                if (response.ok) {
                    const data = await response.json();
                    window.dispatchEvent(new Event('refresh-sidebar'));
                    router.push(`/source/${data.source_id}`);
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
        <div className="w-full max-w-2xl">
            <form onSubmit={handleSubmit} className="relative">
                {/* File Preview Badge */}
                {file && (
                    <div className="mb-2 inline-flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-lg text-sm">
                        <Paperclip className="h-4 w-4 text-purple-600" />
                        <span className="text-purple-900 font-medium">{file.name}</span>
                        <button
                            type="button"
                            onClick={removeFile}
                            className="text-purple-600 hover:text-purple-800 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {/* Main Input Container */}
                <div className="flex items-center space-x-2 rounded-lg border border-gray-300 bg-white p-2 shadow-sm focus-within:ring-2 focus-within:ring-purple-500 transition-all">
                    {/* File Upload Button */}
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Upload file (audio, video, PDF, text)"
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

                    {/* URL Icon */}
                    <Link2 className="h-5 w-5 text-gray-400" />

                    {/* Text Input */}
                    <input
                        type="text"
                        placeholder="Paste URL or upload file (YouTube, TED, Web, Audio, Video, PDF, Word, Text)..."
                        className="flex-1 border-none bg-transparent px-2 py-1 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-0"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={!!file}
                    />

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className={cn(
                            "rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2",
                            !canSubmit && "cursor-not-allowed opacity-50"
                        )}
                    >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analyze"}
                    </button>
                </div>

                {/* Helper Text and Options */}
                <div className="mt-2 flex flex-col items-center gap-2">
                    <p className="text-xs text-gray-500 text-center">
                        Supports: YouTube, TED Talks, Websites, Audio/Video files (MP3, MP4, WAV), PDFs, Word (.docx), and Text files
                    </p>

                    {file && file.name.toLowerCase().endsWith('.pdf') && (
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={forceOcr}
                                onChange={(e) => setForceOcr(e.target.checked)}
                                className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                            />
                            <span className="text-xs text-gray-600 group-hover:text-purple-700 transition-colors">
                                Force OCR (Use for scanned/complex PDFs)
                            </span>
                        </label>
                    )}
                </div>
            </form>
        </div>
    );
}
