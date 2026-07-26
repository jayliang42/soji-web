import { describe, expect, it } from "vitest";
import {
  MAX_PRODUCT_FILE_BYTES,
  validateProductAssetFile
} from "@/lib/product-asset-validation";

function file(bytes: number[], name: string, type: string) {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("product asset validation", () => {
  it("accepts files whose type, extension, and signature agree", async () => {
    await expect(
      validateProductAssetFile(
        file([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31], "guide.pdf", "application/pdf")
      )
    ).resolves.toEqual({ extension: "pdf", fileName: "guide.pdf", ok: true });
    await expect(
      validateProductAssetFile(
        file(
          [0x50, 0x4b, 0x03, 0x04],
          "workbook.xlsx",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
      )
    ).resolves.toEqual({ extension: "xlsx", fileName: "workbook.xlsx", ok: true });
  });

  it("removes unsafe download filename characters", async () => {
    await expect(
      validateProductAssetFile(
        file(
          [0x25, 0x50, 0x44, 0x46, 0x2d],
          "folder/wealth\nguide.pdf",
          "application/pdf"
        )
      )
    ).resolves.toEqual({
      extension: "pdf",
      fileName: "folder_wealth_guide.pdf",
      ok: true
    });
  });

  it.each([
    [file([], "empty.pdf", "application/pdf"), "empty_product_file"],
    [file([1, 2, 3], "payload.exe", "application/octet-stream"), "unsupported_product_file_type"],
    [file([0x25, 0x50, 0x44, 0x46, 0x2d], "guide.zip", "application/pdf"), "product_file_extension_mismatch"],
    [file([1, 2, 3, 4, 5], "guide.pdf", "application/pdf"), "product_file_signature_mismatch"]
  ] as const)("rejects invalid file policy %#", async (candidate, reason) => {
    await expect(validateProductAssetFile(candidate)).resolves.toEqual({
      ok: false,
      reason
    });
  });

  it("rejects files over the storage limit before reading content", async () => {
    const oversized = {
      name: "large.pdf",
      size: MAX_PRODUCT_FILE_BYTES + 1,
      type: "application/pdf"
    } as File;

    await expect(validateProductAssetFile(oversized)).resolves.toEqual({
      ok: false,
      reason: "product_file_too_large"
    });
  });
});
