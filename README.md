# A Cozy Corner

A personal, interactive 3D room you can step into — my little corner of the
internet. Built from scratch with Three.js: a warm attic with a golden-hour
sunset that swings to a moonlit night, a desk you can actually use, and an owl
named Ollie who keeps his own hours.

**Live:** https://lunaverse.vercel.app

## What's in the room

- **First person and hands-on.** You stand in the room and drag to look
  around. Click an area to move in for a closer look, then click the things
  in it.
- **Day and night.** A toggle sweeps the sun down and the moon up along a real
  arc, and the lamps become switches you can flip on and off.
- **A working desk.** The laptop opens onto a scrollable résumé; the monitor
  runs a little desktop with folders you can open and a notes app you can type
  into; the chair pulls out and the small props react when you click them.
- **Ollie the owl.** He turns his whole face to follow your cursor, sleeps on
  the bed through the day and wakes on the windowsill at night, and hoots when
  you say hi.

## Run it

```bash
npm install
npm run dev      # local dev server
npm run build    # production build → dist/
```

## Make it yours

All the words live in [src/content.js](src/content.js) — the résumé, the
desktop folders, the owl's dialogue, the bio. Swap in your own and the room
reads it.

## How it's built

Vanilla Three.js, no framework, bundled with Vite. Key modules:

```
src/main.js          renderer, camera, lights, day/night moods, interaction wiring
src/room.js          the room, furniture, and interactive props
src/choreography.js  camera choreography — zones, focus, and close-ups
src/creatures.js     Ollie the owl and the robin outside the window
src/desktop.js       the little desktop OS on the monitor
src/surfaces.js      the canvas screens — résumé and the handwritten "hello"
src/content.js       all the copy
src/models.js        glTF model loading
```

## Credits

Furniture is the [Kenney Furniture Kit](https://kenney.nl/assets/furniture-kit)
(CC0). The headphones are "Sony WH-1000XM4 - Black and brown" by Lauri Grekula
(CC BY 4.0), simplified for the web — full attribution in
[public/models/furniture/CREDITS.txt](public/models/furniture/CREDITS.txt).
