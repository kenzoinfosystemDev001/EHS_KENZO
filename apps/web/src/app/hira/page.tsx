'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { apiClient } from '../../lib/api';

interface HiraStudyItem {
  id: string;
  referenceNumber: string;
  title: string;
  status: string;
  revision: number;
  plant: {
    code: string;
    name: string;
  };
  department: {
    name: string;
  };
  createdAt: string;
}

export default function HiraPage() {
  const [studies, setStudies] = useState<HiraStudyItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStudies() {
      setLoading(true);
      try {
        const res = await apiClient<HiraStudyItem[]>('/hira');
        if (res.success && Array.isArray(res.data)) {
          setStudies(res.data);
        }
      } catch (err) {
        console.error('Failed to load HIRA studies:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStudies();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'IN_PROGRESS':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'TEAM_REVIEW':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'APPROVAL_PENDING':
        return 'bg-purple-50 text-purple-800 border-purple-300';
      case 'APPROVED':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'ACTIVE':
        return 'bg-teal-50 text-teal-800 border-teal-300';
      case 'SUPERSEDED':
        return 'bg-zinc-100 text-zinc-600 border-zinc-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Hazard Identification &amp; Risk Assessment (HIRA)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Authoritative register of plant risk assessments, control hierarchies, and compliance approvals.
          </p>
        </div>

        <button
          onClick={() => alert('To create a new study, use the API or modal form.')}
          className="inline-flex items-center px-4 py-2 rounded-lg bg-sky-600 text-white font-medium text-xs hover:bg-sky-500 shadow-sm transition"
        >
          + New Risk Assessment
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="text-xs font-semibold text-slate-700">
            Authoritative Register ({studies.length} Studies Logged)
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-6 py-3">Reference ID</th>
                <th className="px-6 py-3">Study Title</th>
                <th className="px-6 py-3">Site / Plant</th>
                <th className="px-6 py-3">Department</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Revision</th>
                <th className="px-6 py-3">Created</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    Querying authoritative HIRA register from PostgreSQL...
                  </td>
                </tr>
              ) : studies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    No HIRA studies registered for the active site scope yet.
                  </td>
                </tr>
              ) : (
                studies.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4 font-mono font-semibold text-slate-900">
                      {s.referenceNumber}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900 max-w-xs truncate">
                      {s.title}
                    </td>
                    <td className="px-6 py-4">
                      {s.plant?.name || s.plant?.code}
                    </td>
                    <td className="px-6 py-4">
                      {s.department?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadge(s.status)}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono">
                      v{s.revision}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <a
                        href={`/hira/${s.id}`}
                        className="inline-flex items-center px-2.5 py-1 rounded border border-slate-300 text-slate-700 font-medium hover:bg-slate-100 transition text-[11px]"
                      >
                        Inspect Study
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
