"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { clearTarget } from "@/lib/auth-client";
import { Spinner } from "@/components/ui/spinner";
import { useState } from "react";

type AppHeaderProps = {
  bucketName?: string | null;
};

export function AppHeader({ bucketName }: AppHeaderProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleChange() {
    setLoading(true);

    const result = await clearTarget();

    if (result.error) {
      setLoading(false);
      return;
    }

    router.push("/select-target");
    router.refresh();
  }

  return (
    <header className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs text-muted-foreground">R2 Upload Manager</p>
        <h1 className="text-lg font-semibold">
          {bucketName ?? "No bucket selected"}
        </h1>
      </div>
      <Button
        variant="link"
        className="h-auto p-0"
        disabled={loading}
        onClick={() => void handleChange()}
      >
        {loading ? <Spinner className="mr-2" /> : null}
        Change
      </Button>
    </header>
  );
}
