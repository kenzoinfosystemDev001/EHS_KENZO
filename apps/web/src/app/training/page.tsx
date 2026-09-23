"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  Loader2,
  Plus,
  AlertCircle,
  FileText,
  GraduationCap,
  CheckCircle2,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";

const L_AND_D_ROLES = [
  "TRAINER",
  "LD_MANAGER",
  "HSE_MANAGER",
  "ADMIN",
  "SYSTEM_ADMIN",
];

interface CourseItem {
  id: string;
  code: string;
  title: string;
  description?: string;
  validityMonths: number;
}

export default function TrainingPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Training Request Modal State (Available to all users)
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestTopic, setRequestTopic] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [requestCourseId, setRequestCourseId] = useState("");
  const [requestDate, setRequestDate] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  // Schedule Modal State (Available to Trainers & L&D)
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleData, setScheduleData] = useState({
    title: "",
    code: "",
    description: "",
    validityMonths: "12",
  });
  const [submittingSchedule, setSubmittingSchedule] = useState(false);

  const canManageTraining = user?.roles?.some((r) =>
    L_AND_D_ROLES.includes(r)
  ) ?? false;

  useEffect(() => {
    fetchTrainingData();
  }, []);

  const fetchTrainingData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [coursesRes, recordsRes] = await Promise.all([
        apiClient<CourseItem[]>("/api/v1/training/courses"),
        apiClient<any[]>("/api/v1/training/records"),
      ]);

      if (coursesRes.success && coursesRes.data) {
        setCourses(coursesRes.data);
      }
      if (recordsRes.success && recordsRes.data) {
        setRecords(recordsRes.data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load training registry");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestError(null);
    setRequestSuccess(null);
    setSubmittingRequest(true);

    try {
      const selectedCourse = courses.find((c) => c.id === requestCourseId);
      const topic = selectedCourse ? selectedCourse.title : requestTopic.trim();

      if (!topic) {
        setRequestError("Please specify a training topic or select a course.");
        setSubmittingRequest(false);
        return;
      }

      const res = await apiClient("/api/v1/training/request", {
        method: "POST",
        body: JSON.stringify({
          courseId: requestCourseId || undefined,
          topic,
          reason: requestReason.trim(),
          preferredDate: requestDate || undefined,
        }),
      });

      if (res.success) {
        setRequestSuccess(
          "Your training request was successfully submitted to L&D and HSE Management! You will receive confirmation when the session is scheduled."
        );
        setRequestTopic("");
        setRequestReason("");
        setRequestCourseId("");
        setRequestDate("");
        setTimeout(() => {
          setIsRequestModalOpen(false);
          setRequestSuccess(null);
        }, 2500);
      } else {
        setRequestError(res.error?.message || "Failed to submit request");
      }
    } catch (err: any) {
      setRequestError(err.message || "An error occurred");
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingSchedule(true);
      const res = await apiClient("/api/v1/training/courses", {
        method: "POST",
        body: JSON.stringify({
          title: scheduleData.title,
          code: scheduleData.code || `TRN-${Date.now().toString().slice(-4)}`,
          description: scheduleData.description,
          validityMonths: Number(scheduleData.validityMonths) || 12,
        }),
      });

      if (res.success) {
        setIsScheduleModalOpen(false);
        setScheduleData({ title: "", code: "", description: "", validityMonths: "12" });
        await fetchTrainingData();
      } else {
        alert(res.error?.message || "Failed to create course");
      }
    } catch (err: any) {
      alert(err.message || "Failed to create course");
    } finally {
      setSubmittingSchedule(false);
    }
  };

  return (
    <AppShell>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        {/* Header with Universal Request & Admin Schedule Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Training & Competency Matrix
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Enterprise qualification, statutory safety training, and skill development
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Universal Request for Training - Every single role can use this */}
            <button
              onClick={() => {
                setRequestError(null);
                setRequestSuccess(null);
                setIsRequestModalOpen(true);
              }}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-bold shadow-md shadow-emerald-100 transition active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-emerald-200" />
              Request Training
            </button>

            {/* L&D / Management Only */}
            {canManageTraining && (
              <button
                onClick={() => setIsScheduleModalOpen(true)}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-lg font-medium shadow transition"
              >
                <Plus className="w-4 h-4" />
                Add Course Module
              </button>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Active Modules", val: courses.length },
            { label: "Trained Records", val: records.length },
            {
              label: "Compliant Personnel",
              val: records.filter((r) => r.isCompliant).length,
            },
            {
              label: "Pending Verification",
              val: records.filter((r) => !r.isCompliant).length,
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

        {/* Courses & Modules Catalog */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              EHS Curriculum & Available Training Modules
            </h2>
            <span className="text-xs text-slate-500 font-medium">{courses.length} accredited courses</span>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-48 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
          ) : error ? (
            <div className="flex flex-col justify-center items-center h-48 text-red-500 p-6 text-center">
              <AlertCircle className="w-10 h-10 mb-2" />
              <p className="font-semibold">{error}</p>
              <button
                onClick={fetchTrainingData}
                className="mt-3 px-4 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-xs font-medium"
              >
                Retry
              </button>
            </div>
          ) : courses.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-48 text-slate-500 p-6 text-center">
              <FileText className="w-10 h-10 mb-2 text-slate-300" />
              <p className="font-medium text-slate-700">No training modules registered.</p>
              <button
                onClick={() => setIsRequestModalOpen(true)}
                className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700"
              >
                Submit Training Request
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold">Course Code</th>
                    <th className="px-6 py-3.5 font-semibold">Title & Topic</th>
                    <th className="px-6 py-3.5 font-semibold">Description</th>
                    <th className="px-6 py-3.5 font-semibold">Validity</th>
                    <th className="px-6 py-3.5 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {courses.map((course) => (
                    <tr key={course.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-4 font-mono font-bold text-xs text-emerald-700">
                        {course.code}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {course.title}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600 max-w-md truncate">
                        {course.description || "General plant workplace health & safety induction"}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                        {course.validityMonths} months
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setRequestCourseId(course.id);
                            setRequestTopic(course.title);
                            setIsRequestModalOpen(true);
                          }}
                          className="text-xs font-bold text-emerald-600 hover:text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition"
                        >
                          Request Training
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* UNIVERSAL REQUEST TRAINING MODAL (Any role can request) */}
        {isRequestModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col my-8 max-h-[90vh]">
              <div className="px-6 py-4 bg-emerald-800 text-white flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-emerald-300" />
                    Request Safety & Operational Training
                  </h2>
                  <p className="text-xs text-emerald-200">
                    Submit training request to L&D and HSE Management
                  </p>
                </div>
                <button
                  onClick={() => setIsRequestModalOpen(false)}
                  className="text-emerald-300 hover:text-white text-2xl leading-none"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleRequestSubmit} className="p-6 overflow-y-auto space-y-4">
                {requestSuccess && (
                  <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-xl flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{requestSuccess}</span>
                  </div>
                )}

                {requestError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{requestError}</span>
                  </div>
                )}

                {/* Pre-existing course selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Accredited Course (Optional)
                  </label>
                  <select
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500"
                    value={requestCourseId}
                    onChange={(e) => {
                      setRequestCourseId(e.target.value);
                      const match = courses.find((c) => c.id === e.target.value);
                      if (match) setRequestTopic(match.title);
                    }}
                  >
                    <option value="">-- Choose from catalog or enter custom topic below --</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code}: {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Topic / Competency Required */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Training Topic / Competency Needed <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hazardous chemical handling, Working at heights, Fire safety"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    value={requestTopic}
                    onChange={(e) => setRequestTopic(e.target.value)}
                  />
                </div>

                {/* Preferred Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Preferred Date / Timeframe
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    value={requestDate}
                    onChange={(e) => setRequestDate(e.target.value)}
                  />
                </div>

                {/* Reason / Justification */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Reason / Safety Justification <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Describe why this training is needed (e.g., Mandatory job qualification, upcoming high-risk job, new machinery operation)..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsRequestModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingRequest}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow flex items-center gap-2"
                  >
                    {submittingRequest && <Loader2 className="w-4 h-4 animate-spin" />}
                    Submit Training Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* SCHEDULE COURSE MODAL (L&D Only) */}
        {isScheduleModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col my-8">
              <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold">Add Course Module</h2>
                  <p className="text-xs text-slate-300">Accredit new safety training curriculum</p>
                </div>
                <button
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="text-slate-400 hover:text-white text-2xl leading-none"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleScheduleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Course Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Electrical Safety & Arc Flash Awareness"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900"
                    value={scheduleData.title}
                    onChange={(e) => setScheduleData({ ...scheduleData, title: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Course Code</label>
                    <input
                      type="text"
                      placeholder="e.g. TRN-ELEC-01"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      value={scheduleData.code}
                      onChange={(e) => setScheduleData({ ...scheduleData, code: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Validity (Months)</label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      value={scheduleData.validityMonths}
                      onChange={(e) =>
                        setScheduleData({ ...scheduleData, validityMonths: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Course Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Summary of course curriculum, mandatory requirements, and target personnel..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    value={scheduleData.description}
                    onChange={(e) =>
                      setScheduleData({ ...scheduleData, description: e.target.value })
                    }
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsScheduleModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingSchedule}
                    className="px-5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-sm font-bold shadow flex items-center gap-2"
                  >
                    {submittingSchedule && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Module
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
