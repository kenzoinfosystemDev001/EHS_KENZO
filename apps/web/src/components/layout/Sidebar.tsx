'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface NavItem {
  label: string;
  href: string;
  badge?: number | string;
  permission?: string;
  category?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', href: '/dashboard' },
  { label: 'Unified Inbox', href: '/inbox', badge: 'Active' },
  { label: 'Risk Assessment (HIRA)', href: '/hira', category: 'Risk Management' },
  { label: 'Incident & Spill Log', href: '/incidents', category: 'Core Safety' },
  { label: 'Corrective Actions (CAPA)', href: '/capa', category: 'Core Safety' },
  { label: 'Safety Observations', href: '/observations', category: 'Core Safety' },
  { label: 'Permit to Work (PTW)', href: '/ptw', category: 'Field Control' },
  { label: 'Audits & Inspections', href: '/audits', category: 'Field Control' },
  { label: 'Master Data & Plants', href: '/admin/plants', category: 'Administration' },
  { label: 'Audit Trail Explorer', href: '/admin/audit', category: 'Administration' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 min-h-screen flex flex-col border-r border-slate-800">
      <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
        <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center font-bold text-white text-sm">
          KZ
        </div>
        <div>
          <div className="font-bold text-sm text-white tracking-wide">KENZO EHS</div>
          <div className="text-[10px] text-slate-400">Enterprise Safety Cloud</div>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                isActive
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>{item.label}</span>
              {item.badge && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-700 text-sky-300 font-semibold">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="text-[11px] text-slate-400">System Source of Record</div>
        <div className="text-xs font-semibold text-emerald-400 mt-0.5 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          PostgreSQL Connected
        </div>
      </div>
    </aside>
  );
}
