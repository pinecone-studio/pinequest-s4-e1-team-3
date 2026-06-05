"use client";

import { useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

export default function SignUpPage() {
  const { signUp } = useSignUp() as any;
  const router = useRouter();

  const [step, setStep] = useState<"form" | "verify">("form");
  const [verifyEmail, setVerifyEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const sentRef = useRef(false);

  // field-level errors
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [codeError, setCodeError] = useState("");

  const [form, setForm] = useState({
    email: "",
    password: "",
    birthday: "",
    gender: "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function clearErrors() {
    setEmailError("");
    setPasswordError("");
    setGeneralError("");
  }

  function routeError(err: any) {
    // new Future API returns a single error; old shape wraps in err.errors[]
    const code: string = err?.code ?? err?.errors?.[0]?.code ?? "";
    const message: string =
      err?.longMessage ?? err?.message ?? err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message ?? "Something went wrong";
    const msgLower = message.toLowerCase();

    if (code.startsWith("form_password") || code === "form_param_pwned") {
      setPasswordError(message);
    } else if (
      code === "form_identifier_exists" ||
      code === "form_identifier_already_exists" ||
      msgLower.includes("taken") ||
      msgLower.includes("already exists") ||
      msgLower.includes("already registered")
    ) {
      setEmailError("An account with this email already exists. Try signing in instead.");
    } else if (
      code.includes("email") ||
      code.includes("identifier") ||
      code === "form_param_format_invalid"
    ) {
      setEmailError(message);
    } else {
      setGeneralError(message);
    }
  }

  // On load: if there's already a pending sign-up waiting for email verification, send the code
  useEffect(() => {
    if (!signUp || sentRef.current) return;
    if (
      signUp.status === "missing_requirements" &&
      !signUp.missingFields?.length &&
      signUp.unverifiedFields?.includes("email_address")
    ) {
      sentRef.current = true;
      signUp.verifications.sendEmailCode().then(({ error }: any) => {
        if (error) {
          setGeneralError(error.message ?? "Failed to send code");
          sentRef.current = false;
        } else {
          setVerifyEmail(signUp.emailAddress ?? "");
          setStep("verify");
        }
      });
    }
  }, [signUp?.status]);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!signUp) { setGeneralError("Please wait for Clerk to load."); return; }
    clearErrors();
    setLoading(true);
    try {
      const { error: createError } = await signUp.create({
        emailAddress: form.email,
        password: form.password,
      });

      if (createError) {
        routeError(createError);
        return;
      }

      if (signUp.missingFields?.includes("password")) {
        setPasswordError("Password is not strong enough. Use uppercase letters, numbers, and symbols.");
        return;
      }

      const { error: sendError } = await signUp.verifications.sendEmailCode();
      if (sendError) {
        setGeneralError(sendError.message ?? "Failed to send verification email");
        return;
      }

      setVerifyEmail(form.email || signUp.emailAddress || "");
      setStep("verify");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!signUp) return;
    setCodeError("");
    setGeneralError("");
    setLoading(true);
    try {
      const { error: verifyError } = await signUp.verifications.verifyEmailCode({ code });
      if (verifyError) {
        setCodeError(verifyError.message ?? "Invalid code");
        return;
      }

      const { error: finalizeError } = await signUp.finalize();
      if (finalizeError) {
        setGeneralError(finalizeError.message ?? "Failed to complete sign-up");
        return;
      }

      await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: verifyEmail,
          birthday: form.birthday,
          gender: form.gender,
        }),
      });

      router.push("/");
      router.refresh();
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

  if (step === "verify") {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <form onSubmit={handleVerify} className="flex flex-col gap-4 w-full max-w-sm border rounded-lg p-6">
          <h1 className="text-2xl font-bold">Check your email</h1>
          <p className="text-sm text-muted-foreground">
            We sent a 6-digit code to{" "}
            <span className="font-medium text-foreground">{verifyEmail}</span>
          </p>
          {generalError && <p className="text-sm text-red-500">{generalError}</p>}
          <div className="flex flex-col gap-1">
            <input
              className="border rounded px-3 py-2 text-center text-lg tracking-widest"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
              required
              autoFocus
            />
            {codeError && <p className="text-sm text-red-500">{codeError}</p>}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-primary text-primary-foreground rounded px-4 py-2 disabled:opacity-50"
          >
            {loading ? "Verifying…" : "Verify email"}
          </button>
          <button type="button" onClick={resendCode} className="text-sm underline text-muted-foreground">
            Resend code
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={handleSignUp} className="flex flex-col gap-4 w-full max-w-sm border rounded-lg p-6">
        <h1 className="text-2xl font-bold">Create account</h1>
        {generalError && <p className="text-sm text-red-500">{generalError}</p>}

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => { set("email", e.target.value); setEmailError(""); }}
            required
            className={`border rounded px-3 py-2 ${emailError ? "border-red-500" : ""}`}
            placeholder="you@example.com"
          />
          {emailError && <p className="text-sm text-red-500">{emailError}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Password</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => { set("password", e.target.value); setPasswordError(""); }}
            required
            minLength={8}
            className={`border rounded px-3 py-2 ${passwordError ? "border-red-500" : ""}`}
            placeholder="Min. 8 characters, include symbols"
          />
          {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Birthday</label>
          <input
            type="date"
            value={form.birthday}
            onChange={(e) => set("birthday", e.target.value)}
            required
            className="border rounded px-3 py-2"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Gender</label>
          <select
            value={form.gender}
            onChange={(e) => set("gender", e.target.value)}
            required
            className="border rounded px-3 py-2"
          >
            <option value="">Select…</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="non-binary">Non-binary</option>
            <option value="prefer-not-to-say">Prefer not to say</option>
          </select>
        </div>

        <div id="clerk-captcha" />

        <button
          type="submit"
          disabled={loading}
          className="bg-primary text-primary-foreground rounded px-4 py-2 disabled:opacity-50"
        >
          {loading ? "Creating account…" : "Sign up"}
        </button>

        <p className="text-sm text-center">
          Already have an account?{" "}
          <a href="/sign-in" className="underline">Sign in</a>
        </p>
      </form>
    </main>
  );
}
