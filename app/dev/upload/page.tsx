import { UploadPanel } from "@/components/upload";
import { env } from "@/env";

const DEV_TARGET = {
  accountId: "replace-with-account-id",
  bucketName: "replace-with-bucket-name",
  publicBaseUrl: "https://replace-with-pub-id.r2.dev",
} as const;

export default function DevUploadPage() {
  if (env.NODE_ENV === "production") {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        This page is only available in development.
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-6">
      <div>
        <h1 className="text-lg font-semibold">Upload demo</h1>
        <p className="text-sm text-muted-foreground">
          Development-only preview for Agent B upload components. Edit{" "}
          <code className="text-foreground">app/dev/upload/page.tsx</code> with
          a real account, bucket, and public base URL to test uploads.
        </p>
      </div>
      <UploadPanel target={DEV_TARGET} />
    </div>
  );
}
