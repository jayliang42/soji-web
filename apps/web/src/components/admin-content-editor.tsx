"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { ContentItem, ContentType, EntitlementKey, Visibility } from "@soji/types";
import { CoverImageField } from "@/components/cover-image-field";
import { MarkdownEditor } from "@/components/markdown-editor";

const contentTypeOptions: Array<{ value: ContentType; label: string }> = [
  { value: "article", label: "Article" },
  { value: "case_study", label: "Case Study" },
  { value: "template", label: "Template" },
  { value: "monthly_update", label: "Monthly Update" },
  { value: "product", label: "Product" },
  { value: "office_hour_session", label: "Office Hour Session" }
];

const visibilityOptions: Array<{ value: Visibility; label: string }> = [
  { value: "public", label: "Public" },
  { value: "members_only", label: "Members only" },
  { value: "purchase_required", label: "Purchase required" }
];

const entitlementOptions: Array<{ value: EntitlementKey; label: string }> = [
  { value: "content.basic", label: "Basic content" },
  { value: "content.all", label: "All content" },
  { value: "library.case_studies", label: "Case studies" },
  { value: "library.templates", label: "Templates" },
  { value: "monthly.updates", label: "Monthly updates" },
  { value: "office_hours.join", label: "Office hours" },
  { value: "community.vip_access", label: "VIP community" },
  { value: "contact.unlock", label: "Contact unlock" },
  { value: "product.digital", label: "Digital product" }
];

type EditableContent = {
  body: string;
  coverImage: string;
  expectedRevision: number;
  id: string;
  published: boolean;
  requiredEntitlements: EntitlementKey[];
  slug: string;
  summary: string;
  title: string;
  type: ContentType;
  visibility: Visibility;
};

const reasonMessages: Record<string, string> = {
  content_not_found: "This content no longer exists. Refresh the workspace.",
  content_delete_conflict:
    "Another editor saved this content first. Refresh before deleting it.",
  content_slug_conflict: "That slug is already used by another content item.",
  content_update_conflict:
    "Another editor saved this content first. Refresh before applying your changes."
};

function toEditableContent(item: ContentItem): EditableContent {
  return {
    body: item.body,
    coverImage: item.coverImage ?? "",
    expectedRevision: item.revision ?? 1,
    id: item.id,
    published: Boolean(item.publishedAt),
    requiredEntitlements: item.requiredEntitlements,
    slug: item.slug,
    summary: item.summary,
    title: item.title,
    type: item.type,
    visibility: item.visibility
  };
}

function getReasonMessage(reason: unknown) {
  if (!reason) {
    return "Request failed.";
  }

  if (typeof reason === "string") {
    return reasonMessages[reason] ?? reason;
  }

  return "Request failed. Check the form fields and try again.";
}

export function AdminContentEditor({
  enabled,
  items,
  source
}: {
  enabled: boolean;
  items: ContentItem[];
  source: "supabase" | "demo";
}) {
  const canMutate = enabled && source === "supabase";
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? "");
  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? items[0] ?? null,
    [items, selectedId]
  );
  const [draft, setDraft] = useState<EditableContent | null>(
    selectedItem ? toEditableContent(selectedItem) : null
  );
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const allowNavigationRef = useRef(false);
  const persistedDraft = useMemo(
    () => (selectedItem ? toEditableContent(selectedItem) : null),
    [selectedItem]
  );
  const isDirty = Boolean(
    draft && persistedDraft && JSON.stringify(draft) !== JSON.stringify(persistedDraft)
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

  function selectItem(item: ContentItem) {
    if (item.id === draft?.id) {
      return;
    }

    if (
      isDirty &&
      !window.confirm(`Discard unsaved changes to "${draft?.title ?? "this content"}"?`)
    ) {
      return;
    }

    setSelectedId(item.id);
    setDraft(toEditableContent(item));
    setMessage(null);
  }

  function updateDraft<T extends keyof EditableContent>(
    key: T,
    value: EditableContent[T]
  ) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  function toggleEntitlement(entitlement: EntitlementKey) {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      const requiredEntitlements = current.requiredEntitlements.includes(entitlement)
        ? current.requiredEntitlements.filter((item) => item !== entitlement)
        : [...current.requiredEntitlements, entitlement];

      return { ...current, requiredEntitlements };
    });
  }

  function save() {
    if (!draft) {
      return;
    }

    if (!canMutate) {
      setMessage("Connect Supabase and use an editor/admin account before editing.");
      return;
    }

    startTransition(async () => {
      try {
        setMessage(null);
        const response = await fetch("/api/admin/content", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(draft)
        });
        const result = (await response.json().catch(() => null)) as
          | { ok?: boolean; reason?: unknown }
          | null;

        if (!response.ok || !result?.ok) {
          throw new Error(getReasonMessage(result?.reason));
        }

        setMessage("Content saved. Refreshing list...");
        allowNavigationRef.current = true;
        window.location.reload();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Failed to save content.");
      }
    });
  }

  function deleteContent() {
    if (!draft) {
      return;
    }

    if (!canMutate) {
      setMessage("Connect Supabase and use an editor/admin account before deleting.");
      return;
    }

    const confirmed = window.confirm(`Delete "${draft.title}" permanently?`);
    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      try {
        setMessage(null);
        const response = await fetch("/api/admin/content", {
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

        setMessage("Content deleted. Refreshing list...");
        allowNavigationRef.current = true;
        window.location.reload();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Failed to delete content.");
      }
    });
  }

  return (
    <div className="rounded-lg border border-dune bg-shell p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-3xl text-cocoa">Content Queue</h3>
          <p className="mt-2 text-sm text-cocoa/70">
            Edit copy, access rules, and publish state from one place.
          </p>
        </div>
        <span className="rounded-full bg-sand px-3 py-1 text-sm text-cocoa/70">
          {source === "supabase" ? "Live content" : "Demo preview"}
        </span>
      </div>

      {items.length === 0 || !draft ? (
        <div className="mt-5 rounded-md bg-sand p-4 text-sm text-cocoa/70">
          No content published yet.
        </div>
      ) : (
        <div className="mt-6 grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-3">
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
                  {item.type} · {item.visibility} · {item.publishedAt ? "published" : "unpublished"}
                </p>
              </button>
            ))}
          </div>

          <div className="grid gap-4">
            <label className="grid gap-2 text-sm text-cocoa/75">
              Title
              <input
                value={draft.title}
                onChange={(event) => updateDraft("title", event.target.value)}
                className="rounded-md border border-dune bg-white px-4 py-3 text-cocoa outline-none"
              />
            </label>
            <label className="grid gap-2 text-sm text-cocoa/75">
              Slug
              <input
                value={draft.slug}
                onChange={(event) => updateDraft("slug", event.target.value)}
                className="rounded-md border border-dune bg-white px-4 py-3 text-cocoa outline-none"
              />
            </label>
            <label className="grid gap-2 text-sm text-cocoa/75">
              Summary
              <textarea
                value={draft.summary}
                onChange={(event) => updateDraft("summary", event.target.value)}
                rows={3}
                className="rounded-md border border-dune bg-white px-4 py-3 text-cocoa outline-none"
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-cocoa/75">
                Type
                <select
                  value={draft.type}
                  onChange={(event) => updateDraft("type", event.target.value as ContentType)}
                  className="rounded-md border border-dune bg-white px-4 py-3 text-cocoa outline-none"
                >
                  {contentTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm text-cocoa/75">
                Visibility
                <select
                  value={draft.visibility}
                  onChange={(event) =>
                    updateDraft("visibility", event.target.value as Visibility)
                  }
                  className="rounded-md border border-dune bg-white px-4 py-3 text-cocoa outline-none"
                >
                  {visibilityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <CoverImageField
              disabled={isPending}
              enabled={canMutate}
              value={draft.coverImage}
              onChange={(value) => updateDraft("coverImage", value)}
            />
            <MarkdownEditor
              value={draft.body}
              onChange={(value) => updateDraft("body", value)}
              rows={8}
            />
            <label className="flex items-center gap-3 text-sm font-semibold text-cocoa">
              <input
                type="checkbox"
                checked={draft.published}
                onChange={(event) => updateDraft("published", event.target.checked)}
              />
              Published in library
            </label>
            <p className="text-sm font-semibold text-cocoa/70" role="status">
              {isDirty ? "Unsaved changes" : `Saved version ${draft.expectedRevision}`}
            </p>
            <div className="grid gap-3">
              <p className="text-sm text-cocoa/75">Required entitlements</p>
              <div className="flex flex-wrap gap-3">
                {entitlementOptions.map((option) => {
                  const active = draft.requiredEntitlements.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleEntitlement(option.value)}
                      className={`rounded-md px-4 py-2 text-sm ${
                        active ? "bg-cocoa text-white" : "bg-sand text-cocoa"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={save}
                disabled={isPending || !canMutate || !isDirty}
                className="rounded-md bg-cocoa px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Save changes"}
              </button>
              <button
                type="button"
                onClick={deleteContent}
                disabled={isPending}
                className="rounded-md border border-clay px-5 py-3 text-sm font-semibold text-clay disabled:opacity-50"
              >
                Delete
              </button>
              {message ? <p className="text-sm text-cocoa/75">{message}</p> : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
