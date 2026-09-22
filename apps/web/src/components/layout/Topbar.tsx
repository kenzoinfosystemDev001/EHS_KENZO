"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { InstallAppButton } from "../pwa/InstallAppButton";

export interface TopbarProps {
  user?: {
    firstName: string;
    lastName: string;
    email: string;
    roles?: string[];
  };
  currentPlant?: string;
  onPlantChange?: (plantId: string) => void;
  onToggleMobileMenu?: () => void;
}

export function Topbar({
  user,
  currentPlant = "Plant NW — Manufacturing Complex",
  onToggleMobileMenu,
}: TopbarProps) {
  const router = useRouter();

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("kenzo_access_token");
      localStorage.removeItem("kenzo_user");
    }
    router.push("/login");
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shadow-xs sticky top-0 z-20">
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Mobile Hamburger Button */}
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition focus:outline-hidden"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-xs font-semibold uppercase tracking-wider text-slate-500">
            Active Site:
          </span>
          <div className="px-2.5 py-1 rounded-md border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50 flex items-center gap-2 max-w-[180px] sm:max-w-xs truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
            <span className="truncate">{currentPlant}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <InstallAppButton />

        <div className="flex items-center gap-2 sm:gap-3 pr-2 border-r border-slate-200">
          <div className="text-right hidden xs:block">
            <div className="text-xs font-semibold text-slate-900 truncate max-w-[120px] sm:max-w-none">
              {user ? `${user.firstName} ${user.lastName}` : "Vikram Sharma"}
            </div>
            <div className="text-[11px] text-slate-500">
              {user?.roles?.[0] || "HSE_MANAGER"}
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-800 border border-sky-200 flex items-center justify-center font-semibold text-xs shrink-0">
            {user ? `${user.firstName[0]}${user.lastName[0]}` : "VS"}
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="text-xs text-slate-600 hover:text-rose-600 font-medium px-2 py-1 rounded transition shrink-0"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
