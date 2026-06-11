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
import type { FlowerSummary, Note, Species } from "./types";

type Message = { role: "user" | "assistant"; content: string };

type ConvItem = {
  id: string;
  isCompleted: boolean;
  createdAt: string;
  summary: string | null;
  mood: string | null;
  flower: { id: string; species: { key: string; name: string; color: string } };
  firstMessage: string | null;
};

const COMPANION_NAME = "Sage";

// When the user has no flower yet, the desk chat starts a conversation
// automatically on their first message using this species as the default
// companion (matches "Sage"). Falls back to the first available species.
const DEFAULT_SPECIES_KEY = "lavender";

// species.key → the EQ domain shown in the chat header pill
const TOPIC_BY_SPECIES: Record<string, string> = {
  daisy:     "Self-Awareness",
  lavender:  "Self-Regulation",
  sunflower: "Motivation",
  iris:      "Empathy",
  rose:      "Social Skills",
};

export function DeskChatPanel({ onClose, flowerId, onOpenTasks }: { onClose: () => void; flowerId?: string; onOpenTasks?: () => void }) {
  const { data: flowers, refetch: refetchFlowers } =
    useFetchJson<FlowerSummary[]>("/api/flowers");
  const { data: speciesList } = useFetchJson<Species[]>("/api/species");

  // If a specific flower was clicked in the garden, show that one.
  // Otherwise pick the most recently planted growing flower.
  const activeFlower = useMemo(() => {
    const withChat = (flowers ?? []).filter((f) => f.conversationId);
    if (withChat.length === 0) return null;
    if (flowerId) return withChat.find((f) => f.id === flowerId) ?? null;
    const growing = withChat.filter((f) => !f.completedAt);
    const pool = growing.length ? growing : withChat;
    return pool.reduce((a, b) => (a.plantedAt > b.plantedAt ? a : b));
  }, [flowers, flowerId]);

  // A conversation started right here in the desk chat (when the user had
  // no flower yet). Once flowers refetch, activeFlower converges to the same
  // conversation, so the two ids agree.
  const [createdConversationId, setCreatedConversationId] = useState<
    string | null
  >(null);
  // Which conversation to show — overrideConvId when the user jumps to a
  // historic one from the History panel, otherwise the active flower's conv.
  const [overrideConvId, setOverrideConvId] = useState<string | null>(null);

  const conversationId = overrideConvId ?? activeFlower?.conversationId ?? createdConversationId;
  const species = activeFlower?.species;
  const topic = species ? (TOPIC_BY_SPECIES[species.key] ?? "Companion") : "";

  // Notes for the corkboard (newest two) + the drawer (archived).
  const { data: pinned, refetch: refetchNotes } =
    useFetchJson<Note[]>("/api/notes");
  const { data: archived, refetch: refetchArchived } = useFetchJson<Note[]>(
    "/api/notes?archived=true",
  );
  const pinnedNotes = pinned ?? [];
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
        body: JSON.stringify({
          title: noteTitle.trim(),
          body: noteBody.trim(),
        }),
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

  // Permanently remove a note from the drawer (DELETE /api/notes/:id).
  async function deleteNote(id: string) {
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
    refetchArchived();
  }

  // Chat state — same shape/streaming as ChatWindow.
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [showStonePrompt, setShowStonePrompt] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // History panel
  const [showHistory, setShowHistory] = useState(false);
  const [historyConvs, setHistoryConvs] = useState<ConvItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Reset the "saved" state whenever we switch to a different conversation.
  useEffect(() => {
    setCompleted(false);
  }, [conversationId]);

  // Load history once the conversation resolves. Skip conversations we
  // started right here — their messages already live in local state, and
  // refetching the (initially empty) history would wipe the optimistic ones.
  useEffect(() => {
    if (!conversationId || conversationId === createdConversationId) return;
    let cancelled = false;
    fetch(`/api/conversations/${conversationId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setMessages(
          (data.messages ?? []).map(
            (m: { role: Message["role"]; content: string }) => ({
              role: m.role,
              content: m.content,
            }),
          ),
        );
        setCompleted(data.isCompleted ?? false);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [conversationId, createdConversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Start a flower + conversation on the fly when the user has none yet,
  // so the desk chat is always usable. Returns the new conversation id,
  // or null if it couldn't be created.
  async function ensureConversation(): Promise<string | null> {
    if (conversationId) return conversationId;

    const list = speciesList ?? [];
    const picked = list.find((s) => s.key === DEFAULT_SPECIES_KEY) ?? list[0];
    if (!picked) return null;

    try {
      const res = await fetch("/api/flowers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ speciesId: picked.id }),
      });
      if (!res.ok) return null;
      const flower = (await res.json()) as { conversationId: string };
      setCreatedConversationId(flower.conversationId);
      refetchFlowers();
      return flower.conversationId;
    } catch {
      return null;
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setError("");
    setLoading(true);

    // If there's no conversation yet, plant a default flower first so the
    // user can chat immediately without visiting the Greenhouse.
    const convId = await ensureConversation();
    if (!convId) {
      setError("Couldn't start a conversation — please try again.");
      setInput(text); // restore what they typed so it isn't lost
      setLoading(false);
      return;
    }

    setMessages((prev) => [...prev, { role: "user", content: text }]);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: convId, message: text }),
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

    if (res.headers.get("X-Stone-Prompt") === "true") {
      setShowStonePrompt(true);
    }

    setLoading(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  // Save & end the conversation: kicks off the memory pipeline on the server
  // (extracts a summary, mood, tags and memories, then blooms the flower).
  // The pipeline runs in the background, so we just confirm it started.
  async function endConversation() {
    if (!conversationId || completing || completed) return;
    setCompleting(true);
    setError("");
    try {
      const res = await fetch(`/api/conversations/${conversationId}/complete`, {
        method: "POST",
      });
      if (!res.ok && res.status !== 400) {
        throw new Error("complete failed");
      }
      // 400 = already completed — treat as success (idempotent).
      setCompleted(true);
      setHistoryLoaded(false);
      refetchFlowers();
    } catch {
      setError("Couldn't save this conversation — please try again.");
    } finally {
      setCompleting(false);
    }
  }

  async function openHistory() {
    const next = !showHistory;
    setShowHistory(next);
    if (!next || historyLoaded) return;
    setHistoryLoading(true);
    try {
      const r = await fetch("/api/conversations");
      if (r.ok) setHistoryConvs(await r.json());
      setHistoryLoaded(true);
    } finally {
      setHistoryLoading(false);
    }
  }

  function switchToConversation(conv: ConvItem) {
    setOverrideConvId(conv.id);
    setMessages([]);
    setShowHistory(false);
  }

  async function confirmDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    setPendingDeleteId(null);
    setHistoryConvs((prev) => prev.filter((c) => c.id !== id));
    if (overrideConvId === id) {
      setOverrideConvId(null);
      setMessages([]);
    }
    refetchFlowers();
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
            <button
              type="button"
              className="dc-back"
              onClick={onClose}
              aria-label="Back to garden"
            >
              ‹
            </button>
            <span className="dc-avatar" aria-hidden>
              ⚘
            </span>
            <div className="dc-head-text">
              <h2>{COMPANION_NAME}</h2>
              <p>Your companion{species ? ` · by the ${species.name}` : ""}</p>
            </div>
            <button
              type="button"
              className={"dc-history-btn" + (showHistory ? " active" : "")}
              onClick={openHistory}
              title="View past conversations"
            >
              {showHistory ? "← Chat" : "History"}
            </button>
            {completed ? (
              <span className="dc-saved" aria-live="polite">
                Saved 🌸
              </span>
            ) : conversationId && messages.length > 0 ? (
              <button
                type="button"
                className="dc-end"
                onClick={endConversation}
                disabled={completing}
                title="Save this conversation — its memories grow your flower"
              >
                {completing ? "Saving…" : "End & save"}
              </button>
            ) : (
              <span className="dc-leaf" aria-hidden>
                🍃
              </span>
            )}
          </header>

          {showHistory ? (
            <div className="dc-history">
              <p className="dc-history-head">Past conversations</p>
              {historyLoading ? (
                <div className="dc-history-empty">
                  <span className="dc-typing" aria-label="Loading">
                    <span />
                    <span />
                    <span />
                  </span>
                </div>
              ) : historyConvs.length === 0 ? (
                <p className="dc-history-empty">No past conversations yet.</p>
              ) : (
                historyConvs.map((conv) => {
                  const d = new Date(conv.createdAt);
                  const dateStr = d.toLocaleDateString("default", {
                    month: "short",
                    day: "numeric",
                  });
                  return (
                    <div
                      key={conv.id}
                      className="dc-history-item"
                      role="button"
                      tabIndex={0}
                      onClick={() => switchToConversation(conv)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && switchToConversation(conv)
                      }
                    >
                      <span
                        className="dc-history-dot"
                        style={{ background: conv.flower.species.color }}
                      />
                      <div className="dc-history-body">
                        <p className="dc-history-preview">
                          {conv.firstMessage ?? conv.summary ?? "—"}
                        </p>
                        <p className="dc-history-meta">
                          {conv.flower.species.name} · {dateStr}
                          {conv.isCompleted ? " · 🌸" : ""}
                        </p>
                      </div>
                      {pendingDeleteId === conv.id ? (
                        <div
                          className="dc-history-confirm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="dc-history-confirm-yes"
                            onClick={(e) => confirmDelete(conv.id, e)}
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            className="dc-history-confirm-no"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingDeleteId(null);
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="dc-history-delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPendingDeleteId(conv.id);
                          }}
                          title="Delete conversation"
                          aria-label="Delete"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className={"dc-body" + (messages.length === 0 ? " dc-body-empty" : "")}>
              {topic && (
                <div className="dc-topic">
                  {topic}
                  {species ? ` · ${species.name}` : ""}
                </div>
              )}

              {messages.length === 0 && (
                <p className="dc-empty">
                  Let’s breathe — what’s been weighing on you?
                </p>
              )}

              {messages.map((m, i) => (
                <div
                  key={i}
                  className={"dc-msg " + (m.role === "user" ? "me" : "them")}
                >
                  <div className="dc-bubble">
                    {m.content || (
                      <span className="dc-typing" aria-label="Sage is thinking">
                        <span />
                        <span />
                        <span />
                      </span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}

          {error && <p className="dc-error">{error}</p>}

          {showStonePrompt && !completed && (
            <div className="dc-stone-prompt">
              <span className="dc-stone-prompt-text">🪨 Энэ яриагаа чулуунд хадгалах уу?</span>
              <div className="dc-stone-prompt-actions">
                <button
                  className="dc-stone-yes"
                  onClick={async () => {
                    setShowStonePrompt(false);
                    if (!conversationId) return;
                    try {
                      await fetch(`/api/conversations/${conversationId}/save-stone`, { method: "POST" });
                    } catch {
                      // stone save failed silently — conversation continues
                    }
                  }}
                >
                  Тийм
                </button>
                <button
                  className="dc-stone-no"
                  onClick={() => setShowStonePrompt(false)}
                >
                  Дараа
                </button>
              </div>
            </div>
          )}

          {completed && (
            <div className="dc-saved-note">
              <p>This reflection is saved — your flower is blooming in the garden 🌸</p>
              {onOpenTasks && (
                <button
                  type="button"
                  onClick={() => { onClose(); onOpenTasks(); }}
                  style={{
                    marginTop: 8,
                    background: "rgba(160,184,154,0.22)",
                    border: "1.5px solid rgba(160,184,154,0.5)",
                    borderRadius: 10,
                    padding: "7px 14px",
                    fontSize: 13,
                    color: "var(--g-ink)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    width: "100%",
                  }}
                >
                  🌳 View your new task
                </button>
              )}
            </div>
          )}

          <div className="dc-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={
                showHistory
                  ? "Select a conversation above…"
                  : completed
                    ? "This reflection is saved"
                    : "Write your message…"
              }
              disabled={loading || completed || showHistory}
            />
            <span className="dc-mic" aria-hidden>
              🎙
            </span>
            <button
              type="button"
              className="dc-send"
              onClick={send}
              disabled={loading || !input.trim() || completed || showHistory}
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
                <p className="dc-drawer-empty">
                  The drawer is empty — tuck a note away to keep it here.
                </p>
              ) : (
                <div className="dc-drawer-notes">
                  {archivedNotes.map((note, i) => (
                    <article
                      key={note.id}
                      className={"dc-pin dc-drawer-pin pin-" + (i % 2)}
                      style={{ backgroundImage: `url(/garden/note-${(i % 2) + 1}.png)` }}
                    >
                      <div className="dc-pin-text">
                        <h3>{note.title}</h3>
                        <p>{note.body}</p>
                      </div>
                      <div className="dc-drawer-pin-actions">
                        <button
                          type="button"
                          onClick={() => setArchived(note.id, false)}
                        >
                          Restore
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => deleteNote(note.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              <button
                type="button"
                className="dc-drawer-close"
                onClick={() => setDrawerOpen(false)}
              >
                Close drawer
              </button>
            </div>
          ) : (
            <>
              <div className="dc-corkboard">
                {pinnedNotes.length === 0 ? (
                  <p className="dc-cork-empty">
                    No notes pinned yet — use “✎ Pin a note” below.
                  </p>
                ) : (
                  pinnedNotes.map((note, i) => (
                    <article
                      key={note.id}
                      className={"dc-pin pin-" + (i % 2)}
                      style={{ backgroundImage: `url(/garden/note-${(i % 2) + 1}.png)` }}
                    >
                      <button
                        type="button"
                        className="dc-pin-archive"
                        onClick={() => setArchived(note.id, true)}
                        aria-label="Tuck into the drawer"
                        title="Tuck into the drawer"
                      >
                        ⤓
                      </button>
                      <div className="dc-pin-text">
                        <h3>{note.title}</h3>
                        <p>{note.body}</p>
                      </div>
                    </article>
                  ))
                )}
              </div>

              {/* tappable center drawer → opens the archived notes */}
              <button
                type="button"
                className="dc-drawer-hotspot"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open the drawer to see old notes"
              />

              <div className="dc-desk-actions">
                <button
                  type="button"
                  className="dc-add-note"
                  onClick={() => setComposing((c) => !c)}
                >
                  ✎ Pin a note
                </button>
                <button
                  type="button"
                  className="dc-drawer"
                  onClick={() => setDrawerOpen(true)}
                >
                  The drawer · {archivedCount} old{" "}
                  {archivedCount === 1 ? "note" : "notes"}
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
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => setComposing(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveNote}
                      disabled={
                        savingNote || !noteTitle.trim() || !noteBody.trim()
                      }
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
