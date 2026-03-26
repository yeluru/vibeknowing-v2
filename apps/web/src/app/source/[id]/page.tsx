"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Loader2, FileText, Sparkles, MessageCircle, Upload, Copy, Check, RefreshCw, ChevronLeft, ChevronRight, Trophy, Layers, Palette, Eye, Trash2, Headphones } from "lucide-react";
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
import { PodcastInterface } from "@/components/podcast/PodcastInterface";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { API_BASE } from "@/lib/api";
import { EditableTitle } from "@/components/ui/EditableTitle";

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
    project?: {
        id: string;
        title: string;
    };
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
    const getInitialTab = (): 'transcript' | 'summary' | 'chat' | 'quiz' | 'flashcards' | 'studio' | 'view' | 'podcast' => {
        const urlTab = searchParams.get('tab');
        if (urlTab && ['transcript', 'summary', 'chat', 'quiz', 'flashcards', 'studio', 'view', 'podcast'].includes(urlTab)) {
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

    const [activeTab, setActiveTab] = useState<'transcript' | 'summary' | 'chat' | 'quiz' | 'flashcards' | 'studio' | 'view' | 'podcast'>(getInitialTab());
    const [isChatPinned, setIsChatPinned] = useState(false);
    const [studioDropdownOpen, setStudioDropdownOpen] = useState(false);
    const [socialMediaExpanded, setSocialMediaExpanded] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Initial load for pinned state from localstorage
    useEffect(() => {
        const saved = localStorage.getItem('vk_chat_pinned');
        if (saved === 'true') {
            setIsChatPinned(true);
            // If starting with chat tab but pinned, move to transcript
            if (activeTab === 'chat') setActiveTab('transcript');
        }
    }, [params.id]);

    // ── Citation Scrolling ──
    useEffect(() => {
        const handleCitationClick = (e: any) => {
            const chunk = e.detail;
            console.log("[Citation] Action requested:", chunk);
            if (!chunk || !chunk.content_text) return;

            // 1. Switch to transcript tab if not already there
            if (activeTab !== 'transcript') {
                setActiveTab('transcript');
            }

            // 2. Wait for tab to render, then search and scroll
            setTimeout(() => {
                const transcriptContainer = document.querySelector('.prose-sm');
                if (!transcriptContainer) {
                   console.error("Transcript container not found");
                   return;
                }

                const searchText = chunk.content_text.substring(0, 100).trim();
                const paragraphs = transcriptContainer.querySelectorAll('p');
                let found = false;

                paragraphs.forEach(p => {
                    if (p.textContent?.includes(searchText)) {
                        p.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        p.classList.add('bg-yellow-200', 'dark:bg-yellow-900/40', 'transition-all', 'duration-1000', 'rounded-lg', 'p-2');
                        setTimeout(() => {
                            p.classList.remove('bg-yellow-200', 'dark:bg-yellow-900/40');
                        }, 3000);
                        found = true;
                    }
                });

                if (!found) {
                   console.warn("Could not find citation text in transcript:", searchText);
                }
            }, 300);
        };

        window.addEventListener('CITATION_CLICKED', handleCitationClick);
        return () => window.removeEventListener('CITATION_CLICKED', handleCitationClick);
    }, [activeTab]);

    // Toggle pin and persist
    const toggleChatPin = () => {
        const newState = !isChatPinned;
        setIsChatPinned(newState);
        localStorage.setItem('vk_chat_pinned', newState.toString());
        // If pinning, move away from chat tab to transcript so we have something to see on the left
        if (newState && activeTab === 'chat') {
            handleTabChange('transcript');
        }
    };

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && ['transcript', 'summary', 'chat', 'quiz', 'flashcards', 'studio', 'view', 'podcast'].includes(tab)) {
            setActiveTab(tab as any);
        }
    }, [searchParams]);

    // Handler to change tabs and persist selection
    const handleTabChange = (tab: 'transcript' | 'summary' | 'chat' | 'quiz' | 'flashcards' | 'studio' | 'view' | 'podcast') => {
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

    const loadSource = useCallback(async () => {
        // Only set loading on initial load, not during polling
        const isInitialLoad = !source;
        if (isInitialLoad) setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const headers: HeadersInit = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(`${API_BASE}/sources/${params.id}`, { headers });
            if (response.ok) {
                const data = await response.json();

                // Check if content just became available (was processing, now has content)
                const wasProcessing = isProcessing;
                const hasContent = data.content_text && data.content_text.length > 0 && !data.content_text.includes('[Content extraction failed');

                setSource(data);

                // Check processing status
                if (data.meta_data?.status === 'processing') {
                    setIsProcessing(true);
                    // Poll again in 3 seconds to check if processing is complete
                    setTimeout(loadSource, 3000);
                } else {
                    setIsProcessing(false);

                    // Refresh sidebar in two cases:
                    // 1. If we were processing and now have content (polling detected completion)
                    // 2. If this is initial load and content exists (page loaded after completion)
                    const shouldRefresh = (wasProcessing && hasContent) || (isInitialLoad && hasContent);

                    if (shouldRefresh) {
                        console.log('Refreshing sidebar - wasProcessing:', wasProcessing, 'isInitialLoad:', isInitialLoad);
                        // Small delay to ensure DB update is propagated
                        setTimeout(() => {
                            window.dispatchEvent(new Event('refresh-sidebar'));
                        }, 500);
                    }
                }

                // Load existing summary if available
                if (data.summary) {
                    setSummary(data.summary);
                }

                // Auto-show paste panel only on explicit extraction failure strings
                const failedPhrases = [
                    "Transcript extraction failed",
                    "[Content extraction failed",
                    "I'm sorry, but the provided text does not contain",
                    "login or registration page",
                    "does not contain any main content",
                    "unable to extract",
                ];
                const hasRealContent = data.content_text && data.content_text.trim().length > 100;
                const hasErrorPhrase = failedPhrases.some(p => data.content_text?.includes(p));
                if (hasErrorPhrase) {
                    setShowTranscriptUpload(true);
                } else if (hasRealContent) {
                    // Good content arrived — make sure paste panel is hidden
                    setShowTranscriptUpload(false);
                }

            }
        } catch (error) {
            console.error("Error loading source:", error);
            setIsProcessing(false);
        } finally {
            setLoading(false);
        }
    }, [params.id, isProcessing, source]);

    // Use a ref to access the latest loadSource without triggering re-effects
    const loadSourceRef = useRef(loadSource);
    useEffect(() => {
        loadSourceRef.current = loadSource;
    }, [loadSource]);

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

    // Listen for sidebar refresh events to keep title in sync
    useEffect(() => {
        const handleRefresh = () => {
            loadSourceRef.current();
        };
        window.addEventListener('refresh-sidebar', handleRefresh);
        return () => window.removeEventListener('refresh-sidebar', handleRefresh);
    }, []);

    const handleUpdateTitle = async (newTitle: string) => {
        if (!source?.project_id) return;
        try {
            const token = localStorage.getItem('token');
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(`${API_BASE}/sources/projects/${source.project_id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ title: newTitle })
            });

            if (response.ok) {
                // Reload source to get updated title
                loadSource();
                // Dispatch event to update sidebar
                window.dispatchEvent(new Event('refresh-sidebar'));
            }
        } catch (error) {
            console.error("Failed to update title:", error);
            toast.error("Failed to update project title");
        }
    };

    const loadNavigation = async () => {
        if (!source?.project_id) return;

        // Skip for guests
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) return;

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

    const executeDeleteProject = async (projectId: string) => {
        // GUEST MODE HANDLER
        if (!isAuthenticated) {
            const current = JSON.parse(localStorage.getItem('guest_projects') || '[]');
            const updated = current.filter((p: Project) => String(p.id) !== String(projectId));
            localStorage.setItem('guest_projects', JSON.stringify(updated));
            window.dispatchEvent(new Event('refresh-sidebar'));
            toast.success("Project deleted successfully");
            router.push('/');
            return;
        }

        try {
            await projectsApi.delete(projectId);
            toast.success("Project deleted successfully");
            window.dispatchEvent(new Event('refresh-sidebar'));
            router.push('/');
        } catch (error) {
            console.error("Failed to delete project:", error);
            toast.error("Failed to delete project");
        }
    };

    const handleDeleteProject = () => {
        if (!source?.project_id) return;

        toast("Are you sure you want to delete this project?", {
            description: "This action cannot be undone.",
            action: {
                label: "Delete",
                onClick: () => executeDeleteProject(source.project_id!),
            },
        });
    };

    // Check if user is authenticated for UI conditional rendering
    const isAuthenticated = typeof window !== 'undefined' && !!localStorage.getItem('token');

    // loadChatHistory removed (handled by ChatInterface)

    const handleGenerateSummary = useCallback(async () => {
        setGenerating(true);
        try {
            // If summary already exists, we are regenerating, so force=true
            const force = !!summary;

            const token = localStorage.getItem('token');
            const headers: HeadersInit = { "Content-Type": "application/json" };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(`${API_BASE}/ai/summarize/${params.id}?force=${force}`, {
                method: "POST",
                headers,
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
            const token = localStorage.getItem('token');
            const headers: HeadersInit = { "Content-Type": "application/json" };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(`${API_BASE}/sources/${params.id}/transcript`, {
                method: "PUT",
                headers,
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
        try {
            await navigator.clipboard.writeText(text);
            if (type === 'transcript') {
                setCopiedTranscript(true);
                setTimeout(() => setCopiedTranscript(false), 2000);
            } else {
                setCopiedSummary(true);
                setTimeout(() => setCopiedSummary(false), 2000);
            }
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };


    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">Loading workspace…</p>
                </div>
            </div>
        );
    }

    if (!source) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <p className="text-slate-500 dark:text-slate-400">Source not found</p>
            </div>
        );
    }

    // Tab definitions — matches original exactly: Transcript, Summary, Chat, [Studio dropdown], View
    const TABS = [
        { id: 'transcript' as const, icon: <FileText className="h-4 w-4" />,      label: 'Transcript' },
        { id: 'summary'    as const, icon: <Sparkles className="h-4 w-4" />,       label: 'Summary' },
        { id: 'podcast'    as const, icon: <Headphones className="h-4 w-4" />,     label: 'Podcast' },
        { id: 'chat'       as const, icon: <MessageCircle className="h-4 w-4" />,  label: 'Chat' },
    ] as const;

    const visibleTabs = TABS.filter(tab => !(isChatPinned && tab.id === 'chat'));

    return (
        <div className="h-full flex flex-col gap-4 overflow-hidden pr-1">

            {/* ── Workspace header ─────────────────────────────────────── */}
            <div className="flex-none bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/30 dark:border-slate-800/40 shadow-sm relative z-10">

                {/* Title + actions */}
                <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3">
                    <div className="min-w-0 flex-1">
                        <EditableTitle
                            initialValue={source.project?.title || source.title}
                            onSave={handleUpdateTitle}
                            isHeader={true}
                            className="mb-0.5"
                        />
                        {source.url && (
                            <a href={source.url} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-indigo-500 dark:text-indigo-400 hover:underline truncate block max-w-xl font-mono opacity-75 mt-0.5">
                                {source.url}
                            </a>
                        )}
                    </div>
                    <div className="flex items-center gap-1 pt-0.5 flex-shrink-0">
                        {isAuthenticated && prevProject && (
                            <a href={`/source/${prevProject}`}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all" title="Previous">
                                <ChevronLeft className="h-4 w-4" />
                            </a>
                        )}
                        {isAuthenticated && nextProject && (
                            <a href={`/source/${nextProject}`}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all" title="Next">
                                <ChevronRight className="h-4 w-4" />
                            </a>
                        )}
                        {isAuthenticated && (
                            <button onClick={handleDeleteProject}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all" title="Delete project">
                                <Trash2 className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Tab strip — underline style ── */}
                <div className="flex items-end border-t border-slate-100 dark:border-slate-800/80 px-2 relative">

                    {/* Static tabs */}
                    {visibleTabs.map(tab => (
                        <button key={tab.id} onClick={() => handleTabChange(tab.id)}
                            className={cn(
                                "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-200 border-b-2 -mb-px",
                                activeTab === tab.id
                                    ? "border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50/40 dark:bg-indigo-900/10"
                                    : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                            )}>
                            {tab.icon}
                            <span>{tab.label}</span>
                        </button>
                    ))}

                    {/* Studio dropdown — hover to open, same behaviour as original */}
                    <div className="relative" ref={dropdownRef}
                        onMouseEnter={() => setStudioDropdownOpen(true)}
                        onMouseLeave={() => { setStudioDropdownOpen(false); setSocialMediaExpanded(false); }}>
                        <button
                            className={cn(
                                "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-200 border-b-2 -mb-px",
                                activeTab === 'studio' || studioDropdownOpen
                                    ? "border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50/40 dark:bg-indigo-900/10"
                                    : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                            )}>
                            <Palette className="h-4 w-4" />
                            <span>Studio</span>
                            <ChevronRight className="h-3 w-3 rotate-90 opacity-40" />
                        </button>

                        {studioDropdownOpen && (
                            <div className="absolute top-full left-0 mt-1 w-52 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200/30 dark:border-slate-800/40 py-1.5 z-[200] before:absolute before:-top-2 before:left-0 before:w-full before:h-2 before:content-['']">
                                <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 mb-1">
                                    Content Studio
                                </div>
                                {[
                                    { tool: 'diagram',    icon: <Sparkles className="h-3.5 w-3.5" />,    label: 'Diagrams' },
                                    { tool: 'article',    icon: <FileText className="h-3.5 w-3.5" />,     label: 'Articles' },
                                    { tool: 'quiz',       icon: <Trophy className="h-3.5 w-3.5" />,       label: 'Quiz' },
                                    { tool: 'flashcards', icon: <Layers className="h-3.5 w-3.5" />,       label: 'Flashcards' },
                                ].map(item => (
                                    <button key={item.tool}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleTabChange('studio');
                                            window.history.replaceState(null, '', `?tab=studio&tool=${item.tool}`);
                                            window.dispatchEvent(new CustomEvent('studio-tool-change', { detail: item.tool }));
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/25 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                                        <span className="text-slate-400 dark:text-slate-500">{item.icon}</span>
                                        {item.label}
                                    </button>
                                ))}

                                {/* Social media submenu */}
                                <div onMouseEnter={() => setSocialMediaExpanded(true)}
                                    onMouseLeave={() => setSocialMediaExpanded(false)}>
                                    <button className="w-full flex items-center justify-between gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/25 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                                        <div className="flex items-center gap-2.5">
                                            <span className="text-slate-400 dark:text-slate-500"><MessageCircle className="h-3.5 w-3.5" /></span>
                                            Social Media
                                        </div>
                                        <ChevronRight className={cn("h-3.5 w-3.5 opacity-40 transition-transform", socialMediaExpanded && "rotate-90")} />
                                    </button>
                                    {socialMediaExpanded && (
                                        <div className="pl-3 pb-1">
                                            {[
                                                { platform: 'twitter',   label: 'Twitter Thread' },
                                                { platform: 'linkedin',  label: 'LinkedIn Post' },
                                                { platform: 'instagram', label: 'Instagram Caption' },
                                            ].map(s => (
                                                <button key={s.platform}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSocialMediaExpanded(false);
                                                        handleTabChange('studio');
                                                        window.history.replaceState(null, '', `?tab=studio&tool=social&platform=${s.platform}`);
                                                        window.dispatchEvent(new CustomEvent('studio-tool-change', { detail: 'social' }));
                                                        window.dispatchEvent(new CustomEvent('social-platform-change', { detail: s.platform }));
                                                    }}
                                                    className="w-full text-left px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/60 dark:hover:bg-indigo-900/20 rounded-lg transition-colors">
                                                    {s.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* View tab */}
                    <button onClick={() => handleTabChange('view')}
                        className={cn(
                            "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-200 border-b-2 -mb-px",
                            activeTab === 'view'
                                ? "border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50/40 dark:bg-indigo-900/10"
                                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                        )}>
                        <Eye className="h-4 w-4" />
                        <span>View</span>
                    </button>

                    {/* Chat Pin Toggle — Spotlight style */}
                    <div className="flex-1 flex justify-end items-center pr-4">
                        <button
                            onClick={toggleChatPin}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 shadow-sm",
                                isChatPinned 
                                    ? "bg-indigo-600 text-white shadow-indigo-500/20" 
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                            )}
                            title={isChatPinned ? "Unpin Chat (Full Screen)" : "Pin Chat (Split Screen)"}
                        >
                            <MessageCircle className={cn("h-3.5 w-3.5", isChatPinned && "animate-pulse")} />
                            <span>{isChatPinned ? 'Chat Pinned' : 'Pin Chat'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Main Content Area — Dynamic Layout for Pinning ──────── */}
            <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
                
                {/* Left Pane (70% if pinned, 100% if not) */}
                <div className={cn(
                    "flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/30 dark:border-slate-800/40 shadow-sm overflow-hidden flex flex-col relative group transition-all duration-500",
                    isChatPinned ? "flex-[0.60]" : "flex-1"
                )}>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8">
                        {/* Transcript */}
                        {activeTab === 'transcript' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-indigo-500" /> Source Transcript
                                    </h2>
                                    {!showTranscriptUpload && !isProcessing && (
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => setShowTranscriptUpload(true)}
                                                className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Edit transcript">
                                                <RefreshCw className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => copyToClipboard(source.content_text || '', 'transcript')}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all">
                                                {copiedTranscript ? <><Check className="h-3.5 w-3.5 text-emerald-500" />Copied</> : <><Copy className="h-3.5 w-3.5" />Copy</>}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {showTranscriptUpload && (
                                    <div className="mb-6 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/30 dark:bg-indigo-900/10 animate-in zoom-in-95 duration-200">
                                        <textarea
                                            value={manualTranscript}
                                            onChange={(e) => setManualTranscript(e.target.value)}
                                            placeholder="Paste the page content here..."
                                            rows={10}
                                            className="w-full px-4 py-3 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 resize-none leading-relaxed"
                                        />
                                        <div className="flex items-center gap-3 mt-3">
                                            <button
                                                onClick={handleManualTranscriptUpload}
                                                disabled={uploading || !manualTranscript.trim()}
                                                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm">
                                                {uploading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving…</> : <>Use this content</>}
                                            </button>
                                            <button
                                                onClick={() => { setShowTranscriptUpload(false); setManualTranscript(""); }}
                                                className="px-4 py-2.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {isProcessing ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-center">
                                        <div className="h-14 w-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-4">
                                            <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
                                        </div>
                                        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">Processing your content</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">This usually takes under 30 seconds.</p>
                                        <button onClick={fetchSource}
                                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all">
                                            <RefreshCw className="h-3.5 w-3.5" />Check status
                                        </button>
                                    </div>
                                ) : !showTranscriptUpload && (
                                    <div className="prose prose-sm dark:prose-invert max-w-none space-y-4">
                                        {(source.content_text || "").split(/\n\s*\n/).map((para, i) => (
                                            <p key={i} className="text-slate-700 dark:text-slate-300 leading-relaxed text-[15px] font-medium selection:bg-indigo-500/30">
                                                {para}
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Summary */}
                        {activeTab === 'summary' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <Sparkles className="h-5 w-5 text-indigo-400" /> AI Executive Summary
                                    </h2>
                                    <div className="flex items-center gap-2">
                                        {source.summary && (
                                            <button onClick={() => { navigator.clipboard.writeText(source.summary || ''); setCopiedSummary(true); setTimeout(() => setCopiedSummary(false), 2000); }}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all">
                                                {copiedSummary ? <><Check className="h-3.5 w-3.5 text-emerald-500" />Copied</> : <><Copy className="h-3.5 w-3.5" />Copy</>}
                                            </button>
                                        )}
                                        <button onClick={handleGenerateSummary} disabled={generating}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-500/20">
                                            {generating ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Generating…</> : <><RefreshCw className="h-3.5 w-3.5" />{source.summary ? 'Regenerate' : 'Generate'}</>}
                                        </button>
                                    </div>
                                </div>
                                
                                {source.summary ? (
                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm, remarkMath]}
                                            rehypePlugins={[rehypeKatex]}
                                            components={{
                                                h1: ({ node, ...props }) => <h1 className="!text-xl !font-bold !mt-6 !mb-3 !text-slate-900 dark:!text-white" {...props} />,
                                                h2: ({ node, ...props }) => <h2 className="!text-lg !font-bold !mt-5 !mb-2 !text-slate-900 dark:!text-white" {...props} />,
                                                h3: ({ node, ...props }) => <h3 className="!text-base !font-semibold !mt-4 !mb-2 !text-slate-900 dark:!text-white" {...props} />,
                                                p:  ({ node, ...props }) => <p  className="!mb-3 !text-slate-700 dark:!text-slate-300 !leading-relaxed !text-[15px]" {...props} />,
                                                ul: ({ node, ...props }) => <ul className="!list-disc !list-inside !mb-4 !space-y-2 !text-slate-700 dark:!text-slate-300" {...props} />,
                                                blockquote: ({ node, ...props }) => <blockquote className="!border-l-4 !border-indigo-500 !bg-indigo-50/30 dark:!bg-indigo-900/10 !p-4 !rounded-r-xl !italic !text-slate-800 dark:!text-slate-200 !my-6" {...props} />,
                                            }}
                                        >
                                            {source.summary}
                                        </ReactMarkdown>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 text-center">
                                        <div className="h-16 w-16 rounded-3xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-4">
                                            <Sparkles className="h-8 w-8 text-indigo-400" />
                                        </div>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Ready to distill the signal from the noise.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Podcast */}
                        {activeTab === 'podcast' && <PodcastInterface sourceId={source.id} />}

                        {/* Chat (Full Screen mode only) */}
                        {activeTab === 'chat' && !isChatPinned && (
                            <div className="flex-1 flex flex-col -m-6 sm:-m-8 overflow-hidden">
                                <ChatInterface sourceId={source.id} />
                            </div>
                        )}

                        {/* Studio */}
                        {activeTab === 'studio' && <StudioInterface sourceId={source.id} />}

                        {/* View */}
                        {activeTab === 'view' && (
                            <div className="h-full flex flex-col -m-6 sm:-m-8 overflow-hidden">
                                 <ContentViewer url={source.url || ''} title={source.title || 'Untitled'} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Pane (Persistent Chat if pinned) */}
                {isChatPinned && (
                    <div className="flex-[0.40] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/30 dark:border-slate-800/40 shadow-sm overflow-hidden flex flex-col animate-in slide-in-from-right-4 duration-500 border-l-4 border-l-indigo-500/30">
                        <div className="flex-none p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
                                <MessageCircle className="h-4 w-4 text-indigo-500" /> RESEARCH CHAT
                            </h3>
                            <button onClick={toggleChatPin} className="p-1 px-2.5 text-[10px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-slate-600">
                                Close Split View
                            </button>
                        </div>
                        <div className="flex-1 overflow-hidden h-full">
                            <ChatInterface sourceId={source.id} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
