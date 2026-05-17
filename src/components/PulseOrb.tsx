"use client";

import type { PhaseIntent } from "@/lib/types";

type Props = {
  intent: PhaseIntent | null;
  phaseName: string;
  /** 0..1 progress within the current phase */
  phaseProgress: number;
  phaseRemainingLabel: string;
  totalRemainingLabel: string;
  accent?: string;
  state: "idle" | "running" | "paused" | "finished";
  /**
   * Counter that increments every time the active phase changes. Used as a
   * React `key` so the flash + banner remount and replay their animation.
   */
  phaseChangeKey?: number;
};

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function scaleFor(intent: PhaseIntent | null, t: number): number {
  switch (intent) {
    case "grow":
      return 0.6 + 0.4 * easeInOut(t);
    case "shrink":
      return 1.0 - 0.4 * easeInOut(t);
    case "hold-large":
      return 1.0;
    case "hold-small":
      return 0.6;
    case "steady":
      return 0.82;
    default:
      return 0.78;
  }
}

export default function PulseOrb({
  intent,
  phaseName,
  phaseProgress,
  phaseRemainingLabel,
  totalRemainingLabel,
  accent = "#a78bfa",
  state,
  phaseChangeKey = 0,
}: Props) {
  const scale = scaleFor(intent, Math.min(1, Math.max(0, phaseProgress)));

  return (
    <div className="relative mx-auto flex aspect-square w-full max-w-[min(82vw,520px)] items-center justify-center">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(closest-side, ${accent}33, transparent 70%)`,
          transform: `scale(${0.9 + scale * 0.2})`,
          transition: "transform 600ms cubic-bezier(.4,0,.2,1)",
        }}
      />
      {state === "running" && (
        <>
          <span
            className="absolute inset-6 rounded-full border"
            style={{
              borderColor: `${accent}55`,
              animation: "pulse-ring 3.5s ease-out infinite",
            }}
          />
          <span
            className="absolute inset-6 rounded-full border"
            style={{
              borderColor: `${accent}33`,
              animation: "pulse-ring 3.5s ease-out infinite",
              animationDelay: "1.5s",
            }}
          />
        </>
      )}

      {/* Phase-change burst — remounts on every phase transition via key */}
      {state === "running" && phaseChangeKey > 0 && (
        <>
          <span
            key={`flash-a-${phaseChangeKey}`}
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(closest-side, ${accent}88, transparent 65%)`,
              animation: "phase-flash 900ms cubic-bezier(.2,.7,.2,1) forwards",
            }}
          />
          <span
            key={`flash-b-${phaseChangeKey}`}
            aria-hidden
            className="pointer-events-none absolute inset-8 rounded-full border-2"
            style={{
              borderColor: `${accent}aa`,
              animation: "phase-flash 1100ms cubic-bezier(.2,.7,.2,1) forwards",
            }}
          />
        </>
      )}

      <div
        className="relative aspect-square w-[78%] rounded-full will-change-transform"
        style={{
          transform: `scale(${scale})`,
          transition: "transform 240ms linear",
          // Two layered backgrounds: a translucent shaded radial on top
          // (depth + highlight) and a fully opaque accent disc underneath
          // so particles never bleed through the orb body. Only the very
          // outer few percent feather to transparent for a soft edge.
          background: `
            radial-gradient(circle at 32% 28%, rgba(255,255,255,0.75), ${accent}cc 38%, ${accent}66 60%, ${accent}22 80%, transparent 100%),
            radial-gradient(circle, ${accent} 0%, ${accent} 90%, ${accent}cc 96%, transparent 100%)
          `,
          boxShadow: `0 30px 120px ${accent}55, inset 0 -20px 60px rgba(0,0,0,0.25), inset 0 20px 60px rgba(255,255,255,0.15)`,
        }}
      >
        <div
          className="absolute inset-0 rounded-full mix-blend-screen"
          style={{
            background:
              "radial-gradient(120% 80% at 30% 20%, rgba(255,255,255,0.45), transparent 55%)",
          }}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <div
          key={`name-${phaseChangeKey}`}
          className="max-w-[80%] truncate text-xs uppercase tracking-[0.28em] text-white/75"
          style={
            state === "running" && phaseChangeKey > 0
              ? {
                  animation:
                    "phase-banner 1100ms cubic-bezier(.2,.7,.2,1) forwards",
                  textShadow: `0 0 18px ${accent}88`,
                }
              : undefined
          }
        >
          {state === "finished" ? "Complete" : phaseName || "Ready"}
        </div>
        <div className="tabular mt-2 text-6xl font-light text-white drop-shadow-[0_2px_30px_rgba(0,0,0,0.4)] sm:text-7xl">
          {state === "finished" ? "—" : phaseRemainingLabel}
        </div>
        <div className="tabular mt-3 text-sm text-white/55">
          {totalRemainingLabel} left
        </div>
      </div>
    </div>
  );
}
