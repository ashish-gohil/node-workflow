"use client";

import { motion } from "motion/react";

import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  chapter: string;
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  align?: "left" | "center";
  className?: string;
}

export default function SectionHeader({
  chapter,
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: SectionHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "flex flex-col gap-5",
        align === "center" && "items-center text-center",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center gap-3",
          align === "center" && "justify-center"
        )}
      >
        <span className="text-text-brand font-mono text-[11px] font-bold tracking-[0.18em]">
          /{chapter}
        </span>
        <span className="bg-border-default h-px w-8" />
        <span className="text-text-muted font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
          {eyebrow}
        </span>
      </div>

      <h2 className="text-text-primary text-[clamp(32px,4.6vw,56px)] leading-[1.04] font-semibold tracking-[-0.035em]">
        {title}
      </h2>

      {description && (
        <p
          className={cn(
            "text-body-lg text-text-secondary max-w-[58ch] leading-relaxed",
            align === "center" && "mx-auto"
          )}
        >
          {description}
        </p>
      )}
    </motion.header>
  );
}
