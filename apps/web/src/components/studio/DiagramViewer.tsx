"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, GitGraph, RefreshCw } from "lucide-react";
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
    
    // Standard node dimensions for layout calculation
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

        // Shift coordinates so anchor is center
        node.position = {
            x: nodeWithPosition.x - nodeWidth / 2,
            y: nodeWithPosition.y - nodeHeight / 2,
        };

        return node;
    });

    return { nodes, edges };
};

// Premium color palettes for node cycling
const colorPalettes = {
    dark: [
        { bg: '#312e81', border: '#4f46e5', text: '#e0e7ff' }, // Deep Indigo
        { bg: '#064e3b', border: '#059669', text: '#d1fae5' }, // Emerald
        { bg: '#4c1d95', border: '#7c3aed', text: '#ede9fe' }, // Violet
        { bg: '#701a75', border: '#c026d3', text: '#fae8ff' }, // Fuchsia
        { bg: '#1e3a8a', border: '#2563eb', text: '#dbeafe' }, // Blue
    ],
    light: [
        { bg: '#eef2ff', border: '#a5b4fc', text: '#3730a3' }, // Soft Indigo
        { bg: '#f0fdf4', border: '#86efac', text: '#166534' }, // Soft Emerald
        { bg: '#f5f3ff', border: '#c4b5fd', text: '#5b21b6' }, // Soft Violet
        { bg: '#fdf4ff', border: '#f0abfc', text: '#86198f' }, // Soft Fuchsia
        { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' }, // Soft Blue
    ]
};

function FlowRenderer({ chart }: { chart: string }) {
    const { theme } = useTheme();
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!chart) return;
        try {
            setError(null);
            
            // Clean up backticks in case AI hallucinated markdown wrap around the JSON string
            const cleanedChart = chart.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(cleanedChart);
            
            if (!parsed.nodes || !parsed.edges) {
                throw new Error("Invalid structure: missing nodes or edges array.");
            }

            // Map generic raw nodes to React Flow styling with dynamic premium colors
            const currentPalette = theme === 'dark' ? colorPalettes.dark : colorPalettes.light;
            
            const initialNodes: Node[] = parsed.nodes.map((n: any, index: number) => {
                const colorTheme = currentPalette[index % currentPalette.length];
                
                return {
                    id: n.id,
                    data: { label: n.label },
                    position: { x: 0, y: 0 }, // Dagre calculates this
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

            // Map edges and add smooth styling + arrows
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

            // Calculate automatic layout
            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(initialNodes, initialEdges);
            
            setNodes(layoutedNodes);
            setEdges(layoutedEdges);

        } catch (err) {
            console.error("Failed to parse React Flow JSON diagram data:", err);
            setError("The AI generated invalid or unparseable graph structures.");
        }
    }, [chart, theme, setNodes, setEdges]);

    if (error) {
        return <div className="p-8 text-red-500 font-medium text-center">{error}</div>;
    }

    return (
        <div style={{ height: '600px', width: '100%' }} className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
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
                headers: { 'Content-Type': 'application/json', ...buildAIHeaders() }
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
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-[#383e59] shadow-sm min-h-[400px] transition-colors duration-300 overflow-hidden">
                <div className="border-b border-gray-200 dark:border-[#383e59] px-6 py-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
                    {diagram && (
                         <button
                         onClick={generateDiagram}
                         disabled={loading}
                         className="flex items-center text-sm px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                     >
                         <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                         Regenerate
                     </button>
                    )}
                </div>
                <div className="p-6">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center py-20">
                            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400 mb-4" />
                            <p className="text-gray-500 dark:text-slate-400">Rendering high-fidelity chart...</p>
                        </div>
                    ) : diagram ? (
                        <div className="space-y-6">
                            <div className="text-center max-w-2xl mx-auto">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{diagram.title}</h3>
                                <p className="text-[15px] leading-relaxed text-gray-600 dark:text-slate-400">{diagram.description}</p>
                            </div>
                            <div className="relative border border-gray-100 dark:border-[#383e59]/60 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-[#1a1e30]/50 p-2 shadow-inner">
                                <FlowRenderer chart={diagram.diagram} />
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center py-20 text-center">
                            <div className="h-16 w-16 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6">
                                <GitGraph className="h-8 w-8 text-indigo-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Figma-Grade Diagrams</h3>
                            <p className="text-[15px] text-gray-500 dark:text-slate-400 mb-8 max-w-sm leading-relaxed">
                                Let AI generate beautiful, interactive Mermaid charts (flowcharts, mindmaps, journeys) directly from your knowledge base.
                            </p>
                            <button
                                onClick={generateDiagram}
                                className="px-6 py-3 bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 rounded-xl hover:bg-indigo-700 hover:-translate-y-0.5 font-bold transition-all duration-300"
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
