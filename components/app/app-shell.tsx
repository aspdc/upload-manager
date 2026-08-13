"use client";

import { AppHeader } from "@/components/app/app-header";
import { HistoryTab } from "@/components/app/history-tab";
import { UploadTab } from "@/components/app/upload-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { UserTarget } from "@/modules/target";

type AppShellProps = {
  userName: string;
  initialTarget: UserTarget;
};

export function AppShell({ userName, initialTarget }: AppShellProps) {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-6 p-6">
      <AppHeader bucketName={initialTarget.bucketName} />
      <p className="text-xs text-muted-foreground">Signed in as {userName}</p>

      <Tabs defaultValue="upload">
        <TabsList>
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="upload" className="pt-4">
          <UploadTab target={initialTarget} />
        </TabsContent>
        <TabsContent value="history" className="pt-4">
          <HistoryTab target={initialTarget} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
