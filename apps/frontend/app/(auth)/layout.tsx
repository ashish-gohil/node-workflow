import type { ReactNode } from "react";
import Link from "next/link";

import AppLogo from "@/components/ui/app-logo";
import ThemeToggle from "@/components/ui/theme-toggle";

/* ============================================================
   AuthLayout — shared shell for /sign-in and /sign-up.

   Surface stack mirrors the workflow editor header:
     • Header → bg-bg-elevated with a 1.5px stamp-style bottom
       border. Sits visually distinct from the canvas body.
     • Body   → bg-bg-canvas, centered max-width card.
     • Footer → muted links on canvas.
   ============================================================ */

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="bg-bg-canvas text-text-primary flex min-h-screen flex-col">
      <header
        className="
          bg-bg-elevated border-text-primary dark:border-border-stamp
          flex shrink-0 items-center justify-between
          border-b-[1.5px] px-8 py-4 max-sm:px-5
        "
      >
        <Link
          href="/"
          aria-label="Go home"
          className="inline-flex shrink-0 items-center"
        >
          <AppLogo />
        </Link>
        <ThemeToggle />
      </header>

      <section className="flex flex-1 items-center justify-center px-8 py-16 max-sm:px-5 max-sm:py-12">
        <div className="w-full max-w-[400px]">{children}</div>
      </section>

      <footer className="text-text-muted text-caption px-8 pb-8 text-center">
        <span className="inline-flex gap-[18px]">
          <Link
            href="#"
            className="hover:text-text-primary transition-colors duration-[160ms]"
          >
            Privacy
          </Link>
          <Link
            href="#"
            className="hover:text-text-primary transition-colors duration-[160ms]"
          >
            Terms
          </Link>
          <Link
            href="#"
            className="hover:text-text-primary transition-colors duration-[160ms]"
          >
            Help
          </Link>
        </span>
      </footer>
    </main>
  );
}
