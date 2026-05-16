"use client";

import { motion } from "motion/react";

/* Replaces a fabricated customer quote (Emma Hartwell @ Meridian, plus
   fake workflow/engineer/duration counts) with a first-person project
   note. Nothing here implies users, customers, or scale the project
   doesn't yet have. */
export default function EditorialQuote() {
  return (
    <section className="relative py-28">
      <div className="section-container">
        <div className="grid gap-10 lg:grid-cols-[220px_1fr] lg:gap-20">
          {/* Left rail: chapter + meta */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="lg:sticky lg:top-32 lg:self-start"
          >
            <p className="text-text-brand font-mono text-[11px] font-bold tracking-[0.18em]">
              /04
            </p>
            <p className="text-text-muted mt-4 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Project notes
            </p>
            <div className="bg-border-default mt-5 h-px w-12" />
            <p className="text-text-secondary mt-5 max-w-[22ch] text-[13px] leading-relaxed">
              A note on what FLOW is for &mdash; and what it deliberately
              isn&apos;t.
            </p>

            <p className="text-text-muted mt-8 font-mono text-[10px] tracking-[0.04em] uppercase">
              <span className="text-text-primary">Status</span>
              <span className="px-2 opacity-50">/</span>
              <span>in development</span>
            </p>
          </motion.div>

          {/* Right: the pull-quote itself */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <span
              aria-hidden
              className="text-accent-primary block font-serif text-[160px] leading-[0.6] tracking-tighter select-none"
            >
              &ldquo;
            </span>

            <blockquote className="text-text-primary -mt-2 text-[clamp(26px,3.4vw,44px)] leading-[1.18] font-medium tracking-[-0.022em]">
              Most workflow tools force a choice:{" "}
              <span className="text-text-muted line-through decoration-[1px]">
                a toy
              </span>{" "}
              or a YAML maze. I wanted a third thing &mdash; a{" "}
              <HighlightedPhrase>visual editor</HighlightedPhrase> where the
              graph is the source of truth, the{" "}
              <HighlightedPhrase delay={0.4}>runtime is yours</HighlightedPhrase>
              , and every change diffs cleanly in git.
            </blockquote>

            <footer className="mt-12 flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-7">
              <div className="flex items-center gap-4">
                <span
                  aria-hidden
                  className="btn-stamp bg-accent-primary text-accent-on size-12 shrink-0 font-mono text-[11px] font-bold tracking-tight shadow-[2px_2px_0_0_var(--hard-shadow-color)]"
                >
                  FLOW
                </span>
                <div>
                  <p className="text-text-primary text-[15px] font-semibold tracking-tight">
                    Building in public
                  </p>
                  <p className="text-text-muted mt-0.5 font-mono text-[11px] tracking-tight">
                    Portfolio project &middot; MIT licensed
                  </p>
                </div>
              </div>

              <span
                aria-hidden
                className="bg-border-subtle hidden h-10 w-px sm:block"
              />

              <dl className="grid grid-cols-3 gap-x-8 gap-y-1 sm:flex sm:gap-8">
                <ProjectMeta term="Stack" value="Next 16" />
                <ProjectMeta term="License" value="MIT" />
                <ProjectMeta term="Sign-up" value="None" />
              </dl>
            </footer>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* Animated highlight — pulls an accent rule under the phrase when it
   scrolls into view, then deepens on hover. Pure motion + Tailwind, no
   library beyond motion/react. */
function HighlightedPhrase({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <span className="group/hl relative inline-block">
      <span className="text-text-brand font-medium">{children}</span>
      <motion.span
        aria-hidden
        className="bg-accent-primary absolute right-0 -bottom-0.5 left-0 h-[3px] origin-left"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{
          duration: 0.55,
          delay: 0.4 + delay,
          ease: [0.16, 1, 0.3, 1],
        }}
      />
    </span>
  );
}

function ProjectMeta({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="text-text-muted font-mono text-[10px] tracking-[0.06em] uppercase">
        {term}
      </dt>
      <dd className="text-text-primary mt-1 font-mono text-[14px] font-semibold tabular-nums">
        {value}
      </dd>
    </div>
  );
}
