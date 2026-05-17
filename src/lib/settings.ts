/**
 * Tiny settings layer for runtime user preferences that don't belong on any
 * single preset/interval. Persisted in localStorage. Changes are broadcast
 * via a custom `pulse:settings-updated` window event so listeners (e.g. the
 * particle canvas) can react without prop drilling.
 */

export const PARTICLE_INTENSITY_KEY = "pulse:particles:intensity:v1";
export const PARTICLE_SPEED_KEY = "pulse:particles:speed:v1";
export const PARTICLE_TAIL_KEY = "pulse:particles:tail:v1";
export const PARTICLE_COUNT_KEY = "pulse:particles:count:v1";
export const HAPTICS_KEY = "pulse:haptics:v1";
export const SOUND_KEY = "pulse:sound:v1";

/** Default values for particle settings (also used by reset-to-default). */
export const DEFAULT_PARTICLE_INTENSITY = 1;
export const DEFAULT_PARTICLE_SPEED = 2.5;
export const DEFAULT_PARTICLE_TAIL = 3;
export const DEFAULT_PARTICLE_COUNT = 2.5;

const SETTINGS_EVENT = "pulse:settings-updated";

export function readParticleIntensity(): number {
  if (typeof window === "undefined") return 1;
  try {
    const raw = window.localStorage.getItem(PARTICLE_INTENSITY_KEY);
    if (raw == null) return 1;
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return 1;
    return clamp(n, 0, 100);
  } catch {
    return 1;
  }
}

export function writeParticleIntensity(value: number) {
  if (typeof window === "undefined") return;
  const v = clamp(value, 0, 100);
  try {
    window.localStorage.setItem(PARTICLE_INTENSITY_KEY, String(v));
  } catch {
    /* ignore */
  }
  emit();
}

export function readParticleSpeed(): number {
  if (typeof window === "undefined") return DEFAULT_PARTICLE_SPEED;
  try {
    const raw = window.localStorage.getItem(PARTICLE_SPEED_KEY);
    if (raw == null) return DEFAULT_PARTICLE_SPEED;
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return DEFAULT_PARTICLE_SPEED;
    return clamp(n, 0, 100);
  } catch {
    return DEFAULT_PARTICLE_SPEED;
  }
}

export function writeParticleSpeed(value: number) {
  if (typeof window === "undefined") return;
  const v = clamp(value, 0, 100);
  try {
    window.localStorage.setItem(PARTICLE_SPEED_KEY, String(v));
  } catch {
    /* ignore */
  }
  emit();
}

export function readParticleTail(): number {
  if (typeof window === "undefined") return DEFAULT_PARTICLE_TAIL;
  try {
    const raw = window.localStorage.getItem(PARTICLE_TAIL_KEY);
    if (raw == null) return DEFAULT_PARTICLE_TAIL;
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return DEFAULT_PARTICLE_TAIL;
    return clamp(n, 0, 100);
  } catch {
    return DEFAULT_PARTICLE_TAIL;
  }
}

export function writeParticleTail(value: number) {
  if (typeof window === "undefined") return;
  const v = clamp(value, 0, 100);
  try {
    window.localStorage.setItem(PARTICLE_TAIL_KEY, String(v));
  } catch {
    /* ignore */
  }
  emit();
}

export function readParticleCount(): number {
  if (typeof window === "undefined") return DEFAULT_PARTICLE_COUNT;
  try {
    const raw = window.localStorage.getItem(PARTICLE_COUNT_KEY);
    if (raw == null) return DEFAULT_PARTICLE_COUNT;
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return DEFAULT_PARTICLE_COUNT;
    return clamp(n, 0, 100);
  } catch {
    return DEFAULT_PARTICLE_COUNT;
  }
}

export function writeParticleCount(value: number) {
  if (typeof window === "undefined") return;
  const v = clamp(value, 0, 100);
  try {
    window.localStorage.setItem(PARTICLE_COUNT_KEY, String(v));
  } catch {
    /* ignore */
  }
  emit();
}

export function readHaptics(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = window.localStorage.getItem(HAPTICS_KEY);
    if (v == null) return true;
    return v === "1";
  } catch {
    return true;
  }
}

export function writeHaptics(enabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HAPTICS_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
  emit();
}

export function readSound(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = window.localStorage.getItem(SOUND_KEY);
    if (v == null) return true;
    return v === "1";
  } catch {
    return true;
  }
}

export function writeSound(enabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SOUND_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
  emit();
}

/**
 * Wipe all four particle settings so subsequent reads fall back to the
 * DEFAULT_PARTICLE_* constants. A single settings-update event is emitted at
 * the end so listeners (canvas, settings sheet) re-read once.
 */
export function resetParticleSettings() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PARTICLE_INTENSITY_KEY);
    window.localStorage.removeItem(PARTICLE_SPEED_KEY);
    window.localStorage.removeItem(PARTICLE_TAIL_KEY);
    window.localStorage.removeItem(PARTICLE_COUNT_KEY);
  } catch {
    /* ignore */
  }
  emit();
}

function emit() {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event(SETTINGS_EVENT));
  } catch {
    /* ignore */
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
