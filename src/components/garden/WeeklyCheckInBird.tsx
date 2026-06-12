"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ONBOARDING_QUESTIONS } from "@/lib/eqQuestions";
import { EQTestStepper } from "@/components/eq/EQTestStepper";
import type { EQAnswer } from "@/components/eq/EQTestStepper";

const STORAGE_KEY = "pinequest_checkin_last";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function shouldShow(): boolean {
  try {
    if (new URLSearchParams(window.location.search).has("bird")) return true;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return true;
    return Date.now() - Number(raw) >= SEVEN_DAYS_MS;
  } catch {
    return false;
  }
}

function markDone() {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {}
}

export function WeeklyCheckInBird() {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!shouldShow()) return;
    const t = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(t);
  }, []);

  async function handleSubmit(answers: EQAnswer[]) {
    await fetch("/api/eq/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    markDone();
    setSubmitted(true);
    setTimeout(() => {
      setOpen(false);
      setVisible(false);
    }, 2000);
  }

  function dismiss() {
    setOpen(false);
  }

  if (!visible) return null;

  return (
    <>
      {/* Notification card below the Clerk avatar button (top-right) */}
      <button
        type="button"
        aria-label="7 хоногийн тест өгөөрэй"
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          top: 96,
          right: 28,
          zIndex: 50,
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          animation: "checkin-fade-in 0.4s ease",
        }}
      >
        {/* Bird — text card anchored to its beak */}
        <span style={{ position: "relative", display: "block", width: 80, height: 80 }}>
          <Image
            src="/garden/bird.png"
            alt=""
            width={80}
            height={80}
            unoptimized
            style={{ display: "block", objectFit: "contain", transform: "scaleX(-1)" }}
          />

          {/* Text card — anchored to beak (left side, ~36px from top) */}
          <span style={{
            position: "absolute",
            right: 86,
            top: 10,
            background: "rgba(253,248,234,0.96)",
            border: "1.5px solid rgba(160,130,60,0.35)",
            borderRadius: 14,
            boxShadow: "0 6px 24px rgba(40,28,6,0.2)",
            padding: "8px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            textAlign: "right",
            backdropFilter: "blur(6px)",
            whiteSpace: "nowrap",
          }}>
            {/* right-pointing triangle toward beak */}
            <span aria-hidden style={{
              position: "absolute",
              right: -7,
              top: "50%",
              transform: "translateY(-50%)",
              width: 0,
              height: 0,
              borderTop: "6px solid transparent",
              borderBottom: "6px solid transparent",
              borderLeft: "7px solid rgba(253,248,234,0.96)",
            }} />
            <span style={{
              fontSize: 12,
              fontWeight: 800,
              color: "#3a2a08",
              fontFamily: "system-ui, sans-serif",
              lineHeight: 1.3,
            }}>
              7 хоногийн тест
            </span>
            <span style={{
              fontSize: 11,
              color: "#8a6a28",
              fontFamily: "system-ui, sans-serif",
              lineHeight: 1.35,
            }}>
              Дарж тест өгөөрэй 🌿
            </span>
          </span>

          {/* Pulse dot */}
          <span
            aria-hidden
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              width: 11,
              height: 11,
              borderRadius: "50%",
              background: "#e8a84a",
              border: "2px solid #fff",
              animation: "checkin-pulse 1.6s ease-out infinite",
            }}
          />
        </span>
      </button>

      {/* Dialog */}
      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(22,19,11,0.52)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflowY: "auto",
            padding: "24px 0",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
        >
          <div
            style={{
              background: "rgba(253,248,238,0.97)",
              borderRadius: 24,
              padding: "36px 40px",
              width: "min(580px, 92vw)",
              boxShadow: "0 40px 100px rgba(20,16,8,0.42)",
              animation: "garden-panel-pop 0.2s ease",
              position: "relative",
            }}
          >
            <button
              type="button"
              onClick={dismiss}
              style={{
                position: "absolute",
                top: 16,
                right: 18,
                background: "none",
                border: "none",
                fontSize: 20,
                color: "#8a7a5a",
                cursor: "pointer",
                lineHeight: 1,
              }}
            >
              ×
            </button>

            {submitted ? (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <div style={{ fontSize: 44, marginBottom: 14 }}>🌿</div>
                <p style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: 21,
                  color: "#2c2516",
                }}>
                  Баярлалаа. Долоо хоногийн дараа уулзая.
                </p>
              </div>
            ) : (
              <>
                <h2 style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: 22,
                  fontWeight: 600,
                  color: "#2c2516",
                  marginBottom: 6,
                }}>
                  7 хоногийн тест
                </h2>
                <p style={{ fontSize: 13, color: "#8a7a5a", marginBottom: 28 }}>
                  Долоо хоног тутам нэг удаа.
                </p>
                <EQTestStepper
                  questions={ONBOARDING_QUESTIONS}
                  onSubmit={handleSubmit}
                  submitLabel="Дуусгах"
                />
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
