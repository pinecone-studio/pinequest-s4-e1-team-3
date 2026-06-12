// ============================================
//  steps.ts
//
//  Ordered, hands-on tutorial. The user actually uses each feature:
//  open the greenhouse, plant a flower, have a tiny chat, end & save it
//  (which grows a task), see the task on the tree, then throw a stone in
//  the pond. Anything created along the way (flower, conversation, task)
//  is cleaned up when the tutorial finishes or is skipped.
//
//  Steps are matched by `target` (not index) throughout the app, so this
//  order can change without breaking the advancement wiring.
//
//  advanceOn:
//    action  — a real interaction advances it (GardenShell / the panels call
//              advanceStep when the matching action fires: click Greenhouse,
//              pick a flower, click the flower, send a message, end & save,
//              throw a stone)
//    got-it  — explanatory beat; the "Ойлголоо →" button advances
//    auto    — the closing celebration; auto-dismisses after timerMs or tap
// ============================================

export type StepPanel =
  | "garden"
  | "workshop"
  | "notes"
  | "tasks"
  | "pond"
  | null;

export interface TutorialStepDef {
  step: number;
  /** data-tutorial-target value, or null for the celebration step */
  target: string | null;
  /** Panel this step lives in — drives visibility + GardenShell panel sync */
  panel: StepPanel;
  headlineMn: string;
  instructionMn: string;
  /** Smaller secondary line (used by the closing step) */
  sublineMn?: string;
  advanceOn: "action" | "got-it" | "auto";
  buttonLabel?: string;
  /** "large" = bigger glow; "wide" = full-width UI (pond controls);
   *  "none" = tooltip only, no spotlight cutout. */
  spotlight?: "normal" | "large" | "wide" | "none";
  timerMs?: number;
}

export const TUTORIAL_STEPS: TutorialStepDef[] = [
  // 0 — Open the Greenhouse
  {
    step: 0,
    target: "greenhouse",
    panel: "garden",
    headlineMn: "Хүлэмж",
    instructionMn: "Таны цэцгүүд энд төрдөг. Эхлэхийн тулд дарна уу.",
    advanceOn: "action",
    spotlight: "large",
  },
  // 1 — Pick a flower
  {
    step: 1,
    target: "flower-picker",
    panel: "workshop",
    headlineMn: "Анхны ярилцах төрлөө сонгоно уу",
    instructionMn:
      "Тус бүр өөр төрлийн яриа. Өнөөдөр өөрт тохирсон цэцгээ дарж тарина уу.",
    advanceOn: "action",
    spotlight: "large",
  },
  // 2 — Click the planted flower (garden pans to it)
  {
    step: 2,
    target: "flower-planted",
    panel: "garden",
    headlineMn: "Сонгосон төрлийн яриагаа эхлүүл",
    instructionMn:
      "Энэ таны шинэ цэцэг. Яриа эхлүүлэхийн тулд дээр нь дарна уу.",
    advanceOn: "action",
  },
  // 3 — Have a small chat (send a message, wait for the reply)
  {
    step: 3,
    target: "chat-input",
    panel: "notes",
    headlineMn: "Бяцхан яриа",
    instructionMn:
      "Яриа эхлүүж хэдэн үг бичээд илгээгээрэй. Хариултыг нь хүлээгээрэй.",
    advanceOn: "action",
  },
  // 4 — End & save (grows a task)
  {
    step: 4,
    target: "chat-end",
    panel: "notes",
    headlineMn: "Яриагаа хадгал",
    instructionMn:
      "Сайн байна. Одоо «Дуусгаж хадгалах» товчийг дарж яриагаа хадгалаарай — үүнээс даалгавар ургана.",
    advanceOn: "action",
  },
  // 5 — Click the Task Tree (garden landmark → opens the panel)
  {
    step: 5,
    target: "task-tree",
    panel: "garden",
    headlineMn: "Даалгаврын мод",
    instructionMn:
      "Энэ бол таны Даалгаврын мод. Нээхийн тулд дээр нь дарна уу.",
    advanceOn: "action",
  },
  // 6 — Explain the task tags (inside the task panel)
  {
    step: 6,
    target: "task-tree-frame",
    panel: "tasks",
    headlineMn: "Таны даалгаврууд",
    instructionMn:
      "Яриа бүрээс ургасан даалгавар, сурсан зүйлс эдгээр шошго дээр харагдана. Шошго дээр дарж дэлгэрэнгүйг нь үзэж, дууссан үед нь тэмдэглэх боломжтой.",
    advanceOn: "got-it",
    buttonLabel: "Ойлголоо →",
  },
  // 7 — Click the Pond (garden landmark → opens the panel)
  {
    step: 7,
    target: "pond",
    panel: "garden",
    headlineMn: "Нуур",
    instructionMn: "Энэ бол таны Нуур. Нээхийн тулд дээр нь дарна уу.",
    advanceOn: "action",
  },
  // 8 — Explain rock throwing (inside the pond panel)
  {
    step: 8,
    target: "pond-throw",
    panel: "pond",
    headlineMn: "Чулуу шидэх",
    instructionMn:
      "Тавьж явуулахыг хүссэн зүйлс байвал «Чулуу нэмэх» дээр дарж чулуу үүсгээд нуур руу шидээрэй. Энэ нь санаагаа тавьж өгөх бэлгэдэл юм.",
    advanceOn: "got-it",
    buttonLabel: "Ойлголоо →",
    spotlight: "wide",
  },
  // 9 — Closing (precise-language message)
  {
    step: 9,
    target: null,
    panel: null,
    headlineMn: "Бэлэн боллоо 🌿",
    instructionMn:
      "Нарийн тодорхой яриа эхлүүлээрэй. Яг одоо юу мэдэрч байгаагаа, яг юу болсныг хэлэх тусам дэмжигч таны хэрэгцээг илүү сайн ойлгоно. «Муу байна» биш — «ажил дээрээ шийдвэр гаргахдаа өөртөө итгэлгүй байна» гэх мэт.",
    sublineMn: "Нарийн үг = гүнзгий яриа = илүү хурдан өсөлт",
    advanceOn: "auto",
    timerMs: 3000,
  },
];
