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

type OperationsAlertEnvironment =
  | "development"
  | "preview"
  | "production"
  | "test"
  | "unknown";

type OperationsAlertSubsystem =
  | "application"
  | "content"
  | "identity"
  | "payments"
  | "storage";

export type OperationsAlertEnvelope = {
  environment: OperationsAlertEnvironment;
  eventCode: string;
  occurredAt: string;
  retryable: boolean;
  schemaVersion: 1;
  severity: OperationalLog["level"];
  subsystem: OperationsAlertSubsystem;
};

function getAlertEnvironment(value: unknown): OperationsAlertEnvironment {
  return value === "development" ||
    value === "preview" ||
    value === "production" ||
    value === "test"
    ? value
    : "unknown";
}

function getAlertSubsystem(event: string): OperationsAlertSubsystem {
  if (/^(?:stripe|billing|account\.subscriptions)/.test(event)) {
    return "payments";
  }
  if (
    /^(?:auth|session|middleware|publisher|billing_portal\.auth)/.test(event)
  ) {
    return "identity";
  }
  if (
    /^(?:cron\.product_asset_cleanup|admin\.product_asset|product_download)/.test(
      event
    )
  ) {
    return "storage";
  }
  if (/^(?:content|office_hours|admin\.content|admin\.office_hours)/.test(event)) {
    return "content";
  }
  return "application";
}

function isAlertRetryable(event: string) {
  return !/(?:signature_rejected|forbidden|invalid|validation_failed)$/.test(
    event
  );
}

export function createOperationsAlertEnvelope({
  environment = process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  event,
  level,
  timestamp
}: {
  environment?: unknown;
  event: string;
  level: OperationalLog["level"];
  timestamp: string;
}): OperationsAlertEnvelope {
  const eventCode = /^[a-z][a-z0-9_.]{2,119}$/.test(event)
    ? event
    : "operations.unclassified_failure";

  return {
    environment: getAlertEnvironment(environment),
    eventCode,
    occurredAt: timestamp,
    retryable: isAlertRetryable(eventCode),
    schemaVersion: 1,
    severity: level,
    subsystem: getAlertSubsystem(eventCode)
  };
}

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
  sourceEvent,
  status
}: {
  sourceEvent: string;
  status?: number;
}) {
  logOperationalEvent(
    createOperationalLog({
      context: { sourceEvent, status },
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
      body: JSON.stringify(
        createOperationsAlertEnvelope({
          event: log.event,
          level: log.level,
          timestamp: log.timestamp
        })
      ),
      headers: { "Content-Type": "application/json" },
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(2_000)
    });
    if (!response.ok) {
      logAlertDeliveryFailure({
        sourceEvent: event,
        status: response.status
      });
    }
    return { alerted: response.ok, log } as const;
  } catch {
    logAlertDeliveryFailure({ sourceEvent: event });
    return { alerted: false, log } as const;
  }
}
