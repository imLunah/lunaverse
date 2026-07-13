# DESIGN.md — A Cozy Corner

The design system for John Dang's interactive 3D about-me site.

**Visual direction (settled 2026-07-12, after /design-review):** **cute
cartoony with real lighting** — first-person interior (you stand IN the room;
John rejects diorama views), chunky toy-like geometry (RoundedBox radii up to
0.085), clean stylized surfaces (procedural plank lines, soft plaster bump,
subtle grain — NO photo scans), warm saturated-pastel palette (honey wood,
butter cream walls, coral rug, sage plants). The realism lives entirely in the
LIGHTING: RoomEnvironment IBL, soft shadows, golden sunset shaft, gentle
UnrealBloom. Reference genre: Behance isometric cozy-bedroom renders — cute
shapes, real light. `public/textures/` + `src/pbr.js` are the unused road back
to photoreal if ever wanted. Camera: FOV 68°, drag-to-look (yaw ±2.35),
breathing sway. No audio autoplay — the record player starts music on request.

**Mood board (second reference, warm-wood render):** full wood paneling with a
dark panel rail, dark plank floor, ceiling beams, cream curtains, bed with
cream/tan bedding + one rust cushion, suitcase record player on a bench
(replaces the radio; same "radio" action), "hello" handwriting monitor, wall
shelves with books/alarm-clock/mug, hanging pothos, skateboard, office chair.
Room is a compact 10×9 m — dense and snug like the reference; everything within a few steps.

**Models:** core furniture (desk, monitor, keyboard, office chair, bed,
bookcase, potted plants, book stacks) are Kenney Furniture Kit GLBs (CC0, no
attribution required — License.txt kept in `public/models/furniture/`), placed
via `src/models.js` (auto-grounds each model; `modelsReady()` refreshes hover
materials). The laptop is hand-built (its lid hinges open — GLBs can't do
that), as are the record player, envelope, photo frame, fashion corner,
window, shelves, and creatures — they carry the animations. The bookshelf owl
is retired; Ollie now lives on the windowsill: clicking him hoots, flaps, and
shows a dialogue bubble (lines cycle from `content.js`), and his pupils track
the cursor.

**Desk beats:** the monitor plays a self-writing cursive "hello" (a
hand-authored stroke path drawn on pen-style in `src/surfaces.js`, looping
draw → hold → fade). The laptop sits closed; focusing it flips the lid open
onto a scrollable résumé (wheel scrolls `texture.offset.y`; copy in
`SURFACES.resume`).

**Fashion corner (John is into avant-garde fashion):** garment rack with
sculptural monochrome pieces (black/cream/rust/charcoal), dress form with an
angular cape, statement boots, fashion book stack, full-length mirror.
Clickable (`action: "style"`) → camera focus + lookbook card reveal.

**Navigation (revised): two tiers.** Home standpoint (eye height 3.05 — the
room is ~2× real scale, so the camera is too) → click a zone (desk / gallery /
music / fashion; furniture carries `userData.zone`) → camera pans to a survey
pose → click items there for the close-up + reveal. Back (Esc / pill / empty
click) walks the tiers in reverse. Ollie performs from anywhere.

**Moods:** "day" is a dreamy golden sunset — the interior stays DIM (no
lights are on) so the low sun through the panes reads golden: low ambient/env
fill, hot directional shaft, bloom lifts with the mood (strength 0.25 → 0.5,
threshold drops), unlit screens dim so they never read as lamps. Visible sun
RAYS pour through the window: additive gradient beams hung from the panes
along the light direction, a glare sprite over the glass, dust motes drifting
in the beam — all fade with the mood. Night is the lamp-lit cabin (floor lamp
+ desk lamp on) with a crescent moon framed in the window. The toggle is a
slow celestial swap: the sun sinks below the horizon and reddens while the
crescent rises into the panes. Texture grade is stylized-clean (normal maps
at ~half strength), not photoreal grit.

## Palette

CSS variables in [src/style.css](src/style.css); Three.js colors in [src/room.js](src/room.js) `PALETTE`.

| Token | Night | Day | Use |
|---|---|---|---|
| `--plum` / sky | #241b2f | warm cream horizon → soft blue | backdrop |
| `--cream` | #fdf3e3 | same | UI text on dark, paper, owl eyes |
| `--amber` | #f0a35e | same | glows, halos, lamp |
| `--ember` | #d96f43 | same | accent: radio, beaks, links, eyebrows |
| `--moss` | #7c8a5a | same | plants, mug |
| walls | #5c4361 dusk purple | pastel lavender (lifted ~35% lightness) | room shell |
| floor | #8a5f42 | honey (warmer, brighter) | room shell |

Rules: one accent (ember); amber is light, not accent. Purple stays *outside*
the window at night — interior surfaces always read warm.

## Typography

| Role | Face | Notes |
|---|---|---|
| Display | Fraunces (variable, opsz) | masthead, headings |
| Body/UI | Karla | modals, hints, buttons |
| Accent | Homemade Apple | handwriting: subtitle, hint pill, in-scene labels — same face the reference uses. Sparingly: 3–4 places max. |

No system-ui, no Inter. Body text ≥ 16px, contrast ≥ 4.5:1.

## Motion

Three-beat interaction pattern (approved 3A, docs/design-plan.md):

1. **Hover** — warm outline glow + spring-scale 1.06 + halo brighten. Doubles as keyboard focus ring.
2. **Travel** — camera tween 0.9s ease-out cubic to the object's saved viewpoint (only where it helps: laptop, envelope, frame — radio and owl perform in place).
3. **Reveal** — the object performs (lid opens, letter unfolds, frame swings, radio wobbles, owl flaps). Close reverses everything, camera glides home 0.9s.

Object springs ~300ms with slight overshoot. Idle life: the robin outside,
drifting dust motes in the sun shafts, the owl's blink and cursor-tracking
gaze — ambient, never competing with clickables. (The butterfly read as a
moth at night and is retired; the desk candle became a little desk lamp.)

`prefers-reduced-motion`: all camera travel becomes 250ms crossfades; idle
drift amplitude halves; no flights, ever.

## Content surfaces (decision 1C)

Content renders inside the world: laptop screen = projects, photo frame = bio,
envelope letter = contact. Every surface has a visually-hidden DOM mirror for
screen readers (and, later, the mobile bottom-sheet — see TODOS.md).

## Voice

Warm, first-person, a little playful ("The owl accepts all correspondence on
my behalf"). No corporate copy. Placeholders are honest about being placeholders.

## Resilience

WebGL unavailable → static warm card: owl illustration, one-paragraph bio,
contact links, same palette. Never a black screen.
