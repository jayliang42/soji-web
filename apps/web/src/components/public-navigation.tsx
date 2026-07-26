"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { isNavigationSectionActive } from "@/lib/navigation";

const guestNavigation = [
  { href: "/pricing" as Route, label: "Pricing" },
  { href: "/library" as Route, label: "Library" },
  { href: "/products" as Route, label: "Shop" },
  { href: "/office-hours" as Route, label: "Office hours" },
  { href: "/account" as Route, label: "Account" }
] as const satisfies ReadonlyArray<{ href: Route; label: string }>;

const memberNavigation = [
  { href: "/account?view=subscriptions" as Route, label: "Subscriptions" },
  { href: "/library" as Route, label: "Library" },
  { href: "/products" as Route, label: "Shop" },
  { href: "/office-hours" as Route, label: "Office hours" },
  { href: "/account" as Route, label: "Account" }
] as const satisfies ReadonlyArray<{ href: Route; label: string }>;

export function PublicNavigation({ signedIn = false }: { signedIn?: boolean }) {
  const pathname = usePathname();
  const navigation = signedIn ? memberNavigation : guestNavigation;

  return (
    <nav
      aria-label="Primary"
      className="flex w-full flex-wrap items-center justify-between gap-y-2 text-[13px] font-semibold text-cocoa/75 min-[380px]:text-sm md:w-auto md:flex-nowrap md:justify-end md:gap-5 md:text-base"
    >
      {navigation.map((item) => {
        const isActive = isNavigationSectionActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`border-b-2 py-1 transition-colors ${
              isActive
                ? "border-clay text-darktext"
                : "border-transparent hover:border-clay/40 hover:text-cocoa"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
