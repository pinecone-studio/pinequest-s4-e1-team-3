"use client";

import { useAuth } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function AuthHeader() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return null;

  if (isSignedIn) {
    return <UserButton />;
  }

  return (
    <div className="flex items-center gap-3">
      <Link href="/sign-in" className="text-sm font-medium hover:underline">
        Sign in
      </Link>
      <Link
        href="/sign-up"
        className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Sign up
      </Link>
    </div>
  );
}
