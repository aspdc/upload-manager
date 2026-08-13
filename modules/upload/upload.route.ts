import { Elysia } from "elysia";
import { getCloudflareAccessToken } from "@/lib/cloudflare-token";
import { tryCatch } from "@/lib/try-catch";
import {
  buildPublicUrl,
  objectExists,
  putObject,
} from "@/modules/cloudflare/r2";
import { requireAuth } from "@/middleware/auth";
import {
  buildCopyPayload,
  conflictCheckSchema,
  uploadTargetSchema,
  validateImageFile,
} from "./upload.schema";

type ParsedUploadFile = {
  key: string;
  contentType: string;
  body: ArrayBuffer;
  size: number;
};

async function parseMultipartUpload(request: Request): Promise<
  | {
      target: {
        accountId: string;
        bucketName: string;
        publicBaseUrl: string;
      };
      files: ParsedUploadFile[];
      error: null;
    }
  | { target: null; files: []; error: string }
> {
  const { data: formData, error } = await tryCatch(request.formData());
  if (error) {
    return { target: null, files: [], error: "Invalid upload request" };
  }

  const accountId = formData.get("accountId");
  const bucketName = formData.get("bucketName");
  const publicBaseUrl = formData.get("publicBaseUrl");
  const keysRaw = formData.get("keys");

  const targetParsed = uploadTargetSchema.safeParse({
    accountId: typeof accountId === "string" ? accountId : "",
    bucketName: typeof bucketName === "string" ? bucketName : "",
    publicBaseUrl: typeof publicBaseUrl === "string" ? publicBaseUrl : "",
  });

  if (!targetParsed.success) {
    return { target: null, files: [], error: "Upload target is invalid" };
  }

  let keys: string[] = [];
  if (typeof keysRaw === "string") {
    const { data: parsedKeys, error: keysError } = await tryCatch(
      Promise.resolve(JSON.parse(keysRaw) as unknown),
    );
    if (keysError || !Array.isArray(parsedKeys)) {
      return { target: null, files: [], error: "Upload keys are invalid" };
    }
    if (!parsedKeys.every((key) => typeof key === "string" && key.length > 0)) {
      return { target: null, files: [], error: "Upload keys are invalid" };
    }
    keys = parsedKeys;
  } else {
    return { target: null, files: [], error: "Upload keys are required" };
  }

  const fileEntries = formData.getAll("files");
  if (fileEntries.length === 0) {
    return { target: null, files: [], error: "No files were provided" };
  }

  if (fileEntries.length !== keys.length) {
    return {
      target: null,
      files: [],
      error: "Each file must have a matching object key",
    };
  }

  const files: ParsedUploadFile[] = [];

  for (let index = 0; index < fileEntries.length; index += 1) {
    const entry = fileEntries[index];
    const key = keys[index];

    if (!(entry instanceof File)) {
      return { target: null, files: [], error: "Invalid file entry in upload" };
    }

    const validation = validateImageFile({
      name: key,
      type: entry.type || "application/octet-stream",
      size: entry.size,
    });

    if (!validation.valid) {
      return { target: null, files: [], error: validation.error };
    }

    const { data: body, error: bodyError } = await tryCatch(
      entry.arrayBuffer(),
    );
    if (bodyError) {
      return {
        target: null,
        files: [],
        error: `Could not read ${key} for upload`,
      };
    }

    files.push({
      key,
      contentType: entry.type,
      body,
      size: entry.size,
    });
  }

  return {
    target: targetParsed.data,
    files,
    error: null,
  };
}

export const uploadRoutes = new Elysia({ prefix: "/upload" })
  .use(requireAuth)
  .post("/check-conflicts", async ({ request, body, status }) => {
    const parsed = conflictCheckSchema.safeParse(body);
    if (!parsed.success) {
      return status(400, {
        error: parsed.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", "),
        conflicts: [],
      });
    }

    const { data: accessToken } = await getCloudflareAccessToken(
      request.headers,
    );
    if (!accessToken) {
      return status(401, {
        error:
          "Cloudflare is not connected. Sign in with Cloudflare to upload files.",
        conflicts: [],
      });
    }

    const { accountId, bucketName, keys } = parsed.data;
    const conflicts: string[] = [];

    for (const key of keys) {
      const { exists, error } = await objectExists({
        accountId,
        bucketName,
        key,
        accessToken,
      });

      if (error) {
        return status(502, { error, conflicts: [] });
      }

      if (exists) {
        conflicts.push(key);
      }
    }

    return { conflicts };
  })
  .post("/", async ({ request, status }) => {
    const parsed = await parseMultipartUpload(request);
    if (parsed.error || !parsed.target) {
      return status(400, { error: parsed.error ?? "Invalid upload request" });
    }

    const { data: accessToken } = await getCloudflareAccessToken(
      request.headers,
    );
    if (!accessToken) {
      return status(401, {
        error:
          "Cloudflare is not connected. Sign in with Cloudflare to upload files.",
      });
    }

    const { accountId, bucketName, publicBaseUrl } = parsed.target;
    const uploadedItems: Array<{
      key: string;
      publicUrl: string;
      contentType: string;
      size: number;
    }> = [];

    for (const file of parsed.files) {
      const { etag, error } = await putObject({
        accountId,
        bucketName,
        key: file.key,
        body: file.body,
        contentType: file.contentType,
        accessToken,
      });

      if (error) {
        return status(502, {
          error: `${file.key}: ${error}`,
          items: uploadedItems,
        });
      }

      uploadedItems.push({
        key: file.key,
        publicUrl: buildPublicUrl(publicBaseUrl, file.key),
        contentType: file.contentType,
        size: file.size,
      });

      if (!etag) {
        continue;
      }
    }

    const urls = uploadedItems.map((item) => item.publicUrl);

    return {
      items: uploadedItems,
      copyPayload: buildCopyPayload(urls),
    };
  });
