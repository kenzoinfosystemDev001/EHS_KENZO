"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import {
  Loader2,
  Plus,
  AlertCircle,
  FileText,
  AlertTriangle,
  Flame,
  ShieldAlert,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";

interface PlantItem {
  id: string;
  code: string;
  name: string;
  departments?: { id: string; code: string; name: string }[];
}

interface IncidentRecord {
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

const INCIDENT_TYPES = [
  { value: "NEAR_MISS", label: "Near Miss" },
  { value: "FIRST_AID", label: "First Aid Case" },
  { value: "MEDICAL_TREATMENT", label: "Medical Treatment" },
  { value: "LOST_TIME_INJURY", label: "Lost Time Injury (LTI)" },
  { value: "FATALITY", label: "Fatality" },
  { value: "PROPERTY_DAMAGE", label: "Property Damage" },
  { value: "ENVIRONMENTAL_RELEASE", label: "Environmental Release" },
  { value: "FIRE", label: "Fire" },
  { value: "EXPLOSION", label: "Explosion" },
  { value: "SPILL", label: "Chemical / Material Spill" },
];

const SEVERITIES = [
  { value: "LOW", label: "Low", color: "bg-slate-100 text-slate-800" },
  { value: "MEDIUM", label: "Medium", color: "bg-blue-100 text-blue-800" },
  { value: "HIGH", label: "High", color: "bg-amber-100 text-amber-800" },
  { value: "CRITICAL", label: "Critical", color: "bg-orange-100 text-orange-800" },
  { value: "CATASTROPHIC", label: "Catastrophic", color: "bg-red-100 text-red-800 font-bold" },
];

const SOS_TYPES = [
  "FIRE_OUTBREAK",
  "CHEMICAL_SPILL_HAZARD",
  "GAS_LEAK",
  "EXPLOSION",
  "STRUCTURAL_COLLAPSE",
  "MASS_CASUALTY_MEDICAL",
  "GENERAL_EVACUATION",
];

export default function IncidentsPage() {
  const [data, setData] = useState<IncidentRecord[]>([]);
  const [plants, setPlants] = useState<PlantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSosModalOpen, setIsSosModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sosSubmitting, setSosSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Incident Form State
  const [formData, setFormData] = useState({
    title: "",
    incidentType: "FIRST_AID",
    severity: "MEDIUM",
    plantId: "",
    departmentId: "",
    incidentDate: new Date().toISOString().split("T")[0],
    incidentTime: new Date().toTimeString().slice(0, 5),
    location: "",
    description: "",
    immediateActions: "",
    isStatutoryRequired: false,
  });

  // SOS Form State
  const [sosData, setSosData] = useState({
    emergencyType: "FIRE_OUTBREAK",
    plantId: "",
    location: "",
    message: "CRITICAL EMERGENCY IN PROGRESS: ALL PERSONNEL EVACUATE IMMEDIATELY TO DESIGNATED ASSEMBLY AREA",
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
        setSosData((prev) => ({
          ...prev,
          plantId: prev.plantId || defaultPlant.id,
        }));
      }

      // Fetch incidents
      const incRes = await apiClient<IncidentRecord[]>("/api/v1/incidents");
      if (incRes.success) {
        setData(incRes.data || []);
      } else {
        setError(incRes.error?.message || "Failed to load incidents");
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

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.plantId) {
      setFormError("Please select a valid Plant");
      return;
    }
    if (!formData.departmentId) {
      setFormError("Please select a Department");
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
        incidentType: formData.incidentType,
        severity: formData.severity,
        plantId: formData.plantId,
        departmentId: formData.departmentId,
        incidentDate: new Date(formData.incidentDate).toISOString(),
        incidentTime: formData.incidentTime || undefined,
        location: formData.location || undefined,
        immediateActions: formData.immediateActions || undefined,
        isStatutoryRequired: formData.isStatutoryRequired,
      };

      const res = await apiClient<any>("/api/v1/incidents", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setIsReportModalOpen(false);
        setFormData({
          title: "",
          incidentType: "FIRST_AID",
          severity: "MEDIUM",
          plantId: plants[0]?.id || "",
          departmentId: plants[0]?.departments?.[0]?.id || "",
          incidentDate: new Date().toISOString().split("T")[0],
          incidentTime: new Date().toTimeString().slice(0, 5),
          location: "",
          description: "",
          immediateActions: "",
          isStatutoryRequired: false,
        });
        fetchInitialData();
      } else {
        setFormError(res.error?.message || "Failed to submit incident report");
      }
    } catch (err: any) {
      setFormError(err.message || "An error occurred during submission");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSosSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSosSubmitting(true);
      const res = await apiClient<any>("/api/v1/emergency/sos", {
        method: "POST",
        body: JSON.stringify({
          emergencyType: sosData.emergencyType,
          plantId: sosData.plantId || undefined,
          location: sosData.location || "Facility Wide",
          message: sosData.message,
        }),
      });

      if (res.success) {
        setIsSosModalOpen(false);
        alert("🚨 EMERGENCY SOS BROADCAST SENT! All connected devices and personnel have been alerted with siren audio.");
      } else {
        alert(res.error?.message || "Failed to broadcast Emergency SOS");
      }
    } catch (err: any) {
      alert(err.message || "Error broadcasting SOS");
    } finally {
      setSosSubmitting(false);
    }
  };

  const getSeverityBadge = (sev: string) => {
    const item = SEVERITIES.find((s) => s.value === sev);
    return (
      <span
        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
          item?.color || "bg-slate-100 text-slate-800"
        }`}
      >
        {item?.label || sev}
      </span>
    );
  };

  return (
    <AppShell>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        {/* Header with SOS and Report buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Incident Register
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Enterprise incident management, statutory tracking, and emergency response
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSosModalOpen(true)}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-bold shadow-lg shadow-red-200 transition active:scale-95 animate-pulse"
            >
              <ShieldAlert className="w-5 h-5 text-amber-300" />
              Emergency SOS
            </button>
            <button
              onClick={() => {
                setFormError(null);
                setIsReportModalOpen(true);
              }}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-medium shadow transition"
            >
              <Plus className="w-4 h-4" />
              Report Incident
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Incidents", val: data.length },
            {
              label: "High & Critical",
              val: data.filter((d) => ["HIGH", "CRITICAL", "CATASTROPHIC"].includes(d.severity)).length,
            },
            {
              label: "Lost Time Injuries",
              val: data.filter((d) => d.incidentType === "LOST_TIME_INJURY").length,
            },
            {
              label: "Open Investigations",
              val: data.filter((d) => d.status !== "CLOSED").length,
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

        {/* Incidents Table */}
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
              <p className="font-medium text-slate-700">No incidents recorded yet.</p>
              <p className="text-xs text-slate-400 mt-1">All reported incidents will appear in this audited ledger.</p>
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
              >
                Create Incident Report
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
                    <th className="px-6 py-3.5 font-semibold">Severity</th>
                    <th className="px-6 py-3.5 font-semibold">Plant / Site</th>
                    <th className="px-6 py-3.5 font-semibold">Date</th>
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
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900 line-clamp-1">{row.title}</div>
                        {row.location && (
                          <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" /> {row.location}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-700">
                        {row.incidentType?.replace(/_/g, " ")}
                      </td>
                      <td className="px-6 py-4">{getSeverityBadge(row.severity)}</td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        {row.plant?.name || "Facility"}
                        {row.department?.name && ` (${row.department.name})`}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                        {row.incidentDate ? new Date(row.incidentDate).toLocaleDateString() : "-"}
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

        {/* REPORT INCIDENT MODAL */}
        {isReportModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col my-8 max-h-[90vh]">
              <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold">Report New Incident</h2>
                  <p className="text-xs text-slate-300">Audited enterprise incident capture</p>
                </div>
                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="text-slate-400 hover:text-white text-2xl leading-none"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleReportSubmit} className="p-6 overflow-y-auto space-y-4">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Incident Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Brief description of incident (e.g., Acid spill in tank farm)"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                {/* Type & Severity Dropdowns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Incident Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                      value={formData.incidentType}
                      onChange={(e) => setFormData({ ...formData, incidentType: e.target.value })}
                    >
                      {INCIDENT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Severity Rating <span className="text-red-500">*</span>
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
                </div>

                {/* Plant & Department Selection */}
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

                {/* Date, Time & Specific Location */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Incident Date <span className="text-red-500">*</span>
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
                      Time (HH:MM)
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
                      placeholder="e.g. Bay 4, Boiler 2"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>
                </div>

                {/* Detailed Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Detailed Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Describe what occurred, sequence of events, personnel or equipment involved..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                {/* Immediate Actions */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Immediate Actions Taken
                  </label>
                  <textarea
                    rows={2}
                    placeholder="First aid given, area cordoned off, equipment shut down, etc."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    value={formData.immediateActions}
                    onChange={(e) => setFormData({ ...formData, immediateActions: e.target.value })}
                  />
                </div>

                {/* Statutory Required Checkbox */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="statutory"
                    checked={formData.isStatutoryRequired}
                    onChange={(e) => setFormData({ ...formData, isStatutoryRequired: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <label htmlFor="statutory" className="text-xs font-semibold text-slate-700">
                    Requires Statutory Authority Notification (OSHA / Factory Inspectorate)
                  </label>
                </div>

                {/* Modal Buttons */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsReportModalOpen(false)}
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
                    Submit Incident
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EMERGENCY SOS MODAL */}
        {isSosModalOpen && (
          <div className="fixed inset-0 bg-red-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border-4 border-red-600">
              <div className="px-6 py-5 bg-red-600 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-800 rounded-full animate-ping">
                    <ShieldAlert className="w-6 h-6 text-amber-300" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-wide">BROADCAST EMERGENCY SOS</h2>
                    <p className="text-xs text-red-100">Dispatches siren alert to all connected devices</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSosModalOpen(false)}
                  className="text-red-200 hover:text-white text-2xl leading-none font-bold"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSosSubmit} className="p-6 space-y-4">
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 font-semibold">
                  ⚠️ This triggers an audible emergency beep siren across all workstations, phones, and tablets connected to EHS. Use only for genuine emergencies.
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-1 uppercase tracking-wider">
                    Emergency Type <span className="text-red-600">*</span>
                  </label>
                  <select
                    className="w-full px-3 py-2.5 text-sm font-bold border-2 border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 bg-white"
                    value={sosData.emergencyType}
                    onChange={(e) => setSosData({ ...sosData, emergencyType: e.target.value })}
                  >
                    {SOS_TYPES.map((t) => (
                      <option key={t} value={t}>
                        🚨 {t.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-1 uppercase tracking-wider">
                    Facility / Plant
                  </label>
                  <select
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 bg-white"
                    value={sosData.plantId}
                    onChange={(e) => setSosData({ ...sosData, plantId: e.target.value })}
                  >
                    <option value="">All Facilities / Organization-Wide</option>
                    {plants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-1 uppercase tracking-wider">
                    Location within Facility
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Unit 3 Boiler House, Tank Farm Gate 2"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    value={sosData.location}
                    onChange={(e) => setSosData({ ...sosData, location: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-1 uppercase tracking-wider">
                    Emergency Broadcast Instructions
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    value={sosData.message}
                    onChange={(e) => setSosData({ ...sosData, message: e.target.value })}
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsSosModalOpen(false)}
                    className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sosSubmitting}
                    className="px-6 py-2.5 text-sm font-extrabold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-lg shadow-red-200 flex items-center gap-2"
                  >
                    {sosSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <ShieldAlert className="w-5 h-5 text-amber-300" />
                    )}
                    TRIGGER SOS BROADCAST
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
