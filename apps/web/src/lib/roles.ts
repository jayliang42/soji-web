import type { UserRole } from "@soji/types";

export function hasPublisherAccess(roles: readonly UserRole[]) {
  return roles.some((role) => role === "admin" || role === "editor");
}

export function hasAdminAccess(roles: readonly UserRole[]) {
  return roles.includes("admin");
}
