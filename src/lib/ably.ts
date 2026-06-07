import { Rest } from "ably";

let _rest: Rest | null = null;

// Singleton REST client for server-side publishing.
// Lazily created so the key is only read after env is loaded.
export function getAblyRest(): Rest {
  if (!_rest) {
    if (!process.env.ABLY_API_KEY) {
      throw new Error("ABLY_API_KEY is not set in environment");
    }
    _rest = new Rest({ key: process.env.ABLY_API_KEY });
  }
  return _rest;
}

// Channel name scoped to a single user's garden.
export function gardenChannel(userId: string) {
  return `garden:${userId}`;
}
