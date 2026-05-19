import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SYSTEM_PROMPT = `You are an expert fake-news classifier built on top of a transformer language model.
You analyze a news article and decide if it is likely REAL or FAKE.
You judge based on factual plausibility, source credibility cues, sensational/emotional language, logical consistency, and known misinformation patterns.
Return concise JSON only.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const text: string = String(body?.text ?? "").trim();
    const classical = body?.classical;
    const ml = body?.ml;

    if (!text || text.length < 30) {
      return new Response(
        JSON.stringify({ error: "Article text must be at least 30 characters." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const trimmed = text.slice(0, 8000);
    const started = performance.now();

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Classify this article.\n\nARTICLE:\n"""${trimmed}"""`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_verdict",
              description: "Submit the final classification verdict.",
              parameters: {
                type: "object",
                properties: {
                  verdict: { type: "string", enum: ["REAL", "FAKE"] },
                  confidence: {
                    type: "number",
                    description: "Confidence in the verdict, 0 to 1.",
                  },
                  reasoning: { type: "string", description: "1-2 sentence explanation." },
                  suspicious_phrases: {
                    type: "array",
                    items: { type: "string" },
                    description:
                      "Up to 8 short verbatim phrases from the article that look suspicious or sensational.",
                  },
                  signals: {
                    type: "array",
                    items: { type: "string" },
                    description: "Linguistic / factual signals that drove the verdict (3-6 items).",
                  },
                },
                required: ["verdict", "confidence", "reasoning", "suspicious_phrases", "signals"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_verdict" } },
      }),
    });

    if (aiResp.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    if (aiResp.status === 402) {
      return new Response(
        JSON.stringify({ error: "AI credits exhausted. Add credits in Workspace settings." }),
        {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    if (!aiResp.ok) {
      const err = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, err);
      return new Response(JSON.stringify({ error: "AI gateway error", detail: err }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const call = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments ? JSON.parse(call.function.arguments) : null;

    if (!args) {
      return new Response(JSON.stringify({ error: "Model did not return a structured verdict." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const elapsedMs = Math.round(performance.now() - started);
    const transformer = {
      verdict: args.verdict as "REAL" | "FAKE",
      confidence: Math.max(0, Math.min(1, Number(args.confidence) || 0)),
      reasoning: String(args.reasoning ?? ""),
      suspicious_phrases: Array.isArray(args.suspicious_phrases)
        ? args.suspicious_phrases.slice(0, 8)
        : [],
      signals: Array.isArray(args.signals) ? args.signals.slice(0, 8) : [],
      processing_ms: elapsedMs,
    };

    // Persist if classical + ml were sent from client (real comparison).
    if (classical && ml) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
      const { error: insertErr } = await supabase.from("analyses").insert({
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
      if (insertErr) console.error("Insert error:", insertErr.message);
    }

    return new Response(JSON.stringify({ transformer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("analyze-article error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
