"use client";

import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import { splitFilename } from "@/modules/upload";

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

function jpegFileName(originalName: string): string {
  const { baseName } = splitFilename(originalName);
  const lower = originalName.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
    return originalName;
  }
  return `${baseName}.jpg`;
}

/**
 * Compress an image under maxBytes while keeping aspect ratio.
 * Outputs JPEG (good enough for event photos). May reduce dimensions if quality alone is not enough.
 */
export async function compressImageToMaxBytes(
  file: File,
  maxBytes: number = MAX_UPLOAD_BYTES,
): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(
      `${file.name}: this image type cannot be compressed in the browser`,
    );
  }

  try {
    let width = bitmap.width;
    let height = bitmap.height;
    const outputType = "image/jpeg";
    const outputName = jpegFileName(file.name);

    for (let scalePass = 0; scalePass < 10; scalePass += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width));
      canvas.height = Math.max(1, Math.round(height));

      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error(`${file.name}: could not compress image`);
      }

      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      for (let quality = 0.92; quality >= 0.45; quality -= 0.07) {
        const blob = await canvasToBlob(canvas, outputType, quality);
        if (blob && blob.size <= maxBytes) {
          return new File([blob], outputName, {
            type: outputType,
            lastModified: Date.now(),
          });
        }
      }

      width *= 0.75;
      height *= 0.75;
    }

    throw new Error(
      `${file.name}: could not compress under the 3 MB limit while keeping usable quality`,
    );
  } finally {
    bitmap.close();
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 ** 2) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}
