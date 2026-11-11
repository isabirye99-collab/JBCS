"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CircleDollarSign,
  CreditCard,
  FileCheck,
  FileText,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  Truck,
  UsersRound,
  Wallet,
} from "lucide-react";

type FinanceSidebarProps = {
  /** Optional route override when a page needs an explicit active item. */
  activeHref?: string;
};

const navigation = [
  { label: "Dashboard", href: "/workspace/finance", icon: LayoutDashboard },
  { label: "Invoices", href: "/workspace/finance/invoices", icon: FileText },
  { label: "Quotations", href: "/workspace/finance/quotes", icon: FileCheck },
  { label: "Payments", href: "/workspace/finance/payments", icon: CreditCard },
  { label: "Sales Receipts", href: "/workspace/finance/sales-receipts", icon: Receipt },
  { label: "Expenses", href: "/workspace/finance/expenses", icon: Wallet },
  { label: "Supplier Payments", href: "/workspace/finance/supplier-payments", icon: Truck },
  { label: "Owner Income & Commissions", href: "/workspace/finance/owner-income", icon: CircleDollarSign },
  { label: "Customers", href: "/workspace/finance/customers", icon: UsersRound },
  { label: "Products & Services", href: "/workspace/finance/items", icon: Package },
  { label: "Reports", href: "/workspace/finance/reports", icon: BarChart3 },
  { label: "Settings", href: "/workspace/settings", icon: Settings },
];

function isCurrentRoute(currentPath: string, href: string) {
  if (currentPath === href) return true;
  // The dashboard route is the parent of all finance routes, so only match it exactly.
  if (href === "/workspace/finance") return false;
  return currentPath.startsWith(`${href}/`);
}

export default function FinanceSidebar({ activeHref }: FinanceSidebarProps) {
  const pathname = usePathname() || "/workspace/finance";
  const currentPath = activeHref || pathname;

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col border-r border-slate-200 bg-white md:flex">
        <Link
          href="/workspace/finance"
          aria-label="Johden Business Suite finance overview"
          className="flex min-h-[98px] items-center gap-3 border-b border-slate-100 px-4"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#f5dfe2] bg-white">
            <img src="/johden-logo.svg" alt="" className="h-full w-full object-contain" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-extrabold tracking-wide text-slate-900">JOHDEN</span>
            <span className="mt-0.5 block text-[10px] font-bold tracking-[.15em] text-[#F3192D]">
              BUSINESS SUITE
            </span>
          </span>
        </Link>

        <div className="px-4 pb-2 pt-6 text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">
          Finance &amp; Billing
        </div>

        <nav aria-label="Finance navigation" className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isCurrentRoute(currentPath, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold leading-5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F3192D] ${
                  active
                    ? "bg-[#F3192D] text-white shadow-sm"
                    : "text-slate-700 hover:bg-[#fff5f5] hover:text-[#C91024]"
                }`}
              >
                <Icon size={18} strokeWidth={1.9} className="shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1">{item.label}</span>
                {active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white" aria-hidden="true" />}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 px-4 py-4">
          <p className="text-[11px] font-semibold text-slate-700">Johden Business Suite</p>
          <p className="mt-1 text-[10px] leading-4 text-slate-500">Finance &amp; Billing</p>
        </div>
      </aside>

      <nav
        aria-label="Mobile finance navigation"
        className="mb-4 flex max-w-full gap-2 overflow-x-auto px-3 pb-2 pt-3 md:hidden"
      >
        {navigation.map((item) => {
          const active = isCurrentRoute(currentPath, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F3192D] ${
                active
                  ? "border-[#F3192D] bg-[#F3192D] text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-rose-200 hover:text-[#C91024]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
