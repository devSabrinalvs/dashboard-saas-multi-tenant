import { AuthShell } from "@/features/auth/components/auth-shell";
import { SignupForm } from "@/features/auth/components/signup-form";

export default function SignupPage() {
  return (
    <AuthShell variant="signup">
      <SignupForm />
    </AuthShell>
  );
}
