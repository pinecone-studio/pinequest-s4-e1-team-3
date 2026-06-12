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
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useFetchJson } from "@/hooks/useFetchJson";
import { useTutorial } from "@/components/tutorial/TutorialContext";
import { TUTORIAL_STEPS } from "@/components/tutorial/steps";
import { SPECIES_NAME_MN } from "./speciesText";
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

// When the user has no flower yet, the desk chat starts a conversation
// automatically on their first message using this species as the default
// companion (matches "Sage"). Falls back to the first available species.
const DEFAULT_SPECIES_KEY = "lavender";

// species.key → the EQ domain shown in the chat header pill
const TOPIC_BY_SPECIES: Record<string, string> = {
  daisy: "Өөрийгөө таних",
  lavender: "Өөрийгөө зохицуулах",
  sunflower: "Урам зориг",
  iris: "Бусдыг ойлгох",
  rose: "Бусадтай харилцах",
};

export function DeskChatPanel({
  onClose,
  flowerId,
  onOpenTasks,
}: {
  onClose: () => void;
  flowerId?: string;
  onOpenTasks?: (conversationId: string) => void;
}) {
  const reduceMotion = useReducedMotion();
  const { tutorialActive, currentStep, advanceStep } = useTutorial();
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

  const conversationId =
    overrideConvId ?? activeFlower?.conversationId ?? createdConversationId;
  const species = activeFlower?.species;
  const topic = species ? (TOPIC_BY_SPECIES[species.key] ?? "Дэмжигч") : "";
  // The companion is the flower itself — show its (Mongolian) species name +
  // what it represents (its EQ domain), not a fixed assistant name.
  const companionName = species
    ? (SPECIES_NAME_MN[species.key] ?? species.name)
    : "Дэмжигч";

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
  const [fillBlank, setFillBlank] = useState<string | null>(null);
  const [fillBlankAnswer, setFillBlankAnswer] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Voice mode
  const [voiceMode, setVoiceMode] = useState(false);
  const [micState, setMicState] = useState<"idle" | "recording" | "processing">(
    "idle",
  );
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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

  async function sendText(text: string, withVoice = false) {
    if (!text.trim() || loading) return;

    setError("");
    setLoading(true);

    const convId = await ensureConversation();
    if (!convId) {
      setError("Яриа эхлүүлж чадсангүй — дахин оролдоно уу.");
      setLoading(false);
      return;
    }

    setMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      { role: "assistant", content: "" },
    ]);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: convId, message: text }),
    });

    if (!res.ok || !res.body) {
      setMessages((prev) => prev.slice(0, -1));
      setError("Алдаа гарлаа — дахин оролдоно уу.");
      setLoading(false);
      return;
    }

    let fullReply = "";
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      fullReply += chunk;
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: fullReply };
        return updated;
      });
    }

    // Tutorial: the companion has finished replying → now point at "end & save".
    if (tutorialActive && TUTORIAL_STEPS[currentStep]?.target === "chat-input") {
      advanceStep();
    }

    if (res.headers.get("X-Stone-Prompt") === "true") {
      setShowStonePrompt(true);
    }

    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role !== "assistant") return prev;
      const isRose = species?.key === "rose";
      const match =
        isRose &&
        last.content.match(/\[FILL_BLANK\]([\s\S]*?)\[\/FILL_BLANK\]/);
      if (match) {
        setFillBlank(match[1].trim());
        setFillBlankAnswer("");
        const cleaned = last.content
          .replace(/\[FILL_BLANK\][\s\S]*?\[\/FILL_BLANK\]/g, "")
          .trim();
        const updated = [...prev];
        updated[updated.length - 1] = { ...last, content: cleaned };
        return updated;
      }
      return prev;
    });
    // Tutorial: the companion has finished replying → now point at "end & save".
    if (
      tutorialActive &&
      TUTORIAL_STEPS[currentStep]?.target === "chat-input"
    ) {
      advanceStep();
    }

    if (res.headers.get("X-Stone-Prompt") === "true") {
      setShowStonePrompt(true);
    }

    // Voice path: play TTS after reply arrives
    if (withVoice && fullReply) {
      try {
        const ttsRes = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: fullReply }),
        });
        const audioBlob = await ttsRes.blob();
        const typedBlob = new Blob([audioBlob], { type: "audio/wav" });
        const audio = new Audio(URL.createObjectURL(typedBlob));
        await audio.play();
      } catch (err) {
        console.error("[voice] TTS failed:", err);
      }
    }

    setLoading(false);
  }

  function send() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    void sendText(text, false);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.start();
      recorderRef.current = recorder;
      setMicState("recording");
    } catch {
      setError("Микрофон ашиглах зөвшөөрөл олгогдсонгүй.");
    }
  }

  function stopRecording() {
    if (!recorderRef.current) return;
    recorderRef.current.stop();
    recorderRef.current.onstop = async () => {
      setMicState("processing");
      try {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const sttRes = await fetch("/api/stt", { method: "POST", body: blob });
        const { text } = (await sttRes.json()) as { text?: string };
        if (text?.trim()) {
          await sendText(text.trim(), true);
        }
      } catch {
        setError("Дуу таних амжилтгүй боллоо — дахин оролдоно уу.");
      } finally {
        setMicState("idle");
      }
    };
  }

  function handleMicClick() {
    if (micState === "recording") stopRecording();
    else if (micState === "idle" && !loading) startRecording();
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
    // Tutorial: advance the instant the user hits save, so the chat-end
    // spotlight disappears immediately while the pipeline runs in the
    // background (the task tree step then polls for the new task).
    if (tutorialActive && TUTORIAL_STEPS[currentStep]?.target === "chat-end") {
      advanceStep();
    }
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
      setError("Энэ яриаг хадгалж чадсангүй — дахин оролдоно уу.");
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
    <motion.div
      className="desk-chat"
      // #4 — slide in from the right when opened, slide back out on close.
      // The AnimatePresence that drives the exit lives in GardenShell.
      initial={reduceMotion ? false : { x: "100%", opacity: 0 }}
      animate={reduceMotion ? undefined : { x: 0, opacity: 1 }}
      exit={reduceMotion ? undefined : { x: "100%", opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
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
              aria-label="Цэцэрлэг рүү буцах"
            >
              ‹
            </button>
            <span className="dc-avatar" aria-hidden>
              ⚘
            </span>
            <div className="dc-head-text" data-tutorial-target="chat-companion">
              <h2>{companionName}</h2>
              <p>{topic || "Таны дэмжигч"}</p>
            </div>
            <button
              type="button"
              className={"dc-history-btn" + (showHistory ? " active" : "")}
              onClick={openHistory}
              title="Өмнөх яриануудыг харах"
            >
              {showHistory ? "← Яриа" : "Түүх"}
            </button>
            {completed ? (
              <span className="dc-saved" aria-live="polite">
                Хадгалсан 🌸
              </span>
            ) : conversationId && (messages.length > 0 || tutorialActive) ? (
              <button
                type="button"
                className="dc-end"
                data-tutorial-target="chat-end"
                onClick={endConversation}
                disabled={completing}
                title="Энэ яриаг хадгал — дурсамж нь таны цэцгийг ургуулна"
              >
                {completing ? "Хадгалж байна…" : "Дуусгаж хадгалах"}
              </button>
            ) : (
              <span className="dc-leaf" aria-hidden>
                🍃
              </span>
            )}
          </header>

          {showHistory ? (
            <div className="dc-history">
              <p className="dc-history-head">Өмнөх ярианууд</p>
              {historyLoading ? (
                <div className="dc-history-empty">
                  <span className="dc-typing" aria-label="Ачаалж байна">
                    <span />
                    <span />
                    <span />
                  </span>
                </div>
              ) : historyConvs.length === 0 ? (
                <p className="dc-history-empty">Одоогоор өмнөх яриа алга.</p>
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
                          {SPECIES_NAME_MN[conv.flower.species.key] ??
                            conv.flower.species.name}{" "}
                          · {dateStr}
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
                            Устгах
                          </button>
                          <button
                            type="button"
                            className="dc-history-confirm-no"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingDeleteId(null);
                            }}
                          >
                            Болих
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
                          title="Яриа устгах"
                          aria-label="Устгах"
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
            <div
              className={
                "dc-body" + (messages.length === 0 ? " dc-body-empty" : "")
              }
            >
              {topic && (
                <div className="dc-topic">
                  {topic}
                  {species ? ` · ${companionName}` : ""}
                </div>
              )}

              {messages.length === 0 && (
                <p className="dc-empty">
                  Амьсгаа аваад — таныг юу зовоож байна вэ?
                </p>
              )}

              {/* #4 — each bubble animates in as it appears. popLayout means a
                  new message slots in without shoving the others around. */}
              <AnimatePresence mode="popLayout" initial={false}>
                {messages.map((m, i) => (
                  <motion.div
                    key={i}
                    layout={!reduceMotion}
                    className={"dc-msg " + (m.role === "user" ? "me" : "them")}
                    initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                    animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    <div className="dc-bubble">
                      {m.content || (
                        <span
                          className="dc-typing"
                          aria-label={`${companionName} бодож байна`}
                        >
                          <span />
                          <span />
                          <span />
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={bottomRef} />
            </div>
          )}

          {error && <p className="dc-error">{error}</p>}

          {showStonePrompt && !completed && (
            <div className="dc-stone-prompt">
              <span className="dc-stone-prompt-text">
                🪨 Энэ яриагаас тавьж өгөхийг хүссэн зүйл байна уу?
              </span>
              <div className="dc-stone-prompt-actions">
                <button
                  className="dc-stone-yes"
                  onClick={async () => {
                    setShowStonePrompt(false);
                    if (!conversationId) return;
                    try {
                      await fetch(
                        `/api/conversations/${conversationId}/save-stone`,
                        { method: "POST" },
                      );
                    } catch {
                      // stone save failed silently — conversation continues
                    }
                  }}
                >
                  Тавьж өгье
                </button>
                <button
                  className="dc-stone-no"
                  onClick={() => setShowStonePrompt(false)}
                >
                  Үгүй
                </button>
              </div>
            </div>
          )}

          {fillBlank &&
            !completed &&
            (() => {
              const parts = fillBlank.split("___");
              return (
                <div className="dc-stone-prompt">
                  <span
                    className="dc-stone-prompt-text"
                    style={{ display: "block", marginBottom: 8 }}
                  >
                    ✏️ Өгүүлбэрийг нөхөж бич:
                  </span>
                  <div
                    style={{
                      fontSize: 14,
                      lineHeight: 1.8,
                      color: "var(--g-ink)",
                      marginBottom: 10,
                    }}
                  >
                    {parts[0]}
                    <input
                      type="text"
                      value={fillBlankAnswer}
                      onChange={(e) => setFillBlankAnswer(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && fillBlankAnswer.trim()) {
                          const completed = fillBlank.replace(
                            "___",
                            fillBlankAnswer.trim(),
                          );
                          void sendText(completed, false);
                          setFillBlank(null);
                          setFillBlankAnswer("");
                        }
                      }}
                      placeholder="···"
                      style={{
                        display: "inline-block",
                        width: 110,
                        padding: "1px 8px",
                        borderRadius: 6,
                        border: "none",
                        borderBottom: "2px solid var(--g-ink-soft)",
                        fontSize: 14,
                        background: "transparent",
                        outline: "none",
                        verticalAlign: "baseline",
                        marginInline: 4,
                      }}
                      autoFocus
                    />
                    {parts[1]}
                  </div>
                  <div className="dc-stone-prompt-actions">
                    <button
                      className="dc-stone-yes"
                      disabled={!fillBlankAnswer.trim()}
                      onClick={() => {
                        const completed = fillBlank.replace(
                          "___",
                          fillBlankAnswer.trim(),
                        );
                        void sendText(completed, false);
                        setFillBlank(null);
                        setFillBlankAnswer("");
                      }}
                    >
                      Илгээх
                    </button>
                    <button
                      className="dc-stone-no"
                      onClick={() => setFillBlank(null)}
                    >
                      Алгасах
                    </button>
                  </div>
                </div>
              );
            })()}

          {completed && (
            <div className="dc-saved-note">
              <p>
                Энэ эргэцүүлэл хадгалагдлаа — таны цэцэг цэцэрлэгт дэлгэрч байна
                🌸
              </p>
              {onOpenTasks && (
                <button
                  type="button"
                  onClick={() => {
                    if (conversationId) onOpenTasks(conversationId);
                    onClose();
                  }}
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
                  🌳 Шинэ даалгавраа харах
                </button>
              )}
            </div>
          )}

          <div className="dc-input" data-tutorial-target="chat-input">
            {voiceMode ? (
              <>
                <div
                  className={`dc-voice-orb${micState === "recording" ? " dc-voice-orb--recording" : micState === "processing" || loading ? " dc-voice-orb--thinking" : ""}`}
                  onClick={handleMicClick}
                  role="button"
                  aria-label={micState === "recording" ? "Зогсоох" : "Ярих"}
                />
                <span className="dc-voice-status">
                  {micState === "recording"
                    ? "Сонсож байна… зогсоохын тулд дарна уу"
                    : micState === "processing"
                      ? "Хөрвүүлж байна…"
                      : loading
                        ? "Бодож байна…"
                        : "Ярихын тулд тойрог дээр дарна уу"}
                </span>
                <button
                  type="button"
                  className="dc-voice-exit"
                  onClick={() => {
                    setVoiceMode(false);
                    setMicState("idle");
                  }}
                  aria-label="Дуут горимоос гарах"
                >
                  ✕
                </button>
              </>
            ) : (
              <>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={
                    showHistory
                      ? "Дээрээс яриа сонгоно уу…"
                      : completed
                        ? "Энэ эргэцүүлэл хадгалагдсан"
                        : "Зурвасаа бичнэ үү…"
                  }
                  disabled={loading || completed || showHistory}
                />
                <button
                  type="button"
                  className="dc-mic-btn"
                  onClick={() => setVoiceMode(true)}
                  disabled={completed || showHistory}
                  aria-label="Дуут горимд орох"
                  title="Дуут яриа"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <rect x="9" y="2" width="6" height="13" rx="3" />
                    <path d="M5 10a7 7 0 0 0 14 0" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="9" y1="23" x2="15" y2="23" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="dc-send"
                  onClick={send}
                  disabled={
                    loading || !input.trim() || completed || showHistory
                  }
                  aria-label="Зурвас илгээх"
                >
                  ➤
                </button>
              </>
            )}
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
              aria-label={drawerOpen ? "Шургуулга хаах" : "Цэцэрлэг рүү буцах"}
            >
              ‹
            </button>
            <div>
              <h2>Ургамал судлаачийн ширээ</h2>
              <p>
                {drawerOpen
                  ? `Шургуулга · ${archivedCount} хуучин тэмдэглэл`
                  : pinnedNotes.length > 0
                    ? `${pinnedNotes.length} тэмдэглэл хадгалсан · хуучныг хадгалахын тулд шургуулгаа нээ`
                    : "Одоогоор тэмдэглэл алга"}
              </p>
            </div>
          </header>

          {drawerOpen ? (
            /* ---- open drawer: the archived ("old") notes ---- */
            <div className="dc-drawer-open">
              {archivedCount === 0 ? (
                <p className="dc-drawer-empty">
                  Шургуулга хоосон байна — тэмдэглэлээ энд хадгалахын тулд
                  хийгээрэй.
                </p>
              ) : (
                <div className="dc-drawer-notes">
                  {archivedNotes.map((note, i) => (
                    <article
                      key={note.id}
                      className={"dc-pin dc-drawer-pin pin-" + (i % 2)}
                      style={{
                        backgroundImage: `url(/garden/note-${(i % 2) + 1}.png)`,
                      }}
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
                          Сэргээх
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => deleteNote(note.id)}
                        >
                          Устгах
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
                Шургуулга хаах
              </button>
            </div>
          ) : (
            <>
              <div className="dc-corkboard">
                {pinnedNotes.length === 0 ? (
                  <p className="dc-cork-empty">
                    Одоогоор тэмдэглэл алга — доорх “✎ Тэмдэглэл хавчуулах”-ыг
                    ашиглана уу.
                  </p>
                ) : (
                  pinnedNotes.map((note, i) => (
                    <article
                      key={note.id}
                      className={"dc-pin pin-" + (i % 2)}
                      style={{
                        backgroundImage: `url(/garden/note-${(i % 2) + 1}.png)`,
                      }}
                    >
                      <button
                        type="button"
                        className="dc-pin-archive"
                        onClick={() => setArchived(note.id, true)}
                        aria-label="Шургуулга руу хийх"
                        title="Шургуулга руу хийх"
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
                aria-label="Хуучин тэмдэглэл харахын тулд шургуулгаа нээ"
              />

              <div className="dc-desk-actions">
                <button
                  type="button"
                  className="dc-add-note"
                  onClick={() => setComposing((c) => !c)}
                >
                  ✎ Тэмдэглэл хавчуулах
                </button>
                <button
                  type="button"
                  className="dc-drawer"
                  onClick={() => setDrawerOpen(true)}
                >
                  Шургуулга · {archivedCount} хуучин тэмдэглэл
                </button>
              </div>

              {composing && (
                <div className="dc-note-form">
                  <input
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="Тэмдэглэлийн гарчиг…"
                    autoFocus
                  />
                  <textarea
                    value={noteBody}
                    onChange={(e) => setNoteBody(e.target.value)}
                    placeholder="Юу бодож байна?"
                    rows={3}
                  />
                  <div className="dc-note-form-actions">
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => setComposing(false)}
                    >
                      Болих
                    </button>
                    <button
                      type="button"
                      onClick={saveNote}
                      disabled={
                        savingNote || !noteTitle.trim() || !noteBody.trim()
                      }
                    >
                      {savingNote ? "Хавчуулж байна…" : "Ширээнд хавчуулах"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </motion.div>
  );
}
