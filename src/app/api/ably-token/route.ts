// GET /api/ably-token
//
// Returns a short-lived Ably TokenRequest for the authenticated user.
// The client uses this as authUrl so it can subscribe to its own
// garden channel without exposing the API key in the browser.
//
// Capability: subscribe-only on garden:<userId>.
// Publishing only happens server-side (memoryPipeline).

import { NextResponse } from "next/server";
import { getUser } from "@/lib/getUser";
import { getAblyRest, gardenChannel } from "@/lib/ably";

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use clerkId (not the Prisma cuid) so it matches what the browser-side
  // useUser().id returns — both must agree on the channel name.
  const tokenRequest = await getAblyRest().auth.createTokenRequest({
    clientId: user.clerkId,
    capability: { [gardenChannel(user.clerkId)]: ["subscribe"] },
  });

  return NextResponse.json(tokenRequest);
}
