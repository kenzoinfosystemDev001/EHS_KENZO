"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  Loader2,
  AlertCircle,
  Camera,
  CheckCircle2,
  Clock,
  ShieldAlert,
  UserCheck,
  Building2,
  Wrench,
  Stethoscope,
  FileCheck2,
  Coins,
  X,
  Eye,
  Maximize2,
  ExternalLink,
  ZoomIn,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";

const STAGE_DEFINITIONS = [
  { stage: 1, key: "WORKER_REPORTED", name: "Worker Spots Issue", role: "WORKER", title: "Field Worker", icon: Camera },
  { stage: 2, key: "PENDING_WORKER_HEAD", name: "Worker Head Verification", role: "SUPERVISOR", title: "Worker Head / Supervisor", icon: UserCheck },
  { stage: 3, key: "PENDING_DEPT_HEAD", name: "Dept Head Review", role: "DEPARTMENT_HEAD", title: "Department Head", icon: Building2 },
  { stage: 4, key: "PENDING_CONTRACTOR", name: "Contractor Assessment", role: "CONTRACTOR_COORDINATOR", title: "Contractor Coordinator", icon: Wrench },
  { stage: 5, key: "PENDING_HSE_MANAGER", name: "HSE Manager Verification", role: "HSE_MANAGER", title: "HSE Manager", icon: ShieldAlert },
  { stage: 6, key: "PENDING_HEALTH_INSPECTOR", name: "Health Inspector Clearance", role: "OCCUPATIONAL_HEALTH_OFFICER", title: "Health Inspector", icon: Stethoscope },
  { stage: 7, key: "PENDING_SUB_ADMIN", name: "Sub Admin Pre-Approval", role: "CORPORATE_HSE", title: "Sub Admin", icon: FileCheck2 },
  { stage: 8, key: "PENDING_ADMIN_APPROVAL", name: "Admin Resource Scheduling", role: "ADMIN", title: "Admin", icon: Coins },
];

const STAGE_REQUIRED_ROLES: Record<number, string> = {
  1: "WORKER",
  2: "SUPERVISOR",
  3: "DEPARTMENT_HEAD",
  4: "CONTRACTOR_COORDINATOR",
  5: "HSE_MANAGER",
  6: "OCCUPATIONAL_HEALTH_OFFICER",
  7: "CORPORATE_HSE",
  8: "ADMIN",
};

function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const format = file.type === "image/png" ? "image/png" : "image/jpeg";
        const compressedBase64 = canvas.toDataURL(format, 0.85);
        resolve(compressedBase64);
      };
      img.onerror = () => reject(new Error("Failed to process image"));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export default function ObservationsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Observation Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    observationType: "UNSAFE_CONDITION",
    severity: "MEDIUM",
    description: "",
    location: "Plant Alpha - Main Workshop",
    photoData: "",
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Workflow Drawer / Modal State
  const [selectedObs, setSelectedObs] = useState<any | null>(null);
  const [escalating, setEscalating] = useState(false);
  const [escalateComments, setEscalateComments] = useState("");
  const [adminStaff, setAdminStaff] = useState("Manoj Patil (Maintenance Head)");
  const [adminSlot, setAdminSlot] = useState("Tomorrow 10:00 AM - 01:00 PM (Shift A)");
  const [adminFunds, setAdminFunds] = useState("₹15,000");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPreviewImage(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Auto-open drawer when navigating from unified inbox with ?id=UUID or referenceNumber
  useEffect(() => {
    if (typeof window !== "undefined" && data.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const targetId = params.get("id");
      if (targetId) {
        const found = data.find(
          (o) => o.id === targetId || o.referenceNumber === targetId,
        );
        if (found) {
          setSelectedObs(found);
        }
      }
    }
  }, [data]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await apiClient<any[]>("/observations");
      if (res.success) {
        setData(res.data || []);
      } else {
        setError(res.error?.message || "Failed to load observations");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ["image/jpeg", "image/png", "image/jpg"];
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (!validTypes.includes(file.type) && !["jpg", "jpeg", "png"].includes(ext)) {
        alert("Invalid file format! ONLY JPG and PNG image formats are supported.");
        e.target.value = "";
        return;
      }
      try {
        const compressed = await compressImageFile(file);
        setPhotoPreview(compressed);
        setFormData((prev) => ({ ...prev, photoData: compressed }));
      } catch {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setPhotoPreview(base64);
          setFormData((prev) => ({ ...prev, photoData: base64 }));
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await apiClient<any>("/observations", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      if (res.success) {
        setIsCreateOpen(false);
        setFormData({
          observationType: "UNSAFE_CONDITION",
          severity: "MEDIUM",
          description: "",
          location: "Plant Alpha - Main Workshop",
          photoData: "",
        });
        setPhotoPreview(null);
        await fetchData();
      } else {
        alert(res.error?.message || "Failed to submit observation");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const isUserAuthorizedForStage = (stageIdx: number): boolean => {
    const reqRole = STAGE_REQUIRED_ROLES[stageIdx];
    if (!reqRole) return false;
    return !!user?.roles?.includes(reqRole);
  };

  const handleEscalate = async (action: string) => {
    if (!selectedObs) return;

    if (!isUserAuthorizedForStage(currentIdx)) {
      alert(
        `Permission Denied: Your active role is '${user?.roles?.join(", ") || "None"}'. Only users with the '${STAGE_DEFINITIONS[currentIdx - 1]?.title}' (${STAGE_REQUIRED_ROLES[currentIdx]}) role are permitted to approve Stage ${currentIdx}.`,
      );
      return;
    }

    try {
      setEscalating(true);
      const payload: any = {
        action,
        comments: escalateComments || undefined,
      };

      if (action === "ADMIN_APPROVE_AND_SCHEDULE") {
        payload.assignedStaff = adminStaff;
        payload.scheduledSlot = adminSlot;
        payload.allocatedFunds = adminFunds;
      }

      const res = await apiClient<any>(`/observations/${selectedObs.id}/escalate`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setEscalateComments("");
        await fetchData();
        const updatedList = await apiClient<any[]>("/observations");
        if (updatedList.success) {
          const fresh = (updatedList.data || []).find((o: any) => o.id === selectedObs.id);
          setSelectedObs(fresh || null);
        }
      } else {
        alert(res.error?.message || "Failed to escalate observation");
      }
    } catch (err: any) {
      alert(err.message || "Failed to advance workflow");
    } finally {
      setEscalating(false);
    }
  };

  const getCurrentStageIndex = (obs: any): number => {
    if (obs?.workflow?.currentState === "SCHEDULED_FOR_FIXING" || obs?.status === "CLOSED") {
      return 9;
    }
    const idx = obs?.workflow?.contextData?.currentStageIndex;
    if (typeof idx === "number") return idx;

    switch (obs?.workflow?.currentState) {
      case "PENDING_WORKER_HEAD": return 2;
      case "PENDING_DEPT_HEAD": return 3;
      case "PENDING_CONTRACTOR": return 4;
      case "PENDING_HSE_MANAGER": return 5;
      case "PENDING_HEALTH_INSPECTOR": return 6;
      case "PENDING_SUB_ADMIN": return 7;
      case "PENDING_ADMIN_APPROVAL": return 8;
      case "SCHEDULED_FOR_FIXING": return 9;
      default: return 2;
    }
  };

  const currentIdx = selectedObs ? getCurrentStageIndex(selectedObs) : 0;

  const getActiveButtonText = (stage: number) => {
    switch (stage) {
      case 2:
        return "Verify on Site → Pass to Dept Head";
      case 3:
        return "Review Impact → Pass to Contractor";
      case 4:
        return "Assess Repairs → Pass to HSE Manager";
      case 5:
        return "Verify Safety → Pass to Health Inspector";
      case 6:
        return "Clear Health Protocol → Pass to Sub Admin";
      case 7:
        return "Pre-Approve Risk → Pass to Admin";
      case 8:
        return "Approve, Assign Staff & Slot → Schedule Fixing";
      default:
        return "Approve & Advance Stage";
    }
  };

  const handleActiveStageAction = async () => {
    if (!isUserAuthorizedForStage(currentIdx)) {
      alert(
        `Permission Denied: Your active role is '${user?.roles?.join(", ") || "None"}'. Only users with the '${STAGE_DEFINITIONS[currentIdx - 1]?.title}' (${STAGE_REQUIRED_ROLES[currentIdx]}) role are permitted to approve Stage ${currentIdx}.`,
      );
      return;
    }

    switch (currentIdx) {
      case 2:
        await handleEscalate("PASS_TO_DEPT_HEAD");
        break;
      case 3:
        await handleEscalate("PASS_TO_CONTRACTOR");
        break;
      case 4:
        await handleEscalate("PASS_TO_HSE_MANAGER");
        break;
      case 5:
        await handleEscalate("PASS_TO_HEALTH_INSPECTOR");
        break;
      case 6:
        await handleEscalate("PASS_TO_SUB_ADMIN");
        break;
      case 7:
        await handleEscalate("PASS_TO_ADMIN");
        break;
      case 8:
        await handleEscalate("ADMIN_APPROVE_AND_SCHEDULE");
        break;
      default:
        break;
    }
  };

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">
                Safety Observations
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800">
                8-Stage Resolution Workflow
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Field worker photo reporting &rarr; Worker Head &rarr; Dept Head &rarr; Contractor &rarr; HSE Manager &rarr; Health Inspector &rarr; Sub Admin &rarr; Admin Allocation.
            </p>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition"
          >
            <Camera className="w-4 h-4" />
            Spot Issue (Click Photo & Submit)
          </button>
        </div>

        <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 rounded-xl p-4 text-white shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-sky-300 font-semibold">
              Live Operational Escalation Chain
            </span>
            <span className="text-xs text-slate-300">
              Logged in as: <strong className="text-white">{user?.email || "Enterprise User"}</strong>
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 mt-2">
            {STAGE_DEFINITIONS.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.stage}
                  className="bg-white/10 hover:bg-white/15 p-2 rounded-lg border border-white/10 text-center transition"
                >
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-sky-500/30 text-sky-300 mx-auto mb-1 text-xs font-bold">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-[11px] font-semibold truncate">{s.name}</div>
                  <div className="text-[9px] text-slate-300 truncate">{s.title}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center h-64 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
            </div>
          ) : error ? (
            <div className="flex flex-col justify-center items-center h-64 text-red-500 p-6 text-center">
              <AlertCircle className="w-12 h-12 mb-4" />
              <p>{error}</p>
              <button
                onClick={fetchData}
                className="mt-4 px-4 py-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 text-sm font-medium"
              >
                Retry
              </button>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-64 text-slate-500 p-6 text-center">
              <Camera className="w-12 h-12 mb-3 text-slate-300" />
              <p className="font-medium text-slate-700">No safety observations found.</p>
              <p className="text-xs text-slate-400 mt-1">Field workers can report hazards with photos to kickstart the 8-stage approval chain.</p>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700"
              >
                Spot & Report First Issue
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-5 py-3.5">Ref #</th>
                    <th className="px-4 py-3.5">Photo</th>
                    <th className="px-5 py-3.5">Type & Severity</th>
                    <th className="px-5 py-3.5">Description & Location</th>
                    <th className="px-5 py-3.5">Escalation Stage (1 - 8)</th>
                    <th className="px-5 py-3.5">Observer</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((row) => {
                    const stageIdx = getCurrentStageIndex(row);
                    const isFullyResolved = stageIdx >= 9;
                    const stageInfo = STAGE_DEFINITIONS.find((s) => s.stage === stageIdx) || {
                      name: isFullyResolved ? "Resolved & Scheduled" : `Stage ${stageIdx}`,
                    };

                    return (
                      <tr key={row.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-5 py-4 font-mono font-medium text-slate-900 text-xs">
                          {row.referenceNumber || "OBS-2026-0001"}
                        </td>
                        <td className="px-4 py-4">
                          {row.evidenceKey ? (
                            <div
                              className="relative group w-12 h-12 rounded-lg overflow-hidden border border-slate-200 cursor-pointer flex-shrink-0"
                              onClick={() => {
                                setPreviewImage(row.evidenceKey);
                                setPreviewTitle(`${row.referenceNumber || "Observation"} - ${row.observationType?.replace(/_/g, " ")}`);
                              }}
                              title="Click to expand photo"
                            >
                              <img
                                src={row.evidenceKey}
                                alt="Hazard evidence"
                                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
                              />
                              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <Maximize2 className="w-3.5 h-3.5" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                              <Camera className="w-5 h-5" />
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-slate-800">
                              {row.observationType?.replace(/_/g, " ")}
                            </span>
                            <span
                              className={`inline-flex items-center w-fit px-2 py-0.5 rounded text-[10px] font-bold ${
                                row.severity === "CRITICAL"
                                  ? "bg-red-100 text-red-700"
                                  : row.severity === "HIGH"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-sky-100 text-sky-700"
                              }`}
                            >
                              {row.severity}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 max-w-xs">
                          <p className="text-slate-900 font-medium text-xs line-clamp-2">
                            {row.description}
                          </p>
                          {row.locationDetails && (
                            <span className="text-[11px] text-slate-500 mt-0.5 block truncate">
                              📍 {row.locationDetails}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                  isFullyResolved
                                    ? "bg-emerald-100 text-emerald-800"
                                    : stageIdx === 8
                                    ? "bg-purple-100 text-purple-800 animate-pulse"
                                    : "bg-sky-100 text-sky-800"
                                }`}
                              >
                                {isFullyResolved ? (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                ) : (
                                  <Clock className="w-3.5 h-3.5" />
                                )}
                                Stage {Math.min(stageIdx, 8)}/8: {stageInfo.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5, 6, 7, 8].map((sNum) => (
                                <div
                                  key={sNum}
                                  className={`h-1.5 flex-1 rounded-full ${
                                    stageIdx > sNum
                                      ? "bg-emerald-500"
                                      : stageIdx === sNum
                                      ? "bg-sky-500 animate-pulse"
                                      : "bg-slate-200"
                                  }`}
                                  title={`Stage ${sNum}: ${STAGE_DEFINITIONS[sNum - 1]?.name}`}
                                />
                              ))}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-600">
                          <div>{row.observer?.firstName ? `${row.observer.firstName} ${row.observer.lastName}` : "Field Worker"}</div>
                          <div className="text-[10px] text-slate-400">{new Date(row.createdAt).toLocaleDateString()}</div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => setSelectedObs(row)}
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-lg transition shadow-xs ${
                              isFullyResolved
                                ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
                                : isUserAuthorizedForStage(stageIdx)
                                ? "text-white bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-300"
                                : "text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200"
                            }`}
                          >
                            {isFullyResolved ? (
                              <>
                                <Eye className="w-3.5 h-3.5" />
                                View Details
                              </>
                            ) : isUserAuthorizedForStage(stageIdx) ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Review &amp; Approve (Stage {stageIdx})
                              </>
                            ) : (
                              <>
                                <Eye className="w-3.5 h-3.5" />
                                View Lifecycle (Stage {stageIdx})
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {isCreateOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-800">
                      Spot Hazard & Submit (Stage 1)
                    </h2>
                    <p className="text-xs text-slate-500">
                      Snap photo, add details. Auto-routed to Worker Head.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="p-6 overflow-y-auto space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Capture Photo Evidence *
                  </label>
                  {photoPreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 group">
                      <img
                        src={photoPreview}
                        alt="Captured issue preview"
                        className="w-full h-48 object-cover cursor-pointer"
                        onClick={() => {
                          setPreviewImage(photoPreview);
                          setPreviewTitle("New Observation Photo Preview");
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewImage(photoPreview);
                          setPreviewTitle("New Observation Photo Preview");
                        }}
                        className="absolute bottom-2 left-2 px-2 py-1 bg-slate-900/80 hover:bg-slate-900 text-white rounded text-[11px] font-medium flex items-center gap-1 backdrop-blur-xs transition"
                      >
                        <Maximize2 className="w-3 h-3" />
                        <span>Expand Preview</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoPreview(null);
                          setFormData((p) => ({ ...p, photoData: "" }));
                        }}
                        className="absolute top-2 right-2 bg-red-600/90 text-white p-1.5 rounded-full hover:bg-red-700 text-xs shadow-md"
                        title="Remove photo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100/80 transition">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Camera className="w-8 h-8 mb-2 text-slate-400" />
                        <p className="text-xs font-semibold text-slate-700">
                          Click to snap photo or upload image
                        </p>
                        <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                          Cloudinary Integration: strictly JPG & PNG only
                        </p>
                      </div>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                        capture="environment"
                        onChange={handlePhotoCapture}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Issue Description *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Describe what you spotted (e.g., exposed high-voltage wiring with chemical puddle near Reactor #2)..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Observation Type
                    </label>
                    <select
                      value={formData.observationType}
                      onChange={(e) =>
                        setFormData({ ...formData, observationType: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="UNSAFE_CONDITION">Unsafe Condition</option>
                      <option value="UNSAFE_ACT">Unsafe Act</option>
                      <option value="NEAR_MISS">Near Miss</option>
                      <option value="POSITIVE">Positive Observation</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Severity Level
                    </label>
                    <select
                      value={formData.severity}
                      onChange={(e) =>
                        setFormData({ ...formData, severity: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Location in Plant
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    placeholder="e.g. Vadodara Chemical Unit - Bay 4"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !formData.description}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-2 shadow-sm"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Submit & Route to Senior Reviewer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {selectedObs && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-end z-50">
            <div className="bg-white w-full sm:w-11/12 md:max-w-2xl h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
              <div className="px-4 sm:px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold bg-sky-100 text-sky-800 px-2 py-0.5 rounded">
                      {selectedObs.referenceNumber}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        currentIdx >= 9
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {currentIdx >= 9 ? "SCHEDULED FOR FIXING" : `IN PROGRESS (STAGE ${currentIdx})`}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-slate-800 mt-1">
                    8-Stage Escalation & Resolution Management
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedObs(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <div className="flex gap-4">
                    {selectedObs.evidenceKey ? (
                      <div
                        className="relative group flex-shrink-0 cursor-pointer rounded-lg overflow-hidden border border-slate-300 shadow-xs"
                        onClick={() => {
                          setPreviewImage(selectedObs.evidenceKey);
                          setPreviewTitle(`${selectedObs.referenceNumber || "Observation"} - ${selectedObs.observationType?.replace(/_/g, " ")}`);
                        }}
                      >
                        <img
                          src={selectedObs.evidenceKey}
                          alt="Hazard Evidence"
                          className="w-24 h-24 sm:w-28 sm:h-28 object-cover transition duration-200 group-hover:scale-105"
                        />
                        {/* Hover Overlay with Zoom Icon */}
                        <div className="absolute inset-0 bg-slate-900/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="p-1.5 bg-white/95 text-slate-900 rounded-full shadow-md">
                            <ZoomIn className="w-4 h-4" />
                          </span>
                        </div>
                        {/* Always-visible Expand Badge Button in bottom-right corner */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewImage(selectedObs.evidenceKey);
                            setPreviewTitle(`${selectedObs.referenceNumber || "Observation"} - ${selectedObs.observationType?.replace(/_/g, " ")}`);
                          }}
                          className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-slate-900/85 hover:bg-black text-white rounded text-[10px] font-semibold flex items-center gap-1 shadow-xs backdrop-blur-xs transition"
                          title="Expand photo to full size"
                        >
                          <Maximize2 className="w-2.5 h-2.5" />
                          <span>Expand</span>
                        </button>
                      </div>
                    ) : (
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg bg-slate-200 flex flex-col items-center justify-center text-slate-400 flex-shrink-0">
                        <Camera className="w-6 h-6 mb-1" />
                        <span className="text-[10px]">No Photo</span>
                      </div>
                    )}
                    <div className="space-y-1 text-xs">
                      <div className="font-bold text-slate-800 text-sm">
                        {selectedObs.observationType?.replace(/_/g, " ")}
                      </div>
                      <p className="text-slate-600">{selectedObs.description}</p>
                      <div className="text-slate-500 pt-1">
                        📍 {selectedObs.locationDetails || "Plant Site"}
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        Reported by: {selectedObs.observer?.firstName || "Worker"} ({selectedObs.observer?.email || "field"})
                      </div>
                    </div>
                  </div>
                </div>

                {/* 1. Dedicated Action & Approval Card (Prominently displayed at the top) */}
                {currentIdx < 9 ? (
                  isUserAuthorizedForStage(currentIdx) ? (
                    <div className="p-4 rounded-xl border-2 border-emerald-300 bg-emerald-50/70 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-3 w-3 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
                          </span>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                            Action Required: Stage {currentIdx} - {STAGE_DEFINITIONS[currentIdx - 1]?.name}
                          </h4>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 uppercase tracking-wide">
                          Authorized: {STAGE_DEFINITIONS[currentIdx - 1]?.title}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600">
                        You are logged in with the authorized <strong>{STAGE_DEFINITIONS[currentIdx - 1]?.title} ({STAGE_REQUIRED_ROLES[currentIdx]})</strong> role. Please review and execute your stage verification.
                      </p>

                      {currentIdx === 8 ? (
                        <div className="space-y-3 bg-white p-3.5 rounded-lg border border-emerald-200">
                          <div className="text-xs font-bold text-slate-800">
                            Final Admin Authorization & Resource Allocation
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Assign Fixing Staff / Team *
                            </label>
                            <input
                              type="text"
                              value={adminStaff}
                              onChange={(e) => setAdminStaff(e.target.value)}
                              placeholder="e.g. Manoj Patil (Maintenance Head) or Electrical Crew"
                              className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-sky-500"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Decided Time Slot *
                              </label>
                              <input
                                type="text"
                                value={adminSlot}
                                onChange={(e) => setAdminSlot(e.target.value)}
                                placeholder="e.g. Tomorrow 10:00 AM - 01:00 PM"
                                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-sky-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Allocated Repair Funds *
                              </label>
                              <input
                                type="text"
                                value={adminFunds}
                                onChange={(e) => setAdminFunds(e.target.value)}
                                placeholder="e.g. ₹15,000 or $2,000"
                                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-sky-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Admin Approval Directives / Comments
                            </label>
                            <input
                              type="text"
                              value={escalateComments}
                              onChange={(e) => setEscalateComments(e.target.value)}
                              placeholder="e.g. Approved. Issue PTW and initiate fixing immediately."
                              className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-sky-500"
                            />
                          </div>

                          <button
                            type="button"
                            disabled={escalating || !adminStaff || !adminSlot || !adminFunds}
                            onClick={() => handleEscalate("ADMIN_APPROVE_AND_SCHEDULE")}
                            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                          >
                            {escalating && <Loader2 className="w-4 h-4 animate-spin" />}
                            Approve, Assign Staff, Slot & Funds &rarr; Schedule Fixing
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3 bg-white p-3.5 rounded-lg border border-emerald-200">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Verification Remarks / Notes
                            </label>
                            <input
                              type="text"
                              value={escalateComments}
                              onChange={(e) => setEscalateComments(e.target.value)}
                              placeholder={`Enter ${STAGE_DEFINITIONS[currentIdx - 1]?.title} remarks...`}
                              className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-sky-500"
                            />
                          </div>

                          <div className="flex gap-2">
                            {currentIdx === 2 && (
                              <button
                                type="button"
                                disabled={escalating}
                                onClick={() => handleEscalate("PASS_TO_DEPT_HEAD")}
                                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition"
                              >
                                {escalating && <Loader2 className="w-4 h-4 animate-spin" />}
                                ✓ Verify on Site &rarr; Pass to Dept Head
                              </button>
                            )}

                            {currentIdx === 3 && (
                              <button
                                type="button"
                                disabled={escalating}
                                onClick={() => handleEscalate("PASS_TO_CONTRACTOR")}
                                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition"
                              >
                                {escalating && <Loader2 className="w-4 h-4 animate-spin" />}
                                ✓ Review Impact &rarr; Pass to Contractor
                              </button>
                            )}

                            {currentIdx === 4 && (
                              <button
                                type="button"
                                disabled={escalating}
                                onClick={() => handleEscalate("PASS_TO_HSE_MANAGER")}
                                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition"
                              >
                                {escalating && <Loader2 className="w-4 h-4 animate-spin" />}
                                ✓ Assess Repairs &rarr; Pass to HSE Manager
                              </button>
                            )}

                            {currentIdx === 5 && (
                              <button
                                type="button"
                                disabled={escalating}
                                onClick={() => handleEscalate("PASS_TO_HEALTH_INSPECTOR")}
                                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition"
                              >
                                {escalating && <Loader2 className="w-4 h-4 animate-spin" />}
                                ✓ Verify Safety &rarr; Pass to Health Inspector
                              </button>
                            )}

                            {currentIdx === 6 && (
                              <button
                                type="button"
                                disabled={escalating}
                                onClick={() => handleEscalate("PASS_TO_SUB_ADMIN")}
                                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition"
                              >
                                {escalating && <Loader2 className="w-4 h-4 animate-spin" />}
                                ✓ Clear Health Protocol &rarr; Pass to Sub Admin
                              </button>
                            )}

                            {currentIdx === 7 && (
                              <button
                                type="button"
                                disabled={escalating}
                                onClick={() => handleEscalate("PASS_TO_ADMIN")}
                                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition"
                              >
                                {escalating && <Loader2 className="w-4 h-4 animate-spin" />}
                                ✓ Pre-Approve Risk &rarr; Pass to Admin
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/70 shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 text-amber-600" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-950">
                            Stage {currentIdx}: {STAGE_DEFINITIONS[currentIdx - 1]?.name} &bull; Awaiting Role Authorization
                          </h4>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900 uppercase tracking-wide">
                          Restricted to: {STAGE_DEFINITIONS[currentIdx - 1]?.title}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700">
                        🔒 <strong>Approval Restricted:</strong> Only employees with the designated <strong>{STAGE_DEFINITIONS[currentIdx - 1]?.title} ({STAGE_REQUIRED_ROLES[currentIdx]})</strong> role have permission to verify and advance Stage {currentIdx}.
                      </p>

                      <div className="text-[11px] bg-white p-2.5 rounded-lg border border-amber-200 flex items-center justify-between text-slate-600">
                        <div>
                          Your Active Role: <strong className="text-slate-900">{user?.roles?.join(", ") || "None"}</strong> ({user?.email})
                        </div>
                        <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                          Read-Only Oversight
                        </span>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span className="font-bold text-sm">
                        All 8 Escalation Stages Fully Completed!
                      </span>
                    </div>
                    <p className="text-xs text-emerald-800">
                      This observation has been verified through the full hierarchy, authorized by the Admin, and an active Action Item has been created with assigned staff, slot, and budget.
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                    Escalation Stepper (8 Sequential Checkpoints)
                  </h3>
                  <div className="space-y-3">
                    {STAGE_DEFINITIONS.map((stage) => {
                      const isCompleted = currentIdx > stage.stage;
                      const isCurrent = currentIdx === stage.stage;

                      const contextStages: any[] = selectedObs.workflow?.contextData?.stages || [];
                      const stageLog = contextStages.find((s) => s.stage === stage.stage);

                      return (
                        <div
                          key={stage.stage}
                          className={`p-3.5 rounded-xl border transition ${
                            isCompleted
                              ? "bg-emerald-50/70 border-emerald-200"
                              : isCurrent
                              ? "bg-sky-50 border-sky-300 ring-2 ring-sky-200"
                              : "bg-slate-50 border-slate-200 opacity-60"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center mt-0.5 text-xs font-bold ${
                                  isCompleted
                                    ? "bg-emerald-600 text-white"
                                    : isCurrent
                                    ? "bg-sky-600 text-white animate-pulse"
                                    : "bg-slate-300 text-slate-600"
                                }`}
                              >
                                {isCompleted ? (
                                  <CheckCircle2 className="w-4 h-4" />
                                ) : (
                                  stage.stage
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-xs text-slate-800">
                                    Stage {stage.stage}: {stage.name}
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200/80 font-medium text-slate-700">
                                    {stage.title}
                                  </span>
                                </div>

                                {stageLog?.completedBy && (
                                  <div className="text-[11px] text-emerald-800 font-medium mt-1">
                                    ✓ Verified by {stageLog.completedBy} ({stageLog.role}) &bull;{" "}
                                    <span className="text-[10px] text-slate-500">
                                      {new Date(stageLog.timestamp).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                  </div>
                                )}

                                {stageLog?.comments && (
                                  <div className="text-xs text-slate-600 mt-1 italic bg-white/70 px-2 py-1 rounded border border-slate-200/60">
                                    &ldquo;{stageLog.comments}&rdquo;
                                  </div>
                                )}

                                {stage.stage === 8 && (stageLog?.assignedStaff || selectedObs.workflow?.contextData?.assignedStaff) && (
                                  <div className="mt-2 p-2 bg-emerald-100/70 border border-emerald-300 rounded-lg text-xs space-y-1">
                                    <div className="font-bold text-emerald-900">
                                      🛠️ Admin Scheduling Details:
                                    </div>
                                    <div>
                                      <strong>Assigned Staff:</strong> {stageLog?.assignedStaff || selectedObs.workflow?.contextData?.assignedStaff}
                                    </div>
                                    <div>
                                      <strong>Decided Slot:</strong> {stageLog?.scheduledSlot || selectedObs.workflow?.contextData?.scheduledSlot}
                                    </div>
                                    <div>
                                      <strong>Repair Funds:</strong> {stageLog?.allocatedFunds || selectedObs.workflow?.contextData?.allocatedFunds}
                                    </div>
                                  </div>
                                )}

                                {isCurrent && currentIdx < 9 && (
                                  <div className="mt-2.5 pt-2 border-t border-sky-200 flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-semibold text-sky-800 flex items-center gap-1.5">
                                      {isUserAuthorizedForStage(stage.stage)
                                        ? "⚡ Your turn to verify & approve"
                                        : `🔒 Awaiting verification by ${stage.title}`}
                                    </span>
                                    {isUserAuthorizedForStage(stage.stage) ? (
                                      <button
                                        type="button"
                                        disabled={escalating}
                                        onClick={() => handleActiveStageAction()}
                                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold shadow-xs transition flex items-center gap-1 disabled:opacity-50"
                                      >
                                        {escalating && <Loader2 className="w-3 h-3 animate-spin" />}
                                        Approve Step &rarr;
                                      </button>
                                    ) : (
                                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                        Requires {stage.role}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ml-2 ${
                                isCompleted
                                  ? "bg-emerald-100 text-emerald-800"
                                  : isCurrent
                                  ? "bg-sky-100 text-sky-800"
                                  : "bg-slate-200 text-slate-600"
                              }`}
                            >
                              {isCompleted ? "Passed" : isCurrent ? "Active Step" : "Queued"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                <div className="text-xs text-slate-600 truncate">
                  {currentIdx < 9 ? (
                    <span className="font-semibold text-slate-800">
                      Active:{" "}
                      <span className="text-sky-700 font-bold">
                        Stage {currentIdx} ({STAGE_DEFINITIONS[currentIdx - 1]?.title})
                      </span>
                      {!isUserAuthorizedForStage(currentIdx) && (
                        <span className="ml-2 text-amber-700 text-[11px] font-semibold">
                          (Requires {STAGE_DEFINITIONS[currentIdx - 1]?.role})
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="font-semibold text-emerald-700">
                      ✓ All 8 Stages Completed &amp; Scheduled
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedObs(null)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition"
                  >
                    Close
                  </button>
                  {currentIdx < 9 && isUserAuthorizedForStage(currentIdx) && (
                    <button
                      type="button"
                      disabled={escalating}
                      onClick={() => handleActiveStageAction()}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {escalating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      ✓ {getActiveButtonText(currentIdx)}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Full Image Preview Modal / Lightbox */}
        {previewImage && (
          <div
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
            onClick={() => setPreviewImage(null)}
          >
            {/* Header Control Bar */}
            <div
              className="w-full max-w-4xl flex items-center justify-between py-2.5 px-4 mb-3 bg-slate-900/90 rounded-xl border border-white/15 backdrop-blur-md text-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <span className="font-mono text-xs font-bold bg-sky-500/20 text-sky-300 px-2.5 py-0.5 rounded border border-sky-400/30 whitespace-nowrap">
                  Photo Evidence
                </span>
                {previewTitle && (
                  <span className="text-xs text-slate-200 font-medium truncate">
                    {previewTitle}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={previewImage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 text-xs bg-white/10 hover:bg-white/20 text-slate-200 rounded-lg transition flex items-center gap-1.5"
                  title="Open image in new browser tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Open Full Size</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="p-1.5 bg-white/10 hover:bg-rose-600/80 text-white rounded-lg transition"
                  title="Close (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Main High-Res Image Display */}
            <div
              className="relative max-w-4xl max-h-[82vh] w-full flex items-center justify-center overflow-hidden rounded-2xl bg-black/40 border border-white/10 shadow-2xl p-1"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={previewImage}
                alt="Hazard Evidence Full View"
                className="max-w-full max-h-[80vh] w-auto h-auto object-contain rounded-xl select-none"
              />
            </div>

            <div className="text-[11px] text-slate-400 mt-2.5 flex items-center gap-1">
              <span>Press <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono text-[10px]">Esc</kbd> or click anywhere outside to close</span>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
