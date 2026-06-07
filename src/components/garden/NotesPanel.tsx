// ============================================
//  NotesPanel.tsx
//
//  The "Botanist's Desk" — quick personal notes (GET /api/notes).
//  Composing a new note is delegated to <NoteComposer>; this file
//  just renders the list and offers two one-line actions per note:
//    archive/restore → PUT /api/notes/:id { archived }
//    delete          → DELETE /api/notes/:id
//  Both call refetch() afterwards so the list stays in sync —
//  no local list-mutation logic to keep correct by hand.
// ============================================

"use client";

import { useFetchJson } from "@/hooks/useFetchJson";
import { PanelShell } from "./PanelShell";
import { NoteComposer } from "./NoteComposer";
import { Button } from "@/components/ui/button";
import type { Note } from "./types";

export function NotesPanel({ onClose }: { onClose: () => void }) {
  const { data: notes, loading, error, refetch } = useFetchJson<Note[]>("/api/notes");

  async function setArchived(id: string, archived: boolean) {
    await fetch(`/api/notes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived }),
    });
    refetch();
  }

  async function remove(id: string) {
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
    refetch();
  }

  return (
    <PanelShell
      title="Botanist's Desk"
      banner="/garden/desk.png"
      subtitle="Notes pinned beside your conversations"
      note="Old notes you've tucked away — the AI remembers these too."
      onClose={onClose}
      loading={loading}
      error={error}
      empty={(notes?.length ?? 0) === 0}
      emptyLabel="The desk is empty — pin your first note above."
      headerExtra={<NoteComposer onCreated={refetch} />}
    >
      {(notes ?? []).map((note) => (
        <div key={note.id} className="garden-row" style={{ alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>
              {note.title}
              {note.archived && (
                <span style={{ marginLeft: 8, fontSize: 10.5, color: "var(--g-ink-soft)" }}>
                  archived
                </span>
              )}
            </div>
            <p style={{ fontSize: 12.5, color: "var(--g-ink-soft)", margin: "3px 0 0", lineHeight: 1.5 }}>
              {note.body}
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Button size="xs" variant="ghost" onClick={() => setArchived(note.id, !note.archived)}>
              {note.archived ? "Restore" : "Archive"}
            </Button>
            <Button size="xs" variant="ghost" onClick={() => remove(note.id)}>
              Delete
            </Button>
          </div>
        </div>
      ))}
    </PanelShell>
  );
}
