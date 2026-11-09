"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, RefreshCw, ShieldCheck, Users, ArrowRight, AlertCircle } from "lucide-react";

type Workspace = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  base_currency: string;
  created_at: string;
  planKey: string;
  subscriptionStatus: string;
  billingInterval: string;
  billingCurrency: string;
  activeUsers: number;
};

export default function SuperAdminPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (manual = false) => {
    manual ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/saas/admin/workspaces", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load customer workspaces.");
      setWorkspaces(Array.isArray(data.workspaces) ? data.workspaces : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load customer workspaces.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const active = workspaces.filter((w) => w.is_active).length;
  const paid = workspaces.filter((w) => w.planKey === "pro" && w.subscriptionStatus === "active").length;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white"><ShieldCheck size={25} /></span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-rose-600">JBCS Business Suite</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight">Platform administration</h1>
              <p className="mt-1 text-sm text-slate-500">Manage and enter customer workspaces across the platform.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void load(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-100 disabled:opacity-60"><RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />Refresh</button>
            <Link href="/workspace/finance" className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700">Current workspace</Link>
          </div>
        </header>

        {error && <div role="alert" className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><AlertCircle size={18} className="mt-0.5 shrink-0" /><div><strong>Could not open platform administration.</strong><p className="mt-1">{error}</p><p className="mt-2 text-xs">Super Admin access is controlled by the server-side JBCS_ADMIN_EMAIL setting.</p></div></div>}

        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Registered workspaces</p><p className="mt-2 text-3xl font-bold">{loading ? "—" : workspaces.length}</p></article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Active workspaces</p><p className="mt-2 text-3xl font-bold">{loading ? "—" : active}</p></article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Active Pro subscriptions</p><p className="mt-2 text-3xl font-bold">{loading ? "—" : paid}</p></article>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div><h2 className="font-bold">Customer workspaces</h2><p className="mt-1 text-sm text-slate-500">Choose a workspace to administer it with your Super Admin privileges.</p></div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{workspaces.length} businesses</span>
          </div>
          {loading ? <div className="p-8 text-sm text-slate-500">Loading customer workspaces…</div> : workspaces.length === 0 ? <div className="p-8 text-sm text-slate-500">No customer workspaces were found.</div> : (
            <div className="divide-y divide-slate-100">
              {workspaces.map((workspace) => (
                <article key={workspace.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Building2 size={21} /></span>
                    <div className="min-w-0">
                      <h3 className="font-bold">{workspace.name}</h3>
                      <p className="mt-1 break-all text-xs text-slate-500">{workspace.slug}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className={workspace.is_active ? "rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700" : "rounded-full bg-rose-50 px-2.5 py-1 font-semibold text-rose-700"}>{workspace.is_active ? "Active workspace" : "Inactive workspace"}</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">{workspace.planKey === "pro" ? "Pro Accounting" : "Basic"}</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{workspace.subscriptionStatus}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 md:justify-end">
                    <div className="text-sm text-slate-600"><div className="flex items-center gap-1.5"><Users size={15} />{workspace.activeUsers} active user(s)</div><p className="mt-1 text-xs text-slate-400">Billing: annual · {workspace.billingCurrency}</p></div>
                    {workspace.is_active && <form action="/api/saas/select-workspace" method="post"><input type="hidden" name="workspace_id" value={workspace.id} /><button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">Open workspace <ArrowRight size={15} /></button></form>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        <p className="mt-5 text-xs leading-5 text-slate-500">Super Admin access is platform-wide. Use it responsibly; sensitive customer actions should be audited as the platform grows.</p>
      </div>
    </main>
  );
}
