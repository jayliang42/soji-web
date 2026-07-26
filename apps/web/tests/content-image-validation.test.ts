import { describe, expect, it } from "vitest";
import { validateContentImage } from "@/lib/content-image-validation";

const validSignatures = [
  ["image/gif", [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
  ["image/jpeg", [0xff, 0xd8, 0xff, 0xe0]],
  ["image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  [
    "image/webp",
    [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]
  ]
] as const;

describe("content image validation", () => {
  it.each(validSignatures)("accepts a real %s signature", async (mimeType, bytes) => {
    const file = new File([new Uint8Array(bytes)], "cover", { type: mimeType });

    await expect(validateContentImage(file)).resolves.toEqual({
      mimeType,
      ok: true
    });
  });

  it("rejects a file whose bytes do not match its image MIME type", async () => {
    const file = new File(["<script>alert(1)</script>"], "cover.png", {
      type: "image/png"
    });

    await expect(validateContentImage(file)).resolves.toEqual({
      ok: false,
      reason: "image_signature_mismatch"
    });
  });

  it("rejects empty, oversized, and unsupported files", async () => {
    const empty = new File([], "empty.png", { type: "image/png" });
    const oversized = new File(
      [new Uint8Array(5 * 1024 * 1024 + 1)],
      "large.png",
      { type: "image/png" }
    );
    const unsupported = new File(["svg"], "cover.svg", {
      type: "image/svg+xml"
    });

    await expect(validateContentImage(empty)).resolves.toMatchObject({
      reason: "empty_image"
    });
    await expect(validateContentImage(oversized)).resolves.toMatchObject({
      reason: "image_too_large"
    });
    await expect(validateContentImage(unsupported)).resolves.toMatchObject({
      reason: "unsupported_image_type"
    });
  });
});
