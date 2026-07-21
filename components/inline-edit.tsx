"use client";

import { useState } from "react";

type CommitFn = (next: string) => Promise<boolean> | boolean;

/** Text cell that keeps a local draft, commits on blur / Enter, reverts on Esc or rejection. */
export function EditableText({ value, onCommit, className }: { value: string; onCommit: CommitFn; className?: string }) {
  const [draft, setDraft] = useState(value);

  const commit = async () => {
    const v = draft.trim();
    if (v && v !== value) {
      const ok = await onCommit(v);
      if (!ok) setDraft(value);
    } else {
      setDraft(value);
    }
  };

  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setDraft(value);
          e.currentTarget.blur();
        }
      }}
      className={className}
    />
  );
}

/** Double-click a label to edit it in place; commits on Enter/blur, reverts on Esc. */
export function DblClickEdit({
  value,
  onCommit,
  display,
  editClass,
}: {
  value: string;
  onCommit: CommitFn;
  display?: string;
  editClass?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <span
        onDoubleClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        title="Double-click to rename"
        className={(display || "") + " cursor-text hover:underline decoration-dotted underline-offset-2"}
      >
        {value}
      </span>
    );
  }

  const commit = async () => {
    const v = draft.trim();
    setEditing(false);
    if (v && v !== value) await onCommit(v);
  };

  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setDraft(value);
          setEditing(false);
        }
      }}
      className={editClass}
    />
  );
}
