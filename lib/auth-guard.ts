import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserTarget, type UserTarget } from "@/lib/target";
import { headers } from "next/headers";

export async function getSession() {
  const hdrs = await headers();
  const session = await auth.api.getSession({
    headers: hdrs,
  });
  return session;
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }
  return session;
}

export async function optionalSession() {
  const session = await getSession();
  return session;
}

export async function requireTarget(): Promise<{
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>;
  target: UserTarget;
}> {
  const session = await requireSession();
  const target = await getUserTarget(session.user.id);

  if (!target) {
    redirect("/select-target");
  }

  return { session, target };
}

export async function redirectIfTargetPresent() {
  const session = await requireSession();
  const target = await getUserTarget(session.user.id);

  if (target) {
    redirect("/");
  }

  return session;
}
