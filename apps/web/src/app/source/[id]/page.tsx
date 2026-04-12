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
import { VanguardPanel } from "@/components/vanguard/VanguardPanel";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { API_BASE, buildAIHeaders } from "@/lib/api";
import { EditableTitle } from "@/components/ui/EditableTitle";
import { useSourceProgress } from "@/hooks/useSourceProgress";
import { MasteryRing, ProgressSteps, SmartNudgeBar, VanguardBadge } from "@/components/progress/SourceProgressUI";

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

export default function SourcePage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const [source, setSource] = useState<Source | null>(null);
    const [loading, setLoading] = useState(true);

    const getInitialTab = (): 'transcript' | 'summary' | 'chat' | 'quiz' | 'flashcards' | 'studio' | 'view' | 'podcast' => {
        const urlTab = searchParams.get('tab');
        if (urlTab && ['transcript', 'summary', 'chat', 'quiz', 'flashcards', 'studio', 'view', 'podcast'].includes(urlTab)) {
            return urlTab as any;
        }
        if (typeof window !== 'undefined') {
            const savedTab = localStorage.getItem(`source-${params.id}-tab`);
            if (savedTab && ['transcript', 'summary', 'chat', 'quiz', 'flashcards', 'studio', 'view', 'podcast'].includes(savedTab)) {
                return savedTab as any;
            }
        }
        return 'transcript';
    };

    const [activeTab, setActiveTab] = useState<'transcript' | 'summary' | 'chat' | 'quiz' | 'flashcards' | 'studio' | 'view' | 'podcast'>(getInitialTab());
    const [studioDropdownOpen, setStudioDropdownOpen] = useState(false);
    const [studioDropdownPos, setStudioDropdownPos] = useState({ top: 0, left: 0 });
    const studioCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [socialMediaExpanded, setSocialMediaExpanded] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const studioButtonRef = useRef<HTMLButtonElement>(null);
    const tabBarRef = useRef<HTMLDivElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);

    const openStudioDropdown = () => {
        if (studioCloseTimerRef.current) clearTimeout(studioCloseTimerRef.current);
        if (studioButtonRef.current && tabBarRef.current) {
            const br = studioButtonRef.current.getBoundingClientRect();
            const or = tabBarRef.current.getBoundingClientRect();
            setStudioDropdownPos({ top: br.bottom - or.top, left: br.left - or.left });
        }
        setStudioDropdownOpen(true);
    };

    const closeStudioDropdown = () => {
        studioCloseTimerRef.current = setTimeout(() => setStudioDropdownOpen(false), 100);
    };

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && ['transcript', 'summary', 'chat', 'quiz', 'flashcards', 'studio', 'view', 'podcast'].includes(tab)) {
            setActiveTab(tab as any);
        }
    }, [searchParams]);

    const handleTabChange = (tab: any) => {
        setActiveTab(tab);
        setStudioDropdownOpen(false);
        if (typeof window !== 'undefined') {
            localStorage.setItem(`source-${params.id}-tab`, tab);
            window.history.replaceState(null, '', `?tab=${tab}`);
        }
    };

    const [generating, setGenerating] = useState(false);
    const [summary, setSummary] = useState("");
    const [showTranscriptUpload, setShowTranscriptUpload] = useState(false);
    const [manualTranscript, setManualTranscript] = useState("");
    const [uploading, setUploading] = useState(false);
    const [copiedTranscript, setCopiedTranscript] = useState(false);
    const [copiedSummary, setCopiedSummary] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [prevProject, setPrevProject] = useState<string | null>(null);
    const [nextProject, setNextProject] = useState<string | null>(null);

    const loadSource = useCallback(async () => {
        const isInitialLoad = !source;
        if (isInitialLoad) setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const headers: HeadersInit = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(`${API_BASE}/sources/${params.id}`, { headers });
            if (response.ok) {
                const data = await response.json();
                const wasProcessing = isProcessing;
                const hasContent = data.content_text && data.content_text.length > 0 && !data.content_text.includes('[Content extraction failed');

                setSource(data);
                if (data.meta_data?.status === 'processing') {
                    setIsProcessing(true);
                    setTimeout(loadSource, 3000);
                } else {
                    setIsProcessing(false);
                    const shouldRefresh = (wasProcessing && hasContent) || (isInitialLoad && hasContent);
                    if (shouldRefresh) {
                        setTimeout(() => {
                            window.dispatchEvent(new Event('refresh-sidebar'));
                        }, 500);
                    }
                }
                if (data.summary) setSummary(data.summary);
                
                const failedPhrases = ["Transcript extraction failed", "[Content extraction failed"];
                const hasErrorPhrase = failedPhrases.some(p => data.content_text?.includes(p));
                if (hasErrorPhrase) setShowTranscriptUpload(true);
                else if (data.content_text && data.content_text.trim().length > 100) setShowTranscriptUpload(false);
            }
        } catch (error) {
            console.error("Error loading source:", error);
            setIsProcessing(false);
        } finally {
            setLoading(false);
        }
    }, [params.id, isProcessing, source]);

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

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setStudioDropdownOpen(false);
                setSocialMediaExpanded(false);
            }
        };
        if (studioDropdownOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [studioDropdownOpen]);

    useEffect(() => {
        const handleRefresh = () => loadSourceRef.current();
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
                loadSource();
                window.dispatchEvent(new Event('refresh-sidebar'));
            }
        } catch (error) {
            console.error("Failed to update title:", error);
            toast.error("Failed to update project title");
        }
    };

    const loadNavigation = async () => {
        if (!source?.project_id) return;
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) return;

        try {
            const allProjects = await projectsApi.list();
            const currentIndex = allProjects.findIndex(p => p.id === source.project_id);
            if (currentIndex === -1) return;

            const currentProject = allProjects[currentIndex];
            const categoryProjects = currentProject.category_id
                ? allProjects.filter(p => p.category_id === currentProject.category_id)
                : allProjects.filter(p => !p.category_id);

            const index = categoryProjects.findIndex(p => p.id === source.project_id);
            if (index > 0) setPrevProject(categoryProjects[index - 1].first_source_id || null);
            if (index < categoryProjects.length - 1) setNextProject(categoryProjects[index + 1].first_source_id || null);
        } catch (error) {
            console.error("Error loading navigation:", error);
        }
    };

    const executeDeleteProject = async (projectId: string) => {
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

    const isAuthenticated = typeof window !== 'undefined' && !!localStorage.getItem('token');
    const progress = useSourceProgress(params.id as string, source);

    const handleGenerateSummary = useCallback(async () => {
        setGenerating(true);
        try {
            const force = !!summary;
            const response = await fetch(`${API_BASE}/ai/summarize/${params.id}?force=${force}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...buildAIHeaders() },
            });
            if (response.ok) {
                const data = await response.json();
                setSummary(data.summary);
                if (source) setSource({ ...source, summary: data.summary });
            }
        } catch (error) {
            console.error("Error generating summary:", error);
        } finally {
            setGenerating(false);
        }
    }, [params.id, summary, source]);

    useEffect(() => {
        if (activeTab === 'summary' && source && !summary && !generating && !isProcessing) {
            handleGenerateSummary();
        }
    }, [activeTab, source, summary, generating, isProcessing, handleGenerateSummary]);

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
                loadSource();
                setShowTranscriptUpload(false);
                setManualTranscript("");
            }
        } catch (error) {
            console.error("Error uploading transcript:", error);
        } finally {
            setUploading(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-7 w-7 animate-spin text-[var(--secondary)]" />
        </div>
    );

    if (!source) return (
        <div className="flex items-center justify-center min-h-[60vh]">Source not found</div>
    );

    const TABS = [
        { id: 'transcript' as const, icon: <FileText className="h-4 w-4" />, label: 'Transcript' },
        { id: 'summary' as const, icon: <Sparkles className="h-4 w-4" />, label: 'Summary' },
        { id: 'podcast' as const, icon: <Headphones className="h-4 w-4" />, label: 'Podcast' },
        { id: 'chat' as const, icon: <MessageCircle className="h-4 w-4" />, label: 'Chat' },
    ] as const;

    return (
        <div className="h-full flex flex-col gap-4">
            {/* Header */}
            <div className="flex-none bg-[var(--card)]/80 backdrop-blur-xl rounded-2xl border border-[var(--surface-border-strong)] shadow-sm relative z-10">
                <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3">
                    <div className="min-w-0 flex-1">
                        <EditableTitle initialValue={source.project?.title || source.title} onSave={handleUpdateTitle} isHeader={true} />
                        {source.url && <a href={source.url} target="_blank" className="text-xs text-[var(--secondary)] truncate block mt-0.5">{source.url}</a>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {isAuthenticated && progress.hasVanguard && (
                            <div className="hidden sm:block">
                                <VanguardBadge count={progress.vanguardCount} onOpen={() => handleTabChange('chat')} />
                            </div>
                        )}
                        {isAuthenticated && !progress.loading && (
                            <div className="flex items-center gap-2.5 pl-2 border-l border-[var(--surface-border-strong)]">
                                <div className="hidden md:flex">
                                    <ProgressSteps progress={progress} onTabChange={handleTabChange} />
                                </div>
                                <MasteryRing score={progress.masteryScore} size={36} showLabel />
                            </div>
                        )}
                        {isAuthenticated && (
                            <div className="flex gap-1">
                                {prevProject && <a href={`/source/${prevProject}`} className="p-1.5"><ChevronLeft className="h-4 w-4" /></a>}
                                {nextProject && <a href={`/source/${nextProject}`} className="p-1.5"><ChevronRight className="h-4 w-4" /></a>}
                                <button onClick={handleDeleteProject} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                            </div>
                        )}
                    </div>
                </div>
                {isAuthenticated && !isProcessing && <SmartNudgeBar progress={progress} onTabChange={handleTabChange} />}
                
                <div ref={tabBarRef} className="border-t border-[var(--surface-border)] relative">
                    <div className="flex items-end overflow-x-auto no-scrollbar">
                        {TABS.map(tab => (
                            <button key={tab.id} onClick={() => handleTabChange(tab.id)}
                                className={cn("px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all whitespace-nowrap flex-shrink-0",
                                activeTab === tab.id ? "border-[var(--secondary)] text-[var(--secondary)] bg-[var(--secondary-light)]/30" : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]")}>
                                <span className="flex items-center gap-1.5">{tab.icon} {tab.label}</span>
                            </button>
                        ))}
                        <div className="flex-shrink-0" onMouseEnter={openStudioDropdown} onMouseLeave={closeStudioDropdown}>
                            <button ref={studioButtonRef} className={cn("px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 -mb-px flex items-center gap-1.5 whitespace-nowrap", activeTab === 'studio' ? "border-[var(--secondary)] text-[var(--secondary)]" : "border-transparent text-[var(--muted-foreground)]")}>
                                <Palette className="h-4 w-4" /> Studio <ChevronRight className="h-3 w-3 rotate-90" />
                            </button>
                        </div>
                        <button onClick={() => handleTabChange('view')}
                            className={cn("px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap flex-shrink-0", activeTab === 'view' ? "border-[var(--secondary)] text-[var(--secondary)]" : "border-transparent text-[var(--muted-foreground)]")}>
                            <span className="flex items-center gap-1.5"><Eye className="h-4 w-4" /> View</span>
                        </button>
                    </div>
                    {studioDropdownOpen && (
                        <div
                            className="absolute w-52 bg-[var(--surface-overlay)] rounded-xl shadow-2xl border border-[var(--surface-border-strong)] py-1.5 z-50"
                            style={{ top: studioDropdownPos.top, left: studioDropdownPos.left }}
                            onMouseEnter={() => { if (studioCloseTimerRef.current) clearTimeout(studioCloseTimerRef.current); }}
                            onMouseLeave={closeStudioDropdown}>
                            {['social', 'diagram', 'article', 'quiz', 'flashcards'].map(tool => (
                                <button key={tool} onClick={() => { handleTabChange('studio'); window.history.replaceState(null, '', `?tab=studio&tool=${tool}`); window.dispatchEvent(new CustomEvent('studio-tool-change', { detail: tool })); }}
                                    className="w-full text-left px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--secondary-light)] flex items-center gap-2">
                                    <Sparkles className="h-3.5 w-3.5" /> {tool.charAt(0).toUpperCase() + tool.slice(1)}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto min-h-0">
                {activeTab === 'studio' ? <StudioInterface sourceId={source.id} /> : (
                    <div className="flex flex-col lg:flex-row gap-6">
                        <div className="flex-1 space-y-6">
                            {activeTab === 'transcript' && (
                                <div className="vk-card vk-card-static p-6">
                                    <h2 className="text-lg font-bold flex items-center gap-2 mb-5 text-[var(--foreground)]"><FileText className="h-4.5 w-4.5" /> Transcript</h2>
                                    {isProcessing ? <Loader2 className="h-6 w-6 animate-spin mx-auto mt-10 text-[var(--secondary)]" /> : (
                                        <p className="whitespace-pre-wrap text-sm text-[var(--foreground)] max-w-none">{source.content_text}</p>
                                    )}
                                </div>
                            )}
                            {activeTab === 'summary' && (
                                <div className="vk-card vk-card-static p-6">
                                    <div className="flex items-center justify-between mb-5">
                                        <h2 className="text-lg font-bold flex items-center gap-2 text-[var(--foreground)]"><Sparkles className="h-4.5 w-4.5" /> AI Summary</h2>
                                        <button onClick={handleGenerateSummary} disabled={generating} className="vk-btn vk-btn-primary text-xs px-3 py-1.5">
                                            {generating ? 'Generating...' : 'Refresh'}
                                        </button>
                                    </div>
                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{source.summary || ''}</ReactMarkdown>
                                    </div>
                                </div>
                            )}
                            {activeTab === 'chat' && <ChatInterface sourceId={source.id} />}
                            {activeTab === 'podcast' && <PodcastInterface sourceId={source.id} />}
                            {activeTab === 'view' && <ContentViewer url={source.url || ''} title={source.title} />}
                        </div>
                        {(activeTab === 'summary' || activeTab === 'transcript' || activeTab === 'view') && (
                            <div className="lg:w-[340px] flex-none sticky top-4">
                                <VanguardPanel sourceId={source.id} projectId={source.project_id || ''} />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}