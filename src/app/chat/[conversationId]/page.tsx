import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ChatWindow } from "@/components/ChatWindow";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;

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
    />
  );
}
