"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

export async function registerCheckoutTestBrowser(
  browserId: string,
  fetcher: typeof fetch = fetch
) {
  const response = await fetcher("/api/checkout/test-access", {
    body: JSON.stringify({ browserId: browserId.trim() }),
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    method: "POST"
  });
  return response.ok;
}

export function CheckoutTestAccessForm() {
  const [browserId, setBrowserId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    try {
      if (!(await registerCheckoutTestBrowser(browserId))) {
        throw new Error("checkout_test_access_denied");
      }
      window.location.assign("/pricing");
    } catch {
      setMessage("测试访问码无效或已经停用。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="max-w-2xl rounded-xl border border-dune bg-white p-6 shadow-sm sm:p-8">
      <form className="grid gap-5" onSubmit={submit}>
        <label className="grid gap-2 text-sm font-bold text-cocoa">
          Test access code
          <input
            autoComplete="off"
            className="min-h-12 rounded-md border border-dune bg-shell px-4 font-mono text-sm text-cocoa outline-none focus:border-clay focus:ring-2 focus:ring-clay/20"
            name="browserId"
            onChange={(event) => setBrowserId(event.target.value)}
            required
            spellCheck={false}
            type="password"
            value={browserId}
          />
        </label>
        <p className="text-sm font-medium leading-6 text-cocoa/70">
          仅用于临时 Stripe Test mode 验证。登记后会返回价格页，不会发起付款。
        </p>
        <button
          className="min-h-12 rounded-md bg-cocoa px-5 py-3 text-sm font-bold text-white hover:bg-charcoal disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "正在登记…" : "登记这台浏览器"}
        </button>
      </form>
      {message ? (
        <p aria-live="polite" className="mt-4 text-sm font-semibold text-clay">
          {message}
        </p>
      ) : null}
      <Link
        className="mt-6 inline-flex min-h-11 items-center text-sm font-bold text-clay underline decoration-clay/35 underline-offset-4"
        href="/pricing"
      >
        返回价格页
      </Link>
    </section>
  );
}
