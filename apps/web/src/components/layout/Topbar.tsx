'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export interface TopbarProps {
  user?: {
    firstName: string;
    lastName: string;
    email: string;
    roles?: string[];
  };
  currentPlant?: string;
  onPlantChange?: (plantId: string) => void;
}

export function Topbar({ user, currentPlant = 'Plant NW — Manufacturing Complex' }: TopbarProps) {
  const router = useRouter();

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('kenzo_access_token');
      localStorage.removeItem('kenzo_user');
    }
    router.push('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-xs sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Site:</span>
          <div className="px-3 py-1 rounded-md border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{currentPlant}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 pr-2 border-r border-slate-200">
          <div className="text-right">
            <div className="text-xs font-semibold text-slate-900">
              {user ? `${user.firstName} ${user.lastName}` : 'Vikram Sharma'}
            </div>
            <div className="text-[11px] text-slate-500">
              {user?.roles?.[0] || 'HSE_MANAGER'}
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-800 border border-sky-200 flex items-center justify-center font-semibold text-xs">
            {user ? `${user.firstName[0]}${user.lastName[0]}` : 'VS'}
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="text-xs text-slate-600 hover:text-rose-600 font-medium px-2 py-1 rounded transition"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
