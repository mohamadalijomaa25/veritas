## Hybrid Fake News Detection Platform

A cinematic AI-powered web app for detecting fake news, comparing Classical NLP, Machine Learning, and Transformer-based approaches. Quantum Emerald aesthetic (deep teal background, emerald + ice-blue neon glows), glassmorphism, smooth animations.

### Stack

- React + Vite + Tailwind + shadcn/ui
- Framer Motion for animations, Recharts for visualizations
- Lovable Cloud (Supabase) for storage + edge function
- Lovable AI Gateway (`google/gemini-3-flash-preview`) for the transformer-based analyzer
- Classical NLP + ML results computed client-side (tokenization, stopword removal, TF-IDF heuristics, logistic-regression-style scoring) so the comparison is real, not faked

### Design System

- Background: `#02110d` → radial gradients into `#0a2a22`
- Primary glow: emerald `#10b981`; secondary glow: ice blue `#7dd3fc`
- Glass cards: `bg-white/5 backdrop-blur-xl border border-emerald-500/20`
- Typography: Space Grotesk (headings) + Inter (body)
- Animated particle / grid background, glow CTAs, subtle scanline overlays
- Reusable: `GlassCard`, `NeonButton`, `GlowStat`, `AnimatedBackground`, `MetricBar`, `ConfusionMatrix`

### Pages & Routes

1. `/` Landing — hero with animated AI orb, feature grid, live stats counter, "Try Detection" CTA
2. `/detect` Detection — textarea + PDF/TXT upload, "Analyze" button, animated processing pipeline, results: verdict card per model, confidence bars, highlighted suspicious keywords, probability donut
3. `/compare` Model Comparison — side-by-side cards for the 3 approaches, speed/accuracy/F1 bar charts, evaluation table, radar chart
4. `/analytics` Dashboard — totals, fake vs real donut, model performance line chart, word frequency cloud, TF-IDF top terms, 3 confusion matrices, training curves
5. `/about` — methodology, pipeline diagram (preprocessing → vectorization → classification), architecture overview, team roles

Persistent glass nav + footer.

### Backend

- Edge function `analyze-article`: receives article text → calls Gemini via Lovable AI Gateway with a structured-output schema (verdict, confidence, suspicious_phrases, reasoning) → returns transformer result
- Classical NLP module (client): tokenize, lowercase, remove stopwords, stem (Porter-lite), compute lexicon-based fake-news score + sensational-keyword density
- ML module (client): TF-IDF over pretrained "suspicious term" weights → logistic-style sigmoid score; tracks processing time
- Supabase table `analyses` (id, text_preview, transformer_verdict, ml_verdict, classical_verdict, confidences jsonb, created_at) feeds the Analytics dashboard with real history
- Seed mock metrics for confusion matrices/training curves (clearly labeled as benchmark results)

### File Structure

```
src/
  components/
    layout/{Navbar,Footer,AnimatedBackground}.tsx
    ui-custom/{GlassCard,NeonButton,GlowStat,MetricBar,ConfusionMatrix,Pipeline}.tsx
    detect/{ArticleInput,ResultCard,KeywordHighlight,ProbabilityChart}.tsx
    compare/{ModelCard,ComparisonChart,RadarChart}.tsx
    analytics/{StatsGrid,WordFrequency,TrainingCurve}.tsx
  pages/{Landing,Detect,Compare,Analytics,About}.tsx
  lib/nlp/{preprocess.ts,classical.ts,ml.ts,stopwords.ts}
  lib/analyze.ts            // orchestrates 3 models + persists
  integrations/supabase/...
supabase/functions/analyze-article/index.ts
```

### Build Order

1. Enable Lovable Cloud + ensure LOVABLE_API_KEY
2. Design tokens (index.css, tailwind.config) + AnimatedBackground + Navbar/Footer
3. Shared glass UI primitives
4. Classical NLP + ML modules (pure TS) with unit-friendly outputs
5. `analyze-article` edge function with structured output
6. Supabase `analyses` table + insert on each analysis
7. Pages in order: Landing → Detect → Compare → Analytics → About
8. Wire routes in App.tsx, polish animations, responsive pass

### Team Mapping (documented on About page)

- Frontend/UI: pages, design system, animations
- Backend/Integration: edge function, Supabase schema, analytics wiring
- NLP/Models: preprocessing, classical + ML modules, benchmark metrics
