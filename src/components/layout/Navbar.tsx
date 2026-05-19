import { useState, useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/detect", label: "Detect" },
  { to: "/compare", label: "Compare" },
  { to: "/analytics", label: "Analytics" },
  { to: "/about", label: "About" },
] as const;

export function Navbar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let lastScroll = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Hide navbar if scrolling down past 80px, show if scrolling up
      if (currentScrollY > lastScroll && currentScrollY > 80) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }

      lastScroll = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-40"
      animate={{ y: isVisible ? 0 : -100 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <div className="mx-auto mt-4 max-w-7xl px-4">
        <div className="glass-strong flex items-center justify-between rounded-2xl px-4 py-2.5">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <div className="absolute inset-0 rounded-lg bg-emerald-500/40 blur-md group-hover:bg-emerald-400/60 transition" />
              <div className="relative grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/20 ring-1 ring-emerald-400/40">
                <Brain className="h-5 w-5 text-emerald-300" />
              </div>
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display text-base font-semibold tracking-tight text-white">
                Veritas<span className="text-emerald-400">AI</span>
              </span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-emerald-300/70">
                Hybrid Detection
              </span>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {LINKS.map((l) => {
              const active = path === l.to;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={cn(
                    "relative px-3.5 py-1.5 text-sm font-medium rounded-lg transition-colors",
                    active ? "text-emerald-300" : "text-foreground/70 hover:text-foreground",
                  )}
                >
                  {l.label}
                  {active && (
                    <span className="absolute inset-0 -z-10 rounded-lg bg-emerald-500/10 ring-1 ring-emerald-400/30" />
                  )}
                </Link>
              );
            })}
          </nav>
          <Link
            to="/detect"
            className="hidden md:inline-flex items-center gap-2 rounded-lg bg-emerald-500/90 px-4 py-1.5 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 transition glow-emerald"
          >
            Launch Detector
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
