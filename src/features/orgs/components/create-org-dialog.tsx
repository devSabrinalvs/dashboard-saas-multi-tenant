"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { createOrgAction } from "../server/actions";
import { slugify } from "@/shared/utils";

export function CreateOrgDialog() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("slug", slug);

    const result = await createOrgAction(formData);
    setLoading(false);

    if (result.error) {
      const errors = result.error;
      const firstError = Object.values(errors).flat()[0];
      setError(firstError ?? "Validation error");
      return;
    }

    if (result.data) {
      router.push(`/org/${result.data.slug}/dashboard`);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="w-full">
        Create New Organization
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-lg border p-4"
      data-testid="create-org-form"
    >
      <div>
        <Label htmlFor="org-name">Organization Name</Label>
        <Input
          id="org-name"
          name="name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setSlug(slugify(event.target.value));
          }}
          placeholder="My Company"
          required
        />
      </div>
      <div>
        <Label htmlFor="org-slug">Slug</Label>
        <Input
          id="org-slug"
          name="slug"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          placeholder="my-company"
          required
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? "Creating..." : "Create Organization"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
