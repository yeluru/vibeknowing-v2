"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Share2, Network, FileText } from "lucide-react";
import { SocialMediaGenerator } from "./SocialMediaGenerator";
import { DiagramViewer } from "./DiagramViewer";
import { ArticleEditor } from "./ArticleEditor";

interface StudioInterfaceProps {
    sourceId: string;
}

type StudioTool = 'social' | 'diagram' | 'article';

export function StudioInterface({ sourceId }: StudioInterfaceProps) {
    const searchParams = useSearchParams();

    // Initialize from URL or localStorage
    const getInitialTool = (): StudioTool => {
        const urlTool = searchParams.get('tool');
        if (urlTool && ['social', 'diagram', 'article'].includes(urlTool)) {
            return urlTool as StudioTool;
        }

        if (typeof window !== 'undefined') {
            const savedTool = localStorage.getItem(`source-${sourceId}-studio-tool`);
            if (savedTool && ['social', 'diagram', 'article'].includes(savedTool)) {
                return savedTool as StudioTool;
            }
        }
        return 'social';
    };

    const [activeTool, setActiveTool] = useState<StudioTool>(getInitialTool());

    // Update active tool when URL changes
    useEffect(() => {
        const urlTool = searchParams.get('tool');
        if (urlTool && ['social', 'diagram', 'article'].includes(urlTool)) {
            setActiveTool(urlTool as StudioTool);
        }
    }, [searchParams]);

    const handleToolChange = (tool: StudioTool) => {
        setActiveTool(tool);
        if (typeof window !== 'undefined') {
            localStorage.setItem(`source-${sourceId}-studio-tool`, tool);
            // Optional: Update URL to reflect tool change, but might conflict with parent tab state
            // For now, we just use URL for initial deep linking
        }
    };

    return (
        <div className="space-y-6">
            {/* Tool Navigation */}
            <div className="flex gap-2 border-b border-gray-200 pb-4">
                <button
                    onClick={() => handleToolChange('social')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTool === 'social'
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    <Share2 className="h-4 w-4" />
                    Social Media
                </button>
                <button
                    onClick={() => handleToolChange('diagram')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTool === 'diagram'
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    <Network className="h-4 w-4" />
                    Diagrams
                </button>
                <button
                    onClick={() => handleToolChange('article')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTool === 'article'
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    <FileText className="h-4 w-4" />
                    Articles
                </button>
            </div>

            {/* Active Tool */}
            <div>
                {activeTool === 'social' && <SocialMediaGenerator sourceId={sourceId} />}
                {activeTool === 'diagram' && <DiagramViewer sourceId={sourceId} />}
                {activeTool === 'article' && <ArticleEditor sourceId={sourceId} />}
            </div>
        </div>
    );
}
