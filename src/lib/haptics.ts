/**
 * Lightweight haptic helpers.
 *
 * iOS Safari does NOT support the Web Vibration API. The only reliable way to
 * trigger haptic feedback in Mobile Safari is `<label switchControl>` /
 * `<input type="checkbox" switch>` style controls, or via an installed PWA
 * that uses the experimental `window.navigator.vibrate` (Android only) or the
 * upcoming AudioContext-driven trick. We use a small, safe combo:
 *
 *   1. `navigator.vibrate` when available (Android, some desktops).
 *   2. A tiny silent AudioContext "tick" as a fallback so iOS users still get
 *      an audible cue when the phase changes (works as a pseudo-haptic).
 *
 * The user can fully disable feedback from the UI.
 */

import { readSound } from "@/lib/settings";

type HapticKind = "tick" | "soft" | "strong" | "success";

const PATTERNS: Record<HapticKind, number | number[]> = {
  tick: 10,
  soft: 18,
  strong: [22, 30, 22],
  success: [10, 40, 10, 40, 10],
};

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    type WindowWithWebkit = Window & {
      webkitAudioContext?: typeof AudioContext;
    };
    const w = window as WindowWithWebkit;
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) return null;
    if (!audioCtx) audioCtx = new Ctor();
    return audioCtx;
  } catch {
    return null;
  }
}

/** Must be called from a user gesture to unlock audio on iOS. */
export function unlockHaptics() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    void ctx.resume().catch(() => {});
  }
}

function clickTone(frequency: number, duration: number, gain = 0.04) {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(gain, ctx.currentTime + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(g).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
  } catch {
    /* ignore */
  }
}

export function haptic(kind: HapticKind = "tick") {
  if (typeof window === "undefined") return;

  // Native vibration (Android / some desktops)
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(PATTERNS[kind]);
    }
  } catch {
    /* ignore */
  }

  // Audio fallback so iOS users feel/hear a cue. Skipped entirely when the
  // user has disabled sound in Settings.
  if (!readSound()) return;
  switch (kind) {
    case "tick":
      clickTone(880, 0.06, 0.025);
      break;
    case "soft":
      clickTone(660, 0.08, 0.035);
      break;
    case "strong":
      clickTone(520, 0.09, 0.05);
      setTimeout(() => clickTone(420, 0.09, 0.05), 70);
      break;
    case "success":
      clickTone(660, 0.08, 0.04);
      setTimeout(() => clickTone(880, 0.1, 0.04), 90);
      break;
  }
}

export function isVibrateSupported(): boolean {
  if (typeof navigator === "undefined") return false;
  return "vibrate" in navigator;
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (platform === "MacIntel" && (navigator.maxTouchPoints || 0) > 1)
  );
}
