import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-900">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 mb-4">
          Kenzo Infosystems Pvt Ltd
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl mb-3">
          Kenzo EHS Platform
        </h1>
        <p className="text-slate-600 text-base mb-6">
          Enterprise Environment, Health & Safety Management Platform.
          Production-grade modular monolith architecture with PostgreSQL,
          NestJS, and Next.js.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left my-6 p-4 bg-slate-50 rounded-lg border border-slate-200 text-sm">
          <div>
            <div className="font-semibold text-slate-800">Core Engines</div>
            <ul className="list-disc list-inside text-slate-600 mt-1 space-y-1">
              <li>Risk &amp; HIRA Management</li>
              <li>Incident &amp; RCA Engine</li>
              <li>CAPA &amp; Independent Verification</li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-slate-800">
              Governance &amp; Security
            </div>
            <ul className="list-disc list-inside text-slate-600 mt-1 space-y-1">
              <li>19-Role Permission RBAC</li>
              <li>Multi-Plant Scope Isolation</li>
              <li>Atomic DB Audit Trails</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 transition"
          >
            Access Portal
          </Link>
          <a
            href="http://localhost:4000/docs"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-100 transition"
          >
            API Docs (Swagger)
          </a>
        </div>
      </div>
    </main>
  );
}
