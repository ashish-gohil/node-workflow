"use client";

import { useState } from "react";
import { Boxes, FileJson, GitBranch, Server } from "lucide-react";
import { motion } from "motion/react";

/* Honest product traits — every item here is verifiable by trying the
   editor or reading the repo. No fabricated metrics, no SLAs, no
   user/workflow counts. */
const TRAITS = [
  {
    icon: Boxes,
    label: "Visual",
    title: "A node graph, not YAML",
    body: "Drag triggers, transforms, and outputs. The canvas is the source.",
  },
  {
    icon: FileJson,
    label: "JSON",
    title: "Every change is a diff",
    body: "Workflows serialize to JSON. Git owns the history — no proprietary blobs.",
  },
  {
    icon: Server,
    label: "Local",
    title: "Runs where you do",
    body: "Your laptop, your server, your container. No vendor between you and the run.",
  },
  {
    icon: GitBranch,
    label: "MIT",
    title: "Open source, end to end",
    body: "Self-host the editor and the runtime. Fork it, audit it, ship it.",
  },
] as const;

export default function StatsBand() {
  return (
    <section className="relative py-14">
      <div className="section-container">
        <div className="border-text-primary dark:border-border-stamp bg-bg-surface relative grid grid-cols-1 border-[1.5px] shadow-[3px_3px_0_0_var(--hard-shadow-color)] lg:grid-cols-4">
          {/* Corner ticks */}
          <span
            aria-hidden
            className="bg-accent-primary absolute -top-[3px] -left-[3px] size-1.5"
          />
          <span
            aria-hidden
            className="bg-accent-primary absolute -top-[3px] -right-[3px] size-1.5"
          />
          <span
            aria-hidden
            className="bg-accent-primary absolute -bottom-[3px] -left-[3px] size-1.5"
          />
          <span
            aria-hidden
            className="bg-accent-primary absolute -right-[3px] -bottom-[3px] size-1.5"
          />

          {TRAITS.map((trait, i) => (
            <TraitCard key={trait.label} trait={trait} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TraitCard({
  trait,
  index,
}: {
  trait: (typeof TRAITS)[number];
  index: number;
}) {
  const [hovered, setHovered] = useState(false);
  const Icon = trait.icon;

  return (
    <motion.div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: 0.5,
        delay: index * 0.08,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="border-border-subtle group relative px-7 py-10 not-first:border-t-[1.5px] lg:not-first:border-t-0 lg:not-first:border-l-[1.5px]"
    >
      {/* Chapter tick */}
      <span className="text-text-muted absolute top-4 right-5 font-mono text-[10px] font-semibold tracking-[0.16em]">
        /0{index + 1}
      </span>

      {/* Icon + label */}
      <div className="flex items-center gap-3">
        <motion.span
          animate={{
            rotate: hovered ? -3 : 0,
            y: hovered ? -1 : 0,
          }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="border-text-primary dark:border-border-stamp bg-accent-primary text-accent-on flex size-9 items-center justify-center border-[1.5px] shadow-[2px_2px_0_0_var(--hard-shadow-color)]"
        >
          <Icon size={16} strokeWidth={2.25} />
        </motion.span>
        <span className="text-text-primary font-mono text-[13px] font-bold tracking-[0.08em] uppercase">
          {trait.label}
        </span>
      </div>

      {/* Title */}
      <p className="text-text-primary mt-5 max-w-[24ch] text-[18px] leading-[1.25] font-semibold tracking-[-0.02em]">
        {trait.title}
      </p>

      {/* Body */}
      <p className="text-text-secondary mt-2 max-w-[28ch] text-[13px] leading-relaxed">
        {trait.body}
      </p>

      {/* Accent rule that draws in on hover */}
      <motion.span
        aria-hidden
        className="bg-accent-primary absolute bottom-0 left-7 h-[2px]"
        animate={{ width: hovered ? 48 : 0 }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      />
    </motion.div>
  );
}
