"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname, useSearchParams } from "next/navigation";
import {
  type FocusEvent,
  useEffect,
  useRef,
  useState
} from "react";
import { isNavigationSectionActive } from "@/lib/navigation";

interface NavigationItem {
  description: string;
  href: Route;
  kind?: "account";
  label: string;
}

const guestNavigation: ReadonlyArray<NavigationItem> = [
  {
    description: "Compare three membership depths",
    href: "/pricing" as Route,
    label: "Pricing"
  },
  {
    description: "Read guides and member editions",
    href: "/library" as Route,
    label: "Library"
  },
  {
    description: "Buy focused one-time tools",
    href: "/products" as Route,
    label: "Shop"
  },
  {
    description: "Bring a decision to live support",
    href: "/office-hours" as Route,
    label: "Office hours"
  },
  {
    description: "Access your benefits and purchases",
    href: "/login" as Route,
    kind: "account",
    label: "Sign in"
  }
];

const memberNavigation: ReadonlyArray<NavigationItem> = [
  {
    description: "Review plans and billing",
    href: "/account?view=subscriptions" as Route,
    label: "Subscriptions"
  },
  {
    description: "Read guides and member editions",
    href: "/library" as Route,
    label: "Library"
  },
  {
    description: "Use your purchases or find a tool",
    href: "/products" as Route,
    label: "Shop"
  },
  {
    description: "Reserve sessions and watch replays",
    href: "/office-hours" as Route,
    label: "Office hours"
  },
  {
    description: "See benefits, purchases, and profile",
    href: "/account" as Route,
    kind: "account",
    label: "Account"
  }
];

export function PublicNavigation({ signedIn = false }: { signedIn?: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSearch = searchParams.toString();
  const navigation = signedIn ? memberNavigation : guestNavigation;
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const navigationRef = useRef<HTMLElement>(null);

  function closeMenu({ restoreFocus = false } = {}) {
    setIsOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => menuButtonRef.current?.focus());
    }
  }

  useEffect(() => {
    setIsOpen(false);
  }, [currentSearch, pathname]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    navigationRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu({ restoreFocus: true });
      }
    };
    const desktopQuery = window.matchMedia("(min-width: 768px)");
    const closeAtDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) {
        closeMenu();
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    desktopQuery.addEventListener("change", closeAtDesktop);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      desktopQuery.removeEventListener("change", closeAtDesktop);
    };
  }, [isOpen]);

  function handleContainerBlur(event: FocusEvent<HTMLDivElement>) {
    if (
      !isOpen ||
      (event.relatedTarget instanceof Node &&
        event.currentTarget.contains(event.relatedTarget))
    ) {
      return;
    }
    closeMenu();
  }

  return (
    <div
      className="relative"
      onBlur={handleContainerBlur}
      ref={containerRef}
    >
      <button
        aria-controls="primary-navigation"
        aria-expanded={isOpen}
        className="relative z-40 inline-flex min-h-11 items-center gap-3 rounded-full border border-dune bg-white px-4 text-sm font-bold text-cocoa shadow-sm transition-colors hover:border-clay hover:text-clay md:hidden"
        onClick={() => (isOpen ? closeMenu() : setIsOpen(true))}
        ref={menuButtonRef}
        type="button"
      >
        <span aria-hidden="true" className="relative h-4 w-4">
          <span
            className={`absolute left-0 top-[3px] h-0.5 w-4 rounded-full bg-current transition-transform ${
              isOpen ? "translate-y-[5px] rotate-45" : ""
            }`}
          />
          <span
            className={`absolute left-0 top-[8px] h-0.5 w-4 rounded-full bg-current transition-opacity ${
              isOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`absolute left-0 top-[13px] h-0.5 w-4 rounded-full bg-current transition-transform ${
              isOpen ? "-translate-y-[5px] -rotate-45" : ""
            }`}
          />
        </span>
        {isOpen ? "Close" : "Menu"}
      </button>

      {isOpen ? (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-20 bg-cocoa/25 backdrop-blur-[2px] md:hidden"
          data-testid="navigation-backdrop"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => closeMenu({ restoreFocus: true })}
        />
      ) : null}

      <nav
        aria-label="Primary"
        className={`fixed inset-x-3 top-[5.25rem] z-30 max-h-[calc(100dvh-6.25rem)] overflow-y-auto rounded-2xl border border-dune bg-shell p-3 text-cocoa shadow-2xl sm:left-auto sm:right-6 sm:w-[24rem] md:static md:block md:max-h-none md:w-auto md:overflow-visible md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none ${
          isOpen ? "block" : "hidden md:block"
        }`}
        id="primary-navigation"
        ref={navigationRef}
      >
        <div className="px-3 pb-3 pt-2 md:hidden">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-clay">
            Explore Soji
          </p>
          <p className="mt-2 max-w-[30ch] text-sm leading-6 text-cocoa/68">
            {signedIn
              ? "Return to your reading, tools, support, or account."
              : "Choose a way to read, apply, join, or ask for support."}
          </p>
        </div>

        <ul className="grid list-none gap-1 p-0 md:flex md:items-center md:gap-5">
          {navigation.map((item) => {
            const isActive = isNavigationSectionActive(
              pathname,
              item.href,
              currentSearch
            );
            const isAccountAction = item.kind === "account";
            const mobileTone = isAccountAction
              ? isActive
                ? "border-clay bg-cocoa text-white ring-2 ring-clay/25"
                : "border-cocoa bg-cocoa text-white hover:bg-charcoal"
              : isActive
                ? "border-clay/35 bg-accent-muted text-darktext"
                : "border-transparent bg-white text-cocoa hover:border-dune hover:bg-cream";
            const desktopTone = isAccountAction
              ? isActive
                ? "md:border-clay md:bg-cocoa md:text-white"
                : "md:border-cocoa/25 md:bg-white md:text-cocoa md:hover:border-clay md:hover:bg-cream"
              : isActive
                ? "md:border-clay md:bg-transparent md:text-darktext"
                : "md:border-transparent md:bg-transparent md:text-cocoa/75 md:hover:border-clay/40 md:hover:bg-transparent md:hover:text-cocoa";

            return (
              <li key={item.href}>
                <Link
                  aria-current={isActive ? "page" : undefined}
                  className={`group flex min-h-[4.5rem] items-center justify-between gap-4 rounded-xl border px-4 py-3 text-sm font-bold transition-colors md:min-h-0 ${
                    isAccountAction
                      ? "md:min-h-10 md:rounded-full md:border md:px-4 md:py-2"
                      : "md:rounded-none md:border-x-0 md:border-b-2 md:border-t-0 md:px-0 md:py-2"
                  } ${mobileTone} ${desktopTone}`}
                  href={item.href}
                  onClick={() => closeMenu()}
                >
                  <span>
                    <span className="block">{item.label}</span>
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 block text-xs font-medium leading-5 md:hidden ${
                        isAccountAction ? "text-white/72" : "text-cocoa/68"
                      }`}
                    >
                      {item.description}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`text-lg transition-transform group-hover:translate-x-0.5 md:hidden ${
                      isAccountAction ? "text-white/70" : "text-clay"
                    }`}
                  >
                    →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
