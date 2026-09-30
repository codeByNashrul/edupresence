"use client";

import { useState, type ReactNode } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import MobileBottomNav from "./MobileBottomNav";

type UserRole = "ADMIN" | "PIMPINAN" | "GURU" | "STAFF" | "PIKET" | "ORTU";

interface Props {
  children: ReactNode;
  role: UserRole;
}

export function DashboardShell({ children, role }: Props) {
  const [sidebarHovered, setSidebarHovered] = useState(false);

  const sidebarExpanded = sidebarHovered;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar
        role={role}
        isOpen={false}
        isExpanded={sidebarExpanded}
        onHoverChange={setSidebarHovered}
        onClose={() => undefined}
      />

      <div
        className={`flex min-w-0 flex-col transition-all duration-300 ${
          sidebarExpanded ? "lg:ml-64" : "lg:ml-20"
        }`}
      >
        <Header />

        <main className="p-4 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] lg:p-6">
          {children}
        </main>
      </div>

      <MobileBottomNav role={role} />
    </div>
  );
}
