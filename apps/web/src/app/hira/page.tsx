"use client";

import React, { useEffect, useState, useRef } from "react";
import { AppShell } from "../../components/layout/AppShell";
import { apiClient } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { X, Loader2, Plus } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface HiraStudyItem {
  id: string;
  referenceNumber: string;
  title: string;
  status: string;
  revision: number;
  plant: { code: string; name: string };
  department: { name: string };
  createdAt: string;
}

interface CreateStudyPayload {
  title: string;
  scope: string;
  hazardCategory: string;
  assessmentTeam: string;
  departmentName: string;
}

// ─── Role constants for HIRA ───────────────────────────────────────────────────
const CAN_CREATE_HIRA = [
  "HSE_MANAGER", "OCCUPATIONAL_HEALTH_OFFICER", "CORPORATE_HSE",
  "SAFETY_OFFICER", "PLANT_HEAD", "ADMIN", "SYSTEM_ADMIN",
];

const HAZARD_CATEGORIES = [
  "Mechanical", "Electrical", "Chemical", "Biological", "Ergonomic",
  "Psychosocial", "Physical", "Environmental", "Fire & Explosion",
  "Height & Fall", "Confined Space", "Radiation", "Other",
];

// ─── Status badge helper ───────────────────────────────────────────────────────
function getStatusBadge(status: string): string {
  switch (status) {
    case "DRAFT":         return "bg-slate-100 text-slate-700 border-slate-300";
    case "IN_PROGRESS":   return "bg-blue-50 text-blue-700 border-blue-200";
    case "TEAM_REVIEW":   return "bg-amber-50 text-amber-800 border-amber-300";
    case "APPROVAL_PENDING": return "bg-purple-50 text-purple-800 border-purple-300";
    case "APPROVED":      return "bg-emerald-50 text-emerald-800 border-emerald-300";
    case "ACTIVE":        return "bg-teal-50 text-teal-800 border-teal-300";
    case "SUPERSEDED":    return "bg-zinc-100 text-zinc-600 border-zinc-200";
    default:              return "bg-slate-50 text-slate-600 border-slate-200";
  }
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function HiraPage() {
  const { user } = useAuth();
  const [studies, setStudies] = useState<HiraStudyItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateStudyPayload>({
    title: "",
    scope: "",
    hazardCategory: "",
    assessmentTeam: "",
    departmentName: "",
  });
  const firstInputRef = useRef<HTMLInputElement>(null);

  const userRoles: string[] = user?.roles ?? [];
  const canCreate = userRoles.some((r) => CAN_CREATE_HIRA.includes(r));

  async function loadStudies() {
    setLoading(true);
    try {
      const res = await apiClient<HiraStudyItem[]>("/hira");
      if (res.success && Array.isArray(res.data)) {
        setStudies(res.data);
      }
    } catch (err) {
      console.error("Failed to load HIRA studies:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStudies();
  }, []);

  // Focus first input when modal opens
  useEffect(() => {
    if (isCreateOpen) {
      setTimeout(() => firstInputRef.current?.focus(), 80);
    }
  }, [isCreateOpen]);

  function openModal() {
    setForm({ title: "", scope: "", hazardCategory: "", assessmentTeam: "", departmentName: "" });
    setSubmitError(null);
    setIsCreateOpen(true);
  }

  function closeModal() {
    setIsCreateOpen(false);
    setSubmitError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setSubmitError("Study title is required.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await apiClient<HiraStudyItem>("/hira/studies", {
        method: "POST",
        body: JSON.stringify({
          title: form.title.trim(),
          scope: form.scope.trim() || undefined,
          hazardCategory: form.hazardCategory || undefined,
          assessmentTeam: form.assessmentTeam.trim() || undefined,
          departmentName: form.departmentName.trim() || undefined,
        }),
      });
      if (res.success) {
        closeModal();
        await loadStudies();
      } else {
        setSubmitError((res as any).message || "Failed to create study. Please try again.");
      }
    } catch (err: any) {
      setSubmitError(err?.message || "Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleField(field: keyof CreateStudyPayload, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

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

        {canCreate && (
          <button
            onClick={openModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 text-white font-medium text-xs hover:bg-sky-500 shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            New Risk Assessment
          </button>
        )}
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
                    <td className="px-6 py-4 font-mono font-semibold text-slate-900">{s.referenceNumber}</td>
                    <td className="px-6 py-4 font-medium text-slate-900 max-w-xs truncate">{s.title}</td>
                    <td className="px-6 py-4">{s.plant?.name || s.plant?.code}</td>
                    <td className="px-6 py-4">{s.department?.name || "N/A"}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadge(s.status)}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono">v{s.revision}</td>
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

      {/* ── New Risk Assessment Modal ──────────────────────────────────────── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Dialog */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900">New Risk Assessment</h2>
                <p className="text-xs text-slate-500 mt-0.5">Create a new HIRA study entry in the register</p>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto">
              {/* Study Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Study Title <span className="text-red-500">*</span>
                </label>
                <input
                  ref={firstInputRef}
                  type="text"
                  value={form.title}
                  onChange={(e) => handleField("title", e.target.value)}
                  placeholder="e.g. Mechanical Press Area Risk Assessment"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                <input
                  type="text"
                  value={form.departmentName}
                  onChange={(e) => handleField("departmentName", e.target.value)}
                  placeholder="e.g. Production, Maintenance, Electrical"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>

              {/* Hazard Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Hazard Category</label>
                <select
                  value={form.hazardCategory}
                  onChange={(e) => handleField("hazardCategory", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white"
                >
                  <option value="">Select a category…</option>
                  {HAZARD_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Assessment Team */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assessment Team Members</label>
                <input
                  type="text"
                  value={form.assessmentTeam}
                  onChange={(e) => handleField("assessmentTeam", e.target.value)}
                  placeholder="e.g. John Smith, Jane Doe, HSE Officer"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>

              {/* Scope */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Scope / Description</label>
                <textarea
                  value={form.scope}
                  onChange={(e) => handleField("scope", e.target.value)}
                  placeholder="Describe the work area, activities, or processes being assessed…"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Error */}
              {submitError && (
                <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  {submitError}
                </div>
              )}
            </form>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3 bg-slate-50/50">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white text-xs font-medium hover:bg-sky-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {submitting ? "Creating…" : "Create Study"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
