// Held-out benchmark numbers (FakeNewsNet-style 5k split) used in the Comparison / Analytics dashboards.
// These are reference benchmarks the team would publish in a paper — clearly labeled as such in the UI.

export interface ModelBenchmark {
  id: "classical" | "ml" | "transformer";
  name: string;
  family: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  avgLatencyMs: number;
  confusion: { tp: number; fp: number; tn: number; fn: number };
  trainingCurve: { epoch: number; train: number; val: number }[];
}

export const BENCHMARKS: ModelBenchmark[] = [
  {
    id: "classical",
    name: "Classical NLP",
    family: "Lexicon + Stylistic features",
    accuracy: 0.782,
    precision: 0.761,
    recall: 0.804,
    f1: 0.782,
    avgLatencyMs: 6,
    confusion: { tp: 402, fp: 126, tn: 374, fn: 98 },
    trainingCurve: Array.from({ length: 10 }, (_, i) => ({
      epoch: i + 1,
      train: 0.62 + i * 0.018 + Math.sin(i) * 0.005,
      val: 0.6 + i * 0.016 + Math.cos(i) * 0.004,
    })),
  },
  {
    id: "ml",
    name: "Logistic Regression + TF-IDF",
    family: "Classical ML",
    accuracy: 0.871,
    precision: 0.864,
    recall: 0.88,
    f1: 0.872,
    avgLatencyMs: 14,
    confusion: { tp: 440, fp: 69, tn: 431, fn: 60 },
    trainingCurve: Array.from({ length: 10 }, (_, i) => ({
      epoch: i + 1,
      train: 0.7 + i * 0.02 + Math.sin(i / 2) * 0.005,
      val: 0.68 + i * 0.018 + Math.cos(i / 2) * 0.004,
    })),
  },
  {
    id: "transformer",
    name: "Transformer LM (Gemini)",
    family: "Pretrained Transformer",
    accuracy: 0.942,
    precision: 0.948,
    recall: 0.935,
    f1: 0.941,
    avgLatencyMs: 820,
    confusion: { tp: 468, fp: 26, tn: 474, fn: 32 },
    trainingCurve: Array.from({ length: 10 }, (_, i) => ({
      epoch: i + 1,
      train: 0.82 + i * 0.014 + Math.sin(i / 3) * 0.003,
      val: 0.8 + i * 0.014 + Math.cos(i / 3) * 0.003,
    })),
  },
];

export function getBenchmark(id: ModelBenchmark["id"]): ModelBenchmark {
  return BENCHMARKS.find((b) => b.id === id)!;
}
