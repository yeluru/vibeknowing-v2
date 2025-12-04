"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Loader2, FileText, Sparkles, MessageCircle, Upload, Copy, Check, RefreshCw, ChevronLeft, ChevronRight, Trophy, Layers, Palette, Eye, Trash2 } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { projectsApi, Project } from "@/lib/api";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { QuizInterface } from "@/components/quiz/QuizInterface";
import { ReviewSession } from "@/components/flashcards/ReviewSession";
import { StudioInterface } from "@/components/studio/StudioInterface";
import { ContentViewer } from "@/components/content/ContentViewer";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Source {
    id: string;
    type: string;
    url: string;
    title: string;
    content_text: string;
    summary?: string;
    created_at: string;
    meta_data?: any;
    project_id?: string;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export default function SourcePage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const [source, setSource] = useState<Source | null>(null);
    const [loading, setLoading] = useState(true);

    // Initialize tab from URL or localStorage
    const getInitialTab = (): 'transcript' | 'summary' | 'chat' | 'quiz' | 'flashcards' | 'studio' | 'view' => {
        const urlTab = searchParams.get('tab');
        if (urlTab && ['transcript', 'summary', 'chat', 'quiz', 'flashcards', 'studio', 'view'].includes(urlTab)) {
            return urlTab as any;
        }

        // Try to get from localStorage (only on client)
        if (typeof window !== 'undefined') {
            const savedTab = localStorage.getItem(`source-${params.id}-tab`);
            if (savedTab && ['transcript', 'summary', 'chat', 'quiz', 'flashcards', 'studio', 'view'].includes(savedTab)) {
                return savedTab as any;
            }
        }

        return 'transcript';
    };

    const [activeTab, setActiveTab] = useState<'transcript' | 'summary' | 'chat' | 'quiz' | 'flashcards' | 'studio' | 'view'>(getInitialTab());
    const [studioDropdownOpen, setStudioDropdownOpen] = useState(false);
    const [socialMediaExpanded, setSocialMediaExpanded] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && ['transcript', 'summary', 'chat', 'quiz', 'flashcards', 'studio', 'view'].includes(tab)) {
            setActiveTab(tab as any);
        }
    }, [searchParams]);

    // Handler to change tabs and persist selection
    const handleTabChange = (tab: 'transcript' | 'summary' | 'chat' | 'quiz' | 'flashcards' | 'studio' | 'view') => {
        setActiveTab(tab);
        setStudioDropdownOpen(false); // Close dropdown when changing tabs
        if (typeof window !== 'undefined') {
            localStorage.setItem(`source-${params.id}-tab`, tab);
            // Update URL without full page reload
            window.history.replaceState(null, '', `?tab=${tab}`);
        }
    };

    // Summary state
    const [generating, setGenerating] = useState(false);
    const [summary, setSummary] = useState("");

    // Chat state removed (handled by ChatInterface)

    // Manual transcript upload state
    const [showTranscriptUpload, setShowTranscriptUpload] = useState(false);
    const [manualTranscript, setManualTranscript] = useState("");
    const [uploading, setUploading] = useState(false);

    // Copy state
    const [copiedTranscript, setCopiedTranscript] = useState(false);
    const [copiedSummary, setCopiedSummary] = useState(false);

    // Processing state
    const [isProcessing, setIsProcessing] = useState(false);

    // Navigation state
    const [prevProject, setPrevProject] = useState<string | null>(null);
    const [nextProject, setNextProject] = useState<string | null>(null);

    useEffect(() => {
        loadSource();
    }, [params.id]);

    useEffect(() => {
        if (source?.project_id) {
            loadNavigation();
        }
    }, [source]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setStudioDropdownOpen(false);
                setSocialMediaExpanded(false);
            }
        };

        if (studioDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [studioDropdownOpen]);

    const loadNavigation = async () => {
        if (!source?.project_id) return;
        try {
            // 1. Get all projects (we need to find the current one in the list)
            // Ideally we'd filter by category if we knew it, but we can just fetch all for now
            // Or better, fetch the current project to get its category, then fetch projects in that category
            const allProjects = await projectsApi.list();

            // Find current project
            const currentIndex = allProjects.findIndex(p => p.id === source.project_id);
            if (currentIndex === -1) return;

            const currentProject = allProjects[currentIndex];

            // Filter by category if exists
            const categoryProjects = currentProject.category_id
                ? allProjects.filter(p => p.category_id === currentProject.category_id)
                : allProjects.filter(p => !p.category_id); // Or just all? Let's stick to category context

            // Re-find index in filtered list
            const index = categoryProjects.findIndex(p => p.id === source.project_id);

            if (index > 0) {
                setPrevProject(categoryProjects[index - 1].first_source_id || null);
            }
            if (index < categoryProjects.length - 1) {
                setNextProject(categoryProjects[index + 1].first_source_id || null);
            }
        } catch (error) {
            console.error("Error loading navigation:", error);
        }
    };

    const handleDeleteProject = async () => {
        if (!source?.project_id) return;
        if (!confirm("Are you sure you want to delete this project? This action cannot be undone.")) return;

        try {
            await projectsApi.delete(source.project_id);
            toast.success("Project deleted successfully");
            router.push('/');
        } catch (error) {
            console.error("Failed to delete project:", error);
            toast.error("Failed to delete project");
        }
    };

    // loadChatHistory removed (handled by ChatInterface)

    const handleGenerateSummary = useCallback(async () => {
        setGenerating(true);
        try {
            // If summary already exists, we are regenerating, so force=true
            const force = !!summary;
            const response = await fetch(`http://localhost:8000/ai/summarize/${params.id}?force=${force}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });

            if (response.ok) {
                const data = await response.json();
                setSummary(data.summary);
                // Update local source object
                if (source) {
                    setSource({ ...source, summary: data.summary });
                }
            } else {
                console.error("Failed to generate summary");
            }
        } catch (error) {
            console.error("Error generating summary:", error);
        } finally {
            setGenerating(false);
        }
    }, [params.id, summary, source]);

    // Auto-generate summary when switching to Summary tab if no summary exists
    useEffect(() => {
        if (activeTab === 'summary' && source && !summary && !generating && !isProcessing) {
            console.log('Summary tab opened with no summary - auto-generating');
            handleGenerateSummary();
        }
    }, [activeTab, source, summary, generating, isProcessing, handleGenerateSummary]);

    const loadSource = async () => {
        // Only set loading on initial load, not during polling
        if (!source) setLoading(true);

        try {
            const response = await fetch(`http://localhost:8000/sources/${params.id}`);
            if (response.ok) {
                const data = await response.json();
                setSource(data);

                // Check processing status
                if (data.meta_data?.status === 'processing') {
                    setIsProcessing(true);
                    // Poll again in 2 seconds
                    setTimeout(loadSource, 2000);
                } else {
                    setIsProcessing(false);
                }

                // Load existing summary if available
                if (data.summary) {
                    setSummary(data.summary);
                }

                // Show upload option if transcript failed
                if (data.content_text && data.content_text.includes("Transcript extraction failed")) {
                    setShowTranscriptUpload(true);
                }

            }
        } catch (error) {
            console.error("Error loading source:", error);
        } finally {
            setLoading(false);
        }
    };

    // Wrapper for manual refresh button
    const fetchSource = () => {
        setLoading(true);
        loadSource();
    };

    // loadChatHistory removed (handled by ChatInterface)
    // handleGenerateSummary moved above to be available for useEffect
    // handleSendMessage removed (handled by ChatInterface)

    const handleManualTranscriptUpload = async () => {
        if (!manualTranscript.trim()) return;

        setUploading(true);
        try {
            const response = await fetch(`http://localhost:8000/sources/${params.id}/transcript`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ transcript: manualTranscript }),
            });

            if (response.ok) {
                // Refresh source data
                loadSource();
                setShowTranscriptUpload(false);
                setManualTranscript("");
            } else {
                alert("Failed to update transcript");
            }
        } catch (error) {
            console.error("Error uploading transcript:", error);
            alert("Error uploading transcript");
        } finally {
            setUploading(false);
        }
    };

    const copyToClipboard = async (text: string, type: 'transcript' | 'summary') => {
        if (type === 'transcript') {
            await navigator.clipboard.writeText(text);
            setCopiedTranscript(true);
            setTimeout(() => setCopiedTranscript(false), 2000);
        } else {
            await navigator.clipboard.writeText(summary);
            setCopiedSummary(true);
            setTimeout(() => setCopiedSummary(false), 2000);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600 dark:text-purple-400" />
            </div>
        );
    }

    if (!source) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-gray-500 dark:text-slate-400">Source not found</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col space-y-4 sm:space-y-6">
            {/* Header - Enhanced */}
            <div className="flex-none relative z-10 bg-white dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-700/60 p-5 sm:p-6 shadow-lg hover-lift transition-colors duration-300">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className="min-w-0 flex-1">
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-2 break-words leading-tight">{source.title}</h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 truncate font-medium">{source.url}</p>
                        </div>
                    </div>

                    <button
                        onClick={handleDeleteProject}
                        className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 dark:bg-red-900/30 rounded-lg transition-colors"
                        title="Delete Project"
                    >
                        <Trash2 className="h-5 w-5" />
                    </button>
                </div>
                {/* Action Buttons - Enhanced */}
                <div className="mt-6 flex flex-wrap gap-2 sm:gap-3">
                    <button
                        onClick={() => handleTabChange('transcript')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 hover-lift ${activeTab === 'transcript'
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400'
                            }`}
                    >
                        <FileText className="h-4 w-4" />
                        <span className="hidden sm:inline">Transcript</span>
                    </button>
                    <button
                        onClick={() => handleTabChange('summary')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 hover-lift ${activeTab === 'summary'
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400'
                            }`}
                    >
                        <Sparkles className="h-4 w-4" />
                        <span className="hidden sm:inline">Summary</span>
                    </button>
                    <button
                        onClick={() => handleTabChange('chat')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 hover-lift ${activeTab === 'chat'
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400'
                            }`}
                    >
                        <MessageCircle className="h-4 w-4" />
                        <span className="hidden sm:inline">Chat</span>
                    </button>


                    {/* Studio Dropdown */}
                    <div
                        className="relative"
                        ref={dropdownRef}
                        onMouseEnter={() => setStudioDropdownOpen(true)}
                        onMouseLeave={() => {
                            setStudioDropdownOpen(false);
                            setSocialMediaExpanded(false);
                        }}
                    >
                        <button
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 hover-lift ${activeTab === 'studio' || studioDropdownOpen
                                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400'
                                }`}
                        >
                            <Palette className="h-4 w-4" />
                            <span className="hidden sm:inline">Studio</span>
                            <ChevronRight className="h-3 w-3 rotate-90 opacity-50" />
                        </button>

                        {/* Dropdown Menu */}
                        {studioDropdownOpen && (
                            <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 py-2 z-50 animate-in fade-in zoom-in-95 duration-200 before:absolute before:-top-2 before:left-0 before:w-full before:h-2 before:content-['']">
                                <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700 mb-1">
                                    Create & Learn
                                </div>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleTabChange('studio');
                                        window.history.replaceState(null, '', `?tab=studio&tool=diagram`);
                                        window.dispatchEvent(new CustomEvent('studio-tool-change', { detail: 'diagram' }));
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                                >
                                    <Sparkles className="h-4 w-4" />
                                    Diagrams
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleTabChange('studio');
                                        window.history.replaceState(null, '', `?tab=studio&tool=article`);
                                        window.dispatchEvent(new CustomEvent('studio-tool-change', { detail: 'article' }));
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                                >
                                    <FileText className="h-4 w-4" />
                                    Articles
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleTabChange('studio');
                                        window.history.replaceState(null, '', `?tab=studio&tool=quiz`);
                                        window.dispatchEvent(new CustomEvent('studio-tool-change', { detail: 'quiz' }));
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                                >
                                    <Trophy className="h-4 w-4" />
                                    Quiz
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleTabChange('studio');
                                        window.history.replaceState(null, '', `?tab=studio&tool=flashcards`);
                                        window.dispatchEvent(new CustomEvent('studio-tool-change', { detail: 'flashcards' }));
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                                >
                                    <Layers className="h-4 w-4" />
                                    Flashcards
                                </button>

                                {/* Social Media with Submenu - Moved to bottom */}
                                <div
                                    onMouseEnter={() => setSocialMediaExpanded(true)}
                                    onMouseLeave={() => setSocialMediaExpanded(false)}
                                >
                                    <button
                                        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <MessageCircle className="h-4 w-4" />
                                            Social Media
                                        </div>
                                        <ChevronRight className={`h-4 w-4 transition-transform ${socialMediaExpanded ? 'rotate-90' : ''}`} />
                                    </button>

                                    {socialMediaExpanded && (
                                        <div className="pl-4 py-1">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSocialMediaExpanded(false);
                                                    handleTabChange('studio');
                                                    window.history.replaceState(null, '', `?tab=studio&tool=social&platform=twitter`);
                                                    window.dispatchEvent(new CustomEvent('studio-tool-change', { detail: 'social' }));
                                                    window.dispatchEvent(new CustomEvent('social-platform-change', { detail: 'twitter' }));
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 hover:text-purple-600 dark:hover:text-purple-400 transition-colors rounded-lg"
                                            >
                                                <span className="w-4"></span>
                                                Twitter Thread
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSocialMediaExpanded(false);
                                                    handleTabChange('studio');
                                                    window.history.replaceState(null, '', `?tab=studio&tool=social&platform=linkedin`);
                                                    window.dispatchEvent(new CustomEvent('studio-tool-change', { detail: 'social' }));
                                                    window.dispatchEvent(new CustomEvent('social-platform-change', { detail: 'linkedin' }));
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 hover:text-purple-600 dark:hover:text-purple-400 transition-colors rounded-lg"
                                            >
                                                <span className="w-4"></span>
                                                LinkedIn Post
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSocialMediaExpanded(false);
                                                    handleTabChange('studio');
                                                    window.history.replaceState(null, '', `?tab=studio&tool=social&platform=instagram`);
                                                    window.dispatchEvent(new CustomEvent('studio-tool-change', { detail: 'social' }));
                                                    window.dispatchEvent(new CustomEvent('social-platform-change', { detail: 'instagram' }));
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 hover:text-purple-600 dark:hover:text-purple-400 transition-colors rounded-lg"
                                            >
                                                <span className="w-4"></span>
                                                Instagram Caption
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => handleTabChange('view')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 hover-lift ${activeTab === 'view'
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400'
                            }`}
                    >
                        <Eye className="h-4 w-4" />
                        <span className="hidden sm:inline">View</span>
                    </button>
                </div>
                {/* Navigation Arrows - Bottom Right */}
                <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-gray-100 dark:bg-slate-700 rounded-lg p-1 shadow-md">
                    <a
                        href={prevProject ? `/source/${prevProject}` : '#'}
                        className={`p-1.5 rounded-md transition-colors ${prevProject
                            ? 'text-gray-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:text-purple-600 dark:hover:text-purple-400 hover:shadow-sm'
                            : 'text-gray-300 dark:text-slate-600 cursor-default opacity-50'
                            }`}
                        title="Previous Project"
                        onClick={e => !prevProject && e.preventDefault()}
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </a>
                    <a
                        href={nextProject ? `/source/${nextProject}` : '#'}
                        className={`p-1.5 rounded-md transition-colors ${nextProject
                            ? 'text-gray-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:text-purple-600 dark:hover:text-purple-400 hover:shadow-sm'
                            : 'text-gray-300 dark:text-slate-600 cursor-default opacity-50'
                            }`}
                        title="Next Project"
                        onClick={e => !nextProject && e.preventDefault()}
                    >
                        <ChevronRight className="h-5 w-5" />
                    </a>
                </div>
            </div >

            {/* Content Area - Scrollable */}
            < div className="flex-1 overflow-y-auto mt-6" >
                {/* Transcript Tab */}
                {
                    activeTab === 'transcript' && (
                        <div className="bg-white dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-700/60 p-6 sm:p-8 shadow-xl transition-colors duration-300">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">Transcript</h2>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(source.content_text);
                                        setCopiedTranscript(true);
                                        setTimeout(() => setCopiedTranscript(false), 2000);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-300 hover-lift"
                                >
                                    {copiedTranscript ? (
                                        <>
                                            <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-4 w-4" />
                                            Copy
                                        </>
                                    )}
                                </button>
                            </div>
                            <div className="prose prose-sm max-w-none">
                                <p className="whitespace-pre-wrap text-gray-900 dark:text-white leading-relaxed text-base">
                                    {source.content_text}
                                </p>
                            </div>
                        </div>
                    )
                }

                {/* Summary Tab */}
                {
                    activeTab === 'summary' && (
                        <div className="bg-white dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-700/60 p-6 sm:p-8 shadow-xl transition-colors duration-300">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">AI Summary</h2>
                                <div className="flex items-center gap-2">
                                    {source.summary && (
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(source.summary || '');
                                                setCopiedSummary(true);
                                                setTimeout(() => setCopiedSummary(false), 2000);
                                            }}
                                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-300 hover-lift"
                                        >
                                            {copiedSummary ? (
                                                <>
                                                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                    Copied!
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="h-4 w-4" />
                                                    Copy
                                                </>
                                            )}
                                        </button>
                                    )}
                                    <button
                                        onClick={handleGenerateSummary}
                                        disabled={generating}
                                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {generating ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <RefreshCw className="h-4 w-4" />
                                                {source.summary ? 'Regenerate' : 'Generate'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                            {source.summary ? (
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm, remarkMath]}
                                        rehypePlugins={[rehypeKatex]}
                                        components={{
                                            h1: ({ node, ...props }) => <h1 className="!text-2xl !font-bold !mt-6 !mb-4 !text-gray-900 dark:!text-white" {...props} />,
                                            h2: ({ node, ...props }) => <h2 className="!text-xl !font-bold !mt-5 !mb-3 !text-gray-900 dark:!text-white" {...props} />,
                                            h3: ({ node, ...props }) => <h3 className="!text-lg !font-semibold !mt-4 !mb-2 !text-gray-900 dark:!text-white" {...props} />,
                                            h4: ({ node, ...props }) => <h4 className="!text-base !font-semibold !mt-3 !mb-2 !text-gray-900 dark:!text-white" {...props} />,
                                            h5: ({ node, ...props }) => <h5 className="!text-sm !font-semibold !mt-2 !mb-1 !text-gray-900 dark:!text-white" {...props} />,
                                            h6: ({ node, ...props }) => <h6 className="!text-xs !font-semibold !mt-2 !mb-1 !text-gray-900 dark:!text-white" {...props} />,
                                            p: ({ node, ...props }) => <p className="!mb-4 !text-gray-900 dark:!text-white !leading-relaxed" {...props} />,
                                            ul: ({ node, ...props }) => <ul className="!list-disc !list-inside !mb-4 !space-y-2 !text-gray-900 dark:!text-white" {...props} />,
                                            ol: ({ node, ...props }) => <ol className="!list-decimal !list-inside !mb-4 !space-y-2 !text-gray-900 dark:!text-white" {...props} />,
                                            li: ({ node, ...props }) => <li className="!ml-4 !text-gray-900 dark:!text-white" {...props} />,
                                            strong: ({ node, ...props }) => <strong className="!font-semibold !text-gray-900 dark:!text-white" {...props} />,
                                            em: ({ node, ...props }) => <em className="!italic !text-gray-900 dark:!text-white" {...props} />,
                                            pre: ({ node, ...props }) => (
                                                <pre className="not-prose bg-gray-50 dark:bg-slate-900 rounded-lg overflow-x-auto border border-gray-200 dark:border-slate-700 my-4" {...props} />
                                            ),
                                            code: ({ node, inline, className, children, ...props }: any) => {
                                                const match = /language-(\w+)/.exec(className || '');
                                                return !inline ? (
                                                    <code className={cn("!block !p-4 !text-sm !font-mono !text-gray-800 dark:!text-slate-200 whitespace-pre", className)} {...props}>
                                                        {children}
                                                    </code>
                                                ) : (
                                                    <code className={cn("!px-1.5 !py-0.5 !bg-gray-100 dark:!bg-slate-700 !text-purple-600 dark:!text-purple-400 rounded !text-sm !font-mono", className)} {...props}>
                                                        {children}
                                                    </code>
                                                );
                                            },
                                            img: ({ node, ...props }) => (
                                                <img className="rounded-lg border border-gray-200 dark:border-slate-700 my-4 max-w-full h-auto mx-auto shadow-sm" {...props} />
                                            ),
                                            blockquote: ({ node, ...props }) => (
                                                <blockquote className="!border-l-4 !border-purple-500 dark:!border-purple-600 !pl-4 !italic !text-gray-700 dark:!text-slate-300 !my-4" {...props} />
                                            ),
                                        }}
                                    >
                                        {source.summary}
                                    </ReactMarkdown>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-500 dark:text-slate-400">
                                    <Sparkles className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                    <p>No summary generated yet. Click "Generate" to create one.</p>
                                </div>
                            )}
                        </div>
                    )
                }

                {/* Chat Tab */}
                {
                    activeTab === 'chat' && (
                        <ChatInterface sourceId={source.id} />
                    )
                }





                {/* Studio Tab */}
                {
                    activeTab === 'studio' && (
                        <StudioInterface sourceId={source.id} />
                    )
                }

                {/* View Tab */}
                {
                    activeTab === 'view' && (
                        <ContentViewer url={source.url || ''} title={source.title || 'Untitled'} />
                    )
                }
            </div >
        </div >
    );
}
