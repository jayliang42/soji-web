import { timingSafeEqual } from "node:crypto";
import { env, hasCronSecretConfig } from "@/lib/env";

export function isAuthorizedCronRequest(request: Request) {
  if (!hasCronSecretConfig()) {
    return false;
  }

  const authorization = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${env.CRON_SECRET!.trim()}`;
  const actualBuffer = Buffer.from(authorization);
  const expectedBuffer = Buffer.from(expected);

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}
