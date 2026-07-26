import { isAuthSessionMissingError } from "@supabase/supabase-js";

export type PublicAuthOperation =
  | "email_sign_in"
  | "email_sign_up"
  | "google";

const publicAuthFailureMessages: Record<PublicAuthOperation, string> = {
  email_sign_in:
    "We couldn't sign you in with those details. Check your email and password and try again.",
  email_sign_up:
    "Account creation is temporarily unavailable. Try again shortly.",
  google:
    "Google sign-in is temporarily unavailable. Try again or continue with email."
};

export function isMissingAuthSession(error: unknown) {
  return isAuthSessionMissingError(error);
}

export function getPublicAuthFailureMessage(
  operation: PublicAuthOperation
): string {
  return publicAuthFailureMessages[operation];
}
