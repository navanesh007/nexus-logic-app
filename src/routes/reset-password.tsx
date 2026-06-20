import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Open1 AI" },
      { name: "description", content: "Set a new password for your Open1 AI account." },
    ],
  }),
  component: ResetPasswordPage,
});

function score(p: string) {
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
}

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase reset link sets the session via hash; just check we have one.
    void supabase.auth.getSession().then(({ data }) => {
      setReady(!!data.session);
    });
  }, []);

  const s = useMemo(() => score(password), [password]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (s < 3) return toast.error("Pick a stronger password.");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated");
      navigate({ to: "/" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-5">
      <div className="w-full max-w-md animate-fade-up">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Logo size={56} />
          <h1 className="text-3xl font-bold tracking-tight">Reset password</h1>
          <p className="text-sm text-muted-foreground">Choose a strong new password.</p>
        </div>
        <div className="rounded-3xl glass-strong p-6 shadow-2xl">
          {!ready ? (
            <p className="text-center text-sm text-muted-foreground">
              This link is invalid or has expired. Request a new one from the sign-in page.
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={show ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl bg-white/5 border border-white/10 pl-11 pr-10 py-3 text-base outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/40"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="flex h-1.5 gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className={`flex-1 rounded-full ${i < s ? "bg-green-500" : "bg-white/10"}`} />
                  ))}
                </div>
              )}
              <button
                type="submit"
                disabled={loading || s < 3}
                className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-green px-4 py-3.5 font-bold text-black disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
