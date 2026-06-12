"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Message = { role: "user" | "assistant"; content: string };

export function ChatWindow({
  conversationId,
  companionName,
  initialMessages,
  isCompleted = false,
}: {
  conversationId: string;
  companionName: string;
  initialMessages: Message[];
  isCompleted?: boolean;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // "Ending" a reflection marks the conversation complete, which kicks off
  // the memory pipeline (extracts memories + mood, embeds them with pgvector,
  // and blooms the flower) — see POST /api/conversations/:id/complete.
  const [ending, setEnding] = useState(false);
  const [ended, setEnded] = useState(isCompleted);
  const [endError, setEndError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

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
      setError("Хариу авахад алдаа гарлаа. Дахин оролдоно уу.");
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

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  async function endReflection() {
    if (ending || ended || conversationId === "preview" || messages.length === 0) return;

    setEnding(true);
    setEndError("");

    const res = await fetch(`/api/conversations/${conversationId}/complete`, {
      method: "POST",
    });

    setEnding(false);
    if (!res.ok) {
      setEndError("Дуусгахад алдаа гарлаа. Дахин оролдоно уу.");
      return;
    }
    setEnded(true);
  }

  const canEnd = conversationId !== "preview" && !ended && messages.length > 0;

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto px-4">
      <div className="py-4 border-b flex items-center gap-2">
        <span className="text-lg">🌿</span>
        <span className="font-medium text-foreground">{companionName}</span>
        <span className="flex-1" />
        {ended ? (
          <span className="text-xs text-muted-foreground">Дууссан 🌸</span>
        ) : (
          canEnd && (
            <Button variant="outline" size="sm" onClick={endReflection} disabled={ending}>
              {ending ? "Дуусгаж байна…" : "Дуусгах"}
            </Button>
          )
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-6 space-y-4">
        {messages.length === 0 && (
          <p className="text-center text-muted-foreground text-sm mt-12">
            Өөрийнхөө тухай ярих уу...
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm"
              }`}
            >
              {m.content || (
                <span className="inline-flex items-center gap-1 py-1" aria-label="бодож байна">
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50 animate-bounce [animation-delay:300ms]" />
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="text-center text-sm text-red-500 pb-2">{error}</p>
      )}
      {endError && (
        <p className="text-center text-sm text-red-500 pb-2">{endError}</p>
      )}

      {ended ? (
        <div className="py-6 border-t text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Чиний тунгаан бодол хадгалагдлаа — цэцэг чинь дэлбээлж байна 🌸
          </p>
          <Button variant="secondary" size="sm" onClick={() => router.push("/garden")}>
            Цэцэрлэг рүү буцах
          </Button>
        </div>
      ) : (
        <div className="py-4 border-t flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Юу бодож байна вэ..."
            className="resize-none min-h-[44px] max-h-36"
            disabled={loading}
          />
          <Button
            onClick={send}
            disabled={loading || !input.trim()}
            size="icon"
            className="shrink-0 mb-0.5"
          >
            ↑
          </Button>
        </div>
      )}
    </div>
  );
}
