import { useState, type FormEvent } from "react";
import Logo from "./Logo";

const USERNAME = "QGE@1983";
const PASSWORD_SHA256 = "9033d010904f493397296c5cdb334b211e12868b17c83ac1fc198ce756289284";

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function Login({ onLogin }: { onLogin: (remember: boolean) => void }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      const passwordHash = await sha256(pass);
      await new Promise((resolve) => setTimeout(resolve, 250));

      if (user.trim().toUpperCase() === USERNAME && passwordHash === PASSWORD_SHA256) {
        onLogin(remember);
        return;
      }

      setError("Invalid username or password");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } catch {
      setError("Unable to verify password in this browser");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-neutral-50 flex items-center justify-center px-5 py-10">
      {/* Decorative background */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-[28rem] w-[28rem] rounded-full border-[56px] border-red-500/90" />
      <div className="pointer-events-none absolute -bottom-48 -left-40 h-[30rem] w-[30rem] rounded-full border-[56px] border-neutral-900/90" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.9),rgba(255,255,255,0.4))]" />

      <div className={`relative w-full max-w-sm ${shake ? "animate-shake" : ""}`}>
        <div className="rounded-3xl bg-white/95 backdrop-blur shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] ring-1 ring-black/5 p-7">
          <div className="flex flex-col items-center text-center">
            <Logo className="h-20 w-20" />
            <h1 className="mt-4 text-xl font-extrabold tracking-tight text-neutral-900">
              QAISER GROUP <span className="text-red-600">OF ELECTRONICS</span>
            </h1>
            <p className="mt-1 text-sm text-neutral-500">Salesman Rate Portal</p>
          </div>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Username</label>
              <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 focus-within:border-red-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-red-500/10 transition">
                <svg className="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.1a7.5 7.5 0 0115 0A17.9 17.9 0 0112 21.75c-2.7 0-5.2-.6-7.5-1.65z" />
                </svg>
                <input
                  value={user}
                  onChange={(e) => { setUser(e.target.value); setError(""); }}
                  autoComplete="username"
                  autoCapitalize="characters"
                  placeholder="Enter username"
                  className="w-full bg-transparent py-3 text-[15px] outline-none placeholder:text-neutral-400"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Password</label>
              <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 focus-within:border-red-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-red-500/10 transition">
                <svg className="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <input
                  type={show ? "text" : "password"}
                  value={pass}
                  onChange={(e) => { setPass(e.target.value); setError(""); }}
                  autoComplete="current-password"
                  placeholder="Enter password"
                  className="w-full bg-transparent py-3 text-[15px] outline-none placeholder:text-neutral-400"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="text-xs font-semibold text-neutral-500 hover:text-red-600"
                >
                  {show ? "HIDE" : "SHOW"}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-neutral-600 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 accent-red-600"
              />
              Keep me signed in
            </label>

            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-gradient-to-r from-red-600 to-red-500 py-3.5 text-[15px] font-bold text-white shadow-lg shadow-red-600/25 transition hover:brightness-105 active:scale-[0.99] disabled:opacity-70"
            >
              {busy ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>
        <p className="mt-5 text-center text-xs text-neutral-400">
          © {new Date().getFullYear()} Qaiser Group of Electronics · Since 1983
        </p>
      </div>
    </div>
  );
}
