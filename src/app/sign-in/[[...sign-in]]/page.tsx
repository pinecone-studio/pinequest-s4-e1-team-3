"use client";

import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { LeafMark, Petals } from "@/app/landing/_atmosphere";
import "@/app/landing/bloom.css";
import "@/app/landing/bloom-auth.css";

type AuthMode = "login" | "forgot";

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="glyph" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.74-.07-1.45-.2-2.13H12v4.03h5.4a4.62 4.62 0 0 1-2 3.03v2.52h3.23c1.9-1.74 2.97-4.3 2.97-7.45z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.43l-3.23-2.5c-.9.6-2.05.95-3.39.95-2.6 0-4.8-1.76-5.6-4.12H3.07v2.6A10 10 0 0 0 12 22z" />
      <path fill="#FBBC05" d="M6.4 13.9a6 6 0 0 1 0-3.8v-2.6H3.07a10 10 0 0 0 0 9z" />
      <path fill="#EA4335" d="M12 6.18c1.47 0 2.78.5 3.82 1.5l2.85-2.86C16.95 3.2 14.7 2.3 12 2.3a10 10 0 0 0-8.93 5.5l3.33 2.6C7.2 7.94 9.4 6.18 12 6.18z" />
    </svg>
  );
}

function AppleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="glyph" aria-hidden="true" fill="#1d1d1f">
      <path d="M16.36 12.78c.03 3.16 2.77 4.21 2.8 4.22-.02.07-.44 1.5-1.45 2.97-.87 1.28-1.78 2.55-3.2 2.57-1.4.03-1.85-.83-3.45-.83-1.6 0-2.1.8-3.42.86-1.38.05-2.43-1.38-3.3-2.65-1.8-2.6-3.18-7.36-1.33-10.57.92-1.6 2.56-2.6 4.34-2.63 1.35-.02 2.62.91 3.45.91.82 0 2.37-1.12 4-.96.68.03 2.6.28 3.83 2.07-.1.06-2.29 1.34-2.27 3.98zM13.9 4.6c.73-.88 1.22-2.11 1.08-3.34-1.05.04-2.32.7-3.07 1.58-.67.78-1.26 2.03-1.1 3.23 1.17.1 2.36-.6 3.09-1.47z" />
    </svg>
  );
}

function PasswordField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [peek, setPeek] = useState(false);
  return (
    <div className="field">
      <label>Password</label>
      <div className="input-wrap">
        <input
          type={peek ? "text" : "password"}
          className="has-icon"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="current-password"
        />
        <button type="button" className="peek" onClick={() => setPeek((p) => !p)}>
          {peek ? "hide" : "show"}
        </button>
      </div>
    </div>
  );
}

export default function SignInPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { signIn } = useSignIn() as any;
  const router = useRouter();
  const isLoaded = !!signIn;

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [remember, setRemember] = useState(true);

  useEffect(() => { setError(""); setLoading(false); }, [mode]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!signIn) return;
    setError(""); setLoading(true);
    try {
      const { error: createError } = await signIn.create({ identifier: email, password });
      if (createError) { setError((createError as any).message ?? "Invalid email or password"); return; }
      const { error: finalizeError } = await signIn.finalize();
      if (finalizeError) { setError((finalizeError as any).message ?? "Could not complete sign-in"); return; }
      window.location.href = "/garden";
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    if (!signIn) return;
    setError(""); setLoading(true);
    try {
      const { error: err } = await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });
      if (err) { setError(err.message ?? "Could not send reset email"); return; }
      setResetSent(true);
    } catch {
      setError("Could not send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: string) {
    if (!signIn) return;
    const { error } = await signIn.sso({
      strategy: provider,
      redirectUrl: "/garden",
      redirectCallbackUrl: window.location.origin + "/sso-callback",
    });
    if (error) setError((error as any).message ?? "OAuth sign-in failed. Please try again.");
  }

  return (
    <div className="bloom-page" style={{ background: "#23271b", minHeight: "unset" }}>
      <div className="auth show" data-layout="split" role="main"
        style={{ position: "relative", minHeight: "100vh" }}>
        {/* Art panel */}
        <div className="auth-art">
          <img src="/garden/garden-bg.png" alt="" />
          <div className="grade" />
          <Petals level="alive" />
          <div className="auth-art-brand"><LeafMark /></div>
          <div className="auth-art-quote">
            <p>&ldquo;Almost everything will work again if you unplug it for a few minutes — including you.&rdquo;</p>
            <div className="by">A small reminder · Anne Lamott</div>
          </div>
        </div>

        {/* Form panel */}
        <div className="auth-panel">
          <div className="auth-panel-top">
            <a className="auth-back" href="/" style={{ textDecoration: "none" }}>
              <span className="arr">←</span> Back to garden
            </a>
            {mode === "login" && (
              <span className="auth-top-alt">
                New to Bloom?{" "}
                <button onClick={() => router.push("/sign-up")}>sign up</button>
              </span>
            )}
            {mode === "forgot" && (
              <span className="auth-top-alt">
                <button onClick={() => setMode("login")}>back to log in</button>
              </span>
            )}
          </div>

          <div className="auth-form-wrap">
            <div className="auth-card">
              {!isLoaded && (
                <p style={{ color: "var(--ink-soft)", fontSize: 15 }}>Loading…</p>
              )}

              {isLoaded && mode === "login" && (
                <>
                  <div className="auth-head">
                    <span className="eyebrow">Welcome back</span>
                    <h2>The garden has missed you</h2>
                    <p>Pick up gently where you left off. Everything you shared is right where you left it.</p>
                  </div>

                  <div className="social-row">
                    <button className="social-btn" type="button" onClick={() => handleOAuth("oauth_google")}>
                      <GoogleGlyph /> Continue with Google
                    </button>
                    <button className="social-btn" type="button" onClick={() => handleOAuth("oauth_apple")}>
                      <AppleGlyph /> Continue with Apple
                    </button>
                  </div>
                  <div className="divider">or with email</div>

                  <button
                    type="button"
                    onClick={() => { setEmail("nnsae920@gmail.com"); setPassword("Nansalmaa#16"); }}
                    style={{
                      width: "100%",
                      padding: "10px",
                      marginBottom: 16,
                      background: "rgba(160,184,154,0.15)",
                      border: "1.5px dashed rgba(160,184,154,0.5)",
                      borderRadius: 10,
                      color: "var(--ink-soft, #7a8c6e)",
                      fontSize: 13.5,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    🌿 Fill demo account
                  </button>

                  <form onSubmit={handleLogin}>
                    {error && <p style={{ color: "var(--blossom)", fontSize: 14, marginBottom: 12 }}>{error}</p>}
                    <div className="field">
                      <label>Email</label>
                      <div className="input-wrap">
                        <input
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          autoComplete="email"
                          required
                        />
                      </div>
                    </div>
                    <PasswordField value={password} onChange={setPassword} placeholder="Your password" />
                    <div className="form-meta">
                      <label className="remember">
                        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                        <span className="box" />Keep me here
                      </label>
                      <button type="button" className="link-forgot" onClick={() => setMode("forgot")}>
                        Forgot password?
                      </button>
                    </div>
                    <button className={`btn block lg auth-submit${loading ? " busy" : ""}`} type="submit" disabled={loading}>
                      {loading ? "Tending your garden…" : "Return to my garden"}
                    </button>
                  </form>
                </>
              )}

              {isLoaded && mode === "forgot" && !resetSent && (
                <>
                  <div className="auth-head">
                    <span className="eyebrow">No worries</span>
                    <h2>Find your way back</h2>
                    <p>Tell us the email tied to your garden and we&apos;ll send a gentle link to set a new password.</p>
                  </div>
                  <form onSubmit={handleForgot}>
                    {error && <p style={{ color: "var(--blossom)", fontSize: 14, marginBottom: 12 }}>{error}</p>}
                    <div className="field">
                      <label>Email</label>
                      <div className="input-wrap">
                        <input
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          autoComplete="email"
                          required
                        />
                      </div>
                    </div>
                    <button className={`btn block lg auth-submit${loading ? " busy" : ""}`} type="submit" disabled={loading}>
                      {loading ? "Sending…" : "Send the link"}
                    </button>
                  </form>
                  <p className="auth-fine">
                    Remembered it?{" "}
                    <button className="link-forgot" onClick={() => setMode("login")}>Back to log in</button>
                  </p>
                </>
              )}

              {isLoaded && mode === "forgot" && resetSent && (
                <div className="sent">
                  <div className="seal">
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M3 7l9 6 9-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
                    </svg>
                  </div>
                  <h2>Check your inbox</h2>
                  <p>We&apos;ve sent a gentle reset link to <span className="em">{email}</span>. It&apos;s good for the next hour. Take your time.</p>
                  <div style={{ marginTop: 28 }}>
                    <button className="btn" onClick={() => setMode("login")}>Back to log in</button>
                  </div>
                  <p style={{ marginTop: 18, fontSize: 14 }}>
                    Didn&apos;t arrive?{" "}
                    <button className="link-forgot" onClick={() => setResetSent(false)}>Try another email</button>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
