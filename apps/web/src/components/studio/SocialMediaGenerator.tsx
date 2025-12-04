"use client";

import { useState, useEffect } from "react";
import { Loader2, Share2, Copy, Check, Twitter, Linkedin, Instagram } from "lucide-react";
import { cn } from "@/lib/utils";

interface SocialMediaGeneratorProps {
    sourceId: string;
    title?: string;
}

export function SocialMediaGenerator({ sourceId, title = "Social Media Generator" }: SocialMediaGeneratorProps) {
    // Initialize platform from URL or localStorage
    const getInitialPlatform = (): 'twitter' | 'linkedin' | 'instagram' => {
        // Check URL first
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const urlPlatform = urlParams.get('platform');
            if (urlPlatform && ['twitter', 'linkedin', 'instagram'].includes(urlPlatform)) {
                return urlPlatform as 'twitter' | 'linkedin' | 'instagram';
            }

            const savedPlatform = localStorage.getItem(`source-${sourceId}-social-platform`);
            if (savedPlatform && ['twitter', 'linkedin', 'instagram'].includes(savedPlatform)) {
                return savedPlatform as 'twitter' | 'linkedin' | 'instagram';
            }
        }
        return 'twitter';
    };

    const [platform, setPlatform] = useState<'twitter' | 'linkedin' | 'instagram'>(getInitialPlatform());
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    // Listen for platform change events from SourcePage
    useEffect(() => {
        const handlePlatformChange = (e: CustomEvent<'twitter' | 'linkedin' | 'instagram'>) => {
            setPlatform(e.detail);
            setContent(""); // Clear content when platform changes
            if (typeof window !== 'undefined') {
                localStorage.setItem(`source-${sourceId}-social-platform`, e.detail);
            }
        };

        window.addEventListener('social-platform-change', handlePlatformChange as EventListener);
        return () => {
            window.removeEventListener('social-platform-change', handlePlatformChange as EventListener);
        };
    }, [sourceId]);

    // Load existing content when platform changes
    useEffect(() => {
        const loadExistingContent = async () => {
            try {
                const response = await fetch(`http://localhost:8000/ai/social-media/${sourceId}?platform=${platform}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.post) {
                        const fullPost = `${data.post}\n\n${data.hashtags.join(' ')}`;
                        setContent(fullPost);
                    } else {
                        setContent("");
                    }
                }
            } catch (error) {
                console.error("Failed to load existing content:", error);
            }
        };
        loadExistingContent();
    }, [platform, sourceId]);

    const generateContent = async () => {
        setLoading(true);
        try {
            const response = await fetch(`http://localhost:8000/ai/social-media/${sourceId}?platform=${platform}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) throw new Error('Failed to generate content');

            const data = await response.json();

            // API returns { post, hashtags, hook }
            const fullPost = `${data.post}\n\n${data.hashtags.join(' ')}`;
            setContent(fullPost);
        } catch (error) {
            console.error("Failed to generate content:", error);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = async () => {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const platformTitles = {
        twitter: 'Twitter Thread',
        linkedin: 'LinkedIn Post',
        instagram: 'Instagram Caption'
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm transition-colors duration-300">
            <div className="border-b border-gray-200 dark:border-slate-700 px-6 py-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{platformTitles[platform]}</h2>
            </div>
            <div className="p-6 space-y-6">

                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm min-h-[300px] transition-colors duration-300">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-purple-600 dark:text-purple-400 mb-4" />
                            <p className="text-gray-500 dark:text-slate-400">Drafting your post...</p>
                        </div>
                    ) : content ? (
                        <div className="space-y-4">
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="w-full h-64 p-4 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={copyToClipboard}
                                    className="flex items-center px-4 py-2 text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    {copied ? <Check className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" /> : <Copy className="h-4 w-4 mr-2" />}
                                    {copied ? "Copied!" : "Copy Text"}
                                </button>
                                <button
                                    onClick={generateContent}
                                    className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                >
                                    <Share2 className="h-4 w-4 mr-2" />
                                    Regenerate
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center py-12 text-center">
                            <Share2 className="h-12 w-12 text-gray-300 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Create Social Content</h3>
                            <p className="text-gray-500 dark:text-slate-400 mb-6 max-w-sm">
                                Turn your learning into engaging social media posts automatically.
                            </p>
                            <button
                                onClick={generateContent}
                                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors duration-300"
                            >
                                Generate Draft
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
