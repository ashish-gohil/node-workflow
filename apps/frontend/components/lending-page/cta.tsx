"use client";

import { motion } from "motion/react";

export default function CTA() {
  return (
    <section className="py-32 text-center">
      <motion.h2
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        className="text-4xl font-bold mb-6"
      >
        Ready to orchestrate your future?
      </motion.h2>

      <motion.button
        whileHover={{ scale: 1.05 }}
        className="bg-primary text-white px-10 py-4 rounded-lg"
      >
        Get Started
      </motion.button>
    </section>
  );
}
