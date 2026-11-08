import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceToken, normalizePhoneNumber, notifyActiveDeviceSessionVerified } from "@/lib/phase4b";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type AuthSearch = { next?: string; ref?: string; reason?: string };

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): AuthSearch => ({
    next: typeof s.next === "string" ? s.next : undefined,
    ref: typeof s.ref === "string" ? s.ref.trim().toUpperCase() : undefined,
    reason: typeof s.reason === "string" ? s.reason : undefined,
  }),
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in – Eklavya" },
      { name: "description", content: "Sign in to Eklavya to sync bookmarks and grant access to your account." },
      { property: "og:title", content: "Sign in – Eklavya" },
      { property: "og:description", content: "Securely sign in to Eklavya using a phone verification code or email." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function sanitizeNext(raw?: string): string {
  if (!raw) return "/";
  // Same-origin relative path only.
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

function AuthPage() {
  const search = useSearch({ from: "/auth" });
  const next = sanitizeNext(search.next);
  const referralCode = search.ref ?? (typeof window !== "undefined" ? window.localStorage.getItem("eklavya:pending-referral") ?? undefined : undefined);

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [method, setMethod] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (search.ref && typeof window !== "undefined") window.localStorage.setItem("eklavya:pending-referral", search.ref);
    let cancelled = false;
    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled || !data.session) return;
      const { data: active, error } = await supabase.rpc("ensure_active_device_session");
      if (cancelled) return;
      if (!error && active) {
        window.location.href = next;
      } else if (!error && active === false) {
        await supabase.auth.signOut({ scope: "local" });
        setInfo("Your account was logged in on another device.");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [next]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown((remaining) => Math.max(0, remaining - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (search.reason === "device") {
      setInfo("Your account was logged in on another device.");
    }
  }, [search.reason]);

  async function claimCurrentDevice() {
    const { data, error } = await supabase.rpc("ensure_active_device_session");
    if (error || data !== true) {
      await supabase.auth.signOut({ scope: "local" });
      throw new Error("We couldn't verify this sign-in. Please try again.");
    }
    const { data: current } = await supabase.auth.getUser();
    if (current.user) notifyActiveDeviceSessionVerified(current.user.id);
  }

  async function sendPhoneOtp(event: React.FormEvent) {
    event.preventDefault();
    const normalizedPhone = normalizePhoneNumber(phone);
    if (!normalizedPhone) {
      setError("Enter a valid mobile number with country code, or a 10-digit Indian number.");
      return;
    }
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const referralMetadata = referralCode
        ? { referral_code: referralCode, device_token: getDeviceToken() }
        : undefined;
      const { error } = await supabase.auth.signInWithOtp({
        phone: normalizedPhone,
        options: { shouldCreateUser: true, ...(referralMetadata ? { data: referralMetadata } : {}) },
      });
      if (error) throw error;
      setPhone(normalizedPhone);
      setOtpSent(true);
      setResendCooldown(60);
      setInfo("A verification code has been sent to your phone.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't send the code. Try again later.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyPhoneOtp(event: React.FormEvent) {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit verification code.");
      return;
    }
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const normalizedPhone = normalizePhoneNumber(phone);
      if (!normalizedPhone) throw new Error("Enter a valid mobile number.");
      const { error } = await supabase.auth.verifyOtp({ phone: normalizedPhone, token: otp, type: "sms" });
      if (error) throw error;
      await claimCurrentDevice();
      window.localStorage.removeItem("eklavya:pending-referral");
      window.location.href = next;
    } catch (err) {
      const message = err instanceof Error ? err.message : "The code is invalid or expired. Request a new code and try again.";
      setError(/otp|token|expired|invalid/i.test(message) ? "That code is invalid or expired. Check it or request a new code." : message);
    } finally {
      setBusy(false);
    }
  }

  async function resendPhoneOtp() {
    if (resendCooldown > 0 || busy) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const normalizedPhone = normalizePhoneNumber(phone);
      if (!normalizedPhone) throw new Error("Enter a valid mobile number.");
      const referralMetadata = referralCode
        ? { referral_code: referralCode, device_token: getDeviceToken() }
        : undefined;
      const { error } = await supabase.auth.signInWithOtp({
        phone: normalizedPhone,
        options: { shouldCreateUser: true, ...(referralMetadata ? { data: referralMetadata } : {}) },
      });
      if (error) throw error;
      setOtp("");
      setResendCooldown(60);
      setInfo("A new verification code has been sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't resend the code. Try again later.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + next,
            data: referralCode ? { referral_code: referralCode, device_token: getDeviceToken() } : { device_token: getDeviceToken() },
          },
        });
        if (error) throw error;
        window.localStorage.removeItem("eklavya:pending-referral");
        setInfo("Check your email to confirm, then sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await claimCurrentDevice();
        window.location.href = next;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lg">
        <div className="mb-6 text-center">
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">← Back home</Link>
          <h1 className="mt-2 text-xl font-semibold text-foreground">
            {method === "phone" ? "Sign in with your phone" : mode === "signin" ? "Sign in to Eklavya" : "Create your Eklavya account"}
          </h1>
          {method === "phone" ? (
            <p className="mt-1 text-xs text-muted-foreground">We’ll send a one-time verification code.</p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">Required to authorize MCP clients and other integrations.</p>
          )}
        </div>
        <div className="mb-4 grid grid-cols-2 rounded-md border border-border p-1 text-xs">
          <button type="button" onClick={() => { setMethod("phone"); setError(null); setInfo(null); }} className={`rounded px-3 py-2 ${method === "phone" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Phone OTP</button>
          <button type="button" onClick={() => { setMethod("email"); setError(null); setInfo(null); }} className={`rounded px-3 py-2 ${method === "email" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Email & password</button>
        </div>
        {method === "phone" ? (
          otpSent ? (
            <form onSubmit={verifyPhoneOtp} className="space-y-3">
              <p className="text-sm text-muted-foreground">Code sent to {phone}</p>
              <InputOTP maxLength={6} pattern="[0-9]*" value={otp} onChange={setOtp} aria-label="6-digit verification code">
                <InputOTPGroup className="justify-center gap-2">
                  {Array.from({ length: 6 }, (_, index) => <InputOTPSlot key={index} index={index} className="rounded-md border border-input" />)}
                </InputOTPGroup>
              </InputOTP>
              {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
              {info && <p className="text-xs text-emerald-600" role="status">{info}</p>}
              <button type="submit" disabled={busy || otp.length !== 6} className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
                {busy ? "Verifying…" : "Verify code and sign in"}
              </button>
              <div className="flex items-center justify-between text-xs">
                <button type="button" disabled={busy || resendCooldown > 0} onClick={() => void resendPhoneOtp()} className="text-primary disabled:text-muted-foreground">
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
                </button>
                <button type="button" disabled={busy} onClick={() => { setOtpSent(false); setOtp(""); setError(null); setInfo(null); }} className="text-muted-foreground hover:text-foreground">Change number</button>
              </div>
            </form>
          ) : (
            <form onSubmit={sendPhoneOtp} className="space-y-3">
              <label className="block">
                <span className="text-xs font-medium text-foreground">Mobile number</span>
                <input type="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91 98765 43210" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" autoComplete="tel" />
              </label>
              {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
              {info && <p className="text-xs text-emerald-600" role="status">{info}</p>}
              <button type="submit" disabled={busy} className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
                {busy ? "Sending code…" : "Send OTP"}
              </button>
              <p className="text-center text-xs text-muted-foreground">New mobile numbers are registered after OTP verification.</p>
            </form>
          )
        ) : <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="text-xs font-medium text-foreground">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              autoComplete="email"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-foreground">Password</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
          </label>
          {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
          {info && <p className="text-xs text-emerald-600" role="status">{info}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>}
        {method === "email" && <div className="mt-4 flex flex-col gap-2 text-center text-xs">
          <button
            onClick={() => {
              setError(null);
              setInfo(null);
              setMode(mode === "signin" ? "signup" : "signin");
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </button>
          {mode === "signin" && (
            <Link to="/forgot-password" className="text-primary hover:underline">
              Forgot password?
            </Link>
          )}
        </div>}
      </div>
    </main>
  );
}
