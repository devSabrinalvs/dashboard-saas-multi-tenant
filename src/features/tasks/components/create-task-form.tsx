"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { createTaskAction } from "../server/actions";

interface CreateTaskFormProps {
  orgSlug: string;
  projectId: string;
}

export function CreateTaskForm({ orgSlug, projectId }: CreateTaskFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    formData.set("projectId", projectId);

    const result = await createTaskAction(orgSlug, formData);
    setLoading(false);

    if (result.error) {
      const firstError = Object.values(result.error).flat()[0];
      setError(firstError ?? "Validation error");
      return;
    }

    form.reset();
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2"
      data-testid="create-task-form"
    >
      <div className="flex-1">
        <Input name="title" placeholder="New task title..." required />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Adding..." : "Add Task"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
