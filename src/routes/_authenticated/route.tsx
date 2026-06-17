import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { BottomNav } from "@/components/BottomNav";
import { mockAuth } from "@/lib/mock-auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const user = mockAuth.getUser();
    if (!user) throw redirect({ to: "/auth" });
    return { user };
  },
  component: AuthedShell,
});

function AuthedShell() {
  return (
    <div className="relative min-h-screen pb-28">
      <Outlet />
      <BottomNav />
    </div>
  );
}