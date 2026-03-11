import { AuthCarousel } from "./auth-carousel";

interface AuthPanelProps {
  mode: "login" | "signup";
}

export function AuthPanel({ mode }: AuthPanelProps) {
  return <AuthCarousel mode={mode} />;
}
