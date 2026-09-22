"use client";

import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useAuth } from "../../lib/auth-context";
import { EmergencySosBanner } from "../emergency/EmergencySosBanner";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 relative flex-col">
      <EmergencySosBanner />
      <div className="flex flex-1 min-h-0 relative">
        <Sidebar
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar
            user={user || undefined}
            onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
          />
          <main className="flex-1 p-3 sm:p-6 lg:p-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
