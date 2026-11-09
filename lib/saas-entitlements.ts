export type SaasFeature =
  | "invoicing"
  | "quotes"
  | "sales"
  | "expenses"
  | "basic_dashboard"
  | "full_accounting"
  | "advanced_reports"
  | "bank_reconciliation";

type EntitledContext = {
  isSuperAdmin?: boolean;
  planFeatures?: Record<string, unknown>;
};

export function hasSaasFeature(ctx: EntitledContext, feature: SaasFeature): boolean {
  if (ctx.isSuperAdmin) return true;
  return ctx.planFeatures?.[feature] === true;
}

export function saasFeatureError(feature: SaasFeature) {
  const labels: Record<SaasFeature, string> = {
    invoicing: "invoicing",
    quotes: "quotations",
    sales: "sales recording",
    expenses: "expense recording",
    basic_dashboard: "the basic dashboard",
    full_accounting: "full accounting",
    advanced_reports: "advanced financial reports",
    bank_reconciliation: "bank reconciliation",
  };
  return `Your current plan does not include ${labels[feature]}. Upgrade to Pro Accounting to unlock this feature.`;
}
