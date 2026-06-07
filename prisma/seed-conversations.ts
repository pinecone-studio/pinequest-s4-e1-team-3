import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CONVS: Record<string, { role: "user" | "assistant"; content: string }[]> = {
  "cmq3dxpa30002xb09y8l1xyw8": [
    // Daisy - Career
    { role: "assistant", content: "Hi, I'm Daisy! I'm here to help you explore your career and sense of purpose. What's on your mind today when it comes to your work or professional life?" },
    { role: "user",      content: "I've been feeling a bit lost about my career direction lately. I work in marketing but I'm not sure it's where I want to be long-term." },
    { role: "assistant", content: "That sense of drift can feel unsettling, especially when you've invested time building skills in a field. What part of marketing feels most out of alignment for you - the day-to-day work itself, or something deeper, like the purpose behind it?" },
    { role: "user",      content: "I think it's the purpose. I do the work fine, but at the end of the day I don't feel like I made something meaningful." },
    { role: "assistant", content: "That's a really honest reflection. Meaning is different for everyone - for some it's impact, for others it's craft or creativity or connection. When you imagine a day at work where you finished feeling genuinely satisfied, what does that look like for you?" },
  ],
  "cmq3dxq2k0005xb09jrjvhblx": [
    // Rose - Relationships
    { role: "assistant", content: "Hello, I'm Rosa! I'm here to gently explore your relationships and how you connect with the people in your life. What would you like to reflect on today?" },
    { role: "user",      content: "I've been having a hard time with my best friend. We used to talk every day but lately there's this distance between us and I don't know how to close it." },
    { role: "assistant", content: "Distance in a close friendship can feel like a quiet kind of loss - the relationship is still there, but something has shifted. When did you first start noticing this gap between you?" },
    { role: "user",      content: "Maybe three or four months ago. She got a new job and has been really busy. I try not to take it personally but I do." },
    { role: "assistant", content: "It makes sense that you take it personally - closeness means you care, and care makes us sensitive to change. When you say you try not to take it personally, what does the part of you that does take it personally fear is actually happening?" },
  ],
  "cmq3dxquu0008xb09qqmjwifx": [
    // Iris - Self-Reflection
    { role: "assistant", content: "Welcome, I'm Iris! This is a space for you to look inward - no rush, no right answers. What has been sitting with you lately when you think about who you are or who you want to become?" },
    { role: "user",      content: "I've been thinking about how I always put other people first. I pride myself on it, but lately I wonder if it's actually just a habit I built to avoid dealing with my own needs." },
    { role: "assistant", content: "That's a profound question to sit with. There's a difference between choosing to give and giving in order to disappear. What does it feel like when you set aside your own needs for someone else - is there relief, or something more complicated?" },
    { role: "user",      content: "Honestly? A kind of relief, but also a slight resentment later. Like I gave something away and then quietly wished I hadn't." },
    { role: "assistant", content: "That pairing of relief and quiet resentment is really telling. The relief might say 'I'm safe now.' The resentment might be the part of you that knows your needs didn't disappear, just got postponed. What need do you think gets postponed most often?" },
  ],
  "cmq3dxrn4000bxb09erk1vx2k": [
    // Lavender - Stress Relief
    { role: "assistant", content: "Hello, I'm Lavi! This is a calm space. Whatever stress or heaviness you're carrying right now, you don't have to explain or justify it. What's weighing on you today?" },
    { role: "user",      content: "Everything feels urgent at once. Work deadlines, family stuff, I barely slept this week. I feel like I'm running but never actually getting anywhere." },
    { role: "assistant", content: "That exhaustion is real - when everything demands you at the same time, the body and mind start to borrow from reserves that are already empty. I'm not going to ask you to fix it right now. Can you just notice: where in your body do you feel that urgency the most?" },
    { role: "user",      content: "My chest, honestly. There's like a tightness there most of the time now. I've kind of gotten used to it." },
    { role: "assistant", content: "Getting used to it is one of the quiet ways stress hides - it becomes the background noise you stop noticing until something makes you pause. The fact that you noticed just now matters. If that tightness could speak, what do you think it would say it needs?" },
  ],
};

async function main() {
  for (const [convId, messages] of Object.entries(CONVS)) {
    await prisma.message.createMany({
      data: messages.map((m) => ({
        conversationId: convId,
        role: m.role,
        content: m.content,
      })),
    });
    console.log(`  seeded ${messages.length} messages → ${convId}`);
  }
  console.log("Done.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
