import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import OnboardingTour from "@/components/OnboardingTour";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen w-screen bg-primary-900 text-gray-100 flex gap-6 overflow-hidden">
      <OnboardingTour />
      <Sidebar defaultOpen={false} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
