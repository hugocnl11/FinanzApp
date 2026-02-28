import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { SessionGuard } from "@/components/auth/SessionGuard";
import { UserPreferencesSync } from "@/components/UserPreferencesSync";
import { SkipToContent } from "@/components/SkipToContent";
import { InitialAssetsForm } from "@/components/dashboard/InitialAssetsForm";
import { WelcomeWizard } from "@/components/dashboard/WelcomeWizard";
import { NotionSyncPoller } from "@/components/dashboard/NotionSyncPoller";
import { DashboardDataProvider } from "@/contexts/DashboardDataContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <SessionGuard>
        <UserPreferencesSync />
        <InitialAssetsForm />
        <WelcomeWizard />
        <DashboardDataProvider>
          <NotionSyncPoller />
          <AppSidebar />
          <SidebarInset className="bg-background">
            <DashboardHeader />
            <SkipToContent />
            <main
              id="main-content"
              tabIndex={-1}
              className="flex-1 min-w-0 overflow-auto p-4 md:p-8 outline-none pb-[max(1rem,env(safe-area-inset-bottom))]"
              role="main"
              aria-label="Contenido principal"
            >
              <Breadcrumbs />
              {children}
            </main>
          </SidebarInset>
        </DashboardDataProvider>
      </SessionGuard>
    </SidebarProvider>
  );
} 