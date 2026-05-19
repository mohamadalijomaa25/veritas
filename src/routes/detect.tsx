import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Upload,
  Sparkles,
  AlertTriangle,
  ShieldCheck,
  Loader2,
  FileText,
  Cpu,
  Brain,
  Layers,
  Trash2,
} from "lucide-react";
import { Shell } from "@/components/layout/Shell";
import { GlassCard } from "@/components/ui-custom/GlassCard";
import { SectionHeading } from "@/components/ui-custom/SectionHeading";
import { analyzeArticle, type FullAnalysis } from "@/lib/analyze";
import { XaiPanel } from "@/components/ui-custom/XaiPanel";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/detect")({
  component: DetectPage,
});

interface ArticleSample {
  category: string;
  text: string;
  badgeColor: string;
}

const SAMPLES: ArticleSample[] = [
  {
    category: "Conspiracy Theory",
    text: "SHOCKING bombshell: Anonymous insider reveals that mainstream media and globalist elites are running a secret coverup to silence the TRUTH about miracle cures doctors hate! You won't believe what they don't want you to know — share before this gets deleted!!",
    badgeColor:
      "text-rose-400 border-rose-500/25 bg-rose-500/10 shadow-[0_0_12px_rgba(244,63,94,0.15)]",
  },
  {
    category: "Objective News (Reuters)",
    text: "LONDON (Reuters) - The European Central Bank kept interest rates unchanged on Thursday, maintaining its cautious stance amid signs of lingering inflation in the services sector. Policymakers noted that while headline inflation has cooled over the past quarter, labor market tightness continues to exert upward pressure on wages across the eurozone.",
    badgeColor:
      "text-emerald-400 border-emerald-500/25 bg-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.15)]",
  },
  {
    category: "Satirical Parody",
    text: "In a stunning breakthrough for personal productivity, a local area man has successfully optimized his morning routine down to a single, hyper-efficient 45-second blink. Sources confirm he now spends the remaining 7 hours of his morning staring blankly at a wall, wondering what to do with his newly acquired surplus time.",
    badgeColor:
      "text-amber-400 border-amber-500/25 bg-amber-500/10 shadow-[0_0_12px_rgba(245,158,11,0.15)]",
  },
  {
    category: "Academic Abstract",
    text: "This paper presents a novel framework for deep reinforcement learning utilizing high-dimensional state representations. By employing a dual-channel convolutional neural network paired with a policy gradient optimizer, we demonstrate robust convergence rates on standard benchmark suites. Our results show a 14% improvement in sample efficiency compared to baseline networks.",
    badgeColor:
      "text-sky-400 border-sky-500/25 bg-sky-500/10 shadow-[0_0_12px_rgba(14,165,233,0.15)]",
  },
  {
    category: "Clickbait Tech Rumor",
    text: "IS THIS THE END OF THE SMARTPHONE?! Leaked blueprints from an unnamed Silicon Valley giant suggest the upcoming 'X-Phone' will completely ditch physical screens in favor of direct neural holograms projected from your collarbone! Sources say it goes on sale next month for under two hundred dollars! Click here for the exclusive leak!",
    badgeColor:
      "text-purple-400 border-purple-500/25 bg-purple-500/10 shadow-[0_0_12px_rgba(168,85,247,0.15)]",
  },
  {
    category: "Local Sports Report",
    text: "The local side secured a crucial three points on Saturday afternoon with a hard-fought 2-1 victory over their divisional rivals. Despite conceding an early goal in the ninth minute due to a defensive error, the home team rallied in the second half. Striker Marcus Vance scored the decisive match-winner with a clinical header in stoppage time.",
    badgeColor:
      "text-teal-400 border-teal-500/25 bg-teal-500/10 shadow-[0_0_12px_rgba(20,184,166,0.15)]",
  },
];

const PIPELINE_STAGES = [
  { label: "Tokenizing", desc: "Splitting article into lexical units" },
  { label: "Stopword removal", desc: "Filtering low-information tokens" },
  { label: "Stem & lemmatize", desc: "Normalizing word forms" },
  { label: "TF-IDF vector", desc: "Building weighted term vector" },
  { label: "Classical NLP", desc: "Lexicon + stylistic features" },
  { label: "ML classifier", desc: "Logistic regression scoring" },
  { label: "Transformer LM", desc: "Calling Gemini language model" },
];

function DetectPage() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FullAnalysis | null>(null);
  const [activeSampleCategory, setActiveSampleCategory] = useState<string | null>(null);
  const [lastSampleIdx, setLastSampleIdx] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("veritas_last_analysis");
      if (stored) {
        const parsed = JSON.parse(stored) as FullAnalysis;
        if (parsed && parsed.text) {
          setText(parsed.text);
          setResult(parsed);
        }
      }
    } catch (err) {
      console.warn("Failed to load last analysis from localStorage:", err);
    }
  }, []);

  const onFile = async (f: File) => {
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      setError("File too large (max 2MB).");
      return;
    }
    if (!/\.(txt|md)$/i.test(f.name)) {
      setError("Only .txt or .md files are supported in this demo.");
      return;
    }
    const t = await f.text();
    setText(t);
    setError(null);
    setActiveSampleCategory(null);
  };

  const analyze = async (textOverride?: unknown) => {
    setError(null);
    setResult(null);
    const hasOverride = typeof textOverride === "string";
    const t = (hasOverride ? textOverride : text).trim();
    if (t.length < 30) {
      setError("Please paste an article of at least 30 characters.");
      return;
    }
    setLoading(true);
    setStage(0);
    const stageTimer = setInterval(() => {
      setStage((s) => (s < PIPELINE_STAGES.length - 1 ? s + 1 : s));
    }, 300);
    try {
      const r = await analyzeArticle(t);
      setResult(r);
      try {
        localStorage.setItem("veritas_last_analysis", JSON.stringify(r));
        const historyStr = localStorage.getItem("veritas_session_history");
        let history = [];
        if (historyStr) {
          try {
            history = JSON.parse(historyStr);
            if (!Array.isArray(history)) history = [];
          } catch (e) {
            history = [];
          }
        }
        history = history.filter((h: any) => h && h.text !== r.text);
        history.unshift(r);
        if (history.length > 50) {
          history = history.slice(0, 50);
        }
        localStorage.setItem("veritas_session_history", JSON.stringify(history));
      } catch (err) {
        console.warn("Failed to save analysis to localStorage:", err);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      clearInterval(stageTimer);
      setLoading(false);
      setStage(-1);
    }
  };

  return (
    <Shell>
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <SectionHeading
          eyebrow="Detection"
          title="Paste an article. Get three verdicts."
          subtitle="Each submission is analyzed in parallel by a classical NLP module, a TF-IDF + logistic regression model, and a transformer language model."
        />

        <div className="mt-10 grid lg:grid-cols-5 gap-6">
          {/* Input */}
          <div className="lg:col-span-3">
            <GlassCard className="p-0 overflow-hidden">
              <div className="flex items-center justify-between border-b border-emerald-500/15 px-5 py-3">
                <div className="flex items-center gap-2 text-sm font-mono text-emerald-300/80">
                  <FileText className="h-4 w-4" />
                  <span>article_input.txt</span>
                  {activeSampleCategory && (
                    <span
                      className={cn(
                        "ml-2 rounded border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase transition-all duration-300",
                        SAMPLES.find((s) => s.category === activeSampleCategory)?.badgeColor ||
                          "text-emerald-300 border-emerald-500/25 bg-emerald-500/10",
                      )}
                    >
                      {activeSampleCategory}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      let nextIdx;
                      if (lastSampleIdx === null) {
                        nextIdx = Math.floor(Math.random() * SAMPLES.length);
                      } else {
                        const options = SAMPLES.map((_, i) => i).filter((i) => i !== lastSampleIdx);
                        nextIdx = options[Math.floor(Math.random() * options.length)];
                      }
                      const chosen = SAMPLES[nextIdx];
                      setText(chosen.text);
                      setActiveSampleCategory(chosen.category);
                      setLastSampleIdx(nextIdx);
                    }}
                    className="rounded-md border border-emerald-400/25 bg-white/[0.03] px-2.5 py-1 text-xs text-foreground/80 hover:bg-white/[0.06]"
                  >
                    Load sample
                  </button>
                  <button
                    onClick={() => {
                      setText("");
                      setResult(null);
                      setError(null);
                      setActiveSampleCategory(null);
                    }}
                    className="rounded-md border border-emerald-400/25 bg-white/[0.03] px-2.5 py-1 text-xs text-foreground/80 hover:bg-white/[0.06] inline-flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" /> Clear
                  </button>
                </div>
              </div>
              <textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  if (activeSampleCategory) {
                    setActiveSampleCategory(null);
                  }
                }}
                placeholder="Paste a news article here…"
                className="w-full min-h-[320px] resize-y bg-transparent px-5 py-4 text-sm leading-relaxed text-foreground placeholder:text-foreground/35 outline-none font-mono"
              />
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-emerald-500/15 px-5 py-3">
                <div className="flex items-center gap-3 text-xs font-mono text-foreground/60">
                  <span>{text.trim().split(/\s+/).filter(Boolean).length} words</span>
                  <span className="text-foreground/30">·</span>
                  <span>{text.length} chars</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".txt,.md,text/plain"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
                  />
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/25 bg-white/[0.03] px-3 py-1.5 text-xs text-foreground/80 hover:bg-white/[0.06]"
                  >
                    <Upload className="h-3.5 w-3.5" /> Upload .txt
                  </button>
                  <button
                    onClick={analyze}
                    disabled={loading || text.trim().length < 30}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition glow-emerald"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {loading ? "Analyzing… (may retry)" : "Analyze article"}
                  </button>
                </div>
              </div>
            </GlassCard>

            {error && (
              <GlassCard className="mt-4 border-rose-500/40">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-rose-300 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-rose-200">{error}</p>
                </div>
              </GlassCard>
            )}
          </div>

          {/* Pipeline */}
          <div className="lg:col-span-2">
            <GlassCard>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-emerald-300/80">
                Processing pipeline
              </p>
              <h3 className="mt-2 font-display text-xl font-semibold text-white">NLP → ML → LM</h3>
              <ul className="mt-5 space-y-2.5">
                {PIPELINE_STAGES.map((s, i) => {
                  const active = loading && i === stage;
                  const done = loading ? i < stage : !!result;
                  return (
                    <li
                      key={s.label}
                      className={cn(
                        "flex items-start gap-3 rounded-lg border p-3 transition-all",
                        active && "border-emerald-400/50 bg-emerald-500/10 ring-emerald",
                        done && !active && "border-emerald-500/20 bg-emerald-500/5",
                        !active && !done && "border-white/5 bg-white/[0.02]",
                      )}
                    >
                      <div
                        className={cn(
                          "mt-0.5 grid h-5 w-5 flex-shrink-0 place-items-center rounded-full text-[10px] font-mono",
                          done
                            ? "bg-emerald-400 text-emerald-950"
                            : active
                              ? "bg-emerald-500/30 text-emerald-200"
                              : "bg-white/5 text-foreground/40",
                        )}
                      >
                        {done ? "✓" : i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "text-sm font-medium",
                              active
                                ? "text-emerald-200"
                                : done
                                  ? "text-foreground/90"
                                  : "text-foreground/70",
                            )}
                          >
                            {s.label}
                          </span>
                          {active && <Loader2 className="h-3 w-3 animate-spin text-emerald-300" />}
                        </div>
                        <p className="text-[11px] text-foreground/55">{s.desc}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </GlassCard>
          </div>
        </div>

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="mt-12"
            >
              <Results result={result} />
              <XaiPanel
                result={result}
                onReAnalyzeText={(newText) => {
                  setText(newText);
                  analyze(newText);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </Shell>
  );
}

function Results({ result }: { result: FullAnalysis }) {
  const { classical, ml, transformer, text } = result;
  const cards = [
    {
      key: "classical",
      title: "Classical NLP",
      family: "Lexicon + features",
      icon: Layers,
      verdict: classical.verdict,
      confidence: classical.confidence,
      latency: classical.processingMs,
      detail: (
        <ul className="space-y-1.5">
          {classical.signals.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-foreground/75">
              <span className="mt-1 h-1 w-1 rounded-full bg-emerald-400" /> {s}
            </li>
          ))}
        </ul>
      ),
    },
    {
      key: "ml",
      title: "TF-IDF + Logistic Regression",
      family: "Classical ML",
      icon: Cpu,
      verdict: ml.verdict,
      confidence: ml.confidence,
      latency: ml.processingMs,
      detail: (
        <div className="space-y-2">
          <p className="text-[11px] font-mono uppercase tracking-wider text-foreground/55">
            Top TF-IDF features
          </p>
          {ml.topFeatures.length === 0 ? (
            <p className="text-xs text-foreground/55">
              No strong features detected — vector dominated by neutral terms.
            </p>
          ) : (
            ml.topFeatures.slice(0, 5).map((f) => (
              <div key={f.term} className="flex items-center gap-2 text-xs">
                <span
                  className={cn(
                    "font-mono",
                    f.contribution > 0 ? "text-rose-300" : "text-emerald-300",
                  )}
                >
                  {f.term}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={cn("h-full", f.contribution > 0 ? "bg-rose-400" : "bg-emerald-400")}
                    style={{ width: `${Math.min(100, Math.abs(f.contribution) * 60)}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] text-foreground/55 w-12 text-right">
                  {f.contribution.toFixed(2)}
                </span>
              </div>
            ))
          )}
        </div>
      ),
    },
    {
      key: "transformer",
      title: "Transformer LM",
      family: "Gemini · pretrained",
      icon: Brain,
      verdict: transformer.verdict,
      confidence: transformer.confidence,
      latency: transformer.processing_ms,
      detail: (
        <div className="space-y-2">
          <p className="text-xs text-foreground/80 leading-relaxed italic">
            "{transformer.reasoning}"
          </p>
          {transformer.signals.length > 0 && (
            <ul className="space-y-1.5 pt-1">
              {transformer.signals.slice(0, 4).map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-foreground/75">
                  <span className="mt-1 h-1 w-1 rounded-full bg-sky-300" /> {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      ),
    },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-3 gap-5">
        {cards.map((c, i) => (
          <motion.div
            key={c.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <VerdictCard {...c} />
          </motion.div>
        ))}
      </div>

      {/* Highlighted text */}
      <GlassCard>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-emerald-300/80">
              Article inspection
            </p>
            <h3 className="mt-1 font-display text-xl font-semibold text-white">
              Suspicious phrases highlighted
            </h3>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-foreground/60">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-rose-400/60" />
              Suspicious
            </span>
          </div>
        </div>
        <HighlightedText text={text} phrases={transformer.suspicious_phrases} />
      </GlassCard>
    </div>
  );
}

function VerdictCard({
  title,
  family,
  icon: Icon,
  verdict,
  confidence,
  latency,
  detail,
}: {
  title: string;
  family: string;
  icon: React.ComponentType<{ className?: string }>;
  verdict: "REAL" | "FAKE";
  confidence: number;
  latency: number;
  detail: React.ReactNode;
}) {
  const isFake = verdict === "FAKE";
  const ringClass = isFake
    ? "ring-rose-400/40 bg-rose-500/10"
    : "ring-emerald-400/40 bg-emerald-500/10";
  const textClass = isFake ? "text-rose-300" : "text-emerald-300";
  const VerdictIcon = isFake ? AlertTriangle : ShieldCheck;

  return (
    <GlassCard className="h-full relative overflow-hidden">
      <div
        className={cn(
          "absolute -top-20 -right-20 h-44 w-44 rounded-full blur-3xl",
          isFake ? "bg-rose-500/20" : "bg-emerald-500/20",
        )}
      />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/60">
              {family}
            </p>
            <h3 className="mt-1 font-display text-lg font-semibold text-white">{title}</h3>
          </div>
          <div className={cn("grid h-10 w-10 place-items-center rounded-lg ring-1", ringClass)}>
            <Icon className={cn("h-5 w-5", textClass)} />
          </div>
        </div>
        <div className="mt-5 flex items-end justify-between">
          <div className="flex items-center gap-2">
            <VerdictIcon className={cn("h-6 w-6", textClass)} />
            <span className={cn("font-display text-3xl font-semibold tracking-tight", textClass)}>
              {verdict}
            </span>
          </div>
          <div className="text-right">
            <div className="font-display text-2xl font-semibold text-white">
              {(confidence * 100).toFixed(1)}%
            </div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-foreground/55">
              confidence
            </div>
          </div>
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${confidence * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={cn("h-full", isFake ? "bg-rose-400" : "bg-emerald-400")}
          />
        </div>
        <div className="mt-4 flex items-center justify-between text-[11px] font-mono text-foreground/55">
          <span>Processed in {latency}ms</span>
        </div>
        <div className="mt-5 border-t border-emerald-500/15 pt-4">{detail}</div>
      </div>
    </GlassCard>
  );
}

function HighlightedText({ text, phrases }: { text: string; phrases: string[] }) {
  if (!phrases.length) {
    return (
      <p className="mt-4 text-sm text-foreground/75 leading-relaxed whitespace-pre-wrap">{text}</p>
    );
  }
  // Build a regex from longest phrases first, escape safely.
  const sorted = [...phrases].sort((a, b) => b.length - a.length).filter((p) => p.length > 2);
  const escaped = sorted.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(re);
  return (
    <p className="mt-4 text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">
      {parts.map((p, i) =>
        sorted.some((s) => s.toLowerCase() === p.toLowerCase()) ? (
          <mark
            key={i}
            className="rounded bg-rose-500/20 px-1 py-0.5 text-rose-100 ring-1 ring-rose-400/30"
          >
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </p>
  );
}
