import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AuthProvider from "@/components/SessionProvider";
import { DashboardShell } from "@/components/shared/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <AuthProvider>
      <DashboardShell role={session.user.role} user={session.user}>
        {children}
      </DashboardShell>
    </AuthProvider>
  );
}
