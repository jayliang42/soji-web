import { getSafeNextPath } from "@/lib/navigation";

export type AuthCallbackOptions = {
  flow?: "recovery";
};

export function getAuthCallbackUrl(
  siteOrigin: string,
  nextPath: string,
  options: AuthCallbackOptions = {}
): string {
  const callbackUrl = new URL("/auth/callback", siteOrigin);

  if (options.flow === "recovery") {
    callbackUrl.searchParams.set("flow", "recovery");
  }

  callbackUrl.searchParams.set("next", getSafeNextPath(nextPath));
  return callbackUrl.toString();
}
