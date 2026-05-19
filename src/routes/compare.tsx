import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Radar,
  RadarChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Brain,
  Cpu,
  Layers,
  ShieldCheck,
  AlertTriangle,
  Clock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Shell } from "@/components/layout/Shell";
import { GlassCard } from "@/components/ui-custom/GlassCard";
import { SectionHeading } from "@/components/ui-custom/SectionHeading";
import { BENCHMARKS } from "@/lib/nlp/benchmarks";
import { type FullAnalysis } from "@/lib/analyze";

export const Route = createFileRoute("/compare")({
  component: ComparePage,
});

const COLORS = ["#10b981", "#7dd3fc", "#34d399"];

function ComparePage() {
  const [liveAnalysis, setLiveAnalysis] = useState<FullAnalysis | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("veritas_last_analysis");
      if (stored) {
        setLiveAnalysis(JSON.parse(stored));
      }
    } catch (err) {
      console.warn("Failed to load last analysis in ComparePage:", err);
    }
  }, []);

  const metricData = ["accuracy", "precision", "recall", "f1"].map((k) => {
    const row: Record<string, string | number> = { metric: k.toUpperCase() };
    BENCHMARKS.forEach(
      (b) => (row[b.name] = +((b[k as keyof typeof b] as number) * 100).toFixed(1)),
    );
    return row;
  });

  const radarData = BENCHMARKS.map((b) => ({
    name: b.name,
    accuracy: b.accuracy * 100,
    precision: b.precision * 100,
    recall: b.recall * 100,
    f1: b.f1 * 100,
    speed: Math.max(5, 100 - Math.log10(b.avgLatencyMs) * 25),
  }));

  const speedData = BENCHMARKS.map((b) => ({ name: b.name, latency: b.avgLatencyMs }));

  return (
    <Shell>
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <SectionHeading
          eyebrow="Model comparison"
          title="Three approaches, head-to-head."
        />

        {/* Dynamic Live Comparison Section */}
        <div className="mt-8">
          {liveAnalysis ? (
            <GlassCard className="relative overflow-hidden border-emerald-500/25 shadow-[0_0_30px_rgba(16,185,129,0.08)]">
              <div className="absolute -top-24 -left-24 h-60 w-60 rounded-full blur-[100px] bg-emerald-500/10" />
              <div className="absolute -bottom-24 -right-24 h-60 w-60 rounded-full blur-[100px] bg-sky-500/10" />

              <div className="relative">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-emerald-500/15 pb-5">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)] uppercase tracking-wider font-mono">
                      <Sparkles className="h-3 w-3 animate-pulse" /> Live Analysis
                    </span>
                    <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
                      Active Live Article Comparison
                    </h2>
                    <p className="mt-1 text-sm text-foreground/60 leading-relaxed max-w-2xl">
                      Real-time side-by-side performance of our three classifiers on the custom article analyzed in your current session.
                    </p>
                  </div>
                  <Link
                    to="/detect"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition-all font-mono hover:translate-x-0.5"
                  >
                    View in Detector <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <div className="mt-6 grid lg:grid-cols-5 gap-6">
                  {/* Left Column: Article Preview */}
                  <div className="lg:col-span-2 flex flex-col justify-between rounded-xl border border-emerald-500/10 bg-white/[0.01] p-5">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-foreground/50 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Currently Analyzed Article
                      </p>
                      <blockquote className="mt-3 text-xs italic text-foreground/75 border-l-2 border-emerald-500/20 pl-3 leading-relaxed line-clamp-6">
                        "{liveAnalysis.text}"
                      </blockquote>
                    </div>
                    <div className="mt-5 pt-3 border-t border-emerald-500/10 flex items-center justify-between text-[11px] font-mono text-foreground/50">
                      <span>{liveAnalysis.text.split(/\s+/).filter(Boolean).length} words</span>
                      <span>{liveAnalysis.text.length} characters</span>
                    </div>
                  </div>

                  {/* Right Column: 3-Model Side-by-Side */}
                  <div className="lg:col-span-3 grid md:grid-cols-3 gap-4">
                    {/* Classical Model */}
                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] uppercase text-foreground/55 tracking-wider">Classical</span>
                          <Layers className="h-3.5 w-3.5 text-foreground/40" />
                        </div>
                        <h4 className="mt-1.5 text-xs font-semibold text-white truncate">Lexicon + Features</h4>

                        {/* Verdict Badge */}
                        <div className="mt-3 flex items-center gap-1.5">
                          {liveAnalysis.classical.verdict === "FAKE" ? (
                            <div className="inline-flex items-center gap-1 rounded bg-rose-500/10 border border-rose-500/25 px-2 py-0.5 text-xs font-bold text-rose-300">
                              <AlertTriangle className="h-3 w-3" /> FAKE
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-xs font-bold text-emerald-300">
                              <ShieldCheck className="h-3 w-3" /> REAL
                            </div>
                          )}
                        </div>

                        {/* Confidence */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                            <span className="text-foreground/50">Confidence</span>
                            <span className="text-white font-semibold">{(liveAnalysis.classical.confidence * 100).toFixed(0)}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${liveAnalysis.classical.verdict === "FAKE" ? "bg-rose-400" : "bg-emerald-400"}`}
                              style={{ width: `${liveAnalysis.classical.confidence * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-emerald-500/10 flex items-center justify-between text-[10px] font-mono text-foreground/55">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Latency</span>
                        <span className="text-white">{liveAnalysis.classical.processingMs}ms</span>
                      </div>
                    </div>

                    {/* ML Classifier */}
                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] uppercase text-foreground/55 tracking-wider">Classical ML</span>
                          <Cpu className="h-3.5 w-3.5 text-foreground/40" />
                        </div>
                        <h4 className="mt-1.5 text-xs font-semibold text-white truncate">TF-IDF + LogReg</h4>

                        {/* Verdict Badge */}
                        <div className="mt-3 flex items-center gap-1.5">
                          {liveAnalysis.ml.verdict === "FAKE" ? (
                            <div className="inline-flex items-center gap-1 rounded bg-rose-500/10 border border-rose-500/25 px-2 py-0.5 text-xs font-bold text-rose-300">
                              <AlertTriangle className="h-3 w-3" /> FAKE
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-xs font-bold text-emerald-300">
                              <ShieldCheck className="h-3 w-3" /> REAL
                            </div>
                          )}
                        </div>

                        {/* Confidence */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                            <span className="text-foreground/50">Confidence</span>
                            <span className="text-white font-semibold">{(liveAnalysis.ml.confidence * 100).toFixed(0)}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${liveAnalysis.ml.verdict === "FAKE" ? "bg-rose-400" : "bg-emerald-400"}`}
                              style={{ width: `${liveAnalysis.ml.confidence * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-emerald-500/10 flex items-center justify-between text-[10px] font-mono text-foreground/55">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Latency</span>
                        <span className="text-white">{liveAnalysis.ml.processingMs}ms</span>
                      </div>
                    </div>

                    {/* Transformer LM */}
                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] uppercase text-foreground/55 tracking-wider">Transformer</span>
                          <Brain className="h-3.5 w-3.5 text-foreground/40" />
                        </div>
                        <h4 className="mt-1.5 text-xs font-semibold text-white truncate">Gemini · Pretrained</h4>

                        {/* Verdict Badge */}
                        <div className="mt-3 flex items-center gap-1.5">
                          {liveAnalysis.transformer.verdict === "FAKE" ? (
                            <div className="inline-flex items-center gap-1 rounded bg-rose-500/10 border border-rose-500/25 px-2 py-0.5 text-xs font-bold text-rose-300">
                              <AlertTriangle className="h-3 w-3" /> FAKE
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-xs font-bold text-emerald-300">
                              <ShieldCheck className="h-3 w-3" /> REAL
                            </div>
                          )}
                        </div>

                        {/* Confidence */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                            <span className="text-foreground/50">Confidence</span>
                            <span className="text-white font-semibold">{(liveAnalysis.transformer.confidence * 100).toFixed(0)}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${liveAnalysis.transformer.verdict === "FAKE" ? "bg-rose-400" : "bg-emerald-400"}`}
                              style={{ width: `${liveAnalysis.transformer.confidence * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-emerald-500/10 flex items-center justify-between text-[10px] font-mono text-foreground/55">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Latency</span>
                        <span className="text-white">{liveAnalysis.transformer.processing_ms}ms</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sub-Comparison Graphs: Speed Comparison and Logit Probability Spectrum */}
                <div className="mt-6 grid md:grid-cols-2 gap-5 pt-5 border-t border-emerald-500/10">
                  {/* Live execution latency */}
                  <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4">
                    <h5 className="font-mono text-xs font-semibold text-white flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-sky-400" /> Processing Latency Trade-off (Live Execution)
                    </h5>
                    <p className="mt-1 text-[10px] text-foreground/55 leading-relaxed">
                      Illustrates the raw operational delay for this article. NLP and ML execute instantly, whereas the deep Transformer incurs high latency for generation reasoning.
                    </p>
                    <div className="mt-4 space-y-3">
                      {[
                        { name: "Classical NLP", val: liveAnalysis.classical.processingMs, color: "bg-emerald-500" },
                        { name: "TF-IDF + ML", val: liveAnalysis.ml.processingMs, color: "bg-teal-500" },
                        { name: "Transformer (Gemini)", val: liveAnalysis.transformer.processing_ms, color: "bg-sky-500" },
                      ].map((item) => {
                        const maxVal = Math.max(
                          liveAnalysis.classical.processingMs,
                          liveAnalysis.ml.processingMs,
                          liveAnalysis.transformer.processing_ms,
                          1
                        );
                        const percent = (item.val / maxVal) * 100;
                        return (
                          <div key={item.name} className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span className="text-foreground/75 font-medium">{item.name}</span>
                              <span className="text-white">{item.val}ms</span>
                            </div>
                            <div className="h-2 rounded-full bg-white/5 overflow-hidden flex">
                              <div
                                className={`h-full rounded-full transition-all duration-1000 ${item.color}`}
                                style={{ width: `${Math.max(1, percent)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Confidence Spectrum Alignment */}
                  <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4">
                    <h5 className="font-mono text-xs font-semibold text-white flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Logit Probability Spectrum Alignment
                    </h5>
                    <p className="mt-1 text-[10px] text-foreground/55 leading-relaxed">
                      Probability scores scaled from 0% (Absolute REAL) to 100% (Absolute FAKE). Alignment highlights consensus, while divergence reveals subtle edge-cases.
                    </p>
                    <div className="mt-5 space-y-4 relative">
                      {/* Spectrum line */}
                      <div className="h-2 rounded-full bg-gradient-to-r from-emerald-500 via-yellow-500/50 to-rose-500 relative">
                        {/* Scale labels inside spectrum */}
                        <div className="absolute inset-0 flex justify-between px-2 text-[8px] font-mono text-emerald-955 font-bold items-center select-none pointer-events-none">
                          <span>REAL</span>
                          <span>UNCERTAIN</span>
                          <span>FAKE</span>
                        </div>
                      </div>

                      {/* Floating model pointers */}
                      <div className="pt-1 space-y-2">
                        {[
                          {
                            name: "Classical",
                            score: liveAnalysis.classical.verdict === "FAKE" ? liveAnalysis.classical.confidence : 1 - liveAnalysis.classical.confidence,
                            color: "text-emerald-300 bg-emerald-500/25 border-emerald-400/40"
                          },
                          {
                            name: "ML LogReg",
                            score: liveAnalysis.ml.verdict === "FAKE" ? liveAnalysis.ml.confidence : 1 - liveAnalysis.ml.confidence,
                            color: "text-teal-300 bg-teal-500/25 border-teal-400/40"
                          },
                          {
                            name: "Transformer",
                            score: liveAnalysis.transformer.verdict === "FAKE" ? liveAnalysis.transformer.confidence : 1 - liveAnalysis.transformer.confidence,
                            color: "text-sky-300 bg-sky-500/25 border-sky-400/40"
                          }
                        ].map((m) => (
                          <div key={m.name} className="flex items-center justify-between text-[10px] font-mono">
                            <span className="text-foreground/75">{m.name}:</span>
                            <div className="flex items-center gap-2">
                              <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold ${m.color}`}>
                                {(m.score * 100).toFixed(0)}% FAKE-leaning
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          ) : (
            <GlassCard className="relative overflow-hidden border-emerald-500/15 py-8 text-center bg-white/[0.01]">
              <div className="max-w-md mx-auto">
                <div className="mx-auto w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)] mb-4">
                  <Sparkles className="h-6 w-6 animate-pulse" />
                </div>
                <h3 className="font-display text-lg font-semibold text-white">No custom live analysis detected</h3>
                <p className="mt-2 text-xs text-foreground/60 leading-relaxed">
                  We've populated the static benchmarks below using a gold-standard reference split. Run your own custom article through our three-tier analysis engine to see active live side-by-side performance here!
                </p>
                <div className="mt-5">
                  <Link
                    to="/detect"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-emerald-950 hover:bg-emerald-400 transition glow-emerald"
                  >
                    Launch Live Detector <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </GlassCard>
          )}
        </div>

        {/* Side-by-side */}
        <div className="mt-12 grid lg:grid-cols-3 gap-5">
          {BENCHMARKS.map((b, i) => (
            <GlassCard key={b.id} className="relative overflow-hidden">
              <div
                className="absolute -top-16 -right-16 h-40 w-40 rounded-full blur-3xl"
                style={{ background: `${COLORS[i]}30` }}
              />
              <p
                className="font-mono text-[11px] uppercase tracking-[0.2em]"
                style={{ color: COLORS[i] }}
              >
                {b.family}
              </p>
              <h3 className="mt-2 font-display text-xl font-semibold text-white">{b.name}</h3>
              <div className="mt-5 space-y-3">
                {[
                  ["Accuracy", b.accuracy],
                  ["Precision", b.precision],
                  ["Recall", b.recall],
                  ["F1", b.f1],
                ].map(([label, val]) => (
                  <div key={String(label)}>
                    <div className="flex items-center justify-between text-xs font-mono mb-1">
                      <span className="text-foreground/60 uppercase tracking-wider">{label}</span>
                      <span className="text-white">{((val as number) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(val as number) * 100}%`, background: COLORS[i] }}
                      />
                    </div>
                  </div>
                ))}
                <div className="pt-2 mt-2 border-t border-emerald-500/15 flex justify-between text-xs font-mono">
                  <span className="text-foreground/60">Latency</span>
                  <span className="text-white">{b.avgLatencyMs}ms</span>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Metric chart */}
        <div className="mt-8 grid lg:grid-cols-2 gap-5">
          <GlassCard>
            <h3 className="font-display text-lg font-semibold text-white">
              Performance metrics (%)
            </h3>
            <div className="mt-4 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metricData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,185,129,0.1)" />
                  <XAxis dataKey="metric" stroke="rgba(255,255,255,0.5)" fontSize={11} />
                  <YAxis stroke="rgba(255,255,255,0.5)" fontSize={11} domain={[60, 100]} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(2,17,13,0.95)",
                      border: "1px solid rgba(16,185,129,0.3)",
                      borderRadius: 8,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {BENCHMARKS.map((b, i) => (
                    <Bar key={b.name} dataKey={b.name} fill={COLORS[i]} radius={[6, 6, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          <GlassCard>
            <h3 className="font-display text-lg font-semibold text-white">Capability profile</h3>
            <div className="mt-4 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart
                  data={[
                    {
                      axis: "Accuracy",
                      ...Object.fromEntries(radarData.map((r) => [r.name, r.accuracy])),
                    },
                    {
                      axis: "Precision",
                      ...Object.fromEntries(radarData.map((r) => [r.name, r.precision])),
                    },
                    {
                      axis: "Recall",
                      ...Object.fromEntries(radarData.map((r) => [r.name, r.recall])),
                    },
                    { axis: "F1", ...Object.fromEntries(radarData.map((r) => [r.name, r.f1])) },
                    {
                      axis: "Speed",
                      ...Object.fromEntries(radarData.map((r) => [r.name, r.speed])),
                    },
                  ]}
                >
                  <PolarGrid stroke="rgba(16,185,129,0.15)" />
                  <PolarAngleAxis dataKey="axis" stroke="rgba(255,255,255,0.6)" fontSize={11} />
                  <PolarRadiusAxis domain={[0, 100]} stroke="rgba(255,255,255,0.3)" fontSize={10} />
                  {BENCHMARKS.map((b, i) => (
                    <Radar
                      key={b.name}
                      dataKey={b.name}
                      stroke={COLORS[i]}
                      fill={COLORS[i]}
                      fillOpacity={0.18}
                    />
                  ))}
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </div>

        {/* Speed + table */}
        <div className="mt-8 grid lg:grid-cols-5 gap-5">
          <GlassCard className="lg:col-span-2">
            <h3 className="font-display text-lg font-semibold text-white">
              Average latency (ms, log scale)
            </h3>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={speedData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,185,129,0.1)" />
                  <XAxis
                    type="number"
                    scale="log"
                    domain={[1, 2000]}
                    stroke="rgba(255,255,255,0.5)"
                    fontSize={11}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="rgba(255,255,255,0.5)"
                    fontSize={10}
                    width={140}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(2,17,13,0.95)",
                      border: "1px solid rgba(16,185,129,0.3)",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="latency" fill="#7dd3fc" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          <GlassCard className="lg:col-span-3 overflow-x-auto">
            <h3 className="font-display text-lg font-semibold text-white">Evaluation summary</h3>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-foreground/55">
                  <th className="pb-2">Model</th>
                  <th className="pb-2">Acc</th>
                  <th className="pb-2">Prec</th>
                  <th className="pb-2">Recall</th>
                  <th className="pb-2">F1</th>
                  <th className="pb-2">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-500/10">
                {BENCHMARKS.map((b) => (
                  <tr key={b.id} className="text-foreground/85">
                    <td className="py-3 font-medium text-white">{b.name}</td>
                    <td className="py-3 font-mono">{(b.accuracy * 100).toFixed(1)}%</td>
                    <td className="py-3 font-mono">{(b.precision * 100).toFixed(1)}%</td>
                    <td className="py-3 font-mono">{(b.recall * 100).toFixed(1)}%</td>
                    <td className="py-3 font-mono text-emerald-300">{b.f1.toFixed(3)}</td>
                    <td className="py-3 font-mono">{b.avgLatencyMs}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassCard>
        </div>
      </section>
    </Shell>
  );
}
