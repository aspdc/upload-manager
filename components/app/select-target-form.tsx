"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MessagePanel, COPY } from "@/components/app/messages";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { apiClient } from "@/lib/api-client";
import type { CloudflareAccount, PublicBucket } from "@/modules/target";

type Step = "account" | "bucket";

async function saveSelection(
  accountId: string,
  bucket: PublicBucket,
): Promise<string | null> {
  const response = await apiClient.api.target.select.post({
    accountId,
    bucketName: bucket.name,
    publicBaseUrl: bucket.publicBaseUrl,
  });

  if (response.error) {
    return typeof response.error.value === "object" &&
      response.error.value &&
      "error" in response.error.value
      ? String(response.error.value.error)
      : "Failed to save bucket selection";
  }

  return null;
}

function getApiErrorMessage(
  response: {
    error: { value: unknown } | null;
  },
  fallback: string,
) {
  if (
    response.error &&
    typeof response.error.value === "object" &&
    response.error.value &&
    "error" in response.error.value
  ) {
    return String(response.error.value.error);
  }

  return fallback;
}

export function SelectTargetForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("account");
  const [accounts, setAccounts] = useState<CloudflareAccount[]>([]);
  const [buckets, setBuckets] = useState<PublicBucket[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingBuckets, setLoadingBuckets] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBucketSelect(accountId: string, bucket: PublicBucket) {
    setSubmitting(true);
    setError(null);

    const saveError = await saveSelection(accountId, bucket);

    if (saveError) {
      setError(saveError);
      setSubmitting(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleAccountSelect(accountId: string) {
    setSelectedAccountId(accountId);
    setLoadingBuckets(true);
    setError(null);

    const response = await apiClient.api.target
      .accounts({ accountId })
      .buckets.get();

    if (response.error || !response.data || response.data instanceof Response) {
      setError(getApiErrorMessage(response, "Failed to load buckets"));
      setBuckets([]);
      setLoadingBuckets(false);
      return;
    }

    const nextBuckets = response.data.buckets ?? [];
    setBuckets(nextBuckets);
    setLoadingBuckets(false);
    setStep("bucket");

    if (nextBuckets.length === 1) {
      await handleBucketSelect(accountId, nextBuckets[0]!);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadAccounts() {
      const response = await apiClient.api.target.accounts.get();

      if (cancelled) {
        return;
      }

      if (
        response.error ||
        !response.data ||
        response.data instanceof Response
      ) {
        setError(
          getApiErrorMessage(response, "Failed to load Cloudflare accounts"),
        );
        setAccounts([]);
        setLoadingAccounts(false);
        return;
      }

      const nextAccounts = response.data.accounts ?? [];
      setAccounts(nextAccounts);
      setLoadingAccounts(false);

      if (nextAccounts.length === 1) {
        await handleAccountSelect(nextAccounts[0]!.id);
      }
    }

    void loadAccounts();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial account load only
  }, []);

  if (loadingAccounts) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner />
        Loading Cloudflare accounts…
      </div>
    );
  }

  if (error && accounts.length === 0) {
    return (
      <MessagePanel
        title="Could not load accounts"
        description={error}
        variant="destructive"
      />
    );
  }

  if (step === "account") {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">Choose an account</h1>
          <p className="text-sm text-muted-foreground">
            Pick the Cloudflare account that owns your public R2 bucket.
          </p>
        </div>

        {error ? (
          <MessagePanel
            title="Selection failed"
            description={error}
            variant="destructive"
          />
        ) : null}

        <div className="grid gap-3">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardHeader>
                <CardTitle>{account.name}</CardTitle>
                <CardDescription>{account.id}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  disabled={submitting}
                  onClick={() => void handleAccountSelect(account.id)}
                >
                  Use this account
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (loadingBuckets || submitting) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner />
        {submitting ? "Saving your bucket…" : "Loading public buckets…"}
      </div>
    );
  }

  if (buckets.length === 0) {
    return (
      <div className="space-y-4">
        <MessagePanel
          title={COPY.noPublicBuckets.title}
          description={COPY.noPublicBuckets.description}
        />
        {accounts.length > 1 ? (
          <Button variant="outline" onClick={() => setStep("account")}>
            Choose a different account
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Choose a bucket</h1>
        <p className="text-sm text-muted-foreground">
          Only buckets with a public r2.dev URL are shown.
        </p>
      </div>

      {error ? (
        <MessagePanel
          title="Selection failed"
          description={error}
          variant="destructive"
        />
      ) : null}

      <div className="grid gap-3">
        {buckets.map((bucket) => (
          <Card key={bucket.name}>
            <CardHeader>
              <CardTitle>{bucket.name}</CardTitle>
              <CardDescription>{bucket.publicBaseUrl}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                disabled={submitting}
                onClick={() =>
                  void handleBucketSelect(selectedAccountId ?? "", bucket)
                }
              >
                Use this bucket
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {accounts.length > 1 ? (
        <Button variant="outline" onClick={() => setStep("account")}>
          Choose a different account
        </Button>
      ) : null}
    </div>
  );
}
