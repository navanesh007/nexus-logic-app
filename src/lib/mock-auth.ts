// Temporary mock auth — swap with Supabase OTP later.
// Public API mirrors what we need from supabase.auth so the call sites
// can be replaced without touching the rest of the app.

const STORAGE_KEY = "open1.mockAuth";
export const MOCK_OTP = "123321";

export type MockUser = {
  id: string;
  email: string | null;
  phone: string | null;
  displayName: string;
};

function read(): MockUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MockUser) : null;
  } catch {
    return null;
  }
}

function write(user: MockUser | null) {
  if (typeof window === "undefined") return;
  if (user) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  else window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("mock-auth-change"));
}

export const mockAuth = {
  getUser: read,
  isAuthenticated: () => read() !== null,
  // Pretend to send a code. Always succeeds; OTP is always MOCK_OTP.
  async sendOtp(_identifier: string, _method: "email" | "phone") {
    await new Promise((r) => setTimeout(r, 300));
    return { ok: true as const };
  },
  async verifyOtp(identifier: string, method: "email" | "phone", code: string) {
    await new Promise((r) => setTimeout(r, 300));
    if (code !== MOCK_OTP) return { ok: false as const, error: "Invalid code" };
    const user: MockUser = {
      id: `mock-${method}-${identifier}`,
      email: method === "email" ? identifier : null,
      phone: method === "phone" ? identifier : null,
      displayName: identifier.split("@")[0] ?? identifier,
    };
    write(user);
    return { ok: true as const, user };
  },
  signOut() {
    write(null);
  },
  updateDisplayName(name: string) {
    const u = read();
    if (!u) return;
    write({ ...u, displayName: name });
  },
  onChange(cb: () => void) {
    if (typeof window === "undefined") return () => {};
    window.addEventListener("mock-auth-change", cb);
    window.addEventListener("storage", cb);
    return () => {
      window.removeEventListener("mock-auth-change", cb);
      window.removeEventListener("storage", cb);
    };
  },
};