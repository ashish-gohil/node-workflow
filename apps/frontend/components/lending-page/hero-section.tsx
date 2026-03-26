"use client";

import { motion } from "motion/react";

import { Button } from "../ui/button";

export default function Hero() {
  return (
    <section className="min-h-screen flex items-center justify-center text-center px-6 pt-32">
      <div className="max-w-5xl">
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-5xl md:text-7xl font-extrabold tracking-tight text-text-primary"
        >
          Automate logic with
          <div className="text-5xl font-extrabold tracking-tight md:text-7xl bg-linear-to-r from-accent-primary to-accent-secondary via-accent-muted bg-clip-text text-transparent">
            visual precision
          </div>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 text-slate-500 text-2xl"
        >
          Connect your stack with workflow architect. <br /> Deploy complex logic in seconds without
          sacrificing technical control.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 flex gap-4 justify-center"
        >
          <Button variant="primary" allowCorners cornerSize="sm">
            Get Started
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
