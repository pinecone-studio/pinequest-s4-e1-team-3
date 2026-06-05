"use client";

import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignInPage() {
  const { signIn } = useSignIn() as any;
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!signIn) { setError("Please wait..."); return; }
    setError("");
    setLoading(true);
    try {
      const { error: createError } = await signIn.create({
        identifier: email,
        password,
      });

      if (createError) {
        setError(createError.message ?? "Invalid email or password");
        return;
      }

      const { error: finalizeError } = await signIn.finalize();
      if (finalizeError) {
        setError(finalizeError.message ?? "Failed to complete sign-in");
        return;
      }

      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm border rounded-lg p-6">
        <h1 className="text-2xl font-bold">Sign in</h1>
        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="border rounded px-3 py-2"
            placeholder="you@example.com"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="border rounded px-3 py-2"
            placeholder="Your password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-primary text-primary-foreground rounded px-4 py-2 disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <p className="text-sm text-center">
          Don&apos;t have an account?{" "}
          <a href="/sign-up" className="underline">Sign up</a>
        </p>
      </form>
    </main>
  );
}
