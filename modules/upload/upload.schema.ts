import { z } from "zod";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";

export const uploadTargetSchema = z.object({
  accountId: z.string().min(1),
  bucketName: z.string().min(1),
  publicBaseUrl: z.url(),
});

export type UploadTarget = z.infer<typeof uploadTargetSchema>;

export const conflictCheckSchema = z.object({
  accountId: z.string().min(1),
  bucketName: z.string().min(1),
  keys: z.array(z.string().min(1)).min(1),
});

export type ConflictCheckInput = z.infer<typeof conflictCheckSchema>;

export const conflictStrategySchema = z.enum(["overwrite", "copy"]);

export type ConflictStrategy = z.infer<typeof conflictStrategySchema>;

export const uploadedItemSchema = z.object({
  key: z.string().min(1),
  publicUrl: z.url(),
  contentType: z.string().min(1),
  size: z.number().int().nonnegative(),
});

export type UploadedItem = z.infer<typeof uploadedItemSchema>;

export const uploadResultSchema = z.object({
  items: z.array(uploadedItemSchema),
  copyPayload: z.string(),
  batchName: z.string().optional(),
  historySaved: z.boolean().optional(),
  error: z.string().optional(),
});

export type UploadResult = z.infer<typeof uploadResultSchema>;

export function buildCopyPayload(urls: string[]): string {
  if (urls.length === 1) {
    return urls[0] ?? "";
  }
  return urls.join(",");
}

const MIME_EXTENSION_MAP: Record<string, readonly string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/gif": ["gif"],
  "image/webp": ["webp"],
  "image/svg+xml": ["svg"],
  "image/avif": ["avif"],
  "image/bmp": ["bmp"],
  "image/tiff": ["tif", "tiff"],
  "image/heic": ["heic"],
  "image/heif": ["heif"],
  "image/x-icon": ["ico"],
};

function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === filename.length - 1) {
    return "";
  }
  return filename.slice(lastDot + 1).toLowerCase();
}

function getBaseName(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot <= 0) {
    return filename;
  }
  return filename.slice(0, lastDot);
}

export function splitFilename(filename: string): {
  baseName: string;
  extension: string;
} {
  const extension = getExtension(filename);
  if (!extension) {
    return { baseName: filename, extension: "" };
  }
  return {
    baseName: getBaseName(filename),
    extension: `.${extension}`,
  };
}

export function buildCopyKey(originalKey: string, copyIndex: number): string {
  const { baseName, extension } = splitFilename(originalKey);
  return `${baseName} (${copyIndex})${extension}`;
}

const COPY_KEY_PATTERN = /^(.*) \((\d+)\)(\.[^.]+)?$/;

export function parseCopyKey(key: string): {
  baseName: string;
  copyIndex: number;
  extension: string;
} | null {
  const match = key.match(COPY_KEY_PATTERN);
  if (!match) {
    return null;
  }

  return {
    baseName: match[1] ?? "",
    copyIndex: Number.parseInt(match[2] ?? "0", 10),
    extension: match[3] ?? "",
  };
}

export function mimeMatchesExtension(
  mimeType: string,
  filename: string,
): boolean {
  const extension = getExtension(filename);
  if (!extension) {
    return false;
  }

  const allowed = MIME_EXTENSION_MAP[mimeType];
  if (!allowed) {
    return mimeType.startsWith("image/");
  }

  return allowed.includes(extension);
}

export function validateImageFile(file: {
  name: string;
  type: string;
  size: number;
}): { valid: true } | { valid: false; error: string } {
  if (!file.type.startsWith("image/")) {
    return {
      valid: false,
      error: `${file.name}: only image files are allowed`,
    };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      valid: false,
      error: `${file.name}: exceeds the 10 MB size limit`,
    };
  }

  if (!mimeMatchesExtension(file.type, file.name)) {
    return {
      valid: false,
      error: `${file.name}: file extension does not match its image type`,
    };
  }

  if (file.name.includes("/") || file.name.includes("\\")) {
    return {
      valid: false,
      error: `${file.name}: filename cannot contain path separators`,
    };
  }

  return { valid: true };
}
