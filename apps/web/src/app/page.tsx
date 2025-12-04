"use client";

import { useEffect, useState } from "react";
import { UrlInput } from "@/components/ingest/UrlInput";
import { FileText, Youtube, Globe, Loader2, Sparkles, Brain, Zap, Palette, TrendingUp, Clock, FolderOpen } from "lucide-react";
import { projectsApi, Project } from "@/lib/api";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();

    const handleRefresh = () => loadData();
    window.addEventListener('refresh-sidebar', handleRefresh);

    return () => {
      window.removeEventListener('refresh-sidebar', handleRefresh);
    };
  }, []);

  const loadData = async () => {
    try {
      const projs = await projectsApi.list();
      setProjects(projs);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const totalProjects = projects.length;
  const recentProjects = projects
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const thisWeek = projects.filter(p => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(p.created_at) > weekAgo;
  }).length;

  return (
    <div className="space-y-8 sm:space-y-12">
      {/* Hero Section */}
      <section className="rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 py-12 sm:py-16 px-6 sm:px-8 shadow-xl border border-indigo-100/50 dark:border-slate-700/50 hover-lift relative overflow-hidden transition-colors duration-300">
        {/* Decorative background elements */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-purple-400 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-400 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 space-y-8">
          {/* Hero Content */}
          <div className="flex flex-col items-center justify-center space-y-6 text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 px-5 py-2.5 shadow-md border border-indigo-200 dark:border-indigo-700/50">
              <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400 animate-pulse" />
              <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">AI-Powered Learning Platform</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight">
              <span className="text-slate-900 dark:text-white">Turn Any Content Into</span>
              <br />
              <span className="gradient-text">Knowledge</span>
            </h1>

            <p className="max-w-2xl text-lg sm:text-xl text-slate-600 dark:text-slate-300 leading-relaxed">
              Transform videos, articles, and PDFs into AI summaries, interactive quizzes, flashcards, and social content in seconds.
            </p>

            <div className="w-full max-w-3xl">
              <UrlInput />
            </div>
          </div>

          {/* Features Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto pt-4">
            <div className="group rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm p-4 shadow-sm hover-lift transition-all duration-300 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md">
              <div className="mb-3 inline-flex rounded-lg bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/50 dark:to-purple-800/50 p-2 text-purple-600 dark:text-purple-400 transition-all duration-300 group-hover:from-purple-600 group-hover:to-purple-700 group-hover:text-white group-hover:scale-110">
                <Brain className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">AI Summaries</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Concise summaries in seconds
              </p>
            </div>

            <div className="group rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm p-4 shadow-sm hover-lift transition-all duration-300 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md">
              <div className="mb-3 inline-flex rounded-lg bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/50 dark:to-indigo-800/50 p-2 text-indigo-600 dark:text-indigo-400 transition-all duration-300 group-hover:from-indigo-600 group-hover:to-indigo-700 group-hover:text-white group-hover:scale-110">
                <Sparkles className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Smart Quizzes</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                AI-generated interactive tests
              </p>
            </div>

            <div className="group rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm p-4 shadow-sm hover-lift transition-all duration-300 hover:border-orange-300 dark:hover:border-orange-600 hover:shadow-md">
              <div className="mb-3 inline-flex rounded-lg bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/50 dark:to-orange-800/50 p-2 text-orange-600 dark:text-orange-400 transition-all duration-300 group-hover:from-orange-600 group-hover:to-orange-700 group-hover:text-white group-hover:scale-110">
                <Zap className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Flashcards</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Spaced repetition learning
              </p>
            </div>

            <div className="group rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm p-4 shadow-sm hover-lift transition-all duration-300 hover:border-emerald-300 dark:hover:border-emerald-600 hover:shadow-md">
              <div className="mb-3 inline-flex rounded-lg bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/50 dark:to-emerald-800/50 p-2 text-emerald-600 dark:text-emerald-400 transition-all duration-300 group-hover:from-emerald-600 group-hover:to-emerald-700 group-hover:text-white group-hover:scale-110">
                <Palette className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Content Studio</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Social posts & articles
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Activity - Enhanced */}
      {!loading && recentProjects.length > 0 && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">Recent Projects</h2>
              <p className="text-slate-600 dark:text-slate-300 mt-1">Pick up where you left off</p>
            </div>
            <Link
              href="/studio"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all duration-300 hover:from-indigo-600 hover:to-purple-600 hover:shadow-xl hover:shadow-indigo-500/40 hover-lift"
            >
              <Palette className="h-4 w-4" />
              Content Studio
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentProjects.map((project) => (
              <Link
                key={project.id}
                href={project.first_source_id ? `/source/${project.first_source_id}` : '#'}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 backdrop-blur-sm p-6 shadow-md hover-lift transition-all duration-300 hover:border-indigo-300 dark:hover:border-indigo-600 dark:border-indigo-600 hover:shadow-xl hover:bg-white dark:hover:bg-slate-800 dark:bg-slate-800"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={cn(
                    "rounded-lg p-2",
                    project.type === 'youtube' && "bg-red-100 text-red-600",
                    project.type === 'pdf' && "bg-blue-100 text-blue-600",
                    project.type === 'web' && "bg-green-100 text-green-600"
                  )}>
                    {project.type === 'youtube' && <Youtube className="h-5 w-5" />}
                    {project.type === 'pdf' && <FileText className="h-5 w-5" />}
                    {project.type === 'web' && <Globe className="h-5 w-5" />}
                  </div>
                  <span className={cn(
                    "text-xs font-medium px-2 py-1 rounded-full",
                    project.status === 'Ready' ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                  )}>
                    {project.status}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 dark:hover:text-purple-400 dark:text-purple-400 transition-colors line-clamp-2 mb-2">
                  {project.title}
                </h3>

                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                  <Clock className="h-3 w-3" />
                  {new Date(project.created_at).toLocaleDateString()}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Empty State CTA - Enhanced */}
      {!loading && totalProjects === 0 && (
        <section className="rounded-3xl border-2 border-dashed border-indigo-200 dark:border-indigo-700 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 px-6 sm:px-8 py-12 sm:py-16 text-center shadow-lg transition-colors duration-300">
          <div className="mx-auto max-w-md space-y-5">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 shadow-lg">
              <Sparkles className="h-10 w-10 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">Ready to Start Learning?</h3>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-base">
              Upload your first piece of content above and watch the magic happen. Transform any video, article, or PDF into powerful learning materials.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
