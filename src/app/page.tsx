import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/logout-button";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold">Welcome to PineQuest</h1>
      {user && (
        <p className="text-muted-foreground">
          Signed in as{" "}
          <span className="font-medium text-foreground">
            {user.emailAddresses[0]?.emailAddress}
          </span>
        </p>
      )}
      <Button asChild size="lg">
        <Link href="/garden">Enter your garden</Link>
      </Button>
      <LogoutButton />
    </main>
  );
}
