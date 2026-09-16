"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { apiClient } from "../../lib/api";

interface AppUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | undefined>(undefined);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await apiClient<AppUser>("/auth/me");
        if (res.success && res.data) {
          setUser(res.data);
        }
      } catch {
        // Fallback default for dev preview
      }
    }
    loadUser();
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar user={user} />
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
