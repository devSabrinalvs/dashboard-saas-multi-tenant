import { TwoFactorVerifyForm } from "@/features/auth/components/two-factor-verify-form";

export default function TwoFactorVerifyPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <TwoFactorVerifyForm />
      </div>
    </div>
  );
}
