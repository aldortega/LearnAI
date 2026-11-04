import { useDocumentTitle } from "../../../shared/hooks/useDocumentTitle";
import { AnswerAnatomySection } from "../components/AnswerAnatomySection";
import { CtaSection } from "../components/CtaSection";
import { FaqSection } from "../components/FaqSection";
import { FeaturesSection } from "../components/FeaturesSection";
import { HeroSection } from "../components/HeroSection";
import { HowItWorksSection } from "../components/HowItWorksSection";
import { LandingFooter } from "../components/LandingFooter";
import { LandingNavbar } from "../components/LandingNavbar";
import { SharedNotebookSection } from "../components/SharedNotebookSection";
import { TrustSection } from "../components/TrustSection";

export function LandingPage() {
  useDocumentTitle("LearnAI — Estudiá a partir de tus propios materiales");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNavbar />
      <main>
        <HeroSection />
        <HowItWorksSection />
        <AnswerAnatomySection />
        <FeaturesSection />
        <SharedNotebookSection />
        <TrustSection />
        <FaqSection />
        <CtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}
