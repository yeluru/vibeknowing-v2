"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Key, Check, X, Eye, EyeOff, ChevronDown, Sparkles, Shield,
  AlertTriangle, Loader2, Cpu, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

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
  budget: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  standard: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300",
  premium: "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300",
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
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 pb-24">
      <motion.div initial="hidden" animate="visible" variants={stagger}>
        {/* Header */}
        <motion.div variants={fadeInUp} className="mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full vk-eyebrow text-slate-700 dark:text-slate-200 mb-5">
            <Cpu className="h-4 w-4 text-indigo-500" />
            <span className="text-sm font-semibold">AI Configuration</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            AI Settings
          </h1>
          <p className="mt-3 text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
            Bring your own API keys. Keys are stored in your browser only and sent directly to the provider on each request. Nothing is saved on our servers.
          </p>
        </motion.div>

        {/* Provider Cards */}
        <motion.div variants={fadeInUp} className="space-y-4 mb-12">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Key className="h-5 w-5 text-indigo-500" /> API Keys
          </h2>

          {PROVIDERS.map((prov) => {
            const hasKey = !!keys[prov.name];
            const isDefault = prefs.defaultProvider === prov.name;

            return (
              <motion.div
                key={prov.name}
                variants={fadeInUp}
                className={`vk-card rounded-2xl p-5 sm:p-6 transition-all duration-200 ${
                  hasKey ? "bg-white/70 dark:bg-slate-950/40" : "bg-white/50 dark:bg-slate-950/20"
                }`}
              >
                {/* Provider header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl ${prov.color} flex items-center justify-center text-lg`}>
                      {prov.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100">{prov.displayName}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {prov.models.length} models available
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {hasKey && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        <Check className="h-3 w-3" /> Connected
                      </span>
                    )}
                    {isDefault && hasKey && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                        Default
                      </span>
                    )}
                  </div>
                </div>

                {/* Key input row */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={keyVisible[prov.name] ? "text" : "password"}
                      value={keyInputs[prov.name] || ""}
                      onChange={(e) => setKeyInputs((k) => ({ ...k, [prov.name]: e.target.value }))}
                      placeholder={hasKey ? "Enter new key to replace..." : `Paste your ${prov.displayName} key (${prov.keyPrefix}...)`}
                      className="vk-input w-full px-3.5 py-2.5 text-sm pr-10"
                      onKeyDown={(e) => e.key === "Enter" && handleSaveKey(prov.name)}
                    />
                    <button
                      type="button"
                      onClick={() => setKeyVisible((v) => ({ ...v, [prov.name]: !v[prov.name] }))}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {keyVisible[prov.name] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  <button
                    onClick={() => handleSaveKey(prov.name)}
                    disabled={!keyInputs[prov.name]?.trim()}
                    className="vk-btn vk-btn-primary px-4 py-2.5 text-sm font-semibold disabled:opacity-40"
                  >
                    Save
                  </button>

                  {hasKey && (
                    <button
                      onClick={() => handleRemoveKey(prov.name)}
                      className="vk-btn vk-btn-ghost px-2.5 py-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="Remove key"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Actions row */}
                <div className="mt-3 flex items-center gap-4">
                  {hasKey && !isDefault && (
                    <button
                      onClick={() => handleSetDefault(prov.name)}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200"
                    >
                      Set as default provider
                    </button>
                  )}

                  <button
                    onClick={() => setExpandedProvider(expandedProvider === prov.name ? null : prov.name)}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${
                        expandedProvider === prov.name ? "rotate-180" : ""
                      }`}
                    />
                    View models
                  </button>
                </div>

                {/* Model list (expandable) */}
                {expandedProvider === prov.name && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 space-y-2"
                  >
                    {prov.models.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between rounded-xl bg-slate-50/80 dark:bg-slate-900/40 px-4 py-2.5"
                      >
                        <div>
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{m.name}</span>
                          <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                            {m.context >= 1000000
                              ? `${(m.context / 1000000).toFixed(0)}M context`
                              : `${(m.context / 1000).toFixed(0)}K context`}
                          </span>
                        </div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${TIER_STYLES[m.tier] || ""}`}>
                          {m.tier.charAt(0).toUpperCase() + m.tier.slice(1)}
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
        <motion.div variants={fadeInUp} className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-indigo-500" /> Model per Feature
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
            Pick which model handles each feature. Only models from connected providers appear.
          </p>

          {configuredModels.length === 0 ? (
            <div className="vk-card rounded-2xl p-8 text-center bg-white/50 dark:bg-slate-950/20 border-dashed">
              <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-300 font-medium">
                Add at least one API key above to configure model preferences.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(TASK_LABELS).map(([task, { label, description }]) => (
                <div
                  key={task}
                  className="vk-card rounded-xl px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-white/60 dark:bg-slate-950/30"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{label}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{description}</div>
                  </div>
                  <select
                    value={prefs.taskModels[task] || ""}
                    onChange={(e) => handleSetTaskModel(task, e.target.value)}
                    className="vk-input px-3 py-2 text-sm min-w-[220px] cursor-pointer"
                  >
                    <option value="">Auto (provider default)</option>
                    {configuredModels.map((m) => (
                      <option key={`${m.provider}-${m.id}`} value={`${m.provider}:${m.id}`}>
                        {m.providerLabel} / {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Privacy note */}
        <motion.div
          variants={fadeInUp}
          className="vk-card rounded-2xl p-5 sm:p-6 flex items-start gap-4 bg-emerald-50/60 dark:bg-emerald-900/10 border-emerald-200/50 dark:border-emerald-800/30"
        >
          <Shield className="h-6 w-6 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1">Your keys never leave your browser</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              API keys are stored in your browser&apos;s local storage. On each AI request, the key is sent as a header
              directly to the provider. Our server uses it for that single call and discards it. Nothing is logged or saved.
              You can verify this in your browser&apos;s network tab. For full control, self-host VibeKnowing and set
              server-level keys in your environment.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
