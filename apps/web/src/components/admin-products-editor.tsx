"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { EntitlementKey, ProductOffer } from "@soji/types";

const entitlementOptions: Array<{ value: EntitlementKey; label: string }> = [
  { value: "product.digital", label: "Digital product" },
  { value: "product.case_study_single", label: "Single case study" },
  { value: "content.all", label: "All content" },
  { value: "library.templates", label: "Templates" },
  { value: "library.case_studies", label: "Case studies" },
  { value: "office_hours.join", label: "Office hours" }
];

type EditableProduct = {
  bullets: string;
  entitlementId: EntitlementKey;
  expectedRevision: number | null;
  id: string | null;
  isActive: boolean;
  priceCents: number;
  priceLabel: string;
  slug: string;
  stripePriceId: string;
  summary: string;
  title: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toEditableProduct(product: ProductOffer): EditableProduct {
  return {
    bullets: product.bullets.join("\n"),
    entitlementId: product.entitlement,
    expectedRevision: product.revision ?? 1,
    id: product.id,
    isActive: product.isActive ?? true,
    priceCents: Math.round(product.price * 100),
    priceLabel: product.priceLabel,
    slug: product.slug,
    stripePriceId: product.stripePriceId ?? "",
    summary: product.summary,
    title: product.title
  };
}

function emptyProduct(): EditableProduct {
  return {
    bullets: "",
    entitlementId: "product.digital",
    expectedRevision: null,
    id: null,
    isActive: false,
    priceCents: 0,
    priceLabel: "$0",
    slug: "",
    stripePriceId: "",
    summary: "",
    title: ""
  };
}

function getReasonMessage(reason: unknown) {
  if (!reason) {
    return "Request failed.";
  }

  if (typeof reason === "string") {
    const messages: Record<string, string> = {
      stripe_price_amount_mismatch:
        "Stripe price amount does not match Price cents.",
      stripe_price_currency_mismatch: "Stripe price must use USD.",
      stripe_price_inactive: "Activate this price in Stripe before saving.",
      stripe_price_lookup_failed:
        "Stripe could not verify this price ID. Check the ID and try again.",
      stripe_price_missing: "Add a Stripe price before activating this product.",
      stripe_price_must_be_one_time: "Use a one-time Stripe price for products.",
      stripe_price_not_configured:
        "Configure the Stripe secret key before mapping product prices.",
      product_delivery_missing:
        "Upload a private delivery file before activating this product.",
      product_delivery_lookup_failed:
        "The delivery file status could not be checked. Try again.",
      product_archive_conflict:
        "Another editor saved this product first. Refresh before archiving it.",
      product_not_found: "This product no longer exists. Refresh the workspace.",
      product_slug_conflict: "That slug is already used by another product.",
      product_update_conflict:
        "Another editor saved this product first. Refresh before applying your changes.",
      product_asset_conflict:
        "Another editor changed this delivery file first. Refresh before trying again.",
      product_asset_not_found:
        "This delivery file was removed by another editor. Refresh the workspace.",
      invalid_product_asset_revision:
        "The delivery file version is missing. Refresh the workspace and try again.",
      product_must_be_created_as_draft:
        "Create the product as an inactive draft, upload its delivery file, then activate it.",
      empty_product_file: "Choose a non-empty product file.",
      product_file_extension_mismatch:
        "The file extension does not match its document type.",
      product_file_signature_mismatch:
        "The file contents do not match the selected document type.",
      product_file_too_large: "Product files must be 25 MB or smaller.",
      unsupported_product_file_type:
        "Upload a PDF, ZIP, XLSX, or DOCX product file."
    };
    return messages[reason] ?? "Request failed.";
  }

  return "Request failed. Check the product fields and try again.";
}

function toPayload(current: EditableProduct) {
  const title = current.title.trim();
  const slug = slugify(current.slug || title);
  const summary = current.summary.trim();
  const priceLabel = current.priceLabel.trim();
  const bullets = current.bullets
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const basePayload = {
    bullets,
    entitlementId: current.entitlementId,
    isActive: current.isActive,
    priceCents: current.priceCents,
    priceLabel,
    slug,
    stripePriceId: current.stripePriceId.trim(),
    summary,
    title
  };

  return current.id
    ? {
        ...basePayload,
        expectedRevision: current.expectedRevision,
        id: current.id
      }
    : basePayload;
}

export function AdminProductsEditor({
  enabled,
  items,
  source
}: {
  enabled: boolean;
  items: ProductOffer[];
  source: "supabase" | "demo";
}) {
  const canMutate = enabled && source === "supabase";
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? "");
  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? items[0] ?? null,
    [items, selectedId]
  );
  const [draft, setDraft] = useState<EditableProduct>(
    selectedItem ? toEditableProduct(selectedItem) : emptyProduct()
  );
  const deliveryAsset = useMemo(
    () => items.find((item) => item.id === draft.id)?.deliveryAsset,
    [draft.id, items]
  );
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const allowNavigationRef = useRef(false);
  const persistedDraft = useMemo(() => {
    if (!draft.id) {
      return emptyProduct();
    }
    const item = items.find((candidate) => candidate.id === draft.id);
    return item ? toEditableProduct(item) : null;
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

  function selectItem(item: ProductOffer) {
    if (item.id === draft.id) {
      return;
    }
    if (
      isDirty &&
      !window.confirm(`Discard unsaved changes to "${draft.title || "this product"}"?`)
    ) {
      return;
    }
    setSelectedId(item.id);
    setDraft(toEditableProduct(item));
    setMessage(null);
  }

  function createNew() {
    if (!draft.id && !isDirty) {
      return;
    }
    if (isDirty && !window.confirm("Discard unsaved product changes and start a new draft?")) {
      return;
    }
    setSelectedId("");
    setDraft(emptyProduct());
    setMessage(null);
  }

  function updateDraft<T extends keyof EditableProduct>(
    key: T,
    value: EditableProduct[T]
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function save() {
    if (!canMutate) {
      setMessage("Connect Supabase and use an editor/admin account before editing products.");
      return;
    }

    startTransition(async () => {
      try {
        setMessage(null);
        const response = await fetch("/api/admin/products", {
          method: draft.id ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(toPayload(draft))
        });
        const result = (await response.json().catch(() => null)) as
          | { ok?: boolean; reason?: unknown }
          | null;

        if (!response.ok || !result?.ok) {
          throw new Error(getReasonMessage(result?.reason));
        }

        setMessage("Product saved. Refreshing list...");
        allowNavigationRef.current = true;
        window.location.reload();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Failed to save product.");
      }
    });
  }

  function archive() {
    if (!draft.id) {
      setMessage("Select an existing product before archiving.");
      return;
    }

    if (!canMutate) {
      setMessage("Connect Supabase and use an editor/admin account before archiving.");
      return;
    }

    const confirmed = window.confirm(
      `Archive "${draft.title}" from the shop?${isDirty ? " Unsaved field changes will be discarded." : ""}`
    );
    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      try {
        setMessage(null);
        const response = await fetch("/api/admin/products", {
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

        setMessage("Product archived. Refreshing list...");
        allowNavigationRef.current = true;
        window.location.reload();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Failed to archive product.");
      }
    });
  }

  function uploadDeliveryAsset(file: File) {
    if (!draft.id || !canMutate) {
      setMessage("Save this product as an inactive draft before uploading a file.");
      return;
    }
    if (
      isDirty &&
      !window.confirm("Discard unsaved product field changes and upload this file?")
    ) {
      return;
    }

    startTransition(async () => {
      try {
        setMessage(null);
        const formData = new FormData();
        formData.set("file", file);
        formData.set("expectedRevision", deliveryAsset ? String(deliveryAsset.revision) : "none");
        const response = await fetch(`/api/admin/products/${draft.id}/asset`, {
          body: formData,
          method: "POST"
        });
        const result = (await response.json().catch(() => null)) as
          | { ok?: boolean; reason?: unknown }
          | null;
        if (!response.ok || !result?.ok) {
          throw new Error(getReasonMessage(result?.reason));
        }

        setMessage("Private delivery file saved. Refreshing product status...");
        allowNavigationRef.current = true;
        window.location.reload();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Failed to upload file.");
      }
    });
  }

  function removeDeliveryAsset() {
    if (!draft.id || !deliveryAsset || !canMutate) {
      return;
    }
    if (
      !window.confirm(
        `Remove "${deliveryAsset.fileName}" and deactivate this product?${isDirty ? " Unsaved field changes will be discarded." : ""}`
      )
    ) {
      return;
    }

    startTransition(async () => {
      try {
        setMessage(null);
        const response = await fetch(`/api/admin/products/${draft.id}/asset`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ expectedRevision: deliveryAsset.revision })
        });
        const result = (await response.json().catch(() => null)) as
          | { ok?: boolean; reason?: unknown }
          | null;
        if (!response.ok || !result?.ok) {
          throw new Error(getReasonMessage(result?.reason));
        }

        setMessage("Delivery file removed and product deactivated. Refreshing...");
        allowNavigationRef.current = true;
        window.location.reload();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Failed to remove file.");
      }
    });
  }

  return (
    <div className="rounded-lg border border-dune bg-shell p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-3xl text-cocoa">Products</h3>
          <p className="mt-2 text-sm text-cocoa/70">
            Manage shop offers, Stripe price IDs, and product entitlement mapping.
          </p>
        </div>
        <span className="rounded-md bg-sand px-3 py-1 text-sm text-cocoa/70">
          {source === "supabase" ? "Live products" : "Demo products"}
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
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-semibold">{item.title}</p>
              <p className={item.id === draft.id ? "text-white/80" : "text-cocoa/70"}>
                {item.priceLabel}
              </p>
            </div>
            <p className={item.id === draft.id ? "mt-1 text-sm text-white/70" : "mt-1 text-sm text-cocoa/65"}>
              {item.stripePriceId ? "Stripe mapped" : "Missing Stripe price"} ·{" "}
              {item.deliveryAsset ? "delivery ready" : "missing delivery file"} ·{" "}
              {item.isActive === false ? "archived" : "active"}
            </p>
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4">
        <label className="grid gap-2 text-sm text-cocoa/75">
          Title
          <input
            value={draft.title}
            onChange={(event) => {
              const nextTitle = event.target.value;
              updateDraft("title", nextTitle);
              if (!draft.slug) {
                updateDraft("slug", slugify(nextTitle));
              }
            }}
            className="rounded-md border border-dune bg-white px-4 py-3 text-cocoa outline-none"
          />
        </label>
        <label className="grid gap-2 text-sm text-cocoa/75">
          Slug
          <input
            value={draft.slug}
            onChange={(event) => updateDraft("slug", slugify(event.target.value))}
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
            Price cents
            <input
              type="number"
              min={0}
              value={draft.priceCents}
              onChange={(event) =>
                updateDraft("priceCents", Math.max(0, Number(event.target.value)))
              }
              className="rounded-md border border-dune bg-white px-4 py-3 text-cocoa outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-cocoa/75">
            Price label
            <input
              value={draft.priceLabel}
              onChange={(event) => updateDraft("priceLabel", event.target.value)}
              className="rounded-md border border-dune bg-white px-4 py-3 text-cocoa outline-none"
            />
          </label>
        </div>
        <label className="grid gap-2 text-sm text-cocoa/75">
          Stripe price ID
          <input
            value={draft.stripePriceId}
            onChange={(event) => updateDraft("stripePriceId", event.target.value)}
            placeholder="price_..."
            className="rounded-md border border-dune bg-white px-4 py-3 text-cocoa outline-none"
          />
        </label>
        <div className="grid gap-3 rounded-md border border-dune bg-white p-4 text-sm text-cocoa/75">
          <div>
            <p className="font-semibold text-cocoa">Private delivery file</p>
            <p className="mt-1 text-cocoa/65">
              {deliveryAsset
                ? `${deliveryAsset.fileName} · ${(deliveryAsset.sizeBytes / 1024 / 1024).toFixed(1)} MB`
                : draft.id
                  ? "No file uploaded. This product cannot be activated."
                  : "Save an inactive draft before uploading its file."}
            </p>
          </div>
          {draft.id ? (
            <div className="flex flex-wrap items-center gap-3">
              <label className="cursor-pointer rounded-md border border-cocoa px-4 py-2 font-semibold text-cocoa">
                {deliveryAsset ? "Replace file" : "Upload file"}
                <input
                  type="file"
                  accept=".pdf,.zip,.xlsx,.docx,application/pdf,application/zip,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="sr-only"
                  disabled={isPending || !canMutate}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      uploadDeliveryAsset(file);
                    }
                    event.target.value = "";
                  }}
                />
              </label>
              {deliveryAsset ? (
                <button
                  type="button"
                  onClick={removeDeliveryAsset}
                  disabled={isPending || !canMutate}
                  className="rounded-md border border-clay px-4 py-2 font-semibold text-clay disabled:opacity-50"
                >
                  Remove file
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        <label className="grid gap-2 text-sm text-cocoa/75">
          Unlock entitlement
          <select
            value={draft.entitlementId}
            onChange={(event) =>
              updateDraft("entitlementId", event.target.value as EntitlementKey)
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
        <label className="grid gap-2 text-sm text-cocoa/75">
          Bullets
          <textarea
            value={draft.bullets}
            onChange={(event) => updateDraft("bullets", event.target.value)}
            rows={5}
            className="rounded-md border border-dune bg-white px-4 py-3 text-cocoa outline-none"
          />
        </label>
        <label className="flex items-center gap-3 text-sm font-semibold text-cocoa">
          <input
            type="checkbox"
            checked={draft.isActive}
            disabled={!deliveryAsset}
            onChange={(event) => updateDraft("isActive", event.target.checked)}
          />
          Active in shop
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
          {isPending ? "Saving..." : draft.id ? "Save product" : "Create product"}
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
          onClick={archive}
          disabled={isPending || !draft.id || !canMutate}
          className="rounded-md border border-clay px-5 py-3 text-sm font-semibold text-clay disabled:opacity-50"
        >
          Archive
        </button>
        {message ? (
          <p aria-live="polite" className="text-sm text-cocoa/75" role="status">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
