import { beforeEach, describe, expect, it, vi } from "vitest";

const alertConfig = vi.hoisted(() => ({ url: null as URL | null }));

vi.mock("@/lib/env", () => ({
  getOpsAlertWebhookUrl: () => alertConfig.url
}));

import {
  createOperationalLog,
  reportOperationalError
} from "@/lib/observability";

describe("operational logging", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    alertConfig.url = null;
  });

  it("creates a bounded structured record without undefined context values", () => {
    const log = createOperationalLog({
      context: { eventId: "evt_123", omitted: undefined },
      error: new Error("database unavailable"),
      event: "stripe.webhook.processing_failed"
    });

    expect(log).toMatchObject({
      context: { eventId: "evt_123" },
      error: { message: "database unavailable", name: "Error" },
      event: "stripe.webhook.processing_failed",
      level: "error"
    });
    expect(log.context).not.toHaveProperty("omitted");
  });

  it("logs locally and remains successful when no alert webhook is configured", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await reportOperationalError(
      "stripe.checkout.session_create_failed",
      new Error("Stripe unavailable"),
      { checkoutMode: "subscription" }
    );

    expect(result.alerted).toBe(false);
    expect(consoleError).toHaveBeenCalledOnce();
  });

  it("delivers the same structured record to a configured webhook", async () => {
    alertConfig.url = new URL("https://alerts.example/hooks/soji");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await reportOperationalError(
      "stripe.webhook.processing_failed",
      new Error("processing failed"),
      { eventId: "evt_123" }
    );

    expect(result.alerted).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      alertConfig.url,
      expect.objectContaining({
        headers: { "Content-Type": "application/json" },
        method: "POST"
      })
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      event: "stripe.webhook.processing_failed",
      context: { eventId: "evt_123" }
    });
  });

  it("logs a separate warning when the alert endpoint rejects delivery", async () => {
    alertConfig.url = new URL("https://alerts.example/hooks/soji");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503 })
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await reportOperationalError(
      "stripe.checkout.session_create_failed",
      new Error("Stripe unavailable")
    );

    expect(result.alerted).toBe(false);
    expect(JSON.parse(String(consoleWarn.mock.calls[0][0]))).toMatchObject({
      context: {
        sourceEvent: "stripe.checkout.session_create_failed",
        status: 503
      },
      event: "operations.alert_delivery_failed",
      level: "warn"
    });
  });

  it("logs a separate warning when alert delivery times out", async () => {
    alertConfig.url = new URL("https://alerts.example/hooks/soji");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("request timed out")));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await reportOperationalError(
      "stripe.webhook.receipt_failed",
      new Error("database unavailable")
    );

    expect(result.alerted).toBe(false);
    expect(JSON.parse(String(consoleWarn.mock.calls[0][0]))).toMatchObject({
      context: { sourceEvent: "stripe.webhook.receipt_failed" },
      error: { message: "request timed out" },
      event: "operations.alert_delivery_failed"
    });
  });
});
