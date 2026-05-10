"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
} from "motion/react";

/* ── Terminal sequence — typed line-by-line ── */
type TermLine =
  | { type: "cmd"; text: string }
  | { type: "dim"; text: string }
  | { type: "ok"; text: string }
  | { type: "cur" };

const TERM_SEQUENCE: TermLine[] = [
  { type: "cmd", text: "npx create-flow my-app" },
  { type: "dim", text: "→ scaffolding workspace" },
  { type: "ok", text: "✓ dependencies installed" },
  { type: "ok", text: "✓ 12 starter workflows imported" },
  { type: "cmd", text: "flow dev" },
  { type: "dim", text: "listening on localhost:3030" },
  { type: "cur" },
];

function useTypewriter(lines: TermLine[]) {
  const [completed, setCompleted] = useState<TermLine[]>([]);
  const [active, setActive] = useState<{
    line: TermLine;
    chars: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const run = (i: number) => {
      if (cancelled || i >= lines.length) {
        return;
      }
      const line = lines[i];

      // Cursor line: just append, hold, then restart cycle
      if (line.type === "cur") {
        setCompleted((c) => [...c, line]);
        timers.push(
          setTimeout(() => {
            if (cancelled) {
              return;
            }
            setCompleted([]);
            setActive(null);
            run(0);
          }, 2400)
        );
        return;
      }

      // Type each character
      const text = line.text;
      let chars = 0;
      setActive({ line, chars: 0 });

      const tick = () => {
        if (cancelled) {
          return;
        }
        chars += 1;
        setActive({ line, chars });
        if (chars < text.length) {
          timers.push(setTimeout(tick, line.type === "cmd" ? 38 : 14));
        } else {
          // commit completed line, schedule next
          timers.push(
            setTimeout(
              () => {
                if (cancelled) {
                  return;
                }
                setCompleted((c) => [...c, line]);
                setActive(null);
                run(i + 1);
              },
              line.type === "cmd" ? 280 : 120
            )
          );
        }
      };
      timers.push(setTimeout(tick, 200));
    };

    run(0);

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [lines]);

  return { completed, active };
}

function TermLineView({
  line,
  partialChars,
}: {
  line: TermLine;
  partialChars?: number;
}) {
  if (line.type === "cur") {
    return (
      <div className="flex items-baseline gap-2">
        <span className="text-forest-300">$</span>
        <span className="bg-forest-300 animate-cursor inline-block h-3.5 w-2" />
      </div>
    );
  }
  const text =
    partialChars !== undefined ? line.text.slice(0, partialChars) : line.text;
  const showCursor =
    partialChars !== undefined && partialChars < line.text.length;

  if (line.type === "cmd") {
    return (
      <div className="flex items-baseline gap-2">
        <span className="text-forest-300 shrink-0">$</span>
        <span className="text-cream-50">
          {text}
          {showCursor && (
            <span className="bg-cream-50 animate-cursor ml-0.5 inline-block h-3 w-1.5" />
          )}
        </span>
      </div>
    );
  }
  if (line.type === "dim") {
    return (
      <div className="ml-4 flex items-baseline gap-2 text-neutral-600 opacity-70">
        <span>{text}</span>
        {showCursor && (
          <span className="animate-cursor ml-0.5 inline-block h-3 w-1.5 bg-neutral-600" />
        )}
      </div>
    );
  }
  // ok
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-success shrink-0">{text.slice(0, 1)}</span>
      <span className="text-neutral-700">
        {text.slice(1).trimStart()}
        {showCursor && (
          <span className="animate-cursor ml-0.5 inline-block h-3 w-1.5 bg-neutral-700" />
        )}
      </span>
    </div>
  );
}

function Terminal() {
  const { completed, active } = useTypewriter(TERM_SEQUENCE);

  return (
    <div
      className="border-border-stamp bg-neutral-0 relative w-full shrink-0 overflow-hidden border-[1.5px] font-mono text-[12px] lg:w-[420px]"
      style={{ boxShadow: "4px 4px 0 0 var(--hard-shadow-color)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-1.5 border-b border-white/10 bg-neutral-50 px-3.5 py-2.5">
        <span className="bg-mac-red size-2 rounded-full" />
        <span className="bg-mac-yellow size-2 rounded-full" />
        <span className="bg-mac-green size-2 rounded-full" />
        <span className="ml-auto text-[10px] text-neutral-600">
          ~/projects/flow
        </span>
      </div>

      {/* Lines */}
      <div className="min-h-[210px] space-y-1 px-3.5 py-3.5 leading-relaxed">
        <AnimatePresence initial={false}>
          {completed.map((line, i) => (
            <motion.div
              key={`done-${i}-${line.type}`}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.18 }}
            >
              <TermLineView line={line} />
            </motion.div>
          ))}
          {active && (
            <motion.div
              key={`active-${completed.length}`}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.12 }}
            >
              <TermLineView line={active.line} partialChars={active.chars} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── CTA panel with mouse-following spotlight ── */
export default function CTAStrip() {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const sx = useSpring(mouseX, { stiffness: 150, damping: 22 });
  const sy = useSpring(mouseY, { stiffness: 150, damping: 22 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  };

  return (
    <section className="py-24">
      <div className="section-container">
        <motion.div
          ref={panelRef}
          onMouseMove={handleMouseMove}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="cta-panel group border-border-stamp text-cream-50 relative overflow-hidden border-[1.5px]"
          style={{
            boxShadow: "8px 8px 0 0 var(--hard-shadow-color)",
          }}
        >
          {/* Mouse-following spotlight */}
          <SpotlightLayer sx={sx} sy={sy} />

          {/* Drifting grid backdrop */}
          <div
            aria-hidden
            className="animate-grid-drift pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(to right, var(--color-cream-50) 1px, transparent 1px), linear-gradient(to bottom, var(--color-cream-50) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          {/* Subtle scan line */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent 0 2px, var(--color-cream-50) 2px 3px)",
            }}
          />

          {/* Vignette aura */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-1/3 left-1/2 h-[120%] w-[120%] -translate-x-1/2 opacity-30 blur-3xl"
            style={{
              background:
                "radial-gradient(ellipse 50% 40% at 50% 50%, var(--accent-primary), transparent 70%)",
            }}
          />

          {/* Corner brackets */}
          <span
            aria-hidden
            className="border-cream-50/60 pointer-events-none absolute -top-px -left-px size-3 border-t-[1.5px] border-l-[1.5px]"
          />
          <span
            aria-hidden
            className="border-cream-50/60 pointer-events-none absolute -top-px -right-px size-3 border-t-[1.5px] border-r-[1.5px]"
          />
          <span
            aria-hidden
            className="border-cream-50/60 pointer-events-none absolute -bottom-px -left-px size-3 border-b-[1.5px] border-l-[1.5px]"
          />
          <span
            aria-hidden
            className="border-cream-50/60 pointer-events-none absolute -right-px -bottom-px size-3 border-r-[1.5px] border-b-[1.5px]"
          />

          {/* Content */}
          <div className="relative grid items-center gap-12 p-10 lg:grid-cols-[1.4fr_1fr] lg:p-14">
            <div>
              <p className="text-cream-50/70 mb-5 inline-flex items-center gap-2.5 font-mono text-[11px] font-semibold tracking-[0.12em] uppercase">
                <span className="bg-accent-primary animate-pulse-status size-1.5 rounded-full" />
                Deploy today
              </p>
              <h2 className="text-cream-50 mb-5 text-[clamp(32px,4.4vw,52px)] leading-[1.0] font-semibold tracking-[-0.04em]">
                Ship the workflow,
                <br />
                not the boilerplate.
              </h2>
              <p className="text-body-md text-cream-50/70 mb-7 max-w-md leading-relaxed">
                Spin up FLOW in one command, or use our managed cloud. Either
                way, your workflows are version-controlled, observable, and
                built to scale.
              </p>

              <div className="flex flex-wrap gap-3.5">
                <button
                  onClick={() => router.push("/workflows/new")}
                  className="btn-stamp text-body-md bg-accent-primary text-accent-on border-border-stamp hover:btn-stamp-hover active:btn-stamp-active hover:bg-accent-hover h-12 px-[22px]"
                >
                  Start free <ArrowRight className="size-4" />
                </button>

                <button
                  className="btn-stamp text-body-md text-cream-50 border-cream-50 hover:bg-cream-50/[0.08] hover:border-cream-50 h-12 bg-transparent px-[22px] hover:translate-x-0 hover:translate-y-0"
                  style={{ boxShadow: "none" }}
                >
                  Read the docs
                </button>
              </div>
            </div>

            <Terminal />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* Spotlight layer — uses motion values with template literals for proper interpolation */
function SpotlightLayer({
  sx,
  sy,
}: {
  sx: ReturnType<typeof useSpring>;
  sy: ReturnType<typeof useSpring>;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const updateX = (v: number) => el.style.setProperty("--mx", `${v * 100}%`);
    const updateY = (v: number) => el.style.setProperty("--my", `${v * 100}%`);
    const unX = sx.on("change", updateX);
    const unY = sy.on("change", updateY);
    updateX(sx.get());
    updateY(sy.get());
    return () => {
      unX();
      unY();
    };
  }, [sx, sy]);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      style={{
        background:
          "radial-gradient(circle 380px at var(--mx, 50%) var(--my, 50%), var(--accent-glow), transparent 55%)",
      }}
    />
  );
}
