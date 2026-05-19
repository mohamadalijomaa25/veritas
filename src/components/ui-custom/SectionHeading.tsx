import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  className,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  className?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cn(align === "center" && "text-center", className)}>
      {eyebrow && (
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-mono uppercase tracking-[0.2em] text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {eyebrow}
        </p>
      )}
      <h2 className="font-display text-3xl md:text-5xl font-semibold text-white">{title}</h2>
      {subtitle && (
        <p className={cn("mt-4 text-foreground/70 max-w-2xl", align === "center" && "mx-auto")}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
