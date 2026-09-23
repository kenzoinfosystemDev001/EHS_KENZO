"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import {
  Loader2,
  Plus,
  AlertCircle,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";

interface PlantItem {
  id: string;
  code: string;
  name: string;
  departments?: { id: string; code: string; name: string }[];
}

interface CapaRecord {
  id: string;
  referenceNumber: string;
  title: string;
  description: string;
  capaType: "CORRECTIVE" | "PREVENTIVE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: string;
  targetDate?: string;
  plant?: { id: string; code: string; name: string };
  department?: { id: string; code: string; name: string };
  assignedTo?: { firstName: string; lastName: string; email: string };
}

const CAPA_TYPES = [
  { value: "CORRECTIVE", label: "Corrective Action (Fix Existing Hazard)" },
  { value: "PREVENTIVE", label: "Preventive Action (Prevent Potential Failure)" },
];

const PRIORITIES = [
  { value: "LOW", label: "Low", color: "bg-slate-100 text-slate-800" },
  { value: "MEDIUM", label: "Medium", color: "bg-blue-100 text-blue-800" },
  { value: "HIGH", label: "High", color: "bg-amber-100 text-amber-800" },
  { value: "CRITICAL", label: "Critical", color: "bg-red-100 text-red-800 font-bold" },
];

export default function CapaPage() {
  const [data, setData] = useState<CapaRecord[]>([]);
  const [plants, setPlants] = useState<PlantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    capaType: "CORRECTIVE" as "CORRECTIVE" | "PREVENTIVE",
    priority: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    plantId: "",
    departmentId: "",
    targetDate: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().split("T")[0],
    description: "",
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch plants
      const plantsRes = await apiClient<PlantItem[]>("/api/v1/plants");
      if (plantsRes.success && plantsRes.data && plantsRes.data.length > 0) {
        setPlants(plantsRes.data);
        const defaultPlant = plantsRes.data[0];
        setFormData((prev) => ({
          ...prev,
          plantId: prev.plantId || defaultPlant.id,
          departmentId:
            prev.departmentId ||
            (defaultPlant.departments && defaultPlant.departments.length > 0
              ? defaultPlant.departments[0].id
              : ""),
        }));
      }

      // Fetch CAPAs
      const res = await apiClient<CapaRecord[]>("/api/v1/capa");
      if (res.success) {
        setData(res.data || []);
      } else {
        setError(res.error?.message || "Failed to load CAPA records");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const selectedPlant = plants.find((p) => p.id === formData.plantId) || plants[0];
  const availableDepartments = selectedPlant?.departments || [];

  const handlePlantChange = (plantId: string) => {
    const plant = plants.find((p) => p.id === plantId);
    const firstDeptId = plant?.departments && plant.departments.length > 0 ? plant.departments[0].id : "";
    setFormData((prev) => ({
      ...prev,
      plantId,
      departmentId: firstDeptId,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.plantId) {
      setFormError("Please select a Plant");
      return;
    }
    if (!formData.title.trim()) {
      setFormError("Title is required");
      return;
    }
    if (!formData.description.trim()) {
      setFormError("Description is required");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: formData.title,
        description: formData.description,
        capaType: formData.capaType,
        priority: formData.priority,
        plantId: formData.plantId,
        departmentId: formData.departmentId || undefined,
        targetDate: formData.targetDate ? new Date(formData.targetDate).toISOString() : undefined,
      };

      const res = await apiClient<any>("/api/v1/capa", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setIsModalOpen(false);
        setFormData({
          title: "",
          capaType: "CORRECTIVE",
          priority: "MEDIUM",
          plantId: plants[0]?.id || "",
          departmentId: plants[0]?.departments?.[0]?.id || "",
          targetDate: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().split("T")[0],
          description: "",
        });
        fetchInitialData();
      } else {
        setFormError(res.error?.message || "Failed to create CAPA");
      }
    } catch (err: any) {
      setFormError(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityBadge = (p: string) => {
    const item = PRIORITIES.find((item) => item.value === p);
    return (
      <span
        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
          item?.color || "bg-slate-100 text-slate-800"
        }`}
      >
        {item?.label || p}
      </span>
    );
  };

  return (
    <AppShell>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              CAPA Register
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Corrective and Preventive Actions tracking, assignment, and closure verification
            </p>
          </div>
          <button
            onClick={() => {
              setFormError(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-medium shadow transition"
          >
            <Plus className="w-4 h-4" />
            New CAPA
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total CAPAs", val: data.length },
            {
              label: "Critical Priority",
              val: data.filter((d) => d.priority === "CRITICAL").length,
            },
            {
              label: "Corrective Actions",
              val: data.filter((d) => d.capaType === "CORRECTIVE").length,
            },
            {
              label: "Closed & Verified",
              val: data.filter((d) => d.status === "CLOSED" || d.status === "VERIFIED").length,
            },
          ].map((kpi, idx) => (
            <div
              key={idx}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"
            >
              <div className="text-xs sm:text-sm font-medium text-slate-500 mb-1">{kpi.label}</div>
              <div className="text-2xl font-bold text-slate-800">
                {loading ? "-" : kpi.val}
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center h-64 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
          ) : error ? (
            <div className="flex flex-col justify-center items-center h-64 text-red-500 p-6 text-center">
              <AlertCircle className="w-12 h-12 mb-3" />
              <p className="font-semibold">{error}</p>
              <button
                onClick={fetchInitialData}
                className="mt-4 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium"
              >
                Retry
              </button>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-64 text-slate-500 p-6 text-center">
              <FileText className="w-12 h-12 mb-3 text-slate-300" />
              <p className="font-medium text-slate-700">No CAPA records found.</p>
              <p className="text-xs text-slate-400 mt-1">Create corrective and preventive actions to track risk mitigations.</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
              >
                Create New CAPA
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold">Ref Number</th>
                    <th className="px-6 py-3.5 font-semibold">Title</th>
                    <th className="px-6 py-3.5 font-semibold">Type</th>
                    <th className="px-6 py-3.5 font-semibold">Priority</th>
                    <th className="px-6 py-3.5 font-semibold">Plant / Dept</th>
                    <th className="px-6 py-3.5 font-semibold">Target Date</th>
                    <th className="px-6 py-3.5 font-semibold">Status</th>
                    <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-4 font-mono font-medium text-xs text-sky-600">
                        <Link href={`/capa/${row.id}`} className="hover:underline">
                          {row.referenceNumber || row.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <div className="font-medium text-slate-900 line-clamp-1">{row.title}</div>
                        <div className="text-xs text-slate-400 line-clamp-1 mt-0.5">{row.description}</div>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold">
                        <span className={row.capaType === "CORRECTIVE" ? "text-amber-700 bg-amber-50 px-2 py-0.5 rounded" : "text-sky-700 bg-sky-50 px-2 py-0.5 rounded"}>
                          {row.capaType}
                        </span>
                      </td>
                      <td className="px-6 py-4">{getPriorityBadge(row.priority)}</td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        {row.plant?.name || "Facility"}
                        {row.department?.name && ` (${row.department.name})`}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                        {row.targetDate ? new Date(row.targetDate).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 text-xs rounded-md bg-slate-100 text-slate-700 font-medium">
                          {row.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/capa/${row.id}`}
                          className="text-xs font-semibold text-sky-600 hover:text-sky-800"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* NEW CAPA MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col my-8 max-h-[90vh]">
              <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold">New Corrective / Preventive Action</h2>
                  <p className="text-xs text-slate-300">Audited action item creation</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white text-2xl leading-none"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    CAPA Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Install bund wall around chemical storage tanks"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                {/* Type & Priority */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Action Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                      value={formData.capaType}
                      onChange={(e) => setFormData({ ...formData, capaType: e.target.value as any })}
                    >
                      {CAPA_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Priority Rating <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Plant & Department */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Plant / Facility <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                      value={formData.plantId}
                      onChange={(e) => handlePlantChange(e.target.value)}
                    >
                      {plants.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Department
                    </label>
                    <select
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                      value={formData.departmentId}
                      onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    >
                      {availableDepartments.length > 0 ? (
                        availableDepartments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.code})
                          </option>
                        ))
                      ) : (
                        <option value="">General Facility</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* Target Completion Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Target Completion Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    value={formData.targetDate}
                    onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Action Plan & Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Specify the detailed corrective or preventive action plan, root cause addressed, and verification criteria..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                {/* Modal Buttons */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 text-sm font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 shadow"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Create CAPA
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
