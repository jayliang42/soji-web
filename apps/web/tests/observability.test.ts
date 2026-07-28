import { beforeEach, describe, expect, it, vi } from "vitest";

const alertConfig = vi.hoisted(() => ({ url: null as URL | null }));

vi.mock("@/lib/env", () => ({
  getOpsAlertWebhookUrl: () => alertConfig.url
}));

import {
  createOperationsAlertEnvelope,
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

  it("builds a versioned allowlisted alert envelope", () => {
    const envelope = createOperationsAlertEnvelope({
      environment: "preview",
      event: "stripe.webhook.processing_failed",
      level: "error",
      timestamp: "2026-07-28T04:45:00.000Z"
    });

    expect(envelope).toEqual({
      environment: "preview",
      eventCode: "stripe.webhook.processing_failed",
      occurredAt: "2026-07-28T04:45:00.000Z",
      retryable: true,
      schemaVersion: 1,
      severity: "error",
      subsystem: "payments"
    });
    expect(Object.keys(envelope).sort()).toEqual(
      [
        "environment",
        "eventCode",
        "occurredAt",
        "retryable",
        "schemaVersion",
        "severity",
        "subsystem"
      ].sort()
    );
  });

  it("delivers only the allowlisted alert envelope to a configured webhook", async () => {
    alertConfig.url = new URL("https://alerts.example/hooks/soji");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    vi.stubGlobal("fetch", fetchMock);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await reportOperationalError(
      "stripe.webhook.processing_failed",
      new Error(
        "customer@example.com sk_test_secret cookie=session-token https://signed.example/file"
      ),
      {
        authorization: "Bearer private-token",
        eventId: "evt_123",
        payload: '{"provider":"raw"}',
        responseBody: "database unavailable"
      }
    );

    expect(result.alerted).toBe(true);
    expect(consoleError.mock.invocationCallOrder[0]).toBeLessThan(
      fetchMock.mock.invocationCallOrder[0]
    );
    expect(fetchMock).toHaveBeenCalledWith(
      alertConfig.url,
      expect.objectContaining({
        headers: { "Content-Type": "application/json" },
        method: "POST",
        redirect: "error",
        signal: expect.any(AbortSignal)
      })
    );
    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body).toMatchObject({
      eventCode: "stripe.webhook.processing_failed",
      schemaVersion: 1,
      severity: "error",
      subsystem: "payments"
    });
    expect(body).not.toHaveProperty("context");
    expect(body).not.toHaveProperty("error");
    expect(JSON.stringify(body)).not.toMatch(
      /customer@example|sk_test_secret|session-token|signed\.example|evt_123|provider|database unavailable/
    );
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
      error: null,
      event: "operations.alert_delivery_failed",
      level: "warn"
    });
    expect(consoleWarn).toHaveBeenCalledOnce();
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
      error: null,
      event: "operations.alert_delivery_failed"
    });
    expect(consoleWarn).toHaveBeenCalledOnce();
  });

  it("treats redirect rejection as a bounded secondary delivery failure", async () => {
    alertConfig.url = new URL("https://alerts.example/hooks/soji");
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("redirect mode is error"));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await reportOperationalError(
      "stripe.checkout.session_create_failed",
      new Error("Stripe unavailable")
    );

    expect(result.alerted).toBe(false);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ redirect: "error" });
    expect(consoleWarn).toHaveBeenCalledOnce();
    expect(String(consoleWarn.mock.calls[0][0])).not.toContain(
      "redirect mode is error"
    );
  });
});
