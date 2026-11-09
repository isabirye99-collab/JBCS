import { redirect } from "next/navigation";
import "../finance.css";
import FinanceModule from "./FinanceModule";

export default async function FinanceModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = await params;

  // Products & Services now has its own static route at
  // /workspace/finance/items, so it must not be redirected to the dashboard.
  if (module === "recurring" || module === "settings") {
    redirect("/workspace/finance");
  }

  return <FinanceModule module={module} />;
}
