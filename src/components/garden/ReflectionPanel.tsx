// ============================================
//  ReflectionPanel.tsx
//
//  The "Check-in" panel: the weekly EQ reflection. On open it fetches the
//  unlock status (GET /api/eq/weekly) and shows one of three button states.
//  When available and started, it renders the shared EQTestStepper with the
//  10 weekly questions; submitting posts to POST /api/eq/weekly and re-checks
//  status. Results are console.logged server-side (no dashboard yet).
// ============================================

"use client";

import { useState } from "react";
import { useFetchJson } from "@/hooks/useFetchJson";
import { PanelShell } from "./PanelShell";
import { getWeeklySet } from "@/lib/eqQuestions";
import { EQTestStepper, type EQAnswer } from "@/components/eq/EQTestStepper";
import { EQDashboard } from "@/components/eq/EQDashboard";

type WeeklyStatus = {
  hasEverTaken: boolean;
  available: boolean;
  daysUntilNext: number;
  lastTakenAt: string | null;
  setIndex: number;
};

export function ReflectionPanel({ onClose }: { onClose: () => void }) {
  const { data, refetch } = useFetchJson<WeeklyStatus>("/api/eq/weekly");
  const [taking, setTaking] = useState(false);
  const [done, setDone] = useState(false);
  const [dashKey, setDashKey] = useState(0);

  async function submit(answers: EQAnswer[]) {
    const res = await fetch("/api/eq/weekly", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    if (!res.ok) throw new Error("Failed to save weekly reflection");
    setTaking(false);
    setDone(true);
    setDashKey((k) => k + 1); // refresh the dashboard with the new scores
    refetch();
  }

  // --- Taking the test: full centered card overlay ---
  if (taking) {
    return (
      <div style={overlay}>
        <div style={card}>
          <header style={head}>
            <span style={eyebrow}>Долоо хоногийн эргэцүүлэл</span>
            <h2 style={title}>Энэ долоо хоног чи хэр байв?</h2>
            <p style={sub}>10 богино асуулт. Өөрт чинь ойр санагдсанаа сонго.</p>
          </header>
          <EQTestStepper
            questions={getWeeklySet(data?.setIndex ?? 0)}
            onSubmit={submit}
            submitLabel="Эргэцүүллээ хадгалах"
          />
          <button type="button" style={cancel} onClick={() => setTaking(false)}>
            Болих
          </button>
        </div>
      </div>
    );
  }

  const available = data?.available ?? false;


  return (
    <PanelShell
      title="Долоо хоногийн эргэцүүлэл"
      banner="/garden/garden-bg.png"
      note="7 хоног тутамд өөртэйгөө бяцхан уулзалт"
      onClose={onClose}
      loading={data === null}
      overlay={<EQDashboard refreshKey={dashKey} />}
    >
      <div style={statusWrap}>
        {done && (
          <p style={doneNote}>
            Баярлалаа 🌱 Энэ долоо хоногийн эргэцүүлэл хадгалагдлаа. Дараагийн
            эргэцүүлэл 7 хоногийн дараа нээгдэнэ.
          </p>
        )}

        <p style={statusText}>
          {available
            ? "Энэ бол шалгалт биш — өнгөрсөн долоо хоногоо эргэн харах тайван мөч. Бэлэн үедээ эхлүүлээрэй."
            : "Чи саяхан эргэцүүлсэн байна. Бяцхан амсхийгээд, дараа долоо хоногт дахин уулзъя."}
        </p>

      </div>
    </PanelShell>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 60,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "28px 16px",
  background: "linear-gradient(rgba(35,39,27,0.6), rgba(35,39,27,0.75))",
  overflowY: "auto",
};
const card: React.CSSProperties = {
  width: "100%",
  maxWidth: 600,
  background: "rgba(252,248,240,0.98)",
  borderRadius: 22,
  padding: "28px 26px 22px",
  boxShadow: "0 24px 70px rgba(0,0,0,0.4)",
};
const head: React.CSSProperties = { textAlign: "center", marginBottom: 22 };
const eyebrow: React.CSSProperties = { fontSize: 11.5, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase", color: "#7a9e72" };
const title: React.CSSProperties = { fontSize: 21, fontWeight: 800, color: "#3a3228", margin: "7px 0 8px", lineHeight: 1.3 };
const sub: React.CSSProperties = { fontSize: 13.5, color: "#7a6e60", lineHeight: 1.55, margin: 0 };
const cancel: React.CSSProperties = { display: "block", margin: "16px auto 0", background: "none", border: "none", color: "#9a8f7d", fontSize: 13, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" };

const statusWrap: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16, alignItems: "center", textAlign: "center", padding: "8px 4px 4px" };
const statusText: React.CSSProperties = { fontSize: 14.5, color: "#3a3228", lineHeight: 1.6, maxWidth: 460, margin: 0 };
const doneNote: React.CSSProperties = { fontSize: 13.5, color: "#5a6e54", background: "rgba(122,158,114,0.14)", border: "1px solid rgba(122,158,114,0.3)", borderRadius: 12, padding: "10px 14px", lineHeight: 1.5, margin: 0, maxWidth: 460 };
