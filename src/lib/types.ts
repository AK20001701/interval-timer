/**
 * How the orb / animation behaves during a phase.
 *  - grow:        expand from small → large
 *  - shrink:      contract from large → small
 *  - hold-large:  stay expanded
 *  - hold-small:  stay contracted
 *  - steady:      mid-size, no movement (good for plain timer phases)
 */
export type PhaseIntent = "grow" | "shrink" | "hold-large" | "hold-small" | "steady";

export type IntervalPhase = {
  /** Free-form label shown to the user, e.g. "Work", "Rest", "7s" */
  name: string;
  /** Duration in seconds */
  duration: number;
  /** Visual intent */
  intent?: PhaseIntent;
  /** Optional color accent, overrides preset accent on this phase */
  color?: string;
};

/**
 * How a session ends.
 *  - "time":   stop after `duration` seconds have elapsed (loops phases until time is up).
 *  - "rounds": stop after `rounds` complete cycles of the phase sequence.
 */
export type SessionMode = "time" | "rounds";

export type IntervalPreset = {
  id: string;
  name: string;
  description?: string;
  /** Ordered list of phases that make up one cycle. Length ≥ 1. */
  phases: IntervalPhase[];
  /**
   * Total session duration in seconds. Always populated — when `mode` is
   * "rounds" this is kept in sync with `rounds * cycleSeconds` so existing
   * UI that reads `duration` still has something sensible to display.
   */
  duration: number;
  /** Stop condition. Defaults to "time" when omitted (back-compat). */
  mode?: SessionMode;
  /**
   * Rounds per set, only used when `mode === "rounds"`. Min 1.
   * A "round" is one full pass through the phase sequence.
   */
  rounds?: number;
  /**
   * Number of sets (groups of rounds). Default 1. When > 1 a rest segment
   * of `restSeconds` is inserted between consecutive sets (never after the
   * last set). Only meaningful when `mode === "rounds"`.
   */
  sets?: number;
  /**
   * Rest seconds between sets. Ignored when `sets <= 1` or `mode !== "rounds"`.
   * Free-form decimal value (e.g. 0.1, 0.5, 30, 60.25).
   */
  restSeconds?: number;
  /** Built-in preset (cannot be deleted) */
  builtIn?: boolean;
  /** Color accent for cards / orb */
  accent?: string;
};

export type PhaseStep = {
  index: number;
  name: string;
  duration: number;
  intent: PhaseIntent;
  color?: string;
};
