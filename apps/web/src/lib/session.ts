import { getDefaultEntitlements } from "@soji/domain";
import type { UserProfile } from "@soji/types";

export async function getMockSession(): Promise<UserProfile> {
  return {
    id: "demo-user",
    email: "member@soji.club",
    fullName: "Soji Demo Member",
    avatarUrl: null,
    tier: "tier_2",
    roles: ["admin"],
    providers: ["email", "google"]
  };
}

export async function getCurrentEntitlements() {
  const user = await getMockSession();
  return getDefaultEntitlements(user.tier);
}
