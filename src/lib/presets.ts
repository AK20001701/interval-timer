import type { IntervalPreset, IntervalPhase } from "./types";
import { cleanSec } from "./format";

export const BUILTIN_PRESETS: IntervalPreset[] = [
  {
    id: "preset-7-2",
    name: "Slow 7·2",
    description: "Two phases of 7s and 2s. Calm, deliberate rhythm.",
    phases: [
      { name: "Phase 1", duration: 7, intent: "grow" },
      { name: "Phase 2", duration: 2, intent: "shrink" },
    ],
    duration: 60,
    builtIn: true,
    accent: "#60a5fa",
  },
  {
    id: "preset-1-1",
    name: "Quick 1·1",
    description: "Two phases of 1s each. Fast, focusing cadence.",
    phases: [
      { name: "Phase 1", duration: 1, intent: "grow" },
      { name: "Phase 2", duration: 1, intent: "shrink" },
    ],
    duration: 60,
    builtIn: true,
    accent: "#f0abfc",
  },
];

const STORAGE_KEY = "pulse:intervals:v1";

type LegacyPreset = {
  id: string;
  name?: string;
  description?: string;
  inhale?: number;
  exhale?: number;
  holdAfterInhale?: number;
  holdAfterExhale?: number;
  duration?: number;
  accent?: string;
  builtIn?: boolean;
  phases?: IntervalPhase[];
  mode?: "time" | "rounds";
  rounds?: number;
  sets?: number;
  restSeconds?: number;
};

function migrate(raw: LegacyPreset): IntervalPreset | null {
  if (!raw || typeof raw !== "object" || !raw.id) return null;
  if (Array.isArray(raw.phases) && raw.phases.length > 0) {
    const phases = raw.phases.map((p) => ({
      name: p.name ?? "Phase",
      duration: cleanSec(p.duration, 0),
      intent: p.intent ?? "steady",
      color: p.color,
    }));
    const cycleSeconds = phases.reduce((s, p) => s + p.duration, 0);
    const mode = raw.mode === "rounds" ? "rounds" : "time";
    const rounds =
      mode === "rounds" ? Math.max(1, Math.round(Number(raw.rounds) || 1)) : undefined;
    const sets =
      mode === "rounds" ? Math.max(1, Math.round(Number(raw.sets) || 1)) : undefined;
    const restSeconds =
      mode === "rounds" && (sets ?? 1) > 1 ? cleanSec(raw.restSeconds, 0) : undefined;
    const duration =
      mode === "rounds"
        ? Math.max(
            1,
            cycleSeconds * (rounds ?? 1) * (sets ?? 1) +
              (restSeconds ?? 0) * Math.max(0, (sets ?? 1) - 1),
          )
        : Math.max(1, Number(raw.duration) || 60);
    return {
      id: raw.id,
      name: raw.name ?? "Interval",
      description: raw.description,
      phases,
      duration,
      mode,
      rounds,
      sets,
      restSeconds,
      accent: raw.accent,
      builtIn: raw.builtIn,
    };
  }
  // Legacy in/out/hold shape
  const phases: IntervalPhase[] = [];
  if (raw.inhale && raw.inhale > 0)
    phases.push({ name: "Phase 1", duration: raw.inhale, intent: "grow" });
  if (raw.holdAfterInhale && raw.holdAfterInhale > 0)
    phases.push({
      name: "Hold",
      duration: raw.holdAfterInhale,
      intent: "hold-large",
    });
  if (raw.exhale && raw.exhale > 0)
    phases.push({ name: "Phase 2", duration: raw.exhale, intent: "shrink" });
  if (raw.holdAfterExhale && raw.holdAfterExhale > 0)
    phases.push({
      name: "Rest",
      duration: raw.holdAfterExhale,
      intent: "hold-small",
    });
  if (phases.length === 0) return null;
  return {
    id: raw.id,
    name: raw.name ?? "Interval",
    description: raw.description,
    phases,
    duration: Math.max(1, Number(raw.duration) || 60),
    accent: raw.accent,
    builtIn: raw.builtIn,
  };
}

export function loadCustomPresets(): IntervalPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const rawStr = window.localStorage.getItem(STORAGE_KEY);
    if (!rawStr) return [];
    const parsed = JSON.parse(rawStr) as LegacyPreset[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(migrate)
      .filter((p): p is IntervalPreset => p !== null);
  } catch {
    return [];
  }
}

export function saveCustomPresets(items: IntervalPreset[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}
