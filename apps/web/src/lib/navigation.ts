export function getSafeNextPath(value: string | null | undefined) {
  if (!value || typeof value !== "string") {
    return "/account";
  }

  if (!value.startsWith("/")) {
    return "/account";
  }

  if (value.startsWith("//")) {
    return "/account";
  }

  return value;
}
