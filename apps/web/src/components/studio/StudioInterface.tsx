import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { SocialMediaGenerator } from "./SocialMediaGenerator";
import { DiagramViewer } from "./DiagramViewer";
import { ArticleEditor } from "./ArticleEditor";
import { QuizInterface } from "@/components/quiz/QuizInterface";
import { ReviewSession } from "@/components/flashcards/ReviewSession";

interface StudioInterfaceProps {
    sourceId: string;
}

type StudioTool = 'social' | 'diagram' | 'article' | 'quiz' | 'flashcards';

export function StudioInterface({ sourceId }: StudioInterfaceProps) {
    const searchParams = useSearchParams();

    // Initialize from URL or localStorage
    const getInitialTool = (): StudioTool => {
        const urlTool = searchParams.get('tool');
        if (urlTool && ['social', 'diagram', 'article', 'quiz', 'flashcards'].includes(urlTool)) {
            return urlTool as StudioTool;
        }

        if (typeof window !== 'undefined') {
            const savedTool = localStorage.getItem(`source-${sourceId}-studio-tool`);
            if (savedTool && ['social', 'diagram', 'article', 'quiz', 'flashcards'].includes(savedTool)) {
                return savedTool as StudioTool;
            }
        }
        return 'social';
    };

    const [activeTool, setActiveTool] = useState<StudioTool>(getInitialTool());

    // Update active tool when URL changes
    useEffect(() => {
        const urlTool = searchParams.get('tool');
        if (urlTool && ['social', 'diagram', 'article', 'quiz', 'flashcards'].includes(urlTool)) {
            setActiveTool(urlTool as StudioTool);
        }
    }, [searchParams]);

    // Listen for custom event from SourcePage
    useEffect(() => {
        const handleToolChange = (e: CustomEvent<StudioTool>) => {
            setActiveTool(e.detail);
            if (typeof window !== 'undefined') {
                localStorage.setItem(`source-${sourceId}-studio-tool`, e.detail);
            }
        };

        window.addEventListener('studio-tool-change', handleToolChange as EventListener);
        return () => {
            window.removeEventListener('studio-tool-change', handleToolChange as EventListener);
        };
    }, [sourceId]);

    const toolLabels: Record<StudioTool, string> = {
        social: 'Social Media Generator',
        diagram: 'Diagram Viewer',
        article: 'Article Editor',
        quiz: 'Quiz',
        flashcards: 'Flashcards'
    };

    return (
        <div>
            {/* Active Tool Content */}
            {activeTool === 'social' && <SocialMediaGenerator sourceId={sourceId} title={toolLabels.social} />}
            {activeTool === 'diagram' && <DiagramViewer sourceId={sourceId} title={toolLabels.diagram} />}
            {activeTool === 'article' && <ArticleEditor sourceId={sourceId} title={toolLabels.article} />}
            {activeTool === 'quiz' && <QuizInterface sourceId={sourceId} title={toolLabels.quiz} />}
            {activeTool === 'flashcards' && <ReviewSession sourceId={sourceId} title={toolLabels.flashcards} />}
        </div>
    );
}
