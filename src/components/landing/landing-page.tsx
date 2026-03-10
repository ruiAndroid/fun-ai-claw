import { HeroSection } from "./hero-section";
import { CapabilitiesSection } from "./capabilities-section";
import { QuickEntrySection } from "./quick-entry-section";
import { FooterSection } from "./footer-section";

export function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      <HeroSection />
      <CapabilitiesSection />
      <QuickEntrySection />
      <FooterSection />
    </main>
  );
}
