# John Dang · A Cozy Corner

An interactive 3D "about me" website in the spirit of
[andrewwoan's romantic comfort website](https://github.com/andrewwoan/john-and-patricias-romantic-comfort-website) —
a warm little room at night, built with Three.js. Drag to look around; click the
glowing things (laptop, envelope, radio, photo frame, and Ollie the owl).

## Run it

```bash
npm install
npm run dev      # local dev server
npm run build    # production build → dist/
```

## Everything is a placeholder on purpose

The whole room is procedural geometry so the site works before any assets exist.
When your real pics and Blender models are ready:

| Swap this | Where | How |
| --- | --- | --- |
| The room model | [src/room.js](src/room.js) | Export a GLB to `public/models/` and load it with `GLTFLoader`. Tag clickable meshes with `userData.action = "about" \| "projects" \| "contact" \| "radio" \| "owl"` and push them into `interactives` — everything else (raycasting, halos, modals) keeps working. |
| Owl / robin models | [src/creatures.js](src/creatures.js) | Same idea — keep `userData.action = "owl"` on the big owl. |
| Your photo | [src/room.js](src/room.js) `placeholderPhotoTexture()` | Load a `TextureLoader` image from `public/images/` instead of the canvas texture. |
| Bio / projects / contact copy | [src/content.js](src/content.js) | Plain HTML strings — edit freely. |
| The radio's tune | [src/audio.js](src/audio.js) | Currently generated with WebAudio. Drop an mp3 in `public/audio/` and keep the `start() / stop() / toggle()` API. |
| Loading progress | [src/main.js](src/main.js) | Currently simulated. Once you load real GLBs, drive the bar from a `THREE.LoadingManager` instead. |

## Structure

```
index.html          loading screen, overlay UI, modal shell
src/style.css       theme (Fraunces + Karla, dusk palette)
src/main.js         renderer, camera, lights, raycasting, UI wiring
src/room.js         procedural room + furniture + interactive tags
src/creatures.js    owls (blinking, breathing) + orbiting robin
src/fireflies.js    shader point-cloud fireflies
src/audio.js        generated ambience + owl hoot
src/content.js      all site copy
```
