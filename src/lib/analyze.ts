import { supabase } from "@/integrations/supabase/client";
import { classicalNlpAnalyze, type ClassicalResult } from "./nlp/classical";
import { mlAnalyze, type MlResult } from "./nlp/ml";

export interface TransformerResult {
  verdict: "REAL" | "FAKE";
  confidence: number;
  reasoning: string;
  suspicious_phrases: string[];
  signals: string[];
  processing_ms: number;
}

export interface FullAnalysis {
  classical: ClassicalResult;
  ml: MlResult;
  transformer: TransformerResult;
  text: string;
}

const SYSTEM_PROMPT = `You are an expert fake-news classifier built on top of a transformer language model.
You analyze a news article and decide if it is likely REAL or FAKE.
You judge based on factual plausibility, source credibility cues, sensational/emotional language, logical consistency, and known misinformation patterns.
Return concise JSON only.`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callGeminiOnce(
  text: string,
  apiKey: string,
): Promise<{ status: number; body: unknown }> {
  const trimmed = text.slice(0, 8000);
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          {
            role: "user",
            parts: [{ text: `Classify this article.\n\nARTICLE:\n"""${trimmed}"""` }],
          },
        ],
        tools: [
          {
            function_declarations: [
              {
                name: "submit_verdict",
                description: "Submit the final classification verdict.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    verdict: { type: "STRING", enum: ["REAL", "FAKE"] },
                    confidence: {
                      type: "NUMBER",
                      description: "Confidence in the verdict, 0 to 1.",
                    },
                    reasoning: { type: "STRING", description: "1-2 sentence explanation." },
                    suspicious_phrases: {
                      type: "ARRAY",
                      items: { type: "STRING" },
                      description:
                        "Up to 8 short verbatim phrases from the article that look suspicious or sensational.",
                    },
                    signals: {
                      type: "ARRAY",
                      items: { type: "STRING" },
                      description:
                        "Linguistic / factual signals that drove the verdict (3-6 items).",
                    },
                  },
                  required: ["verdict", "confidence", "reasoning", "suspicious_phrases", "signals"],
                },
              },
            ],
          },
        ],
        tool_config: {
          function_calling_config: { mode: "ANY", allowed_function_names: ["submit_verdict"] },
        },
      }),
    },
  );
  const body = resp.ok ? await resp.json() : await resp.text();
  return { status: resp.status, body };
}

async function callGemini(text: string): Promise<TransformerResult> {
  const apiKey = (import.meta.env.VITE_GEMINI_API_KEY as string)?.replace(/^["']|["']$/g, "");
  if (!apiKey) throw new Error("VITE_GEMINI_API_KEY is not set in .env");

  const started = performance.now();
  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [5000, 15000, 30000]; // 5s, 15s, 30s

  let lastError = "";
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const { status, body } = await callGeminiOnce(text, apiKey);

    if (status === 429) {
      if (attempt < MAX_RETRIES - 1) {
        const waitSec = RETRY_DELAYS[attempt] / 1000;
        console.warn(
          `[Gemini] Rate limited. Retrying in ${waitSec}s... (attempt ${attempt + 1}/${MAX_RETRIES})`,
        );
        await sleep(RETRY_DELAYS[attempt]);
        continue;
      }
      lastError =
        "Rate limit reached. The free Gemini API allows ~15 requests/minute. Please wait a moment and try again.";
      break;
    }

    if (status !== 200) {
      throw new Error(
        `Gemini API error ${status}: ${typeof body === "string" ? body : JSON.stringify(body)}`,
      );
    }

    const json = body as Record<string, unknown>;
    const args = (
      json as {
        candidates?: {
          content?: {
            parts?: {
              functionCall?: {
                args?: Record<string, unknown>;
              };
            }[];
          };
        }[];
      }
    )?.candidates?.[0]?.content?.parts?.[0]?.functionCall?.args;
    if (!args) throw new Error("Gemini did not return a structured verdict. Try again.");

    const elapsedMs = Math.round(performance.now() - started);
    return {
      verdict: (args.verdict as "REAL" | "FAKE") ?? "FAKE",
      confidence: Math.max(0, Math.min(1, Number(args.confidence) || 0)),
      reasoning: String(args.reasoning ?? ""),
      suspicious_phrases: Array.isArray(args.suspicious_phrases)
        ? args.suspicious_phrases.slice(0, 8)
        : [],
      signals: Array.isArray(args.signals) ? args.signals.slice(0, 8) : [],
      processing_ms: elapsedMs,
    };
  }

  throw new Error(lastError || "Gemini API failed after retries.");
}

async function persistAnalysis(
  text: string,
  classical: ClassicalResult,
  ml: MlResult,
  transformer: TransformerResult,
) {
  try {
    const trimmed = text.slice(0, 8000);
    const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
    await supabase.from("analyses").insert({
      text_preview: trimmed.slice(0, 280),
      word_count: wordCount,
      classical_verdict: classical.verdict,
      classical_confidence: classical.confidence,
      ml_verdict: ml.verdict,
      ml_confidence: ml.confidence,
      transformer_verdict: transformer.verdict,
      transformer_confidence: transformer.confidence,
      suspicious_keywords: transformer.suspicious_phrases,
    });
  } catch (e) {
    // Non-fatal — analytics may be unavailable
    console.warn("[analyze] Failed to persist analysis:", e);
  }
}

export async function neutralizeArticle(text: string): Promise<string> {
  const apiKey = (import.meta.env.VITE_GEMINI_API_KEY as string)?.replace(/^["']|["']$/g, "");
  if (!apiKey) throw new Error("VITE_GEMINI_API_KEY is not set in .env");

  const trimmed = text.slice(0, 8000);
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [
            {
              text: "You are a professional journalistic copyeditor. Rewrite the user's article to be completely neutral, objective, dry, matter-of-fact, and encyclopedic in tone. Remove all emotional sensationalism, exclamation points, hyperbolic verbs (e.g. 'blasts', 'annihilates', 'destroys'), conspiracy-style speculation, loaded adjectives, and clickbait phrases. Keep the core factual claims or arguments intact, but present them with academic neutrality, as if writing an unbiased Wikipedia entry. Return ONLY the rewritten text without any greetings, commentary, markdown headers, or chat filler.",
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: `Neutralize the tone of this article:\n\n"""${trimmed}"""` }],
          },
        ],
      }),
    },
  );

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`Gemini tone neutralization failed: ${errorText}`);
  }

  const json = await resp.json();
  const rewritten = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rewritten) throw new Error("Failed to get rewritten text from Gemini.");
  return rewritten.trim();
}

export async function analyzeArticle(text: string): Promise<FullAnalysis> {
  const classical = classicalNlpAnalyze(text);
  const ml = mlAnalyze(text);
  const transformer = await callGemini(text);

  // Fire-and-forget persistence to Supabase for analytics
  persistAnalysis(text, classical, ml, transformer);

  return { classical, ml, transformer, text };
}
