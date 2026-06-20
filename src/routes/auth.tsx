import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Mail, Lock, User, AtSign, Eye, EyeOff, Loader2, ArrowRight, ShieldCheck, KeyRound,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Open1 AI" },
      { name: "description", content: "Sign in or create your Open1 AI account." },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup";
type Step = "form" | "otp" | "forgot" | "forgot-otp" | "forgot-new";

const REMEMBER_KEY = "open1.auth.remember";

function scorePassword(p: string): { score: number; label: string; tone: string } {
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  const labels = ["Too short", "Weak", "Fair", "Good", "Strong", "Excellent"];
  const tones = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-lime-500", "bg-green-500", "bg-emerald-400"];
  return { score: s, label: labels[s], tone: tones[s] };
}

function friendly(err: unknown): string {
  const m = (err as Error)?.message?.toLowerCase() ?? "";
  if (m.includes("invalid login")) return "Wrong email or password.";
  if (m.includes("email not confirmed")) return "Please verify your email first.";
  if (m.includes("already registered") || m.includes("already been registered")) return "Email already in use — try signing in.";
  if (m.includes("rate")) return "Too many attempts — please wait a moment.";
  if (m.includes("token") && m.includes("expired")) return "Code expired — request a new one.";
  if (m.includes("invalid") && m.includes("token")) return "Invalid code — double-check and try again.";
  if (m.includes("network")) return "Network issue — check your connection.";
  return (err as Error)?.message || "Something went wrong.";
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signup");
  const [step, setStep] = useState<Step>("form");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        setEmail(saved);
        setRemember(true);
      }
    }
  }, [navigate]);

  const pw = useMemo(() => scorePassword(password), [password]);
  const newPw = useMemo(() => scorePassword(newPassword), [newPassword]);

  function persistRemember() {
    if (typeof window === "undefined") return;
    if (remember) window.localStorage.setItem(REMEMBER_KEY, email);
    else window.localStorage.removeItem(REMEMBER_KEY);
  }

  async function googleSignIn() {
    try {
      setLoading(true);
      const r = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (r.error) throw new Error(r.error.message ?? "Google sign-in failed");
      if (r.redirected) return;
      navigate({ to: "/" });
    } catch (err) {
      toast.error(friendly(err));
    } finally {
      setLoading(false);
    }
  }

  async function submitSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      persistRemember();
      toast.success("Welcome back");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(friendly(err));
    } finally {
      setLoading(false);
    }
  }

  async function submitSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (pw.score < 3) return toast.error("Pick a stronger password.");
    if (!fullName.trim() || !username.trim()) return toast.error("Fill in name and username.");
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { display_name: fullName.trim(), username: username.trim() },
        },
      });
      if (error) throw error;
      persistRemember();
      if (data.session) {
        toast.success("Account created");
        navigate({ to: "/" });
      } else {
        toast.success("We sent a 6-digit code to your email.");
        setStep("otp");
      }
    } catch (err) {
      toast.error(friendly(err));
    } finally {
      setLoading(false);
    }
  }

  async function verifySignupOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: otp.trim(), type: "email" });
      if (error) throw error;
      toast.success("Email verified");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(friendly(err));
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
      toast.success("New code sent");
    } catch (err) {
      toast.error(friendly(err));
    }
  }

  async function sendResetOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Check your email for a 6-digit code.");
      setStep("forgot-otp");
    } catch (err) {
      toast.error(friendly(err));
    } finally {
      setLoading(false);
    }
  }

  async function verifyResetOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: otp.trim(), type: "recovery" });
      if (error) throw error;
      setStep("forgot-new");
    } catch (err) {
      toast.error(friendly(err));
    } finally {
      setLoading(false);
    }
  }

  async function setNewPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPw.score < 3) return toast.error("Pick a stronger password.");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(friendly(err));
    } finally {
      setLoading(false);
    }
  }

  const title =
    step === "otp" ? "Verify your email"
    : step === "forgot" ? "Forgot password"
    : step === "forgot-otp" ? "Enter reset code"
    : step === "forgot-new" ? "Set new password"
    : mode === "signup" ? "Sign Up" : "Welcome back";

  const subtitle =
    step === "otp" ? `We sent a 6-digit code to ${email}.`
    : step === "forgot" ? "Enter your email and we'll send a reset code."
    : step === "forgot-otp" ? `Enter the code we sent to ${email}.`
    : step === "forgot-new" ? "Choose a strong new password."
    : mode === "signup" ? "Create your Open1 AI account." : "Sign in to continue.";

  return (
    <main className="flex min-h-screen items-center justify-center p-5">
      <div className="w-full max-w-md animate-fade-up">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Logo size={56} />
          <h1 className="text-3xl font-bold tracking-tight">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <div className="rounded-3xl glass-strong p-6 shadow-2xl">
          {step === "form" && (
            <>
              <div className="mb-5 grid grid-cols-2 gap-1.5 rounded-2xl bg-white/5 p-1">
                {(["signup", "signin"] as Mode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setMode(m); }}
                    className={`rounded-xl px-3 py-2 text-sm font-semibold transition-all ${
                      mode === m
                        ? "gradient-green text-black shadow-md"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m === "signup" ? "Sign Up" : "Login"}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={googleSignIn}
                disabled={loading}
                className="mb-4 flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-md transition hover:shadow-lg disabled:opacity-60"
              >
                <GoogleIcon /> Continue with Google
              </button>

              <div className="mb-4 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
                <div className="h-px flex-1 bg-white/10" /> Or <div className="h-px flex-1 bg-white/10" />
              </div>

              <form onSubmit={mode === "signup" ? submitSignUp : submitSignIn} className="space-y-3">
                {mode === "signup" && (
                  <>
                    <Field icon={<User className="h-4 w-4" />}>
                      <input
                        type="text"
                        required
                        autoComplete="name"
                        placeholder="Full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className={inputCls}
                      />
                    </Field>
                    <Field icon={<AtSign className="h-4 w-4" />}>
                      <input
                        type="text"
                        required
                        autoComplete="username"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.replace(/\s+/g, "").toLowerCase())}
                        className={inputCls}
                      />
                    </Field>
                  </>
                )}

                <Field icon={<Mail className="h-4 w-4" />}>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputCls}
                  />
                </Field>

                <Field icon={<Lock className="h-4 w-4" />}>
                  <input
                    type={showPw ? "text" : "password"}
                    required
                    minLength={8}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputCls + " pr-10"}
                  />
                  <button
                    type="button"
                    aria-label={showPw ? "Hide password" : "Show password"}
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </Field>

                {mode === "signup" && password.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex h-1.5 gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className={`flex-1 rounded-full transition-all ${i < pw.score ? pw.tone : "bg-white/10"}`}
                        />
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Strength: <span className="font-medium text-foreground">{pw.label}</span> · 8+ chars, mix of cases, number & symbol.
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 text-[12px]">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-3.5 w-3.5 accent-green-500"
                    />
                    Remember me
                  </label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => { setStep("forgot"); setOtp(""); }}
                      className="text-green-accent hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !email || password.length < 8}
                  className="group mt-2 flex w-full items-center justify-center gap-2 rounded-2xl gradient-green px-4 py-3.5 text-base font-bold text-black shadow-lg transition hover:opacity-95 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      {mode === "signup" ? "Create Account" : "Sign in"}
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {step === "otp" && (
            <form onSubmit={verifySignupOtp} className="space-y-4">
              <Field icon={<ShieldCheck className="h-4 w-4" />}>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  placeholder="6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className={inputCls + " tracking-[0.5em] text-center"}
                />
              </Field>
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-green px-4 py-3.5 font-bold text-black disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Continue"}
              </button>
              <div className="flex items-center justify-between text-[12px]">
                <button type="button" onClick={() => setStep("form")} className="text-muted-foreground hover:text-foreground">
                  ← Back
                </button>
                <button type="button" onClick={resendOtp} className="text-green-accent hover:underline">
                  Resend code
                </button>
              </div>
            </form>
          )}

          {step === "forgot" && (
            <form onSubmit={sendResetOtp} className="space-y-4">
              <Field icon={<Mail className="h-4 w-4" />}>
                <input
                  type="email"
                  required
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <button
                type="submit"
                disabled={loading || !email}
                className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-green px-4 py-3.5 font-bold text-black disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset code"}
              </button>
              <button type="button" onClick={() => setStep("form")} className="block w-full text-center text-[12px] text-muted-foreground hover:text-foreground">
                ← Back to sign in
              </button>
            </form>
          )}

          {step === "forgot-otp" && (
            <form onSubmit={verifyResetOtp} className="space-y-4">
              <Field icon={<KeyRound className="h-4 w-4" />}>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  placeholder="6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className={inputCls + " tracking-[0.5em] text-center"}
                />
              </Field>
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-green px-4 py-3.5 font-bold text-black disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify code"}
              </button>
              <button type="button" onClick={() => setStep("forgot")} className="block w-full text-center text-[12px] text-muted-foreground hover:text-foreground">
                ← Back
              </button>
            </form>
          )}

          {step === "forgot-new" && (
            <form onSubmit={setNewPasswordSubmit} className="space-y-3">
              <Field icon={<Lock className="h-4 w-4" />}>
                <input
                  type={showPw ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputCls + " pr-10"}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </Field>
              {newPassword.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex h-1.5 gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className={`flex-1 rounded-full ${i < newPw.score ? newPw.tone : "bg-white/10"}`} />
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">Strength: {newPw.label}</p>
                </div>
              )}
              <button
                type="submit"
                disabled={loading || newPw.score < 3}
                className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-green px-4 py-3.5 font-bold text-black disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          By continuing you agree to our <Link to="/" className="underline">Terms</Link> & <Link to="/" className="underline">Privacy</Link>.
        </p>
      </div>
    </main>
  );
}

const inputCls =
  "w-full rounded-2xl bg-white/5 border border-white/10 pl-11 pr-4 py-3 text-base outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/40 transition placeholder:text-muted-foreground";

function Field({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
      {children}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.45.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.95l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
    </svg>
  );
}
