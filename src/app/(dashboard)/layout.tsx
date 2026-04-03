"use client";

import { SiteProvider } from "@/lib/site-context";
import AppLayout from "@/components/AppLayout";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SiteProvider>
      <AppLayout>{children}</AppLayout>
    </SiteProvider>
  );
}
