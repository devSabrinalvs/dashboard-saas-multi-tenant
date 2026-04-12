"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Pencil, Trash2, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { apiClient } from "@/shared/api/client";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommentAuthor {
  id: string;
  name: string | null;
  email: string;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  author: CommentAuthor;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(author: CommentAuthor): string {
  if (author.name) {
    const parts = author.name.trim().split(" ");
    if (parts.length >= 2) return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
    return author.name.slice(0, 2).toUpperCase();
  }
  return author.email.slice(0, 2).toUpperCase();
}

function formatDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TaskCommentsPanelProps {
  orgSlug: string;
  taskId: string;
  currentUserId: string;
  canAdminDelete?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TaskCommentsPanel({
  orgSlug,
  taskId,
  currentUserId,
  canAdminDelete = false,
}: TaskCommentsPanelProps) {
  const queryClient = useQueryClient();
  const queryKey = ["comments", orgSlug, taskId] as const;
  const baseUrl = `/api/org/${orgSlug}/tasks/${taskId}/comments`;

  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      apiClient.get<{ comments: Comment[] }>(baseUrl).then((r) => r.comments),
  });

  const comments = data ?? [];

  // ── Create ────────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (content: string) =>
      apiClient.post<{ comment: Comment }>(baseUrl, { content }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      setNewContent("");
      toast.success("Comentário adicionado");
    },
    onError: () => toast.error("Erro ao adicionar comentário."),
  });

  // ── Edit ──────────────────────────────────────────────────────────────────
  const editMutation = useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      apiClient.patch<{ comment: Comment }>(`${baseUrl}/${commentId}`, { content }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      setEditingId(null);
      toast.success("Comentário editado");
    },
    onError: () => toast.error("Erro ao editar comentário."),
  });

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (commentId: string) =>
      apiClient.delete(`${baseUrl}/${commentId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      toast.success("Comentário removido");
    },
    onError: () => toast.error("Erro ao remover comentário."),
  });

  function handleSubmit() {
    const trimmed = newContent.trim();
    if (!trimmed) return;
    createMutation.mutate(trimmed);
  }

  function startEdit(comment: Comment) {
    setEditingId(comment.id);
    setEditContent(comment.content);
  }

  function handleEditSubmit(commentId: string) {
    const trimmed = editContent.trim();
    if (!trimmed) return;
    editMutation.mutate({ commentId, content: trimmed });
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">Comentários{comments.length > 0 ? ` (${comments.length})` : ""}</p>

      {/* Thread */}
      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" /> Carregando…
        </div>
      )}

      {!isLoading && comments.length === 0 && (
        <p className="text-xs text-muted-foreground">Nenhum comentário ainda. Seja o primeiro!</p>
      )}

      <div className="space-y-3">
        {comments.map((comment) => {
          const isOwn = comment.authorId === currentUserId;
          const canEdit = isOwn;
          const canDelete = isOwn || canAdminDelete;
          const isEditing = editingId === comment.id;

          return (
            <div key={comment.id} className="flex gap-2.5 group">
              {/* Avatar */}
              <Avatar className="size-7 shrink-0 mt-0.5">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {getInitials(comment.author)}
                </AvatarFallback>
              </Avatar>

              {/* Bubble */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-xs font-medium">
                    {comment.author.name ?? comment.author.email.split("@")[0]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(comment.createdAt)}
                  </span>
                </div>

                {isEditing ? (
                  <div className="space-y-1.5">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault();
                          handleEditSubmit(comment.id);
                        }
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      rows={2}
                      className="text-sm"
                      disabled={editMutation.isPending}
                      autoFocus
                    />
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        className="h-6 text-xs gap-1"
                        onClick={() => handleEditSubmit(comment.id)}
                        disabled={editMutation.isPending || !editContent.trim()}
                      >
                        <Check className="size-3" />
                        Salvar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs gap-1"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="size-3" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <p className={cn(
                      "text-sm text-foreground whitespace-pre-wrap break-words rounded-lg bg-muted/50 px-3 py-2",
                    )}>
                      {comment.content}
                    </p>
                    {/* Actions */}
                    {(canEdit || canDelete) && (
                      <div className="absolute right-2 top-1.5 hidden group-hover:flex items-center gap-0.5 bg-muted/80 rounded-md px-1">
                        {canEdit && (
                          <button
                            className="p-0.5 hover:text-foreground text-muted-foreground"
                            onClick={() => startEdit(comment)}
                            aria-label="Editar comentário"
                          >
                            <Pencil className="size-3" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            className="p-0.5 hover:text-destructive text-muted-foreground"
                            onClick={() => deleteMutation.mutate(comment.id)}
                            disabled={deleteMutation.isPending}
                            aria-label="Deletar comentário"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* New comment input */}
      <div className="flex gap-2 items-end pt-1">
        <Textarea
          ref={textareaRef}
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Escreva um comentário… (Ctrl+Enter para enviar)"
          rows={2}
          className="text-sm flex-1"
          disabled={createMutation.isPending}
          maxLength={2000}
        />
        <Button
          size="icon"
          onClick={handleSubmit}
          disabled={createMutation.isPending || !newContent.trim()}
          aria-label="Enviar comentário"
        >
          {createMutation.isPending
            ? <Loader2 className="size-4 animate-spin" />
            : <Send className="size-4" />
          }
        </Button>
      </div>
    </div>
  );
}
