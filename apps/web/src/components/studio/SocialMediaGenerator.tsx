"use client";

import { useState, useEffect } from "react";
import { Loader2, Share2, Copy, Check, Twitter, Linkedin, Instagram } from "lucide-react";
import { cn } from "@/lib/utils";

interface SocialMediaGeneratorProps {
    sourceId: string;
}

export function SocialMediaGenerator({ sourceId }: SocialMediaGeneratorProps) {
    // Initialize platform from localStorage
    const getInitialPlatform = (): 'twitter' | 'linkedin' | 'instagram' => {
        if (typeof window !== 'undefined') {
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

    const handlePlatformChange = (newPlatform: 'twitter' | 'linkedin' | 'instagram') => {
        setPlatform(newPlatform);
        if (typeof window !== 'undefined') {
            localStorage.setItem(`source-${sourceId}-social-platform`, newPlatform);
        }
    };

    // Load existing content when platform changes
    useEffect(() => {
        const loadExistingContent = async () => {
            try {
                const response = await fetch(`http://localhost:8001/ai/social-media/${sourceId}?platform=${platform}`);
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
            const response = await fetch(`http://localhost:8001/ai/social-media/${sourceId}?platform=${platform}`, {
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

    return (
        <div className="space-y-6">
            <div className="flex gap-4">
                <button
                    onClick={() => handlePlatformChange('twitter')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg border transition-all",
                        platform === 'twitter'
                            ? "bg-blue-50 border-blue-200 text-blue-700"
                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                    )}
                >
                    <Twitter className="h-4 w-4" />
                    Twitter Thread
                </button>
                <button
                    onClick={() => handlePlatformChange('linkedin')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg border transition-all",
                        platform === 'linkedin'
                            ? "bg-blue-50 border-blue-200 text-blue-700"
                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                    )}
                >
                    <Linkedin className="h-4 w-4" />
                    LinkedIn Post
                </button>
                <button
                    onClick={() => handlePlatformChange('instagram')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg border transition-all",
                        platform === 'instagram'
                            ? "bg-pink-50 border-pink-200 text-pink-700"
                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                    )}
                >
                    <Instagram className="h-4 w-4" />
                    Instagram Caption
                </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm min-h-[300px]">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-4" />
                        <p className="text-gray-500">Drafting your post...</p>
                    </div>
                ) : content ? (
                    <div className="space-y-4">
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full h-64 p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={copyToClipboard}
                                className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                {copied ? <Check className="h-4 w-4 mr-2 text-green-600" /> : <Copy className="h-4 w-4 mr-2" />}
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
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Create Social Content</h3>
                        <p className="text-gray-500 mb-6 max-w-sm">
                            Turn your learning into engaging social media posts automatically.
                        </p>
                        <button
                            onClick={generateContent}
                            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                        >
                            Generate Draft
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
