"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Link2, Loader2, Paperclip, X, Route, Plus, FolderOpen, Folder, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE, projectsApi, Project, Category, categoriesApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";


export function UrlInput() {
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [forceOcr, setForceOcr] = useState(false);
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { isAuthenticated } = useAuth();

    // Path assignment after ingestion
    const [pendingSourceId, setPendingSourceId] = useState<string | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [pendingProjectId, setPendingProjectId] = useState<string | null>(null);
    const [showPathPicker, setShowPathPicker] = useState(false);
    const [creatingPath, setCreatingPath] = useState(false);
    const [newPathName, setNewPathName] = useState("");
    const [assigningPath, setAssigningPath] = useState(false);

    // Load paths whenever picker opens
    useEffect(() => {
        if (isAuthenticated) {
            categoriesApi.list().then(setCategories).catch(console.error);
        }
    }, [isAuthenticated]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!input.trim() && !file) || isLoading) return;

        if (!isAuthenticated) {
            toast("Sign in to get started", {
                description: "Create a free account to analyze URLs and upload files.",
                action: { label: "Sign up", onClick: () => router.push("/auth/signup") },
            });
            router.push("/auth/signup");
            return;
        }

        setIsLoading(true);
        try {
            const token = localStorage.getItem("token");
            const headers: HeadersInit = {};
            if (token) headers["Authorization"] = `Bearer ${token}`;

            let sourceId: string | null = null;

            if (file) {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("project_id", "default");
                if (forceOcr) formData.append("force_ocr", "true");

                const response = await fetch(`${API_BASE}/ingest/file`, { method: "POST", headers, body: formData });
                if (response.ok) {
                    const data = await response.json();
                    sourceId = data.source_id;
                    setPendingProjectId(data.project_id);
                    window.dispatchEvent(new Event('refresh-sidebar'));
                } else {
                    const err = await response.json();
                    toast.error(err.detail || "Failed to upload file");
                }
            } else {
                const response = await fetch(`${API_BASE}/ingest/youtube`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", ...headers },
                    body: JSON.stringify({ url: input, project_id: "default" }),
                });

                if (response.ok) {
                    const data = await response.json();
                    sourceId = data.source_id;
                    setPendingProjectId(data.project_id);
                    if (!isAuthenticated) {
                        const gp = JSON.parse(localStorage.getItem('guest_projects') || '[]');
                        if (!gp.find((p: any) => p.id === data.project_id)) {
                            gp.unshift({ id: data.project_id, title: data.project_title, created_at: new Date().toISOString(), first_source_id: data.source_id, category_id: null, source_count: 1 });
                            localStorage.setItem('guest_projects', JSON.stringify(gp));
                        }
                    }
                    window.dispatchEvent(new Event('refresh-sidebar'));
                } else {
                    const err = await response.json();
                    toast.error(err.detail || "Failed to process URL");
                }
            }

            if (sourceId) {
                setInput("");
                setFile(null);
                setPendingSourceId(sourceId);

                if (isAuthenticated) {
                    // Refresh categories before showing modal
                    await categoriesApi.list().then(setCategories);
                    setShowPathPicker(true);
                } else {
                    window.location.href = `/source/${sourceId}`;
                }
            }
        } catch (error) {
            console.error("Error:", error);
            toast.error("An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAssignPath = async (categoryId: string, categoryName?: string) => {
        if (!pendingProjectId) return;
        setAssigningPath(true);
        try {
            await projectsApi.updateCategory(pendingProjectId, categoryId);
            window.dispatchEvent(new Event('refresh-sidebar'));
            const name = categoryName || categories.find(c => c.id === categoryId)?.name || 'Path';
            toast.success(`Resource added to "${name}"`);
            setShowPathPicker(false);
            
            // Redirect to the newly organized project details
            if (pendingSourceId) {
                router.push(`/source/${pendingSourceId}`);
            } else {
                router.push(`/paths/${pendingProjectId}`);
            }
        } catch (err: any) {
            toast.error(`Failed to assign path: ${err?.message || ''}`);
        } finally {
            setAssigningPath(false);
        }
    };

    const handleCreateAndAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newPathName.trim();
        if (!trimmed || !pendingProjectId) return;
        setAssigningPath(true);
        try {
            const newCat = await categoriesApi.create(trimmed);
            setCategories(prev => [...prev, newCat]);
            setNewPathName("");
            setCreatingPath(false);
            // Assign the project to the new category
            await handleAssignPath(newCat.id, newCat.name);
        } catch (err: any) {
            toast.error(`Failed to create learning path: ${err?.message || ''}`);
            setAssigningPath(false);
        }
    };


    const handleSkipAssignment = () => {
        setShowPathPicker(false);
        if (pendingSourceId) router.push(`/source/${pendingSourceId}`);
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
            {/* Path Assignment Modal — appears after ingestion */}
            <AnimatePresence>
                {showPathPicker && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            className="w-full max-w-md bg-white dark:bg-[var(--surface-input)] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden"
                        >
                            <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-white/5">
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="h-10 w-10 rounded-2xl bg-indigo-500 flex items-center justify-center shrink-0">
                                        <Route className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-900 dark:text-white text-base">Add to a Learning Path</h3>
                                        <p className="text-[11px] text-slate-400 dark:text-slate-500">Organize this resource so it's easy to find later.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 py-4 space-y-2 max-h-64 overflow-y-auto">
                                {categories.length === 0 && !creatingPath ? (
                                    <p className="text-sm text-slate-400 text-center py-4">You haven't created any Learning Paths yet.</p>
                                ) : (
                                    categories.map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => handleAssignPath(cat.id, cat.name)}
                                            disabled={assigningPath}
                                            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-slate-200 dark:border-white/5 hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all group text-left disabled:opacity-50"
                                        >
                                            <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 transition-colors">
                                                <Folder className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                                            </div>
                                            <span className="flex-1 font-semibold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 text-sm truncate transition-colors">
                                                {cat.name}
                                            </span>
                                            <ChevronRight className="h-3 w-3 text-slate-300 group-hover:text-indigo-400 transition-all group-hover:translate-x-0.5" />
                                        </button>
                                    ))
                                )}

                                {/* Inline new path creation */}
                                {creatingPath ? (
                                    <form onSubmit={handleCreateAndAssign} className="flex gap-2 pt-1">
                                        <input
                                            autoFocus
                                            type="text"
                                            value={newPathName}
                                            onChange={e => setNewPathName(e.target.value)}
                                            placeholder="Learning Path name (e.g. Logos, Python...)"
                                            className="flex-1 px-3 py-2 text-sm border border-indigo-200 dark:border-white/10 rounded-xl bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                                        />
                                        <button type="submit" disabled={!newPathName.trim() || assigningPath}
                                            className="px-4 py-2 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-all">
                                            Create
                                        </button>
                                    </form>
                                ) : (
                                    <button
                                        onClick={() => setCreatingPath(true)}
                                        className="w-full flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 transition-all text-slate-400 hover:text-indigo-500 text-sm font-semibold"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Create new path
                                    </button>
                                )}
                            </div>

                            <div className="px-6 pb-6 pt-2">
                                <button
                                    onClick={handleSkipAssignment}
                                    className="w-full text-center text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors font-semibold py-2"
                                >
                                    Skip for now — view resource without assigning
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="relative">
                {/* File Preview Badge */}
                {file && (
                    <div className="mb-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 text-sm">
                        <Paperclip className="h-4 w-4 text-indigo-500 shrink-0" />
                        <span className="text-indigo-800 dark:text-indigo-300 font-medium truncate max-w-[200px]">{file.name}</span>
                        <button
                            type="button"
                            onClick={removeFile}
                            className="ml-1 p-0.5 rounded text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-200 transition-colors cursor-pointer"
                            aria-label="Remove selected file"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}

                {/* Main Input Container */}
                <div className="flex flex-col sm:flex-row items-stretch gap-2 p-1.5 rounded-2xl bg-white dark:bg-[var(--background-elevated)] border border-slate-200 dark:border-[var(--surface-border)] shadow-sm focus-within:border-indigo-300 dark:focus-within:border-indigo-700 focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] transition-all duration-200">

                    {/* Input Row */}
                    <div className="flex flex-1 items-center min-w-0">
                        {/* Attach Button */}
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-shrink-0 p-2.5 ml-0.5 rounded-xl text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors cursor-pointer"
                            title="Upload a file"
                            aria-label="Upload a file"
                        >
                            <Paperclip className="h-4.5 w-4.5 h-[18px] w-[18px]" />
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept=".mp3,.mp4,.wav,.m4a,.webm,.pdf,.docx,.txt,.md,.csv,.json"
                            onChange={handleFileSelect}
                        />

                        {/* Divider */}
                        <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1 shrink-0" />

                        {/* Text Input */}
                        <input
                            type="text"
                            data-onboarding="url-input"
                            placeholder="Paste a URL or drop a file…"
                            className="flex-1 min-w-0 border-none bg-transparent px-3 py-2.5 h-11 text-[15px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-0 font-normal"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={!!file}
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        data-onboarding="submit-btn"
                        disabled={!canSubmit}
                        className={cn(
                            "flex items-center justify-center gap-2 h-11 px-6 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all duration-150 shrink-0 w-full sm:w-auto cursor-pointer",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
                            !canSubmit && "opacity-40 cursor-not-allowed hover:bg-indigo-600"
                        )}
                        aria-busy={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Analyzing…</span>
                            </>
                        ) : (
                            <span>Analyze</span>
                        )}
                    </button>
                </div>

                {/* Supported Sources — scannable chips */}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
                    {[
                        { label: "YouTube" },
                        { label: "Instagram" },
                        { label: "X / Twitter" },
                        { label: "TikTok" },
                        { label: "LinkedIn" },
                        { label: "TED" },
                        { label: "Any webpage" },
                        { label: "PDF / DOCX" },
                        { label: "MP3 / MP4" },
                    ].map(({ label }) => (
                        <span key={label} className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                            <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                            {label}
                        </span>
                    ))}
                </div>

                {/* OCR toggle — only for PDF uploads */}
                {file && file.name.toLowerCase().endsWith('.pdf') && (
                    <div className="mt-3 flex justify-center">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={forceOcr}
                                onChange={(e) => setForceOcr(e.target.checked)}
                                className="w-4 h-4 text-indigo-600 dark:text-indigo-400 rounded border-slate-300 dark:border-slate-600 focus:ring-indigo-500 bg-white dark:bg-slate-800"
                            />
                            <span className="text-xs text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                                Force OCR <span className="text-slate-400">(for scanned or image-heavy PDFs)</span>
                            </span>
                        </label>
                    </div>
                )}
            </form>
        </div>
    );
}
