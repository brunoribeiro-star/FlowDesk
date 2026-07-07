import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import OnboardingTour from "@/components/OnboardingTour";
import MobileBottomNav from "@/components/mobile/MobileBottomNav";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen w-screen bg-primary-900 text-gray-100 flex overflow-hidden">
      <OnboardingTour />
      <Sidebar defaultOpen={false} />
      <div className="flex-1 flex flex-col overflow-hidden lg:pl-6 pb-[88px] lg:pb-0">
        {children}
      </div>
      <MobileBottomNav />
    </div>
  );
}
