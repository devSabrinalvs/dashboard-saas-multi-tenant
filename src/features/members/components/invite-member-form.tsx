"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { inviteMemberAction } from "../server/actions";

interface InviteMemberFormProps {
  orgSlug: string;
}

export function InviteMemberForm({ orgSlug }: InviteMemberFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    const result = await inviteMemberAction(orgSlug, formData);
    setLoading(false);

    if (result.error) {
      const firstError = Object.values(result.error).flat()[0];
      setError(firstError ?? "Validation error");
      return;
    }

    setSuccess(true);
    form.reset();
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2"
      data-testid="invite-member-form"
    >
      <div className="flex-1">
        <Label htmlFor="invite-email">Invite by email</Label>
        <Input
          id="invite-email"
          name="email"
          type="email"
          placeholder="colleague@example.com"
          required
        />
      </div>
      <input type="hidden" name="role" value="MEMBER" />
      <Button type="submit" disabled={loading}>
        {loading ? "Inviting..." : "Send Invite"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && (
        <p className="text-sm text-green-600">Invite sent!</p>
      )}
    </form>
  );
}
