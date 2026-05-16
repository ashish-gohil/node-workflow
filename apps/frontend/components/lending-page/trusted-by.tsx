"use client";

import { motion } from "motion/react";

import { cn } from "@/lib/utils";

/* Replaces a fake "trusted by 1,200+ teams" logo wall with a verifiable
   "Built with" stack strip. Every wordmark below maps to a real dependency
   in apps/frontend/package.json — no fabricated brand placeholders. */
const STACK = [
  { mark: "Next.js", className: "font-sans font-bold tracking-tight" },
  {
    mark: "React 19",
    className: "font-sans font-semibold tracking-tight",
  },
  {
    mark: "Tailwind v4",
    className: "font-mono font-semibold tracking-[0.04em] lowercase",
  },
  {
    mark: "Radix UI",
    className: "font-sans font-semibold tracking-[0.16em] uppercase",
  },
  {
    mark: "React Flow",
    className: "font-sans font-medium tracking-tight italic",
  },
  {
    mark: "motion",
    className: "font-mono font-medium tracking-[0.18em] lowercase",
  },
] as const;

export default function TrustedBy() {
  return (
    <section className="relative py-20">
      <div className="section-container">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-16">
          {/* Left: tag + caption */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="lg:w-[220px] lg:shrink-0"
          >
            <p className="text-text-brand font-mono text-[11px] font-bold tracking-[0.18em]">
              /02
            </p>
            <p className="text-text-primary mt-4 text-[15px] leading-snug font-medium tracking-tight">
              Built on a stack you
              <br />
              can already audit.
            </p>
            <p className="text-text-muted mt-3 font-mono text-[10px] tracking-[0.08em] uppercase">
              Open source dependencies
            </p>
          </motion.div>

          {/* Right: stack wall */}
          <div className="border-text-primary dark:border-border-stamp grid flex-1 grid-cols-2 border-[1.5px] sm:grid-cols-3 lg:grid-cols-6">
            {STACK.map((item, i) => (
              <motion.div
                key={item.mark}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                whileHover={{ y: -2 }}
                transition={{
                  duration: 0.4,
                  delay: 0.1 + i * 0.06,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className={cn(
                  "border-border-subtle text-text-secondary group hover:text-text-primary relative flex h-20 cursor-default items-center justify-center border-b-[1.5px] transition-colors duration-[180ms] sm:border-b-0",
                  /* internal dividers */
                  i % 2 === 1 && "border-l-[1.5px] sm:border-l-0",
                  i % 3 !== 0 && "sm:border-l-[1.5px] lg:border-l-0",
                  i !== 0 && "lg:border-l-[1.5px]",
                  /* sm: bottom row divider */
                  i < 3 && "sm:border-b-[1.5px] lg:border-b-0"
                )}
              >
                <span className={cn("text-[13px]", item.className)}>
                  {item.mark}
                </span>
                <span
                  aria-hidden
                  className="bg-accent-primary absolute bottom-0 left-1/2 h-[2px] w-0 -translate-x-1/2 transition-[width] duration-[260ms] group-hover:w-6"
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
