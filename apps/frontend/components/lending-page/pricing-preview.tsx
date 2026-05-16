"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Check, Clock } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";

import SectionHeader from "./section-header";

/* Pricing for a portfolio-stage project. The honest version is just two
   cards: the open-source self-host that exists today, and the planned
   hosted version. No fabricated SLAs, no SOC 2 claims, no fake seat
   pricing for a cloud product that hasn't shipped. */

type Plan = {
  id: string;
  name: string;
  tagline: string;
  price: string;
  unit: string;
  features: readonly string[];
  cta: string;
  ctaVariant: "primary" | "ghost";
  status: "available" | "planned";
  fine: string;
};

const PLANS: readonly Plan[] = [
  {
    id: "oss",
    name: "Self-hosted",
    tagline: "Run the editor and the runtime on your own machine.",
    price: "$0",
    unit: "forever",
    features: [
      "Unlimited workflows and runs",
      "Workflows saved as JSON, diffable in git",
      "No telemetry, no phone-home",
      "MIT licensed source",
    ],
    cta: "Try the editor",
    ctaVariant: "primary",
    status: "available",
    fine: "Open the in-browser editor — no sign-up.",
  },
  {
    id: "cloud",
    name: "Hosted",
    tagline:
      "Same editor, run by me. For when you don't want to babysit a server.",
    price: "Soon",
    unit: "join the list",
    features: [
      "Same editor, hosted runtime",
      "Team workspaces and shared credentials",
      "Versioned graphs synced from git",
      "Pricing announced when it ships",
    ],
    cta: "Notify me",
    ctaVariant: "ghost",
    status: "planned",
    fine: "Email capture goes live with the hosted beta.",
  },
] as const;

export default function PricingPreview() {
  const router = useRouter();

  return (
    <section className="relative py-24">
      <div className="section-container">
        <SectionHeader
          chapter="05"
          eyebrow="Plans"
          title={
            <>
              Free today,{" "}
              <span className="text-text-brand">honest tomorrow</span>.
            </>
          }
          description="Self-host on day one. A hosted version is on the roadmap — no fabricated pricing or SLAs until it actually ships."
          className="mb-14 max-w-3xl"
        />

        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
          {PLANS.map((plan, i) => (
            <motion.article
              key={plan.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              whileHover={{ y: -2 }}
              transition={{
                duration: 0.5,
                delay: 0.08 + i * 0.08,
                ease: [0.16, 1, 0.3, 1],
              }}
              className={cn(
                "border-text-primary dark:border-border-stamp relative flex flex-col border-[1.5px] p-8 transition-all duration-[200ms]",
                plan.status === "available"
                  ? "bg-bg-elevated shadow-[6px_6px_0_0_var(--hard-shadow-color)] hover:shadow-[7px_7px_0_0_var(--hard-shadow-color)]"
                  : "bg-bg-surface shadow-[3px_3px_0_0_var(--hard-shadow-color)] hover:shadow-[4px_4px_0_0_var(--hard-shadow-color)]"
              )}
            >
              {plan.status === "available" ? (
                <span className="bg-accent-primary text-accent-on border-text-primary dark:border-border-stamp absolute -top-3 left-6 border-[1.5px] px-2 py-0.5 font-mono text-[10px] font-bold tracking-[0.12em] uppercase shadow-[2px_2px_0_0_var(--hard-shadow-color)]">
                  Available now
                </span>
              ) : (
                <span className="bg-bg-elevated text-text-secondary border-text-primary dark:border-border-stamp absolute -top-3 left-6 inline-flex items-center gap-1 border-[1.5px] px-2 py-0.5 font-mono text-[10px] font-bold tracking-[0.12em] uppercase shadow-[2px_2px_0_0_var(--hard-shadow-color)]">
                  <Clock className="size-2.5" strokeWidth={2.5} />
                  Coming soon
                </span>
              )}

              {/* Plan header */}
              <header>
                <p className="text-text-muted font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
                  /0{i + 1} &middot; {plan.id}
                </p>
                <h3 className="text-text-primary mt-4 text-[22px] font-semibold tracking-tight">
                  {plan.name}
                </h3>
                <p className="text-text-secondary mt-2 max-w-[34ch] text-[13px] leading-relaxed">
                  {plan.tagline}
                </p>
              </header>

              {/* Price */}
              <div className="my-8 flex items-baseline gap-2">
                <span
                  className={cn(
                    "text-[44px] leading-none font-semibold tracking-[-0.03em] tabular-nums",
                    plan.status === "available"
                      ? "text-text-primary"
                      : "text-text-secondary"
                  )}
                >
                  {plan.price}
                </span>
                <span className="text-text-muted font-mono text-[12px] tracking-tight">
                  {plan.unit}
                </span>
              </div>

              {/* Features */}
              <ul className="flex flex-col gap-3">
                {plan.features.map((feat) => (
                  <li
                    key={feat}
                    className="text-text-secondary flex items-start gap-3 text-[13px] leading-snug"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "mt-[3px] grid size-4 shrink-0 place-items-center border-[1.5px]",
                        plan.status === "available"
                          ? "bg-accent-primary text-accent-on border-text-primary dark:border-border-stamp"
                          : "text-text-muted border-border-default"
                      )}
                    >
                      <Check className="size-2.5" strokeWidth={3} />
                    </span>
                    {feat}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div className="mt-10">
                <button
                  type="button"
                  onClick={() =>
                    plan.status === "available"
                      ? router.push("/workflows/new")
                      : undefined
                  }
                  disabled={plan.status === "planned"}
                  className={cn(
                    "btn-stamp text-body-sm inline-flex h-11 w-full px-4 transition-opacity",
                    plan.ctaVariant === "primary"
                      ? "btn-stamp-primary hover:btn-stamp-primary-hover hover:btn-stamp-hover active:btn-stamp-active"
                      : "hover:btn-stamp-hover active:btn-stamp-active",
                    plan.status === "planned" &&
                      "cursor-not-allowed opacity-60 hover:translate-x-0 hover:translate-y-0 hover:shadow-[2px_2px_0_0_var(--hard-shadow-color)]"
                  )}
                >
                  {plan.cta}
                  <ArrowRight className="size-3.5" />
                </button>
              </div>

              {/* Fine print */}
              <p className="text-text-muted mt-5 font-mono text-[10px] tracking-tight">
                {plan.fine}
              </p>
            </motion.article>
          ))}
        </div>

        {/* Footnote band */}
        <div className="border-border-subtle mx-auto mt-14 flex max-w-4xl flex-col items-start gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-text-muted text-[13px] leading-relaxed">
            No SLA promises until there&apos;s a runtime to make them on.
          </p>
          <a
            href="#hero-mockup"
            className="text-text-brand inline-flex items-center gap-1.5 font-mono text-[12px] font-semibold tracking-tight transition-colors hover:underline"
          >
            See it in action
            <ArrowRight className="size-3" />
          </a>
        </div>
      </div>
    </section>
  );
}
