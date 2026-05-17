"use client";

import { useEffect, useState } from "react";
import type {
  IntervalPhase,
  IntervalPreset,
  PhaseIntent,
  SessionMode,
} from "@/lib/types";
import { cleanSec, fmtDuration, fmtSec, fmtSecLabel } from "@/lib/format";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Called when the user confirms (create OR save edit). */
  onSubmit: (preset: IntervalPreset) => void;
  /**
   * If provided, the form opens in edit mode with these values pre-filled.
   * The submitted preset will keep the same `id` so the caller can replace.
   */
  initial?: IntervalPreset | null;
};

const ACCENTS = ["#a78bfa", "#60a5fa", "#34d399", "#f0abfc", "#fb7185", "#fcd34d"];

function emptyPhase(index: number, intent: PhaseIntent): IntervalPhase {
  return { name: `Phase ${index + 1}`, duration: 4, intent };
}

function defaultPhases(): IntervalPhase[] {
  return [emptyPhase(0, "grow"), emptyPhase(1, "shrink")];
}

export default function CustomIntervalForm({
  open,
  onClose,
  onSubmit,
  initial,
}: Props) {
  const isEdit = !!initial;
  const [name, setName] = useState("");
  const [phases, setPhases] = useState<IntervalPhase[]>(defaultPhases);
  const [duration, setDuration] = useState(60);
  const [accent, setAccent] = useState<string>(ACCENTS[0]);
  const [mode, setMode] = useState<SessionMode>("time");
  const [rounds, setRounds] = useState(8);
  const [sets, setSets] = useState(1);
  const [restSeconds, setRestSeconds] = useState(30);

  // Sync the form to `initial` every time the sheet opens.
  useEffect(() => {
    if (!open) return;
    if (initial) {
      setName(initial.name);
      setPhases(
        initial.phases.length > 0
          ? initial.phases.map((p) => ({ ...p }))
          : defaultPhases(),
      );
      setDuration(initial.duration);
      setAccent(initial.accent ?? ACCENTS[0]);
      setMode(initial.mode === "rounds" ? "rounds" : "time");
      setRounds(Math.max(1, initial.rounds ?? 8));
      setSets(Math.max(1, initial.sets ?? 1));
      setRestSeconds(cleanSec(initial.restSeconds ?? 30, 0));
    } else {
      setName("");
      setPhases(defaultPhases());
      setDuration(60);
      setAccent(ACCENTS[0]);
      setMode("time");
      setRounds(8);
      setSets(1);
      setRestSeconds(30);
    }
  }, [open, initial]);

  if (!open) return null;

  function updatePhase(i: number, patch: Partial<IntervalPhase>) {
    setPhases((arr) => arr.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }
  function addPhase() {
    setPhases((arr) => {
      const nextIntent: PhaseIntent =
        arr[arr.length - 1]?.intent === "grow" ? "shrink" : "grow";
      return [...arr, emptyPhase(arr.length, nextIntent)];
    });
  }
  function removePhase(i: number) {
    setPhases((arr) => (arr.length > 1 ? arr.filter((_, idx) => idx !== i) : arr));
  }
  function movePhase(i: number, dir: -1 | 1) {
    setPhases((arr) => {
      const next = [...arr];
      const j = i + dir;
      if (j < 0 || j >= next.length) return arr;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  const cycleSeconds = phases.reduce((s, p) => s + Math.max(0, p.duration), 0);
  const totalRoundsTime =
    mode === "rounds"
      ? cycleSeconds * rounds * sets + (sets > 1 ? restSeconds * (sets - 1) : 0)
      : 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = phases
      .map((p) => ({
        ...p,
        name: p.name.trim() || "Phase",
        duration: cleanSec(p.duration, 0),
      }))
      .filter((p) => p.duration > 0);
    if (cleaned.length === 0) return;
    const cleanedCycle = cleaned.reduce((s, p) => s + p.duration, 0);
    const summary = cleaned.map((p) => fmtSecLabel(p.duration)).join(" · ");
    // In rounds mode the canonical `duration` is the implied total time
    // (sets × rounds × cycle + rest between sets), so progress bars and
    // card footers keep working without branching on `mode`.
    const safeRounds = Math.max(1, Math.round(rounds));
    const safeSets = Math.max(1, Math.round(sets));
    const safeRest = safeSets > 1 ? cleanSec(restSeconds, 0) : 0;
    const finalDuration =
      mode === "rounds"
        ? Math.max(
            1,
            cleanSec(
              cleanedCycle * safeRounds * safeSets + safeRest * (safeSets - 1),
              1,
            ),
          )
        : duration;
    const preset: IntervalPreset = {
      // Keep id stable when editing so callers can do a one-to-one swap.
      id: initial?.id ?? `custom-${Date.now()}`,
      name: name.trim() || `Custom ${summary}`,
      description: initial?.description ?? summary,
      phases: cleaned,
      duration: finalDuration,
      mode,
      rounds: mode === "rounds" ? safeRounds : undefined,
      sets: mode === "rounds" ? safeSets : undefined,
      restSeconds: mode === "rounds" && safeSets > 1 ? safeRest : undefined,
      accent,
      // Editing a duplicated built-in stays a user preset (not built-in).
    };
    onSubmit(preset);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="glass-strong max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-3xl p-5 shadow-2xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium text-white">
            {isEdit ? "Edit interval" : "New interval"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>

        <label className="block">
          <span className="text-xs uppercase tracking-wider text-white/55">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Box, Tabata, Pomodoro…"
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-white placeholder-white/30 outline-none transition-colors focus:border-white/25"
          />
        </label>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-white/55">
              Phases
            </span>
            <span className="tabular text-[11px] text-white/45">
              cycle {fmtSecLabel(cycleSeconds)}
            </span>
          </div>

          <div className="space-y-2">
            {phases.map((p, i) => (
              <PhaseRow
                key={i}
                index={i}
                phase={p}
                canRemove={phases.length > 1}
                onChange={(patch) => updatePhase(i, patch)}
                onRemove={() => removePhase(i)}
                onMove={(dir) => movePhase(i, dir)}
                isFirst={i === 0}
                isLast={i === phases.length - 1}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={addPhase}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/15 py-2.5 text-xs text-white/70 transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            Add phase
          </button>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-white/55">
              Stop after
            </span>
            <ModeToggle mode={mode} onChange={setMode} />
          </div>

          {mode === "time" ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/55">Total duration</span>
                <span className="tabular text-sm text-white/80">
                  {fmtDuration(duration)}
                </span>
              </div>
              <DurationInput
                value={duration}
                onChange={(n) => setDuration(Math.max(1, n))}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[30, 60, 90, 120, 180, 300, 600].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setDuration(s)}
                    className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${
                      duration === s
                        ? "bg-white/15 text-white"
                        : "bg-white/[0.05] text-white/65 hover:bg-white/10"
                    }`}
                  >
                    {fmtDuration(s)}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/55">Rounds per set</span>
                <span className="tabular text-sm text-white/80">
                  {rounds} × {fmtSecLabel(cycleSeconds)} ={" "}
                  {fmtDuration(rounds * cycleSeconds)}
                </span>
              </div>
              <IntInput
                ariaLabel="rounds"
                suffix="rounds"
                value={rounds}
                onChange={(n) => setRounds(Math.max(1, Math.min(999, n)))}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[3, 5, 8, 10, 12, 20].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRounds(n)}
                    className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${
                      rounds === n
                        ? "bg-white/15 text-white"
                        : "bg-white/[0.05] text-white/65 hover:bg-white/10"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-[11px] text-white/55">Sets</span>
                <span className="tabular text-sm text-white/80">
                  {sets > 1
                    ? `${sets} sets · total ${fmtDuration(totalRoundsTime)}`
                    : `1 set · total ${fmtDuration(totalRoundsTime)}`}
                </span>
              </div>
              <IntInput
                ariaLabel="sets"
                suffix="sets"
                value={sets}
                onChange={(n) => setSets(Math.max(1, Math.min(99, n)))}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[1, 2, 3, 4, 5, 8].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSets(n)}
                    className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${
                      sets === n
                        ? "bg-white/15 text-white"
                        : "bg-white/[0.05] text-white/65 hover:bg-white/10"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>

              {sets > 1 && (
                <>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[11px] text-white/55">
                      Rest between sets
                    </span>
                    <span className="tabular text-sm text-white/80">
                      {fmtSecLabel(restSeconds)} × {sets - 1} ={" "}
                      {fmtDuration(restSeconds * (sets - 1))}
                    </span>
                  </div>
                  <DecimalSecInput
                    ariaLabel="rest seconds"
                    value={restSeconds}
                    onChange={(n) => setRestSeconds(cleanSec(n, 0))}
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[0, 10, 15, 30, 60, 90].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRestSeconds(n)}
                        className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${
                          restSeconds === n
                            ? "bg-white/15 text-white"
                            : "bg-white/[0.05] text-white/65 hover:bg-white/10"
                        }`}
                      >
                        {n === 0 ? "none" : `${n}s`}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="mt-4">
          <span className="text-xs uppercase tracking-wider text-white/55">Color</span>
          <div className="mt-2 flex gap-2">
            {ACCENTS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setAccent(c)}
                aria-label={`Accent ${c}`}
                className={`h-7 w-7 rounded-full transition-transform ${
                  accent === c ? "scale-110 ring-2 ring-white" : "ring-1 ring-white/20"
                }`}
                style={{ background: c, boxShadow: `0 0 18px ${c}66` }}
              />
            ))}
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-sm text-white/80 transition-colors hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={cycleSeconds <= 0}
            className="flex-1 rounded-xl py-2.5 text-sm font-medium text-white shadow-lg transition-transform active:scale-[0.98] disabled:opacity-50"
            style={{
              background: `linear-gradient(135deg, ${accent}, #8b5cf6)`,
              boxShadow: `0 12px 30px -10px ${accent}aa`,
            }}
          >
            {isEdit ? "Save" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}

const INTENT_LABELS: Record<PhaseIntent, { label: string; glyph: string }> = {
  grow: { label: "Grow", glyph: "↑" },
  shrink: { label: "Shrink", glyph: "↓" },
  "hold-large": { label: "Hold ●", glyph: "●" },
  "hold-small": { label: "Hold ○", glyph: "○" },
  steady: { label: "Steady", glyph: "—" },
};

const INTENT_ORDER: PhaseIntent[] = [
  "grow",
  "shrink",
  "hold-large",
  "hold-small",
  "steady",
];

function PhaseRow({
  index,
  phase,
  canRemove,
  onChange,
  onRemove,
  onMove,
  isFirst,
  isLast,
}: {
  index: number;
  phase: IntervalPhase;
  canRemove: boolean;
  onChange: (patch: Partial<IntervalPhase>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const intent: PhaseIntent = phase.intent ?? "steady";
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
      <div className="flex items-stretch gap-2">
        <div className="flex shrink-0 flex-col">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={isFirst}
            className="h-5 w-6 rounded-md text-white/55 transition-colors hover:bg-white/10 disabled:opacity-25"
            aria-label="Move up"
          >
            <span className="text-[10px]">▲</span>
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={isLast}
            className="h-5 w-6 rounded-md text-white/55 transition-colors hover:bg-white/10 disabled:opacity-25"
            aria-label="Move down"
          >
            <span className="text-[10px]">▼</span>
          </button>
        </div>
        <div className="grid w-full grid-cols-[1fr_auto] gap-2">
          <input
            value={phase.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder={`Phase ${index + 1}`}
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-white/25"
          />
          <div className="flex items-stretch overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]">
            <button
              type="button"
              onClick={() =>
                onChange({ duration: cleanSec(phase.duration - 1, 0) })
              }
              className="px-2 text-white/70 transition-colors hover:bg-white/10"
              aria-label="Decrease by 1s"
            >
              −
            </button>
            <DecimalField
              value={phase.duration}
              onChange={(n) => onChange({ duration: n })}
              widthClassName="w-20"
            />
            <button
              type="button"
              onClick={() =>
                onChange({ duration: cleanSec(phase.duration + 1, 0) })
              }
              className="px-2 text-white/70 transition-colors hover:bg-white/10"
              aria-label="Increase by 1s"
            >
              +
            </button>
            <span className="grid place-items-center pr-2 text-[10px] text-white/45">
              sec
            </span>
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {INTENT_ORDER.map((it) => (
            <button
              key={it}
              type="button"
              onClick={() => onChange({ intent: it })}
              className={`rounded-md px-1.5 py-0.5 text-[10px] uppercase tracking-wider transition-colors ${
                intent === it
                  ? "bg-white/15 text-white"
                  : "text-white/45 hover:bg-white/[0.06] hover:text-white/70"
              }`}
              title={INTENT_LABELS[it].label}
            >
              <span className="mr-1">{INTENT_LABELS[it].glyph}</span>
              {INTENT_LABELS[it].label}
            </button>
          ))}
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white/80"
            aria-label="Remove phase"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

function DurationInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (seconds: number) => void;
}) {
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = value % 60;
  return (
    <div className="mt-2 flex items-stretch gap-2">
      <NumField
        label="hr"
        value={hours}
        onChange={(n) => onChange(n * 3600 + minutes * 60 + seconds)}
      />
      <NumField
        label="min"
        value={minutes}
        onChange={(n) => onChange(hours * 3600 + n * 60 + seconds)}
      />
      <NumField
        label="sec"
        value={seconds}
        onChange={(n) => onChange(hours * 3600 + minutes * 60 + n)}
      />
    </div>
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: SessionMode;
  onChange: (m: SessionMode) => void;
}) {
  const opts: { value: SessionMode; label: string }[] = [
    { value: "time", label: "Time" },
    { value: "rounds", label: "Rounds" },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Stop condition"
      className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] p-0.5"
    >
      {opts.map((o) => {
        const active = mode === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-wider transition-colors ${
              active
                ? "bg-white/15 text-white"
                : "text-white/55 hover:text-white"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function IntInput({
  value,
  onChange,
  ariaLabel,
  suffix,
}: {
  value: number;
  onChange: (n: number) => void;
  ariaLabel: string;
  suffix: string;
}) {
  return (
    <label className="mt-2 flex items-stretch overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        className="px-3 text-white/70 transition-colors hover:bg-white/10"
        aria-label={`Decrease ${ariaLabel}`}
      >
        −
      </button>
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          onChange(Number.isNaN(n) ? 1 : n);
        }}
        className="tabular w-full bg-transparent px-1 py-2 text-center text-sm text-white outline-none"
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="px-3 text-white/70 transition-colors hover:bg-white/10"
        aria-label={`Increase ${ariaLabel}`}
      >
        +
      </button>
      <span className="grid place-items-center px-3 text-[10px] uppercase tracking-wider text-white/45">
        {suffix}
      </span>
    </label>
  );
}

function DecimalSecInput({
  value,
  onChange,
  ariaLabel,
}: {
  value: number;
  onChange: (n: number) => void;
  ariaLabel: string;
}) {
  return (
    <label className="mt-2 flex items-stretch overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]">
      <button
        type="button"
        onClick={() => onChange(cleanSec(value - 1, 0))}
        className="px-3 text-white/70 transition-colors hover:bg-white/10"
        aria-label={`Decrease ${ariaLabel} by 1`}
      >
        −
      </button>
      <DecimalField
        value={value}
        onChange={onChange}
        widthClassName="w-full"
      />
      <button
        type="button"
        onClick={() => onChange(cleanSec(value + 1, 0))}
        className="px-3 text-white/70 transition-colors hover:bg-white/10"
        aria-label={`Increase ${ariaLabel} by 1`}
      >
        +
      </button>
      <span className="grid place-items-center px-3 text-[10px] uppercase tracking-wider text-white/45">
        sec
      </span>
    </label>
  );
}

/**
 * Free-form decimal text field that preserves mid-typing characters.
 *
 * Keeps a local draft string while the user is typing so an in-progress
 * value like "0." doesn't get reformatted to "0" the moment React re-renders.
 * Permissive input chars allow "0.5", "0,5" (EU locales), ".5", "4.5", etc.
 * Commits to the parent the instant the string parses to a number, and
 * canonicalises on blur.
 */
function DecimalField({
  value,
  onChange,
  widthClassName = "w-12",
}: {
  value: number;
  onChange: (n: number) => void;
  widthClassName?: string;
}) {
  const [draft, setDraft] = useState<string>(() => fmtSec(value));

  // Re-sync the draft when the external value moves (e.g. ±1 buttons or
  // form reset) but skip when the draft already represents the same number
  // so an in-progress "0." stays put.
  useEffect(() => {
    const drafted = parseFloat(draft.replace(",", "."));
    if (!Number.isFinite(drafted) || drafted !== value) {
      setDraft(fmtSec(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={draft}
      onChange={(e) => {
        const next = e.target.value;
        setDraft(next);
        const n = parseFloat(next.replace(",", "."));
        if (!Number.isNaN(n)) onChange(cleanSec(n, 0));
      }}
      onBlur={() => {
        const n = parseFloat(draft.replace(",", "."));
        if (Number.isNaN(n)) {
          setDraft(fmtSec(value));
        } else {
          const c = cleanSec(n, 0);
          setDraft(fmtSec(c));
          if (c !== value) onChange(c);
        }
      }}
      className={`tabular bg-transparent px-1 text-center text-sm text-white outline-none ${widthClassName}`}
    />
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="flex flex-1 items-stretch overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="px-2 text-white/70 transition-colors hover:bg-white/10"
        aria-label={`Decrease ${label}`}
      >
        −
      </button>
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          onChange(Number.isNaN(n) ? 0 : Math.max(0, n));
        }}
        className="tabular w-full bg-transparent px-1 py-1.5 text-center text-sm text-white outline-none"
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="px-2 text-white/70 transition-colors hover:bg-white/10"
        aria-label={`Increase ${label}`}
      >
        +
      </button>
      <span className="grid place-items-center px-2 text-[10px] uppercase tracking-wider text-white/45">
        {label}
      </span>
    </label>
  );
}
