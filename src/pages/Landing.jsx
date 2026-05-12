import HeroSection from "../components/landing/HeroSection";
import FeaturesSection from "../components/landing/FeaturesSection";
import RolesSection from "../components/landing/RolesSection";
import ModulesSection from "../components/landing/ModulesSection";
import ComplianceSection from "../components/landing/ComplianceSection";
import CTASection from "../components/landing/CTASection";
import FooterSection from "../components/landing/FooterSection";

export default function Landing() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <FeaturesSection />
      <RolesSection />
      <ModulesSection />
      <ComplianceSection />
      <CTASection />
      <FooterSection />
    </div>
  );
}