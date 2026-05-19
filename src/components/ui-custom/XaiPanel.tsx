import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sliders,
  Brain,
  Layers,
  Cpu,
  RefreshCw,
  Sparkles,
  Check,
  AlertTriangle,
  Play,
  HelpCircle,
  Undo2,
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { type FullAnalysis, neutralizeArticle } from "@/lib/analyze";
import { SUSPICIOUS_LEXICON, TRUST_LEXICON } from "@/lib/nlp/stopwords";
import { preprocess } from "@/lib/nlp/preprocess";
import { cn } from "@/lib/utils";

interface XaiPanelProps {
  result: FullAnalysis;
  onReAnalyzeText: (text: string) => void;
}

export function XaiPanel({ result, onReAnalyzeText }: XaiPanelProps) {
  const { text } = result;

  // TAB 1: Heuristic Sandbox state variables
  const [exclamWeight, setExclamWeight] = useState(1.2);
  const [capsWeight, setCapsWeight] = useState(6.0);
  const [boundary, setBoundary] = useState(0.5);

  // TAB 2: ML Feature Masking state variables
  const [maskedTerms, setMaskedTerms] = useState<Set<string>>(new Set());

  // TAB 3: Counterfactual Neutralizer state variables
  const [neutralText, setNeutralText] = useState<string | null>(null);
  const [rewriting, setRewriting] = useState(false);
  const [neutralizeErr, setNeutralizeErr] = useState<string | null>(null);

  // 1. Classical Heuristic Sandbox calculations
  const classicalSandboxData = useMemo(() => {
    const pre = preprocess(text);
    const lower = text.toLowerCase();

    let suspScore = 0;
    const matchedSus: string[] = [];
    for (const [term, weight] of Object.entries(SUSPICIOUS_LEXICON)) {
      if (lower.includes(term)) {
        suspScore += weight;
        matchedSus.push(term);
      }
    }

    let trustScore = 0;
    const matchedTr: string[] = [];
    for (const [term, weight] of Object.entries(TRUST_LEXICON)) {
      if (lower.includes(term)) {
        trustScore += weight;
        matchedTr.push(term);
      }
    }

    const exclamations = (text.match(/!/g) ?? []).length;
    const questions = (text.match(/\?/g) ?? []).length;
    const allCapsWords = (text.match(/\b[A-Z]{4,}\b/g) ?? []).length;
    const exclamationDensity = exclamations / Math.max(1, pre.sentenceCount);
    const capsRatio = allCapsWords / Math.max(20, pre.wordCount);

    // Dynamic compilation function based on custom weights
    const getDynamicScore = (ew: number, cw: number) => {
      const raw =
        suspScore * 0.45 +
        exclamationDensity * ew +
        capsRatio * cw +
        Math.max(0, questions - 3) * 0.1 -
        trustScore * 0.35;
      return 1 / (1 + Math.exp(-(raw - 1.2))); // Sigmoid centered around moderate suspicion
    };

    const originalScore = getDynamicScore(1.2, 6.0);
    const dynamicScore = getDynamicScore(exclamWeight, capsWeight);

    const originalVerdict = originalScore >= 0.5 ? "FAKE" : "REAL";
    const dynamicVerdict = dynamicScore >= boundary ? "FAKE" : "REAL";

    return {
      exclamationDensity,
      capsRatio,
      exclamations,
      allCapsWords,
      matchedSus,
      matchedTr,
      originalScore,
      dynamicScore,
      originalVerdict,
      dynamicVerdict,
    };
  }, [text, exclamWeight, capsWeight, boundary]);

  // 2. ML TF-IDF Masking calculations
  const mlSandboxData = useMemo(() => {
    const pre = preprocess(text);
    const docLen = Math.max(1, pre.lemmatized.length);
    const tf: Record<string, number> = { ...pre.termFrequency };
    const lower = text.toLowerCase();

    // Reconstruct features
    for (const term of Object.keys(SUSPICIOUS_LEXICON)) {
      if (term.includes(" ")) {
        const count = (
          lower.match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []
        ).length;
        if (count) tf[term] = (tf[term] ?? 0) + count;
      }
    }
    for (const term of Object.keys(TRUST_LEXICON)) {
      if (term.includes(" ")) {
        const count = (
          lower.match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []
        ).length;
        if (count) tf[term] = (tf[term] ?? 0) + count;
      }
    }

    const getWeight = (t: string) => {
      if (SUSPICIOUS_LEXICON[t] !== undefined) return SUSPICIOUS_LEXICON[t] * 2.4;
      if (TRUST_LEXICON[t] !== undefined) return -TRUST_LEXICON[t] * 1.8;
      return 0;
    };

    const getIdf = (t: string) => {
      if (SUSPICIOUS_LEXICON[t] !== undefined) return 3.2;
      if (TRUST_LEXICON[t] !== undefined) return 2.4;
      return 1.0;
    };

    const bias = -0.4;
    const allFeatures: { term: string; tfidf: number; weight: number; contribution: number }[] = [];

    for (const [term, count] of Object.entries(tf)) {
      const w = getWeight(term);
      if (w === 0) continue;
      const tfidfVal = (count / docLen) * getIdf(term);
      const contrib = tfidfVal * w;
      allFeatures.push({ term, tfidf: tfidfVal, weight: w, contribution: contrib });
    }

    // Sort features by impact
    allFeatures.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

    // Dynamic Logistic regression computation
    const calculateProbability = (masked: Set<string>) => {
      let z = bias;
      for (const f of allFeatures) {
        if (masked.has(f.term)) continue;
        z += f.contribution;
      }
      return 1 / (1 + Math.exp(-z));
    };

    const originalProbability = calculateProbability(new Set());
    const dynamicProbability = calculateProbability(maskedTerms);

    return {
      features: allFeatures,
      originalProbability,
      dynamicProbability,
    };
  }, [text, maskedTerms]);

  // Handle masking toggle
  const toggleMaskTerm = (term: string) => {
    setMaskedTerms((prev) => {
      const next = new Set(prev);
      if (next.has(term)) {
        next.delete(term);
      } else {
        next.add(term);
      }
      return next;
    });
  };

  // Perform AI Counterfactual Rewrite via Gemini
  const handleNeutralize = async () => {
    setRewriting(true);
    setNeutralizeErr(null);
    try {
      const clean = await neutralizeArticle(text);
      setNeutralText(clean);
    } catch (e) {
      setNeutralizeErr(e instanceof Error ? e.message : "Failed to neutralize article.");
    } finally {
      setRewriting(false);
    }
  };

  return (
    <GlassCard className="mt-8 border-emerald-500/20 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-emerald-500/15 pb-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-emerald-400" />
            <h3 className="font-display text-xl font-bold text-white tracking-wide">
              Interactive XAI Explorer
            </h3>
            <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-300 border border-emerald-500/20 uppercase tracking-widest animate-pulse">
              Explainable AI
            </span>
          </div>
          <p className="text-xs text-foreground/60 mt-1 font-mono">
            Deconstruct model decisions, simulate counterfactual adjustments, and rewrite bias in
            real-time.
          </p>
        </div>
      </div>

      <Tabs defaultValue="sandbox" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-white/[0.02] border border-white/5 p-1 rounded-lg">
          <TabsTrigger
            value="sandbox"
            className="flex items-center gap-1.5 py-2.5 text-xs font-mono font-semibold transition"
          >
            <Layers className="h-3.5 w-3.5" />
            Heuristic Sandbox
          </TabsTrigger>
          <TabsTrigger
            value="masking"
            className="flex items-center gap-1.5 py-2.5 text-xs font-mono font-semibold transition"
          >
            <Cpu className="h-3.5 w-3.5" />
            Feature Masker
          </TabsTrigger>
          <TabsTrigger
            value="rewrite"
            className="flex items-center gap-1.5 py-2.5 text-xs font-mono font-semibold transition"
          >
            <Brain className="h-3.5 w-3.5" />
            AI Neutralizer
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Heuristic Sandbox */}
        <TabsContent value="sandbox" className="mt-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Controls */}
            <div className="space-y-5 bg-white/[0.01] border border-white/5 rounded-xl p-5">
              <h4 className="font-mono text-xs text-emerald-300 font-semibold tracking-wider uppercase border-b border-emerald-500/10 pb-2">
                Lexical Weights & Thresholds
              </h4>

              {/* Slider 1: Exclamation Density Weight */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-foreground/75 flex items-center gap-1">
                    Exclamation density weight
                    <span className="text-[10px] text-foreground/45">
                      ({classicalSandboxData.exclamationDensity.toFixed(2)}/sentence)
                    </span>
                  </span>
                  <span className="text-emerald-400 font-bold">{exclamWeight.toFixed(1)}x</span>
                </div>
                <Slider
                  min={0.0}
                  max={3.0}
                  step={0.1}
                  value={[exclamWeight]}
                  onValueChange={(val) => setExclamWeight(val[0])}
                />
              </div>

              {/* Slider 2: Caps Ratio Weight */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-foreground/75 flex items-center gap-1">
                    ALL-CAPS word ratio weight
                    <span className="text-[10px] text-foreground/45">
                      ({(classicalSandboxData.capsRatio * 100).toFixed(1)}%)
                    </span>
                  </span>
                  <span className="text-emerald-400 font-bold">{capsWeight.toFixed(1)}x</span>
                </div>
                <Slider
                  min={0.0}
                  max={12.0}
                  step={0.5}
                  value={[capsWeight]}
                  onValueChange={(val) => setCapsWeight(val[0])}
                />
              </div>

              {/* Slider 3: Boundary threshold */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-foreground/75">Decision Boundary Threshold</span>
                  <span className="text-emerald-400 font-bold">{(boundary * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  min={0.1}
                  max={0.9}
                  step={0.05}
                  value={[boundary]}
                  onValueChange={(val) => setBoundary(val[0])}
                />
                <p className="text-[10px] text-foreground/40 leading-relaxed">
                  Adjusting the boundary controls the strictness of the heuristic classification.
                  Higher thresholds require denser suspicious signals to trigger a FAKE verdict.
                </p>
              </div>

              <div className="flex justify-end pt-2 border-t border-white/5">
                <button
                  onClick={() => {
                    setExclamWeight(1.2);
                    setCapsWeight(6.0);
                    setBoundary(0.5);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-foreground/50 hover:text-emerald-300 hover:underline transition"
                >
                  <Undo2 className="h-3 w-3" /> Reset default weights
                </button>
              </div>
            </div>

            {/* Simulated Result Gauge */}
            <div className="flex flex-col justify-between bg-white/[0.02] border border-emerald-500/10 rounded-xl p-5 relative overflow-hidden">
              <h4 className="font-mono text-xs text-foreground/70 font-semibold tracking-wider uppercase border-b border-white/5 pb-2">
                Dynamic Sim Output
              </h4>

              <div className="my-6 space-y-4 relative">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-foreground/50">Dynamic Score:</span>
                  <span
                    className={cn(
                      "font-display text-2xl font-bold font-mono",
                      classicalSandboxData.dynamicScore >= boundary
                        ? "text-rose-400"
                        : "text-emerald-400",
                    )}
                  >
                    {(classicalSandboxData.dynamicScore * 100).toFixed(1)}%
                  </span>
                </div>

                <div className="h-3 rounded-full bg-white/5 overflow-hidden relative">
                  {/* Dynamic value bar */}
                  <motion.div
                    className={cn(
                      "h-full rounded-full transition-colors duration-300",
                      classicalSandboxData.dynamicScore >= boundary
                        ? "bg-rose-400"
                        : "bg-emerald-400",
                    )}
                    animate={{ width: `${classicalSandboxData.dynamicScore * 100}%` }}
                    transition={{ duration: 0.2 }}
                  />
                  {/* Threshold mark pin */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-sky-300 border-l border-sky-400/80 shadow-[0_0_8px_#38bdf8] pointer-events-none"
                    style={{ left: `${boundary * 100}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-foreground/40">
                  <span>REAL probability</span>
                  <span className="text-sky-300">
                    boundary pin ({(boundary * 100).toFixed(0)}%)
                  </span>
                  <span>FAKE probability</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4 border-t border-white/5 pt-4">
                <div className="rounded-lg bg-white/[0.02] border border-white/5 p-3 text-center">
                  <span className="text-[10px] font-mono text-foreground/50 block">
                    Baseline Verdict
                  </span>
                  <span
                    className={cn(
                      "font-display text-lg font-bold block mt-0.5",
                      classicalSandboxData.originalVerdict === "FAKE"
                        ? "text-rose-400"
                        : "text-emerald-400",
                    )}
                  >
                    {classicalSandboxData.originalVerdict}
                  </span>
                </div>
                <div
                  className={cn(
                    "rounded-lg border p-3 text-center transition-all duration-300",
                    classicalSandboxData.dynamicVerdict === "FAKE"
                      ? "border-rose-500/20 bg-rose-500/5 shadow-[0_0_12px_rgba(244,63,94,0.05)]"
                      : "border-emerald-500/20 bg-emerald-500/5 shadow-[0_0_12px_rgba(16,185,129,0.05)]",
                  )}
                >
                  <span className="text-[10px] font-mono text-foreground/50 block">
                    Tuned Verdict
                  </span>
                  <motion.span
                    key={classicalSandboxData.dynamicVerdict}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={cn(
                      "font-display text-lg font-bold block mt-0.5",
                      classicalSandboxData.dynamicVerdict === "FAKE"
                        ? "text-rose-400"
                        : "text-emerald-400",
                    )}
                  >
                    {classicalSandboxData.dynamicVerdict}
                  </motion.span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Feature Masking Simulator */}
        <TabsContent value="masking" className="mt-6 space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Tokens Box */}
            <div className="md:col-span-2 space-y-4 bg-white/[0.01] border border-white/5 rounded-xl p-5">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h4 className="font-mono text-xs text-emerald-300 font-semibold tracking-wider uppercase">
                  Vector Term Vocabulary
                </h4>
                <span className="text-[10px] font-mono text-foreground/40">
                  Click tokens to mask out of calculations
                </span>
              </div>

              {mlSandboxData.features.length === 0 ? (
                <p className="text-xs text-foreground/50 italic py-4">
                  No lexical terms matched in preprocessed vocabulary.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-[220px] overflow-y-auto pr-1">
                  {mlSandboxData.features.map((f) => {
                    const isMasked = maskedTerms.has(f.term);
                    const isFakeLeaning = f.contribution > 0;
                    return (
                      <button
                        key={f.term}
                        onClick={() => toggleMaskTerm(f.term)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-mono transition-all duration-200 border",
                          isMasked
                            ? "bg-white/[0.01] border-white/5 text-foreground/20 line-through opacity-35 hover:opacity-60"
                            : isFakeLeaning
                              ? "bg-rose-500/10 border-rose-500/20 text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.05)] hover:bg-rose-500/20"
                              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.05)] hover:bg-emerald-500/20",
                        )}
                      >
                        <span>{f.term}</span>
                        <span className="text-[9px] font-bold opacity-60">
                          ({(f.contribution > 0 ? "+" : "") + f.contribution.toFixed(2)})
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {maskedTerms.size > 0 && (
                <div className="flex justify-end border-t border-white/5 pt-2">
                  <button
                    onClick={() => setMaskedTerms(new Set())}
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-foreground/50 hover:text-emerald-300 hover:underline transition"
                  >
                    <Undo2 className="h-3 w-3" /> Unmask all ({maskedTerms.size}) tokens
                  </button>
                </div>
              )}
            </div>

            {/* Shift Dashboard */}
            <div className="bg-white/[0.02] border border-emerald-500/10 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <h4 className="font-mono text-xs text-foreground/70 font-semibold tracking-wider uppercase border-b border-white/5 pb-2">
                  Classifier Probability Shift
                </h4>

                <div className="mt-5 space-y-6">
                  {/* Original Probability */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-mono text-foreground/50">
                      <span>Baseline Probability</span>
                      <span>{(mlSandboxData.originalProbability * 100).toFixed(1)}%</span>
                    </div>
                    <Progress
                      value={mlSandboxData.originalProbability * 100}
                      className="h-2 bg-white/5"
                      indicatorClassName="bg-emerald-500/40"
                    />
                  </div>

                  {/* Dynamic Shifted Probability */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-emerald-300 font-medium">Shifted Probability</span>
                      <span
                        className={cn(
                          "font-bold",
                          mlSandboxData.dynamicProbability >= 0.5
                            ? "text-rose-300"
                            : "text-emerald-300",
                        )}
                      >
                        {(mlSandboxData.dynamicProbability * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress
                      value={mlSandboxData.dynamicProbability * 100}
                      className="h-2.5 bg-white/5"
                      indicatorClassName={cn(
                        "transition-all duration-300",
                        mlSandboxData.dynamicProbability >= 0.5
                          ? "bg-rose-400 glow-rose"
                          : "bg-emerald-400 glow-emerald",
                      )}
                    />
                  </div>
                </div>
              </div>

              <div className="text-[10px] font-mono text-foreground/45 mt-4 leading-relaxed bg-white/[0.01] border border-white/5 rounded p-2.5">
                <span className="text-emerald-300/80 font-bold block mb-1">
                  XAI Mathematical Logit:
                </span>
                Removing red terms decreases z-logits, causing sigmoid outputs to drop toward the
                REAL sector.
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 3: AI Counterfactual Tone Neutralizer */}
        <TabsContent value="rewrite" className="mt-6 space-y-6">
          <div className="space-y-5">
            {/* Explanatory Banner */}
            <div className="bg-white/[0.01] border border-white/5 rounded-xl p-5 flex items-start gap-4">
              <div className="p-2.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-emerald-300 mt-0.5">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-display text-sm font-semibold text-white">
                  Counterfactual Mitigation
                </h4>
                <p className="text-xs text-foreground/60 leading-relaxed">
                  Generative models classify bias based on sensational markers. Tone neutralization
                  rewrites paragraphs into highly neutral, encyclopedic phrasing, testing if we can
                  trigger a safe verdict across classical, ML, and transformer networks.
                </p>
              </div>
            </div>

            {/* Rewrite UI Flow */}
            {!neutralText ? (
              <div className="flex flex-col items-center justify-center border border-dashed border-emerald-500/25 bg-white/[0.01] rounded-xl p-10 text-center">
                <Brain className="h-10 w-10 text-emerald-500/50 mb-3 animate-pulse" />
                <h5 className="font-display text-sm font-semibold text-white">
                  Generate Neutral Copy
                </h5>
                <p className="text-xs text-foreground/45 max-w-sm mt-1 leading-relaxed">
                  Leverage Gemini-2.5-Flash to clean emotional sensationalism, hyperbole, and
                  conspiracy speculation from this article.
                </p>

                {neutralizeErr && (
                  <div className="mt-4 rounded bg-rose-500/15 border border-rose-500/30 px-3 py-1.5 text-xs text-rose-300">
                    {neutralizeErr}
                  </div>
                )}

                <button
                  onClick={handleNeutralize}
                  disabled={rewriting}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-xs font-semibold text-emerald-950 hover:bg-emerald-400 transition shadow-[0_0_15px_rgba(16,185,129,0.15)] disabled:opacity-50"
                >
                  {rewriting ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {rewriting ? "Neutralizing tone..." : "Neutralize tone with AI"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Diff Comparison Grid */}
                <div className="grid md:grid-cols-2 gap-5">
                  {/* Left Column: Original Text */}
                  <div className="bg-white/[0.01] border border-white/5 rounded-xl p-4 flex flex-col justify-between min-h-[220px]">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-semibold block mb-2">
                        Original Article (Sensational)
                      </span>
                      <div className="text-xs text-foreground/75 leading-relaxed font-mono max-h-[160px] overflow-y-auto pr-1">
                        {text.slice(0, 800)}
                        {text.length > 800 && "..."}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Neutralized Text */}
                  <div className="bg-white/[0.02] border border-emerald-500/20 rounded-xl p-4 flex flex-col justify-between min-h-[220px] shadow-[0_0_15px_rgba(16,185,129,0.03)]">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold block mb-2">
                        Objective Rewrite (Clean Copy)
                      </span>
                      <div className="text-xs text-emerald-100/90 leading-relaxed font-mono max-h-[160px] overflow-y-auto pr-1">
                        {neutralText}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Counterfactual Action buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4">
                  <button
                    onClick={() => setNeutralText(null)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-3.5 py-2 text-xs text-foreground/80 hover:bg-white/[0.05] transition"
                  >
                    Discard rewrite
                  </button>

                  <button
                    onClick={() => onReAnalyzeText(neutralText)}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-emerald-950 hover:bg-emerald-400 transition shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Re-run analysis on clean copy
                  </button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </GlassCard>
  );
}
