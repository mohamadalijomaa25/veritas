import { preprocess, type PreprocessResult } from "./preprocess";
import { SUSPICIOUS_LEXICON, TRUST_LEXICON } from "./stopwords";

export interface ClassicalResult {
  verdict: "REAL" | "FAKE";
  confidence: number; // 0..1 confidence in verdict
  fakeScore: number; // 0..1 raw probability of being fake
  signals: string[];
  matchedSuspicious: string[];
  matchedTrust: string[];
  processingMs: number;
  preprocess: PreprocessResult;
}

// Classical NLP heuristic: lexicon + style features (capitalization, exclamation density, avg word length).
export function classicalNlpAnalyze(text: string): ClassicalResult {
  const start = performance.now();
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

  // Stylistic features
  const exclamations = (text.match(/!/g) ?? []).length;
  const questions = (text.match(/\?/g) ?? []).length;
  const allCapsWords = (text.match(/\b[A-Z]{4,}\b/g) ?? []).length;
  const exclamationDensity = exclamations / Math.max(1, pre.sentenceCount);
  const capsRatio = allCapsWords / Math.max(20, pre.wordCount);

  // Composite raw score
  const raw =
    suspScore * 0.45 +
    exclamationDensity * 1.2 +
    capsRatio * 6 +
    Math.max(0, questions - 3) * 0.1 -
    trustScore * 0.35;

  const fakeScore = 1 / (1 + Math.exp(-(raw - 1.2))); // sigmoid centered around moderate suspicion
  const verdict = fakeScore >= 0.5 ? "FAKE" : "REAL";
  const confidence = verdict === "FAKE" ? fakeScore : 1 - fakeScore;

  const signals: string[] = [];
  if (matchedSus.length)
    signals.push(`${matchedSus.length} sensational lexicon hit${matchedSus.length > 1 ? "s" : ""}`);
  if (matchedTr.length)
    signals.push(`${matchedTr.length} source/evidence cue${matchedTr.length > 1 ? "s" : ""}`);
  if (exclamationDensity > 0.4)
    signals.push(`high exclamation density (${exclamationDensity.toFixed(2)}/sentence)`);
  if (allCapsWords > 1) signals.push(`${allCapsWords} ALL-CAPS shouting words`);
  if (pre.wordCount < 60) signals.push("very short article (low information density)");
  if (signals.length === 0) signals.push("neutral lexical profile");

  return {
    verdict,
    confidence: Math.max(0.5, Math.min(0.99, confidence)),
    fakeScore,
    signals,
    matchedSuspicious: matchedSus,
    matchedTrust: matchedTr,
    processingMs: Math.max(1, Math.round(performance.now() - start)),
    preprocess: pre,
  };
}
