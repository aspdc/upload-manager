"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { signInWithCloudflare } from "@/lib/auth-client";

export default function SignInPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setError(null);
    setLoading(true);

    const result = await signInWithCloudflare();

    if (result.error) {
      setError(result.error.message ?? "Sign in failed");
      setLoading(false);
      return;
    }

    const oauth = result.data;
    if (oauth && "url" in oauth && typeof oauth.url === "string") {
      window.location.href = oauth.url;
    }
  }

  return (
    <section className="flex min-h-screen w-full items-center justify-center py-4 lg:py-20">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold">R2 Upload Manager</h2>
          <p className="text-sm text-muted-foreground">
            Sign in with your Cloudflare account to upload photos to your public
            R2 bucket.
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button
          type="button"
          className="w-full"
          disabled={loading}
          onClick={handleSignIn}
        >
          {loading && <Spinner className="mr-2" />}
          Sign in with Cloudflare
        </Button>
      </div>
    </section>
  );
}
