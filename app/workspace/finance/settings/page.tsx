import { redirect } from "next/navigation";

export default function FinanceSettingsRedirect() {
  redirect("/workspace/settings");
}