// ============================================
//  DeskChatPanel.tsx
//
//  The "Botanist's Desk" — now a two-pane companion view:
//    LEFT  → the chat with your companion (Sage). Loads the most
//            recently active flower's conversation and streams
//            replies from POST /api/chat, mirroring <ChatWindow>.
//    RIGHT → the painted desk scene (/garden/desk.png) with the two
//            newest pinned notes tacked to the corkboard and a
//            "drawer" pill counting the archived ones.
//
//  Replaces the old notes-list NotesPanel as the "notes" nav panel
//  (see GardenShell). The desk illustration sits beside the chat
//  instead of standing on its own.
// ============================================

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useFetchJson } from "@/hooks/useFetchJson";
import type { FlowerSummary, Note } from "./types";

type Message = { role: "user" | "assistant"; content: string };

const COMPANION_NAME = "Sage";

// species.key → the conversation topic shown in the chat header pill
const TOPIC_BY_SPECIES: Record<string, string> = {
  lavender: "Stress Relief",
  sunflower: "Career",
  rose: "Relationships",
  lotus: "Self-Reflection",
  "cherry-blossom": "Self-Reflection",
};

export function DeskChatPanel({ onClose }: { onClose: () => void }) {
  const { data: flowers } = useFetchJson<FlowerSummary[]>("/api/flowers");

  // Pick the flower to talk to: the most recently planted one that's
  // still growing and has a chat, falling back to the most recent
  // flower that has a conversation at all.
  const activeFlower = useMemo(() => {
    const withChat = (flowers ?? []).filter((f) => f.conversationId);
    if (withChat.length === 0) return null;
    const growing = withChat.filter((f) => !f.completedAt);
    const pool = growing.length ? growing : withChat;
    return pool.reduce((a, b) => (a.plantedAt > b.plantedAt ? a : b));
  }, [flowers]);

  const conversationId = activeFlower?.conversationId ?? null;
  const species = activeFlower?.species;
  const topic = species ? TOPIC_BY_SPECIES[species.key] ?? "Companion" : "";

  // Notes for the corkboard (newest two) + the drawer (archived).
  const { data: pinned, refetch: refetchNotes } = useFetchJson<Note[]>("/api/notes");
  const { data: archived, refetch: refetchArchived } = useFetchJson<Note[]>(
    "/api/notes?archived=true"
  );
  const pinnedNotes = (pinned ?? []).slice(0, 2);
  const archivedNotes = archived ?? [];
  const archivedCount = archivedNotes.length;

  // Whether the desk's center drawer is pulled open (showing old notes).
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Inline "pin a new note" composer (POST /api/notes → refetch).
  const [composing, setComposing] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  async function saveNote() {
    if (!noteTitle.trim() || !noteBody.trim() || savingNote) return;
    setSavingNote(true);
    try {
      await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: noteTitle.trim(), body: noteBody.trim() }),
      });
      setNoteTitle("");
      setNoteBody("");
      setComposing(false);
      refetchNotes();
    } finally {
      setSavingNote(false);
    }
  }

  // Tuck a pinned note into the drawer / pull one back onto the corkboard.
  async function setArchived(id: string, value: boolean) {
    await fetch(`/api/notes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: value }),
    });
    refetchNotes();
    refetchArchived();
  }

  // Chat state — same shape/streaming as ChatWindow.
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load history once the conversation resolves.
  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    fetch(`/api/conversations/${conversationId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setMessages(
          (data.messages ?? []).map((m: { role: Message["role"]; content: string }) => ({
            role: m.role,
            content: m.content,
          }))
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading || !conversationId) return;

    setInput("");
    setError("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, message: text }),
    });

    if (!res.ok || !res.body) {
      setError("Something went wrong — please try again.");
      setLoading(false);
      return;
    }

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: updated[updated.length - 1].content + chunk,
        };
        return updated;
      });
    }

    setLoading(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="desk-chat">
      <Image
        src="/garden/garden-bg.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="desk-chat-bg"
        style={{ objectFit: "cover" }}
      />
      <div className="desk-chat-scrim" />

      <div className="desk-chat-frame">
        {/* ---- LEFT: chat with the companion ---- */}
        <section className="desk-chat-left">
          <header className="dc-head">
            <button type="button" className="dc-back" onClick={onClose} aria-label="Back to garden">
              ‹
            </button>
            <span className="dc-avatar" aria-hidden>
              ⚘
            </span>
            <div className="dc-head-text">
              <h2>{COMPANION_NAME}</h2>
              <p>Your companion{species ? ` · by the ${species.name}` : ""}</p>
            </div>
            <span className="dc-leaf" aria-hidden>
              🍃
            </span>
          </header>

          <div className="dc-body">
            {topic && (
              <div className="dc-topic">
                {topic}
                {species ? ` · ${species.name}` : ""}
              </div>
            )}

            {messages.length === 0 && (
              <p className="dc-empty">
                {conversationId
                  ? "Let’s breathe — what’s been weighing on you?"
                  : "Plant a flower in the Greenhouse to start a conversation."}
              </p>
            )}

            {messages.map((m, i) => (
              <div key={i} className={"dc-msg " + (m.role === "user" ? "me" : "them")}>
                <div className="dc-bubble">
                  {m.content || <span className="dc-typing">●●●</span>}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {error && <p className="dc-error">{error}</p>}

          <div className="dc-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Write your message…"
              disabled={loading || !conversationId}
            />
            <span className="dc-mic" aria-hidden>
              🎙
            </span>
            <button
              type="button"
              className="dc-send"
              onClick={send}
              disabled={loading || !input.trim() || !conversationId}
              aria-label="Send message"
            >
              ➤
            </button>
          </div>
        </section>

        {/* ---- RIGHT: the painted desk + pinned notes ---- */}
        <section className="desk-chat-right">
          <Image
            src={drawerOpen ? "/garden/opened-drawer.png" : "/garden/desk.png"}
            alt=""
            fill
            priority
            sizes="60vw"
            style={{
              objectFit: "cover",
              // Anchor to the top when closed so the corkboard (where notes
              // are pinned) is always in view; the open-drawer art is framed
              // lower, so center it.
              objectPosition: drawerOpen ? "center" : "center top",
            }}
          />
          <div className="dc-desk-scrim" />

          <header className="dc-desk-head">
            <button
              type="button"
              className="dc-back light"
              onClick={drawerOpen ? () => setDrawerOpen(false) : onClose}
              aria-label={drawerOpen ? "Close the drawer" : "Back to garden"}
            >
              ‹
            </button>
            <div>
              <h2>Botanist’s Desk</h2>
              <p>
                {drawerOpen
                  ? `The drawer · ${archivedCount} old ${archivedCount === 1 ? "note" : "notes"}`
                  : pinnedNotes.length > 0
                    ? `${pinnedNotes.length === 1 ? "One note" : `${pinnedNotes.length} notes`} pinned · open the drawer to keep old ones`
                    : "No notes pinned yet"}
              </p>
            </div>
          </header>

          {drawerOpen ? (
            /* ---- open drawer: the archived ("old") notes ---- */
            <div className="dc-drawer-open">
              {archivedCount === 0 ? (
                <p className="dc-drawer-empty">The drawer is empty — tuck a note away to keep it here.</p>
              ) : (
                <div className="dc-drawer-notes">
                  {archivedNotes.map((note) => (
                    <article key={note.id} className="dc-drawer-note">
                      <div>
                        <h4>{note.title}</h4>
                        <p>{note.body}</p>
                      </div>
                      <button type="button" onClick={() => setArchived(note.id, false)}>
                        Restore
                      </button>
                    </article>
                  ))}
                </div>
              )}
              <button type="button" className="dc-drawer-close" onClick={() => setDrawerOpen(false)}>
                Close drawer
              </button>
            </div>
          ) : (
            <>
              <div className="dc-corkboard">
                {pinnedNotes.map((note, i) => (
                  <article key={note.id} className={"dc-pin pin-" + i}>
                    <button
                      type="button"
                      className="dc-pin-archive"
                      onClick={() => setArchived(note.id, true)}
                      aria-label="Tuck into the drawer"
                      title="Tuck into the drawer"
                    >
                      ⤓
                    </button>
                    <h3>{note.title}</h3>
                    <p>{note.body}</p>
                  </article>
                ))}
              </div>

              {/* tappable center drawer → opens the archived notes */}
              <button
                type="button"
                className="dc-drawer-hotspot"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open the drawer to see old notes"
              />

              <div className="dc-desk-actions">
                <button type="button" className="dc-add-note" onClick={() => setComposing((c) => !c)}>
                  ✎ Pin a note
                </button>
                <button type="button" className="dc-drawer" onClick={() => setDrawerOpen(true)}>
                  The drawer · {archivedCount} old {archivedCount === 1 ? "note" : "notes"}
                </button>
              </div>

              {composing && (
                <div className="dc-note-form">
                  <input
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="Note title…"
                    autoFocus
                  />
                  <textarea
                    value={noteBody}
                    onChange={(e) => setNoteBody(e.target.value)}
                    placeholder="What's on your mind?"
                    rows={3}
                  />
                  <div className="dc-note-form-actions">
                    <button type="button" className="ghost" onClick={() => setComposing(false)}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveNote}
                      disabled={savingNote || !noteTitle.trim() || !noteBody.trim()}
                    >
                      {savingNote ? "Pinning…" : "Pin to desk"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
