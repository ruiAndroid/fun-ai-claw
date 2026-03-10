import { HeroSection } from "./hero-section";
import { CapabilitiesSection } from "./capabilities-section";
import { ArchitectureSection } from "./architecture-section";
import { WorkflowSection } from "./workflow-section";
import { TechStackSection } from "./tech-stack-section";
import { QuickEntrySection } from "./quick-entry-section";
import { FooterSection } from "./footer-section";

export function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      <HeroSection />
      <CapabilitiesSection />
      <ArchitectureSection />
      <WorkflowSection />
      <TechStackSection />
      <QuickEntrySection />
      <FooterSection />
    </main>
  );
}
