"use client";

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AssigneeAvatar } from "./assignee-avatar";
import type { OrgMember } from "@/features/tasks/hooks/use-org-members";

// ─── Props ────────────────────────────────────────────────────────────────────

interface AssigneeSelectorProps {
  members: OrgMember[];
  value: string | null | undefined;
  onChange: (userId: string | null) => void;
  disabled?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Seletor de responsável (assignee) para formulários de tarefa.
 * Usa Popover + Command para busca incremental.
 */
export function AssigneeSelector({
  members,
  value,
  onChange,
  disabled = false,
}: AssigneeSelectorProps) {
  const [open, setOpen] = useState(false);

  const selected = members.find((m) => m.userId === value) ?? null;

  function handleSelect(userId: string | null) {
    onChange(userId);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
          data-testid="assignee-selector-trigger"
        >
          {selected ? (
            <span className="flex items-center gap-2">
              <AssigneeAvatar
                name={selected.user.name}
                email={selected.user.email}
                size={20}
              />
              <span className="truncate">
                {selected.user.name ?? selected.user.email}
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-2 text-muted-foreground">
              <UserRound className="size-4" />
              Sem responsável
            </span>
          )}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar membro…" />
          <CommandList>
            <CommandEmpty>Nenhum membro encontrado.</CommandEmpty>
            <CommandGroup>
              {/* Opção "sem responsável" */}
              <CommandItem
                value="__unassign__"
                onSelect={() => handleSelect(null)}
                data-testid="assignee-option-none"
              >
                <Check
                  className={cn(
                    "mr-2 size-4",
                    value == null ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="flex items-center gap-2 text-muted-foreground">
                  <UserRound className="size-4" />
                  Sem responsável
                </span>
              </CommandItem>

              {members.map((m) => (
                <CommandItem
                  key={m.userId}
                  value={`${m.user.name ?? ""} ${m.user.email}`}
                  onSelect={() => handleSelect(m.userId)}
                  data-testid={`assignee-option-${m.userId}`}
                >
                  <Check
                    className={cn(
                      "mr-2 size-4",
                      value === m.userId ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="flex items-center gap-2">
                    <AssigneeAvatar
                      name={m.user.name}
                      email={m.user.email}
                      size={20}
                    />
                    <span className="flex flex-col">
                      <span className="text-sm leading-tight">
                        {m.user.name ?? m.user.email}
                      </span>
                      {m.user.name && (
                        <span className="text-xs text-muted-foreground leading-tight">
                          {m.user.email}
                        </span>
                      )}
                    </span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
