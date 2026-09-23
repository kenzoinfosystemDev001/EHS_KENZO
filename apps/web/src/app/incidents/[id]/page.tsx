"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api";
import {
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldAlert,
  MapPin,
  Building,
  User,
  Calendar,
  FileCheck,
  PlusCircle,
  HelpCircle,
  ExternalLink,
  Info,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";

const HIGHER_AUTHORITY_ROLES = [
  "HSE_MANAGER",
  "PLANT_HEAD",
  "DEPARTMENT_HEAD",
  "ADMIN",
  "SYSTEM_ADMIN",
  "CORPORATE_HSE",
];

interface IncidentDetail {
  id: string;
  referenceNumber: string;
  title: string;
  description: string;
  incidentType: string;
  severity: string;
  status: string;
  incidentDate: string;
  incidentTime?: string;
  location?: string;
  immediateActions?: string;
  isStatutoryRequired: boolean;
  submittedAt?: string;
  investigationStartedAt?: string;
  classifiedAt?: string;
  closedAt?: string;
  plantId: string;
  departmentId?: string;
  plant?: { id: string; code: string; name: string };
  department?: { id: string; code: string; name: string };
  reportedBy?: { id: string; firstName: string; lastName: string; email: string };
  investigator?: { id: string; firstName: string; lastName: string; email: string };
  capaRecords?: Array<{
    id: string;
    referenceNumber: string;
    title: string;
    status: string;
    priority: string;
  }>;
}

export default function IncidentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action Modals State
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<"investigate" | "close" | "capa">("investigate");
  const [actionComments, setActionComments] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // CAPA Form state within ticket
  const [capaTitle, setCapaTitle] = useState("");
  const [capaDescription, setCapaDescription] = useState("");
  const [capaType, setCapaType] = useState("CORRECTIVE");
  const [capaPriority, setCapaPriority] = useState("HIGH");
  const [capaTargetDate, setCapaTargetDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]
  );

  const isHigherAuthority = user?.roles?.some((r) =>
    HIGHER_AUTHORITY_ROLES.includes(r)
  ) ?? false;

  useEffect(() => {
    fetchIncident();
  }, [params.id]);

  const fetchIncident = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient<IncidentDetail>(`/api/v1/incidents/${params.id}`);
      if (res.success && res.data) {
        setIncident(res.data);
      } else {
        setError(res.error?.message || "Failed to load incident record");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while loading ticket");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAction = (type: "investigate" | "close" | "capa") => {
    setActionType(type);
    setActionComments("");
    setActionError(null);
    if (type === "capa" && incident) {
      setCapaTitle(`CAPA: Corrective Action for ${incident.referenceNumber}`);
      setCapaDescription(
        `Eliminate root cause of ${incident.incidentType} incident at ${incident.location || incident.plant?.name}. Immediate corrective action required.`
      );
    }
    setIsActionModalOpen(true);
  };

  const handleSubmitAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setSubmittingAction(true);

    try {
      if (actionType === "investigate") {
        const res = await apiClient(`/api/v1/incidents/${incident?.id}/actions/investigate`, {
          method: "POST",
          body: JSON.stringify({
            comments: actionComments.trim() || "Investigation initiated by management.",
          }),
        });
        if (res.success) {
          setIsActionModalOpen(false);
          await fetchIncident();
        } else {
          setActionError(res.error?.message || "Failed to initiate investigation");
        }
      } else if (actionType === "close") {
        const res = await apiClient(`/api/v1/incidents/${incident?.id}/actions/close`, {
          method: "POST",
          body: JSON.stringify({
            comments:
              actionComments.trim() ||
              "Incident verified resolved, corrective measures validated, ticket officially closed.",
          }),
        });
        if (res.success) {
          setIsActionModalOpen(false);
          await fetchIncident();
        } else {
          setActionError(res.error?.message || "Failed to approve closure");
        }
      } else if (actionType === "capa") {
        if (!incident?.plantId) {
          setActionError("Incident plant association missing");
          return;
        }
        const capaPayload = {
          title: capaTitle.trim(),
          description: capaDescription.trim(),
          capaType,
          priority: capaPriority,
          plantId: incident.plantId,
          departmentId: incident.departmentId || undefined,
          incidentId: incident.id,
          targetDate: new Date(capaTargetDate).toISOString(),
        };

        const res = await apiClient("/api/v1/capa", {
          method: "POST",
          body: JSON.stringify(capaPayload),
        });

        if (res.success) {
          setIsActionModalOpen(false);
          await fetchIncident();
        } else {
          setActionError(res.error?.message || "Failed to create and link CAPA");
        }
      }
    } catch (err: any) {
      setActionError(err.message || "An unexpected error occurred");
    } finally {
      setSubmittingAction(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CLOSED":
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">CLOSED / RESOLVED</span>;
      case "INVESTIGATING":
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">INVESTIGATING / IN PROGRESS</span>;
      case "CAPA_LINKED":
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">CAPA LINKED</span>;
      case "REPORTED":
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">REPORTED / PENDING REVIEW</span>;
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case "CATASTROPHIC":
      case "CRITICAL":
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 uppercase tracking-wider">{sev}</span>;
      case "HIGH":
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 uppercase tracking-wider">{sev}</span>;
      case "MEDIUM":
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 uppercase tracking-wider">{sev}</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 uppercase tracking-wider">{sev}</span>;
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex flex-col justify-center items-center h-96 text-slate-500">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mb-3" />
          <p className="font-medium text-slate-600">Retrieving safety ticket records...</p>
        </div>
      </AppShell>
    );
  }

  if (error || !incident) {
    return (
      <AppShell>
        <div className="p-6 max-w-4xl mx-auto space-y-4">
          <Link
            href="/incidents"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Incidents
          </Link>
          <div className="bg-red-50 border border-red-200 p-8 rounded-2xl text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold text-red-800">Incident Ticket Not Available</h2>
            <p className="text-sm text-red-600">{error || "The requested incident record was not found."}</p>
            <button
              onClick={() => router.push("/incidents")}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900"
            >
              Return to Incident Register
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  const isClosed = incident.status === "CLOSED";

  return (
    <AppShell>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/incidents"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Incident Register
          </Link>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>Ticket ID: {incident.id}</span>
          </div>
        </div>

        {/* Top Ticket Header Banner */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                <span className="font-mono text-base font-bold text-emerald-700 bg-emerald-50 px-3 py-0.5 rounded-lg border border-emerald-200">
                  {incident.referenceNumber}
                </span>
                {getStatusBadge(incident.status)}
                {getSeverityBadge(incident.severity)}
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {incident.incidentType.replace(/_/g, " ")}
                </span>
                {incident.isStatutoryRequired && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> Statutory Reportable
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {incident.title}
              </h1>
            </div>

            {/* Higher Authority Action Buttons */}
            {isHigherAuthority && !isClosed && (
              <div className="flex items-center gap-2.5 flex-wrap">
                {incident.status === "REPORTED" && (
                  <button
                    onClick={() => handleOpenAction("investigate")}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition active:scale-95"
                  >
                    <HelpCircle className="w-4 h-4" />
                    Start Investigation & Provide Help
                  </button>
                )}
                <button
                  onClick={() => handleOpenAction("capa")}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  Link CAPA Action
                </button>
                <button
                  onClick={() => handleOpenAction("close")}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve & Close Ticket
                </button>
              </div>
            )}
          </div>

          {/* Ticket Progress Lifecycle Pipeline */}
          <div className="pt-4 border-t border-slate-100">
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className={`p-2.5 rounded-xl font-medium border ${incident.status ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
                <div className="font-bold flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 1. Reported
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {incident.submittedAt ? new Date(incident.submittedAt).toLocaleDateString() : "Logged"}
                </div>
              </div>

              <div className={`p-2.5 rounded-xl font-medium border ${["INVESTIGATING", "CAPA_LINKED", "CLOSED"].includes(incident.status) ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                <div className="font-bold flex items-center justify-center gap-1">
                  {["INVESTIGATING", "CAPA_LINKED", "CLOSED"].includes(incident.status) ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Clock className="w-3.5 h-3.5" />
                  )}
                  2. Under Investigation
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {incident.investigationStartedAt ? new Date(incident.investigationStartedAt).toLocaleDateString() : "HSE Review"}
                </div>
              </div>

              <div className={`p-2.5 rounded-xl font-medium border ${["CAPA_LINKED", "CLOSED"].includes(incident.status) ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                <div className="font-bold flex items-center justify-center gap-1">
                  {["CAPA_LINKED", "CLOSED"].includes(incident.status) ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Clock className="w-3.5 h-3.5" />
                  )}
                  3. CAPA Implemented
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {incident.capaRecords && incident.capaRecords.length > 0 ? `${incident.capaRecords.length} linked` : "Pending Action"}
                </div>
              </div>

              <div className={`p-2.5 rounded-xl font-medium border ${incident.status === "CLOSED" ? "bg-emerald-100 border-emerald-400 text-emerald-900 font-bold" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                <div className="font-bold flex items-center justify-center gap-1">
                  {incident.status === "CLOSED" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Clock className="w-3.5 h-3.5" />
                  )}
                  4. Ticket Closed
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {incident.closedAt ? new Date(incident.closedAt).toLocaleDateString() : "Pending Closure"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Worker Help & Status Information Banner */}
        {!isHigherAuthority && (
          <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-sky-800">
              <span className="font-bold">Live Ticket Escalation:</span> This ticket has been submitted to Plant Leadership (HSE Manager, Dept Head, and Site Management). You can monitor real-time investigation actions, assigned personnel, and corrective resolutions below.
            </div>
          </div>
        )}

        {/* Main Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Full Incident Details & Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description & Narrative */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-600" />
                Incident Narrative & Summary
              </h2>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                {incident.description || "No description provided."}
              </div>

              {incident.immediateActions && (
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Immediate Actions Taken at Site:
                  </h3>
                  <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-xl text-sm text-emerald-900">
                    {incident.immediateActions}
                  </div>
                </div>
              )}
            </div>

            {/* Linked Corrective & Preventive Actions (CAPA) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                  Corrective & Preventive Actions (CAPA)
                </h2>
                {isHigherAuthority && !isClosed && (
                  <button
                    onClick={() => handleOpenAction("capa")}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <PlusCircle className="w-4 h-4" /> Add Action
                  </button>
                )}
              </div>

              {(!incident.capaRecords || incident.capaRecords.length === 0) ? (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-sm">
                  <p className="font-medium text-slate-700">No CAPA records linked yet.</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {isHigherAuthority
                      ? "Create corrective actions to fix root causes and allow closure."
                      : "Plant leadership will attach corrective actions during investigation."}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {incident.capaRecords.map((capa) => (
                    <div key={capa.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-indigo-600">
                            {capa.referenceNumber}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                            {capa.status}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
                            {capa.priority}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-800 mt-1">{capa.title}</p>
                      </div>
                      <Link
                        href={`/capa`}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                      >
                        View in CAPA <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Meta Information & Personnel */}
          <div className="space-y-6">
            {/* Incident Metadata Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Location & Schedule
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2.5">
                  <Building className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs text-slate-400 block">Plant / Facility</span>
                    <span className="font-medium text-slate-800">
                      {incident.plant?.name || "Corporate"} ({incident.plant?.code || "N/A"})
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Building className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs text-slate-400 block">Department</span>
                    <span className="font-medium text-slate-800">
                      {incident.department?.name || "Unassigned"}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs text-slate-400 block">Specific Site Location</span>
                    <span className="font-medium text-slate-800">
                      {incident.location || "On-site"}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs text-slate-400 block">Incident Date & Time</span>
                    <span className="font-medium text-slate-800">
                      {new Date(incident.incidentDate).toLocaleDateString()} {incident.incidentTime ? `at ${incident.incidentTime}` : ""}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Personnel & Authority Custody */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Personnel & Chain of Custody
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2.5">
                  <User className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs text-slate-400 block">Reported By</span>
                    <span className="font-bold text-slate-900 block">
                      {incident.reportedBy
                        ? `${incident.reportedBy.firstName} ${incident.reportedBy.lastName}`
                        : "Field Operative"}
                    </span>
                    <span className="text-xs text-slate-500">
                      {incident.reportedBy?.email || "N/A"}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 pt-2 border-t border-slate-100">
                  <ShieldAlert className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs text-slate-400 block">Assigned Lead Investigator</span>
                    <span className="font-bold text-slate-900 block">
                      {incident.investigator
                        ? `${incident.investigator.firstName} ${incident.investigator.lastName}`
                        : "HSE Management Team"}
                    </span>
                    <span className="text-xs text-slate-500">
                      {incident.investigator?.email || "Review in progress"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ACTION / MODAL POPUP */}
        {isActionModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden my-8">
              <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold">
                    {actionType === "investigate" && "Start Investigation & Provide Help"}
                    {actionType === "close" && "Approve & Officially Close Safety Ticket"}
                    {actionType === "capa" && "Create & Link Corrective Action (CAPA)"}
                  </h2>
                  <p className="text-xs text-slate-300">
                    Authority Action for {incident.referenceNumber}
                  </p>
                </div>
                <button
                  onClick={() => setIsActionModalOpen(false)}
                  className="text-slate-400 hover:text-white text-2xl leading-none"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSubmitAction} className="p-6 space-y-4">
                {actionError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{actionError}</span>
                  </div>
                )}

                {actionType === "capa" ? (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        CAPA Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        value={capaTitle}
                        onChange={(e) => setCapaTitle(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Type</label>
                        <select
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                          value={capaType}
                          onChange={(e) => setCapaType(e.target.value)}
                        >
                          <option value="CORRECTIVE">Corrective Action</option>
                          <option value="PREVENTIVE">Preventive Action</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                        <select
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                          value={capaPriority}
                          onChange={(e) => setCapaPriority(e.target.value)}
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                          <option value="CRITICAL">Critical</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Target Completion Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        value={capaTargetDate}
                        onChange={(e) => setCapaTargetDate(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Action Plan & Preventive Scope <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={3}
                        required
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        value={capaDescription}
                        onChange={(e) => setCapaDescription(e.target.value)}
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {actionType === "investigate"
                        ? "Investigation Scope & Immediate Assistance Notes"
                        : "Closure Justification & Root Cause Verification Remarks"}
                    </label>
                    <textarea
                      rows={4}
                      required
                      placeholder={
                        actionType === "investigate"
                          ? "Specify appointed investigation team, immediate assistance provided to worker, and site safety measures..."
                          : "State corrective actions verified, preventive safeguards validated, and official closure sign-off notes..."
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      value={actionComments}
                      onChange={(e) => setActionComments(e.target.value)}
                    />
                  </div>
                )}

                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsActionModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAction}
                    className={`px-5 py-2 rounded-xl text-sm font-bold text-white shadow-sm flex items-center gap-2 ${
                      actionType === "close"
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : actionType === "capa"
                        ? "bg-indigo-600 hover:bg-indigo-700"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {submittingAction && <Loader2 className="w-4 h-4 animate-spin" />}
                    {actionType === "investigate" && "Start Investigation"}
                    {actionType === "close" && "Confirm Ticket Closure"}
                    {actionType === "capa" && "Create & Link Action"}
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
