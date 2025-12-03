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
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center space-y-6 rounded-2xl bg-gradient-to-br from-purple-50 to-white py-16 text-center shadow-sm border border-purple-100">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-4 py-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">AI-Powered Learning Platform</span>
          </div>

          <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
            Turn Any Content Into
            <br />
            <span className="text-purple-600">Knowledge</span>
          </h1>

          <p className="mx-auto max-w-2xl text-xl text-gray-600">
            Transform videos, articles, and PDFs into AI summaries, interactive quizzes, flashcards, and social content in seconds.
          </p>

          <div className="mx-auto w-full max-w-3xl pt-8">
            <UrlInput />
          </div>
        </div>
      </section>

      {/* Stats Dashboard */}
      {!loading && totalProjects > 0 && (
        <section className="grid gap-6 sm:grid-cols-3">
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 p-6 shadow-sm transition-all hover:shadow-lg">
            <div className="absolute right-4 top-4 opacity-10 transition-opacity group-hover:opacity-20">
              <FolderOpen className="h-16 w-16 text-blue-600" />
            </div>
            <div className="relative">
              <p className="text-sm font-medium text-blue-600">Total Projects</p>
              <p className="mt-2 text-4xl font-bold text-blue-900">{totalProjects}</p>
              <p className="mt-1 text-xs text-blue-600">All time</p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 p-6 shadow-sm transition-all hover:shadow-lg">
            <div className="absolute right-4 top-4 opacity-10 transition-opacity group-hover:opacity-20">
              <TrendingUp className="h-16 w-16 text-purple-600" />
            </div>
            <div className="relative">
              <p className="text-sm font-medium text-purple-600">This Week</p>
              <p className="mt-2 text-4xl font-bold text-purple-900">{thisWeek}</p>
              <p className="mt-1 text-xs text-purple-600">New projects</p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 shadow-sm transition-all hover:shadow-lg">
            <div className="absolute right-4 top-4 opacity-10 transition-opacity group-hover:opacity-20">
              <Zap className="h-16 w-16 text-emerald-600" />
            </div>
            <div className="relative">
              <p className="text-sm font-medium text-emerald-600">Ready to Use</p>
              <p className="mt-2 text-4xl font-bold text-emerald-900">
                {projects.filter(p => p.status === 'Ready').length}
              </p>
              <p className="mt-1 text-xs text-emerald-600">Available now</p>
            </div>
          </div>
        </section>
      )}

      {/* Recent Activity */}
      {!loading && recentProjects.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Recent Projects</h2>
              <p className="text-gray-600">Pick up where you left off</p>
            </div>
            <Link
              href="/studio"
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-purple-700 hover:shadow-lg"
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
                className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-purple-300 hover:shadow-lg"
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

      {/* Features Showcase */}
      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Powerful AI Features</h2>
          <p className="mt-2 text-gray-600">Everything you need to learn smarter, not harder</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-purple-300 hover:shadow-lg">
            <div className="mb-4 inline-flex rounded-xl bg-purple-100 p-3 text-purple-600 transition-all group-hover:bg-purple-600 group-hover:text-white">
              <Brain className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">AI Summaries</h3>
            <p className="mt-2 text-sm text-gray-600">
              Get concise, structured summaries of any content in seconds
            </p>
          </div>

          <div className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-blue-300 hover:shadow-lg">
            <div className="mb-4 inline-flex rounded-xl bg-blue-100 p-3 text-blue-600 transition-all group-hover:bg-blue-600 group-hover:text-white">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Smart Quizzes</h3>
            <p className="mt-2 text-sm text-gray-600">
              Test your knowledge with AI-generated interactive quizzes
            </p>
          </div>

          <div className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-orange-300 hover:shadow-lg">
            <div className="mb-4 inline-flex rounded-xl bg-orange-100 p-3 text-orange-600 transition-all group-hover:bg-orange-600 group-hover:text-white">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Flashcards</h3>
            <p className="mt-2 text-sm text-gray-600">
              Master concepts with spaced repetition flashcards
            </p>
          </div>

          <div className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-emerald-300 hover:shadow-lg">
            <div className="mb-4 inline-flex rounded-xl bg-emerald-100 p-3 text-emerald-600 transition-all group-hover:bg-emerald-600 group-hover:text-white">
              <Palette className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Content Studio</h3>
            <p className="mt-2 text-sm text-gray-600">
              Create social posts, diagrams, and articles from your content
            </p>
          </div>
        </div>
      </section>

      {/* Empty State CTA */}
      {!loading && totalProjects === 0 && (
        <section className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 px-8 py-16 text-center">
          <div className="mx-auto max-w-md space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
              <Sparkles className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">Ready to Start Learning?</h3>
            <p className="text-gray-600">
              Upload your first piece of content above and watch the magic happen. Transform any video, article, or PDF into powerful learning materials.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
