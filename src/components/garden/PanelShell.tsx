// ============================================
//  PanelShell.tsx
//
//  Shared chrome for every garden overlay (Pond, Memory Tree,
//  Botanist's Desk, Workshop): a full-bleed painted scene with a
//  back button + title floating over it, an optional pinned-note
//  caption, and a translucent "paper" sheet docked to the bottom
//  edge that holds the panel's actual content plus the three states
//  every list-based panel needs — loading, error, empty.
//
//  Pulling this out means each panel file only supplies its title,
//  its data-specific rows, and its own empty-state copy — not four
//  copies of the same "if loading show X, if error show Y" branches
//  or the same scene/back-button/scrim markup.
// ============================================

"use client";

import Image from "next/image";
import type { ReactNode } from "react";

export function PanelShell({
  title,
  subtitle,
  banner,
  note,
  onClose,
  loading,
  error,
  empty,
  emptyLabel,
  children,
  headerExtra,
  overlay,
}: {
  title: string;
  subtitle?: string;
  /** Path to the full-bleed painted scene for this panel (e.g. "/garden/pond-zoomed.png") */
  banner: string;
  /** Short pinned-note caption shown like a tucked-away note over the scene */
  note?: string;
  onClose: () => void;
  loading?: boolean;
  error?: string;
  empty?: boolean;
  emptyLabel?: string;
  children?: ReactNode;
  headerExtra?: ReactNode;
  /** Free-floating content placed directly over the banner art (e.g. tags scattered on a tree), instead of the bottom paper sheet */
  overlay?: ReactNode;
}) {
  const hasSheetContent = loading || error || empty || children;
  return (
    <>
      <div className="garden-scene-panel-backdrop" onClick={onClose} aria-hidden />
      <div className="garden-scene-panel" role="dialog" aria-label={title}>
      <Image src={banner} alt="" fill priority sizes="(max-width: 900px) 100vw, 880px" style={{ objectFit: "cover" }} />
      <div className="garden-scene-panel-scrim" />

      {overlay && !loading && !error && !empty && (
        <div className="garden-scene-panel-overlay">{overlay}</div>
      )}

      <div className="garden-scene-panel-back">
        <button type="button" className="garden-scene-panel-back-btn" onClick={onClose} aria-label="Back to garden">
          ‹
        </button>
        <div>
          <h2 className="garden-scene-panel-title">{title}</h2>
          {subtitle && <p className="garden-scene-panel-sub">{subtitle}</p>}
        </div>
      </div>

      {note && (
        <p className="garden-scene-panel-note">
          <span className="pin" aria-hidden />
          {note}
        </p>
      )}

      {(hasSheetContent || !overlay) && (
        <div className="garden-scene-panel-sheet">
          {headerExtra}
          {loading && <p className="garden-empty">Loading…</p>}
          {error && <p className="garden-empty">Something went wrong — {error}</p>}
          {!loading && !error && empty && <p className="garden-empty">{emptyLabel}</p>}
          {!loading && !error && !empty && children}
        </div>
      )}
      </div>
    </>
  );
}
