import { preprocess } from "./preprocess";
import { SUSPICIOUS_LEXICON, TRUST_LEXICON } from "./stopwords";

export interface MlResult {
  verdict: "REAL" | "FAKE";
  confidence: number;
  fakeProbability: number;
  topFeatures: { term: string; tfidf: number; weight: number; contribution: number }[];
  processingMs: number;
  vectorDim: number;
}

// Pretend a logistic-regression-over-TF-IDF model has been trained.
// Coefficients come from our lexicons; everything else is a small negative weight (neutral content).
function getWeight(term: string): number {
  if (SUSPICIOUS_LEXICON[term] !== undefined) return SUSPICIOUS_LEXICON[term] * 2.4;
  if (TRUST_LEXICON[term] !== undefined) return -TRUST_LEXICON[term] * 1.8;
  return 0;
}

// A tiny pretrained IDF table (log-scale) — values chosen so that rare suspicious terms dominate.
function idf(term: string): number {
  if (SUSPICIOUS_LEXICON[term] !== undefined) return 3.2;
  if (TRUST_LEXICON[term] !== undefined) return 2.4;
  return 1.0;
}

export function mlAnalyze(text: string): MlResult {
  const start = performance.now();
  const pre = preprocess(text);
  const docLen = Math.max(1, pre.lemmatized.length);

  // Build TF over lemmas + raw lower text (so multi-word lexicon entries also fire).
  const tf: Record<string, number> = { ...pre.termFrequency };
  const lower = text.toLowerCase();
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

  // Logistic regression: z = bias + Σ tfidf(t) * w(t)
  const bias = -0.4;
  let z = bias;
  const contribs: { term: string; tfidf: number; weight: number; contribution: number }[] = [];
  for (const [term, count] of Object.entries(tf)) {
    const w = getWeight(term);
    if (w === 0) continue;
    const tfidfVal = (count / docLen) * idf(term);
    const contrib = tfidfVal * w;
    z += contrib;
    contribs.push({ term, tfidf: tfidfVal, weight: w, contribution: contrib });
  }

  const fakeProbability = 1 / (1 + Math.exp(-z));
  const verdict = fakeProbability >= 0.5 ? "FAKE" : "REAL";
  const confidence = Math.max(
    0.5,
    Math.min(0.99, verdict === "FAKE" ? fakeProbability : 1 - fakeProbability),
  );
  const topFeatures = contribs
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 8);

  return {
    verdict,
    confidence,
    fakeProbability,
    topFeatures,
    processingMs: Math.max(1, Math.round(performance.now() - start)),
    vectorDim: Object.keys(tf).length,
  };
}
