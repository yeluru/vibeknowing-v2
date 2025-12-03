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
      {/* Hero Section - Enhanced */}
      <section className="flex flex-col items-center justify-center space-y-6 rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 sm:py-16 md:py-20 text-center shadow-xl border border-indigo-100/50 hover-lift relative overflow-hidden transition-colors duration-300">
        {/* Decorative background elements */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-purple-400 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-400 rounded-full blur-3xl"></div>
        </div>
        <div className="space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 px-5 py-2.5 shadow-md border border-indigo-200/50 transition-colors duration-300">
            <Sparkles className="h-4 w-4 text-indigo-600 animate-pulse" />
            <span className="text-sm font-semibold text-indigo-700">AI-Powered Learning Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight">
            <span className="text-slate-900">Turn Any Content Into</span>
            <br />
            <span className="gradient-text">Knowledge</span>
          </h1>

          <p className="mx-auto max-w-2xl text-lg sm:text-xl text-slate-600 leading-relaxed">
            Transform videos, articles, and PDFs into AI summaries, interactive quizzes, flashcards, and social content in seconds.
          </p>

          <div className="mx-auto w-full max-w-3xl pt-8">
            <UrlInput />
          </div>
        </div>
      </section>

      {/* Stats Dashboard - Enhanced */}
      {!loading && totalProjects > 0 && (
        <section className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3">
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-50 via-indigo-100/50 to-blue-50 p-6 sm:p-8 shadow-lg border border-indigo-200/50 hover-lift transition-all duration-300">
            <div className="absolute right-4 top-4 opacity-10 transition-all group-hover:opacity-20 group-hover:scale-110">
              <FolderOpen className="h-16 w-16 sm:h-20 sm:w-20 text-indigo-600" />
            </div>
            <div className="relative">
              <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wide">Total Projects</p>
              <p className="mt-3 text-4xl sm:text-5xl font-extrabold text-indigo-900">{totalProjects}</p>
              <p className="mt-2 text-xs font-medium text-indigo-500">All time</p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50 via-purple-100/50 to-pink-50 p-6 sm:p-8 shadow-lg border border-purple-200/50 hover-lift transition-all duration-300">
            <div className="absolute right-4 top-4 opacity-10 transition-all group-hover:opacity-20 group-hover:scale-110">
              <TrendingUp className="h-16 w-16 sm:h-20 sm:w-20 text-purple-600" />
            </div>
            <div className="relative">
              <p className="text-sm font-semibold text-purple-600 uppercase tracking-wide">This Week</p>
              <p className="mt-3 text-4xl sm:text-5xl font-extrabold text-purple-900">{thisWeek}</p>
              <p className="mt-2 text-xs font-medium text-purple-500">New projects</p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 via-emerald-100/50 to-teal-50 p-6 sm:p-8 shadow-lg border border-emerald-200/50 hover-lift transition-all duration-300">
            <div className="absolute right-4 top-4 opacity-10 transition-all group-hover:opacity-20 group-hover:scale-110">
              <Zap className="h-16 w-16 sm:h-20 sm:w-20 text-emerald-600" />
            </div>
            <div className="relative">
              <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wide">Ready to Use</p>
              <p className="mt-3 text-4xl sm:text-5xl font-extrabold text-emerald-900">
                {projects.filter(p => p.status === 'Ready').length}
              </p>
              <p className="mt-2 text-xs font-medium text-emerald-500">Available now</p>
            </div>
          </div>
        </section>
      )}

      {/* Recent Activity - Enhanced */}
      {!loading && recentProjects.length > 0 && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Recent Projects</h2>
              <p className="text-slate-600 mt-1">Pick up where you left off</p>
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
                className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-sm p-6 shadow-md hover-lift transition-all duration-300 hover:border-indigo-300 hover:shadow-xl hover:bg-white"
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

                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-purple-600 transition-colors line-clamp-2 mb-2">
                  {project.title}
                </h3>

                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  {new Date(project.created_at).toLocaleDateString()}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Features Showcase - Enhanced */}
      <section className="space-y-8">
          <div className="text-center space-y-2">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Powerful AI Features</h2>
          <p className="text-lg text-slate-600">Everything you need to learn smarter, not harder</p>
        </div>

        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <div className="group rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-sm p-6 shadow-md hover-lift transition-all duration-300 hover:border-purple-300 hover:shadow-xl hover:bg-white">
            <div className="mb-4 inline-flex rounded-2xl bg-gradient-to-br from-purple-100 to-purple-200 p-3.5 text-purple-600 transition-all duration-300 group-hover:from-purple-600 group-hover:to-purple-700 group-hover:text-white group-hover:scale-110 group-hover:rotate-3">
              <Brain className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">AI Summaries</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Get concise, structured summaries of any content in seconds
            </p>
          </div>

          <div className="group rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-sm p-6 shadow-md hover-lift transition-all duration-300 hover:border-indigo-300 hover:shadow-xl hover:bg-white">
            <div className="mb-4 inline-flex rounded-2xl bg-gradient-to-br from-indigo-100 to-indigo-200 p-3.5 text-indigo-600 transition-all duration-300 group-hover:from-indigo-600 group-hover:to-indigo-700 group-hover:text-white group-hover:scale-110 group-hover:rotate-3">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Smart Quizzes</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Test your knowledge with AI-generated interactive quizzes
            </p>
          </div>

          <div className="group rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-sm p-6 shadow-md hover-lift transition-all duration-300 hover:border-orange-300 hover:shadow-xl hover:bg-white">
            <div className="mb-4 inline-flex rounded-2xl bg-gradient-to-br from-orange-100 to-orange-200 p-3.5 text-orange-600 transition-all duration-300 group-hover:from-orange-600 group-hover:to-orange-700 group-hover:text-white group-hover:scale-110 group-hover:rotate-3">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Flashcards</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Master concepts with spaced repetition flashcards
            </p>
          </div>

          <div className="group rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-sm p-6 shadow-md hover-lift transition-all duration-300 hover:border-emerald-300 hover:shadow-xl hover:bg-white">
            <div className="mb-4 inline-flex rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 p-3.5 text-emerald-600 transition-all duration-300 group-hover:from-emerald-600 group-hover:to-emerald-700 group-hover:text-white group-hover:scale-110 group-hover:rotate-3">
              <Palette className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Content Studio</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Create social posts, diagrams, and articles from your content
            </p>
          </div>
        </div>
      </section>

      {/* Empty State CTA - Enhanced */}
      {!loading && totalProjects === 0 && (
        <section className="rounded-3xl border-2 border-dashed border-indigo-200 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 px-6 sm:px-8 py-12 sm:py-16 text-center shadow-lg transition-colors duration-300">
          <div className="mx-auto max-w-md space-y-5">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 shadow-lg">
              <Sparkles className="h-10 w-10 text-indigo-600 animate-pulse" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Ready to Start Learning?</h3>
            <p className="text-slate-600 leading-relaxed text-base">
              Upload your first piece of content above and watch the magic happen. Transform any video, article, or PDF into powerful learning materials.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
