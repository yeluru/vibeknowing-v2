"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Key, Check, X, Eye, EyeOff, ChevronDown, Sparkles, Shield,
  AlertTriangle, Loader2, Cpu, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// --- Types ---

interface ModelInfo {
  id: string;
  name: string;
  context: number;
  tier: string;
}

interface ProviderConfig {
  name: string;
  displayName: string;
  icon: string;
  color: string;
  darkColor: string;
  models: ModelInfo[];
  keyPrefix: string; // how key starts, for hint text
}

// --- Constants ---

const PROVIDERS: ProviderConfig[] = [
  {
    name: "openai",
    displayName: "OpenAI",
    icon: "🟢",
    color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    darkColor: "border-emerald-500/20",
    keyPrefix: "sk-",
    models: [
      { id: "gpt-4o", name: "GPT-4o", context: 128000, tier: "standard" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", context: 128000, tier: "budget" },
      { id: "o1", name: "o1 (Reasoning)", context: 200000, tier: "premium" },
      { id: "o3-mini", name: "o3-mini (Reasoning)", context: 200000, tier: "standard" },
    ],
  },
  {
    name: "anthropic",
    displayName: "Anthropic (Claude)",
    icon: "🟠",
    color: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
    darkColor: "border-orange-500/20",
    keyPrefix: "sk-ant-",
    models: [
      { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", context: 200000, tier: "standard" },
      { id: "claude-opus-4-20250514", name: "Claude Opus 4", context: 200000, tier: "premium" },
      { id: "claude-haiku-3-5-20241022", name: "Claude Haiku 3.5", context: 200000, tier: "budget" },
    ],
  },
  {
    name: "google",
    displayName: "Google (Gemini)",
    icon: "🔵",
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
    darkColor: "border-blue-500/20",
    keyPrefix: "AI",
    models: [
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", context: 1000000, tier: "standard" },
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", context: 1000000, tier: "premium" },
    ],
  },
];

const TIER_STYLES: Record<string, string> = {
  budget: "bg-slate-100 text-slate-600",
  standard: "bg-indigo-50 text-indigo-700",
  premium: "bg-slate-900 text-white",
};

const TASK_LABELS: Record<string, { label: string; description: string }> = {
  summary: { label: "Summaries", description: "Article, concise, and ELI5 summaries" },
  quiz: { label: "Quizzes", description: "Multiple choice question generation" },
  flashcard: { label: "Flashcards", description: "Spaced repetition cards" },
  article: { label: "Articles", description: "Blog posts and tutorials" },
  social: { label: "Social Posts", description: "Twitter, LinkedIn content" },
  chat: { label: "Chat", description: "Conversational Q&A with sources" },
};

// --- localStorage helpers ---

function getStoredKeys(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem("vk_provider_keys") || "{}");
  } catch {
    return {};
  }
}

function setStoredKeys(keys: Record<string, string>) {
  localStorage.setItem("vk_provider_keys", JSON.stringify(keys));
}

function getStoredPreferences(): { defaultProvider: string; taskModels: Record<string, string> } {
  if (typeof window === "undefined") return { defaultProvider: "openai", taskModels: {} };
  try {
    return JSON.parse(localStorage.getItem("vk_ai_prefs") || '{"defaultProvider":"openai","taskModels":{}}');
  } catch {
    return { defaultProvider: "openai", taskModels: {} };
  }
}

function setStoredPreferences(prefs: { defaultProvider: string; taskModels: Record<string, string> }) {
  localStorage.setItem("vk_ai_prefs", JSON.stringify(prefs));
}

// --- Animations ---

const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

// --- Component ---

export default function SettingsPage() {
  const { isAuthenticated, user } = useAuth();
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [prefs, setPrefs] = useState<{ defaultProvider: string; taskModels: Record<string, string> }>({
    defaultProvider: "openai",
    taskModels: {},
  });
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [keyVisible, setKeyVisible] = useState<Record<string, boolean>>({});
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setKeys(getStoredKeys());
    setPrefs(getStoredPreferences());
    setMounted(true);
  }, []);

  const handleSaveKey = (provider: string) => {
    const key = keyInputs[provider]?.trim();
    if (!key) {
      toast.error("Please enter an API key.");
      return;
    }
    const updated = { ...keys, [provider]: key };
    setKeys(updated);
    setStoredKeys(updated);
    setKeyInputs((k) => ({ ...k, [provider]: "" }));
    toast.success(`${PROVIDERS.find((p) => p.name === provider)?.displayName} key saved to your browser.`);
  };

  const handleRemoveKey = (provider: string) => {
    const updated = { ...keys };
    delete updated[provider];
    setKeys(updated);
    setStoredKeys(updated);
    toast.success("Key removed.");
  };

  const handleSetDefault = (provider: string) => {
    const updated = { ...prefs, defaultProvider: provider };
    setPrefs(updated);
    setStoredPreferences(updated);
    toast.success(`Default provider set to ${PROVIDERS.find((p) => p.name === provider)?.displayName}.`);
  };

  const handleSetTaskModel = (task: string, value: string) => {
    const updated = { ...prefs, taskModels: { ...prefs.taskModels, [task]: value } };
    setPrefs(updated);
    setStoredPreferences(updated);
  };

  // Build flat list of models from providers that have keys
  const configuredModels = PROVIDERS.filter((p) => keys[p.name]).flatMap((p) =>
    p.models.map((m) => ({ ...m, provider: p.name, providerLabel: p.displayName }))
  );

  if (!mounted) return null;

  return (
    <div className="space-y-20 pb-24 relative">
      <section className="relative overflow-hidden w-full max-w-[1200px] mx-auto mt-4 px-4 sm:px-6 lg:px-8">
        
        {/* Deep background & spotlight identical to Home Page */}
        <div className="absolute inset-0 -z-10 bg-transparent rounded-3xl sm:rounded-[2.5rem] overflow-hidden border border-slate-200/40">
          <div className="absolute inset-0 bg-[#fdfcfb]" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-200/40 via-white/0 to-white/0 opacity-80 pointer-events-none" />
          <div className="absolute inset-0 opacity-[0.02]"
            style={{ backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "32px 32px" }}
          />
        </div>

        <div className="pt-20 pb-16 lg:pt-24 lg:pb-24 max-w-4xl mx-auto px-4">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
        {/* Header */}
        <motion.div variants={fadeInUp} className="mb-10 lg:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200/60 text-slate-800 text-[11px] font-semibold tracking-wide uppercase shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] mb-6">
            <Cpu className="h-3 w-3 text-indigo-500" />
            AI Configuration
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-[-0.03em] text-slate-900 leading-[1.1]">
            Settings
          </h1>
          <p className="mt-4 text-base tracking-tight text-slate-600 leading-relaxed max-w-xl">
            Bring your own API keys. Keys are stored in your browser only and sent directly to the provider. Nothing is saved on our servers.
          </p>
        </motion.div>

        {/* Provider Cards */}
        <motion.div variants={fadeInUp} className="space-y-6 mb-16">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Key className="h-5 w-5 text-slate-400" /> API Keys
          </h2>

          {PROVIDERS.map((prov) => {
            const hasKey = !!keys[prov.name];
            const isDefault = prefs.defaultProvider === prov.name;

            return (
              <motion.div
                key={prov.name}
                variants={fadeInUp}
                className={`flex flex-col p-6 rounded-2xl border transition-all duration-300 ${
                  hasKey ? "bg-white border-slate-200 shadow-sm" : "bg-slate-50/50 border-slate-200/60"
                }`}
              >
                {/* Provider header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-xl border border-slate-100 shadow-sm bg-white flex items-center justify-center text-xl`}>
                      {prov.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base tracking-tight">{prov.displayName}</h3>
                      <p className="text-[13px] text-slate-500 font-medium">
                        {prov.models.length} models available
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {hasKey && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                        <Check className="h-3 w-3" /> Connected
                      </span>
                    )}
                    {isDefault && hasKey && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-slate-900 text-white shadow-sm">
                        Default
                      </span>
                    )}
                  </div>
                </div>

                {/* Key input row */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <input
                      type={keyVisible[prov.name] ? "text" : "password"}
                      value={keyInputs[prov.name] || ""}
                      onChange={(e) => setKeyInputs((k) => ({ ...k, [prov.name]: e.target.value }))}
                      placeholder={hasKey ? "Enter new key to replace..." : `Paste your ${prov.displayName} key (${prov.keyPrefix}...)`}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300 focus:bg-white transition-all pr-12"
                      onKeyDown={(e) => e.key === "Enter" && handleSaveKey(prov.name)}
                    />
                    <button
                      type="button"
                      onClick={() => setKeyVisible((v) => ({ ...v, [prov.name]: !v[prov.name] }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                    >
                      {keyVisible[prov.name] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  <button
                    onClick={() => handleSaveKey(prov.name)}
                    disabled={!keyInputs[prov.name]?.trim()}
                    className="flex items-center justify-center px-6 py-3 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.1)]"
                  >
                    Save
                  </button>

                  {hasKey && (
                    <button
                      onClick={() => handleRemoveKey(prov.name)}
                      className="flex items-center justify-center px-4 py-3 bg-red-50 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-100 transition-colors"
                      title="Remove key"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-5">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setExpandedProvider(expandedProvider === prov.name ? null : prov.name)}
                      className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 hover:text-slate-900 transition-colors"
                    >
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-300 ${
                          expandedProvider === prov.name ? "rotate-180" : ""
                        }`}
                      />
                      View models
                    </button>
                  </div>
                  {hasKey && !isDefault && (
                    <button
                      onClick={() => handleSetDefault(prov.name)}
                      className="text-[13px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      Set as default
                    </button>
                  )}
                </div>

                {/* Model list (expandable) */}
                {expandedProvider === prov.name && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 border border-slate-200 rounded-xl overflow-hidden bg-slate-50 relative top-1"
                  >
                    {prov.models.map((m, idx) => (
                      <div
                        key={m.id}
                        className={cn("flex items-center justify-between px-5 py-3 bg-white", idx !== 0 && "border-t border-slate-100")}
                      >
                        <div>
                          <span className="text-sm font-semibold text-slate-800 tracking-tight">{m.name}</span>
                          <span className="ml-3 text-[11px] font-medium text-slate-400">
                            {m.context >= 1000000
                              ? `${(m.context / 1000000).toFixed(0)}M context`
                              : `${(m.context / 1000).toFixed(0)}K context`}
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-md ${TIER_STYLES[m.tier] || ""}`}>
                          {m.tier}
                        </span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </motion.div>

        {/* Per-Task Model Picker */}
        <motion.div variants={fadeInUp} className="mb-14">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5 mb-2">
            <Sparkles className="h-5 w-5 text-indigo-500" /> Model per Feature
          </h2>
          <p className="text-[15px] text-slate-500 mb-6">
            Pick which model handles each feature. Only models from connected providers appear.
          </p>

          {configuredModels.length === 0 ? (
            <div className="rounded-2xl p-10 text-center bg-slate-50/50 border border-slate-200 border-dashed">
              <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-4" />
              <p className="text-slate-600 font-medium">
                Add at least one API key above to configure model preferences.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(TASK_LABELS).map(([task, { label, description }]) => (
                <div
                  key={task}
                  className="rounded-2xl p-5 bg-white border border-slate-200 flex flex-col justify-between gap-4 shadow-sm"
                >
                  <div className="min-w-0">
                    <div className="text-[15px] font-bold text-slate-900 tracking-tight">{label}</div>
                    <div className="text-[13px] text-slate-500 mt-0.5">{description}</div>
                  </div>
                  <div className="relative">
                    <select
                      value={prefs.taskModels[task] || ""}
                      onChange={(e) => handleSetTaskModel(task, e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 appearance-none focus:outline-none focus:ring-1 focus:ring-slate-300 focus:bg-white cursor-pointer hover:border-slate-300 transition-colors"
                    >
                      <option value="">Auto (provider default)</option>
                      {configuredModels.map((m) => (
                        <option key={`${m.provider}-${m.id}`} value={`${m.provider}:${m.id}`}>
                          {m.providerLabel} / {m.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Privacy note */}
        <motion.div
          variants={fadeInUp}
          className="rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start gap-5 bg-white border border-slate-200 shadow-sm"
        >
          <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
            <Shield className="h-6 w-6 text-slate-900" />
          </div>
          <div>
            <h3 className="font-bold tracking-tight text-slate-900 text-lg mb-2">Your keys never leave your browser</h3>
            <p className="text-[14px] text-slate-600 leading-relaxed">
              API keys are stored exclusively in your browser&apos;s local storage. On each AI request, the key is sent directly to the provider. VibeKnowing does not database or log your keys anywhere. You can verify this in your browser&apos;s network tab at any time.
            </p>
          </div>
        </motion.div>
        </motion.div>
        </div>
      </section>
    </div>
  );
}
