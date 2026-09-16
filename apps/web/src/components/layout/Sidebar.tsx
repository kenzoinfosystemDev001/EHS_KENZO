'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: '🏠',
  },
  {
    label: 'HIRA',
    href: '/hira',
    icon: '⚠️',
    permission: 'HIRA.READ',
  },
  {
    label: 'Incidents',
    href: '/incidents',
    icon: '🚨',
    permission: 'INCIDENT.READ',
  },
  {
    label: 'CAPA',
    href: '/capa',
    icon: '✅',
    permission: 'CAPA.READ',
  },
  {
    label: 'Permit to Work',
    href: '/ptw',
    icon: '📋',
    permission: 'PTW.READ',
  },
  {
    label: 'Inbox',
    href: '/inbox',
    icon: '📬',
  },
  {
    label: 'Notifications',
    href: '/notifications',
    icon: '🔔',
  },
  {
    label: 'Users',
    href: '/users',
    icon: '👥',
    permission: 'USER.READ',
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, hasPermission } = useAuth();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.permission || hasPermission(item.permission),
  );

  return (
    <aside className="w-60 flex-shrink-0 bg-slate-900 text-white flex flex-col h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-slate-700">
        <div className="text-sm font-bold tracking-tight">Kenzo EHS</div>
        <div className="text-xs text-slate-400 mt-0.5">Enterprise Safety Platform</div>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-0.5">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                    isActive
                      ? 'bg-sky-600 text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="text-base leading-none">{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {user && (
        <div className="px-4 py-4 border-t border-slate-700">
          <div className="text-xs text-slate-400 mb-1">
            {user.firstName} {user.lastName}
          </div>
          <div className="text-xs text-slate-500 mb-3 truncate">{user.email}</div>
          <button
            onClick={logout}
            className="w-full px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition"
          >
            Sign Out
          </button>
        </div>
      )}
    </aside>
  );
}
