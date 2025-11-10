import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
// import { AppSidebar, NavigationGroup } from "@/components/layout-module/app-sidebar";

export default async function AdminLayout({ children }: { children: ReactNode }) {


  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        
        <div className="flex-1 flex flex-col ">
          <main className="p-4 md:p-6 flex-1">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}