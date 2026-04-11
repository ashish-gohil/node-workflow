import React from "react";

import CTA from "@/components/lending-page/cta";
import Hero from "@/components/lending-page/hero-section";
import MacWindow from "@/components/lending-page/mac-window";

export default function Home() {
  return (
    <>
      <Hero />
      <div className="w-auto mx-6">
        <MacWindow>
          <div>Hello</div>
        </MacWindow>
      </div>
      <CTA />
    </>
  );
}
