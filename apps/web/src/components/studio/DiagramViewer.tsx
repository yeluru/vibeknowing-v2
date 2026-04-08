"use client";

import { useState, useEffect } from "react";
import { Loader2, GitGraph, RefreshCw, AlertCircle } from "lucide-react";
import { API_BASE, buildAIHeaders } from "@/lib/api";
import { useTheme } from "@/contexts/ThemeContext";
import {
    ReactFlow,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    MarkerType,
    Node,
    Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
// @ts-ignore
import dagre from 'dagre';

interface DiagramViewerProps {
    sourceId: string;
    title?: string;
}

// Layout orchestrator using Dagre for automatic node positioning
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    const nodeWidth = 250;
    const nodeHeight = 80;

    dagreGraph.setGraph({ rankdir: direction, ranker: 'longest-path', marginx: 50, marginy: 50 });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        node.targetPosition = direction === 'LR' ? 'left' as any : 'top' as any;
        node.sourcePosition = direction === 'LR' ? 'right' as any : 'bottom' as any;
        node.position = {
            x: nodeWithPosition.x - nodeWidth / 2,
            y: nodeWithPosition.y - nodeHeight / 2,
        };
        return node;
    });

    return { nodes, edges };
};

// Consistent color palettes aligned with indigo brand
const colorPalettes = {
    dark: [
        { bg: '#312e81', border: '#4f46e5', text: '#e0e7ff' }, // Indigo
        { bg: '#064e3b', border: '#059669', text: '#d1fae5' }, // Emerald
        { bg: '#4c1d95', border: '#7c3aed', text: '#ede9fe' }, // Violet
        { bg: '#701a75', border: '#c026d3', text: '#fae8ff' }, // Fuchsia
        { bg: '#1e3a8a', border: '#2563eb', text: '#dbeafe' }, // Blue
    ],
    light: [
        { bg: '#eef2ff', border: '#a5b4fc', text: '#3730a3' }, // Indigo
        { bg: '#f0fdf4', border: '#86efac', text: '#166534' }, // Emerald
        { bg: '#f5f3ff', border: '#c4b5fd', text: '#5b21b6' }, // Violet
        { bg: '#fdf4ff', border: '#f0abfc', text: '#86198f' }, // Fuchsia
        { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' }, // Blue
    ]
};

// Skeleton shimmer for the canvas area while generating
function DiagramSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Title skeleton */}
            <div className="text-center max-w-2xl mx-auto space-y-2">
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-lg w-48 mx-auto" />
                <div className="h-4 bg-slate-100 dark:bg-slate-700/60 rounded w-72 mx-auto" />
            </div>
            {/* Canvas skeleton */}
            <div className="rounded-xl border border-gray-100 dark:border-[var(--surface-border)]/60 bg-slate-50 dark:bg-[var(--surface-input)]/50 overflow-hidden" style={{ height: '620px' }}>
                <div className="h-full flex items-center justify-center flex-col gap-4">
                    <div className="flex gap-6 items-center">
                        <div className="h-16 w-32 bg-slate-200 dark:bg-slate-700 rounded-xl" />
                        <div className="h-px w-12 bg-slate-300 dark:bg-slate-600" />
                        <div className="h-16 w-32 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl" />
                        <div className="h-px w-12 bg-slate-300 dark:bg-slate-600" />
                        <div className="h-16 w-32 bg-slate-200 dark:bg-slate-700 rounded-xl" />
                    </div>
                    <div className="flex gap-6 items-center mt-4">
                        <div className="h-16 w-28 bg-slate-100 dark:bg-slate-700/60 rounded-xl" />
                        <div className="h-px w-8 bg-slate-300 dark:bg-slate-600" />
                        <div className="h-16 w-36 bg-slate-200 dark:bg-slate-700 rounded-xl" />
                    </div>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">Building diagram…</p>
                </div>
            </div>
        </div>
    );
}

function FlowRenderer({ chart, onRetry }: { chart: string; onRetry: () => void }) {
    const { theme } = useTheme();
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!chart) return;
        try {
            setError(null);
            const cleanedChart = chart.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(cleanedChart);

            if (!parsed.nodes || !parsed.edges) {
                throw new Error("Invalid structure: missing nodes or edges array.");
            }

            const currentPalette = theme === 'dark' ? colorPalettes.dark : colorPalettes.light;

            const initialNodes: Node[] = parsed.nodes.map((n: any, index: number) => {
                const colorTheme = currentPalette[index % currentPalette.length];
                return {
                    id: n.id,
                    data: { label: n.label },
                    position: { x: 0, y: 0 },
                    style: {
                        background: colorTheme.bg,
                        color: colorTheme.text,
                        border: '2px solid',
                        borderColor: colorTheme.border,
                        borderRadius: '12px',
                        padding: '16px 20px',
                        fontSize: '15px',
                        fontWeight: 600,
                        boxShadow: theme === 'dark'
                            ? '0 10px 15px -3px rgb(0 0 0 / 0.4)'
                            : '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    }
                };
            });

            const initialEdges: Edge[] = parsed.edges.map((e: any) => ({
                id: e.id || `e-${e.source}-${e.target}`,
                source: e.source,
                target: e.target,
                label: e.label || '',
                type: 'smoothstep',
                animated: true,
                style: { stroke: theme === 'dark' ? '#64748b' : '#94a3b8', strokeWidth: 2 },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: theme === 'dark' ? '#64748b' : '#94a3b8',
                },
                labelStyle: { fill: theme === 'dark' ? '#cbd5e1' : '#475569', fontWeight: 500 },
                labelBgStyle: { fill: theme === 'dark' ? '#0f172a' : '#ffffff' }
            }));

            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(initialNodes, initialEdges);
            setNodes(layoutedNodes);
            setEdges(layoutedEdges);

        } catch (err) {
            console.error("Failed to parse diagram data:", err);
            setError("The AI returned an invalid diagram structure.");
        }
    }, [chart, theme, setNodes, setEdges]);

    // Error state with recovery path (skill: error-recovery)
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                <div className="h-12 w-12 bg-red-50 dark:bg-red-500/10 rounded-xl flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-red-500" />
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Diagram render failed</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">{error}</p>
                </div>
                <button
                    onClick={onRetry}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Try again
                </button>
            </div>
        );
    }

    return (
        <div style={{ height: '600px', width: '100%' }} className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.1}
            >
                <Background color={theme === 'dark' ? '#334155' : '#cbd5e1'} gap={16} />
                <Controls />
            </ReactFlow>
        </div>
    );
}

export function DiagramViewer({ sourceId, title = "Diagram Viewer" }: DiagramViewerProps) {
    const [diagram, setDiagram] = useState<{ diagram: string; type: string; title: string; description: string } | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(`${API_BASE}/ai/diagram/${sourceId}`);
                if (res.ok) {
                    const data = await res.json();
                    setDiagram(data.diagram ? data : null);
                }
            } catch (e) {
                console.error("Failed to load diagram:", e);
            }
        };
        load();
    }, [sourceId]);

    const generateDiagram = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/ai/diagram/${sourceId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...buildAIHeaders() }
            });
            if (!res.ok) throw new Error('Failed to generate diagram');
            setDiagram(await res.json());
        } catch (e) {
            console.error("Failed to generate diagram:", e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-[var(--surface-border)] shadow-sm min-h-[400px] transition-colors duration-300 overflow-hidden">

                {/* Header */}
                <div className="border-b border-gray-200 dark:border-[var(--surface-border)] px-6 py-4 flex justify-end items-center">
                    {diagram && !loading && (
                        <button
                            onClick={generateDiagram}
                            disabled={loading}
                            aria-label="Regenerate diagram"
                            className="flex items-center gap-1.5 text-sm px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Regenerate
                        </button>
                    )}
                </div>

                {/* Body */}
                <div className="p-6">
                    {loading ? (
                        <DiagramSkeleton />
                    ) : diagram ? (
                        <div className="space-y-6">
                            <div className="text-center max-w-2xl mx-auto">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{diagram.title}</h3>
                                <p className="text-[15px] leading-relaxed text-gray-600 dark:text-slate-400">{diagram.description}</p>
                            </div>
                            <div className="relative border border-gray-100 dark:border-[var(--surface-border)]/60 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-[var(--surface-input)]/50 p-2 shadow-inner">
                                <FlowRenderer chart={diagram.diagram} onRetry={generateDiagram} />
                            </div>
                        </div>
                    ) : (
                        /* Empty state */
                        <div className="h-full flex flex-col items-center justify-center py-20 text-center">
                            <div className="h-16 w-16 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6">
                                <GitGraph className="h-8 w-8 text-[var(--secondary)]" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Interactive Diagram</h3>
                            <p className="text-[15px] text-gray-500 dark:text-slate-400 mb-8 max-w-sm leading-relaxed">
                                Generate an interactive, pannable flowchart from your content — nodes, edges, and relationships visualized automatically.
                            </p>
                            <button
                                onClick={generateDiagram}
                                className="px-6 py-3 bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 rounded-xl hover:bg-indigo-700 hover:-translate-y-0.5 font-semibold transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
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
