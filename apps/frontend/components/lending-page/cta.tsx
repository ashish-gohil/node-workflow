"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

const features = [
  {
    eyebrow: "Deploy in seconds",
    title: "Build once, run anywhere.",
    description:
      "Visual pipelines that compile to production-grade execution engines. No glue code.",
    fill: "bg-white",
  },
  {
    eyebrow: "Case study",
    title: "How Acme cut ops time by 70%.",
    description:
      "Their order intake pipeline reduced 12 hours of manual work to 3 hours per week.",
    fill: "bg-lime-200",
  },
  {
    eyebrow: "Integrations",
    title: "Connect your entire stack.",
    description:
      "HTTP, webhooks, cron triggers, conditional branches, and custom code — all visual.",
    fill: "bg-white",
  },
];

export default function CTASection() {
  const router = useRouter();

  return (
    <section data-theme="brutalist" className="bg-bg-canvas py-24 px-8 md:px-16 lg:px-24">
      {/* Section header */}
      <div className="mb-16 max-w-2xl">
        <p className="text-h6 font-bold uppercase tracking-wider text-text-muted mb-3">
          Why FLOW
        </p>
        <h2 className="text-h1 font-bold tracking-tighter text-text-primary">
          Built for engineers who ship.
        </h2>
      </div>

      {/* Feature cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
        {features.map(({ eyebrow, title, description, fill }) => (
          <article
            key={title}
            className={`rounded-none border-2 border-black p-8 shadow-stamp ${fill} transition-all duration-[120ms] hover:shadow-stamp-lg hover:-translate-x-0.5 hover:-translate-y-0.5`}
          >
            <p className="text-h6 font-bold uppercase tracking-wider text-text-muted mb-3">
              {eyebrow}
            </p>
            <h3 className="text-h2 font-bold tracking-tighter text-black">{title}</h3>
            <p className="text-body-md text-black/70 mt-3">{description}</p>
          </article>
        ))}
      </div>

      {/* Testimonial + CTA row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Testimonial */}
        <article className="rounded-none border-2 border-black bg-neutral-0 p-8 shadow-[6px_6px_0_0_#a8e47c] text-cream-50">
          <p className="text-h3 font-medium tracking-tight leading-snug">
            "FLOW replaced four tools and 200 lines of glue code."
          </p>
          <footer className="mt-6 flex items-center gap-3">
            <span className="size-10 border-2 border-cream-50/30 bg-forest-700 shrink-0" />
            <div>
              <p className="font-semibold text-cream-50">Sara Chen</p>
              <p className="text-body-sm font-mono text-cream-50/60">CTO, Acme Corp</p>
            </div>
          </footer>
        </article>

        {/* CTA card */}
        <div className="rounded-none border-2 border-black bg-lime-200 p-8 shadow-stamp flex flex-col justify-between">
          <div>
            <p className="text-h6 font-bold uppercase tracking-wider text-black/60 mb-3">
              Get started
            </p>
            <h3 className="text-h2 font-bold tracking-tighter text-black">
              Ship your first workflow in 5 minutes.
            </h3>
          </div>
          <div className="mt-8 flex flex-wrap gap-4">
            <Button
              variant="stamp"
              onClick={() => router.push("/workflows/new")}
            >
              Start now
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
            <button className="text-body-md font-bold underline-offset-2 text-black hover:underline transition-colors duration-[120ms]">
              Talk to us →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
