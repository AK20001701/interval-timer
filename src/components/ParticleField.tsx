"use client";

import { useEffect, useRef } from "react";
import type { PhaseIntent } from "@/lib/types";
import {
  PARTICLE_COUNT_KEY,
  PARTICLE_INTENSITY_KEY,
  PARTICLE_SPEED_KEY,
  PARTICLE_TAIL_KEY,
  readParticleCount,
  readParticleIntensity,
  readParticleSpeed,
  readParticleTail,
} from "@/lib/settings";

type Props = {
  /** 0..1 — phase-driven intensity from the timer. */
  intensity?: number;
  /** Hex color of particles. */
  color?: string;
  /** Kept for API compatibility. */
  intent?: PhaseIntent | null;
};

type Particle = {
  x: number;
  y: number;
  r: number;
  vy: number;
  vx: number;
  base: number;
  phase: number;
  /** Recent positions for the tapered tail, newest first. */
  history: { x: number; y: number }[];
};

type Tier = {
  count: number;
  dprCap: number;
  targetFps: number;
  /** Default trail length (history points) when userTail = 1. */
  baseTrail: number;
};

function pickTier(): Tier {
  if (typeof window === "undefined") {
    return { count: 60, dprCap: 1.5, targetFps: 60, baseTrail: 70 };
  }
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return { count: 12, dprCap: 1, targetFps: 20, baseTrail: 0 };
  const min = Math.min(window.innerWidth, window.innerHeight);
  const coarse = window.matchMedia?.("(pointer: coarse)").matches;
  if (min < 380) return { count: 14, dprCap: coarse ? 1 : 1.25, targetFps: 30, baseTrail: 30 };
  if (min < 640) return { count: 22, dprCap: coarse ? 1.25 : 1.5, targetFps: 45, baseTrail: 40 };
  if (min < 1024) return { count: 36, dprCap: coarse ? 1.5 : 1.75, targetFps: 60, baseTrail: 55 };
  return { count: 55, dprCap: 2, targetFps: 60, baseTrail: 70 };
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const v = parseInt(n, 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

export default function ParticleField({
  intensity = 0.4,
  color = "#a78bfa",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intensityRef = useRef(intensity);
  const colorRef = useRef(color);
  const userIntensityRef = useRef(1);
  const userSpeedRef = useRef(1);
  const userTailRef = useRef(1);
  const userCountRef = useRef(1);

  intensityRef.current = intensity;
  colorRef.current = color;

  useEffect(() => {
    userIntensityRef.current = readParticleIntensity();
    userSpeedRef.current = readParticleSpeed();
    userTailRef.current = readParticleTail();
    userCountRef.current = readParticleCount();
    function refreshSettings() {
      userIntensityRef.current = readParticleIntensity();
      userSpeedRef.current = readParticleSpeed();
      userTailRef.current = readParticleTail();
      userCountRef.current = readParticleCount();
    }
    function onStorage(e: StorageEvent) {
      if (
        e.key === PARTICLE_INTENSITY_KEY ||
        e.key === PARTICLE_SPEED_KEY ||
        e.key === PARTICLE_TAIL_KEY ||
        e.key === PARTICLE_COUNT_KEY
      ) {
        refreshSettings();
      }
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener("pulse:settings-updated", refreshSettings);

    const canvasEl = canvasRef.current;
    const cleanupListeners = () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pulse:settings-updated", refreshSettings);
    };
    if (!canvasEl) return cleanupListeners;
    const ctxEl = canvasEl.getContext("2d", { alpha: true });
    if (!ctxEl) return cleanupListeners;
    const canvas: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = ctxEl;

    let tier = pickTier();
    let particles: Particle[] = [];
    let dpr = 1;
    let w = 0;
    let h = 0;
    let smoothed = intensityRef.current;

    // Reusable vertex buffers for the tail polygon. Allocated once at the
    // absolute trail-length cap so we never allocate during animation —
    // critical at high particle counts where per-frame allocation otherwise
    // produces tens of MB/s of GC pressure and visible stalls.
    const MAX_TRAIL = 2000;
    const leftX = new Float32Array(MAX_TRAIL);
    const leftY = new Float32Array(MAX_TRAIL);
    const rightX = new Float32Array(MAX_TRAIL);
    const rightY = new Float32Array(MAX_TRAIL);

    function seed(count: number): Particle[] {
      const out: Particle[] = [];
      for (let i = 0; i < count; i++) {
        out.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 0.7 + Math.random() * 1.5,
          vy: 22 + Math.random() * 38,
          vx: (Math.random() - 0.5) * 16,
          base: 0.4 + Math.random() * 0.5,
          phase: Math.random() * Math.PI * 2,
          history: [],
        });
      }
      return out;
    }

    function resize() {
      const cssW = window.innerWidth;
      const cssH = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, tier.dprCap);
      w = cssW;
      h = cssH;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (particles.length === 0) {
        particles = seed(tier.count);
      } else if (particles.length !== tier.count) {
        if (particles.length < tier.count) {
          particles = particles.concat(seed(tier.count - particles.length));
        } else {
          particles = particles.slice(0, tier.count);
        }
      }
    }

    function handleTierChange() {
      tier = pickTier();
      resize();
    }

    resize();

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointerQuery = window.matchMedia("(pointer: coarse)");
    motionQuery.addEventListener?.("change", handleTierChange);
    pointerQuery.addEventListener?.("change", handleTierChange);
    window.addEventListener("resize", resize);

    let rafId = 0;
    let last = performance.now();
    let isRunning = true;
    const minFrameMs = 1000 / tier.targetFps;
    let acc = 0;

    function onVis() {
      if (document.hidden) {
        isRunning = false;
        cancelAnimationFrame(rafId);
      } else if (!isRunning) {
        isRunning = true;
        last = performance.now();
        rafId = requestAnimationFrame(frame);
      }
    }
    document.addEventListener("visibilitychange", onVis);

    function frame(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      acc += dt * 1000;
      if (acc < minFrameMs) {
        rafId = requestAnimationFrame(frame);
        return;
      }
      acc = 0;

      const [r, g, b] = hexToRgb(colorRef.current);

      const target = Math.max(0, Math.min(1, intensityRef.current));
      smoothed += (target - smoothed) * Math.min(1, dt * 2.2);

      const userIntensity = userIntensityRef.current;
      const userSpeed = userSpeedRef.current;
      const userTail = userTailRef.current;
      const userCount = userCountRef.current;
      const fieldAlpha = userIntensity * (0.55 + smoothed * 0.45);
      const speedMul = (0.4 + smoothed * 1.6) * userSpeed;

      // Reconcile the live particle pool with the user-requested count.
      // Single absolute safety cap (2000) so a stray 10000% can't OOM the
      // renderer. Otherwise the user's typed value is fully honored.
      const targetCount = Math.max(
        0,
        Math.min(2000, Math.round(tier.count * userCount)),
      );
      if (particles.length !== targetCount) {
        if (particles.length < targetCount) {
          particles = particles.concat(seed(targetCount - particles.length));
        } else {
          particles = particles.slice(0, targetCount);
        }
      }

      // Effective trail length in history points. Tier provides a sensible
      // baseline at 100%; the user's setting scales it linearly with a single
      // absolute cap of 2000 frames (~33s at 60fps) for safety.
      const effectiveTrail =
        tier.baseTrail === 0
          ? 0
          : Math.min(2000, Math.round(tier.baseTrail * userTail));

      if (userIntensity <= 0.001) {
        ctx.clearRect(0, 0, w, h);
        rafId = requestAnimationFrame(frame);
        return;
      }

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      const colorStr = `${r},${g},${b}`;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Move first so head/trail decisions use the post-move position.
        p.y -= p.vy * speedMul * dt;
        p.x += p.vx * speedMul * dt;

        const margin = 30;
        const headOff =
          p.y < -margin ||
          p.y > h + margin ||
          p.x < -margin ||
          p.x > w + margin;

        // Trail behavior:
        //  - Head ON-screen → extend trail by recording current position.
        //  - Head OFF-screen → stop sampling AND retreat the trail by
        //    popping several oldest entries each frame so the streak follows
        //    the head off the edge instead of lingering as a "headless
        //    trail" until the tip slowly slides off.
        if (effectiveTrail > 0) {
          if (!headOff) {
            p.history.unshift({ x: p.x, y: p.y });
            if (p.history.length > effectiveTrail) {
              p.history.length = effectiveTrail;
            }
          } else {
            // Pop several points per frame so the visible trail recedes
            // quickly. 4 pops/frame at 60fps drains 240 points/second —
            // ~0.6s to fade a 140-point default trail entirely.
            for (let k = 0; k < 4; k++) {
              if (p.history.length === 0) break;
              p.history.pop();
            }
          }
        } else {
          p.history.length = 0;
        }

        // Respawn once head is off-screen AND the trail has fully retreated.
        if (headOff && p.history.length === 0) {
          p.y = h + 20;
          p.x = Math.random() * w;
          p.vy = 22 + Math.random() * 38;
          p.vx = (Math.random() - 0.5) * 16;
          p.r = 0.7 + Math.random() * 1.5;
          p.base = 0.4 + Math.random() * 0.5;
          p.phase = Math.random() * Math.PI * 2;
        }

        p.phase += dt * (0.6 + p.r * 0.2);
        const twinkle = 0.78 + 0.22 * Math.sin(p.phase);
        const headAlpha = p.base * twinkle * fieldAlpha;

        // ------- Solid tapered tail via a single polygon fill -------
        // Build a ribbon polygon along the history points: for each vertex we
        // emit two offsets perpendicular to the local path direction, scaled
        // by the tapered half-width. The result is one continuous filled
        // shape — no per-segment rounded caps to brighten into "dots" in
        // additive blending, and exactly one fill call per particle (instead
        // of N strokes), so high counts/tails stay performant.
        const len = Math.min(p.history.length, MAX_TRAIL);
        if (len > 1) {
          const headW = Math.max(1.1, p.r * 1.9);
          // Compute polygon vertices into the pre-allocated reusable buffers.
          for (let i = 0; i < len; i++) {
            const t = len === 1 ? 0 : i / (len - 1); // 0 at head, 1 at tip
            const tt = 1 - t;
            const taper = Math.pow(tt, 1.4);
            const halfW = Math.max(0.18, headW * 0.5 * taper);
            const px = p.history[i].x;
            const py = p.history[i].y;
            // Local path direction (central difference where possible).
            let dx: number;
            let dy: number;
            if (i === 0) {
              dx = p.history[1].x - px;
              dy = p.history[1].y - py;
            } else if (i === len - 1) {
              dx = px - p.history[i - 1].x;
              dy = py - p.history[i - 1].y;
            } else {
              dx = p.history[i + 1].x - p.history[i - 1].x;
              dy = p.history[i + 1].y - p.history[i - 1].y;
            }
            const dl = Math.hypot(dx, dy) || 1;
            // Perpendicular unit vector (rotate 90°).
            const nx = -dy / dl;
            const ny = dx / dl;
            leftX[i] = px + nx * halfW;
            leftY[i] = py + ny * halfW;
            rightX[i] = px - nx * halfW;
            rightY[i] = py - ny * halfW;
          }
          // Linear gradient from head -> tail tip provides the alpha falloff.
          const head = p.history[0];
          const tip = p.history[len - 1];
          const grad = ctx.createLinearGradient(
            head.x,
            head.y,
            tip.x,
            tip.y,
          );
          grad.addColorStop(0, `rgba(${colorStr},${headAlpha * 0.95})`);
          grad.addColorStop(0.35, `rgba(${colorStr},${headAlpha * 0.55})`);
          grad.addColorStop(0.75, `rgba(${colorStr},${headAlpha * 0.18})`);
          grad.addColorStop(1, `rgba(${colorStr},0)`);

          ctx.beginPath();
          ctx.moveTo(leftX[0], leftY[0]);
          for (let i = 1; i < len; i++) ctx.lineTo(leftX[i], leftY[i]);
          for (let i = len - 1; i >= 0; i--) ctx.lineTo(rightX[i], rightY[i]);
          ctx.closePath();
          ctx.fillStyle = grad;
          ctx.fill();
        }

        // ------- Soft halo around current head -------
        const halo = p.r * 6;
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, halo);
        grd.addColorStop(0, `rgba(${colorStr},${headAlpha * 0.55})`);
        grd.addColorStop(0.4, `rgba(${colorStr},${headAlpha * 0.22})`);
        grd.addColorStop(1, `rgba(${colorStr},0)`);
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(p.x, p.y, halo, 0, Math.PI * 2);
        ctx.fill();
      }

      // ------- Bright crisp heads on top -------
      ctx.globalCompositeOperation = "source-over";
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const twinkle = 0.78 + 0.22 * Math.sin(p.phase);
        const headAlpha = p.base * twinkle * fieldAlpha;
        const coreAlpha = Math.min(1, 0.55 + headAlpha * 0.9);
        const coreR = Math.max(0.95, p.r * 1.1);
        ctx.fillStyle = `rgba(${colorStr},${coreAlpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, coreR, 0, Math.PI * 2);
        ctx.fill();
      }

      rafId = requestAnimationFrame(frame);
    }

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", resize);
      motionQuery.removeEventListener?.("change", handleTierChange);
      pointerQuery.removeEventListener?.("change", handleTierChange);
      cleanupListeners();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
    />
  );
}
