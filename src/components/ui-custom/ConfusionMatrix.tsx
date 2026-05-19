import { GlassCard } from "./GlassCard";

export function ConfusionMatrix({
  title,
  data,
}: {
  title: string;
  data: { tp: number; fp: number; tn: number; fn: number };
}) {
  const total = data.tp + data.fp + data.tn + data.fn;
  const cells = [
    { label: "TP", value: data.tp, hint: "Predicted Fake · Actual Fake", tone: "good" },
    { label: "FN", value: data.fn, hint: "Predicted Real · Actual Fake", tone: "bad" },
    { label: "FP", value: data.fp, hint: "Predicted Fake · Actual Real", tone: "bad" },
    { label: "TN", value: data.tn, hint: "Predicted Real · Actual Real", tone: "good" },
  ];
  return (
    <GlassCard>
      <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
      <p className="mt-1 text-xs text-foreground/60 font-mono">n = {total}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {cells.map((c) => {
          const pct = total ? (c.value / total) * 100 : 0;
          const isActive = total === 1 && c.value === 1;
          return (
            <div
              key={c.label}
              className={`relative overflow-hidden rounded-xl border p-4 transition-all duration-300 ${
                isActive
                  ? c.tone === "good"
                    ? "border-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)] animate-pulse"
                    : "border-rose-400 bg-rose-500/10 ring-1 ring-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.25)] animate-pulse"
                  : "border-emerald-500/20 bg-white/[0.02]"
              }`}
            >
              {isActive && (
                <span
                  className={`absolute top-2 right-2 rounded px-1.5 py-0.5 text-[8px] font-bold tracking-wider uppercase font-mono ${
                    c.tone === "good"
                      ? "bg-emerald-400 text-emerald-950"
                      : "bg-rose-400 text-rose-950"
                  }`}
                >
                  Active Routing
                </span>
              )}
              <div
                className={`absolute inset-x-0 bottom-0 ${c.tone === "good" ? "bg-emerald-500/15" : "bg-rose-500/15"}`}
                style={{ height: `${pct}%` }}
              />
              <div className="relative">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-xs uppercase text-foreground/60">{c.label}</span>
                  <span
                    className={`font-display text-2xl font-semibold ${c.tone === "good" ? "text-emerald-300" : "text-rose-300"}`}
                  >
                    {c.value}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-foreground/50">{c.hint}</p>
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
