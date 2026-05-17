<h1 align="center">Pulse — Interval Timer</h1>

<p align="center">
  <em>A calm, modern interval timer for breathing, focus, and any rhythm you can imagine.</em>
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-000?logo=nextdotjs">
  <img alt="React"   src="https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white">
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss&logoColor=white">
  <img alt="PWA" src="https://img.shields.io/badge/PWA-installable-5a0fc8?logo=pwa&logoColor=white">
  <img alt="Docker" src="https://img.shields.io/badge/Docker-ready-2496ed?logo=docker&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-green">
</p>

---

## Overview

**Pulse** is an installable Progressive Web App that keeps your tempo while you breathe, focus, train, or meditate. It pairs a meticulously animated **comet-particle field** with a minimal interval engine, so every phase of your rhythm is reinforced visually, audibly, and through haptics — without the visual noise typical of timer apps.

Built on **Next.js 16** with the App Router, **React 19**, **TypeScript**, and **Tailwind CSS v4**. Renders as a single `standalone` Node bundle for tiny Docker images.

## Features

- **Two built-in presets** — *Slow 7·2* (calm, deliberate) and *Quick 1·1* (sharp focus). Both are editable: duplicate and tweak any phase.
- **Custom interval builder** — compose any number of phases with per-phase duration, intent (`grow` / `shrink` / `hold-large` / `hold-small` / `steady`), and total session length.
- **Animated comet particle field** — Canvas2D rendering with solid tapered tails (single polygon fill per particle, no per-segment strokes), perpendicular ribbon construction, and intensity-driven velocity. Smooth at 2000+ particles.
- **Live-tunable visuals** — intensity, speed, tail length, and particle count, each persisted in `localStorage` and updated live without reload.
- **Custom-value inputs** — every slider has an editable percent box that accepts values *beyond* the slider max for users who want extreme settings.
- **Haptic + audio cues** — independent toggles for vibration and sound, so each can be muted in noise-sensitive contexts.
- **Reset to defaults** — single button restores all particle settings to sensible defaults.
- **Installable PWA** — full `manifest.webmanifest`, service worker, maskable icons, dark `theme_color`, offline-friendly shell. Adds to the home screen on iOS and Android.
- **Privacy-first** — no telemetry, no analytics, no network calls beyond the static asset host. All state lives in your browser.
- **Production Docker image** — multi-stage Alpine build, non-root user, Next.js `standalone` output, `<200 MB` final image.

## Quick start

```bash
# Install
npm install

# Develop with hot reload at http://localhost:3000
npm run dev

# Production build + run
npm run build
npm run start

# Lint
npm run lint
```

> Requires **Node.js 20+** (22 LTS recommended).

## Docker

A multi-stage `Dockerfile` and a `scripts/docker-publish.sh` helper are included.

```bash
# Build locally
docker build -t pulse-interval-timer .

# Run
docker run --rm -p 3000:3000 pulse-interval-timer

# Or pull the published image
docker pull ak20001701/interval-timer:latest
docker run --rm -p 3000:3000 ak20001701/interval-timer:latest
```

### Publish to Docker Hub

```bash
docker login
./scripts/docker-publish.sh                              # tags :<git-sha> + :latest
./scripts/docker-publish.sh v1.0.0                       # named release
PLATFORMS=linux/amd64,linux/arm64 \
  ./scripts/docker-publish.sh v1.0.0                     # multi-arch via buildx
```

The script auto-derives the tag from `git rev-parse --short HEAD`, marks dirty trees with a `-dirty` suffix, and always also publishes `:latest`. Override the image name with `IMAGE=your/name`.

## Project structure

```
src/
├── app/                      Next.js App Router entry (layout, page, globals.css)
├── components/
│   ├── HomeClient.tsx        Top-level client shell: presets + builder + settings
│   ├── TimerView.tsx         Active session view with phase progression
│   ├── PulseOrb.tsx          Animated phase-aware orb at the center of the timer
│   ├── ParticleField.tsx     Canvas2D comet field with polygon-fill tails
│   ├── PresetCard.tsx        Preset chooser tiles
│   ├── CustomIntervalForm.tsx Phase-by-phase interval builder
│   ├── SettingsSheet.tsx     Slide-up sheet: visuals, haptics, sound, reset
│   └── ServiceWorkerRegister.tsx  Registers /sw.js on the client
├── lib/
│   ├── types.ts              IntervalPreset, IntervalPhase, PhaseIntent
│   ├── presets.ts            Built-in presets + localStorage migration
│   ├── settings.ts           Particle / haptics / sound prefs + change events
│   ├── haptics.ts            Vibration + audio cue helpers
│   └── useIntervalTimer.ts   Phase-aware countdown hook
public/
├── manifest.webmanifest      PWA manifest
├── sw.js                     Minimal service worker (offline shell)
└── icons/                    Maskable + Apple touch icons
```

## Configuration

User preferences are stored in `localStorage` under namespaced keys, so they survive reloads and PWA installs:

| Key                              | Type      | Default | Notes                              |
| -------------------------------- | --------- | ------- | ---------------------------------- |
| `pulse:particles:intensity:v1`   | `number`  | `1`     | Brightness / density multiplier    |
| `pulse:particles:speed:v1`       | `number`  | `2.5`   | Base velocity multiplier           |
| `pulse:particles:tail:v1`        | `number`  | `3`     | Tail-length multiplier             |
| `pulse:particles:count:v1`       | `number`  | `2.5`   | Particle-pool-size multiplier      |
| `pulse:haptics:v1`               | `"0"\|"1"`| `"1"`   | Vibration on phase change          |
| `pulse:sound:v1`                 | `"0"\|"1"`| `"1"`   | Audio cue on phase change          |
| `pulse:intervals:v1`             | `JSON`    | `[]`    | User-saved custom presets          |

Any change is broadcast through a `pulse:settings-updated` window event so the particle canvas and the settings sheet stay in sync without prop drilling.

## Tech stack

- **Next.js 16** (App Router, `output: "standalone"`)
- **React 19** + **TypeScript 5**
- **Tailwind CSS v4** with the new `@theme` engine
- **Geist** + **Geist Mono** via `next/font`
- **Canvas2D** for the particle system (no WebGL dependency)
- **Web Vibration API** + **Web Audio API** for cues
- **Service Worker + Web App Manifest** for PWA installability

## Browser support

Modern evergreen browsers on desktop and mobile. Best experience on Chromium-based browsers and Safari 17+. The Vibration API is iOS-Safari-limited, but Pulse degrades cleanly to audio-only or visual-only feedback.

## License

[MIT](LICENSE) © Pulse contributors.
