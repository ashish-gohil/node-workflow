import BentoFeatures from "@/components/lending-page/bento-features";
import CTAStrip from "@/components/lending-page/cta";
import EditorialQuote from "@/components/lending-page/editorial-quote";
import Hero from "@/components/lending-page/hero-section";
import LandingFooter from "@/components/lending-page/landing-footer";
import LandingHeader from "@/components/lending-page/landing-header";
import PricingPreview from "@/components/lending-page/pricing-preview";
import StatsBand from "@/components/lending-page/stats-band";
import TrustedBy from "@/components/lending-page/trusted-by";

export default function Home() {
  return (
    <div className="page-dot-grid flex w-full flex-col">
      {/* ── Content wrapper — aurora lives here, footer excluded ── */}
      <div className="relative">
        {/* Aurora field — atmospheric glow drifting under the entire page */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Top-center large mint glow */}
          <div className="animate-aurora [animation-duration:12s] absolute -top-[20%] left-1/2 h-[900px] w-[1300px] -translate-x-1/2 opacity-45 blur-3xl [background:radial-gradient(ellipse_60%_60%_at_50%_50%,var(--accent-primary),transparent_70%)]" />
          {/* Top-left forest haze */}
          <div className="animate-aurora-2 [animation-duration:15s] [animation-delay:-2s] absolute -top-[5%] -left-[10%] h-[700px] w-[700px] opacity-30 blur-3xl [background:radial-gradient(circle_at_50%_50%,var(--accent-press),transparent_60%)]" />
          {/* Top-right hover tint */}
          <div className="animate-aurora [animation-duration:18s] [animation-delay:-6s] absolute top-[5%] -right-[8%] h-[600px] w-[600px] opacity-[28%] blur-3xl [background:radial-gradient(circle_at_50%_50%,var(--accent-hover),transparent_65%)]" />
          {/* Mid-left large press blob */}
          <div className="animate-aurora-2 [animation-duration:20s] [animation-delay:-8s] absolute top-[38%] -left-[18%] h-[900px] w-[900px] opacity-[22%] blur-3xl [background:radial-gradient(circle_at_50%_50%,var(--accent-press),transparent_62%)]" />
          {/* Mid-right mint blob */}
          <div className="animate-aurora [animation-duration:14s] [animation-delay:-4s] absolute top-[45%] -right-[14%] h-[750px] w-[750px] opacity-25 blur-3xl [background:radial-gradient(circle_at_50%_50%,var(--accent-primary),transparent_65%)]" />
          {/* Bottom-center mint anchor */}
          <div className="animate-aurora-2 [animation-duration:16s] [animation-delay:-10s] absolute top-[88%] left-1/2 h-[700px] w-[1000px] -translate-x-1/2 opacity-30 blur-3xl [background:radial-gradient(ellipse_60%_60%_at_50%_50%,var(--accent-primary),transparent_70%)]" />
        </div>

        {/* ─── Page narrative ─── */}
        <LandingHeader />

        {/* 00 — Hook */}
        <Hero />

        {/* 01 — Proof in numbers */}
        <StatsBand />

        {/* 02 — Social proof */}
        <TrustedBy />

        {/* 03 — One-terminal CTA (mid-page action) */}
        <CTAStrip />

        {/* 04 — Field notes / customer voice */}
        <EditorialQuote />

        {/* 05 — Feature surface */}
        <BentoFeatures />

        {/* 06 — Plans */}
        <PricingPreview />
      </div>

      {/* Footer — outside aurora wrapper, no bleed-through */}
      <LandingFooter />
    </div>
  );
}
