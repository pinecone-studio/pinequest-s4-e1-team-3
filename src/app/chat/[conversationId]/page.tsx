import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ChatWindow } from "@/components/ChatWindow";

export default async function ChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ conversationId: string }>;
  searchParams: Promise<{ species?: string }>;
}) {
  const { conversationId } = await params;

  // Preview mode: render the chat UI without a real DB conversation
  if (conversationId === "preview") {
    const { species } = await searchParams;
    const name = species
      ? species.charAt(0).toUpperCase() + species.slice(1)
      : "Companion";
    return (
      <ChatWindow
        conversationId="preview"
        companionName={name}
        initialMessages={[]}
      />
    );
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      flower: { include: { species: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!conversation) notFound();

  const initialMessages = conversation.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  return (
    <ChatWindow
      conversationId={conversationId}
      companionName={conversation.flower.species.name}
      initialMessages={initialMessages}
      isCompleted={conversation.isCompleted}
    />
  );
}
