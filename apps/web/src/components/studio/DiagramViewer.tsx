"use client";

import { useState, useEffect } from "react";
import { Loader2, RefreshCw, Download, Copy, Check, GitGraph } from "lucide-react";
import { API_BASE } from "@/lib/api";

interface DiagramViewerProps {
    sourceId: string;
    title?: string;
}

export function DiagramViewer({ sourceId, title = "Diagram Viewer" }: DiagramViewerProps) {
    const [diagram, setDiagram] = useState<{ diagram: string; type: string; title: string; description: string } | null>(null);
    const [loading, setLoading] = useState(false);

    // Load existing diagram on mount
    useEffect(() => {
        const loadExistingDiagram = async () => {
            try {
                const response = await fetch(`${API_BASE}/ai/diagram/${sourceId}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.diagram) {
                        setDiagram(data);
                    } else {
                        setDiagram(null);
                    }
                }
            } catch (error) {
                console.error("Failed to load existing diagram:", error);
            }
        };
        loadExistingDiagram();
    }, [sourceId]);

    const generateDiagram = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/ai/diagram/${sourceId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) throw new Error('Failed to generate diagram');

            const data = await response.json();
            setDiagram(data);
        } catch (error) {
            console.error("Failed to generate diagram:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm min-h-[400px] transition-colors duration-300">
                <div className="border-b border-gray-200 dark:border-slate-700 px-6 py-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
                </div>
                <div className="p-6">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center py-20">
                            <Loader2 className="h-8 w-8 animate-spin text-purple-600 dark:text-purple-400 mb-4" />
                            <p className="text-gray-500 dark:text-slate-400">Visualizing concepts...</p>
                        </div>
                    ) : diagram ? (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{diagram.title}</h3>
                                <p className="text-sm text-gray-600 dark:text-slate-300 mb-4">{diagram.description}</p>
                            </div>
                            <div className="relative border border-gray-100 dark:border-slate-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-slate-900 p-4">
                                <pre className="text-sm font-mono whitespace-pre overflow-x-auto text-gray-900 dark:text-gray-100 bg-transparent">
                                    {diagram.diagram}
                                </pre>
                            </div>
                            <div className="flex justify-end">
                                <button
                                    onClick={generateDiagram}
                                    className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                >
                                    <GitGraph className="h-4 w-4 mr-2" />
                                    Regenerate
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center py-20 text-center">
                            <GitGraph className="h-12 w-12 text-gray-300 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Visualize Concepts</h3>
                            <p className="text-gray-500 dark:text-slate-400 mb-6 max-w-sm">
                                Generate flowcharts and diagrams to understand complex relationships.
                            </p>
                            <button
                                onClick={generateDiagram}
                                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors duration-300"
                            >
                                Generate Diagram
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
