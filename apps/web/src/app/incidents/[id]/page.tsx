"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";

export default function IncidentDetailPage() {
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock load
    setTimeout(() => {
      setData({
        id: params.id,
        title: "Slips, Trips, Falls",
        status: "Investigation",
        severity: "High",
      });
      setLoading(false);
    }, 500);
  }, [params.id]);

  if (loading)
    return (
      <AppShell>
        <div className="p-8 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
        </div>
      </AppShell>
    );

  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <Link
          href="/incidents"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Incidents
        </Link>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{data?.title}</h1>
            <div className="flex gap-3 mt-2 text-sm">
              <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-md">
                Status: {data?.status}
              </span>
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded-md">
                Severity: {data?.severity}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition">
              Classify
            </button>
            <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition">
              Investigate
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 text-slate-800">
              Timeline & Actions
            </h2>
            <div className="space-y-4">
              <div className="flex gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500" />{" "}
                <span className="text-sm text-slate-600">
                  Immediate area secured
                </span>
              </div>
              <div className="flex gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500" />{" "}
                <span className="text-sm text-slate-600">
                  Medical team notified
                </span>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 text-slate-800">
              Linked RCA / CAPA
            </h2>
            <p className="text-sm text-slate-500">No linked items yet.</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
