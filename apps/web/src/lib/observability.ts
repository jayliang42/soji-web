import { getOpsAlertWebhookUrl } from "@/lib/env";

type OperationalContext = Record<
  string,
  boolean | number | string | null | undefined
>;

export type OperationalLog = {
  context: Record<string, boolean | number | string | null>;
  error: { message: string; name: string } | null;
  event: string;
  level: "error" | "warn";
  timestamp: string;
};

export function createOperationalLog({
  context = {},
  error,
  event,
  level = "error"
}: {
  context?: OperationalContext;
  error?: unknown;
  event: string;
  level?: OperationalLog["level"];
}): OperationalLog {
  return {
    context: Object.fromEntries(
      Object.entries(context).filter(
        (entry): entry is [string, boolean | number | string | null] =>
          entry[1] !== undefined
      )
    ),
    error:
      error instanceof Error
        ? { message: error.message, name: error.name }
        : error === undefined
          ? null
          : { message: String(error), name: "UnknownError" },
    event,
    level,
    timestamp: new Date().toISOString()
  };
}

export function logOperationalEvent(log: OperationalLog) {
  const serialized = JSON.stringify(log);
  if (log.level === "warn") {
    console.warn(serialized);
  } else {
    console.error(serialized);
  }
}

function logAlertDeliveryFailure({
  error,
  sourceEvent,
  status
}: {
  error: unknown;
  sourceEvent: string;
  status?: number;
}) {
  logOperationalEvent(
    createOperationalLog({
      context: { sourceEvent, status },
      error,
      event: "operations.alert_delivery_failed",
      level: "warn"
    })
  );
}

export async function reportOperationalError(
  event: string,
  error: unknown,
  context: OperationalContext = {}
) {
  const log = createOperationalLog({ context, error, event });
  logOperationalEvent(log);

  const webhookUrl = getOpsAlertWebhookUrl();
  if (!webhookUrl) {
    return { alerted: false, log } as const;
  }

  try {
    const response = await fetch(webhookUrl, {
      body: JSON.stringify(log),
      headers: { "Content-Type": "application/json" },
      method: "POST",
      signal: AbortSignal.timeout(2_000)
    });
    if (!response.ok) {
      logAlertDeliveryFailure({
        error: new Error("alert_webhook_http_error"),
        sourceEvent: event,
        status: response.status
      });
    }
    return { alerted: response.ok, log } as const;
  } catch (alertError) {
    logAlertDeliveryFailure({ error: alertError, sourceEvent: event });
    return { alerted: false, log } as const;
  }
}
