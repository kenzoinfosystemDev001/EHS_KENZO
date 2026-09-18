"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../lib/auth-context";

function LoginFormContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (!isLoading && user) {
      const from = searchParams.get("from");
      const target = !from || from === "/" ? "/dashboard" : from;
      router.replace(target);
    }
  }, [user, isLoading, router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await login(email, password);
      const from = searchParams.get("from");
      const target = !from || from === "/" ? "/dashboard" : from;
      router.replace(target);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Login failed. Please check your credentials.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-500 text-sm">Restoring session...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 mb-4">
            Kenzo Infosystems Pvt Ltd
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            Kenzo EHS Platform
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Sign in with your enterprise credentials
          </p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="block text-sm font-medium text-slate-700 mb-1"
              htmlFor="email"
            >
              Enterprise Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@kenzo-ehs.com"
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium text-slate-700 mb-1"
              htmlFor="password"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Authenticating..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Select From 19 Enterprise Roles (1-Click Fill)
            </p>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-semibold">
              Pass: KenzoEHS@2026!
            </span>
          </div>

          <p className="text-[11px] text-slate-500 mb-2">
            Click any role to test its specific dashboard view and the 8-stage issue escalation workflow:
          </p>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            <div>
              <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">
                🔥 8-Stage Issue Escalation Chain
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  { stage: 1, role: "Field Worker", email: "worker@kenzo-ehs.com", desc: "Spots issue, takes photo, submits" },
                  { stage: 2, role: "Worker Head", email: "worker.head@kenzo-ehs.com", desc: "Verifies on site & forwards" },
                  { stage: 3, role: "Dept Head", email: "dept.head@kenzo-ehs.com", desc: "Reviews operations & forwards" },
                  { stage: 4, role: "Contractor Coord", email: "contractor.coordinator@kenzo-ehs.com", desc: "Assesses repairs & forwards" },
                  { stage: 5, role: "HSE Manager", email: "hse.manager@kenzo-ehs.com", desc: "Verifies safety compliance" },
                  { stage: 6, role: "Health Inspector", email: "health.inspector@kenzo-ehs.com", desc: "Clears hygiene & health" },
                  { stage: 7, role: "Sub Admin", email: "subadmin@kenzo-ehs.com", desc: "Pre-approves risk & forwards" },
                  { stage: 8, role: "Admin", email: "admin@kenzo-ehs.com", desc: "Approves, assigns staff, slot & funds" },
                ].map((item) => (
                  <button
                    key={item.email}
                    type="button"
                    onClick={() => {
                      setEmail(item.email);
                      setPassword("KenzoEHS@2026!");
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg border text-xs transition flex items-center justify-between ${
                      email === item.email
                        ? "bg-sky-50 border-sky-400 text-sky-900 font-medium"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div>
                      <span className="inline-block w-4 h-4 rounded-full bg-slate-200 text-slate-800 text-[9px] font-bold text-center leading-4 mr-1.5">
                        {item.stage}
                      </span>
                      <span className="font-semibold">{item.role}</span>
                      <span className="text-[10px] text-slate-500 ml-1.5">({item.email})</span>
                    </div>
                    <span className="text-[10px] text-slate-400">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Other Enterprise Roles
              </div>
              <div className="grid grid-cols-1 gap-1">
                {[
                  { role: "System Admin", email: "sysadmin@kenzo-ehs.com" },
                  { role: "Plant Head", email: "plant.head@kenzo-ehs.com" },
                  { role: "Safety Officer", email: "safety.officer@kenzo-ehs.com" },
                  { role: "Maintenance Head", email: "maintenance.head@kenzo-ehs.com" },
                  { role: "Permit Issuer", email: "permit.issuer@kenzo-ehs.com" },
                  { role: "Safety Trainer", email: "trainer@kenzo-ehs.com" },
                  { role: "L&D Manager", email: "ld.manager@kenzo-ehs.com" },
                  { role: "Environment Manager", email: "environment.manager@kenzo-ehs.com" },
                  { role: "Industrial Hygienist", email: "hygienist@kenzo-ehs.com" },
                  { role: "Emergency Coord", email: "emergency.coord@kenzo-ehs.com" },
                  { role: "Contractor Workman", email: "contractor.workman@kenzo-ehs.com" },
                ].map((item) => (
                  <button
                    key={item.email}
                    type="button"
                    onClick={() => {
                      setEmail(item.email);
                      setPassword("KenzoEHS@2026!");
                    }}
                    className={`w-full text-left px-2 py-1 rounded border text-xs transition flex items-center justify-between ${
                      email === item.email
                        ? "bg-sky-50 border-sky-400 text-sky-900 font-medium"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span>{item.role}</span>
                    <span className="text-[10px] text-slate-400">{item.email}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-slate-500 text-sm">Loading...</div>
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
