import { SelectTargetForm } from "@/components/app/select-target-form";
import { redirectIfTargetPresent } from "@/lib/auth-guard";

export default async function SelectTargetPage() {
  await redirectIfTargetPresent();

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-lg flex-col justify-center gap-6 p-6">
      <SelectTargetForm />
    </div>
  );
}
