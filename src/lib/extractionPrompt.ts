// ============================================
//  extractionPrompt.ts
//
//  The system prompt + output types for the conversation-extraction AI,
//  used by both passes in memoryPipeline.ts:
//    - runMemoryPipeline   (mode: "full"      — a completed conversation)
//    - runMemoryCheckpoint (mode: "checkpoint" — a mid-conversation excerpt)
//
//  This module owns ONLY the extraction prompt + the shape of its output.
//  It does not touch the chat prompt (buildSystemPrompt.ts / flowerPrompts.ts),
//  the Greenhouse/Garden UI, or the DB schema.
//
//  STORED TODAY (existing schema, unchanged):
//    - mood     → Flower.mood / MoodEntry.mood   (validated against VALID_MOODS)
//    - tags     → Flower.tags
//    - memories → Memory rows (content + category, embedded via pgvector)
//
//  PREPARED FOR LATER (returned + sanitized, but no column to persist into yet):
//    - shouldStoreMemory / memoryToStore
//    - primaryFlower / supportFlowers / eqDomain / skillsPracticed
//    - mainEmotion / secondaryEmotion / trigger / thoughtPattern
//    - insight / nextStep / suggestedPracticeTask
//    - confidence
//  See memoryPipeline.ts for the TODO comments marking where these would
//  be wired in once a schema migration adds storage for them.
//
//  STORED-ISH TODAY (logged, not persisted):
//    - safety.riskDetected → logged as a [SAFETY] console.warn so it's
//      visible in server logs immediately, without a schema change.
// ============================================

// ----------------------------------------------
//  Flower / EQ enums (spec uses UPPERCASE; FlowerSpecies.key is lowercase)
// ----------------------------------------------
export type FlowerKey = "daisy" | "lavender" | "sunflower" | "iris" | "rose";
export type FlowerEnum = "DAISY" | "LAVENDER" | "SUNFLOWER" | "IRIS" | "ROSE";

export const FLOWER_KEY_TO_ENUM: Record<FlowerKey, FlowerEnum> = {
  daisy: "DAISY",
  lavender: "LAVENDER",
  sunflower: "SUNFLOWER",
  iris: "IRIS",
  rose: "ROSE",
};

const FLOWER_ENUMS: readonly FlowerEnum[] = ["DAISY", "LAVENDER", "SUNFLOWER", "IRIS", "ROSE"];

export type EQDomain =
  | "SELF_AWARENESS"
  | "SELF_REGULATION"
  | "MOTIVATION"
  | "EMPATHY"
  | "SOCIAL_SKILLS";

const EQ_DOMAINS: readonly EQDomain[] = [
  "SELF_AWARENESS",
  "SELF_REGULATION",
  "MOTIVATION",
  "EMPATHY",
  "SOCIAL_SKILLS",
];

// Mirrors the EQ mapping in prisma/seed.ts and flowerPrompts.ts — given here
// as context for the extraction AI, not re-derived from those files to avoid
// a cross-module dependency for one lookup table.
export const EQ_DOMAIN_BY_FLOWER: Record<FlowerKey, EQDomain> = {
  daisy: "SELF_AWARENESS",
  lavender: "SELF_REGULATION",
  sunflower: "MOTIVATION",
  iris: "EMPATHY",
  rose: "SOCIAL_SKILLS",
};

export type EQSkill =
  | "EMOTION_LABELING"
  | "TRIGGER_AWARENESS"
  | "BODY_SIGNAL_AWARENESS"
  | "PATTERN_RECOGNITION"
  | "PAUSE_BEFORE_REACTION"
  | "REFRAMING"
  | "CALMING_EXERCISE"
  | "IMPULSE_CONTROL"
  | "WRITE_WITHOUT_SENDING"
  | "VALUES_CLARITY"
  | "RESILIENCE"
  | "POSITIVE_OUTLOOK"
  | "SMALL_NEXT_STEP"
  | "PERSPECTIVE_TAKING"
  | "EMOTIONAL_CUES"
  | "NON_JUDGMENTAL_INTERPRETATION"
  | "REPAIR_CONVERSATION"
  | "BOUNDARY_SETTING"
  | "APOLOGY"
  | "CONFLICT_DE_ESCALATION";

const EQ_SKILLS: readonly EQSkill[] = [
  "EMOTION_LABELING",
  "TRIGGER_AWARENESS",
  "BODY_SIGNAL_AWARENESS",
  "PATTERN_RECOGNITION",
  "PAUSE_BEFORE_REACTION",
  "REFRAMING",
  "CALMING_EXERCISE",
  "IMPULSE_CONTROL",
  "WRITE_WITHOUT_SENDING",
  "VALUES_CLARITY",
  "RESILIENCE",
  "POSITIVE_OUTLOOK",
  "SMALL_NEXT_STEP",
  "PERSPECTIVE_TAKING",
  "EMOTIONAL_CUES",
  "NON_JUDGMENTAL_INTERPRETATION",
  "REPAIR_CONVERSATION",
  "BOUNDARY_SETTING",
  "APOLOGY",
  "CONFLICT_DE_ESCALATION",
];

export type ThoughtPattern =
  | "assuming_the_worst"
  | "self_blame"
  | "overthinking"
  | "avoidance"
  | "people_pleasing"
  | "anger_reaction"
  | "none";

const THOUGHT_PATTERNS: readonly ThoughtPattern[] = [
  "assuming_the_worst",
  "self_blame",
  "overthinking",
  "avoidance",
  "people_pleasing",
  "anger_reaction",
  "none",
];

export type RiskType = "self_harm" | "harm_to_others" | "abuse" | "crisis" | "none";

const RISK_TYPES: readonly RiskType[] = ["self_harm", "harm_to_others", "abuse", "crisis", "none"];

export interface SuggestedPracticeTask {
  shouldSuggest: boolean;
  title: string | null;
  description: string | null;
  flower: FlowerEnum | null;
  reason: string | null;
}

export interface SafetyFlags {
  riskDetected: boolean;
  riskType: RiskType;
  note: string | null;
}

// New, not-yet-persisted insight fields (see header for what's prepared vs stored).
export interface ConversationInsights {
  shouldStoreMemory: boolean;
  memoryToStore: string | null;

  primaryFlower: FlowerEnum | null;
  supportFlowers: FlowerEnum[];
  eqDomain: EQDomain | null;
  skillsPracticed: EQSkill[];

  mainEmotion: string | null;
  secondaryEmotion: string | null;
  trigger: string | null;
  thoughtPattern: ThoughtPattern | null;

  insight: string | null;
  nextStep: string | null;

  suggestedPracticeTask: SuggestedPracticeTask;
  safety: SafetyFlags;
  confidence: number;
}

// ----------------------------------------------
//  Existing memory shape (unchanged) — Memory.type in prisma/schema.prisma
// ----------------------------------------------
export type MemoryCategory =
  | "goal"
  | "value"
  | "decision"
  | "lesson"
  | "concern"
  | "reflection"
  | "relationship"
  | "career"
  | "habit";

const MEMORY_CATEGORIES: readonly MemoryCategory[] = [
  "goal",
  "value",
  "decision",
  "lesson",
  "concern",
  "reflection",
  "relationship",
  "career",
  "habit",
];

export interface ExtractedMemory {
  content: string;
  category: MemoryCategory;
}

// Full shape returned by the extraction AI: legacy fields (still stored
// exactly as before) + the new insight fields (sanitized, returned for
// future wiring — see header).
export interface FullExtractionResult extends ConversationInsights {
  mood: string;
  tags: string[];
  memories: ExtractedMemory[];
}

// ----------------------------------------------
//  Prompt building
// ----------------------------------------------

const ROLE_AND_PHILOSOPHY = `You are the conversation-extraction system for "Bloom", an AI EQ growth garden inspired by Daniel Goleman's emotional intelligence model. The chat companion (Sage) helps users practice five EQ areas, each represented by a flower:
  DAISY     = Self-awareness  — understand my feelings
  LAVENDER  = Self-regulation — calm my reactions
  SUNFLOWER = Motivation       — find my inner direction
  IRIS      = Empathy          — understand someone else
  ROSE      = Social skills    — communicate better

YOU ARE NOT A THERAPIST. Do not diagnose, label, or clinically analyze the user. Your only job is to read the conversation (or excerpt) below and extract gentle, useful, future-helpful observations.

THE MOST IMPORTANT RULE — store observations, not judgments:
  Good: "User sometimes feels anxious when someone does not reply."
  Bad:  "User is insecure."
  Good: "Delayed replies may trigger feelings of being ignored."
  Bad:  "User has abandonment issues."
  Good: "Pausing before replying seemed helpful."
  Bad:  "User always overreacts."

Everything you extract should help a future conversation say something like:
  "Өмнө нь хариу ирэхгүй үед чи шууд хамгийн муугаар бодох гээд байдаг тухай ярьж байсан. Энэ удаа эхлээд шалтгааныг нь мэдэхгүй гэдгээ саная."
It must never help a future conversation say something like:
  "You always overthink because you are insecure."`;

const OUTPUT_SCHEMA = `Return ONLY a single JSON object — no markdown, no explanation, no comments — with EXACTLY these fields:

{
  "mood": "happy | calm | sad | anxious | motivated | reflective | confused | angry | grateful — the dominant overall tone",
  "tags": ["3-5 short topic keywords, in the user's own language"],
  "memories": [
    {
      "content": "ONE short first-person sentence, ~8-12 words, in the user's own language",
      "category": "goal | value | decision | lesson | concern | reflection | relationship | career | habit"
    }
  ],

  "shouldStoreMemory": true | false,
  "memoryToStore": "one short observation sentence, or null",

  "primaryFlower": "DAISY | LAVENDER | SUNFLOWER | IRIS | ROSE | null",
  "supportFlowers": ["DAISY | LAVENDER | SUNFLOWER | IRIS | ROSE", "..."],

  "eqDomain": "SELF_AWARENESS | SELF_REGULATION | MOTIVATION | EMPATHY | SOCIAL_SKILLS | null",

  "skillsPracticed": [
    "EMOTION_LABELING | TRIGGER_AWARENESS | BODY_SIGNAL_AWARENESS | PATTERN_RECOGNITION | PAUSE_BEFORE_REACTION | REFRAMING | CALMING_EXERCISE | IMPULSE_CONTROL | WRITE_WITHOUT_SENDING | VALUES_CLARITY | RESILIENCE | POSITIVE_OUTLOOK | SMALL_NEXT_STEP | PERSPECTIVE_TAKING | EMOTIONAL_CUES | NON_JUDGMENTAL_INTERPRETATION | REPAIR_CONVERSATION | BOUNDARY_SETTING | APOLOGY | CONFLICT_DE_ESCALATION"
  ],

  "mainEmotion": "string or null",
  "secondaryEmotion": "string or null",
  "trigger": "string or null",
  "thoughtPattern": "assuming_the_worst | self_blame | overthinking | avoidance | people_pleasing | anger_reaction | none | null",

  "insight": "one gentle sentence describing what the user understood, or null",
  "nextStep": "one realistic, tiny next action, or null",

  "suggestedPracticeTask": {
    "shouldSuggest": true | false,
    "title": "string or null",
    "description": "string or null",
    "flower": "DAISY | LAVENDER | SUNFLOWER | IRIS | ROSE | null",
    "reason": "string or null"
  },

  "safety": {
    "riskDetected": true | false,
    "riskType": "self_harm | harm_to_others | abuse | crisis | none",
    "note": "string or null"
  },

  "confidence": 0.0
}

If information is missing, use null, false, [], or "none" as appropriate. confidence is between 0 and 1.`;

const MEMORIES_SECTION = `MOOD, TAGS, MEMORIES (mood/tags/memories — these three are stored immediately)
- "mood" must be exactly one of the 9 listed values — pick the single dominant tone of the WHOLE conversation/excerpt.
- "tags" are 3-5 short topic keywords (e.g. "career", "family", "argument") — write them in the SAME language the user writes in.
- "memories": extract 0-5 items the way a close friend would actually remember weeks later. A memory earns its place if it does at least one of:
    - Shows a stable trait: a value, fear, goal, coping style, or pattern that keeps showing up
    - Marks a real turning point: a decision, realization, or shift — and what it MEANT to them
    - Carries genuine emotional weight: something that clearly mattered, not a passing mood
    - Reveals something about a relationship or person that shapes their life
  Skip small talk, logistics, generic statements that could describe almost anyone, and anything that won't matter next week. An empty list is a good, honest result if nothing stands out.
  Apply THE MOST IMPORTANT RULE here too — observations, not judgments (e.g. "User finds it helpful to write a message draft before sending it" not "User is anxious about messaging").
  Keep each memory's "content" to a single short sentence (~8-12 words) — they're shown in small hover cards on the garden's memory tree; longer text overflows and looks broken.
  Write "tags" and each memory's "content" in the SAME language the user writes in (e.g. Mongolian in, Mongolian out). "mood" and "category" are always the fixed English values above — never translated.`;

const SHOULD_STORE_MEMORY_SECTION = `SHOULD STORE MEMORY / MEMORY TO STORE
"shouldStoreMemory" + "memoryToStore" are a SEPARATE, single top-level observation about the user (not one of the "memories" array items) — set this only if something in the conversation may help future support.

Set shouldStoreMemory = true when the user:
  - reveals a recurring emotional pattern
  - reveals a trigger
  - reveals a value or need
  - practices a useful coping strategy
  - shares a stable preference about support style
  - shares a relationship pattern
  - makes meaningful progress

Set shouldStoreMemory = false when it is:
  - random small talk
  - temporary and not useful later
  - too sensitive without clear future usefulness
  - a clinical interpretation
  - only your guess, not something the user actually said
  - something that could embarrass the user if repeated later

If true, "memoryToStore" is ONE short, soft, non-judgmental sentence:
  Good: "User sometimes feels anxious when messages are not replied to."
  Good: "User finds it helpful to write a message draft before sending it."
  Good: "User values honest communication but worries about sounding too needy."
  Good: "User may blame themselves quickly when communication feels unclear."
  Bad:  "User is needy." / "User has rejection trauma." / "User is emotionally unstable." / "User cannot control themselves."`;

const FLOWER_SECTION = `PRIMARY FLOWER / SUPPORT FLOWERS / EQ DOMAIN
"primaryFlower" should usually be the flower selected for THIS session if given below. If no flower is given, infer it from the main skill practiced:
  - DAISY     = emotion naming / self-awareness
  - LAVENDER  = calming / self-regulation
  - SUNFLOWER = values / motivation / next step
  - IRIS      = empathy / another person's perspective
  - ROSE      = message drafting / boundary / apology / repair

"eqDomain" is simply the EQ area matching "primaryFlower" (DAISY→SELF_AWARENESS, LAVENDER→SELF_REGULATION, SUNFLOWER→MOTIVATION, IRIS→EMPATHY, ROSE→SOCIAL_SKILLS). Use null if primaryFlower is null.

"supportFlowers": list any OTHER flowers whose EQ skill the conversation clearly drifted into — but only if that skill was genuinely engaged with, not barely touched. Examples:
  - Daisy session, user wanted to send an angry message → primaryFlower DAISY, supportFlowers ["LAVENDER"]
  - Daisy session, user explored another person's perspective → primaryFlower DAISY, supportFlowers ["IRIS"]
  - Lavender session, user then asked what to write to someone → primaryFlower LAVENDER, supportFlowers ["ROSE"]
Most conversations stay within one flower — supportFlowers is usually [].`;

const SKILLS_SECTION = `SKILLS PRACTICED
List ONLY skills that were actually practiced or clearly discussed — do not list every possible skill "just in case". Examples:
  - User named a feeling → ["EMOTION_LABELING"]
  - User identified what triggered a reaction → ["TRIGGER_AWARENESS"]
  - User paused before sending an angry message → ["PAUSE_BEFORE_REACTION", "WRITE_WITHOUT_SENDING"]
  - User considered another person's perspective → ["PERSPECTIVE_TAKING", "NON_JUDGMENTAL_INTERPRETATION"]
  - User wrote a calm apology → ["APOLOGY", "REPAIR_CONVERSATION"]
An empty list is correct if nothing concrete was practiced.`;

const EMOTION_AND_PATTERN_SECTION = `EMOTIONS, TRIGGER, THOUGHT PATTERN
"mainEmotion" / "secondaryEmotion": short free-text labels (e.g. "anxiety", "regret", "feeling ignored") describing what the user felt — null if unclear.
"trigger": a short phrase for what set the feeling off (e.g. "not receiving a reply", "a previous harsh reply") — null if none is identifiable.

"thoughtPattern": only set this if CLEARLY supported by what the user actually said — do not over-diagnose. Use "none" if a pattern is discussed but doesn't fit the list, or null if thought patterns weren't really part of this conversation.
  - "Тэр хариу бичихгүй байна. Надад дургүй болсон байх." → "assuming_the_worst"
  - "Бүх юм миний буруу." → "self_blame"
  - "Би бодоод л байна, зогсож чадахгүй байна." → "overthinking"`;

const INSIGHT_SECTION = `INSIGHT / NEXT STEP
"insight": one gentle sentence describing what the user came to understand.
  Good: "The user noticed that delayed replies can make them feel ignored."
  Bad:  "The user realized they are insecure."
"nextStep": one realistic, small action — not a big life change.
  Good: "Wait before sending another message and write a calmer draft first."
  Bad:  "Fix their communication style."
Both are null if the conversation didn't reach that point.`;

const PRACTICE_TASK_SECTION = `SUGGESTED PRACTICE TASK
This is NOT implementing the Task Tree — it is only preparing a possible tiny task for later. Set "suggestedPracticeTask.shouldSuggest" = true ONLY when a task would genuinely help. A task must be: tiny, optional, emotionally safe, connected to this conversation, based on the primary or a support flower, and doable within minutes or by the end of the day. Do not suggest a task when the user mainly needed emotional support and no action fits.

Examples by flower:
  DAISY:     { "title": "Name the feeling", "description": "Write one sentence: 'I feel ___ because ___.'", "flower": "DAISY", "reason": "The user seemed unsure what they were feeling." }
  LAVENDER:  { "title": "Pause before replying", "description": "Wait 10 minutes before sending the message.", "flower": "LAVENDER", "reason": "The user wanted to react while emotionally intense." }
  SUNFLOWER: { "title": "One small next step", "description": "Choose one tiny action that would make tomorrow easier.", "flower": "SUNFLOWER", "reason": "The user felt directionless and unmotivated." }
  IRIS:      { "title": "One other explanation", "description": "Write one possible explanation that is not self-blaming.", "flower": "IRIS", "reason": "The user assumed the other person's silence was personal." }
  ROSE:      { "title": "Calm message draft", "description": "Draft one short message that is honest but not pressuring.", "flower": "ROSE", "reason": "The user wanted to communicate but needed calmer wording." }

Never suggest harsh tasks, e.g. NOT { "title": "Stop overthinking", "description": "Do not overthink anymore." } and NOT { "title": "Confront them", "description": "Tell them exactly how badly they hurt you." }
If shouldSuggest is false, set title/description/flower/reason to null.`;

const SAFETY_SECTION = `SAFETY
Set "safety" fields only when there is real risk: self-harm, wanting to die, immediate danger, abuse, or serious harm to others. Do NOT over-trigger this for ordinary sadness, stress, loneliness, anger, or venting — those are normal and belong in mood/mainEmotion instead.
For ordinary conversations: { "riskDetected": false, "riskType": "none", "note": null }
If risk IS detected, set riskDetected true, pick the closest riskType, and write one short factual "note" (an observation, not a judgment) describing what raised the concern.`;

const NOTHING_TO_EXTRACT = `If nothing meaningful happened (e.g. only a greeting), return a low-signal result: a reasonable "mood", empty "tags", empty "memories", shouldStoreMemory false, memoryToStore null, primaryFlower/supportFlowers/eqDomain/skillsPracticed empty or null as appropriate, mainEmotion/secondaryEmotion/trigger/thoughtPattern/insight/nextStep null, suggestedPracticeTask.shouldSuggest false, safety = { riskDetected: false, riskType: "none", note: null }, and a high confidence (e.g. 0.9+) since "nothing happened" is itself a confident read.`;

// ----------------------------------------------
//  buildExtractionPrompt
//
//  mode: "full"       — runMemoryPipeline, the conversation just ended.
//        "checkpoint" — runMemoryCheckpoint, this is an excerpt from the
//                        MIDDLE of an ongoing conversation; more will follow.
//  primaryFlowerKey:   the species.key of the flower this session was
//                       planted as (e.g. "sunflower"), if known.
// ----------------------------------------------
export function buildExtractionPrompt({
  mode,
  primaryFlowerKey,
}: {
  mode: "full" | "checkpoint";
  primaryFlowerKey?: string | null;
}): string {
  const framing =
    mode === "checkpoint"
      ? "You are reading an EXCERPT from the MIDDLE of an ongoing conversation — it is not the end, more will follow. Judge only what's in this excerpt; if nothing in it stands out, return the low-signal result described at the end."
      : "You are reading a COMPLETE conversation that just ended.";

  const flowerKey = (primaryFlowerKey ?? "") as FlowerKey;
  const flowerContext = FLOWER_KEY_TO_ENUM[flowerKey]
    ? `The user planted this session as ${FLOWER_KEY_TO_ENUM[flowerKey]} (EQ domain: ${EQ_DOMAIN_BY_FLOWER[flowerKey]}). Use this as "primaryFlower" unless the conversation clearly moved to a different flower's focus entirely.`
    : `No flower was specified for this session — infer "primaryFlower" from the main skill practiced, or null if nothing fits.`;

  return [
    ROLE_AND_PHILOSOPHY,
    framing,
    flowerContext,
    OUTPUT_SCHEMA,
    MEMORIES_SECTION,
    SHOULD_STORE_MEMORY_SECTION,
    FLOWER_SECTION,
    SKILLS_SECTION,
    EMOTION_AND_PATTERN_SECTION,
    INSIGHT_SECTION,
    PRACTICE_TASK_SECTION,
    SAFETY_SECTION,
    NOTHING_TO_EXTRACT,
    "Respond with the JSON object only.",
  ].join("\n\n");
}

// ----------------------------------------------
//  sanitizeExtraction
//
//  The model can return malformed/missing fields for the many new keys
//  above (wrong enum casing, missing nested objects, out-of-range
//  confidence, etc). This fills in safe defaults so callers can read
//  every field without optional chaining everywhere. mood/tags/memories
//  pass through as-is — memoryPipeline.ts keeps validating "mood" against
//  VALID_MOODS exactly as before.
// ----------------------------------------------
export function sanitizeExtraction(raw: unknown): FullExtractionResult {
  const r = (raw ?? {}) as Record<string, unknown>;

  const memories: ExtractedMemory[] = Array.isArray(r.memories)
    ? (r.memories as unknown[])
        .filter(
          (m): m is { content: string; category: string } =>
            !!m &&
            typeof m === "object" &&
            typeof (m as Record<string, unknown>).content === "string" &&
            MEMORY_CATEGORIES.includes((m as Record<string, unknown>).category as MemoryCategory)
        )
        .map((m) => ({ content: m.content, category: m.category as MemoryCategory }))
    : [];

  const task = (r.suggestedPracticeTask ?? {}) as Record<string, unknown>;
  const safety = (r.safety ?? {}) as Record<string, unknown>;

  const asEnum = <T extends string>(value: unknown, allowed: readonly T[]): T | null =>
    typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : null;

  const asEnumArray = <T extends string>(value: unknown, allowed: readonly T[]): T[] =>
    Array.isArray(value)
      ? (value as unknown[]).filter(
          (v): v is T => typeof v === "string" && (allowed as readonly string[]).includes(v)
        )
      : [];

  const asNullableString = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value : null);

  return {
    mood: typeof r.mood === "string" ? r.mood : "",
    tags: Array.isArray(r.tags) ? (r.tags as unknown[]).filter((t): t is string => typeof t === "string") : [],
    memories,

    shouldStoreMemory: r.shouldStoreMemory === true,
    memoryToStore: asNullableString(r.memoryToStore),

    primaryFlower: asEnum(r.primaryFlower, FLOWER_ENUMS),
    supportFlowers: asEnumArray(r.supportFlowers, FLOWER_ENUMS),
    eqDomain: asEnum(r.eqDomain, EQ_DOMAINS),
    skillsPracticed: asEnumArray(r.skillsPracticed, EQ_SKILLS),

    mainEmotion: asNullableString(r.mainEmotion),
    secondaryEmotion: asNullableString(r.secondaryEmotion),
    trigger: asNullableString(r.trigger),
    thoughtPattern: asEnum(r.thoughtPattern, THOUGHT_PATTERNS),

    insight: asNullableString(r.insight),
    nextStep: asNullableString(r.nextStep),

    suggestedPracticeTask: {
      shouldSuggest: task.shouldSuggest === true,
      title: asNullableString(task.title),
      description: asNullableString(task.description),
      flower: asEnum(task.flower, FLOWER_ENUMS),
      reason: asNullableString(task.reason),
    },

    safety: {
      riskDetected: safety.riskDetected === true,
      riskType: asEnum(safety.riskType, RISK_TYPES) ?? "none",
      note: asNullableString(safety.note),
    },

    confidence:
      typeof r.confidence === "number" && Number.isFinite(r.confidence)
        ? Math.min(1, Math.max(0, r.confidence))
        : 0,
  };
}
