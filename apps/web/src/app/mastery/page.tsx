"use client";

import { useSearchParams } from "next/navigation";
import { PathMasteryView } from "@/components/curriculum/PathMasteryView";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

function MasteryContent() {
    const searchParams = useSearchParams();
    const missionId = searchParams.get("missionId");

    if (!missionId) {
        return (
            <div className="flex flex-col items-center justify-center py-40 text-center space-y-4">
                <h1 className="text-2xl font-black uppercase tracking-widest text-[var(--muted-foreground)] opacity-20">Mission Fragmented</h1>
                <p className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-widest">Select an active mission from the Content Studio</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 lg:px-8">
            <PathMasteryView missionId={missionId} isMission={true} />
        </div>
    );
}

export default function MasteryPage() {
    return (
        <Suspense fallback={<div className="flex justify-center py-40"><Loader2 className="h-10 w-10 animate-spin text-[var(--secondary)]" /></div>}>
            <MasteryContent />
        </Suspense>
    );
}
