import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SessionGuard } from "@/components/auth/SessionGuard";
import { NotionSyncPoller } from "@/components/dashboard/NotionSyncPoller";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <SessionGuard>
        <NotionSyncPoller />
        <AppSidebar />
        <SidebarInset className="bg-[#f6f6f7] dark:bg-[#111112]">
          <main className="flex-1 overflow-auto p-4 md:p-8">{children}</main>
        </SidebarInset>
      </SessionGuard>
    </SidebarProvider>
  );
} 