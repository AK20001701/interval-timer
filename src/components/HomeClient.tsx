"use client";

import { useEffect, useMemo, useState } from "react";
import type { IntervalPreset } from "@/lib/types";
import {
  BUILTIN_PRESETS,
  loadCustomPresets,
  saveCustomPresets,
} from "@/lib/presets";
import PresetCard from "./PresetCard";
import CustomIntervalForm from "./CustomIntervalForm";
import SettingsSheet from "./SettingsSheet";
import TimerView from "./TimerView";
import ParticleField from "./ParticleField";
import { isIOS, isVibrateSupported, unlockHaptics, haptic } from "@/lib/haptics";
import { readHaptics } from "@/lib/settings";

function cloneFromBuiltin(src: IntervalPreset): IntervalPreset {
  return {
    id: `custom-${Date.now()}`,
    name: `${src.name} (copy)`,
    description: src.description,
    phases: src.phases.map((p) => ({ ...p })),
    duration: src.duration,
    accent: src.accent,
  };
}

export default function HomeClient() {
  const [custom, setCustom] = useState<IntervalPreset[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [running, setRunning] = useState<IntervalPreset | null>(null);
  const [editing, setEditing] = useState<IntervalPreset | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Load on mount
  useEffect(() => {
    setMounted(true);
    setCustom(loadCustomPresets());
    setHapticsEnabled(readHaptics());
  }, []);

  // Persist custom
  useEffect(() => {
    if (mounted) saveCustomPresets(custom);
  }, [custom, mounted]);

  // Mirror settings sheet writes back into local state so the haptics
  // helper picks them up the next time it's called.
  useEffect(() => {
    function refresh() {
      setHapticsEnabled(readHaptics());
    }
    window.addEventListener("pulse:settings-updated", refresh);
    return () => window.removeEventListener("pulse:settings-updated", refresh);
  }, []);

  const allPresets = useMemo(
    () => [...BUILTIN_PRESETS, ...custom],
    [custom],
  );

  const selected = allPresets.find((p) => p.id === activeId) ?? allPresets[0];

  function openCreate() {
    unlockHaptics();
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(p: IntervalPreset) {
    unlockHaptics();
    setEditing(p);
    setFormOpen(true);
  }

  function handleSubmit(p: IntervalPreset) {
    setCustom((arr) => {
      const idx = arr.findIndex((x) => x.id === p.id);
      if (idx === -1) return [...arr, p];
      const next = arr.slice();
      next[idx] = p;
      return next;
    });
    setActiveId(p.id);
    setFormOpen(false);
    setEditing(null);
    if (hapticsEnabled) haptic("success");
  }

  function duplicateBuiltin(src: IntervalPreset) {
    const copy = cloneFromBuiltin(src);
    setCustom((arr) => [...arr, copy]);
    setActiveId(copy.id);
    if (hapticsEnabled) haptic("tick");
    // Immediately open the editor on the new clone so the user can tweak it.
    setEditing(copy);
    setFormOpen(true);
  }

  if (running) {
    return (
      <TimerView
        preset={running}
        hapticsEnabled={hapticsEnabled}
        onClose={() => setRunning(null)}
      />
    );
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col">
      <ParticleField intensity={0.18} color="#a78bfa" />

      <header className="safe-top relative z-10 flex items-center justify-end px-5 py-4">
        <button
          type="button"
          onClick={() => {
            unlockHaptics();
            setSettingsOpen(true);
          }}
          className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/[0.10] hover:text-white"
          aria-label="Open settings"
          title="Settings"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Settings
        </button>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-2xl flex-1 px-5 pb-32 pt-2">
        <section className="mt-2">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-white/55">
              Presets
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {BUILTIN_PRESETS.map((p) => (
              <PresetCard
                key={p.id}
                preset={p}
                selected={selected?.id === p.id}
                onSelect={() => {
                  setActiveId(p.id);
                  if (hapticsEnabled) haptic("tick");
                }}
                onDuplicate={() => duplicateBuiltin(p)}
              />
            ))}
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-white/55">
              Your intervals
            </h2>
            <button
              type="button"
              onClick={openCreate}
              className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs text-white/85 transition-colors hover:bg-white/[0.12]"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              New
            </button>
          </div>

          {custom.length === 0 ? (
            <button
              type="button"
              onClick={openCreate}
              className="glass flex w-full flex-col items-center justify-center rounded-2xl border-dashed py-8 text-center transition-colors hover:bg-white/[0.06]"
              style={{ borderStyle: "dashed" }}
            >
              <div className="text-sm text-white/70">Create your first interval</div>
              <div className="mt-1 text-xs text-white/40">
                Add as many phases as you like, set durations, pick a color
              </div>
            </button>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {custom.map((p) => (
                <PresetCard
                  key={p.id}
                  preset={p}
                  selected={selected?.id === p.id}
                  onSelect={() => {
                    setActiveId(p.id);
                    if (hapticsEnabled) haptic("tick");
                  }}
                  onEdit={() => openEdit(p)}
                  onDelete={() => {
                    setCustom((arr) => arr.filter((x) => x.id !== p.id));
                    if (activeId === p.id) setActiveId(null);
                  }}
                />
              ))}
            </div>
          )}
        </section>

        <section className="mt-10 text-center text-xs text-white/40">
          {mounted && !isVibrateSupported() && isIOS() ? (
            <p>
              Heads up: iOS doesn&apos;t expose vibration to the web. Haptic
              feedback uses subtle audio cues instead.
            </p>
          ) : null}
        </section>
      </main>

      {/* Sticky start bar */}
      <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center px-4">
        <div className="pointer-events-auto glass-strong flex w-full max-w-md items-center justify-between gap-3 rounded-2xl px-3 py-3 shadow-2xl">
          <div className="min-w-0 px-2">
            <div className="text-[10px] uppercase tracking-[0.22em] text-white/45">
              Selected
            </div>
            <div className="truncate text-sm font-medium text-white">
              {selected ? selected.name : "—"}
            </div>
          </div>
          <button
            type="button"
            disabled={!selected}
            onClick={() => {
              if (!selected) return;
              unlockHaptics();
              setRunning(selected);
            }}
            className="flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium text-white shadow-lg transition-transform active:scale-[0.97] disabled:opacity-40"
            style={{
              background: `linear-gradient(135deg, ${
                selected?.accent ?? "#a78bfa"
              }, #8b5cf6)`,
              boxShadow: `0 14px 30px -10px ${
                selected?.accent ?? "#a78bfa"
              }aa`,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
            Start
          </button>
        </div>
      </div>

      <CustomIntervalForm
        open={formOpen}
        initial={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
      />

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}

