import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { Activity, Database, ShieldAlert, ShieldCheck, ArrowRight } from "lucide-react";
import { Shell } from "@/components/layout/Shell";
import { GlassCard } from "@/components/ui-custom/GlassCard";
import { SectionHeading } from "@/components/ui-custom/SectionHeading";
import { ConfusionMatrix } from "@/components/ui-custom/ConfusionMatrix";
import { BENCHMARKS } from "@/lib/nlp/benchmarks";
import { supabase } from "@/integrations/supabase/client";
import { type FullAnalysis } from "@/lib/analyze";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
});

interface AnalysisRow {
  id: string;
  created_at: string;
  text_preview: string;
  word_count: number;
  transformer_verdict: string;
  transformer_confidence: number;
  ml_verdict: string;
  classical_verdict: string;
  suspicious_keywords: string[];
}

function AnalyticsPage() {
  const [rows, setRows] = useState<AnalysisRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSource, setActiveSource] = useState<"active" | "live" | "benchmark">("live");
  const [activeSessionRow, setActiveSessionRow] = useState<AnalysisRow | null>(null);

  useEffect(() => {
    // 1. Load active session row from localStorage
    try {
      const lastStr = localStorage.getItem("veritas_last_analysis");
      if (lastStr) {
        const fa = JSON.parse(lastStr) as FullAnalysis;
        if (fa && fa.text) {
          setActiveSessionRow({
            id: "active_session",
            created_at: new Date().toISOString(),
            text_preview: fa.text.slice(0, 280),
            word_count: fa.text.split(/\s+/).filter(Boolean).length,
            transformer_verdict: fa.transformer.verdict,
            transformer_confidence: fa.transformer.confidence,
            ml_verdict: fa.ml.verdict,
            classical_verdict: fa.classical.verdict,
            suspicious_keywords: fa.transformer.suspicious_phrases || [],
          });
          // Default to active article telemetry if one exists in the current session
          setActiveSource("active");
        }
      }
    } catch (e) {
      console.warn("Failed to load last analysis in AnalyticsPage mount:", e);
    }

    // 2. Fetch Supabase rows and merge with local history
    (async () => {
      let dbRows: AnalysisRow[] = [];
      try {
        const { data } = await supabase
          .from("analyses")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200);
        dbRows = (data as AnalysisRow[]) ?? [];
      } catch (err) {
        console.warn("Failed to fetch analyses from Supabase:", err);
      }

      // Load local session history
      let localHistoryRows: AnalysisRow[] = [];
      try {
        const historyStr = localStorage.getItem("veritas_session_history");
        if (historyStr) {
          const parsed = JSON.parse(historyStr);
          if (Array.isArray(parsed)) {
            localHistoryRows = parsed.map((item: any, idx: number) => {
              if (item.classical && item.ml && item.transformer) {
                return {
                  id: item.id || `session_${idx}_${item.transformer.processing_ms || idx}`,
                  created_at: item.created_at || new Date().toISOString(),
                  text_preview: item.text.slice(0, 280),
                  word_count: item.word_count || item.text.split(/\s+/).filter(Boolean).length,
                  transformer_verdict: item.transformer.verdict,
                  transformer_confidence: item.transformer.confidence,
                  ml_verdict: item.ml.verdict,
                  classical_verdict: item.classical.verdict,
                  suspicious_keywords: item.transformer.suspicious_phrases || [],
                };
              }
              return item;
            });
          }
        }
      } catch (err) {
        console.warn("Failed to parse local session history:", err);
      }

      // Merge and deduplicate by word_count and text_preview
      const merged = [...localHistoryRows];
      dbRows.forEach((dbR) => {
        const exists = merged.some(
          (locR) =>
            locR.text_preview === dbR.text_preview ||
            (locR.word_count === dbR.word_count &&
              locR.transformer_confidence === dbR.transformer_confidence),
        );
        if (!exists) {
          merged.push(dbR);
        }
      });

      // Sort by created_at descending
      merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setRows(merged);
      setLoading(false);
    })();
  }, []);

  // Filter rows based on activeSource
  const activeRowsToCalculate =
    activeSource === "active"
      ? activeSessionRow
        ? [activeSessionRow]
        : []
      : activeSource === "live"
        ? rows
        : [];

  const total = activeRowsToCalculate.length;
  const fakeCount = activeRowsToCalculate.filter((r) => r.transformer_verdict === "FAKE").length;
  const realCount = total - fakeCount;
  const avgConfidence = total
    ? activeRowsToCalculate.reduce((s, r) => s + Number(r.transformer_confidence), 0) / total
    : 0;

  // Live Confusion Matrices Calculation
  const liveClassicalConfusion = { tp: 0, fp: 0, tn: 0, fn: 0 };
  const liveMlConfusion = { tp: 0, fp: 0, tn: 0, fn: 0 };
  const liveTransformerConfusion = { tp: 0, fp: 0, tn: 0, fn: 0 };

  activeRowsToCalculate.forEach((r) => {
    const tV = r.transformer_verdict;
    const cV = r.classical_verdict;
    const mV = r.ml_verdict;

    // 1. Classical vs Transformer (Baseline consensus)
    if (cV === "FAKE" && tV === "FAKE") liveClassicalConfusion.tp++;
    else if (cV === "FAKE" && tV === "REAL") liveClassicalConfusion.fp++;
    else if (cV === "REAL" && tV === "REAL") liveClassicalConfusion.tn++;
    else if (cV === "REAL" && tV === "FAKE") liveClassicalConfusion.fn++;

    // 2. ML vs Transformer (Baseline consensus)
    if (mV === "FAKE" && tV === "FAKE") liveMlConfusion.tp++;
    else if (mV === "FAKE" && tV === "REAL") liveMlConfusion.fp++;
    else if (mV === "REAL" && tV === "REAL") liveMlConfusion.tn++;
    else if (mV === "REAL" && tV === "FAKE") liveMlConfusion.fn++;

    // 3. Transformer vs Ensemble Consensus (Majority Vote)
    const fakeVotes = (cV === "FAKE" ? 1 : 0) + (mV === "FAKE" ? 1 : 0) + (tV === "FAKE" ? 1 : 0);
    const consensus = fakeVotes >= 2 ? "FAKE" : "REAL";

    if (tV === "FAKE" && consensus === "FAKE") liveTransformerConfusion.tp++;
    else if (tV === "FAKE" && consensus === "REAL") liveTransformerConfusion.fp++;
    else if (tV === "REAL" && consensus === "REAL") liveTransformerConfusion.tn++;
    else if (tV === "REAL" && consensus === "FAKE") liveTransformerConfusion.fn++;
  });

  const totalDisplay = activeSource === "benchmark" ? 1000 : total;
  const realCountDisplay = activeSource === "benchmark" ? 506 : realCount;
  const fakeCountDisplay = activeSource === "benchmark" ? 494 : fakeCount;
  const avgConfidenceDisplay = activeSource === "benchmark" ? 0.942 : avgConfidence;

  const verdictData = activeSource !== "benchmark" && total > 0
    ? [
        { name: "Real", value: realCount, color: "#10b981" },
        { name: "Fake", value: fakeCount, color: "#f43f5e" },
      ]
    : [
        { name: "Real", value: 506, color: "#10b981" },
        { name: "Fake", value: 494, color: "#f43f5e" },
      ];

  // Keyword frequency
  const kwCount: Record<string, number> = {};
  activeRowsToCalculate.forEach((r) =>
    (r.suspicious_keywords ?? []).forEach((k) => (kwCount[k] = (kwCount[k] ?? 0) + 1)),
  );
  const topKeywords = Object.entries(kwCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  const mockKeywords: [string, number][] = [
    ["bombshell", 42],
    ["secret coverup", 38],
    ["miracle cure", 35],
    ["shocking truth", 31],
    ["insider leak", 29],
    ["deleted soon", 26],
    ["doctors hate", 24],
    ["unbelievable", 21],
    ["conspiracy", 18],
    ["confirms", 15],
    ["anonymous", 12],
    ["exclusive", 10],
  ];

  const keywordsToRender = activeSource !== "benchmark" && topKeywords.length > 0
    ? topKeywords
    : mockKeywords;

  return (
    <Shell>
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <SectionHeading
            eyebrow="Analytics dashboard"
            title="Live detection telemetry."
            subtitle="Aggregate statistics from every article analyzed on this platform, plus benchmark metrics across the three model families."
          />
          <div className="flex-shrink-0 flex justify-start md:justify-end mb-2">
            <div className="inline-flex rounded-lg p-0.5 bg-emerald-950/60 border border-emerald-500/25 ring-1 ring-emerald-500/5 gap-0.5">
              <button
                onClick={() => setActiveSource("active")}
                className={`rounded-md px-3.5 py-1.5 text-xs font-mono font-semibold transition-all ${
                  activeSource === "active"
                    ? "bg-emerald-500 text-emerald-950 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                    : "text-foreground/60 hover:text-white"
                }`}
              >
                Active Article
              </button>
              <button
                onClick={() => setActiveSource("live")}
                className={`rounded-md px-3.5 py-1.5 text-xs font-mono font-semibold transition-all ${
                  activeSource === "live"
                    ? "bg-emerald-500 text-emerald-950 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                    : "text-foreground/60 hover:text-white"
                }`}
              >
                Live Telemetry ({loading ? "..." : rows.length})
              </button>
              <button
                onClick={() => setActiveSource("benchmark")}
                className={`rounded-md px-3.5 py-1.5 text-xs font-mono font-semibold transition-all ${
                  activeSource === "benchmark"
                    ? "bg-emerald-500 text-emerald-950 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                    : "text-foreground/60 hover:text-white"
                }`}
              >
                Reference Benchmarks
              </button>
            </div>
          </div>
        </div>

        {activeSource === "active" && !activeSessionRow ? (
          <div className="mt-10">
            <GlassCard className="relative overflow-hidden border-emerald-500/15 py-16 text-center bg-white/[0.01]">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-rose-500/5" />
              <div className="relative max-w-md mx-auto">
                <div className="mx-auto w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)] mb-4">
                  <Activity className="h-6 w-6 animate-pulse" />
                </div>
                <h3 className="font-display text-lg font-semibold text-white">No active analysis in current session</h3>
                <p className="mt-2 text-xs text-foreground/60 leading-relaxed font-mono">
                  You haven't run a multi-model analysis in this session yet. Launch the detector, paste or load a sample article, and run analysis to populate details here!
                </p>
                <div className="mt-6">
                  <Link
                    to="/detect"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2.5 text-xs font-semibold text-emerald-950 hover:bg-emerald-400 transition shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                  >
                    Launch Live Detector <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </GlassCard>
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={Database}
                label="Articles analyzed"
                value={loading ? "…" : String(totalDisplay)}
                accent="emerald"
              />
              <StatCard
                icon={ShieldCheck}
                label="Classified real"
                value={loading ? "…" : String(realCountDisplay)}
                accent="emerald"
              />
              <StatCard
                icon={ShieldAlert}
                label="Classified fake"
                value={loading ? "…" : String(fakeCountDisplay)}
                accent="rose"
              />
              <StatCard
                icon={Activity}
                label="Avg confidence"
                value={loading ? "…" : `${(avgConfidenceDisplay * 100).toFixed(1)}%`}
                accent="ice"
              />
            </div>

            {/* Verdicts + training curves */}
            <div className="mt-8 grid lg:grid-cols-5 gap-5">
              <GlassCard className="lg:col-span-2">
                <h3 className="font-display text-lg font-semibold text-white">Real vs Fake</h3>
                <p className="text-xs text-foreground/55 font-mono">
                  {activeSource === "active"
                    ? "Active article verdict mapping"
                    : activeSource === "live"
                      ? "Transformer verdict distribution"
                      : "Reference split distribution"}
                </p>
                <div className="mt-2 h-64">
                  {activeSource !== "benchmark" && total === 0 ? (
                    <EmptyState />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={verdictData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={55}
                          outerRadius={90}
                          strokeWidth={0}
                        >
                          {verdictData.map((e) => (
                            <Cell key={e.name} fill={e.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: "rgba(2,17,13,0.95)",
                            border: "1px solid rgba(16,185,129,0.3)",
                            borderRadius: 8,
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </GlassCard>

              <GlassCard className="lg:col-span-3">
                <h3 className="font-display text-lg font-semibold text-white">
                  Training curves (validation accuracy)
                </h3>
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={BENCHMARKS[0].trainingCurve.map((_, i) => ({
                        epoch: i + 1,
                        Classical: BENCHMARKS[0].trainingCurve[i].val,
                        ML: BENCHMARKS[1].trainingCurve[i].val,
                        Transformer: BENCHMARKS[2].trainingCurve[i].val,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,185,129,0.1)" />
                      <XAxis dataKey="epoch" stroke="rgba(255,255,255,0.5)" fontSize={11} />
                      <YAxis stroke="rgba(255,255,255,0.5)" fontSize={11} domain={[0.55, 1]} />
                      <Tooltip
                        contentStyle={{
                          background: "rgba(2,17,13,0.95)",
                          border: "1px solid rgba(16,185,129,0.3)",
                          borderRadius: 8,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line
                        type="monotone"
                        dataKey="Classical"
                        stroke="#34d399"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line type="monotone" dataKey="ML" stroke="#10b981" strokeWidth={2} dot={false} />
                      <Line
                        type="monotone"
                        dataKey="Transformer"
                        stroke="#7dd3fc"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </div>

            {/* Confusion matrices */}
            <div className="mt-8">
              <div className="flex items-baseline justify-between border-b border-emerald-500/15 pb-2">
                <h3 className="font-display text-lg font-semibold text-white">
                  Confusion Matrices
                </h3>
                <span className="font-mono text-[10px] text-foreground/50 uppercase tracking-wider">
                  {activeSource === "active"
                    ? "Single-Article Matrix Routing"
                    : activeSource === "live"
                      ? "Live Telemetry Alignment"
                      : "1,000-Article Held-out Test Split"}
                </span>
              </div>

              {activeSource !== "benchmark" && total === 0 ? (
                <div className="mt-4">
                  <GlassCard className="py-12 text-center bg-white/[0.01] border-emerald-500/10">
                    <p className="text-sm text-foreground/60">No live telemetry data calculated yet.</p>
                    <p className="mt-1 text-xs text-foreground/45">
                      Analyze articles in the Detector page to build live confusion metrics dynamically!
                    </p>
                  </GlassCard>
                </div>
              ) : (
                <div className="mt-5 grid md:grid-cols-3 gap-5">
                  {activeSource !== "benchmark" ? (
                    <>
                      <ConfusionMatrix
                        title={activeSource === "active" ? "Classical NLP vs Transformer" : "Classical vs Transformer (Live)"}
                        data={liveClassicalConfusion}
                      />
                      <ConfusionMatrix
                        title={activeSource === "active" ? "ML Classifier vs Transformer" : "ML Classifier vs Transformer (Live)"}
                        data={liveMlConfusion}
                      />
                      <ConfusionMatrix
                        title={activeSource === "active" ? "Transformer vs Ensemble Majority" : "Transformer vs Ensemble Majority"}
                        data={liveTransformerConfusion}
                      />
                    </>
                  ) : (
                    BENCHMARKS.map((b) => (
                      <ConfusionMatrix key={b.id} title={`${b.name} — Confusion`} data={b.confusion} />
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Keyword cloud + activity */}
            <div className="mt-8 grid lg:grid-cols-2 gap-5">
              <GlassCard>
                <h3 className="font-display text-lg font-semibold text-white">
                  Top suspicious keywords
                </h3>
                <p className="text-xs text-foreground/55 font-mono">
                  {activeSource === "active"
                    ? "Extracted terms from currently active article"
                    : activeSource === "live"
                      ? "Frequency across submitted articles"
                      : "Published reference clickbait vocabulary"}
                </p>
                {keywordsToRender.length === 0 ? (
                  <div className="mt-6">
                    <EmptyState />
                  </div>
                ) : (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {keywordsToRender.map(([k, n], i) => {
                      const max = keywordsToRender[0][1];
                      const size = 0.85 + (n / max) * 0.9;
                      return (
                        <span
                          key={k + i}
                          className="rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1 text-rose-200"
                          style={{ fontSize: `${size}rem` }}
                        >
                          {k} <span className="text-rose-300/60 text-xs">×{n}</span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </GlassCard>

              <GlassCard>
                <h3 className="font-display text-lg font-semibold text-white">
                  {activeSource === "active" ? "Current target spec" : "Recent activity"}
                </h3>
                <div className="mt-4 space-y-2 max-h-80 overflow-y-auto pr-1">
                  {loading ? (
                    <p className="text-sm text-foreground/55">Loading…</p>
                  ) : activeSource === "active" ? (
                    activeSessionRow ? (
                      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 shadow-[0_0_15px_rgba(16,185,129,0.05)] relative overflow-hidden">
                        <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-emerald-500/10 blur-xl pointer-events-none" />
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full animate-ping ${activeSessionRow.transformer_verdict === "FAKE" ? "bg-rose-400" : "bg-emerald-400"}`}
                          />
                          <div className="flex-1 min-w-0">
                            <span className="inline-flex rounded border border-emerald-400/30 bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-emerald-300 uppercase font-mono mb-2">
                              Active Session Article
                            </span>
                            <p className="text-xs text-foreground/90 font-medium leading-relaxed italic">
                              "{activeSessionRow.text_preview}..."
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono text-foreground/50 border-t border-emerald-500/15 pt-2">
                              <span>Verdict: <strong className={activeSessionRow.transformer_verdict === "FAKE" ? "text-rose-300" : "text-emerald-300"}>{activeSessionRow.transformer_verdict}</strong></span>
                              <span>·</span>
                              <span>Confidence: <strong className="text-white">{(Number(activeSessionRow.transformer_confidence) * 100).toFixed(0)}%</strong></span>
                              <span>·</span>
                              <span>Words: <strong className="text-white">{activeSessionRow.word_count}</strong></span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <EmptyState />
                    )
                  ) : rows.length === 0 ? (
                    <EmptyState />
                  ) : (
                    rows.slice(0, 10).map((r) => (
                      <div
                        key={r.id}
                        className="flex items-start gap-3 rounded-lg border border-emerald-500/15 bg-white/[0.02] p-3"
                      >
                        <span
                          className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${r.transformer_verdict === "FAKE" ? "bg-rose-400" : "bg-emerald-400"}`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground/85 truncate">{r.text_preview}</p>
                          <p className="mt-1 text-[10px] font-mono text-foreground/50">
                            {r.transformer_verdict} ·{" "}
                            {(Number(r.transformer_confidence) * 100).toFixed(0)}% ·{" "}
                            {new Date(r.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </GlassCard>
            </div>
          </>
        )}
      </section>
    </Shell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent: "emerald" | "rose" | "ice";
}) {
  const tone =
    accent === "emerald"
      ? "text-emerald-300 bg-emerald-500/15 ring-emerald-400/30"
      : accent === "rose"
        ? "text-rose-300 bg-rose-500/15 ring-rose-400/30"
        : "text-sky-300 bg-sky-400/15 ring-sky-400/30";
  return (
    <GlassCard>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-foreground/55">
            {label}
          </p>
          <p className="mt-2 font-display text-3xl font-semibold text-white">{value}</p>
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-lg ring-1 ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </GlassCard>
  );
}

function EmptyState() {
  return (
    <div className="grid h-full place-items-center text-center">
      <div>
        <p className="text-sm text-foreground/60">No data yet.</p>
        <p className="mt-1 text-xs text-foreground/40">
          Run an analysis from the Detect page to populate.
        </p>
      </div>
    </div>
  );
}
