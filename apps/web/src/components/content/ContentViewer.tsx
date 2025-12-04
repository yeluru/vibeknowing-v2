"use client";

import { useState, useEffect } from "react";
import { ExternalLink } from "lucide-react";

interface ContentViewerProps {
    url: string;
    title: string;
}

export function ContentViewer({ url, title }: ContentViewerProps) {
    const [embedUrl, setEmbedUrl] = useState<string>("");
    const [contentType, setContentType] = useState<'youtube' | 'ted' | 'instagram' | 'website'>('website');

    useEffect(() => {
        if (!url) return;
        // Detect content type and generate embed URL
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            setContentType('youtube');
            const videoId = extractYouTubeId(url);
            if (videoId) {
                setEmbedUrl(`https://www.youtube.com/embed/${videoId}`);
            }
        } else if (url.includes('ted.com')) {
            setContentType('ted');
            // TED talk URLs can be embedded directly or need video ID
            if (url.includes('/talks/')) {
                const talkId = url.split('/talks/')[1].split('?')[0];
                setEmbedUrl(`https://embed.ted.com/talks/${talkId}`);
            }
        } else if (url.includes('instagram.com')) {
            setContentType('instagram');
            // Extract shortcode from Instagram URL (works for both /reel/ and /p/ URLs)
            const shortCodeMatch = url.match(/\/reel\/([A-Za-z0-9_-]+)/) || url.match(/\/p\/([A-Za-z0-9_-]+)/);
            const shortCode = shortCodeMatch ? shortCodeMatch[1] : null;
            if (shortCode) {
                setEmbedUrl(`https://www.instagram.com/reel/${shortCode}/embed`);
            } else {
                setEmbedUrl("");
            }
        } else {
            setContentType('website');
            setEmbedUrl(url);
        }
    }, [url]);

    const extractYouTubeId = (url: string): string | null => {
        // Handle youtube.com/watch?v=...
        const match1 = url.match(/[?&]v=([^&]+)/);
        if (match1) return match1[1];

        // Handle youtu.be/...
        const match2 = url.match(/youtu\.be\/([^?]+)/);
        if (match2) return match2[1];

        // Handle youtube.com/embed/...
        const match3 = url.match(/youtube\.com\/embed\/([^?]+)/);
        if (match3) return match3[1];

        // Handle youtube.com/shorts/...
        const match4 = url.match(/youtube\.com\/shorts\/([^?]+)/);
        if (match4) return match4[1];

        return null;
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Original Content</h3>
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                    <ExternalLink className="h-4 w-4" />
                    Open in new tab
                </a>
            </div>

            {embedUrl ? (
                <div className="relative w-full bg-gray-100 dark:bg-slate-700 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700">
                    {contentType === 'youtube' || contentType === 'ted' || contentType === 'instagram' ? (
                        // Video embed (16:9 aspect ratio)
                        <div className="relative pb-[56.25%]">
                            <iframe
                                src={embedUrl}
                                title={title}
                                className="absolute top-0 left-0 w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    ) : (
                        // Website embed
                        <div className="relative" style={{ height: '600px' }}>
                            <iframe
                                src={embedUrl}
                                title={title}
                                className="w-full h-full"
                                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                            />
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-700">
                    <ExternalLink className="h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-gray-600 dark:text-slate-300 mb-2">
                        {contentType === 'instagram'
                            ? 'Instagram content cannot be embedded'
                            : 'Unable to preview this content'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                        {contentType === 'instagram'
                            ? 'Instagram blocks embedding for security reasons'
                            : 'This website may not allow embedding'}
                    </p>
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors duration-300"
                    >
                        Open in new tab
                    </a>
                </div>
            )}
        </div>
    );
}
