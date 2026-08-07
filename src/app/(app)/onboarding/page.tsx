import type { Metadata } from "next";

import { OnboardingWizard } from "@/features/onboarding/onboarding-wizard";

export const metadata: Metadata = { title: "Get started" };

export default function OnboardingPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center py-8">
      <OnboardingWizard />
    </div>
  );
}
