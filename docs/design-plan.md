# Design Plan — Cozy Corner v2 (post plan-design-review, 2026-07-12)

Brief from John: "It doesn't look like the link I sent. I want the design to be
similar and there should be more animations when I click on certain objects."
Reference: andrewwoan/john-and-patricias-romantic-comfort-website (Three.js baked
Blender room; Outline.js hover highlight, Camera.js zoom-to-object, 33KB of
per-object click choreography, day/night texture sets, butterfly/candle idle life).

## Post-review pivots (approved at build checkpoints, 2026-07-12)

- **FP** — First-person interior camera replaces the isometric dollhouse view;
  room fully enclosed (4 walls, ceiling, door). "Box look reads fake."
- **REAL** — Realistic graphics ("think Unreal Engine") replace the flat
  storybook look: IBL, scanned CC0 PBR textures (John authorized the ambientCG
  download), rounded geometry, bloom, FOV 68. Fireflies and halo markers removed.
- All tasks T1–T7 shipped except the mobile treatment (still deferred, TODOS.md).

## Decisions (all approved via review)

| # | Decision | Choice |
|---|---|---|
| 1 | Content reveal on click | **1C — full in-scene content.** Camera zooms per object; content renders inside the 3D world (laptop screen = projects, photo frame = bio, envelope letter = contact). |
| 2 | Failure states | **2A — both.** WebGL-fail shows warm static fallback card; `prefers-reduced-motion` swaps camera flights for crossfades. |
| 3 | Click choreography | **3A — full three-beat spec** (table below). |
| 4 | Visual tone | **4C — day/night toggle.** Bright storybook day look (reference-matched) AND current night look, sun/moon toggle. Screenshot checkpoint on the day look before building further. |
| 5 | Accessibility | **5A — full keyboard + SR.** Tab/Enter through interactives, outline doubles as focus ring, visually-hidden DOM mirror of all content. |
| 6 | Mobile | **6C — deferred deliberately** (see TODOS.md). Desktop-first. |
| 7 | Idle life | **7A — candle + butterfly**, nothing more. |
| — | Accent font | Homemade Apple (reference's own handwriting font, Google Fonts) for subtitle/hint/labels. |

## Click choreography spec (approved 3A)

| Object | Hover (beat 1) | Click travel (beat 2) | Reveal (beat 3) |
|---|---|---|---|
| All clickables | Warm outline glow + spring-scale 1.06 + halo brightens | — | — |
| Laptop | ↑ | Camera glides to desk ~0.9s | Lid opens, screen lights with projects |
| Envelope | ↑ | Camera to desk overhead | Flap opens, letter slides out + unfolds (contact) |
| Photo frame | ↑ | Camera to wall | Frame swings once, photo becomes bio panel |
| Radio | ↑ | none | Knob spins, squash-and-wobble, note burst |
| Owl | ↑ | none | Wing flap + lean-in + hoot + speech bubble |
| Close (Esc / × / empty click) | — | Camera glides home ~0.9s | Object reverses (lid closes, letter folds) |

Motion rules: 0.9s camera tweens, ease-out cubic; object springs ~300ms with
overshoot; reduced-motion replaces all camera travel with 250ms crossfades.

## State coverage (approved 2A)

| Feature | Loading | Error | Success |
|---|---|---|---|
| 3D scene | loader owl (drive from LoadingManager once GLBs exist) | WebGL-fail → static warm card: owl illustration, bio, links, same palette | enter glide |
| Motion | — | `prefers-reduced-motion` → crossfades, no flights | — |
| Audio | gesture-gated start | generated (cannot 404) | notes float while playing |

## User journey (target)

Land (curiosity: blinking owl) → Come in (welcome: glide + music) → idle
(delight: fireflies, robin, butterfly, candle flicker) → hover (invitation:
outline + spring) → click (focus: camera travel + object performs) → read
(connection: content in the world) → close (gentle return glide) → owl
(surprise: flap + hoot).

## NOT in scope (considered, explicitly deferred)

- Mobile in-scene content treatment — deferred by decision 6C → TODOS.md.
- String/fairy lights — declined in Issue 7 (lean idle life chosen).
- Balloons/chalkboard from reference — not requested; revisit with real models.
- Real GLB room/creature models, real photos, real music — arrive later per README swap table.
- AI mood mockups — designer needs OpenAI key; reference used as visual target instead.

## What already exists (reuse, don't rebuild)

- `interactives` array + `userData.action` tagging → choreography hangs off it.
- Halo sprites → become part of hover beat.
- Ambience engine (start/stop/toggle/hoot) → radio beat reuses it.
- Modal shell + content.js copy → becomes the SR mirror + WebGL fallback content.
- CSS variables + Fraunces/Karla → extend with Homemade Apple + day palette tokens.

## Implementation Tasks

Synthesized from this review's findings. Each task derives from a specific
finding above. Checkbox as you ship.

- [ ] **T1 (P1, human: ~2d / CC: ~45min)** — interactions — Build the three-beat click choreography system
  - Surfaced by: Pass 3 — journey steps 4–6 unsupported (hover/click/close beats)
  - Files: src/main.js, src/room.js, src/creatures.js, new src/choreography.js
  - Verify: click each of 5 objects; hover outline, camera travel, object reveal, return glide all fire
- [ ] **T2 (P1, human: ~1d / CC: ~30min)** — content — In-scene content surfaces (1C)
  - Surfaced by: Pass 1 — flat content-reveal hierarchy, decision 1C
  - Files: src/content.js, src/room.js, new src/surfaces.js
  - Verify: projects readable on laptop screen, bio on frame, contact letter unfolds
- [ ] **T3 (P1, human: ~1d / CC: ~40min)** — look — Storybook day look + day/night toggle + Homemade Apple accent
  - Surfaced by: Pass 4 — tone mismatch vs reference, decision 4C
  - Files: src/main.js, src/room.js, src/style.css, index.html
  - Verify: screenshot checkpoint approved by John before T1/T2 polish lands
- [ ] **T4 (P2, human: ~3h / CC: ~10min)** — resilience — WebGL fallback card + prefers-reduced-motion
  - Surfaced by: Pass 2 — silent black screen, no motion preference (2A)
  - Files: index.html, src/main.js, src/style.css
  - Verify: force WebGL off → warm card renders; emulate reduced motion → no camera flights
- [ ] **T5 (P2, human: ~4h / CC: ~15min)** — a11y — Keyboard nav + screen-reader mirror
  - Surfaced by: Pass 6 — canvas invisible to AT (5A)
  - Files: src/main.js, index.html, src/content.js
  - Verify: Tab cycles objects with visible outline, Enter activates, VoiceOver reads content
- [ ] **T6 (P2, human: ~3h / CC: ~15min)** — atmosphere — Candle flicker + drifting butterfly
  - Surfaced by: Pass 3/7 — thin idle life (7A)
  - Files: src/creatures.js, src/room.js
  - Verify: candle light jitters subtly; butterfly drifts near window without stealing focus
- [ ] **T7 (P2, human: ~1h / CC: ~5min)** — docs — DESIGN.md from today's decisions
  - Surfaced by: Pass 5 — no design system file (TODO 1C)
  - Files: DESIGN.md
  - Verify: tokens, type, motion rules, interaction inventory all present

_No new tasks from Pass 4 beyond T3; no new tasks from Pass 6 beyond T5 (mobile deferred to TODOS.md)._

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | codex not installed |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 0 | — | — |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | issues resolved | score: 4/10 → 8/10, 9 decisions |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

- **VERDICT:** DESIGN CLEARED — 7 implementation tasks approved; eng review required before /ship (not run).

NO UNRESOLVED DECISIONS
