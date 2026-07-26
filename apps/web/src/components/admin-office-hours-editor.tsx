"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { EntitlementKey, OfficeHourSession } from "@soji/types";
import { formatEntitlementList } from "@/lib/entitlements";

const entitlementOptions: Array<{ value: EntitlementKey; label: string }> = [
  { value: "office_hours.join", label: "Office hours" },
  { value: "community.vip_access", label: "VIP community" },
  { value: "contact.unlock", label: "Contact unlock" }
];

type EditableOfficeHour = {
  expectedRevision: number | null;
  id: string | null;
  replayUrl: string;
  requiredEntitlement: EntitlementKey;
  signupUrl: string;
  startsAt: string;
  title: string;
};

function toInputDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 16);
}

function toIsoDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function toEditableOfficeHour(session: OfficeHourSession): EditableOfficeHour {
  return {
    expectedRevision: session.revision ?? 1,
    id: session.id,
    replayUrl: session.replayUrl ?? "",
    requiredEntitlement: session.requiredEntitlements[0] ?? "office_hours.join",
    signupUrl: session.signupUrl,
    startsAt: toInputDate(session.startsAt),
    title: session.title
  };
}

function emptyOfficeHour(): EditableOfficeHour {
  return {
    expectedRevision: null,
    id: null,
    replayUrl: "",
    requiredEntitlement: "office_hours.join",
    signupUrl: "",
    startsAt: "",
    title: ""
  };
}

function getReasonMessage(reason: unknown) {
  if (!reason) {
    return "Request failed.";
  }

  if (typeof reason === "string") {
    const messages: Record<string, string> = {
      office_hour_delete_conflict:
        "Another editor saved this office hour first. Refresh before deleting it.",
      office_hour_not_found: "This office hour no longer exists. Refresh the workspace.",
      office_hour_update_conflict:
        "Another editor saved this office hour first. Refresh before applying your changes."
    };
    return messages[reason] ?? reason;
  }

  return "Request failed. Check the form fields and try again.";
}

export function AdminOfficeHoursEditor({
  enabled,
  items,
  source
}: {
  enabled: boolean;
  items: OfficeHourSession[];
  source: "supabase" | "demo";
}) {
  const canMutate = enabled && source === "supabase";
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? "");
  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? items[0] ?? null,
    [items, selectedId]
  );
  const [draft, setDraft] = useState<EditableOfficeHour>(
    selectedItem ? toEditableOfficeHour(selectedItem) : emptyOfficeHour()
  );
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const allowNavigationRef = useRef(false);
  const persistedDraft = useMemo(() => {
    if (!draft.id) {
      return emptyOfficeHour();
    }
    const item = items.find((candidate) => candidate.id === draft.id);
    return item ? toEditableOfficeHour(item) : null;
  }, [draft.id, items]);
  const isDirty = Boolean(
    persistedDraft && JSON.stringify(draft) !== JSON.stringify(persistedDraft)
  );

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    function warnBeforeUnload(event: BeforeUnloadEvent) {
      if (allowNavigationRef.current) {
        return;
      }
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [isDirty]);

  function selectItem(item: OfficeHourSession) {
    if (item.id === draft.id) {
      return;
    }
    if (
      isDirty &&
      !window.confirm(`Discard unsaved changes to "${draft.title || "this office hour"}"?`)
    ) {
      return;
    }
    setSelectedId(item.id);
    setDraft(toEditableOfficeHour(item));
    setMessage(null);
  }

  function createNew() {
    if (!draft.id && !isDirty) {
      return;
    }
    if (isDirty && !window.confirm("Discard unsaved office-hour changes and start a new draft?")) {
      return;
    }
    setSelectedId("");
    setDraft(emptyOfficeHour());
    setMessage(null);
  }

  function updateDraft<T extends keyof EditableOfficeHour>(
    key: T,
    value: EditableOfficeHour[T]
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function toPayload(current: EditableOfficeHour) {
    const startsAt = toIsoDate(current.startsAt);
    if (!startsAt) {
      return null;
    }

    const basePayload = {
      replayUrl: current.replayUrl.trim(),
      requiredEntitlement: current.requiredEntitlement,
      signupUrl: current.signupUrl.trim(),
      startsAt,
      title: current.title.trim()
    };

    return current.id
      ? {
          ...basePayload,
          expectedRevision: current.expectedRevision,
          id: current.id
        }
      : basePayload;
  }

  function save() {
    if (!canMutate) {
      setMessage("Connect Supabase and use an editor/admin account before editing.");
      return;
    }

    const payload = toPayload(draft);
    if (!payload) {
      setMessage("Add a valid start date and time before saving.");
      return;
    }

    startTransition(async () => {
      try {
        setMessage(null);
        const response = await fetch("/api/admin/office-hours", {
          method: draft.id ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });
        const result = (await response.json().catch(() => null)) as
          | { ok?: boolean; reason?: unknown }
          | null;

        if (!response.ok || !result?.ok) {
          throw new Error(getReasonMessage(result?.reason));
        }

        setMessage("Office hour saved. Refreshing list...");
        allowNavigationRef.current = true;
        window.location.reload();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Failed to save office hour.");
      }
    });
  }

  function deleteOfficeHour() {
    if (!draft.id) {
      setMessage("Select an existing office hour before deleting.");
      return;
    }

    if (!canMutate) {
      setMessage("Connect Supabase and use an editor/admin account before deleting.");
      return;
    }

    const confirmed = window.confirm(
      `Delete "${draft.title}" permanently?${isDirty ? " Unsaved changes will be discarded." : ""}`
    );
    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      try {
        setMessage(null);
        const response = await fetch("/api/admin/office-hours", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            expectedRevision: draft.expectedRevision,
            id: draft.id
          })
        });
        const result = (await response.json().catch(() => null)) as
          | { ok?: boolean; reason?: unknown }
          | null;

        if (!response.ok || !result?.ok) {
          throw new Error(getReasonMessage(result?.reason));
        }

        setMessage("Office hour deleted. Refreshing list...");
        allowNavigationRef.current = true;
        window.location.reload();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Failed to delete office hour.");
      }
    });
  }

  return (
    <div className="rounded-lg border border-dune bg-shell p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-3xl text-cocoa">Office Hours</h3>
          <p className="mt-2 text-sm text-cocoa/70">
            Manage live signup and replay links for higher-tier members.
          </p>
        </div>
        <span className="rounded-full bg-sand px-3 py-1 text-sm text-cocoa/70">
          {source === "supabase" ? "Live" : "Demo"}
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => selectItem(item)}
            aria-pressed={item.id === draft.id}
            className={`w-full rounded-md p-4 text-left transition-colors ${
              item.id === draft.id ? "bg-cocoa text-white" : "bg-sand text-cocoa"
            }`}
          >
            <p className="font-semibold">{item.title}</p>
            <p className={item.id === draft.id ? "mt-1 text-sm text-white/70" : "mt-1 text-sm text-cocoa/65"}>
              {new Date(item.startsAt).toLocaleString()} · {formatEntitlementList(item.requiredEntitlements)}
            </p>
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4">
        <label className="grid gap-2 text-sm text-cocoa/75">
          Title
          <input
            value={draft.title}
            onChange={(event) => updateDraft("title", event.target.value)}
            className="rounded-md border border-dune bg-white px-4 py-3 text-cocoa outline-none"
          />
        </label>
        <label className="grid gap-2 text-sm text-cocoa/75">
          Starts at
          <input
            type="datetime-local"
            value={draft.startsAt}
            onChange={(event) => updateDraft("startsAt", event.target.value)}
            className="rounded-md border border-dune bg-white px-4 py-3 text-cocoa outline-none"
          />
        </label>
        <label className="grid gap-2 text-sm text-cocoa/75">
          Signup URL
          <input
            value={draft.signupUrl}
            onChange={(event) => updateDraft("signupUrl", event.target.value)}
            className="rounded-md border border-dune bg-white px-4 py-3 text-cocoa outline-none"
          />
        </label>
        <label className="grid gap-2 text-sm text-cocoa/75">
          Replay URL
          <input
            value={draft.replayUrl}
            onChange={(event) => updateDraft("replayUrl", event.target.value)}
            className="rounded-md border border-dune bg-white px-4 py-3 text-cocoa outline-none"
          />
        </label>
        <label className="grid gap-2 text-sm text-cocoa/75">
          Required entitlement
          <select
            value={draft.requiredEntitlement}
            onChange={(event) =>
              updateDraft("requiredEntitlement", event.target.value as EntitlementKey)
            }
            className="rounded-md border border-dune bg-white px-4 py-3 text-cocoa outline-none"
          >
            {entitlementOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <p className="text-sm font-semibold text-cocoa/70" role="status">
          {isDirty
            ? "Unsaved changes"
            : draft.id
              ? `Saved version ${draft.expectedRevision}`
              : "New unsaved draft"}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={save}
          disabled={isPending || !canMutate || !isDirty}
          className="rounded-md bg-cocoa px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isPending ? "Saving..." : draft.id ? "Save office hour" : "Create office hour"}
        </button>
        <button
          type="button"
          onClick={createNew}
          disabled={isPending}
          className="rounded-md border border-cocoa px-5 py-3 text-sm font-semibold text-cocoa disabled:opacity-50"
        >
          New
        </button>
        <button
          type="button"
          onClick={deleteOfficeHour}
          disabled={isPending || !draft.id || !canMutate}
          className="rounded-md border border-clay px-5 py-3 text-sm font-semibold text-clay disabled:opacity-50"
        >
          Delete
        </button>
        {message ? <p className="text-sm text-cocoa/75">{message}</p> : null}
      </div>
    </div>
  );
}
