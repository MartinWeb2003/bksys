"use client";

import { useState } from "react";
import type { NoteDTO, KeyGridData } from "@/lib/types";
import type { Strings, Lang } from "@/lib/i18n";
import KeyGrid from "./KeyGrid";

export type NoteActions = {
  createNote: (title: string, body: string) => Promise<boolean>;
  updateNote: (id: string, title: string, body: string) => Promise<boolean>;
  deleteNote: (id: string) => Promise<boolean>;
};

const fmt = (iso: string, lang: Lang) =>
  new Date(iso).toLocaleString(lang === "hr" ? "hr-HR" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function NotesView({
  notes,
  keyGrid,
  L,
  lang,
  actions,
}: {
  notes: NoteDTO[];
  keyGrid: KeyGridData | null;
  L: Strings;
  lang: Lang;
  actions: NoteActions;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const inp =
    "w-full border border-stone-300 rounded px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cyan-700/30 focus:border-cyan-700";

  async function add() {
    if (!title.trim() && !body.trim()) return;
    setBusy(true);
    const ok = await actions.createNote(title, body);
    setBusy(false);
    if (ok) {
      setTitle("");
      setBody("");
    }
  }

  return (
    <div>
      <KeyGrid initial={keyGrid} L={L} />

      <p className="text-xs text-stone-500 mb-3 max-w-xl">{L.notesHelp}</p>

      {/* Composer */}
      <div className="bg-white border border-stone-200 rounded-lg p-3 mb-4">
        <input className={inp + " mb-2"} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={L.noteTitlePh} />
        <textarea
          className={inp + " min-h-[80px] resize-y"}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={L.notePlaceholder}
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={add}
            disabled={busy || (!title.trim() && !body.trim())}
            className="px-3.5 py-1.5 text-sm rounded bg-cyan-800 text-white font-medium hover:bg-cyan-900 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {L.addNote}
          </button>
        </div>
      </div>

      {notes.length === 0 ? (
        <p className="text-sm text-stone-400">{L.noNotes}</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {notes.map((n) =>
            editingId === n.id ? (
              <NoteEditor
                key={n.id}
                note={n}
                L={L}
                inputClass={inp}
                onCancel={() => setEditingId(null)}
                onSave={async (t, b) => {
                  const ok = await actions.updateNote(n.id, t, b);
                  if (ok) setEditingId(null);
                  return ok;
                }}
              />
            ) : (
              <div key={n.id} className="bg-white border border-stone-200 rounded-lg p-3 flex flex-col">
                {n.title && <div className="font-semibold text-stone-800 mb-1 break-words">{n.title}</div>}
                {n.body && <div className="text-sm text-stone-700 whitespace-pre-wrap break-words">{n.body}</div>}
                <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-stone-400">{L.noteUpdated(fmt(n.updatedAt, lang))}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingId(n.id)} className="text-xs text-cyan-800 hover:underline">
                      {L.noteEdit}
                    </button>
                    <button onClick={() => actions.deleteNote(n.id)} className="text-xs text-red-700 hover:underline">
                      {L.noteDelete}
                    </button>
                  </div>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function NoteEditor({
  note,
  L,
  inputClass,
  onSave,
  onCancel,
}: {
  note: NoteDTO;
  L: Strings;
  inputClass: string;
  onSave: (title: string, body: string) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [busy, setBusy] = useState(false);

  return (
    <div className="bg-white border border-cyan-700/50 rounded-lg p-3 flex flex-col">
      <input className={inputClass + " mb-2"} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={L.noteTitlePh} />
      <textarea
        className={inputClass + " min-h-[80px] resize-y"}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={L.notePlaceholder}
      />
      <div className="mt-2 flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 text-sm rounded border border-stone-300 hover:bg-stone-50">
          {L.cancel}
        </button>
        <button
          disabled={busy || (!title.trim() && !body.trim())}
          onClick={async () => {
            setBusy(true);
            const ok = await onSave(title, body);
            if (!ok) setBusy(false);
          }}
          className="px-3.5 py-1.5 text-sm rounded bg-cyan-800 text-white font-medium hover:bg-cyan-900 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {L.noteSave}
        </button>
      </div>
    </div>
  );
}
