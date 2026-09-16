"use client";

import React, { useEffect, useState } from "react";
import { AppShell } from "../../components/layout/AppShell";
import { apiClient } from "../../lib/api";

interface WorkflowTask {
  id: string;
  stepKey: string;
  assignedRoleCode?: string;
  assignedToUserId?: string;
  status: string;
  dueAt?: string;
  createdAt: string;
  workflowInstance: {
    id: string;
    entityType: string;
    entityId: string;
    currentState: string;
  };
}

interface InboxSummary {
  counts: {
    totalPending: number;
    myTasks: number;
    pendingApprovals: number;
    hiraReviews: number;
    capaActions: number;
    overdue: number;
  };
  sections: {
    myTasks: WorkflowTask[];
    pendingApprovals: WorkflowTask[];
    hiraReviews: WorkflowTask[];
    capaActions: WorkflowTask[];
    overdue: WorkflowTask[];
  };
}

export default function InboxPage() {
  const [activeTab, setActiveTab] = useState<
    "myTasks" | "pendingApprovals" | "hiraReviews" | "overdue"
  >("myTasks");
  const [summary, setSummary] = useState<InboxSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInbox() {
      setLoading(true);
      try {
        const res = await apiClient<InboxSummary>("/inbox");
        if (res.success && res.data) {
          setSummary(res.data);
        }
      } catch (err) {
        console.error("Failed to load inbox:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchInbox();
  }, []);

  const tasksToDisplay = summary?.sections?.[activeTab] || [];

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Unified Workflow Inbox
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Authoritative queue of action items, approvals, and compliance
          verifications across all plants.
        </p>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">
            My Assigned Tasks
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {summary?.counts.myTasks ?? 0}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">
            Pending Approvals
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-1">
            {summary?.counts.pendingApprovals ?? 0}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">HIRA Reviews</div>
          <div className="text-2xl font-bold text-sky-600 mt-1">
            {summary?.counts.hiraReviews ?? 0}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">
            Overdue Items
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-1">
            {summary?.counts.overdue ?? 0}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="flex border-b border-slate-200 px-4 pt-2 gap-2 bg-slate-50/50">
          <button
            onClick={() => setActiveTab("myTasks")}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition ${
              activeTab === "myTasks"
                ? "border-sky-600 text-sky-600 bg-white shadow-xs"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            My Tasks ({summary?.counts.myTasks ?? 0})
          </button>
          <button
            onClick={() => setActiveTab("pendingApprovals")}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition ${
              activeTab === "pendingApprovals"
                ? "border-sky-600 text-sky-600 bg-white shadow-xs"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            Pending Approvals ({summary?.counts.pendingApprovals ?? 0})
          </button>
          <button
            onClick={() => setActiveTab("hiraReviews")}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition ${
              activeTab === "hiraReviews"
                ? "border-sky-600 text-sky-600 bg-white shadow-xs"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            HIRA Reviews ({summary?.counts.hiraReviews ?? 0})
          </button>
          <button
            onClick={() => setActiveTab("overdue")}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition ${
              activeTab === "overdue"
                ? "border-sky-600 text-sky-600 bg-white shadow-xs"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            Overdue ({summary?.counts.overdue ?? 0})
          </button>
        </div>

        {/* Tasks Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-6 py-3">Task ID</th>
                <th className="px-6 py-3">Module</th>
                <th className="px-6 py-3">Target Entity</th>
                <th className="px-6 py-3">Assigned Role</th>
                <th className="px-6 py-3">Current Step</th>
                <th className="px-6 py-3">Due Date</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    Loading authoritative workflow tasks from PostgreSQL...
                  </td>
                </tr>
              ) : tasksToDisplay.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    No active tasks in this queue. All compliance requirements
                    are up to date.
                  </td>
                </tr>
              ) : (
                tasksToDisplay.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4 font-mono text-slate-800">
                      {task.id.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                        {task.workflowInstance.entityType}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-700">
                      {task.workflowInstance.entityId.slice(0, 12)}...
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {task.assignedRoleCode || "Direct User Assignment"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        {task.stepKey}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {task.dueAt
                        ? new Date(task.dueAt).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <a
                        href={`/hira/${task.workflowInstance.entityId}`}
                        className="inline-flex items-center px-2.5 py-1 rounded bg-slate-900 text-white font-medium hover:bg-slate-800 transition text-[11px]"
                      >
                        Execute Action
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
