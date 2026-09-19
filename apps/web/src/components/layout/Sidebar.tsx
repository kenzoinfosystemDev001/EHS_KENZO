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

// ─── Role constants ───────────────────────────────────────────────────────────
const ALL_ROLES = [
  "WORKER", "SUPERVISOR", "DEPARTMENT_HEAD", "CONTRACTOR_COORDINATOR",
  "CONTRACTOR_WORKMAN", "HSE_MANAGER", "OCCUPATIONAL_HEALTH_OFFICER",
  "CORPORATE_HSE", "ADMIN", "SYSTEM_ADMIN", "PLANT_HEAD", "MAINTENANCE_HEAD",
  "SAFETY_OFFICER", "TRAINER", "LD_MANAGER", "ENVIRONMENT_MANAGER",
  "PERMIT_ISSUER", "EMERGENCY_COORDINATOR",
];

const ADMIN_ROLES = ["ADMIN", "SYSTEM_ADMIN"];

const HSE_AND_ABOVE = [
  "HSE_MANAGER", "OCCUPATIONAL_HEALTH_OFFICER", "CORPORATE_HSE",
  "SAFETY_OFFICER", "PLANT_HEAD", "ADMIN", "SYSTEM_ADMIN",
];

const MANAGER_AND_ABOVE = [
  "DEPARTMENT_HEAD", "CONTRACTOR_COORDINATOR", "MAINTENANCE_HEAD",
  "HSE_MANAGER", "OCCUPATIONAL_HEALTH_OFFICER", "CORPORATE_HSE",
  "SAFETY_OFFICER", "PLANT_HEAD", "ADMIN", "SYSTEM_ADMIN",
];

const SUPERVISOR_AND_ABOVE = [
  "SUPERVISOR", "DEPARTMENT_HEAD", "CONTRACTOR_COORDINATOR",
  "MAINTENANCE_HEAD", "HSE_MANAGER", "OCCUPATIONAL_HEALTH_OFFICER",
  "CORPORATE_HSE", "SAFETY_OFFICER", "PLANT_HEAD", "ADMIN", "SYSTEM_ADMIN",
];

// ─── Nav definition ──────────────────────────────────────────────────────────
interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  allowedRoles: string[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, allowedRoles: ALL_ROLES },
      { label: "Reports & Analytics", href: "/reports", icon: BarChart2, allowedRoles: MANAGER_AND_ABOVE },
      { label: "Unified Actions", href: "/actions", icon: CheckSquare, allowedRoles: SUPERVISOR_AND_ABOVE },
      { label: "Inbox", href: "/inbox", icon: Inbox, allowedRoles: ALL_ROLES },
    ],
  },
  {
    title: "Risk & Operations",
    items: [
      { label: "HIRA Register", href: "/hira", icon: ShieldAlert, allowedRoles: HSE_AND_ABOVE },
      {
        label: "Permit to Work", href: "/ptw", icon: ClipboardSignature,
        allowedRoles: ["PERMIT_ISSUER", "SUPERVISOR", ...MANAGER_AND_ABOVE],
      },
      { label: "LOTO Board", href: "/loto", icon: Lock, allowedRoles: ["MAINTENANCE_HEAD", ...HSE_AND_ABOVE] },
    ],
  },
  {
    title: "Incidents & Learning",
    items: [
      { label: "Incidents", href: "/incidents", icon: AlertTriangle, allowedRoles: SUPERVISOR_AND_ABOVE },
      { label: "Near Misses", href: "/near-miss", icon: Target, allowedRoles: SUPERVISOR_AND_ABOVE },
      { label: "Root Cause Analysis", href: "/rca", icon: Search, allowedRoles: MANAGER_AND_ABOVE },
      { label: "CAPA", href: "/capa", icon: CheckCircle, allowedRoles: MANAGER_AND_ABOVE },
    ],
  },
  {
    title: "Assurance & Compliance",
    items: [
      { label: "Safety Observations", href: "/observations", icon: Eye, allowedRoles: ALL_ROLES },
      { label: "Inspections", href: "/inspections", icon: ClipboardCheck, allowedRoles: SUPERVISOR_AND_ABOVE },
      { label: "Audits", href: "/audits", icon: Search, allowedRoles: HSE_AND_ABOVE },
      { label: "Legal Register", href: "/compliance", icon: Scale, allowedRoles: HSE_AND_ABOVE },
    ],
  },
  {
    title: "People & Health",
    items: [
      {
        label: "Training Matrix", href: "/training", icon: GraduationCap,
        allowedRoles: ["TRAINER", "LD_MANAGER", ...MANAGER_AND_ABOVE],
      },
      {
        label: "Contractors", href: "/contractors", icon: HardHat,
        allowedRoles: ["CONTRACTOR_COORDINATOR", ...HSE_AND_ABOVE],
      },
      {
        label: "Occupational Health", href: "/occupational-health", icon: HeartPulse,
        allowedRoles: ["OCCUPATIONAL_HEALTH_OFFICER", "PLANT_HEAD", "CORPORATE_HSE", ...ADMIN_ROLES],
      },
    ],
  },
  {
    title: "Sustainability & Safety",
    items: [
      {
        label: "Environment", href: "/environment", icon: Leaf,
        allowedRoles: ["ENVIRONMENT_MANAGER", "HSE_MANAGER", "PLANT_HEAD", "CORPORATE_HSE", ...ADMIN_ROLES],
      },
      {
        label: "Emergency", href: "/emergency", icon: Siren,
        allowedRoles: ["EMERGENCY_COORDINATOR", ...HSE_AND_ABOVE],
      },
      { label: "Documents", href: "/documents", icon: FileText, allowedRoles: ALL_ROLES },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Users", href: "/users", icon: Users, allowedRoles: ADMIN_ROLES },
      { label: "Notifications", href: "/notifications", icon: Bell, allowedRoles: ALL_ROLES },
    ],
  },
];

// ─── Role badge colours ───────────────────────────────────────────────────────
const ROLE_BADGE: Record<string, { bg: string; label: string }> = {
  WORKER: { bg: "bg-slate-600", label: "Worker" },
  CONTRACTOR_WORKMAN: { bg: "bg-slate-600", label: "Contractor" },
  SUPERVISOR: { bg: "bg-blue-700", label: "Supervisor" },
  DEPARTMENT_HEAD: { bg: "bg-indigo-700", label: "Dept. Head" },
  CONTRACTOR_COORDINATOR: { bg: "bg-violet-700", label: "Contractor Coord." },
  MAINTENANCE_HEAD: { bg: "bg-orange-700", label: "Maintenance Head" },
  HSE_MANAGER: { bg: "bg-emerald-700", label: "HSE Manager" },
  SAFETY_OFFICER: { bg: "bg-teal-700", label: "Safety Officer" },
  OCCUPATIONAL_HEALTH_OFFICER: { bg: "bg-cyan-700", label: "Health Officer" },
  CORPORATE_HSE: { bg: "bg-sky-700", label: "Corporate HSE" },
  PLANT_HEAD: { bg: "bg-amber-700", label: "Plant Head" },
  TRAINER: { bg: "bg-pink-700", label: "Trainer" },
  LD_MANAGER: { bg: "bg-rose-700", label: "L&D Manager" },
  ENVIRONMENT_MANAGER: { bg: "bg-green-700", label: "Env. Manager" },
  PERMIT_ISSUER: { bg: "bg-yellow-700", label: "Permit Issuer" },
  EMERGENCY_COORDINATOR: { bg: "bg-red-700", label: "Emergency Coord." },
  ADMIN: { bg: "bg-purple-700", label: "Admin" },
  SYSTEM_ADMIN: { bg: "bg-purple-900", label: "Sys Admin" },
};

const ROLE_PRIORITY = [
  "SYSTEM_ADMIN", "ADMIN", "CORPORATE_HSE", "PLANT_HEAD", "HSE_MANAGER",
  "DEPARTMENT_HEAD", "CONTRACTOR_COORDINATOR", "MAINTENANCE_HEAD",
  "SAFETY_OFFICER", "OCCUPATIONAL_HEALTH_OFFICER", "ENVIRONMENT_MANAGER",
  "EMERGENCY_COORDINATOR", "SUPERVISOR", "PERMIT_ISSUER",
  "TRAINER", "LD_MANAGER", "CONTRACTOR_WORKMAN", "WORKER",
];

export interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const userRoles: string[] = user?.roles ?? [];

  function canSee(item: NavItem): boolean {
    if (userRoles.includes("ADMIN") || userRoles.includes("SYSTEM_ADMIN")) return true;
    return item.allowedRoles.some((r) => userRoles.includes(r));
  }

  const primaryRole = ROLE_PRIORITY.find((r) => userRoles.includes(r));
  const badge = primaryRole ? ROLE_BADGE[primaryRole] : null;

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
            const visibleItems = group.items.filter(canSee);
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
            <div className="flex items-center gap-3 mb-3">
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
            {badge && (
              <div className="mb-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold text-white ${badge.bg}`}>
                  {badge.label}
                </span>
              </div>
            )}
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
