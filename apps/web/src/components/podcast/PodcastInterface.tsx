"use client";

import { useEffect, useState, useRef } from "react";
import { Headphones, Play, Pause, Loader2, RefreshCw, Volume2, Download, Check, AlertTriangle, ExternalLink, Sparkles, FileText } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface PodcastSegment {
    speaker: string;
    text: string;
}

interface PodcastData {
    id: string;
    title: string;
    status: "processing" | "ready" | "error" | "not_found";
    audio_url: string | null;
    segments: PodcastSegment[];
}

export function PodcastInterface({ sourceId }: { sourceId: string }) {
    const [data, setData] = useState<PodcastData | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const loadStatus = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers: HeadersInit = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(`${API_BASE}/ai/podcast/${sourceId}/status`, { headers });
            if (res.ok) {
                const podcast = await res.json();
                setData(podcast);
                
                // If it's still processing, poll again
                if (podcast.status === "processing") {
                    setTimeout(loadStatus, 3000);
                }
            }
        } catch (error) {
            console.error("Error loading podcast status:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async (force: boolean = false) => {
        setGenerating(true);
        try {
            const token = localStorage.getItem('token');
            const headers: HeadersInit = { "Content-Type": "application/json" };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            // Attach AI Provider Keys
            try {
                const keys = JSON.parse(localStorage.getItem("vk_provider_keys") || "{}");
                const prefs = JSON.parse(localStorage.getItem("vk_ai_prefs") || "{}");
                if (keys.openai) headers["X-OpenAI-Key"] = keys.openai;
                if (keys.anthropic) headers["X-Anthropic-Key"] = keys.anthropic;
                if (keys.google) headers["X-Google-Key"] = keys.google;
                if (prefs.defaultProvider) headers["X-AI-Provider"] = prefs.defaultProvider;
            } catch (e) { /* localStorage unavailable */ }

            const response = await fetch(`${API_BASE}/ai/podcast/${sourceId}?force=${force}`, {
                method: "POST",
                headers,
            });

            if (response.ok) {
                const result = await response.json();
                const artifactData = result.content || result;
                setData(artifactData); 
                if (artifactData.status === "processing") {
                    setTimeout(loadStatus, 3000);
                }
            } else {
                toast.error("Failed to start podcast generation");
            }
        } catch (error) {
            console.error("Error starting podcast:", error);
            toast.error("Failed to start podcast generation");
        } finally {
            setGenerating(false);
        }
    };

    useEffect(() => {
        loadStatus();
    }, [sourceId]);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    const formatTime = (time: number) => {
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const onAudioEnd = () => {
        setIsPlaying(false);
        setCurrentTime(0);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                <p className="text-sm text-slate-500">Checking for existing podcast...</p>
            </div>
        );
    }

    if (!data || data.status === "not_found") {
        return (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-6 shadow-xl shadow-indigo-500/20">
                    <Headphones className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">AI Podcast Creator</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8 leading-relaxed">
                    Generate a high-energy conversation between two AI hosts discussing your source. Perfect for listening on the go or getting a quick deep-dive.
                </p>
                <button
                    onClick={() => handleGenerate(false)}
                    disabled={generating}
                    className="group relative flex items-center gap-2.5 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-lg hover:shadow-indigo-500/40 disabled:opacity-50"
                >
                    {generating ? (
                        <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Drafting Script...
                        </>
                    ) : (
                        <>
                            <RefreshCw className="h-5 w-5 group-hover:rotate-180 transition-transform duration-500" />
                            Generate Audio Overview
                        </>
                    )}
                </button>
                <p className="mt-4 text-[10px] text-slate-400 uppercase tracking-widest font-semibold flex items-center gap-1.5 opacity-60">
                    <Sparkles className="h-3 w-3" /> Powered by OpenAI Advanced Audio
                </p>
            </div>
        );
    }

    if (data.status === "processing") {
        return (
            <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
                <div className="relative mb-10">
                    <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
                    <div className="relative h-24 w-24 rounded-3xl bg-indigo-600 flex items-center justify-center shadow-2xl">
                        <Loader2 className="h-12 w-12 animate-spin text-white" />
                    </div>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Directing the Studio</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-xs mb-6">
                    Alex and Sam are in the studio recording your podcast. This will take about 30-60 seconds.
                </p>
                <div className="w-64 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                        className="h-full bg-indigo-600"
                        initial={{ width: "10%" }}
                        animate={{ width: "95%" }}
                        transition={{ duration: 45, ease: "linear" }}
                    />
                </div>
            </div>
        );
    }

    if (data.status === "error") {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <div className="h-16 w-16 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Studio Error</h3>
                <button onClick={() => handleGenerate(true)} className="text-indigo-600 font-semibold hover:underline">Retry generation</button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 py-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* ── AUDIO PLAYER CARD ────────────────────────────────────────── */}
            <div className="bg-white/80 dark:bg-[#1a1e30]/60 backdrop-blur-xl p-8 rounded-3xl border border-slate-200/70 dark:border-[#383e59] shadow-sm overflow-hidden relative group">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-1000" />
                
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                    {/* Art Cove */}
                    <div className="relative h-40 w-40 flex-shrink-0">
                        <div className={cn(
                            "absolute inset-0 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl shadow-xl transition-transform duration-500",
                            isPlaying && "scale-105"
                        )} />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Headphones className="h-16 w-16 text-white/90" />
                        </div>
                        {isPlaying && (
                            <div className="absolute -bottom-2 -right-2 flex gap-1 h-8 items-end p-2 bg-black/40 backdrop-blur-md rounded-lg">
                                {[...Array(4)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        className="w-1.5 bg-white rounded-full"
                                        animate={{ height: ["20%", "70%", "40%", "90%", "30%"] }}
                                        transition={{ duration: 0.5 + i * 0.1, repeat: Infinity, ease: "easeInOut" }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 w-full text-center md:text-left">
                        <div className="flex items-center gap-3 mb-2 justify-center md:justify-start">
                            <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-widest">Original Overview</span>
                            <span className="text-[11px] text-slate-400 font-medium">with Alex & Sam</span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4 tracking-tight leading-tight">{data.title}</h2>
                        
                        {/* Audio Controls */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={togglePlay}
                                    className="h-14 w-14 rounded-full bg-slate-900 dark:bg-white text-white dark:text-black flex items-center justify-center shadow-lg transform active:scale-95 transition-all"
                                >
                                    {isPlaying ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current ml-1" />}
                                </button>
                                
                                <div className="flex-1">
                                    <input 
                                        type="range"
                                        min="0"
                                        max={duration}
                                        value={currentTime}
                                        onChange={(e) => {
                                            if (audioRef.current) {
                                                audioRef.current.currentTime = parseFloat(e.target.value);
                                                setCurrentTime(parseFloat(e.target.value));
                                            }
                                        }}
                                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-indigo-500"
                                    />
                                    <div className="flex justify-between mt-1.5 text-[10px] font-bold font-mono text-slate-400">
                                        <span>{formatTime(currentTime)}</span>
                                        <span>{formatTime(duration)}</span>
                                    </div>
                                </div>
                                
                                <a 
                                    href={API_BASE + data.audio_url} 
                                    download 
                                    target="_blank"
                                    className="p-3 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                                >
                                    <Download className="h-5 w-5" />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <audio 
                    ref={audioRef}
                    src={API_BASE + data.audio_url}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={onAudioEnd}
                />
            </div>

            {/* ── TRANSCRIPT ─────────────────────────────────────────────────── */}
            <div className="bg-white/80 dark:bg-[#1a1e30]/60 backdrop-blur-xl rounded-3xl border border-slate-200/70 dark:border-[#383e59] shadow-sm p-8">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <FileText className="h-5 w-5 text-indigo-500" /> Podcast Script
                    </h3>
                    <button 
                        onClick={() => handleGenerate(true)}
                        disabled={generating}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-all disabled:opacity-50"
                    >
                        {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        REGENERATE
                    </button>
                </div>
                
                <div className="space-y-8">
                    {data.segments && data.segments.map((seg, i) => (
                        <div key={i} className="flex gap-4 group">
                            <div className={cn(
                                "flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center font-bold text-xs shadow-sm transition-transform group-hover:scale-110",
                                seg.speaker === "Alex" 
                                    ? "bg-indigo-600 text-white" 
                                    : "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-zinc-300"
                            )}>
                                {seg.speaker[0]}
                            </div>
                            <div className="flex-1">
                                <span className={cn(
                                    "text-[10px] font-bold uppercase tracking-wider mb-1 block",
                                    seg.speaker === "Alex" ? "text-indigo-600" : "text-slate-400"
                                )}>
                                    {seg.speaker}
                                </span>
                                <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-sans text-base">
                                    {seg.text}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
