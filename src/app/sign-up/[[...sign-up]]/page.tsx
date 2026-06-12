"use client";

import { useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { LeafMark, Petals } from "@/app/landing/_atmosphere";
import "@/app/landing/bloom.css";
import "@/app/landing/bloom-auth.css";

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

function strength(pw: string): number {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
}

export default function SignUpPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { signUp } = useSignUp() as any;
  const router = useRouter();
  const isLoaded = !!signUp;

  const [step, setStep] = useState<"form" | "verify">("form");
  const [verifyEmail, setVerifyEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [peek, setPeek] = useState(false);
  const sentRef = useRef(false);

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [codeError, setCodeError] = useState("");

  const [form, setForm] = useState({ name: "", email: "", password: "", birthday: "", gender: "" });
  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const pw = form.password;
  const st = strength(pw);
  const stLabels = ["", "a sprout", "taking root", "growing well", "in full bloom"];

  function clearErrors() { setEmailError(""); setPasswordError(""); setGeneralError(""); }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function routeError(err: any) {
    const code: string = err?.code ?? err?.errors?.[0]?.code ?? "";
    const message: string = err?.longMessage ?? err?.message ?? err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message ?? "Something went wrong";
    const lower = message.toLowerCase();
    if (code.startsWith("form_password") || code === "form_param_pwned") {
      setPasswordError(message);
    } else if (code === "form_identifier_exists" || lower.includes("taken") || lower.includes("already exists")) {
      setEmailError("An account with this email already exists. Try signing in instead.");
    } else if (code.includes("email") || code.includes("identifier")) {
      setEmailError(message);
    } else {
      setGeneralError(message);
    }
  }

  useEffect(() => {
    if (!signUp || sentRef.current) return;
    if (
      signUp.status === "missing_requirements" &&
      !signUp.missingFields?.length &&
      signUp.unverifiedFields?.includes("email_address")
    ) {
      sentRef.current = true;
      signUp.verifications.sendEmailCode().then(({ error }: { error: { message?: string } | null }) => {
        if (error) { setGeneralError(error.message ?? "Failed to send code"); sentRef.current = false; return; }
        setVerifyEmail(signUp.emailAddress ?? "");
        setStep("verify");
      });
    }
  }, [signUp?.status]);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!signUp) { setGeneralError("Please wait for authentication to load."); return; }
    clearErrors(); setLoading(true);
    try {
      const { error: createError } = await signUp.create({ emailAddress: form.email, password: form.password });
      if (createError) { routeError(createError); return; }
      if (signUp.missingFields?.includes("password")) {
        setPasswordError("Password is not strong enough. Use uppercase letters, numbers, and symbols.");
        return;
      }
      const { error: sendError } = await signUp.verifications.sendEmailCode();
      if (sendError) { setGeneralError(sendError.message ?? "Failed to send verification email"); return; }
      setVerifyEmail(form.email || signUp.emailAddress || "");
      setStep("verify");
    } catch (err) {
      routeError(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!signUp) return;
    setCodeError(""); setGeneralError(""); setLoading(true);
    try {
      const { error: verifyError } = await signUp.verifications.verifyEmailCode({ code });
      if (verifyError) { setCodeError(verifyError.message ?? "Invalid code"); return; }
      const { error: finalizeError } = await signUp.finalize();
      if (finalizeError) { setGeneralError((finalizeError as any).message ?? "Failed to complete sign-up"); return; }
      await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verifyEmail, birthday: form.birthday, gender: form.gender }),
      });
      window.location.href = "/garden";
    } catch (err) {
      routeError(err);
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    if (!signUp) return;
    setGeneralError("");
    const { error } = await signUp.verifications.sendEmailCode();
    if (error) setGeneralError(error.message ?? "Could not resend code");
  }

  async function handleOAuth(provider: string) {
    if (!signUp) return;
    const { error } = await signUp.sso({
      strategy: provider,
      redirectUrl: "/garden",
      redirectCallbackUrl: window.location.origin + "/sso-callback",
    });
    if (error) setGeneralError((error as any).message ?? "OAuth sign-up failed. Please try again.");
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
            <span className="auth-top-alt">
              Already growing?{" "}
              <button onClick={() => router.push("/sign-in")}>log in</button>
            </span>
          </div>

          <div className="auth-form-wrap">
            <div className="auth-card">
              {!isLoaded && <p style={{ color: "var(--ink-soft)", fontSize: 15 }}>Loading…</p>}

              {isLoaded && step === "form" && (
                <>
                  <div className="auth-head">
                    <span className="eyebrow">New here</span>
                    <h2>Plant your first seed</h2>
                    <p>A quiet place that&apos;s entirely yours. Begin in less than a minute — leave whenever you like.</p>
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

                  <form onSubmit={handleSignUp}>
                    {generalError && <p style={{ color: "var(--blossom)", fontSize: 14, marginBottom: 12 }}>{generalError}</p>}

                    <div className="field">
                      <label>What shall we call you?</label>
                      <div className="input-wrap">
                        <input type="text" placeholder="First name" value={form.name}
                          onChange={(e) => set("name", e.target.value)} autoComplete="given-name" />
                      </div>
                    </div>

                    <div className="field">
                      <label>Email</label>
                      <div className="input-wrap">
                        <input type="email" placeholder="you@example.com" value={form.email}
                          onChange={(e) => { set("email", e.target.value); setEmailError(""); }}
                          autoComplete="email" required
                          style={emailError ? { borderColor: "var(--blossom)" } : {}} />
                      </div>
                      {emailError && <div className="hint" style={{ color: "var(--blossom)" }}>{emailError}</div>}
                    </div>

                    <div className="field">
                      <label>Password</label>
                      <div className="input-wrap">
                        <input type={peek ? "text" : "password"} className="has-icon"
                          placeholder="Choose something kind to remember" value={form.password}
                          onChange={(e) => { set("password", e.target.value); setPasswordError(""); }}
                          autoComplete="new-password" required minLength={8}
                          style={passwordError ? { borderColor: "var(--blossom)" } : {}} />
                        <button type="button" className="peek" onClick={() => setPeek((p) => !p)}>
                          {peek ? "hide" : "show"}
                        </button>
                      </div>
                      {passwordError && <div className="hint" style={{ color: "var(--blossom)" }}>{passwordError}</div>}
                      {pw.length > 0 && (
                        <div className="pw-meter">
                          <div className="pw-bars">
                            {[0, 1, 2, 3].map((i) => (
                              <span key={i} className={`pw-bar${i < st ? " on" : ""}`} data-lvl={st} />
                            ))}
                          </div>
                          <span className="pw-label">{stLabels[st]}</span>
                        </div>
                      )}
                    </div>

                    <div className="field-row">
                      <div className="field">
                        <label>Birthday</label>
                        <div className="input-wrap">
                          <input type="date" value={form.birthday}
                            onChange={(e) => set("birthday", e.target.value)} required />
                        </div>
                      </div>
                      <div className="field">
                        <label>Gender</label>
                        <div className="input-wrap">
                          <select value={form.gender} onChange={(e) => set("gender", e.target.value)} required
                            style={{ width: "100%", padding: ".82em 1em", fontFamily: "var(--font-body)", fontSize: 16, color: "var(--ink)", background: "var(--cream)", border: "1px solid var(--line)", borderRadius: "var(--r-sm)" }}>
                            <option value="">Select…</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="non-binary">Non-binary</option>
                            <option value="prefer-not-to-say">Prefer not to say</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div id="clerk-captcha" />

                    <button className={`btn block lg auth-submit${loading ? " busy" : ""}`} type="submit" disabled={loading}>
                      {loading ? "Tending your garden…" : "Create my garden"}
                    </button>
                  </form>

                  <p className="auth-fine">
                    By planting a seed you agree to our{" "}
                    <a href="#" onClick={(e) => e.preventDefault()}>Terms</a> &amp;{" "}
                    <a href="#" onClick={(e) => e.preventDefault()}>Privacy promise</a>.
                    Bordoo is a companion, not a clinic.
                  </p>
                </>
              )}

              {isLoaded && step === "verify" && (
                <div>
                  <div className="auth-head">
                    <span className="eyebrow">Almost there</span>
                    <h2>Check your inbox</h2>
                    <p>
                      We sent a 6-digit code to{" "}
                      <span style={{ color: "var(--ink)", fontWeight: 500 }}>{verifyEmail}</span>.
                      Enter it below to confirm your garden.
                    </p>
                  </div>
                  <form onSubmit={handleVerify}>
                    {generalError && <p style={{ color: "var(--blossom)", fontSize: 14, marginBottom: 12 }}>{generalError}</p>}
                    <div className="field">
                      <label>Verification code</label>
                      <div className="input-wrap">
                        <input type="text" placeholder="000000" value={code}
                          onChange={(e) => setCode(e.target.value)}
                          maxLength={6} required autoFocus
                          style={{ textAlign: "center", letterSpacing: "0.3em", fontSize: 22 }} />
                      </div>
                      {codeError && <div className="hint" style={{ color: "var(--blossom)" }}>{codeError}</div>}
                    </div>
                    <button className={`btn block lg auth-submit${loading ? " busy" : ""}`} type="submit" disabled={loading}>
                      {loading ? "Verifying…" : "Confirm my garden"}
                    </button>
                  </form>
                  <p className="auth-fine">
                    Didn&apos;t receive it?{" "}
                    <button className="link-forgot" onClick={resendCode}>Resend code</button>
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
