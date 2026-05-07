"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

import CornerIcons from "@/components/ui/corners";

/* ──────────────────────────────────────────── */
/*  Shared card wrapper                         */
/* ──────────────────────────────────────────── */

function BentoCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={`bento-card hover:bento-card-hover group flex flex-col ${className}`}
    >
      <CornerIcons size="md" className="z-10" />
      {children}
    </motion.article>
  );
}

/* Shared visual frame — consistent padding, height, overflow. */
function BentoVisual({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative h-48 w-full overflow-hidden p-6 ${className}`}>
      {children}
    </div>
  );
}

/* Hook: returns true when the parent .group element is being hovered. */
function useGroupHover<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }
    const card = node.closest(".group");
    if (!card) {
      return;
    }
    const onEnter = () => setHovered(true);
    const onLeave = () => setHovered(false);
    card.addEventListener("mouseenter", onEnter);
    card.addEventListener("mouseleave", onLeave);
    return () => {
      card.removeEventListener("mouseenter", onEnter);
      card.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return { ref, hovered };
}

/* ──────────────────────────────────────────── */
/*  Card 1: AI Workflow Builder                 */
/*  Hover: nodes float (stagger), brand pulses, */
/*  dashed connections animate, glow rises.     */
/* ──────────────────────────────────────────── */

const AI_NODES = [
  { label: "Trigger", x: "8%", y: "12%", brand: false, delay: 0 },
  { label: "Tools", x: "60%", y: "12%", brand: false, delay: 0.06 },
  { label: "LLM Reasoner", x: "33%", y: "42%", brand: true, delay: 0.12 },
  { label: "Memory", x: "10%", y: "70%", brand: false, delay: 0.18 },
  { label: "Output", x: "60%", y: "70%", brand: false, delay: 0.24 },
];

function AIVisual() {
  const { ref, hovered } = useGroupHover<HTMLDivElement>();
  return (
    <BentoVisual>
      <div ref={ref} className="absolute inset-0">
        {/* Soft glow that rises on hover */}
        <motion.div
          aria-hidden
          animate={{ opacity: hovered ? 0.35 : 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 blur-2xl"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 60%, var(--accent-primary), transparent 70%)",
          }}
        />

        {/* Connections */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 400 200"
          preserveAspectRatio="none"
        >
          <g fill="none" strokeWidth="1.5" className="text-border-strong">
            <motion.path
              d="M 60 40 Q 140 40 165 100"
              stroke="currentColor"
              animate={{ opacity: hovered ? 1 : 0.5 }}
              transition={{ duration: 0.4 }}
            />
            <motion.path
              d="M 280 40 Q 240 40 220 100"
              stroke="currentColor"
              strokeDasharray="4 3"
              animate={{
                opacity: hovered ? 1 : 0.5,
                strokeDashoffset: hovered ? -28 : 0,
              }}
              transition={{
                opacity: { duration: 0.4 },
                strokeDashoffset: {
                  duration: 1.4,
                  ease: "linear",
                  repeat: hovered ? Infinity : 0,
                },
              }}
              className={hovered ? "text-accent-primary" : ""}
            />
            <motion.path
              d="M 165 130 Q 140 160 100 165"
              stroke="currentColor"
              animate={{ opacity: hovered ? 1 : 0.5 }}
              transition={{ duration: 0.4 }}
            />
            <motion.path
              d="M 220 130 Q 240 160 280 165"
              stroke="currentColor"
              animate={{ opacity: hovered ? 1 : 0.5 }}
              transition={{ duration: 0.4 }}
            />
          </g>
        </svg>

        {/* Nodes */}
        {AI_NODES.map((n) => (
          <motion.div
            key={n.label}
            animate={hovered ? { y: -3, scale: 1.02 } : { y: 0, scale: 1 }}
            transition={{
              duration: 0.5,
              ease: [0.16, 1, 0.3, 1],
              delay: hovered ? n.delay : 0,
            }}
            className={`border-text-primary dark:border-border-stamp absolute flex items-center gap-1.5 border-[1.5px] px-2.5 py-1.5 text-[11px] font-semibold shadow-[2px_2px_0_0_var(--hard-shadow-color)] select-none ${n.brand ? "bg-accent-primary text-accent-on" : "bg-bg-elevated text-text-primary"}`}
            style={{ left: n.x, top: n.y }}
          >
            <motion.span
              animate={
                n.brand && hovered
                  ? { scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }
                  : {}
              }
              transition={{
                duration: 1.2,
                repeat: hovered ? Infinity : 0,
                ease: "easeInOut",
              }}
              className={`size-1.5 rounded-full ${n.brand ? "bg-accent-on" : "bg-text-brand"}`}
            />
            {n.label}
          </motion.div>
        ))}
      </div>
    </BentoVisual>
  );
}

/* ──────────────────────────────────────────── */
/*  Card 2: Agents — orb breathes, tools ping   */
/*  Hover: ping cycle accelerates, orb glows.   */
/* ──────────────────────────────────────────── */

const AGENT_TOOLS = ["⌘", "@", "⊘", "⚡", null, "▣", "{ }", "db", "π"] as const;
const PING_ORDER = [0, 2, 6, 8, 1, 3, 5, 7];

function AgentsVisual() {
  const { ref, hovered } = useGroupHover<HTMLDivElement>();
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const ms = hovered ? 480 : 1200;
    const iv = setInterval(
      () => setActiveIdx((i) => (i + 1) % PING_ORDER.length),
      ms
    );
    return () => clearInterval(iv);
  }, [hovered]);

  const activeTool = PING_ORDER[activeIdx];

  return (
    <BentoVisual className="flex items-center justify-center">
      <div ref={ref} className="relative z-10 grid grid-cols-3 gap-3">
        {AGENT_TOOLS.map((tool, i) =>
          tool === null ? (
            <div key="orb" className="flex items-center justify-center">
              <motion.div
                animate={{
                  scale: hovered ? [1, 1.12, 1] : [1, 1.06, 1],
                  boxShadow: hovered
                    ? "0 0 24px 4px var(--accent-glow)"
                    : "0 0 0 0 transparent",
                }}
                transition={{
                  scale: {
                    duration: hovered ? 1 : 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  },
                  boxShadow: { duration: 0.4 },
                }}
                className="bg-accent-primary border-text-primary dark:border-border-stamp flex size-12 items-center justify-center rounded-full border-2"
              >
                <span className="bg-accent-on size-4 rounded-full" />
              </motion.div>
            </div>
          ) : (
            <motion.div
              key={i}
              animate={
                activeTool === i
                  ? {
                      scale: 1.12,
                      backgroundColor: "var(--accent-primary)",
                      color: "var(--accent-on)",
                      y: -2,
                    }
                  : {
                      scale: 1,
                      backgroundColor: "var(--bg-elevated)",
                      color: "var(--text-secondary)",
                      y: 0,
                    }
              }
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="border-text-primary dark:border-border-stamp flex size-12 items-center justify-center border-[1.5px] font-mono text-sm shadow-[2px_2px_0_0_var(--hard-shadow-color)]"
            >
              {tool}
            </motion.div>
          )
        )}
      </div>
    </BentoVisual>
  );
}

/* ──────────────────────────────────────────── */
/*  Card 3: API Orchestration                   */
/*  Hover: rows highlight sequentially with     */
/*  smooth shift-right + verb glow.             */
/* ──────────────────────────────────────────── */

const API_ROWS = [
  {
    verb: "GET",
    path: "/v1/users/:id",
    ms: "42ms",
    verbBg: "bg-info text-bg-canvas",
  },
  {
    verb: "POST",
    path: "/v1/orders",
    ms: "81ms",
    verbBg: "bg-accent-primary text-accent-on",
  },
  {
    verb: "PUT",
    path: "/v1/inventory",
    ms: "37ms",
    verbBg: "bg-warning text-bg-canvas",
  },
  {
    verb: "DEL",
    path: "/v1/sessions/x",
    ms: "12ms",
    verbBg: "bg-error text-cream-50",
  },
  {
    verb: "POST",
    path: "/v1/notify",
    ms: "90ms",
    verbBg: "bg-accent-primary text-accent-on",
  },
] as const;

function APIVisual() {
  const { ref, hovered } = useGroupHover<HTMLDivElement>();
  const [activeRow, setActiveRow] = useState(-1);

  useEffect(() => {
    if (!hovered) {
      setActiveRow(-1);
      return;
    }
    let i = 0;
    setActiveRow(0);
    const iv = setInterval(() => {
      i = (i + 1) % API_ROWS.length;
      setActiveRow(i);
    }, 600);
    return () => clearInterval(iv);
  }, [hovered]);

  return (
    <BentoVisual>
      <div ref={ref} className="flex h-full flex-col gap-1.5 font-mono">
        {API_ROWS.map((row, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.07, duration: 0.3 }}
            animate={{
              x: activeRow === i ? 6 : 0,
              backgroundColor:
                activeRow === i ? "var(--accent-subtle)" : "transparent",
            }}
            style={{ transition: "background-color 200ms" }}
            className="flex cursor-default items-center gap-3 px-2 py-1.5"
          >
            <span
              className={`border-border-stamp w-9 shrink-0 border px-1.5 py-0.5 text-center text-[10px] font-bold ${row.verbBg}`}
            >
              {row.verb}
            </span>
            <span className="text-text-secondary flex-1 truncate text-[11px]">
              {row.path}
            </span>
            <span className="text-text-muted shrink-0 text-[10px]">
              {row.ms}
            </span>
          </motion.div>
        ))}
      </div>
    </BentoVisual>
  );
}

/* ──────────────────────────────────────────── */
/*  Card 4: Schedule / Cron                     */
/*  Hover: dial cycles presets w/ smooth ease.  */
/* ──────────────────────────────────────────── */

const CRON_LINES = [
  { expr: "0 * * * *", label: "hourly", hour: 30, minute: 0 },
  { expr: "*/15 * * * *", label: "every 15min", hour: 45, minute: 90 },
  { expr: "0 9 * * 1-5", label: "weekdays 9am", hour: 270, minute: 0 },
  { expr: "0 0 1 * *", label: "monthly", hour: 0, minute: 180 },
] as const;

function CronVisual() {
  const { ref, hovered } = useGroupHover<HTMLDivElement>();
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (!hovered) {
      setActiveIdx(0);
      return;
    }
    const t = setInterval(() => {
      setActiveIdx((i) => (i + 1) % CRON_LINES.length);
    }, 1400);
    return () => clearInterval(t);
  }, [hovered]);

  const active = CRON_LINES[activeIdx];

  return (
    <BentoVisual className="flex items-center gap-5">
      <div ref={ref} className="contents">
        {/* Mini clock */}
        <div className="relative size-24 shrink-0">
          <div className="border-text-primary dark:border-border-stamp bg-bg-elevated absolute inset-0 rounded-full border-[3px]" />
          {[0, 90, 180, 270].map((deg) => (
            <span
              key={deg}
              className="bg-text-primary absolute size-1 rounded-full"
              style={{
                top: "50%",
                left: "50%",
                transform: `rotate(${deg}deg) translate(-50%, -42%)`,
              }}
            />
          ))}
          <motion.div
            className="bg-text-primary absolute bottom-1/2 left-1/2 h-6 w-[2px] origin-bottom"
            style={{ x: "-50%" }}
            animate={{ rotate: active.hour }}
            transition={{ duration: 1.6, ease: [0.4, 0, 0.2, 1] }}
          />
          <motion.div
            className="bg-accent-primary absolute bottom-1/2 left-1/2 h-9 w-[2px] origin-bottom"
            style={{ x: "-50%" }}
            animate={{ rotate: active.minute }}
            transition={{ duration: 1.8, ease: [0.4, 0, 0.2, 1] }}
          />
          <div className="bg-accent-primary border-text-primary dark:border-border-stamp absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2" />
        </div>

        {/* Cron expressions */}
        <div className="flex-1 space-y-2 overflow-hidden">
          {CRON_LINES.map((line, i) => (
            <motion.div
              key={i}
              animate={{
                x: hovered && i === activeIdx ? 4 : 0,
                opacity: hovered ? (i === activeIdx ? 1 : 0.45) : 1,
              }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-2"
            >
              <span
                className={`w-28 shrink-0 truncate font-mono text-[10px] font-semibold transition-colors duration-[200ms] ${
                  hovered && i === activeIdx
                    ? "text-accent-primary"
                    : "text-text-brand"
                }`}
              >
                {line.expr}
              </span>
              <span
                className={`truncate text-[10px] transition-colors duration-[200ms] ${
                  hovered && i === activeIdx
                    ? "text-text-primary"
                    : "text-text-muted"
                }`}
              >
                {line.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </BentoVisual>
  );
}

/* ──────────────────────────────────────────── */
/*  Card 5: Email Automation                    */
/*  Hover: steps light up sequentially with     */
/*  connecting line filling left-to-right.      */
/* ──────────────────────────────────────────── */

const EMAIL_STEPS = [
  { icon: "✉", label: "Trigger" },
  { icon: "⚙", label: "Segment" },
  { icon: "✶", label: "AI Personalise" },
  { icon: "↗", label: "Send" },
  { icon: "▦", label: "Analytics" },
];

function EmailVisual() {
  const { ref, hovered } = useGroupHover<HTMLDivElement>();
  const [activeStep, setActiveStep] = useState(-1);

  useEffect(() => {
    if (!hovered) {
      setActiveStep(-1);
      return;
    }
    let i = 0;
    setActiveStep(0);
    const iv = setInterval(() => {
      i = (i + 1) % EMAIL_STEPS.length;
      setActiveStep(i);
    }, 500);
    return () => clearInterval(iv);
  }, [hovered]);

  return (
    <BentoVisual className="flex items-center justify-between gap-1">
      <div ref={ref} className="flex w-full items-start justify-between">
        {EMAIL_STEPS.map((step, i) => (
          <div
            key={step.label}
            className="flex flex-1 items-center gap-1.5 last:flex-initial"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.3 }}
              animate={
                activeStep === i
                  ? {
                      backgroundColor: "var(--accent-primary)",
                      color: "var(--accent-on)",
                      y: -3,
                      scale: 1.06,
                    }
                  : {
                      backgroundColor: "var(--bg-elevated)",
                      color: "var(--text-primary)",
                      y: 0,
                      scale: 1,
                    }
              }
              className="border-text-primary dark:border-border-stamp flex size-10 flex-col items-center justify-center border-[1.5px] text-base shadow-[2px_2px_0_0_var(--hard-shadow-color)] transition-[box-shadow] duration-[200ms]"
            >
              {step.icon}
            </motion.div>
            {i < EMAIL_STEPS.length - 1 && (
              <div className="bg-border-strong relative h-px w-full flex-1 overflow-hidden">
                <motion.div
                  className="bg-accent-primary absolute inset-y-0 left-0"
                  initial={{ width: "0%" }}
                  animate={{ width: hovered && activeStep > i ? "100%" : "0%" }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </BentoVisual>
  );
}

/* ──────────────────────────────────────────── */
/*  Card 6: Data Pipelines (wide)               */
/*  Hover: stages fill with accent left→right,  */
/*  arrows pulse, items highlight.              */
/* ──────────────────────────────────────────── */

const PIPELINE_STAGES = [
  { label: "Ingest", items: ["Webhook", "Cron", "DB poll"] },
  { label: "Transform", items: ["Parse JSON", "Validate", "Map"] },
  { label: "Enrich", items: ["AI classify", "Lookup", "Tag"] },
  { label: "Load", items: ["Postgres", "S3", "Webhook out"] },
] as const;

function PipelineVisual() {
  const { ref, hovered } = useGroupHover<HTMLDivElement>();
  const [activeStage, setActiveStage] = useState(-1);

  useEffect(() => {
    if (!hovered) {
      setActiveStage(-1);
      return;
    }
    let i = 0;
    setActiveStage(0);
    const iv = setInterval(() => {
      i = (i + 1) % PIPELINE_STAGES.length;
      setActiveStage(i);
    }, 700);
    return () => clearInterval(iv);
  }, [hovered]);

  return (
    <BentoVisual>
      <div ref={ref} className="flex h-full items-stretch gap-3">
        {PIPELINE_STAGES.map((stage, i) => (
          <div key={stage.label} className="flex flex-1 items-center gap-3">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              animate={
                activeStage === i
                  ? {
                      backgroundColor: "var(--accent-primary)",
                      y: -3,
                    }
                  : {
                      backgroundColor: "var(--bg-elevated)",
                      y: 0,
                    }
              }
              className="border-text-primary dark:border-border-stamp flex-1 border-[1.5px] p-3 shadow-[2px_2px_0_0_var(--hard-shadow-color)] transition-[box-shadow] duration-[250ms]"
            >
              <p
                className={`mb-2 text-[9px] font-bold tracking-wider uppercase transition-colors duration-[250ms] ${
                  activeStage === i ? "text-accent-on" : "text-text-muted"
                }`}
              >
                {stage.label}
              </p>
              <div className="space-y-1">
                {stage.items.map((item) => (
                  <div
                    key={item}
                    className={`truncate font-mono text-[10px] transition-colors duration-[250ms] ${
                      activeStage === i
                        ? "text-accent-on/80"
                        : "text-text-secondary"
                    }`}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </motion.div>
            {i < PIPELINE_STAGES.length - 1 && (
              <motion.div
                animate={{
                  scale: activeStage === i ? 1.4 : 1,
                  opacity: activeStage === i ? 1 : 0.5,
                }}
                transition={{ duration: 0.3 }}
                className="flex shrink-0 flex-col items-center gap-0.5"
              >
                <div className="bg-text-primary dark:bg-border-stamp h-px w-4" />
                <div className="border-l-text-primary dark:border-l-border-stamp h-0 w-0 border-y-[3px] border-l-[5px] border-y-transparent" />
              </motion.div>
            )}
          </div>
        ))}
      </div>
    </BentoVisual>
  );
}

/* ──────────────────────────────────────────── */
/*  Card body template                          */
/* ──────────────────────────────────────────── */

function CardBody({
  eyebrow,
  num,
  title,
  desc,
}: {
  eyebrow: string;
  num: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="border-text-primary dark:border-border-stamp mt-auto border-t-[1.5px] px-7 py-6">
      <p className="text-text-muted mb-3 inline-flex items-center gap-2 font-mono text-[10px] font-semibold tracking-[0.12em] uppercase">
        <span className="bg-accent-primary text-accent-on border-border-stamp border px-1.5 py-0.5 font-bold">
          {num}
        </span>
        {eyebrow}
      </p>
      <h3 className="text-text-primary mb-2 text-[22px] leading-[1.15] font-semibold tracking-[-0.02em]">
        {title}
      </h3>
      <p className="text-body-md text-text-secondary max-w-md leading-relaxed">
        {desc}
      </p>
    </div>
  );
}

/* ──────────────────────────────────────────── */
/*  Section                                     */
/* ──────────────────────────────────────────── */

export default function BentoFeatures() {
  return (
    <section className="bg-bg-canvas py-24">
      <div className="section-container">
        {/* Section header */}
        <div className="mb-14 flex flex-col gap-8 md:flex-row md:items-end">
          <div className="flex-1">
            <p className="text-text-primary mb-5 inline-flex items-center gap-2.5 text-[11px] font-semibold tracking-[0.12em] uppercase">
              <span className="bg-accent-primary h-px w-6" />
              Use cases · 06
            </p>
            <h2 className="text-text-primary max-w-[680px] text-[clamp(36px,4.6vw,56px)] leading-[1.0] font-semibold tracking-[-0.04em]">
              One canvas.
              <br />
              Every kind of workflow.
            </h2>
          </div>
          <p className="text-body-md text-text-secondary max-w-sm">
            Whether you're orchestrating LLM agents, syncing CRMs, or processing
            webhooks at scale — FLOW gives you primitives, not opinions.
          </p>
        </div>

        {/* Bento grid — 12-col system */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <BentoCard className="md:col-span-8">
            <AIVisual />
            <CardBody
              num="01"
              eyebrow="AI · LLM agents"
              title="AI workflow builder."
              desc="Drop in OpenAI, Anthropic, or local models. Compose retrieval, tools, and memory without writing glue code."
            />
          </BentoCard>

          <BentoCard className="md:col-span-4">
            <AgentsVisual />
            <CardBody
              num="02"
              eyebrow="Autonomy"
              title="Agents that take action."
              desc="Multi-step agents plan, call tools, observe results, and iterate — with approval breakpoints where you need them."
            />
          </BentoCard>

          <BentoCard className="md:col-span-4">
            <APIVisual />
            <CardBody
              num="03"
              eyebrow="Integration"
              title="API orchestration."
              desc="Chain HTTP calls with retries, auth, and rate-limiting baked in. Fan-out, fan-in, and parallel branches first-class."
            />
          </BentoCard>

          <BentoCard className="md:col-span-4">
            <CronVisual />
            <CardBody
              num="04"
              eyebrow="Schedule · cron"
              title="Scheduled & event-driven."
              desc="Cron expressions, intervals, webhooks, queue events — every workflow triggered on time, on-demand, or in response to your stack."
            />
          </BentoCard>

          <BentoCard className="md:col-span-4">
            <EmailVisual />
            <CardBody
              num="05"
              eyebrow="Email automation"
              title="Smart email pipelines."
              desc="Trigger sequences, AI-personalize content, and track opens — all from a single visual pipeline with zero-glue delivery."
            />
          </BentoCard>

          <BentoCard className="md:col-span-12">
            <PipelineVisual />
            <CardBody
              num="06"
              eyebrow="Data pipelines"
              title="Ingest, transform, enrich, and load."
              desc="Build end-to-end data pipelines with visual branching, parallel execution, retries, and built-in observability. Replace your brittle ETL scripts with flows that actually tell you when they break."
            />
          </BentoCard>
        </div>
      </div>
    </section>
  );
}
