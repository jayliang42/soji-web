"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { isNavigationSectionActive } from "@/lib/navigation";

const guestNavigation = [
  { href: "/pricing" as Route, label: "Pricing" },
  { href: "/library" as Route, label: "Library" },
  { href: "/products" as Route, label: "Shop" },
  { href: "/office-hours" as Route, label: "Office hours" },
  { href: "/login" as Route, label: "Sign in" }
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
  const [isOpen, setIsOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const navigationRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    navigationRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={menuButtonRef}
        type="button"
        aria-controls="primary-navigation"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="inline-flex min-h-11 items-center gap-3 rounded-md border border-dune bg-white px-4 text-sm font-bold text-cocoa transition-colors hover:border-clay hover:text-clay md:hidden"
      >
        <span aria-hidden="true" className="grid w-4 gap-1">
          <span className="h-0.5 rounded-full bg-current" />
          <span className="h-0.5 rounded-full bg-current" />
          <span className="h-0.5 rounded-full bg-current" />
        </span>
        {isOpen ? "Close" : "Menu"}
      </button>
      <nav
        ref={navigationRef}
        id="primary-navigation"
        aria-label="Primary"
        className={`absolute right-0 top-[calc(100%+0.75rem)] z-30 w-[min(19rem,calc(100vw-3rem))] rounded-lg border border-dune bg-shell p-3 text-base font-semibold text-cocoa/75 shadow-xl md:static md:flex md:w-auto md:items-center md:gap-5 md:border-0 md:bg-transparent md:p-0 md:shadow-none ${
          isOpen ? "grid" : "hidden md:flex"
        }`}
      >
        {navigation.map((item) => {
          const isActive = isNavigationSectionActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              onClick={() => setIsOpen(false)}
              className={`flex min-h-11 items-center rounded-md border-l-2 px-3 transition-colors md:min-h-0 md:rounded-none md:border-b-2 md:border-l-0 md:px-0 md:py-1 ${
                isActive
                  ? "border-clay bg-accent-muted text-darktext md:bg-transparent"
                  : "border-transparent hover:bg-cream hover:text-cocoa md:hover:border-clay/40 md:hover:bg-transparent"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
