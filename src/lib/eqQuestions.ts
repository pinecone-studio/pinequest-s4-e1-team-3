// ============================================
//  eqQuestions.ts
//
//  Fixed question bank for the EQ assessment system (see the EQ models in
//  prisma/schema.prisma and the scoring in src/lib/eqScoring.ts).
//
//  - ONBOARDING_QUESTIONS: 20 questions, 4 per EQ area, taken once after
//    sign-up to set the initial EQ profile.
//  - WEEKLY_QUESTIONS:     10 questions, 2 per EQ area, a lighter weekly
//    reflection that updates the current profile.
//
//  Each option is scored 1–4 where 1 = least adaptive / "needs more support"
//  and 4 = most adaptive / "strong area". This file is the SERVER-SIDE
//  source of truth for scores: the client only ever sends back the selected
//  option label, and the API re-derives the score from here so scores can't
//  be tampered with (see src/app/api/eq/*).
//
//  All copy is warm, scenario-based Mongolian. No "right/wrong" framing —
//  the stepper shows supportive microcopy instead (see EQTestStepper).
// ============================================

import type { EQArea } from "@prisma/client";

export type EQOptionLabel = "A" | "B" | "C" | "D";
export type EQOptionScore = 1 | 2 | 3 | 4;

export interface EQOption {
  label: EQOptionLabel;
  text: string;
  score: EQOptionScore;
}

export interface EQQuestion {
  id: string;
  type: "onboarding" | "weekly";
  eqArea: EQArea;
  question: string;
  options: EQOption[];
}

// Small helper so each question stays readable: pass the four option texts
// in ascending score order (1 → 4).
function opts(a: string, b: string, c: string, d: string): EQOption[] {
  return [
    { label: "A", text: a, score: 1 },
    { label: "B", text: b, score: 2 },
    { label: "C", text: c, score: 3 },
    { label: "D", text: d, score: 4 },
  ];
}

// ============================================
//  ONBOARDING — 20 questions (4 per area)
// ============================================
export const ONBOARDING_QUESTIONS: EQQuestion[] = [
  // ---- Self-awareness ----
  {
    id: "onboarding_self_awareness_1",
    type: "onboarding",
    eqArea: "SELF_AWARENESS",
    question: "Хүчтэй сэтгэл хөдлөл төрөхөд чи ихэвчлэн юу хийдэг вэ?",
    options: opts(
      "Юу болж байгааг анзаардаггүй, зүгээр л урсгалд автдаг.",
      "Ямар нэг юм болж байгааг мэдэрдэг ч нэрлэж чаддаггүй.",
      "Ихэвчлэн ямар мэдрэмж төрж байгаагаа таньдаг.",
      "Мэдрэмжээ нэрлээд, юунаас үүдэлтэйг нь ч ойлгодог.",
    ),
  },
  {
    id: "onboarding_self_awareness_2",
    type: "onboarding",
    eqArea: "SELF_AWARENESS",
    question: "Өдрийн эцэст сэтгэлийн байдлаа эргэцүүлж боддог уу?",
    options: opts(
      "Тэгж бодож үзэж байгаагүй.",
      "Хааяа, ихэвчлэн муухай юм болсон үед л.",
      "Тогтмол биш ч өөрийгөө ажигладаг.",
      "Өдөр бүр ямар нэг хэлбэрээр эргэцүүлдэг.",
    ),
  },
  {
    id: "onboarding_self_awareness_3",
    type: "onboarding",
    eqArea: "SELF_AWARENESS",
    question: "Бие чинь стресст орсныг хэрхэн мэддэг вэ?",
    options: opts(
      "Огт анзаардаггүй.",
      "Дараа нь л ойлгодог.",
      "Заримдаа биеийн шинжийг (зүрх дэлсэх, чангарах) анзаардаг.",
      "Бие маань хэрхэн хариу үзүүлж байгааг шуурхай мэдэрдэг.",
    ),
  },
  {
    id: "onboarding_self_awareness_4",
    type: "onboarding",
    eqArea: "SELF_AWARENESS",
    question: "Сэтгэл санаа чинь өөрчлөгдөхөд яагаад гэдгийг нь ойлгодог уу?",
    options: opts(
      "Ихэвчлэн ойлгодоггүй, шалтгаангүй мэт санагддаг.",
      "Хааяа таамагладаг.",
      "Ихэнхдээ ямар нэг шалтгааныг олж хардаг.",
      "Юу өдөөсныг нь нэлээд тодорхой ойлгодог.",
    ),
  },

  // ---- Self-regulation ----
  {
    id: "onboarding_self_regulation_1",
    type: "onboarding",
    eqArea: "SELF_REGULATION",
    question: "Уурлах эсвэл бухимдах үед чи юу хийдэг вэ?",
    options: opts(
      "Тэр дороо хариу үйлдэл хийчихдэг.",
      "Барьж байхыг хичээдэг ч дотроо хадгалсаар үлддэг.",
      "Мэдрэмжээ анзаараад түр зогсохыг хичээдэг.",
      "Түр зогсоод, ойлгоод, хариугаа болгоомжтой сонгодог.",
    ),
  },
  {
    id: "onboarding_self_regulation_2",
    type: "onboarding",
    eqArea: "SELF_REGULATION",
    question: "Хэн нэгэнд ширүүн мессеж бичмээр санагдвал?",
    options: opts(
      "Шууд илгээчихдэг.",
      "Илгээдэг ч дараа нь харамсдаг.",
      "Бичээд хэсэг хүлээдэг.",
      "Эхлээд тайвширч, дараа нь илгээх эсэхээ шийддэг.",
    ),
  },
  {
    id: "onboarding_self_regulation_3",
    type: "onboarding",
    eqArea: "SELF_REGULATION",
    question: "Сэтгэл хөдлөл хэт ихдэхэд?",
    options: opts(
      "Бүрэн автагдаж, юу ч хийж чадахгүй болдог.",
      "Дарж байхыг хичээдэг ч хэцүү байдаг.",
      "Гарах гарц хайхыг оролддог.",
      "Өөрийгөө тайвшруулах арга барилтай, түүнийгээ хэрэглэдэг.",
    ),
  },
  {
    id: "onboarding_self_regulation_4",
    type: "onboarding",
    eqArea: "SELF_REGULATION",
    question: "Төлөвлөгөө чинь гэнэт өөрчлөгдөхөд хэрхэн хариу үздэг вэ?",
    options: opts(
      "Их бухимддаг, удаан сэргэдэг.",
      "Эхэндээ бухимддаг ч аажмаар дасдаг.",
      "Тийм ч их санаа зовдоггүй.",
      "Уян хатан, шинэ нөхцөлд хурдан тохирдог.",
    ),
  },

  // ---- Motivation ----
  {
    id: "onboarding_motivation_1",
    type: "onboarding",
    eqArea: "MOTIVATION",
    question: "Хийх ёстой зүйлдээ урам алдвал?",
    options: opts(
      "Орхиод явчихдаг.",
      "Хүчээр хийхийг оролддог ч утга учрыг нь олж хардаггүй.",
      "Яагаад энэ надад чухал болохыг өөртөө сануулдаг.",
      "Үнэт зүйлтэйгээ холбоод, жижиг алхмаар үргэлжлүүлдэг.",
    ),
  },
  {
    id: "onboarding_motivation_2",
    type: "onboarding",
    eqArea: "MOTIVATION",
    question: "Зорилгоо тодорхойлохдоо?",
    options: opts(
      "Зорилго гэж бодож үздэггүй.",
      "Ихэвчлэн бусдын хүлээлтээр зорилго тавьдаг.",
      "Заримдаа өөрийн үнэхээр хүссэнээ боддог.",
      "Юу үнэхээр чухал болохоо мэддэг, түүгээрээ удирдуулдаг.",
    ),
  },
  {
    id: "onboarding_motivation_3",
    type: "onboarding",
    eqArea: "MOTIVATION",
    question: "Бүтэлгүйтэл тохиолдвол?",
    options: opts(
      "Бууж өгөөд дахин оролддоггүй.",
      "Удаан хугацаанд гутардаг.",
      "Хэцүү ч аажмаар сэргэдэг.",
      "Сургамж аваад дахин эхэлдэг.",
    ),
  },
  {
    id: "onboarding_motivation_4",
    type: "onboarding",
    eqArea: "MOTIVATION",
    question: "Ирээдүйнхээ талаар бодохдоо?",
    options: opts(
      "Утга учиргүй мэт санагддаг.",
      "Тодорхойгүй, эргэлзээтэй байдаг.",
      "Заримдаа найдвартай байдаг.",
      "Хэн болохыг хүсэж байгаагаа төсөөлж чаддаг.",
    ),
  },

  // ---- Empathy ----
  {
    id: "onboarding_empathy_1",
    type: "onboarding",
    eqArea: "EMPATHY",
    question: "Хэн нэгэн чамд хүйтэн хандвал эхлээд юу боддог вэ?",
    options: opts(
      "“Тэр надад дургүй болсон” гэж шууд боддог.",
      "Гомдоод цаашид бодохоо больдог.",
      "Магадгүй өөр шалтгаан байж болох гэж боддог.",
      "Түүний талаас юу болж байж болохыг тайвнаар бодож үздэг.",
    ),
  },
  {
    id: "onboarding_empathy_2",
    type: "onboarding",
    eqArea: "EMPATHY",
    question: "Найзтайгаа маргалдвал?",
    options: opts(
      "Зөвхөн өөрийнхөө зөвийг боддог.",
      "Уурласан хэвээр удаан үлддэг.",
      "Түүний талаас ямар харагдсаныг бодохыг оролддог.",
      "Хоёр талын мэдрэмж зэрэг үнэн байж болно гэдгийг ойлгодог.",
    ),
  },
  {
    id: "onboarding_empathy_3",
    type: "onboarding",
    eqArea: "EMPATHY",
    question: "Хэн нэгэн гунигтай байгааг хармагц?",
    options: opts(
      "Тэр бүр анзаардаггүй.",
      "Анзаардаг ч юу хэлэхээ мэддэггүй.",
      "Юу болсныг асуудаг.",
      "Үг, биеийн хэлэмжийг нь уншиж, мэдрэмжийг нь ойлгохыг оролддог.",
    ),
  },
  {
    id: "onboarding_empathy_4",
    type: "onboarding",
    eqArea: "EMPATHY",
    question: "Бусдын үйлдлийг тайлбарлахдаа?",
    options: opts(
      "Хамгийн муугаар нь таамагладаг.",
      "Ихэвчлэн өөртэйгөө холбож боддог.",
      "Заримдаа өөр тайлбар хайдаг.",
      "“Магадгүй”, “байж болох” гэсэн нээлттэй байр сууринаас боддог.",
    ),
  },

  // ---- Social skills ----
  {
    id: "onboarding_social_skills_1",
    type: "onboarding",
    eqArea: "SOCIAL_SKILLS",
    question: "Хэн нэгэнд бухимдсанаа хэлэх хэрэгтэй болвол?",
    options: opts(
      "Хэлж чаддаггүй, дотроо хадгалдаг.",
      "Дэлбэрч, ширүүн хэлчихдэг.",
      "Хэлэхийг оролддог ч эвгүй болдог.",
      "Тайван, тодорхой, гэхдээ зөөлөн илэрхийлдэг.",
    ),
  },
  {
    id: "onboarding_social_skills_2",
    type: "onboarding",
    eqArea: "SOCIAL_SKILLS",
    question: "Үл ойлголцол гарвал?",
    options: opts(
      "Зайлсхийж, тоохгүй өнгөрөөдөг.",
      "Маргалдаж, өөрийгөө зөвтгөдөг.",
      "Засахыг хүсдэг ч яаж эхлэхээ мэддэггүй.",
      "Тайван ярилцаж эвлэрэхийг эрмэлздэг.",
    ),
  },
  {
    id: "onboarding_social_skills_3",
    type: "onboarding",
    eqArea: "SOCIAL_SKILLS",
    question: "Хил хязгаар тогтоох (үгүй гэж хэлэх) хэр амар вэ?",
    options: opts(
      "Огт чаддаггүй.",
      "Чаддаггүй болохоор зөвшөөрчихдөг.",
      "Хааяа чаддаг ч буруутгал төрдөг.",
      "Хүндэтгэлтэй, зөөлнөөр үгүй гэж хэлж чаддаг.",
    ),
  },
  {
    id: "onboarding_social_skills_4",
    type: "onboarding",
    eqArea: "SOCIAL_SKILLS",
    question: "Уучлалт гуйх хэрэгтэй болвол?",
    options: opts(
      "Гуйж чаддаггүй.",
      "Хэт их доош ордог эсвэл албадлагаар гуйдаг.",
      "Гуйдаг ч эвгүйрхдэг.",
      "Богино, чин сэтгэлээсээ, хариуцлагатай гуйдаг.",
    ),
  },
];

// ============================================
//  WEEKLY — 3 rotating sets of 10 (2 per area), framed as "this week".
//  A given set repeats only every 3 weeks (see getWeeklySet below).
// ============================================
const WEEKLY_SET_1: EQQuestion[] = [
  // ---- Self-awareness ----
  {
    id: "weekly_self_awareness_1",
    type: "weekly",
    eqArea: "SELF_AWARENESS",
    question: "Энэ долоо хоногт мэдрэмжээ хэр сайн таньж байв?",
    options: opts(
      "Юу мэдэрснээ бараг ойлгоогүй.",
      "Ойлгох гэж оролдсон ч бүрхэг байсан.",
      "Ихэнхдээ нэрлэж чадсан.",
      "Мэдрэмж, шалтгааныг нь тодорхой ойлгож байсан.",
    ),
  },
  {
    id: "weekly_self_awareness_2",
    type: "weekly",
    eqArea: "SELF_AWARENESS",
    question: "Энэ долоо хоногт сэтгэл санаагаа эргэцүүлэх цаг гарсан уу?",
    options: opts(
      "Огт үгүй.",
      "Маш бага.",
      "Хэдэн удаа.",
      "Тогтмол эргэцүүлж байсан.",
    ),
  },

  // ---- Self-regulation ----
  {
    id: "weekly_self_regulation_1",
    type: "weekly",
    eqArea: "SELF_REGULATION",
    question:
      "Энэ долоо хоногт сэтгэл хөдлөлд хөтлөгдөхөд эхлээд ихэвчлэн юу хийв?",
    options: opts(
      "Бодолгүй шууд хариу үзүүлсэн.",
      "Барих гэсэн ч дотор үлдсэн.",
      "Мэдрэмжээ анзаараад түр зогссон.",
      "Зогсоод, ойлгоод, хариугаа болгоомжтой сонгосон.",
    ),
  },
  {
    id: "weekly_self_regulation_2",
    type: "weekly",
    eqArea: "SELF_REGULATION",
    question: "Ширүүн хариу үйлдэл хийхээс хэр зайлсхийж чадав?",
    options: opts(
      "Чадаагүй, шууд урвал хийсэн.",
      "Заримдаа л чадсан.",
      "Ихэнхдээ түр зогсож чадсан.",
      "Тайвширсныхаа дараа шийддэг байсан.",
    ),
  },

  // ---- Motivation ----
  {
    id: "weekly_motivation_1",
    type: "weekly",
    eqArea: "MOTIVATION",
    question: "Энэ долоо хоногт юу чухал болохоо хэр мэдэрч байв?",
    options: opts(
      "Утга учиргүй санагдсан.",
      "Тодорхойгүй байсан.",
      "Заримдаа тодорхой байсан.",
      "Юу чухал болохоо сайн мэдэрч байсан.",
    ),
  },
  {
    id: "weekly_motivation_2",
    type: "weekly",
    eqArea: "MOTIVATION",
    question: "Жижиг ч атугай урагшлах алхам хийв үү?",
    options: opts(
      "Огт үгүй.",
      "Хийхийг хүссэн ч чадаагүй.",
      "Нэг хоёр алхам хийсэн.",
      "Тогтмол жижиг алхмууд хийж байсан.",
    ),
  },

  // ---- Empathy ----
  {
    id: "weekly_empathy_1",
    type: "weekly",
    eqArea: "EMPATHY",
    question: "Энэ долоо хоногт хэн нэгний талаас харахыг хэр оролдов?",
    options: opts(
      "Зөвхөн өөрийнхөө талаас бодсон.",
      "Бодохыг хүссэн ч хэцүү байсан.",
      "Хэдэн удаа оролдсон.",
      "Бусдын байр суурийг тайвнаар бодсон.",
    ),
  },
  {
    id: "weekly_empathy_2",
    type: "weekly",
    eqArea: "EMPATHY",
    question: "Хэн нэгний үйлдлийг хамгийн муугаар таамагласан уу?",
    options: opts(
      "Байнга тэгсэн.",
      "Ихэвчлэн тэгсэн.",
      "Хааяа, гэхдээ өөр тайлбар ч хайсан.",
      "Нээлттэй, “магадгүй” гэсэн байр сууринаас бодсон.",
    ),
  },

  // ---- Social skills ----
  {
    id: "weekly_social_skills_1",
    type: "weekly",
    eqArea: "SOCIAL_SKILLS",
    question: "Энэ долоо хоногт мэдрэмжээ хэр тайван илэрхийлэв?",
    options: opts(
      "Дотроо хадгалсан эсвэл дэлбэрсэн.",
      "Хэлэх гэж оролдсон ч эвгүй болсон.",
      "Ихэнхдээ тайван хэлж чадсан.",
      "Тодорхой, зөөлөн илэрхийлж байсан.",
    ),
  },
  {
    id: "weekly_social_skills_2",
    type: "weekly",
    eqArea: "SOCIAL_SKILLS",
    question: "Үл ойлголцлыг засах гэж оролдов уу?",
    options: opts(
      "Зайлсхийсэн.",
      "Маргалдсан.",
      "Засахыг хүссэн ч хэцүү байсан.",
      "Тайван ярилцаж эвлэрсэн.",
    ),
  },
];

// ---- Weekly set 2 ----
const WEEKLY_SET_2: EQQuestion[] = [
  {
    id: "weekly_s2_self_awareness_1",
    type: "weekly",
    eqArea: "SELF_AWARENESS",
    question: "Энэ долоо хоногт хүчтэй мэдрэмжээ биеэрээ мэдэрсэн үү?",
    options: opts(
      "Огт анзаараагүй.",
      "Дараа нь л ойлгосон.",
      "Заримдаа биеийн шинжийг анзаарсан.",
      "Шууд мэдэрч, нэрлэж чадсан.",
    ),
  },
  {
    id: "weekly_s2_self_awareness_2",
    type: "weekly",
    eqArea: "SELF_AWARENESS",
    question: "Сэтгэлийн өөрчлөлтийнхөө шалтгааныг ойлгож чадав уу?",
    options: opts(
      "Шалтгаангүй мэт санагдсан.",
      "Зүгээр л таамагласан.",
      "Ихэнхдээ ойлгосон.",
      "Юу өдөөсныг тодорхой мэдсэн.",
    ),
  },
  {
    id: "weekly_s2_self_regulation_1",
    type: "weekly",
    eqArea: "SELF_REGULATION",
    question: "Стресстэй мөчид өөрийгөө хэрхэн тайвшруулав?",
    options: opts(
      "Тайвшруулж чадаагүй.",
      "Оролдсон ч нэмэргүй байсан.",
      "Нэг арга хэрэглэж үзсэн.",
      "Үр дүнтэй тайвширсан.",
    ),
  },
  {
    id: "weekly_s2_self_regulation_2",
    type: "weekly",
    eqArea: "SELF_REGULATION",
    question: "Яаран шийдвэр гаргахаас өөрийгөө хазаарлав уу?",
    options: opts(
      "Үгүй, яаран хийсэн.",
      "Хааяа л чадсан.",
      "Ихэнхдээ хүлээж чадсан.",
      "Тэвчээртэй хүлээсэн.",
    ),
  },
  {
    id: "weekly_s2_motivation_1",
    type: "weekly",
    eqArea: "MOTIVATION",
    question: "Энэ долоо хоногт ямар нэг зүйлд урам зориг мэдэрсэн үү?",
    options: opts(
      "Огт үгүй.",
      "Бараг үгүй.",
      "Хааяа мэдэрсэн.",
      "Тогтмол мэдэрсэн.",
    ),
  },
  {
    id: "weekly_s2_motivation_2",
    type: "weekly",
    eqArea: "MOTIVATION",
    question: "Бэрхшээл тохиолдоход хэрхэн хандав?",
    options: opts(
      "Бууж өгсөн.",
      "Удаан гацсан.",
      "Аажмаар давсан.",
      "Сургамж аваад үргэлжлүүлсэн.",
    ),
  },
  {
    id: "weekly_s2_empathy_1",
    type: "weekly",
    eqArea: "EMPATHY",
    question: "Хэн нэгэнтэй санал зөрөхөд түүний талаас бодов уу?",
    options: opts(
      "Үгүй, зөвхөн өөрийнхөө талаас.",
      "Бодохыг хүссэн ч хүнд байсан.",
      "Оролдсон.",
      "Тайван бодож үзсэн.",
    ),
  },
  {
    id: "weekly_s2_empathy_2",
    type: "weekly",
    eqArea: "EMPATHY",
    question: "Ойр хүнийхээ мэдрэмжийг анзаарав уу?",
    options: opts(
      "Анзаараагүй.",
      "Хожуу анзаарсан.",
      "Ихэвчлэн анзаарсан.",
      "Шууд мэдэрсэн.",
    ),
  },
  {
    id: "weekly_s2_social_skills_1",
    type: "weekly",
    eqArea: "SOCIAL_SKILLS",
    question: "Хэрэгцээгээ хэн нэгэнд илэрхийлэх хэрэгтэй болов уу, хэрхэв?",
    options: opts(
      "Хэлж чадаагүй.",
      "Хэлэх гэж оролдсон ч эвгүй болсон.",
      "Ихэвчлэн хэлж чадсан.",
      "Тодорхой, тайван хэлсэн.",
    ),
  },
  {
    id: "weekly_s2_social_skills_2",
    type: "weekly",
    eqArea: "SOCIAL_SKILLS",
    question: "Маргаан гарахад хэрхэн шийдэв?",
    options: opts(
      "Зайлсхийсэн.",
      "Маргалдсан.",
      "Засахыг оролдсон.",
      "Тайван ярьж эвлэрсэн.",
    ),
  },
];

// ---- Weekly set 3 ----
const WEEKLY_SET_3: EQQuestion[] = [
  {
    id: "weekly_s3_self_awareness_1",
    type: "weekly",
    eqArea: "SELF_AWARENESS",
    question: "Энэ долоо хоногт өөрийнхөө талаар шинэ юм ойлгов уу?",
    options: opts(
      "Үгүй.",
      "Бараг үгүй.",
      "Жоохон ойлгосон.",
      "Тийм, нэлээд тодорхой.",
    ),
  },
  {
    id: "weekly_s3_self_awareness_2",
    type: "weekly",
    eqArea: "SELF_AWARENESS",
    question: "Мэдрэмжээ үгүйсгэлгүй хүлээж авав уу?",
    options: opts(
      "Дарж нуусан.",
      "Хүлээж авахад хүнд байсан.",
      "Ихэвчлэн хүлээж авсан.",
      "Бүрэн хүлээж авсан.",
    ),
  },
  {
    id: "weekly_s3_self_regulation_1",
    type: "weekly",
    eqArea: "SELF_REGULATION",
    question: "Уур бухимдлаа хэрхэн илэрхийлэв?",
    options: opts(
      "Бусдад дэлбэрүүлж гаргасан.",
      "Дотроо хурааж хадгалсан.",
      "Хянахыг оролдсон.",
      "Эрүүлээр, зохистой гаргасан.",
    ),
  },
  {
    id: "weekly_s3_self_regulation_2",
    type: "weekly",
    eqArea: "SELF_REGULATION",
    question: "Хүлээгдээгүй зүйл тохиолдоход хэрхэн хариу үзүүлэв?",
    options: opts(
      "Их бухимдсан.",
      "Эхэндээ хэцүү байсан.",
      "Аажмаар дасан зохицсон.",
      "Уян хатан хандсан.",
    ),
  },
  {
    id: "weekly_s3_motivation_1",
    type: "weekly",
    eqArea: "MOTIVATION",
    question: "Зорилгодоо хүрэхээр жижиг алхам хийв үү?",
    options: opts(
      "Үгүй.",
      "Хүссэн ч хийгээгүй.",
      "Нэг хоёр алхам.",
      "Тогтмол алхам хийсэн.",
    ),
  },
  {
    id: "weekly_s3_motivation_2",
    type: "weekly",
    eqArea: "MOTIVATION",
    question: "Хийж буй зүйл чинь утга учиртай санагдав уу?",
    options: opts(
      "Утгагүй санагдсан.",
      "Эргэлзээтэй байсан.",
      "Заримдаа утгатай.",
      "Тодорхой утгатай санагдсан.",
    ),
  },
  {
    id: "weekly_s3_empathy_1",
    type: "weekly",
    eqArea: "EMPATHY",
    question: "Хэн нэгний үйлдлийг буруугаар ойлгохоосоо өмнө бодов уу?",
    options: opts(
      "Шууд буруугаар ойлгосон.",
      "Ихэвчлэн буруугаар.",
      "Хааяа зогсож бодсон.",
      "Өөр тайлбар хайсан.",
    ),
  },
  {
    id: "weekly_s3_empathy_2",
    type: "weekly",
    eqArea: "EMPATHY",
    question: "Хэн нэгнийг үнэхээр сонсох цаг гаргав уу?",
    options: opts(
      "Үгүй.",
      "Бараг үгүй.",
      "Хааяа.",
      "Анхааралтай сонссон.",
    ),
  },
  {
    id: "weekly_s3_social_skills_1",
    type: "weekly",
    eqArea: "SOCIAL_SKILLS",
    question: "Үгүй гэж хэлэх шаардлага гарав уу, хэрхэн хэлэв?",
    options: opts(
      "Чадалгүй зөвшөөрсөн.",
      "Хэлэхэд эвгүйрхсэн.",
      "Хэлж чадсан.",
      "Хүндэтгэлтэй, зөөлөн хэлсэн.",
    ),
  },
  {
    id: "weekly_s3_social_skills_2",
    type: "weekly",
    eqArea: "SOCIAL_SKILLS",
    question: "Хэн нэгэнтэй холбоогоо засах/сэргээх алхам хийв үү?",
    options: opts(
      "Үгүй.",
      "Бодсон ч хийгээгүй.",
      "Бага зэрэг хийсэн.",
      "Идэвхтэй алхам хийсэн.",
    ),
  },
];

// Rotation: a set repeats only every 3 weeks. The caller passes the user's
// completed-weekly count and gets the set for this week (count % 3).
export const WEEKLY_SETS: EQQuestion[][] = [
  WEEKLY_SET_1,
  WEEKLY_SET_2,
  WEEKLY_SET_3,
];

export function getWeeklySet(index: number): EQQuestion[] {
  const n = WEEKLY_SETS.length;
  return WEEKLY_SETS[(((index % n) + n) % n)];
}

// Convenience lookup used by the scoring API to resolve a submitted
// { questionId, selectedOption } back to its { eqArea, score }. Covers all
// onboarding questions + every weekly set.
export const QUESTIONS_BY_ID: Record<string, EQQuestion> = Object.fromEntries(
  [...ONBOARDING_QUESTIONS, ...WEEKLY_SETS.flat()].map((q) => [q.id, q]),
);
