"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import {
  Loader2,
  Plus,
  AlertCircle,
  FileText,
  AlertTriangle,
  MapPin,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";

interface PlantItem {
  id: string;
  code: string;
  name: string;
  departments?: { id: string; code: string; name: string }[];
}

interface NearMissRecord {
  id: string;
  referenceNumber: string;
  title: string;
  description: string;
  incidentType: string;
  severity: string;
  status: string;
  incidentDate: string;
  location?: string;
  plant?: { id: string; code: string; name: string };
  department?: { id: string; code: string; name: string };
  reportedBy?: { firstName: string; lastName: string; email: string };
}

const SEVERITIES = [
  { value: "LOW", label: "Low Potential (Minor Hazard)", color: "bg-slate-100 text-slate-800" },
  { value: "MEDIUM", label: "Medium Potential (Reportable)", color: "bg-amber-100 text-amber-800" },
  { value: "HIGH", label: "High Potential / HiPo (Near Fatality/Critical)", color: "bg-red-100 text-red-800 font-bold" },
];

export default function NearmissPage() {
  const [data, setData] = useState<NearMissRecord[]>([]);
  const [plants, setPlants] = useState<PlantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    severity: "MEDIUM",
    plantId: "",
    departmentId: "",
    incidentDate: new Date().toISOString().split("T")[0],
    incidentTime: new Date().toTimeString().slice(0, 5),
    location: "",
    description: "",
    immediateActions: "",
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

      // Fetch near-misses
      const res = await apiClient<NearMissRecord[]>("/api/v1/incidents?type=NEAR_MISS");
      if (res.success) {
        setData(res.data || []);
      } else {
        setError(res.error?.message || "Failed to load near-miss records");
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
    if (!formData.departmentId) {
      setFormError("Please select a Department");
      return;
    }
    if (!formData.description.trim()) {
      setFormError("Near miss description is required");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: formData.title || "Near Miss Event",
        description: formData.description,
        incidentType: "NEAR_MISS",
        severity: formData.severity,
        plantId: formData.plantId,
        departmentId: formData.departmentId,
        incidentDate: new Date(formData.incidentDate).toISOString(),
        incidentTime: formData.incidentTime || undefined,
        location: formData.location || undefined,
        immediateActions: formData.immediateActions || undefined,
      };

      const res = await apiClient<any>("/api/v1/incidents", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setIsModalOpen(false);
        setFormData({
          title: "",
          severity: "MEDIUM",
          plantId: plants[0]?.id || "",
          departmentId: plants[0]?.departments?.[0]?.id || "",
          incidentDate: new Date().toISOString().split("T")[0],
          incidentTime: new Date().toTimeString().slice(0, 5),
          location: "",
          description: "",
          immediateActions: "",
        });
        fetchInitialData();
      } else {
        setFormError(res.error?.message || "Failed to submit near miss");
      }
    } catch (err: any) {
      setFormError(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Near Miss Register
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Proactive hazard reporting, high potential (HiPo) tracking, and preventive interventions
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
            Report Near Miss
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Near Misses", val: data.length },
            {
              label: "High Potential (HiPo)",
              val: data.filter((d) => d.severity === "HIGH").length,
            },
            {
              label: "Under Investigation",
              val: data.filter((d) => d.status === "INVESTIGATING").length,
            },
            {
              label: "Closed / Mitigated",
              val: data.filter((d) => d.status === "CLOSED").length,
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
              <p className="font-medium text-slate-700">No near miss events recorded yet.</p>
              <p className="text-xs text-slate-400 mt-1">Encourage proactive reporting to eliminate hazards before injuries occur.</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
              >
                Report Near Miss
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold">Ref Number</th>
                    <th className="px-6 py-3.5 font-semibold">Description</th>
                    <th className="px-6 py-3.5 font-semibold">Severity</th>
                    <th className="px-6 py-3.5 font-semibold">Plant / Dept</th>
                    <th className="px-6 py-3.5 font-semibold">Date</th>
                    <th className="px-6 py-3.5 font-semibold">Reported By</th>
                    <th className="px-6 py-3.5 font-semibold">Status</th>
                    <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-4 font-mono font-medium text-xs text-sky-600">
                        <Link href={`/incidents/${row.id}`} className="hover:underline">
                          {row.referenceNumber || row.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <div className="font-medium text-slate-900 line-clamp-1">
                          {row.title || row.description}
                        </div>
                        {row.location && (
                          <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" /> {row.location}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            row.severity === "HIGH"
                              ? "bg-red-100 text-red-800 font-bold"
                              : row.severity === "MEDIUM"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {row.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        {row.plant?.name || "Facility"}
                        {row.department?.name && ` (${row.department.name})`}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                        {row.incidentDate ? new Date(row.incidentDate).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        {row.reportedBy ? `${row.reportedBy.firstName} ${row.reportedBy.lastName}` : "-"}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 text-xs rounded-md bg-slate-100 text-slate-700 font-medium">
                          {row.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/incidents/${row.id}`}
                          className="text-xs font-semibold text-sky-600 hover:text-sky-800"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* REPORT NEAR MISS MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col my-8 max-h-[90vh]">
              <div className="px-6 py-4 bg-emerald-800 text-white flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold">Report Near Miss</h2>
                  <p className="text-xs text-emerald-200">Prevent future incidents through hazard reporting</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-emerald-200 hover:text-white text-2xl leading-none"
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
                    Near Miss Title / Headline <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Forklift nearly hit pedestrian at bay 3"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                {/* Severity Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Potential Severity / HiPo <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  >
                    {SEVERITIES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Plant & Department Dropdowns */}
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
                      Department <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
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
                        <option value="">No departments available</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* Date, Time & Location */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Date Observed <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      value={formData.incidentDate}
                      onChange={(e) => setFormData({ ...formData, incidentDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Time
                    </label>
                    <input
                      type="time"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      value={formData.incidentTime}
                      onChange={(e) => setFormData({ ...formData, incidentTime: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Specific Location
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Loading dock 4 ramp"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>
                </div>

                {/* What Happened / Hazard Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    What happened? (Hazard / Unsafe Condition) <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Describe the condition or event that occurred, and what could have happened..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                {/* Immediate Actions */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Immediate Action Taken
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Warned operator, cleaned spill, placed barricade..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    value={formData.immediateActions}
                    onChange={(e) => setFormData({ ...formData, immediateActions: e.target.value })}
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
                    Submit Near Miss
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
