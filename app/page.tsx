import { AppShell } from "@/components/app/app-shell";
import { requireTarget } from "@/lib/auth-guard";

export default async function Page() {
  const { session, target } = await requireTarget();

  return <AppShell userName={session.user.name} initialTarget={target} />;
}
