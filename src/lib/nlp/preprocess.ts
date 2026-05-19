import { STOPWORDS } from "./stopwords";

export interface PreprocessResult {
  raw: string;
  tokens: string[]; // raw lowercase tokens
  filtered: string[]; // stopwords removed
  stemmed: string[]; // light Porter-style stemming
  lemmatized: string[]; // naive lemmatization (suffix table)
  termFrequency: Record<string, number>;
  wordCount: number;
  uniqueCount: number;
  avgWordLen: number;
  sentenceCount: number;
}

export function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z][a-z'-]{1,}/g) ?? [];
}

export function removeStopwords(tokens: string[]): string[] {
  return tokens.filter((t) => !STOPWORDS.has(t));
}

// Very light Porter-ish stemmer covering common English suffixes.
export function stem(word: string): string {
  let w = word;
  const suf = [
    "ational",
    "tional",
    "ization",
    "ationally",
    "ically",
    "fulness",
    "ousness",
    "iveness",
    "izer",
    "ation",
    "ators",
    "ators",
    "ators",
    "alism",
    "ments",
    "ables",
    "ibles",
    "ing",
    "ies",
    "ied",
    "ed",
    "ly",
    "es",
    "s",
    "er",
    "est",
    "ment",
    "able",
    "ible",
  ];
  for (const s of suf) {
    if (w.length > s.length + 2 && w.endsWith(s)) {
      w = w.slice(0, -s.length);
      break;
    }
  }
  return w;
}

const LEMMA_TABLE: Record<string, string> = {
  was: "be",
  were: "be",
  is: "be",
  are: "be",
  been: "be",
  being: "be",
  has: "have",
  had: "have",
  having: "have",
  does: "do",
  did: "do",
  doing: "do",
  done: "do",
  went: "go",
  gone: "go",
  going: "go",
  goes: "go",
  said: "say",
  says: "say",
  saying: "say",
  made: "make",
  making: "make",
  makes: "make",
  took: "take",
  taken: "take",
  taking: "take",
  takes: "take",
  children: "child",
  people: "person",
  men: "man",
  women: "woman",
  mice: "mouse",
};

export function lemmatize(word: string): string {
  if (LEMMA_TABLE[word]) return LEMMA_TABLE[word];
  if (word.endsWith("ies") && word.length > 4) return word.slice(0, -3) + "y";
  if (word.endsWith("ses") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) return word.slice(0, -1);
  return word;
}

export function preprocess(text: string): PreprocessResult {
  const tokens = tokenize(text);
  const filtered = removeStopwords(tokens);
  const stemmed = filtered.map(stem);
  const lemmatized = filtered.map(lemmatize);
  const tf: Record<string, number> = {};
  for (const w of lemmatized) tf[w] = (tf[w] ?? 0) + 1;
  const sentences = (text.match(/[.!?]+/g) ?? []).length || 1;
  const totalLen = tokens.reduce((s, t) => s + t.length, 0);
  return {
    raw: text,
    tokens,
    filtered,
    stemmed,
    lemmatized,
    termFrequency: tf,
    wordCount: tokens.length,
    uniqueCount: new Set(lemmatized).size,
    avgWordLen: tokens.length ? totalLen / tokens.length : 0,
    sentenceCount: sentences,
  };
}
