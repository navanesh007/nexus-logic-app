import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, ArrowRight, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Open1 AI" },
      { name: "description", content: "Sign in to Open1 AI with email and password." },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        // With auto-confirm enabled, a session is established immediately.
        toast.success("Account created");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
      }
      navigate({ to: "/" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md animate-fade-up">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <Logo size={64} />
          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome to <span className="gradient-text">Open1 AI</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === "signin" ? "Sign in to continue." : "Create an account to get started."}
          </p>
        </div>

        <div className="rounded-3xl glass-strong p-6 shadow-2xl">
          <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-white/5 p-1">
            {(["signin", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                  mode === m
                    ? "gradient-brand text-white shadow-lg"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "signin" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl bg-white/5 border border-white/10 pl-11 pr-4 py-3 text-base outline-none focus:border-violet focus:ring-2 focus:ring-ring transition"
              />
            </div>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Password (min 6 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-base outline-none focus:border-violet focus:ring-2 focus:ring-ring transition"
            />
            <button
              type="submit"
              disabled={loading || !email || password.length < 6}
              className="group flex w-full items-center justify-center gap-2 rounded-2xl gradient-brand px-4 py-3 text-base font-semibold text-white shadow-lg shadow-violet/30 transition hover:opacity-95 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {mode === "signin" ? "Sign in" : "Create account"}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
