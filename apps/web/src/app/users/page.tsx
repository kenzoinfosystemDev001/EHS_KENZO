"use client";

import { useEffect, useState } from "react";
import { AppShell } from "../../components/layout/AppShell";
import { apiClient } from "../../lib/api";

interface UserItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  lastLoginAt: string | null;
  userRoles: Array<{
    role: { code: string; name: string };
    plant: { code: string; name: string } | null;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  INACTIVE: "bg-slate-100 text-slate-600 border-slate-200",
  SUSPENDED: "bg-red-50 text-red-700 border-red-200",
  INVITED: "bg-amber-50 text-amber-700 border-amber-200",
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const fetchUsers = () => {
    setLoading(true);
    apiClient<UserItem[]>("/users").then((res) => {
      if (res.success && Array.isArray(res.data)) setUsers(res.data);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSeedAll = async () => {
    try {
      setSeeding(true);
      await apiClient("/users/seed-all", { method: "POST" });
      fetchUsers();
    } catch (err: any) {
      console.error(err);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Users & Roles Directory (19 Roles)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Enterprise user directory, hierarchical scopes, and 8-stage workflow roles.
          </p>
        </div>
        <button
          onClick={handleSeedAll}
          disabled={seeding}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition"
        >
          {seeding ? "Provisioning..." : "Sync / Ensure 19 Roles"}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50">
          <span className="text-xs font-semibold text-slate-700">
            {users.length} Users
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Roles</th>
                <th className="px-6 py-3">Last Login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {u.firstName} {u.lastName}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{u.email}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${STATUS_COLORS[u.status] ?? "bg-slate-100 text-slate-600"}`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {u.userRoles.map((ur, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-sky-50 text-sky-700 border border-sky-200"
                          >
                            {ur.role.code}
                            {ur.plant && (
                              <span className="ml-1 text-sky-400">
                                @ {ur.plant.code}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {u.lastLoginAt
                        ? new Date(u.lastLoginAt).toLocaleString()
                        : "Never"}
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
