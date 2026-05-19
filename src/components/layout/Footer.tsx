import { Brain } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative z-10 mt-24 border-t border-emerald-500/15 bg-black/20 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/20 ring-1 ring-emerald-400/40">
              <Brain className="h-5 w-5 text-emerald-300" />
            </div>
            <div>
              <p className="font-display font-semibold text-white">VeritasAI</p>
              <p className="text-xs text-foreground/60">
                Hybrid Fake News Detection · Classical NLP + ML + Transformers
              </p>
            </div>
          </div>
          <div className="text-xs text-foreground/50 font-mono">
            v1.0 · Built with Lovable AI · © {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </footer>
  );
}
