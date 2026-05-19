import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Brain, Cpu, Layers, Code, Database, Sparkles } from "lucide-react";
import { Shell } from "@/components/layout/Shell";
import { GlassCard } from "@/components/ui-custom/GlassCard";
import { SectionHeading } from "@/components/ui-custom/SectionHeading";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

const PIPELINE = [
  { title: "Ingestion", desc: "Paste or upload article (.txt) up to 8k chars." },
  { title: "Preprocessing", desc: "Tokenize, lowercase, strip stopwords, stem & lemmatize." },
  { title: "Vectorization", desc: "Bag-of-Words and TF-IDF representations." },
  { title: "Classical NLP", desc: "Lexicon + stylistic features → sigmoid score." },
  { title: "ML classifier", desc: "Logistic regression over TF-IDF weights." },
  { title: "Transformer LM", desc: "Gemini language model with structured tool call." },
  { title: "Aggregation", desc: "Three verdicts + confidences persisted for analytics." },
];

const TEAM = [
  {
    role: "UI / UX & Frontend",
    icon: Code,
    scope: "Design system, glass components, animations, pages, charts, responsive layout.",
  },
  {
    role: "Backend & Integration",
    icon: Database,
    scope: "Edge function, database schema, transformer orchestration, analytics wiring.",
  },
  {
    role: "NLP / Models & Evaluation",
    icon: Brain,
    scope: "Preprocessing pipeline, classical heuristics, TF-IDF/LR module, benchmark metrics.",
  },
];

function AboutPage() {
  return (
    <Shell>
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <SectionHeading
          eyebrow="About the project"
          title="Hybrid Fake News Detection."
          subtitle="A research-oriented platform combining Classical NLP, Machine Learning, and Transformer-based Language Models to detect misinformation — and to demonstrate, side by side, how each family of methods reasons about text."
        />

        {/* Methodology */}
        <div className="mt-12 grid lg:grid-cols-3 gap-5">
          {[
            {
              icon: Layers,
              title: "Classical NLP",
              body: "Curated suspicious/trust lexicons combined with stylistic features (exclamation density, all-caps shouting, article length). A sigmoid over the composite score yields a verdict.",
            },
            {
              icon: Cpu,
              title: "Machine Learning",
              body: "TF-IDF vectorization over preprocessed tokens feeds a logistic-regression classifier. Each token contributes a signed weight, exposing which terms pushed the prediction toward fake or real.",
            },
            {
              icon: Brain,
              title: "Transformer LM",
              body: "A pretrained transformer (Gemini) reads the full article and returns a structured verdict, confidence, reasoning, and verbatim suspicious phrases via a tool call.",
            },
          ].map((m) => (
            <GlassCard key={m.title} className="h-full">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-400/30 text-emerald-300">
                <m.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold text-white">{m.title}</h3>
              <p className="mt-2 text-sm text-foreground/70 leading-relaxed">{m.body}</p>
            </GlassCard>
          ))}
        </div>

        {/* Pipeline diagram */}
        <div className="mt-12">
          <SectionHeading eyebrow="Workflow" title="From raw article to three verdicts." />
          <GlassCard className="mt-6">
            <div className="grid md:grid-cols-7 gap-3">
              {PIPELINE.map((p, i) => (
                <div key={p.title} className="relative">
                  <div className="rounded-xl border border-emerald-500/20 bg-white/[0.02] p-4 h-full">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-emerald-300/80">
                      Step {i + 1}
                    </p>
                    <p className="mt-1 font-display text-sm font-semibold text-white">{p.title}</p>
                    <p className="mt-1 text-[11px] text-foreground/55 leading-relaxed">{p.desc}</p>
                  </div>
                  {i < PIPELINE.length - 1 && (
                    <ArrowRight className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400/60" />
                  )}
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Team */}
        <div className="mt-12">
          <SectionHeading
            eyebrow="Team structure"
            title="Designed for three collaborators."
            subtitle="Clear separation of concerns across UI, backend, and modeling so a small team can ship and iterate independently."
          />
          <div className="mt-8 grid md:grid-cols-3 gap-5">
            {TEAM.map((t) => (
              <GlassCard key={t.role}>
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-sky-400/15 ring-1 ring-sky-400/30 text-sky-300">
                  <t.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-base font-semibold text-white">{t.role}</h3>
                <p className="mt-2 text-sm text-foreground/70 leading-relaxed">{t.scope}</p>
              </GlassCard>
            ))}
          </div>
        </div>

        {/* Tech stack */}
        <div className="mt-12">
          <GlassCard className="relative overflow-hidden">
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-emerald-500/5 via-transparent to-sky-300/5" />
            <div className="flex items-start gap-4">
              <Sparkles className="h-6 w-6 text-emerald-300 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-display text-xl font-semibold text-white">Built with</h3>
                <p className="mt-2 text-sm text-foreground/70 leading-relaxed">
                  React · TanStack Start · Tailwind CSS · Framer Motion · Recharts · Lovable Cloud
                  (Postgres + Edge Functions) · Lovable AI Gateway (Gemini transformer). All NLP and
                  ML modules run in the browser; the transformer call is proxied through a
                  serverless edge function.
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      </section>
    </Shell>
  );
}
