"use client";

import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

export default function ConditionalHeader() {
  const pathname = usePathname();
  if (pathname.startsWith("/garden")) return null;

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b">
      <span className="font-semibold text-lg">PineQuest</span>
      <UserButton />
    </header>
  );
}
