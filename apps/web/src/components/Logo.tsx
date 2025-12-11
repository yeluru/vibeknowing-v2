
import React from 'react';
import { Brain, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
    className?: string;
}

export function Logo({ className }: LogoProps) {
    return (
        <div className={cn("flex flex-col items-center gap-1 select-none", className)}>
            {/* Brain Icon */}
            <div className="relative transform hover:scale-105 transition-transform duration-300">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                    <Brain className="h-6 w-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400 fill-amber-400 animate-pulse" />
                </div>
            </div>

            {/* Smallest Text Underneath */}
            <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase leading-none">
                vibeknowing
            </span>
        </div>
    );
}
