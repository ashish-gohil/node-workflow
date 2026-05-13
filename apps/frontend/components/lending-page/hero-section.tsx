"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Calendar, Home, MessageSquare, Play, Save, Wallet } from "lucide-react";
import { motion } from "motion/react";

import Collaborators from "@/components/ui/collaborators";
import { HeroFlowCanvas } from "./hero-canvas";

/* ── Animation variants ── */
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

/* ── Animated word-swap headline ── */
const SWAP_WORDS = ["think", "work"] as const;

function AnimatedWord() {
  const [wordIdx, setWordIdx] = useState(0);
  const [typedChars, setTypedChars] = useState(SWAP_WORDS[0].length);
  const [phase, setPhase] = useState<"hold" | "erasing" | "typing">("hold");

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const word = SWAP_WORDS[wordIdx];

    if (phase === "hold") {
      timer = setTimeout(() => setPhase("erasing"), 1800);
    } else if (phase === "erasing") {
      if (typedChars > 0) {
        timer = setTimeout(() => setTypedChars((c) => c - 1), 70);
      } else {
        const nextIdx = (wordIdx + 1) % SWAP_WORDS.length;
        timer = setTimeout(() => {
          setWordIdx(nextIdx);
          setPhase("typing");
        }, 220);
      }
    } else if (phase === "typing") {
      if (typedChars < word.length) {
        timer = setTimeout(() => setTypedChars((c) => c + 1), 110);
      } else {
        setPhase("hold");
      }
    }

    return () => clearTimeout(timer);
  }, [wordIdx, typedChars, phase]);

  const word = SWAP_WORDS[wordIdx];
  const visible = word.slice(0, typedChars);

  return (
    <span
      className="bg-accent-primary text-accent-on relative mx-2 inline-block px-3 py-0.5 align-middle not-italic"
      style={{ transform: "rotate(-2.5deg)", transformOrigin: "left center" }}
    >
      <span className="inline-block min-w-[3.2ch] whitespace-nowrap">
        {visible}
        <span
          aria-hidden
          className={
            "bg-accent-on ml-0.5 inline-block h-[0.85em] w-[3px] align-middle " +
            (phase === "hold" ? "animate-cursor" : "")
          }
        />
      </span>
    </span>
  );
}

/* ── Sidebar nav row ── */
function NavRow({
  icon: Icon,
  label,
  active,
  badge,
}: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  badge?: string;
}) {
  return (
    <div
      className={[
        "flex cursor-default items-center gap-2.5 py-[6px] text-[12px] font-medium transition-colors duration-[120ms]",
        active
          ? "text-text-primary border-l-2 border-accent-primary pl-[8px] bg-bg-canvas"
          : "text-text-secondary border-l-2 border-transparent pl-[9px] hover:text-text-primary",
      ].join(" ")}
    >
      <Icon
        size={13}
        className={active ? "text-text-brand" : "text-text-muted"}
        strokeWidth={1.8}
      />
      <span className="flex-1 truncate">{label}</span>
      {badge && (
        <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.06em] text-info bg-info/10 border border-info/25 px-1.5 py-px">
          {badge}
        </span>
      )}
    </div>
  );
}

/* ── Sidebar inside the mockup ── */
function MockupSidebar({ open }: { open: boolean }) {
  if (!open) return null;
  return (
    <aside className="flex w-[172px] shrink-0 flex-col gap-0.5 border-r border-border-stamp bg-bg-elevated px-2.5 py-3">
      <p className="mb-1 px-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-text-muted">
        Workspace
      </p>
      <NavRow icon={Home} label="Overview" />
      <NavRow icon={Wallet} label="Personal" active />
      <NavRow icon={MessageSquare} label="Chat" badge="Preview" />

      <p className="mt-3.5 mb-1 px-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-text-muted">
        Workflow
      </p>
      <NavRow icon={Wallet} label="Credentials" />
      <NavRow icon={Calendar} label="Schedules" />

      <div className="mt-auto border-t border-border-subtle pt-2">
        <div className="flex items-center px-2.5">
          <span className="font-mono text-[10px] text-text-muted">v2.14.0</span>
          <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] text-text-muted">
            <span
              className="size-1.5 rounded-full bg-success"
              style={{ boxShadow: "0 0 0 2px rgba(82,183,136,0.18)" }}
            />
            synced
          </span>
        </div>
      </div>
    </aside>
  );
}

/* ── Editor header inside the MacBook ── */
function EditorWindowChrome({ sidebarOpen, onToggleSidebar }: { sidebarOpen: boolean; onToggleSidebar: () => void }) {
  return (
    <header className="relative flex h-[46px] shrink-0 items-stretch border-b border-border-stamp bg-bg-canvas">
      {/* Logo square */}
      <div className="flex w-11 shrink-0 items-center justify-center border-r border-border-subtle">
        <div
          className="flex size-5 items-center justify-center bg-accent-primary text-accent-on border-[1.5px] border-border-stamp"
          style={{ boxShadow: "1.5px 1.5px 0 0 var(--hard-shadow-color)" }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>
      </div>

      {/* Workflow name + draft pill */}
      <div className="flex flex-1 items-center gap-2.5 px-3 min-w-0">
        <span className="text-[12px] font-semibold text-text-primary">Order routing</span>
        <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.04em] text-text-brand bg-accent-primary/10 border border-accent-primary/25 px-1.5 py-px">
          draft
        </span>
      </div>

      {/* Center tabs — float below header */}
      <div
        className="absolute bottom-[-14px] left-1/2 z-10 flex h-[26px] -translate-x-1/2 border-[1.5px] border-border-stamp bg-bg-elevated"
        style={{ boxShadow: "2px 2px 0 0 var(--hard-shadow-color)" }}
      >
        <button className="flex h-full items-center gap-1.5 border-r border-border-stamp bg-accent-primary px-3 text-[11px] font-semibold text-accent-on">
          Editor
        </button>
        <button className="flex h-full items-center gap-1.5 px-3 text-[11px] font-semibold text-text-muted">
          Executions
          <span className="font-mono text-[9px] font-semibold bg-bg-canvas border border-border-default px-1 text-text-muted">
            0
          </span>
        </button>
      </div>

      {/* Right controls */}
      <div className="flex shrink-0 items-center gap-2 pr-3">
        {/* Sidebar toggle */}
        <button
          onClick={onToggleSidebar}
          className="flex size-[26px] items-center justify-center border-[1.5px] border-border-stamp bg-bg-elevated text-text-secondary"
          style={{ boxShadow: "1.5px 1.5px 0 0 var(--hard-shadow-color)" }}
          title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{
              transform: sidebarOpen ? "rotate(0deg)" : "rotate(180deg)",
              transition: "transform 200ms ease",
            }}
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Save split button */}
        <div
          className="flex h-[26px] items-stretch border-[1.5px] border-border-stamp bg-accent-primary text-accent-on"
          style={{ boxShadow: "2px 2px 0 0 var(--hard-shadow-color)" }}
        >
          <span className="flex items-center gap-1.5 px-2.5 text-[11px] font-bold">
            <Save size={10} />
            Save
          </span>
          <span className="flex w-5 items-center justify-center border-l border-accent-on/30">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </div>

        {/* More button */}
        <button
          className="flex size-[26px] items-center justify-center border-[1.5px] border-border-stamp bg-bg-elevated text-text-primary"
          style={{ boxShadow: "2px 2px 0 0 var(--hard-shadow-color)" }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="19" cy="12" r="1.5" />
          </svg>
        </button>
      </div>
    </header>
  );
}

/* ── MacBook outer wrapper ── */
function MacBookMockup() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div
      className="relative overflow-hidden border-[1.5px] border-border-stamp bg-bg-canvas"
      style={{
        boxShadow: "10px 10px 0 0 var(--hard-shadow-color), 0 32px 80px rgba(0,0,0,0.45)",
      }}
    >
      {/* ── macOS title bar (outer "bezel" row) ── */}
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-border-subtle bg-bg-elevated px-3.5">
        {/* Traffic lights */}
        <div className="group flex items-center gap-1.5">
          <button className="size-3 rounded-full bg-mac-red transition-opacity hover:opacity-80" title="Close" />
          <button className="size-3 rounded-full bg-mac-yellow transition-opacity hover:opacity-80" title="Minimize" />
          <button className="size-3 rounded-full bg-mac-green transition-opacity hover:opacity-80" title="Fullscreen" />
        </div>

        {/* Window title */}
        <span className="mx-auto font-mono text-[10px] font-semibold text-text-muted">
          FLOW — Order Routing
        </span>

        {/* Live status dot (right) */}
        <span className="flex items-center gap-1.5 font-mono text-[9px] text-text-muted">
          <span
            className="size-1.5 rounded-full bg-success"
            style={{ boxShadow: "0 0 0 2px rgba(82,183,136,0.18)" }}
          />
          running
        </span>
      </div>

      {/* ── Editor chrome ── */}
      <EditorWindowChrome
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />

      {/* ── Body: sidebar + canvas ── */}
      <div className="flex" style={{ height: 520 }}>
        <MockupSidebar open={sidebarOpen} />

        {/* Canvas area */}
        <div className="relative flex-1 overflow-hidden">
          {/* Collaborators + live badge top-right */}
          <div className="absolute top-2.5 right-3 z-10 flex items-center gap-2">
            <Collaborators />
            <div
              className="flex items-center gap-1.5 border-[1.5px] border-border-stamp bg-bg-elevated px-2 py-[3px] font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-text-brand"
              style={{ boxShadow: "2px 2px 0 0 var(--hard-shadow-color)" }}
            >
              <span
                className="size-1.5 rounded-full bg-success"
                style={{ boxShadow: "0 0 0 3px rgba(82,183,136,0.18)" }}
              />
              live
            </div>
          </div>

          {/* ReactFlow canvas */}
          <HeroFlowCanvas />
        </div>
      </div>
    </div>
  );
}

/* ── Main Hero export ── */
export default function Hero() {
  const router = useRouter();

  return (
    <section className="relative pt-28 pb-20">
      <div className="section-container relative">
        {/* ── Hero copy ── */}
        <motion.div
          className="mx-auto max-w-4xl text-center"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          {/* Eyebrow */}
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="btn-stamp text-text-primary mb-8 inline-flex h-auto items-center gap-2.5 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase"
            style={{ boxShadow: "3px 3px 0 0 var(--hard-shadow-color)" }}
          >
            <span className="bg-accent-primary animate-pulse-status size-2 rounded-full shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent-primary)_30%,transparent)]" />
            v2.4 Shipped · 12 new nodes
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-text-primary mb-8 text-[clamp(40px,6.4vw,76px)] leading-[1.05] font-semibold tracking-tighter"
          >
            Build workflows
            <br />
            that <AnimatedWord /> for you.
          </motion.h1>

          {/* Lede */}
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-body-lg text-text-secondary mx-auto mb-10 max-w-2xl leading-relaxed"
          >
            FLOW is a node-based automation platform for engineers. Compose
            APIs, LLM agents, and data pipelines on a single canvas —
            version-controlled, observable, and self-hosted.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="mb-8 flex flex-wrap items-center justify-center gap-4"
          >
            <button
              onClick={() => router.push("/workflows/new")}
              className="btn-stamp btn-stamp-primary hover:btn-stamp-primary-hover hover:btn-stamp-hover active:btn-stamp-active text-body-md h-12 px-[22px]"
            >
              Start building free
              <ArrowRight className="size-4" />
            </button>

            <button className="btn-stamp hover:btn-stamp-hover active:btn-stamp-active text-body-md h-12 px-[22px]">
              <Play className="size-4 fill-current" />
              Watch demo · 2:14
            </button>
          </motion.div>

          {/* Meta */}
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="text-body-sm text-text-muted mb-16 flex flex-wrap items-center justify-center gap-3"
          >
            <span className="font-mono">No credit card</span>
            <span className="bg-border-default size-1 rounded-full" />
            <span className="font-mono">Self-host or cloud</span>
            <span className="bg-border-default size-1 rounded-full" />
            <span className="text-warning">★★★★★</span>
            <span>
              <span className="text-text-primary font-mono font-semibold">4.9</span>{" "}
              · 1.2k reviews
            </span>
          </motion.div>
        </motion.div>

        {/* ── MacBook mockup ── */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1], delay: 0.4 }}
          className="relative w-full"
        >
          {/* Glow under mockup */}
          <div
            className="pointer-events-none absolute -inset-x-8 -bottom-4 h-24 opacity-40 blur-2xl"
            style={{
              background:
                "radial-gradient(ellipse 70% 100% at 50% 100%, var(--accent-press), transparent)",
            }}
            aria-hidden
          />

          {/* Subtle float */}
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          >
            <MacBookMockup />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
