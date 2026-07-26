export const PRODUCT_FILES_BUCKET = "product-files";
export const MAX_PRODUCT_FILE_BYTES = 25 * 1024 * 1024;

const allowedProductFileTypes = {
  "application/pdf": { extension: "pdf", signature: "pdf" },
  "application/zip": { extension: "zip", signature: "zip" },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    extension: "xlsx",
    signature: "zip"
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    extension: "docx",
    signature: "zip"
  }
} as const;

type AllowedProductFileType = keyof typeof allowedProductFileTypes;

function isAllowedProductFileType(value: string): value is AllowedProductFileType {
  return value in allowedProductFileTypes;
}

function hasPdfSignature(bytes: Uint8Array) {
  return bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
}

function hasZipSignature(bytes: Uint8Array) {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    [0x03, 0x05, 0x07].includes(bytes[2] ?? -1) &&
    [0x04, 0x06, 0x08].includes(bytes[3] ?? -1)
  );
}

export type ProductAssetValidation =
  | {
      extension: string;
      fileName: string;
      ok: true;
    }
  | {
      ok: false;
      reason:
        | "empty_product_file"
        | "product_file_extension_mismatch"
        | "product_file_signature_mismatch"
        | "product_file_too_large"
        | "unsupported_product_file_type";
    };

export async function validateProductAssetFile(
  file: File
): Promise<ProductAssetValidation> {
  if (file.size === 0) {
    return { ok: false, reason: "empty_product_file" };
  }
  if (file.size > MAX_PRODUCT_FILE_BYTES) {
    return { ok: false, reason: "product_file_too_large" };
  }
  if (!isAllowedProductFileType(file.type)) {
    return { ok: false, reason: "unsupported_product_file_type" };
  }

  const policy = allowedProductFileTypes[file.type];
  const fileName =
    file.name
      .trim()
      .replace(/[\u0000-\u001f\u007f/\\"]/g, "_")
      .slice(0, 180) || `product.${policy.extension}`;
  if (!fileName.toLowerCase().endsWith(`.${policy.extension}`)) {
    return { ok: false, reason: "product_file_extension_mismatch" };
  }

  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const signatureMatches =
    policy.signature === "pdf" ? hasPdfSignature(bytes) : hasZipSignature(bytes);
  if (!signatureMatches) {
    return { ok: false, reason: "product_file_signature_mismatch" };
  }

  return { extension: policy.extension, fileName, ok: true };
}
