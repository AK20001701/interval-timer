"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { IntervalPreset } from "@/lib/types";
import { useIntervalTimer } from "@/lib/useIntervalTimer";
import PulseOrb from "./PulseOrb";
import ParticleField from "./ParticleField";
import type { PhaseStep } from "@/lib/types";
import { unlockHaptics } from "@/lib/haptics";
import { fmtPhaseRemaining, fmtSecLabel } from "@/lib/format";

type Props = {
  preset: IntervalPreset;
  hapticsEnabled: boolean;
  onClose: () => void;
};

function fmtTime(seconds: number): string {
  const total = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function TimerView({ preset, hapticsEnabled, onClose }: Props) {
  const timer = useIntervalTimer(preset, { hapticsEnabled });

  // Auto-start when entering the view, but only once (and only via gesture path).
  // We don't auto-start here so the first tap unlocks audio for haptic fallback.

  // During rest we drive the orb / particles from rest progress and pin a
  // distinct, calm color so the user instantly recognises the rest interval
  // without reading text.
  const REST_COLOR = "#64748b"; // slate-500
  const inRest = timer.inRest;

  const phaseRemaining = inRest
    ? timer.restRemaining
    : Math.max(0, timer.phaseDuration - timer.phaseElapsed);
  const phaseRemainingDuration = inRest
    ? timer.restDuration
    : timer.phaseDuration;
  const phaseRemainingLabel = fmtPhaseRemaining(
    phaseRemaining,
    phaseRemainingDuration,
  );
  const totalRemainingLabel = fmtTime(timer.remaining);

  const stepAccent = timer.step?.color ?? preset.accent ?? "#a78bfa";
  const accent = inRest ? REST_COLOR : stepAccent;
  const intent = inRest ? "hold-small" : timer.step?.intent ?? null;
  const intensity = useMemo(() => {
    if (timer.state !== "running") return 0.18;
    if (inRest) return 0.22;
    if (intent === "grow") return 0.55 + timer.phaseProgress * 0.4;
    if (intent === "shrink") return 0.55 - timer.phaseProgress * 0.25;
    if (intent === "hold-large") return 0.7;
    if (intent === "hold-small") return 0.35;
    return 0.5;
  }, [timer.state, intent, timer.phaseProgress, inRest]);

  // Phase change key — increments every time we cross into a new step
  // while running. Used by PulseOrb to retrigger its burst animations.
  const [phaseChangeKey, setPhaseChangeKey] = useState(0);
  const lastStepRef = useRef<number>(timer.stepIndex);
  useEffect(() => {
    if (timer.state !== "running") {
      lastStepRef.current = timer.stepIndex;
      return;
    }
    if (timer.stepIndex !== lastStepRef.current) {
      lastStepRef.current = timer.stepIndex;
      setPhaseChangeKey((k) => k + 1);
    }
  }, [timer.stepIndex, timer.state]);

  // Keep screen awake while running (best-effort)
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    type NavWithWake = Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinel> };
    };
    async function acquire() {
      try {
        const nav = navigator as NavWithWake;
        if (timer.state === "running" && nav.wakeLock?.request) {
          lock = await nav.wakeLock.request("screen");
          if (cancelled && lock) await lock.release().catch(() => {});
        }
      } catch {
        /* ignore */
      }
    }
    acquire();
    return () => {
      cancelled = true;
      if (lock) lock.release().catch(() => {});
    };
  }, [timer.state]);

  return (
    <div className="relative flex min-h-[100dvh] flex-col">
      <ParticleField intensity={intensity} color={accent} intent={intent} />

      <header className="safe-top relative z-10 flex items-center justify-between px-5 py-3">
        <button
          type="button"
          onClick={() => {
            timer.reset();
            onClose();
          }}
          className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-sm text-white/80 backdrop-blur transition-colors hover:bg-white/10"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back
        </button>
        <div className="text-center">
          <div className="text-xs uppercase tracking-[0.28em] text-white/45">
            {preset.name}
          </div>
          {timer.isRounds && (
            <div className="tabular mt-0.5 text-[11px] text-white/65">
              {timer.totalSets > 1 && (
                <>
                  Set {timer.currentSet} / {timer.totalSets}
                  <span className="mx-1.5 text-white/30">·</span>
                </>
              )}
              {inRest ? (
                <span className="text-white/85">Rest</span>
              ) : (
                <>
                  Round {timer.currentRound} / {timer.totalRounds}
                </>
              )}
            </div>
          )}
        </div>
        <div className="w-[64px]" />
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6">
        <PulseOrb
          intent={intent}
          phaseName={inRest ? "Rest" : timer.step?.name ?? ""}
          phaseProgress={inRest ? timer.restProgress : timer.phaseProgress}
          phaseRemainingLabel={phaseRemainingLabel}
          totalRemainingLabel={totalRemainingLabel}
          accent={accent}
          state={timer.state}
          phaseChangeKey={phaseChangeKey}
        />

        {/* Cycle visualisation */}
        <CycleStrip
          steps={timer.steps}
          activeIndex={timer.stepIndex}
          accent={inRest ? REST_COLOR : stepAccent}
          dim={inRest}
        />

        {/* Total progress */}
        <div className="mt-6 w-full max-w-md">
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-[width] duration-200 ease-linear"
              style={{
                width: `${Math.min(100, timer.totalProgress * 100)}%`,
                background: `linear-gradient(90deg, ${accent}, #a78bfa)`,
                boxShadow: `0 0 20px ${accent}66`,
              }}
            />
          </div>
        </div>
      </main>

      <footer className="safe-bottom relative z-10 flex items-center justify-center gap-3 px-6 pt-4">
        {timer.state === "idle" || timer.state === "finished" ? (
          <PrimaryButton
            accent={accent}
            onClick={() => {
              unlockHaptics();
              timer.start();
            }}
          >
            <PlayIcon /> {timer.state === "finished" ? "Restart" : "Start"}
          </PrimaryButton>
        ) : timer.state === "running" ? (
          <>
            <SecondaryButton
              onClick={() => {
                timer.reset();
              }}
            >
              <ResetIcon /> Reset
            </SecondaryButton>
            <PrimaryButton accent={accent} onClick={timer.pause}>
              <PauseIcon /> Pause
            </PrimaryButton>
          </>
        ) : (
          <>
            <SecondaryButton
              onClick={() => {
                timer.reset();
              }}
            >
              <ResetIcon /> Reset
            </SecondaryButton>
            <PrimaryButton
              accent={accent}
              onClick={() => {
                unlockHaptics();
                timer.resume();
              }}
            >
              <PlayIcon /> Resume
            </PrimaryButton>
          </>
        )}
      </footer>
    </div>
  );
}

function CycleStrip({
  steps,
  activeIndex,
  accent,
  dim = false,
}: {
  steps: PhaseStep[];
  activeIndex: number;
  accent: string;
  /** When true (e.g. during rest), no phase is highlighted as active. */
  dim?: boolean;
}) {
  if (steps.length === 0) return null;
  const total = steps.reduce((s, x) => s + x.duration, 0);
  return (
    <div
      className={`mt-8 flex w-full max-w-md items-stretch gap-1 overflow-hidden transition-opacity duration-300 ${
        dim ? "opacity-45" : "opacity-100"
      }`}
    >
      {steps.map((s, i) => {
        const w = (s.duration / total) * 100;
        const active = !dim && i === activeIndex;
        const c = s.color ?? accent;
        return (
          <div
            key={i}
            className={`relative flex h-9 min-w-0 items-center justify-center overflow-hidden rounded-lg px-1 text-[10px] uppercase tracking-wider transition-all duration-300 ${
              active ? "text-white" : "text-white/55"
            }`}
            style={{
              flexBasis: `${w}%`,
              background: active
                ? `linear-gradient(180deg, ${c}55, ${c}22)`
                : "rgba(255,255,255,0.04)",
              border: active
                ? `1px solid ${c}88`
                : "1px solid rgba(255,255,255,0.06)",
              boxShadow: active ? `0 0 20px ${c}55` : undefined,
            }}
            title={`${s.name} · ${fmtSecLabel(s.duration)}`}
          >
            <span className="truncate">
              {s.name} · {fmtSecLabel(s.duration)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function PrimaryButton({
  accent,
  children,
  onClick,
}: {
  accent: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-w-[160px] items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-base font-medium text-white shadow-xl transition-transform active:scale-[0.97]"
      style={{
        background: `linear-gradient(135deg, ${accent}, #8b5cf6)`,
        boxShadow: `0 18px 40px -12px ${accent}aa, inset 0 1px 0 rgba(255,255,255,0.25)`,
      }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3.5 text-sm text-white/85 backdrop-blur transition-colors hover:bg-white/10"
    >
      {children}
    </button>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}
function ResetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  );
}
