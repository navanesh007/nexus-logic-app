import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { mockAuth } from "@/lib/mock-auth";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const u = mockAuth.getUser();
    if (!u) return;
    setEmail(u.email);
    setPhone(u.phone);
    setDisplayName(u.displayName);
  }, []);

  async function save() {
    setSaving(true);
    mockAuth.updateDisplayName(displayName);
    setSaving(false);
    toast.success("Profile saved");
  }

  async function signOut() {
    mockAuth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <main className="mx-auto max-w-md px-5 pt-12 animate-fade-up space-y-4">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Profile</h1>

      <div className="flex items-center gap-4 rounded-3xl glass-strong p-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-brand">
          <UserIcon className="h-6 w-6 text-white" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-base font-semibold">{displayName || "You"}</div>
          <div className="truncate text-xs text-muted-foreground">{email ?? phone ?? ""}</div>
        </div>
      </div>

      <div className="rounded-3xl glass-strong p-5 space-y-3">
        <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Display name
        </label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-violet"
        />
        <button
          onClick={save}
          disabled={saving}
          className="w-full rounded-xl gradient-brand py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <button
        onClick={signOut}
        className="flex w-full items-center justify-center gap-2 rounded-2xl glass px-4 py-3 text-sm font-medium text-destructive hover:bg-white/10"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </main>
  );
}