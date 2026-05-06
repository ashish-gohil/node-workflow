"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Zap } from "lucide-react";

import { Button } from "../ui/button";

export default function Hero() {
  const router = useRouter();

  return (
    <section
      data-theme="brutalist"
      className="dot-grid-cream flex min-h-screen flex-col items-start justify-center px-8 pt-20 pb-16 md:px-16 lg:px-24"
    >
      <div className="max-w-3xl">
        {/* Eyebrow */}
        <div className="mb-6 inline-flex items-center gap-2 border-2 border-black bg-lime-200 px-3 py-1 shadow-stamp-xs">
          <Zap className="size-3.5 fill-black" aria-hidden="true" />
          <span className="text-h6 font-bold uppercase tracking-wider text-black">
            Workflow automation
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-display-lg font-bold tracking-tighter text-black md:text-display-xl">
          Automate logic with
          <br />
          <span className="text-forest-600">visual precision.</span>
        </h1>

        {/* Description */}
        <p className="mt-6 text-body-lg text-text-secondary max-w-xl">
          Connect your stack with FLOW. Deploy complex pipelines in seconds
          without sacrificing technical control.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-wrap items-center gap-6">
          <Button
            variant="stamp"
            size="lg"
            onClick={() => router.push("/workflows/new")}
          >
            Start building
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>

          <button className="text-body-md font-medium text-text-secondary underline-offset-2 hover:text-text-primary hover:underline transition-colors duration-[120ms]">
            View docs →
          </button>
        </div>

        {/* Social proof */}
        <div className="mt-16 flex flex-wrap items-center gap-8">
          {[
            { value: "12,840", label: "Workflows running" },
            { value: "480+",   label: "Teams using FLOW" },
            { value: "99.9%",  label: "Uptime" },
          ].map(({ value, label }) => (
            <div key={label} className="border-2 border-black bg-white p-4 shadow-stamp-xs">
              <p className="text-display-lg font-mono font-bold tabular-nums text-black leading-none">
                {value}
              </p>
              <p className="text-body-sm text-text-muted mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
