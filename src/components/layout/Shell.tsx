import type { ReactNode } from "react";
import { AnimatedBackground } from "./AnimatedBackground";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen text-foreground">
      <AnimatedBackground />
      <Navbar />
      <main className="relative z-10 pt-28">{children}</main>
      <Footer />
    </div>
  );
}
