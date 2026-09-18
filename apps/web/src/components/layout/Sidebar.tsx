"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import {
  LayoutDashboard,
  BarChart2,
  CheckSquare,
  Inbox,
  ShieldAlert,
  ClipboardSignature,
  Lock,
  AlertTriangle,
  Target,
  Search,
  CheckCircle,
  Eye,
  ClipboardCheck,
  Scale,
  GraduationCap,
  HardHat,
  HeartPulse,
  Leaf,
  Siren,
  FileText,
  Users,
  Bell,
  X,
} from "lucide-react";

const NAV_GROUPS = [
  {
    title: "Executive & Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Reports & Analytics", href: "/reports", icon: BarChart2 },
      { label: "Unified Actions", href: "/actions", icon: CheckSquare },
      { label: "Inbox", href: "/inbox", icon: Inbox },
    ],
  },
  {
    title: "Risk & Operations",
    items: [
      {
        label: "HIRA Register",
        href: "/hira",
        icon: ShieldAlert,
        permission: "HIRA.READ",
      },
      {
        label: "Permit to Work",
        href: "/ptw",
        icon: ClipboardSignature,
        permission: "PTW.READ",
      },
      { label: "LOTO Board", href: "/loto", icon: Lock },
    ],
  },
  {
    title: "Incidents & Learning",
    items: [
      {
        label: "Incidents",
        href: "/incidents",
        icon: AlertTriangle,
        permission: "INCIDENT.READ",
      },
      { label: "Near Misses", href: "/near-miss", icon: Target },
      { label: "Root Cause Analysis", href: "/rca", icon: Search },
      {
        label: "CAPA",
        href: "/capa",
        icon: CheckCircle,
        permission: "CAPA.READ",
      },
    ],
  },
  {
    title: "Assurance & Compliance",
    items: [
      { label: "Safety Observations", href: "/observations", icon: Eye },
      { label: "Inspections", href: "/inspections", icon: ClipboardCheck },
      { label: "Audits", href: "/audits", icon: Search },
      { label: "Legal Register", href: "/compliance", icon: Scale },
    ],
  },
  {
    title: "People & Health",
    items: [
      { label: "Training Matrix", href: "/training", icon: GraduationCap },
      { label: "Contractors", href: "/contractors", icon: HardHat },
      {
        label: "Occupational Health",
        href: "/occupational-health",
        icon: HeartPulse,
      },
    ],
  },
  {
    title: "Sustainability & Safety",
    items: [
      { label: "Environment", href: "/environment", icon: Leaf },
      { label: "Emergency", href: "/emergency", icon: Siren },
      { label: "Documents", href: "/documents", icon: FileText },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Users", href: "/users", icon: Users, permission: "USER.READ" },
      { label: "Notifications", href: "/notifications", icon: Bell },
    ],
  },
];

export interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout, hasPermission } = useAuth();

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 bottom-0 left-0 z-50 w-64 flex-shrink-0 bg-slate-900 text-white flex flex-col h-screen custom-scrollbar transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="px-5 py-4 border-b border-slate-700/50 bg-slate-900/95 sticky top-0 z-10 backdrop-blur-sm flex items-center justify-between">
          <div>
            <div className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              <div className="w-6 h-6 bg-emerald-500 rounded-md flex items-center justify-center">
                <span className="text-white text-xs">K</span>
              </div>
              Kenzo EHS
            </div>
            <div className="text-xs text-slate-400 mt-0.5 pl-8">
              Enterprise Safety Platform
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label="Close Navigation"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-6">
          {NAV_GROUPS.map((group, idx) => {
            const visibleItems = group.items.filter(
              (item) => !item.permission || hasPermission(item.permission),
            );

            if (visibleItems.length === 0) return null;

            return (
              <div key={idx}>
                <h3 className="px-3 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  {group.title}
                </h3>
                <ul className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      pathname.startsWith(item.href + "/");
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                            isActive
                              ? "bg-sky-600 text-white font-medium shadow-md shadow-sky-900/20"
                              : "text-slate-300 hover:bg-slate-800 hover:text-white"
                          }`}
                        >
                          <Icon
                            className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`}
                          />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        {user && (
          <div className="px-4 py-4 border-t border-slate-700/50 bg-slate-900">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-semibold border border-slate-700">
                {user.firstName?.[0]}
                {user.lastName?.[0]}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs text-slate-300 font-medium truncate">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  {user.email}
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full px-3 py-2 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition border border-slate-700"
            >
              Sign Out
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
