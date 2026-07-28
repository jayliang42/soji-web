"use client";

import { useState, useTransition } from "react";
import type { ContentType, EntitlementKey, Visibility } from "@soji/types";
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

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function AdminContentForm({
  enabled
}: {
  enabled: boolean;
}) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [summary, setSummary] = useState("");
  const [preview, setPreview] = useState("");
  const [type, setType] = useState<ContentType>("article");
  const [visibility, setVisibility] = useState<Visibility>("members_only");
  const [body, setBody] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [coverImageAlt, setCoverImageAlt] = useState("");
  const [tags, setTags] = useState("");
  const [requiredEntitlements, setRequiredEntitlements] = useState<EntitlementKey[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleEntitlement(entitlement: EntitlementKey) {
    setRequiredEntitlements((current) =>
      current.includes(entitlement)
        ? current.filter((item) => item !== entitlement)
        : [...current, entitlement]
    );
  }

  function resetForm() {
    setTitle("");
    setSlug("");
    setSummary("");
    setPreview("");
    setType("article");
    setVisibility("members_only");
    setBody("");
    setCoverImage("");
    setCoverImageAlt("");
    setTags("");
    setRequiredEntitlements([]);
  }

  function submit() {
    if (!enabled) {
      setMessage("Your account needs editor or admin access before publishing.");
      return;
    }

    startTransition(async () => {
      try {
        setMessage(null);
        const response = await fetch("/api/admin/content", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            slug: slug || slugify(title),
            title,
            summary,
            preview,
            type,
            visibility,
            body,
            coverImage,
            coverImageAlt,
            tags: tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean),
            requiredEntitlements
          })
        });

        const result = (await response.json().catch(() => null)) as
          | { ok?: boolean; reason?: string; item?: { slug?: string } }
          | null;

        if (!response.ok || !result?.ok) {
          throw new Error(result?.reason ?? "Failed to create content.");
        }

        resetForm();
        setMessage(`Published successfully: ${result.item?.slug ?? "new-content"}`);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Failed to create content.");
      }
    });
  }

  return (
    <div className="rounded-lg border border-dune bg-shell p-6">
      <h3 className="font-display text-3xl text-cocoa">Create Content</h3>
      <p className="mt-3 text-sm text-cocoa/75">
        This form writes to `content_items` and `content_access_rules`.
      </p>
      <div className="mt-6 grid gap-4">
        <label className="grid gap-2 text-sm text-cocoa/75">
          Title
          <input
            value={title}
            onChange={(event) => {
              const nextTitle = event.target.value;
              setTitle(nextTitle);
              if (!slug) {
                setSlug(slugify(nextTitle));
              }
            }}
            className="rounded-md border border-dune bg-white px-4 py-3 text-cocoa outline-none"
          />
        </label>
        <label className="grid gap-2 text-sm text-cocoa/75">
          Slug
          <input
            value={slug}
            onChange={(event) => setSlug(slugify(event.target.value))}
            className="rounded-md border border-dune bg-white px-4 py-3 text-cocoa outline-none"
          />
        </label>
        <label className="grid gap-2 text-sm text-cocoa/75">
          Summary
          <textarea
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            rows={3}
            className="rounded-md border border-dune bg-white px-4 py-3 text-cocoa outline-none"
          />
        </label>
        <label className="grid gap-2 text-sm text-cocoa/75">
          Public preview
          <textarea
            value={preview}
            onChange={(event) => setPreview(event.target.value)}
            rows={6}
            placeholder="Give visitors a useful opening before the membership boundary."
            className="rounded-md border border-dune bg-white px-4 py-3 text-cocoa outline-none"
          />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-cocoa/75">
            Type
            <select
              value={type}
              onChange={(event) => setType(event.target.value as ContentType)}
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
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as Visibility)}
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
          enabled={enabled}
          value={coverImage}
          onChange={setCoverImage}
        />
        <label className="grid gap-2 text-sm text-cocoa/75">
          Cover description
          <input
            value={coverImageAlt}
            onChange={(event) => setCoverImageAlt(event.target.value)}
            placeholder="Describe the editorial image for readers who cannot see it."
            className="rounded-md border border-dune bg-white px-4 py-3 text-cocoa outline-none"
          />
        </label>
        <label className="grid gap-2 text-sm text-cocoa/75">
          Tags
          <input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="Decision making, Money clarity"
            className="rounded-md border border-dune bg-white px-4 py-3 text-cocoa outline-none"
          />
        </label>
        <MarkdownEditor value={body} onChange={setBody} rows={10} />
        <div className="grid gap-3">
          <p className="text-sm text-cocoa/75">Required entitlements</p>
          <div className="flex flex-wrap gap-3">
            {entitlementOptions.map((option) => {
              const active = requiredEntitlements.includes(option.value);
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
      </div>
      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className="rounded-md bg-cocoa px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isPending ? "Publishing..." : "Publish content"}
        </button>
        {message ? <p className="text-sm text-cocoa/80">{message}</p> : null}
      </div>
    </div>
  );
}
