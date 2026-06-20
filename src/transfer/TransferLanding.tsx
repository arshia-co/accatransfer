import { useEffect } from 'react';
import { MotionConfig } from 'framer-motion';
import { Navbar } from '@/components/landing/Navbar';
import { Hero } from '@/components/landing/Hero';
import {
  ProcessSection,
  DashboardPreview,
  RolesSection,
} from '@/components/landing/Sections';
import {
  MatchingSection,
  UniversitiesSection,
  TrustSection,
  PricingSection,
  FaqSection,
  FinalCTA,
  Footer,
} from '@/components/landing/Sections2';
import { DashboardTabsSection } from '@/components/landing/DashboardTabs';
import { I18nProvider } from '@/lib/i18n';
import { UIProvider } from '@/lib/ui-context';
import { GlobalModals } from '@/components/landing/Modals';
import { GuestAssessmentModals } from '@/components/landing/GuestAssessmentModals';
import { FloatingSocial } from '@/components/FloatingSocial';
import { CustomCursor } from '@/components/CustomCursor';
import { Toaster } from '@/components/ui/sonner';
import './transfer.css';

function TransferExperience() {
  useEffect(() => {
    document.title = 'ACCA Transfer AI | From Transcript to Transfer Decision';
    document.body.classList.add('transfer-route-active');

    return () => {
      document.body.classList.remove('transfer-route-active');
    };
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className="transfer-app relative min-h-screen bg-background text-foreground antialiased">
        <Navbar />
        <main>
          <Hero />
          <ProcessSection />
          <MatchingSection />
          <DashboardPreview />
          <DashboardTabsSection />
          <RolesSection />
          <UniversitiesSection />
          <TrustSection />
          <PricingSection />
          <FaqSection />
          <FinalCTA />
        </main>
        <Footer />
        <GlobalModals />
        <GuestAssessmentModals />
        <FloatingSocial />
        <CustomCursor />
        <Toaster position="top-right" richColors />
      </div>
    </MotionConfig>
  );
}

export default function TransferLanding() {
  return (
    <I18nProvider>
      <UIProvider>
        <TransferExperience />
      </UIProvider>
    </I18nProvider>
  );
}
