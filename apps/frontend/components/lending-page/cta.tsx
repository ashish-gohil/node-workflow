"use client";

import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

export default function CTASection() {
  return (
    <section className="mx-auto my-20 w-full max-w-7xl px-4 md:my-32">
      <Card
        className="
          /* THEME BACKGROUND

          */ /* BORDER */
          border-border-default

          relative overflow-hidden rounded-none
          border bg-[linear-gradient(135deg,var(--color-surface),var(--color-surface-elevated))]
        "
      >
        {/* Gradient Border Lines (FIXED + VISIBLE) */}
        <div className="pointer-events-none absolute inset-0">
          {/* TOP */}
          <div
            className="absolute left-0 top-0 h-px w-full 
            bg-[linear-gradient(to_right,transparent,var(--color-border-strong),transparent)]"
          />

          {/* BOTTOM */}
          <div
            className="absolute bottom-0 left-0 h-px w-full 
            bg-[linear-gradient(to_right,transparent,var(--color-border-strong),transparent)]"
          />

          {/* LEFT */}
          <div
            className="absolute left-0 top-0 h-full w-px 
            bg-[linear-gradient(to_bottom,transparent,var(--color-border-strong),transparent)]"
          />

          {/* RIGHT */}
          <div
            className="absolute right-0 top-0 h-full w-px 
            bg-[linear-gradient(to_bottom,transparent,var(--color-border-strong),transparent)]"
          />
        </div>
        <div className="grid md:grid-cols-3">
          {/* LEFT SIDE */}
          <CardContent className="p-8 md:col-span-2 md:p-12">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-text-secondary text-xl font-medium md:text-3xl"
            >
              Ship products with the{" "}
              <span className="text-text-primary font-bold">
                speed of light
              </span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-text-secondary mt-4 max-w-lg text-lg md:text-xl"
            >
              Get the best in class{" "}
              <span className="text-accent-primary font-medium">support</span>{" "}
              for the most advanced{" "}
              <span className="text-accent-primary font-medium">products</span>.
            </motion.p>

            {/* BUTTONS */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8 flex flex-col gap-4 sm:flex-row"
            >
              <Button variant="primary" allowCorners>
                Start now →
              </Button>

              <Button variant="outline">Talk to us →</Button>
            </motion.div>
          </CardContent>

          {/* RIGHT SIDE */}
          <CardFooter
            className="
              flex flex-col items-start 
              border-t
              border-border-default p-8 md:border-l md:border-t-0 md:p-12
            "
          >
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-text-secondary"
            >
              "This is the best product ever when it comes to shipping. Ten on
              ten recommended."
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-4"
            >
              <p className="text-text-primary font-semibold">Michael Scarn</p>
              <p className="text-text-muted text-sm">Side projects builder</p>
            </motion.div>
          </CardFooter>
        </div>
      </Card>
    </section>
  );
}
