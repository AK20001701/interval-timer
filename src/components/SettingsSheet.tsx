"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_PARTICLE_COUNT,
  DEFAULT_PARTICLE_INTENSITY,
  DEFAULT_PARTICLE_SPEED,
  DEFAULT_PARTICLE_TAIL,
  readHaptics,
  readParticleCount,
  readParticleIntensity,
  readParticleSpeed,
  readParticleTail,
  readSound,
  resetParticleSettings,
  writeHaptics,
  writeParticleCount,
  writeParticleIntensity,
  writeParticleSpeed,
  writeParticleTail,
  writeSound,
} from "@/lib/settings";
import { haptic, unlockHaptics } from "@/lib/haptics";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function SettingsSheet({ open, onClose }: Props) {
  const [intensity, setIntensity] = useState<number>(DEFAULT_PARTICLE_INTENSITY);
  const [speed, setSpeed] = useState<number>(DEFAULT_PARTICLE_SPEED);
  const [tail, setTail] = useState<number>(DEFAULT_PARTICLE_TAIL);
  const [count, setCount] = useState<number>(DEFAULT_PARTICLE_COUNT);
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  // Collapsed by default — the four particle sliders are advanced settings
  // and most users never need to touch them now that defaults are sensible.
  const [particlesOpen, setParticlesOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    setIntensity(readParticleIntensity());
    setSpeed(readParticleSpeed());
    setTail(readParticleTail());
    setCount(readParticleCount());
    setHapticsEnabled(readHaptics());
    setSoundEnabled(readSound());
  }, [open]);

  // Escape closes
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function onIntensityChange(v: number) {
    setIntensity(v);
    writeParticleIntensity(v);
  }

  function onSpeedChange(v: number) {
    setSpeed(v);
    writeParticleSpeed(v);
  }

  function onTailChange(v: number) {
    setTail(v);
    writeParticleTail(v);
  }

  function onCountChange(v: number) {
    setCount(v);
    writeParticleCount(v);
  }

  function onToggleHaptics() {
    unlockHaptics();
    const next = !hapticsEnabled;
    setHapticsEnabled(next);
    writeHaptics(next);
    if (next) haptic("success");
  }

  function onToggleSound() {
    unlockHaptics();
    const next = !soundEnabled;
    setSoundEnabled(next);
    writeSound(next);
    if (next) haptic("tick");
  }

  function onReset() {
    resetParticleSettings();
    setIntensity(DEFAULT_PARTICLE_INTENSITY);
    setSpeed(DEFAULT_PARTICLE_SPEED);
    setTail(DEFAULT_PARTICLE_TAIL);
    setCount(DEFAULT_PARTICLE_COUNT);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="glass-strong max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-3xl p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="settings-title" className="text-lg font-medium text-white">
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close settings"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Collapsible group for the four particle sliders. */}
        <button
          type="button"
          onClick={() => setParticlesOpen((v) => !v)}
          aria-expanded={particlesOpen}
          aria-controls="particles-group"
          className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition-colors hover:bg-white/[0.05]"
        >
          <div className="min-w-0">
            <div className="text-sm font-medium text-white">
              Background particles
            </div>
            <div className="mt-0.5 text-xs text-white/55">
              Tune intensity, speed, tail and count of the comet field.
            </div>
          </div>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`shrink-0 text-white/55 transition-transform ${
              particlesOpen ? "rotate-180" : ""
            }`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {particlesOpen && (
          <div id="particles-group" className="mt-3">
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-white">
                Particle intensity
              </div>
              <div className="mt-0.5 text-xs text-white/55">
                Brightness and density of the animated background.
              </div>
            </div>
            <PercentInput
              value={intensity}
              min={0}
              max={2}
              onChange={onIntensityChange}
              ariaLabel="Particle intensity percent"
            />
          </div>
          <input
            type="range"
            min={0}
            max={2}
            step={0.05}
            value={intensity}
            onChange={(e) => onIntensityChange(parseFloat(e.target.value))}
            className="w-full accent-violet-400"
            aria-label="Particle intensity"
          />
          <div className="mt-1 flex justify-between text-[10px] text-white/40">
            <span>Off</span>
            <span>Subtle</span>
            <span>Default</span>
            <span>Vivid</span>
          </div>
          <div className="mt-3 flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => onIntensityChange(0)}
              className="flex-1 rounded-lg bg-white/[0.05] py-1.5 text-white/70 transition-colors hover:bg-white/10"
            >
              Off
            </button>
            <button
              type="button"
              onClick={() => onIntensityChange(0.5)}
              className="flex-1 rounded-lg bg-white/[0.05] py-1.5 text-white/70 transition-colors hover:bg-white/10"
            >
              Subtle
            </button>
            <button
              type="button"
              onClick={() => onIntensityChange(1)}
              className="flex-1 rounded-lg bg-white/[0.05] py-1.5 text-white/70 transition-colors hover:bg-white/10"
            >
              Default
            </button>
            <button
              type="button"
              onClick={() => onIntensityChange(1.6)}
              className="flex-1 rounded-lg bg-white/[0.05] py-1.5 text-white/70 transition-colors hover:bg-white/10"
            >
              Vivid
            </button>
          </div>
        </section>

        <section className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-white">
                Particle speed
              </div>
              <div className="mt-0.5 text-xs text-white/55">
                How quickly particles drift across the screen.
              </div>
            </div>
            <PercentInput
              value={speed}
              min={0.1}
              max={3}
              onChange={onSpeedChange}
              ariaLabel="Particle speed percent"
            />
          </div>
          <input
            type="range"
            min={0.1}
            max={6}
            step={0.05}
            value={Math.min(speed, 6)}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="w-full accent-violet-400"
            aria-label="Particle speed"
          />
          <div className="mt-1 flex justify-between text-[10px] text-white/40">
            <span>Slow</span>
            <span>Calm</span>
            <span>Default</span>
            <span>Fast</span>
          </div>
          <div className="mt-3 flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => onSpeedChange(0.5)}
              className="flex-1 rounded-lg bg-white/[0.05] py-1.5 text-white/70 transition-colors hover:bg-white/10"
            >
              Slow
            </button>
            <button
              type="button"
              onClick={() => onSpeedChange(1)}
              className="flex-1 rounded-lg bg-white/[0.05] py-1.5 text-white/70 transition-colors hover:bg-white/10"
            >
              Calm
            </button>
            <button
              type="button"
              onClick={() => onSpeedChange(DEFAULT_PARTICLE_SPEED)}
              className="flex-1 rounded-lg bg-white/[0.05] py-1.5 text-white/70 transition-colors hover:bg-white/10"
            >
              Default
            </button>
            <button
              type="button"
              onClick={() => onSpeedChange(5)}
              className="flex-1 rounded-lg bg-white/[0.05] py-1.5 text-white/70 transition-colors hover:bg-white/10"
            >
              Fast
            </button>
          </div>
        </section>

        <section className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-white">
                Tail length
              </div>
              <div className="mt-0.5 text-xs text-white/55">
                How long the comet trail persists before fading.
              </div>
            </div>
            <PercentInput
              value={tail}
              min={0.1}
              max={3}
              onChange={onTailChange}
              ariaLabel="Tail length percent"
            />
          </div>
          <input
            type="range"
            min={0.1}
            max={6}
            step={0.05}
            value={Math.min(tail, 6)}
            onChange={(e) => onTailChange(parseFloat(e.target.value))}
            className="w-full accent-violet-400"
            aria-label="Tail length"
          />
          <div className="mt-1 flex justify-between text-[10px] text-white/40">
            <span>None</span>
            <span>Short</span>
            <span>Default</span>
            <span>Long</span>
          </div>
          <div className="mt-3 flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => onTailChange(0.1)}
              className="flex-1 rounded-lg bg-white/[0.05] py-1.5 text-white/70 transition-colors hover:bg-white/10"
            >
              None
            </button>
            <button
              type="button"
              onClick={() => onTailChange(1)}
              className="flex-1 rounded-lg bg-white/[0.05] py-1.5 text-white/70 transition-colors hover:bg-white/10"
            >
              Short
            </button>
            <button
              type="button"
              onClick={() => onTailChange(DEFAULT_PARTICLE_TAIL)}
              className="flex-1 rounded-lg bg-white/[0.05] py-1.5 text-white/70 transition-colors hover:bg-white/10"
            >
              Default
            </button>
            <button
              type="button"
              onClick={() => onTailChange(6)}
              className="flex-1 rounded-lg bg-white/[0.05] py-1.5 text-white/70 transition-colors hover:bg-white/10"
            >
              Long
            </button>
          </div>
        </section>

        <section className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-white">
                Particle count
              </div>
              <div className="mt-0.5 text-xs text-white/55">
                Number of particles drawn on screen.
              </div>
            </div>
            <PercentInput
              value={count}
              min={0}
              max={2.5}
              onChange={onCountChange}
              ariaLabel="Particle count percent"
            />
          </div>
          <input
            type="range"
            min={0}
            max={6}
            step={0.05}
            value={Math.min(count, 6)}
            onChange={(e) => onCountChange(parseFloat(e.target.value))}
            className="w-full accent-violet-400"
            aria-label="Particle count"
          />
          <div className="mt-1 flex justify-between text-[10px] text-white/40">
            <span>None</span>
            <span>Few</span>
            <span>Default</span>
            <span>Many</span>
          </div>
          <div className="mt-3 flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => onCountChange(0)}
              className="flex-1 rounded-lg bg-white/[0.05] py-1.5 text-white/70 transition-colors hover:bg-white/10"
            >
              None
            </button>
            <button
              type="button"
              onClick={() => onCountChange(1)}
              className="flex-1 rounded-lg bg-white/[0.05] py-1.5 text-white/70 transition-colors hover:bg-white/10"
            >
              Few
            </button>
            <button
              type="button"
              onClick={() => onCountChange(DEFAULT_PARTICLE_COUNT)}
              className="flex-1 rounded-lg bg-white/[0.05] py-1.5 text-white/70 transition-colors hover:bg-white/10"
            >
              Default
            </button>
            <button
              type="button"
              onClick={() => onCountChange(5)}
              className="flex-1 rounded-lg bg-white/[0.05] py-1.5 text-white/70 transition-colors hover:bg-white/10"
            >
              Many
            </button>
          </div>
        </section>
          </div>
        )}

        <section className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium text-white">
                Haptic feedback
              </div>
              <div className="mt-0.5 text-xs text-white/55">
                Vibrations on phase changes (Android / supported devices).
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={hapticsEnabled}
              onClick={onToggleHaptics}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                hapticsEnabled ? "bg-violet-400/70" : "bg-white/15"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                  hapticsEnabled ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </section>

        <section className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium text-white">Sound</div>
              <div className="mt-0.5 text-xs text-white/55">
                Audio cues when a phase begins.
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={soundEnabled}
              aria-label="Sound"
              onClick={onToggleSound}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                soundEnabled ? "bg-violet-400/70" : "bg-white/15"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                  soundEnabled ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </section>

        <button
          type="button"
          onClick={onReset}
          className="mt-5 w-full rounded-xl border border-white/10 bg-white/[0.02] py-2.5 text-sm text-white/65 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          Reset to defaults
        </button>

        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-sm text-white/80 transition-colors hover:bg-white/10"
        >
          Done
        </button>
      </div>
    </div>
  );
}

/**
 * Editable percent input that displays the underlying float value as an
 * integer percent (e.g. 1.6 -> 160). Typing commits on blur or Enter so a
 * partially-typed number like "12" doesn't immediately get clamped to 12%
 * while the user is still typing "120".
 */
function PercentInput({
  value,
  min,
  max,
  onChange,
  ariaLabel,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  ariaLabel: string;
}) {
  // `min` / `max` describe the slider's sweet spot; the percent input itself
  // accepts values beyond that range (see commit()).
  void min;
  void max;
  const [draft, setDraft] = useState<string>(String(Math.round(value * 100)));
  const [editing, setEditing] = useState(false);

  // Mirror prop changes (e.g. from slider) into the field when not editing.
  useEffect(() => {
    if (!editing) setDraft(String(Math.round(value * 100)));
  }, [value, editing]);

  function commit(raw: string) {
    const n = parseFloat(raw.replace(",", "."));
    if (!Number.isFinite(n)) {
      setDraft(String(Math.round(value * 100)));
      return;
    }
    // Allow exceeding the slider's sweet spot. Floor at 0%, sanity-cap at
    // 10000% so a stray keypress can't yield 1e9 and freeze the renderer.
    const clamped = Math.max(0, Math.min(10000, n));
    onChange(clamped / 100);
    setDraft(String(Math.round(clamped)));
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="text"
        inputMode="numeric"
        value={draft}
        onFocus={(e) => {
          setEditing(true);
          e.currentTarget.select();
        }}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d.,-]/g, ""))}
        onBlur={(e) => {
          setEditing(false);
          commit(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            (e.currentTarget as HTMLInputElement).blur();
          } else if (e.key === "Escape") {
            setDraft(String(Math.round(value * 100)));
            (e.currentTarget as HTMLInputElement).blur();
          }
        }}
        aria-label={ariaLabel}
        className="tabular w-12 rounded-md bg-white/5 px-1.5 py-0.5 text-right text-sm text-white/85 outline-none transition-colors focus:bg-white/10 focus:ring-1 focus:ring-violet-400/60"
      />
      <span className="text-sm text-white/55">%</span>
    </div>
  );
}
