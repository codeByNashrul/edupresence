import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AuthProvider from "@/components/SessionProvider";
import { DashboardShell } from "@/components/shared/DashboardShell";

export default async function OrtuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ORTU") {
    redirect("/dashboard");
  }

  return (
    <AuthProvider>
      <DashboardShell role="ORTU">{children}</DashboardShell>
    </AuthProvider>
  );
}
