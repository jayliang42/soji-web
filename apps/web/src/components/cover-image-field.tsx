"use client";

import { useRef, useState, useTransition } from "react";

function getReasonMessage(reason: unknown) {
  if (!reason) {
    return "Upload failed.";
  }

  if (typeof reason === "string") {
    if (reason === "missing_file") {
      return "Choose an image before uploading.";
    }

    if (reason === "unsupported_image_type") {
      return "Use a JPG, PNG, WebP, or GIF image.";
    }

    if (reason === "image_too_large") {
      return "Use an image under 5 MB.";
    }

    if (reason === "empty_image") {
      return "The selected image file is empty.";
    }

    if (reason === "image_signature_mismatch") {
      return "The file contents do not match its image type.";
    }

    if (reason === "invalid_upload_request" || reason === "upload_failed") {
      return "Upload failed. Check the image and try again.";
    }

    return "Upload failed. Check the image and try again.";
  }

  return "Upload failed. Check the image and try again.";
}

export function CoverImageField({
  disabled = false,
  enabled,
  onChange,
  value
}: {
  disabled?: boolean;
  enabled: boolean;
  onChange: (value: string) => void;
  value: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isDisabled = disabled || isPending;

  function upload(file: File) {
    if (!enabled) {
      setMessage("Sign in with an editor/admin account before uploading.");
      return;
    }

    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      try {
        setMessage("Uploading image...");
        const response = await fetch("/api/admin/upload", {
          method: "POST",
          body: formData
        });
        const result = (await response.json().catch(() => null)) as
          | { ok?: boolean; reason?: unknown; url?: string }
          | null;

        if (!response.ok || !result?.ok || !result.url) {
          throw new Error(getReasonMessage(result?.reason));
        }

        onChange(result.url);
        setMessage("Cover image uploaded.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Upload failed.");
      } finally {
        if (inputRef.current) {
          inputRef.current.value = "";
        }
      }
    });
  }

  return (
    <div className="grid gap-3 text-sm text-cocoa/75">
      <label className="grid gap-2">
        Cover image URL
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="rounded-md border border-dune bg-white px-4 py-3 text-cocoa outline-none"
        />
      </label>

      {value ? (
        <div className="overflow-hidden rounded-md border border-dune bg-white">
          {/* Admin previews accept arbitrary public image URLs before publishing. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Cover preview"
            className="aspect-[16/9] w-full object-cover"
          />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <label
          className={`rounded-md border border-cocoa px-4 py-2 text-sm font-semibold ${
            isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
          }`}
        >
          Upload image
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={isDisabled}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                upload(file);
              }
            }}
            className="sr-only"
          />
        </label>
        {message ? <p className="text-cocoa/70" role="status">{message}</p> : null}
      </div>
    </div>
  );
}
