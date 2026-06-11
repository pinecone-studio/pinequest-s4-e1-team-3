export interface TutorialStepDef {
  step: number;
  /** data-tutorial-target value, or null for the celebration step */
  target: string | null;
  headline: string;
  headlineMn: string;
  instruction: string;
  instructionMn: string;
  /**
   * button       — only a labelled button advances the step (step 0)
   * pulse        — spotlight + pulse dot; the user must click the target element (steps 1–3)
   * click-or-timer — clicking the target OR a timer advances (step 4)
   * got-it        — "Got it →" button only (step 5)
   * auto          — auto-dismiss after timerMs (celebration, step 6)
   */
  advanceOn: "button" | "pulse" | "click-or-timer" | "got-it" | "auto";
  buttonLabel?: string;
  timerMs?: number;
}

export const TUTORIAL_STEPS: TutorialStepDef[] = [
  {
    step: 0,
    target: "garden-scene",
    headline: "Welcome to Bloom 🌸",
    headlineMn: "Bloom-д тавтай морил 🌸",
    instruction: "This is your garden. Your companions live here. Let's plant your first one.",
    instructionMn:
      "Энэ бол таны цэцэрлэг. Таны хамтрагчид энд амьдардаг. Эхнийхээ цэцгийг тарицгаая.",
    advanceOn: "button",
    buttonLabel: "Let's go →",
  },
  {
    step: 1,
    target: "greenhouse",
    headline: "The Greenhouse",
    headlineMn: "Хүлэмж",
    instruction: "This is where your flowers are born. Click it to begin.",
    instructionMn: "Таны цэцгүүд энд төрдөг. Эхлэхийн тулд дарна уу.",
    advanceOn: "pulse",
  },
  {
    step: 2,
    target: "flower-picker",
    headline: "Choose your first companion",
    headlineMn: "Анхны хамтрагчаа сонгоно уу",
    instruction:
      "Each flower is a different kind of conversation. Pick the one that feels right today.",
    instructionMn:
      "Тус бүр өөр төрлийн яриа. Өнөөдөр тохирсоноо сонгоно уу.",
    advanceOn: "pulse",
  },
  {
    step: 3,
    target: "flower-planted",
    headline: "Meet your companion",
    headlineMn: "Хамтрагчтайгаа уулз",
    instruction: "Click your flower to open a conversation. They're ready to listen.",
    instructionMn: "Яриа эхлүүлэхийн тулд цэцгээ дарна уу. Тэд сонсоход бэлэн.",
    advanceOn: "pulse",
  },
  {
    step: 4,
    target: "memory-tree",
    headline: "The Memory Tree",
    headlineMn: "Дурсамжийн мод",
    instruction:
      "Over time, your companions remember you. Everything they learn lives here.",
    instructionMn:
      "Цаг хугацааны явцад хамтрагчид чамайг санадаг. Тэдний мэдсэн бүх зүйл энд амьдардаг.",
    advanceOn: "click-or-timer",
    buttonLabel: "Got it →",
    timerMs: 4000,
  },
  {
    step: 5,
    target: "mood-tracker",
    headline: "How are you feeling?",
    headlineMn: "Та ямар байна?",
    instruction:
      "Track your mood here. The more you share, the better Bloom understands you.",
    instructionMn:
      "Сэтгэлийн байдлаа энд хянаарай. Хуваалцах тусам Bloom таныг илүү ойлгоно.",
    advanceOn: "got-it",
    buttonLabel: "Got it →",
  },
  {
    step: 6,
    target: null,
    headline: "You're all set.",
    headlineMn: "Бүгд бэлэн боллоо.",
    instruction: "Your garden is waiting. 🌿",
    instructionMn: "Таны цэцэрлэг хүлээж байна. 🌿",
    advanceOn: "auto",
    timerMs: 2500,
  },
];
