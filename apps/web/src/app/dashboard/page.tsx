'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { apiClient } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';

interface DashboardStats {
  hira: {
    total: number;
    byStatus: Record<string, number>;
  };
  incidents: {
    total: number;
    byStatus: Record<string, number>;
  };
  capa: { openCount: number };
  ptw: { activeCount: number };
  workflow: { pendingTasks: number };
  notifications: { unreadCount: number };
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    actor: { firstName: string; lastName: string; email: string };
    timestamp: string;
  }>;
}

function KpiCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
      <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${color}`}>{label}</div>
      <div className="text-3xl font-bold text-slate-900">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient<DashboardStats>('/dashboard').then((res) => {
      if (res.success) setStats(res.data);
      setLoading(false);
    });
  }, []);

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Welcome back, {user?.firstName ?? '...'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {loading ? (
        <div className="text-slate-400 text-sm py-12 text-center">Loading dashboard data...</div>
      ) : !stats ? (
        <div className="text-slate-400 text-sm py-12 text-center">Could not load dashboard data</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <KpiCard label="HIRA Studies" value={stats.hira.total} sub="All statuses" color="text-sky-600" />
            <KpiCard label="Active HIRA" value={stats.hira.byStatus['ACTIVE'] ?? 0} sub="Operational" color="text-teal-600" />
            <KpiCard label="Incidents" value={stats.incidents.total} sub="All statuses" color="text-orange-600" />
            <KpiCard label="Open CAPAs" value={stats.capa.openCount} sub="Awaiting action" color="text-amber-600" />
            <KpiCard label="Active Permits" value={stats.ptw.activeCount} sub="PTW live" color="text-purple-600" />
            <KpiCard label="My Tasks" value={stats.workflow.pendingTasks} sub="Pending" color="text-red-600" />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs">
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-800">Recent Activity</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {stats.recentActivity.length === 0 ? (
                <div className="px-5 py-8 text-center text-slate-400 text-sm">No recent activity</div>
              ) : (
                stats.recentActivity.map((log) => (
                  <div key={log.id} className="px-5 py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-800 font-mono">{log.action}</span>
                      <span className="text-slate-500 ml-2">
                        on {log.entityType}
                      </span>
                    </div>
                    <div className="text-slate-400">
                      {log.actor.firstName} {log.actor.lastName} ·{' '}
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
