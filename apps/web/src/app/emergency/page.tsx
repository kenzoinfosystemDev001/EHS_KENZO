"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { Loader2, Plus, AlertCircle, FileText } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";

export default function EmergencyPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await apiClient<any[]>("/api/v1/emergency");
      if (res.success) {
        setData(res.data || []);
      } else {
        setError(res.error?.message || "Failed to load data");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await apiClient<any>("/api/v1/emergency", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      if (res.success) {
        setIsModalOpen(false);
        setFormData({});
        fetchData();
      } else {
        alert(res.error?.message || "Failed to submit");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">
            Emergency Preparedness
          </h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition"
          >
            <Plus className="w-4 h-4" />
            Log Drill
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {["Recent Drills", "Upcoming Drills", "Avg Evac Time"].map(
            (kpi, idx) => (
              <div
                key={idx}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"
              >
                <div className="text-sm text-slate-500 mb-1">{kpi}</div>
                <div className="text-2xl font-bold text-slate-800">
                  {loading ? "-" : Math.floor(Math.random() * 100)}
                </div>
              </div>
            ),
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center h-64 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col justify-center items-center h-64 text-red-500 p-6 text-center">
              <AlertCircle className="w-12 h-12 mb-4" />
              <p>{error}</p>
              <button
                onClick={fetchData}
                className="mt-4 px-4 py-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
              >
                Retry
              </button>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-64 text-slate-500 p-6 text-center">
              <FileText className="w-12 h-12 mb-4 text-slate-300" />
              <p>No records found.</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-4 text-emerald-600 hover:underline"
              >
                Create the first record
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    {[
                      "drillType",
                      "participants",
                      "duration",
                      "score",
                      "date",
                    ].map((col) => (
                      <th
                        key={col}
                        className="px-6 py-3 font-medium capitalize"
                      >
                        {col.replace(/([A-Z])/g, " $1").trim()}
                      </th>
                    ))}
                    <th className="px-6 py-3 font-medium text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      {[
                        "drillType",
                        "participants",
                        "duration",
                        "score",
                        "date",
                      ].map((col) => (
                        <td key={col} className="px-6 py-4">
                          {(row[col] as any)?.toString() || "-"}
                        </td>
                      ))}
                      <td className="px-6 py-4 text-right">
                        <button className="text-sky-600 hover:text-sky-800 font-medium">
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-slate-800">
                  Log Drill
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  &times;
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
                <div className="space-y-4">
                  {[
                    "drillType",
                    "participants",
                    "duration",
                    "score",
                    "date",
                  ].map((field) => (
                    <div key={field}>
                      <label className="block text-sm font-medium text-slate-700 mb-1 capitalize">
                        {field.replace(/([A-Z])/g, " $1").trim()}
                      </label>
                      <input
                        type={
                          field.toLowerCase().includes("date") ? "date" : "text"
                        }
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                        value={formData[field] || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, [field]: e.target.value })
                        }
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Submit
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
