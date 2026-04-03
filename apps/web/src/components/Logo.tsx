
import React from 'react';
import { Brain, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
    className?: string;
}

export function Logo({ className }: LogoProps) {
    return (
        <div className={cn("flex flex-col items-center gap-1.5 select-none", className)}>
            {/* Brain Icon - Deep Field Gradient */}
            <div className="relative group transition-all duration-500 hover:scale-110">
                <div className="absolute -inset-2 bg-indigo-500/20 dark:bg-indigo-400/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 flex items-center justify-center shadow-[0_8px_20px_-6px_rgba(79,70,229,0.5)] dark:shadow-[0_8px_20px_-6px_rgba(30,27,75,0.8)] border border-white/20">
                    <Brain className="h-6 w-6 text-white drop-shadow-md" />
                </div>
                <div className="absolute -top-1.5 -right-1.5">
                    <Sparkles className="h-4 w-4 text-amber-300 fill-amber-300 animate-pulse drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                </div>
            </div>
            <span className="text-[10px] font-black tracking-[0.25em] text-slate-800 dark:text-slate-100 uppercase leading-none filter drop-shadow-sm transition-colors">
                VibeLearn
            </span>
        </div>
    );
}
