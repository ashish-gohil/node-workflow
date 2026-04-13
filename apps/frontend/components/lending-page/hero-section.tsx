"use client";

import { motion } from "motion/react";

import { Button } from "../ui/button";

export default function Hero() {
  return (
    <section className="flex min-h-screen items-center justify-center px-6 pt-32 text-center">
      <div className="max-w-5xl">
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-primary/60 text-5xl font-extrabold tracking-tight md:text-7xl"
        >
          Automate logic with
          <div className="bg-linear-to-r from-accent-primary to-accent-secondary via-accent-muted bg-clip-text text-5xl font-extrabold tracking-tight text-transparent md:text-7xl">
            visual precision
          </div>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 text-2xl text-slate-500"
        >
          Connect your stack with workflow architect. <br /> Deploy complex
          logic in seconds without sacrificing technical control.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 flex justify-center gap-4"
        >
          <Button variant="primary" allowCorners cornerSize="sm">
            Get Started
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
