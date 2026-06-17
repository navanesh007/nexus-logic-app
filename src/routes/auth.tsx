import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, Phone, ArrowRight, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { mockAuth, MOCK_OTP } from "@/lib/mock-auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Open1 AI" },
      { name: "description", content: "Sign in to Open1 AI with email or phone — no password required." },
    ],
  }),
  component: AuthPage,
});

type Method = "email" | "phone";
type Step = "request" | "verify";

function AuthPage() {
  const navigate = useNavigate();
  const [method, setMethod] = useState<Method>("email");
  const [step, setStep] = useState<Step>("request");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mockAuth.isAuthenticated()) navigate({ to: "/" });
  }, [navigate]);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await mockAuth.sendOtp(identifier, method);
      toast.success(`Dev mode: use code ${MOCK_OTP}`);
      setStep("verify");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await mockAuth.verifyOtp(identifier, method, otp);
      if (!result.ok) throw new Error(result.error);
      toast.success("Signed in");
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
            Sign in with a one-time code. No passwords.
          </p>
        </div>

        <div className="rounded-3xl glass-strong p-6 shadow-2xl">
          {step === "request" && (
            <>
              <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-white/5 p-1">
                {(["email", "phone"] as Method[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                      method === m
                        ? "gradient-brand text-white shadow-lg"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m === "email" ? <Mail className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                    {m === "email" ? "Email" : "Mobile"}
                  </button>
                ))}
              </div>

              <form onSubmit={sendOtp} className="space-y-4">
                <input
                  type={method === "email" ? "email" : "tel"}
                  required
                  placeholder={method === "email" ? "you@example.com" : "+1 555 000 1234"}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-base outline-none focus:border-violet focus:ring-2 focus:ring-ring transition"
                />
                <button
                  type="submit"
                  disabled={loading || !identifier}
                  className="group flex w-full items-center justify-center gap-2 rounded-2xl gradient-brand px-4 py-3 text-base font-semibold text-white shadow-lg shadow-violet/30 transition hover:opacity-95 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Send code <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></>}
                </button>
              </form>
            </>
          )}

          {step === "verify" && (
            <form onSubmit={verifyOtp} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code sent to <span className="text-foreground">{identifier}</span>.
              </p>
              <p className="text-xs text-violet-300">
                Dev mode: code is <span className="font-mono font-semibold">{MOCK_OTP}</span>
              </p>
              <input
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                required
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-center text-2xl tracking-[0.6em] font-semibold outline-none focus:border-violet focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-brand px-4 py-3 text-base font-semibold text-white shadow-lg transition hover:opacity-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify & sign in"}
              </button>
              <button
                type="button"
                onClick={() => { setStep("request"); setOtp(""); }}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
              >
                Use a different {method}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}