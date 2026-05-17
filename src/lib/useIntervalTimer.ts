"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { IntervalPreset, PhaseIntent, PhaseStep } from "./types";
import { haptic } from "./haptics";

export type TimerState = "idle" | "running" | "paused" | "finished";

/**
 * Logical "scene" the user is in at a given moment. We track the scene
 * key so that haptics fire on any transition (phase → phase, work → rest,
 * rest → work) and never duplicate while inside the same scene.
 */
type SceneKey = string;

/**
 * If a phase has no explicit intent, alternate grow/shrink based on its
 * index so an N-phase loop still produces pleasant motion.
 */
function defaultIntent(index: number, total: number): PhaseIntent {
  if (total <= 1) return "steady";
  return index % 2 === 0 ? "grow" : "shrink";
}

export function buildSteps(preset: IntervalPreset): PhaseStep[] {
  return preset.phases
    .filter((p) => p.duration > 0)
    .map((p, i, arr) => ({
      index: i,
      name: p.name,
      duration: p.duration,
      intent: p.intent ?? defaultIntent(i, arr.length),
      color: p.color,
    }));
}

type Options = {
  hapticsEnabled: boolean;
  onFinish?: () => void;
};

export function useIntervalTimer(
  preset: IntervalPreset | null,
  { hapticsEnabled, onFinish }: Options,
) {
  const [state, setState] = useState<TimerState>("idle");
  const [elapsed, setElapsed] = useState(0); // total elapsed seconds (float)
  const [phaseElapsed, setPhaseElapsed] = useState(0); // elapsed within current phase
  const [stepIndex, setStepIndex] = useState(0);
  const [inRest, setInRest] = useState(false);
  const [restElapsedState, setRestElapsedState] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [currentRoundState, setCurrentRoundState] = useState(1);

  const steps = useMemo(() => (preset ? buildSteps(preset) : []), [preset]);
  const cycleSeconds = useMemo(
    () => steps.reduce((s, p) => s + p.duration, 0),
    [steps],
  );

  // ---------------------------------------------------------------------
  // Session shape
  //
  // Time mode:    elapsed loops modulo `cycleSeconds`, stops at `duration`.
  // Rounds mode:  schedule is `sets` blocks of (`rounds` cycles), with a
  //               `restSeconds` rest between consecutive sets (never after
  //               the last set). Single set + zero rest collapses to the
  //               simple rounds case.
  // ---------------------------------------------------------------------
  const isRounds = preset?.mode === "rounds";
  const totalRounds = isRounds ? Math.max(1, preset?.rounds ?? 1) : 0;
  const totalSets = isRounds ? Math.max(1, preset?.sets ?? 1) : 1;
  const restDuration =
    isRounds && totalSets > 1 ? Math.max(0, preset?.restSeconds ?? 0) : 0;
  const setLength = isRounds ? cycleSeconds * totalRounds : 0;

  const targetSeconds = useMemo(() => {
    if (!preset) return 0;
    if (isRounds) {
      return Math.max(1, setLength * totalSets + restDuration * (totalSets - 1));
    }
    return Math.max(1, preset.duration);
  }, [preset, isRounds, setLength, totalSets, restDuration]);

  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0); // perf time when current run-segment started
  const baseElapsedRef = useRef<number>(0); // elapsed accumulated before this segment
  const lastSceneRef = useRef<SceneKey | null>(null);

  /**
   * Resolve where we are inside the session at `t` seconds elapsed.
   * Pure function of the schedule — no React state involved.
   */
  const positionAt = useCallback(
    (t: number) => {
      if (cycleSeconds <= 0) {
        return {
          inRest: false,
          setIndex: 0,
          roundInSet: 1,
          phaseIdx: 0,
          phaseInPos: 0,
          restElapsed: 0,
        };
      }
      if (!isRounds) {
        const cyclePos = t % cycleSeconds;
        const { phaseIdx, phaseInPos } = phaseAt(cyclePos, steps);
        return {
          inRest: false,
          setIndex: 0,
          roundInSet: 1,
          phaseIdx,
          phaseInPos,
          restElapsed: 0,
        };
      }
      let remaining = t;
      for (let s = 0; s < totalSets; s++) {
        if (remaining < setLength) {
          const roundInSet = Math.min(
            totalRounds,
            Math.floor(remaining / cycleSeconds) + 1,
          );
          const cyclePos = remaining % cycleSeconds;
          const { phaseIdx, phaseInPos } = phaseAt(cyclePos, steps);
          return {
            inRest: false,
            setIndex: s,
            roundInSet,
            phaseIdx,
            phaseInPos,
            restElapsed: 0,
          };
        }
        remaining -= setLength;
        if (s < totalSets - 1 && restDuration > 0) {
          if (remaining < restDuration) {
            return {
              inRest: true,
              setIndex: s,
              roundInSet: totalRounds,
              phaseIdx: 0,
              phaseInPos: 0,
              restElapsed: remaining,
            };
          }
          remaining -= restDuration;
        }
      }
      // Past the end — clamp to last possible state for tidy display.
      const { phaseIdx, phaseInPos } = phaseAt(
        Math.max(0, cycleSeconds - 0.0001),
        steps,
      );
      return {
        inRest: false,
        setIndex: totalSets - 1,
        roundInSet: totalRounds,
        phaseIdx,
        phaseInPos,
        restElapsed: 0,
      };
    },
    [cycleSeconds, isRounds, steps, totalSets, totalRounds, setLength, restDuration],
  );

  const stop = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const reset = useCallback(() => {
    stop();
    setState("idle");
    setElapsed(0);
    setPhaseElapsed(0);
    setStepIndex(0);
    setInRest(false);
    setRestElapsedState(0);
    setCurrentSet(1);
    setCurrentRoundState(1);
    baseElapsedRef.current = 0;
    lastSceneRef.current = null;
  }, [stop]);

  // Reset when preset changes
  useEffect(() => {
    reset();
  }, [preset?.id, reset]);

  const tick = useCallback(() => {
    if (!preset || cycleSeconds === 0) return;
    const now = performance.now();
    const segmentElapsed = (now - startedAtRef.current) / 1000;
    const total = baseElapsedRef.current + segmentElapsed;
    const clamped = Math.min(total, targetSeconds);
    setElapsed(clamped);

    const pos = positionAt(clamped);
    setStepIndex(pos.phaseIdx);
    setPhaseElapsed(pos.inRest ? 0 : pos.phaseInPos);
    setInRest(pos.inRest);
    setRestElapsedState(pos.restElapsed);
    setCurrentSet(pos.setIndex + 1);
    setCurrentRoundState(pos.roundInSet);

    // Scene key encodes everything that should trigger a haptic on change:
    // set index + rest/work + phase intent.
    const scene: SceneKey = pos.inRest
      ? `rest:${pos.setIndex}`
      : `work:${pos.setIndex}:${steps[pos.phaseIdx]?.intent ?? "steady"}`;
    if (
      lastSceneRef.current !== null &&
      scene !== lastSceneRef.current &&
      hapticsEnabled
    ) {
      if (pos.inRest) haptic("strong");
      else if (lastSceneRef.current.startsWith("rest:")) haptic("strong");
      else {
        const intent = steps[pos.phaseIdx]?.intent ?? null;
        if (intent === "grow") haptic("soft");
        else haptic("tick");
      }
    }
    lastSceneRef.current = scene;

    if (clamped >= targetSeconds) {
      stop();
      setState("finished");
      if (hapticsEnabled) haptic("success");
      onFinish?.();
      return;
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [preset, cycleSeconds, steps, targetSeconds, positionAt, hapticsEnabled, stop, onFinish]);

  const start = useCallback(() => {
    if (!preset || cycleSeconds === 0) return;
    if (state === "finished") {
      baseElapsedRef.current = 0;
      setElapsed(0);
      setPhaseElapsed(0);
      setStepIndex(0);
      setInRest(false);
      setRestElapsedState(0);
      setCurrentSet(1);
      setCurrentRoundState(1);
      lastSceneRef.current = null;
    }
    setState("running");
    startedAtRef.current = performance.now();
    if (hapticsEnabled) haptic("strong");
    // Seed the scene key with the starting phase so the first transition
    // (after one full phase elapses) fires a haptic but the initial render
    // does not.
    lastSceneRef.current = `work:0:${steps[0]?.intent ?? "steady"}`;
    rafRef.current = requestAnimationFrame(tick);
  }, [preset, cycleSeconds, state, steps, hapticsEnabled, tick]);

  const pause = useCallback(() => {
    if (state !== "running") return;
    stop();
    baseElapsedRef.current += (performance.now() - startedAtRef.current) / 1000;
    setState("paused");
    if (hapticsEnabled) haptic("soft");
  }, [state, stop, hapticsEnabled]);

  const resume = useCallback(() => {
    if (state !== "paused") return;
    setState("running");
    startedAtRef.current = performance.now();
    if (hapticsEnabled) haptic("soft");
    rafRef.current = requestAnimationFrame(tick);
  }, [state, hapticsEnabled, tick]);

  // Pause when tab hidden to keep things accurate / not waste battery
  useEffect(() => {
    function onVisibility() {
      if (document.hidden && state === "running") {
        pause();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [state, pause]);

  useEffect(() => () => stop(), [stop]);

  const step: PhaseStep | null = steps[stepIndex] ?? null;
  const phaseDuration = steps[stepIndex]?.duration ?? 0;
  const phaseProgress =
    !inRest && phaseDuration > 0 ? phaseElapsed / phaseDuration : 0;
  const totalProgress = targetSeconds > 0 ? elapsed / targetSeconds : 0;
  const remaining = Math.max(0, targetSeconds - elapsed);
  const restRemaining = inRest ? Math.max(0, restDuration - restElapsedState) : 0;
  const restProgress =
    inRest && restDuration > 0 ? restElapsedState / restDuration : 0;

  return {
    state,
    start,
    pause,
    resume,
    reset,
    elapsed,
    remaining,
    totalProgress,
    step,
    stepIndex,
    phaseProgress,
    phaseElapsed,
    phaseDuration,
    steps,
    cycleSeconds,
    targetSeconds,
    isRounds,
    currentRound: currentRoundState,
    totalRounds,
    currentSet,
    totalSets,
    inRest,
    restElapsed: restElapsedState,
    restRemaining,
    restDuration,
    restProgress,
  };
}

/**
 * Find which phase in `steps` covers the given offset (0 <= pos < cycle).
 * Returns the phase index and the elapsed time within that phase. Pure.
 */
function phaseAt(
  pos: number,
  steps: PhaseStep[],
): { phaseIdx: number; phaseInPos: number } {
  let acc = 0;
  let phaseIdx = 0;
  let phaseInPos = 0;
  for (let i = 0; i < steps.length; i++) {
    const d = steps[i].duration;
    if (pos < acc + d) {
      return { phaseIdx: i, phaseInPos: pos - acc };
    }
    acc += d;
    phaseIdx = i;
    phaseInPos = d;
  }
  return { phaseIdx, phaseInPos };
}
