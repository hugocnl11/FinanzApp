import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SessionGuard } from "@/components/auth/SessionGuard";
import { UserPreferencesSync } from "@/components/UserPreferencesSync";
import { SkipToContent } from "@/components/SkipToContent";
import { WelcomeWizard } from "@/components/dashboard/WelcomeWizard";
import { NotionSyncPoller } from "@/components/dashboard/NotionSyncPoller";
import { DashboardDataProvider } from "@/contexts/DashboardDataContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <SessionGuard>
        <UserPreferencesSync />
        <WelcomeWizard />
        <DashboardDataProvider>
          <NotionSyncPoller />
          <AppSidebar />
          <SidebarInset className="bg-[#f6f6f7] dark:bg-[#111112]">
            <SkipToContent />
            <main
              id="main-content"
              tabIndex={-1}
              className="flex-1 overflow-auto p-4 md:p-8 outline-none"
              role="main"
              aria-label="Contenido principal"
            >
              {children}
            </main>
          </SidebarInset>
        </DashboardDataProvider>
      </SessionGuard>
    </SidebarProvider>
  );
} 