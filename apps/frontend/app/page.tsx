import BentoFeatures from "@/components/lending-page/bento-features";
import CTAStrip from "@/components/lending-page/cta";
import Hero from "@/components/lending-page/hero-section";
import LandingFooter from "@/components/lending-page/landing-footer";
import LandingHeader from "@/components/lending-page/landing-header";

export default function Home() {
  return (
    <div className="bg-bg-canvas flex w-full flex-col">
      <LandingHeader />
      <Hero />
      <CTAStrip />
      <BentoFeatures />
      <LandingFooter />
    </div>
  );
}
