"use client";

import type { IntervalPreset } from "@/lib/types";
import { fmtDuration, fmtSecLabel } from "@/lib/format";

type Props = {
  preset: IntervalPreset;
  selected: boolean;
  onSelect: () => void;
  /** Shown for non-built-in presets only. */
  onEdit?: () => void;
  /** Shown for non-built-in presets only. */
  onDelete?: () => void;
  /** Shown for built-in presets only — clone into "Your intervals". */
  onDuplicate?: () => void;
};

export default function PresetCard({
  preset,
  selected,
  onSelect,
  onEdit,
  onDelete,
  onDuplicate,
}: Props) {
  const accent = preset.accent ?? "#a78bfa";
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`group relative w-full cursor-pointer overflow-hidden rounded-2xl p-4 text-left transition-all duration-300 outline-none no-tap focus-visible:ring-2 focus-visible:ring-white/40 ${
        selected
          ? "glass-strong ring-1 ring-white/25"
          : "glass hover:bg-white/[0.07]"
      }`}
      style={{
        boxShadow: selected
          ? `0 0 0 1px ${accent}55, 0 20px 60px -20px ${accent}55`
          : undefined,
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-50 blur-2xl transition-opacity group-hover:opacity-80"
        style={{ background: accent }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: accent, boxShadow: `0 0 12px ${accent}` }}
            />
            <h3 className="truncate text-base font-medium text-white">
              {preset.name}
            </h3>
            {preset.builtIn && (
              <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-white/60">
                preset
              </span>
            )}
          </div>
          {preset.description && (
            <p className="mt-1 line-clamp-2 text-xs text-white/55">
              {preset.description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {preset.builtIn && onDuplicate && (
            <IconBtn
              label="Duplicate as editable"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </IconBtn>
          )}
          {!preset.builtIn && onEdit && (
            <IconBtn
              label="Edit preset"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </IconBtn>
          )}
          {!preset.builtIn && onDelete && (
            <IconBtn
              label="Delete preset"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              </svg>
            </IconBtn>
          )}
        </div>
      </div>

      <div className="relative mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-white/60">
        {preset.phases.slice(0, 4).map((p, i) => (
          <Pill key={i} label={p.name} value={fmtSecLabel(p.duration)} />
        ))}
        {preset.phases.length > 4 ? (
          <span className="px-1 text-white/45">+{preset.phases.length - 4}</span>
        ) : null}
        <div className="ml-auto flex flex-wrap items-center gap-1.5 tabular text-white/70">
          {preset.mode === "rounds" && (preset.sets ?? 1) > 1 ? (
            <span
              className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/75"
              title={`${preset.sets} sets`}
            >
              {preset.sets}× sets
            </span>
          ) : null}
          {preset.mode === "rounds" && preset.rounds ? (
            <span
              className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/75"
              title={`${preset.rounds} rounds${
                (preset.sets ?? 1) > 1 ? " per set" : ""
              }`}
            >
              {preset.rounds}× rounds
            </span>
          ) : null}
          {preset.mode === "rounds" &&
          (preset.sets ?? 1) > 1 &&
          (preset.restSeconds ?? 0) > 0 ? (
            <span
              className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/55"
              title={`${fmtSecLabel(preset.restSeconds!)} rest between sets`}
            >
              {fmtSecLabel(preset.restSeconds!)} rest
            </span>
          ) : null}
          <span>{fmtDuration(preset.duration)}</span>
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="rounded-md p-1 text-white/45 transition-colors hover:bg-white/10 hover:text-white/85"
    >
      {children}
    </button>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-1">
      <span className="text-white/45">{label}</span>
      <span className="tabular text-white/90">{value}</span>
    </span>
  );
}
