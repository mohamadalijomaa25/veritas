import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  Cpu,
  BookOpen,
  BarChart3,
  ShieldCheck,
  Zap,
  Layers,
  Brain,
  Activity,
} from "lucide-react";
import { Shell } from "@/components/layout/Shell";
import { GlassCard } from "@/components/ui-custom/GlassCard";
import { SectionHeading } from "@/components/ui-custom/SectionHeading";
import { BENCHMARKS } from "@/lib/nlp/benchmarks";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

const FEATURES = [
  {
    icon: Layers,
    title: "Three-model hybrid",
    desc: "Classical NLP, TF-IDF logistic regression, and a transformer LM analyze every article in parallel.",
  },
  {
    icon: Zap,
    title: "Real-time analysis",
    desc: "Paste or upload an article, get verdicts, confidences, and highlighted phrases in seconds.",
  },
  {
    icon: BarChart3,
    title: "Live analytics",
    desc: "Track accuracy, F1, latency, and confusion matrices across all three approaches.",
  },
  {
    icon: BookOpen,
    title: "Explainable pipeline",
    desc: "Inspect tokenization, stopwording, stemming, lemmatization, TF-IDF and feature weights.",
  },
  {
    icon: ShieldCheck,
    title: "Academic comparison",
    desc: "Side-by-side methodology to demonstrate how classical, ML and LM approaches differ.",
  },
  {
    icon: Cpu,
    title: "Production-grade UI",
    desc: "Cinematic dashboard built for live demos, presentations, and portfolio reviews.",
  },
];

function LandingPage() {
  return (
    <Shell>
      {/* HERO */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-6 pt-10 pb-24">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-mono uppercase tracking-[0.2em] text-emerald-300"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Hybrid AI · Classical NLP · ML · Transformers
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="mt-6 font-display text-5xl md:text-7xl font-semibold leading-[1.05] tracking-tight text-white"
              >
                Detect fake news with a{" "}
                <span className="bg-gradient-to-br from-emerald-300 via-emerald-400 to-sky-300 bg-clip-text text-transparent text-glow">
                  hybrid AI
                </span>{" "}
                pipeline.
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="mt-6 max-w-xl text-lg text-foreground/70"
              >
                Paste an article and watch{" "}
                <span className="text-emerald-300">three approaches</span> reason about it in
                parallel — lexicon-based classical NLP, a TF-IDF machine-learning model, and a
                transformer language model. Compare verdicts, confidence, and reasoning in a single
                futuristic dashboard.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="mt-8 flex flex-wrap gap-3"
              >
                <Link
                  to="/detect"
                  className="group inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-emerald-950 glow-emerald hover:bg-emerald-400 transition"
                >
                  Launch detector
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </Link>
                <Link
                  to="/compare"
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-foreground/90 hover:bg-white/[0.06] transition"
                >
                  See model comparison
                </Link>
              </motion.div>

              {/* Live stats */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="mt-10 grid grid-cols-3 gap-4 max-w-xl"
              >
                {[
                  { value: "94.2%", label: "Transformer accuracy" },
                  { value: "3", label: "Models compared" },
                  { value: "<1s", label: "Average analysis" },
                ].map((s) => (
                  <div key={s.label} className="glass rounded-xl p-4">
                    <div className="font-display text-2xl font-semibold text-emerald-300 text-glow">
                      {s.value}
                    </div>
                    <div className="mt-1 text-[11px] font-mono uppercase tracking-wider text-foreground/60">
                      {s.label}
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* AI Orb */}
            <div className="lg:col-span-5">
              <HeroOrb />
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <SectionHeading
          eyebrow="Capabilities"
          title="A complete detection workbench."
          subtitle="Everything you need to demonstrate, compare, and explain hybrid fake-news detection in front of an audience."
        />
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
            >
              <GlassCard className="h-full group hover:border-emerald-400/40">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-400/30 text-emerald-300 group-hover:bg-emerald-500/25 transition">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm text-foreground/65 leading-relaxed">{f.desc}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* MODEL TEASER */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <SectionHeading
          eyebrow="Three approaches, one verdict"
          title="Classical NLP vs Machine Learning vs Transformer."
          subtitle="Every analysis runs all three models so you can see exactly how each family of methods reasons about the same article."
        />
        <div className="mt-10 grid lg:grid-cols-3 gap-5">
          {BENCHMARKS.map((b, i) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <GlassCard className="h-full relative overflow-hidden">
                <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-emerald-500/15 blur-3xl" />
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-emerald-300/80">
                  {b.family}
                </p>
                <h3 className="mt-2 font-display text-2xl font-semibold text-white">{b.name}</h3>
                <div className="mt-6 grid grid-cols-3 gap-3">
                  <Stat label="Acc" value={`${(b.accuracy * 100).toFixed(1)}%`} />
                  <Stat label="F1" value={b.f1.toFixed(2)} />
                  <Stat label="Latency" value={`${b.avgLatencyMs}ms`} />
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <GlassCard className="relative overflow-hidden text-center p-12">
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-emerald-500/10 via-transparent to-sky-300/10" />
          <Activity className="mx-auto h-10 w-10 text-emerald-300" />
          <h2 className="mt-4 font-display text-4xl md:text-5xl font-semibold text-white">
            Ready to analyze your first article?
          </h2>
          <p className="mt-3 text-foreground/70 max-w-xl mx-auto">
            No login required. Paste any news article and see how all three approaches classify it.
          </p>
          <Link
            to="/detect"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-emerald-950 glow-emerald hover:bg-emerald-400 transition"
          >
            Open the detector
            <ArrowRight className="h-4 w-4" />
          </Link>
        </GlassCard>
      </section>
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-emerald-500/15 bg-white/[0.02] p-3">
      <p className="font-mono text-[10px] uppercase tracking-wider text-foreground/60">{label}</p>
      <p className="mt-1 font-display text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function HeroOrb() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-md">
      {/* Outer rotating ring */}
      <motion.div
        className="absolute inset-0 rounded-full border border-emerald-400/30"
        animate={{ rotate: 360 }}
        transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
      >
        <div className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-emerald-300 glow-emerald" />
      </motion.div>
      <motion.div
        className="absolute inset-6 rounded-full border border-sky-300/25"
        animate={{ rotate: -360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      >
        <div className="absolute top-1/2 -right-1.5 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-sky-300 glow-ice" />
      </motion.div>
      <motion.div
        className="absolute inset-12 rounded-full border border-emerald-400/20"
        animate={{ rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      >
        <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-emerald-400" />
      </motion.div>

      {/* Inner core */}
      <div className="absolute inset-16 rounded-full bg-gradient-to-br from-emerald-500/30 to-sky-400/20 blur-2xl" />
      <div className="absolute inset-20 rounded-full bg-emerald-500/20 backdrop-blur-xl ring-1 ring-emerald-400/40 grid place-items-center">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <Brain className="h-16 w-16 text-emerald-200 text-glow" />
        </motion.div>
      </div>

      {/* Pulse rings */}
      <div className="absolute inset-20 rounded-full border border-emerald-400/40 animate-pulse-ring" />
    </div>
  );
}
