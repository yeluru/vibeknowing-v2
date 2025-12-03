"use client";

import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";

interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
    return (
        <nav className="flex items-center gap-2 text-sm">
            <Link
                href="/"
                className="flex items-center gap-1 text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
            >
                <Home className="h-4 w-4" />
                <span>Home</span>
            </Link>
            {items.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-[var(--foreground-muted)]" />
                    {item.href ? (
                        <Link
                            href={item.href}
                            className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
                        >
                            {item.label}
                        </Link>
                    ) : (
                        <span className="text-[var(--foreground)]">{item.label}</span>
                    )}
                </div>
            ))}
        </nav>
    );
}
