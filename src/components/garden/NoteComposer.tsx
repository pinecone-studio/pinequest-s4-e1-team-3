// ============================================
//  NoteComposer.tsx
//
//  The small "write a new note" form shown at the top of the
//  Botanist's Desk. Owns nothing but its own input state and the
//  POST /api/notes call — once a note is saved it hands control
//  back to NotesPanel via onCreated() so the list can refetch.
//
//  Split out so NotesPanel itself only has to think about the
//  *list* (render rows, archive, delete) and not also juggle
//  controlled-input state for a form.
// ============================================

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function NoteComposer({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim() || !body.trim() || saving) return;
    setSaving(true);
    try {
      await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });
      setTitle("");
      setBody("");
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="garden-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Note title…"
        className="border rounded px-3 py-2 text-sm bg-white/70"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What's on your mind?"
        rows={2}
        className="border rounded px-3 py-2 text-sm bg-white/70 resize-none"
      />
      <Button size="sm" onClick={save} disabled={saving || !title.trim() || !body.trim()} className="self-end">
        {saving ? "Pinning…" : "Pin to the desk"}
      </Button>
    </div>
  );
}
