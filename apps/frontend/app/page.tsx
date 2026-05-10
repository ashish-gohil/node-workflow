import BentoFeatures from "@/components/lending-page/bento-features";
import CTAStrip from "@/components/lending-page/cta";
import Hero from "@/components/lending-page/hero-section";
import LandingFooter from "@/components/lending-page/landing-footer";
import LandingHeader from "@/components/lending-page/landing-header";

export default function Home() {
  return (
    <div className="flex w-full flex-col">
      {/* ── Content wrapper — aurora lives here, footer excluded ── */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Top-center large mint glow */}
          <div className="animate-aurora [animation-duration:55s] absolute -top-[20%] left-1/2 h-[900px] w-[1300px] -translate-x-1/2 opacity-45 blur-3xl [background:radial-gradient(ellipse_60%_60%_at_50%_50%,var(--accent-primary),transparent_70%)]" />
          {/* Top-left forest haze */}
          <div className="animate-aurora-2 [animation-duration:65s] [animation-delay:-5s] absolute -top-[5%] -left-[10%] h-[700px] w-[700px] opacity-30 blur-3xl [background:radial-gradient(circle_at_50%_50%,var(--accent-press),transparent_60%)]" />
          {/* Top-right hover tint */}
          <div className="animate-aurora [animation-duration:72s] [animation-delay:-18s] absolute top-[5%] -right-[8%] h-[600px] w-[600px] opacity-[28%] blur-3xl [background:radial-gradient(circle_at_50%_50%,var(--accent-hover),transparent_65%)]" />
          {/* Mid-left large press blob */}
          <div className="animate-aurora-2 [animation-duration:80s] [animation-delay:-30s] absolute top-[38%] -left-[18%] h-[900px] w-[900px] opacity-[22%] blur-3xl [background:radial-gradient(circle_at_50%_50%,var(--accent-press),transparent_62%)]" />
          {/* Mid-right mint blob */}
          <div className="animate-aurora [animation-duration:58s] [animation-delay:-22s] absolute top-[45%] -right-[14%] h-[750px] w-[750px] opacity-25 blur-3xl [background:radial-gradient(circle_at_50%_50%,var(--accent-primary),transparent_65%)]" />
          {/* Lower-left hover haze */}
          <div className="animate-aurora-2 [animation-duration:68s] [animation-delay:-12s] absolute top-[68%] -left-[10%] h-[700px] w-[700px] opacity-20 blur-3xl [background:radial-gradient(circle_at_50%_50%,var(--accent-hover),transparent_60%)]" />
          {/* Lower-right press blob */}
          <div className="animate-aurora [animation-duration:62s] [animation-delay:-40s] absolute top-[72%] -right-[10%] h-[800px] w-[800px] opacity-[22%] blur-3xl [background:radial-gradient(circle_at_50%_50%,var(--accent-press),transparent_65%)]" />
          {/* Bottom-center mint anchor */}
          <div className="animate-aurora-2 [animation-duration:75s] [animation-delay:-35s] absolute top-[88%] left-1/2 h-[700px] w-[1000px] -translate-x-1/2 opacity-30 blur-3xl [background:radial-gradient(ellipse_60%_60%_at_50%_50%,var(--accent-primary),transparent_70%)]" />
        </div>

        <LandingHeader />
        <Hero />
        <CTAStrip />
        <BentoFeatures />
      </div>

      {/* Footer — outside aurora wrapper, no bleed-through */}
      <LandingFooter />
    </div>
  );
}
