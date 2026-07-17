"use client";

import { useState, type ReactNode } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

type UserRole = "ADMIN" | "PIMPINAN" | "GURU" | "STAFF" | "ORTU";

interface Props {
  children: ReactNode;
  role: UserRole;
}

export function DashboardShell({ children, role }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);

  const sidebarExpanded = sidebarOpen || sidebarHovered;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar
        role={role}
        isOpen={sidebarOpen}
        isExpanded={sidebarExpanded}
        onHoverChange={setSidebarHovered}
        onClose={() => setSidebarOpen(false)}
      />

      <div
        className={`flex min-w-0 flex-col transition-all duration-300 ${
          sidebarExpanded ? "lg:ml-64" : "lg:ml-20"
        }`}
      >
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
