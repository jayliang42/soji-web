const MAX_CONTENT_IMAGE_BYTES = 5 * 1024 * 1024;

const allowedMimeTypes = {
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
} as const;

export type ContentImageMimeType = keyof typeof allowedMimeTypes;
export type ContentImageValidationError =
  | "empty_image"
  | "image_signature_mismatch"
  | "image_too_large"
  | "unsupported_image_type";

export function getContentImageExtension(mimeType: ContentImageMimeType) {
  return allowedMimeTypes[mimeType];
}

function hasBytes(bytes: Uint8Array, expected: readonly number[], offset = 0) {
  return expected.every((value, index) => bytes[offset + index] === value);
}

function hasValidSignature(mimeType: ContentImageMimeType, bytes: Uint8Array) {
  switch (mimeType) {
    case "image/gif":
      return (
        hasBytes(bytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
        hasBytes(bytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
      );
    case "image/jpeg":
      return hasBytes(bytes, [0xff, 0xd8, 0xff]);
    case "image/png":
      return hasBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/webp":
      return (
        hasBytes(bytes, [0x52, 0x49, 0x46, 0x46]) &&
        hasBytes(bytes, [0x57, 0x45, 0x42, 0x50], 8)
      );
  }
}

export async function validateContentImage(file: File): Promise<
  | { mimeType: ContentImageMimeType; ok: true }
  | { ok: false; reason: ContentImageValidationError }
> {
  if (!(file.type in allowedMimeTypes)) {
    return { ok: false, reason: "unsupported_image_type" };
  }
  if (file.size === 0) {
    return { ok: false, reason: "empty_image" };
  }
  if (file.size > MAX_CONTENT_IMAGE_BYTES) {
    return { ok: false, reason: "image_too_large" };
  }

  const mimeType = file.type as ContentImageMimeType;
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (!hasValidSignature(mimeType, bytes)) {
    return { ok: false, reason: "image_signature_mismatch" };
  }

  return { mimeType, ok: true };
}
