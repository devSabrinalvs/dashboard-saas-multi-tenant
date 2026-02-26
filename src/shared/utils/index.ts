import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

export function apiError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof Error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode) {
      return apiError(error.message, statusCode);
    }
  }
  console.error("Unhandled error:", error);
  return apiError("Internal server error", 500);
}
