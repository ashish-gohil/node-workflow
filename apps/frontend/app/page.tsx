"use client";
import React from "react";
import { motion } from "motion/react";

import CTASection from "../components/lending-page/cta";
import Hero from "@/components/lending-page/hero-section";
import MacWindow from "@/components/lending-page/mac-window";

export function GradientBorderLine({
  position = "top",
}: {
  position?: "top" | "bottom";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scaleX: 0.9 }}
      whileInView={{ opacity: 1, scaleX: 1 }}
      transition={{ duration: 0.6 }}
      className={`
        absolute left-0 z-30 h-[px] w-full
        ${position === "top" ? "top-0" : "bottom-0"}
        bg-linear-to-r
        from-transparent
        via-black/40
        to-transparent
        dark:via-white/40
      `}
      style={{
        WebkitMaskImage: `
          linear-gradient(to left, white 80%, transparent),
          linear-gradient(to right, white 80%, transparent)
        `,
      }}
    />
  );
}

export default function Home() {
  return (
    <div className="flex w-full flex-col gap-6">
      <Hero />
      <GradientBorderLine />
      <div className="mx-6 w-auto">
        <MacWindow>
          <div>Hello</div>
        </MacWindow>
      </div>
      <div className="relative w-screen">
        <GradientBorderLine />
      </div>
      <CTASection />
      <GradientBorderLine />
    </div>
  );
}
