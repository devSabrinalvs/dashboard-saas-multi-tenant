"use client";

import React from "react";

/**
 * Renderiza o conteúdo de um comentário com @menções destacadas.
 */
export function CommentContent({ content }: { content: string }) {
  const parts = content.split(/(@[\w.+-]+)/g);

  return (
    <span className="whitespace-pre-wrap break-words">
      {parts.map((part, i) =>
        part.startsWith("@") ? (
          <span key={i} className="text-primary font-medium">
            {part}
          </span>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </span>
  );
}
