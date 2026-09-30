import type { Metadata } from "next";
import { TenantExplorer } from "@/components/tenants/TenantExplorer";

export const metadata: Metadata = {
  title: "Mieter",
  description: "Alle Firmen im Prime Tower und auf dem Maag-Areal: Profile, Geschosse, Logos und Quellen. Every company in the Prime Tower and on the Maag site.",
};

export default function TenantsPage() {
  return <TenantExplorer />;
}
