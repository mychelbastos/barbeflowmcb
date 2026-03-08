import { useEffect, useRef } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { initTracking, trackPageView, trackViewContent } from "@/lib/tracking";
import { useInView } from "framer-motion";

import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingHero from "@/components/landing/LandingHero";
import LandingProblems from "@/components/landing/LandingProblems";
import LandingSolutions from "@/components/landing/LandingSolutions";
import LandingHowItWorks from "@/components/landing/LandingHowItWorks";
import LandingDifferentials from "@/components/landing/LandingDifferentials";
import LandingMidCTA from "@/components/landing/LandingMidCTA";
import LandingTestimonials from "@/components/landing/LandingTestimonials";
import LandingComparison from "@/components/landing/LandingComparison";
import LandingPricing from "@/components/landing/LandingPricing";
import LandingFAQ from "@/components/landing/LandingFAQ";
import LandingFinalCTA from "@/components/landing/LandingFinalCTA";
import LandingFooter from "@/components/landing/LandingFooter";

const Landing = () => {
  usePageTitle("Sistema de Gestão para Barbearias | Agendamento Online");

  const pricingRef = useRef<HTMLElement>(null);
  const pricingInView = useInView(pricingRef, { once: true });

  useEffect(() => {
    initTracking();
    trackPageView("/");
  }, []);

  useEffect(() => {
    if (pricingInView) {
      trackViewContent("pricing_section");
    }
  }, [pricingInView]);

  return (
    <div
      className="min-h-screen bg-[#050505] text-zinc-100 overflow-x-hidden"
      style={{ fontFamily: "'Satoshi', sans-serif" }}
    >
      <LandingNavbar />
      <LandingHero />

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />

      <LandingProblems />
      <LandingSolutions />

      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />

      <LandingHowItWorks />
      <LandingDifferentials />
      <LandingMidCTA />

      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />

      <LandingTestimonials />
      <LandingComparison />

      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />

      <LandingPricing ref={pricingRef} />
      <LandingFAQ />
      <LandingFinalCTA />
      <LandingFooter />
    </div>
  );
};

export default Landing;
