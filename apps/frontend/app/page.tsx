"use client";

import CTASection from "@/components/lending-page/cta";
import Hero from "@/components/lending-page/hero-section";

export default function Home() {
  return (
    <div className="flex w-full flex-col">
      <Hero />
      <CTASection />
    </div>
  );
}
