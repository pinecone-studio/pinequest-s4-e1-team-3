"use client";

import { SignOutButton } from "@clerk/nextjs";

export default function LogoutButton() {
  return (
    <SignOutButton redirectUrl="/sign-in">
      <button className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
        Log out
      </button>
    </SignOutButton>
  );
}
