import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { buildRoom } from "./room.js";
import { buildOwl, buildBird, buildButterfly } from "./creatures.js";
import { buildSurfaces } from "./surfaces.js";
import { Choreography, ZONE_OF } from "./choreography.js";
import { Ambience } from "./audio.js";
import { CONTENT, SURFACES } from "./content.js";

const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ═══════════════ Renderer / scene / camera ═══════════════ */

const canvas = document.getElementById("webgl");

// 2A: if WebGL is unavailable, show the warm static fallback instead of a void
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
} catch (err) {
  document.body.classList.add("no-webgl");
  document.getElementById("loader").classList.add("hidden");
  throw err; // stop the 3D module; the fallback card carries the content
}
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();

// Image-based lighting — soft ambient bounce that flat lights can't fake
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.5;

const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 200);

/* First-person standpoint (decision FP, 2026-07-12): you stand IN the room at
   eye height and drag to look around — no more orbiting a dollhouse. */
// Furniture is ~2× real-world scale, so eye height is too (desk tops sit at 1.6)
const STAND = new THREE.Vector3(1.9, 3.05, 3.4);
const ENTER_FROM = new THREE.Vector3(6.2, 3.2, 3.4); // stepping in from the door side
const CORNER_FOCUS = new THREE.Vector3(-1.6, 2.1, -1.8);
const BASE_YAW = Math.atan2(CORNER_FOCUS.x - STAND.x, CORNER_FOCUS.z - STAND.z);
const YAW_RANGE = 2.35; // the room now wraps around you — let the head turn
const PITCH_MIN = -0.5, PITCH_MAX = 0.55;

const look = {
  yaw: BASE_YAW,
  pitch: 0.02,
  targetYaw: BASE_YAW,
  targetPitch: 0.02,
  dragging: false,
  lastX: 0,
  lastY: 0,
  enabled: false, // until the user "comes in"
};

canvas.addEventListener("pointerdown", (e) => {
  if (!look.enabled || (typeof rig !== "undefined" && rig.mode !== "free")) return;
  look.dragging = true;
  look.lastX = e.clientX;
  look.lastY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener("pointerup", (e) => {
  look.dragging = false;
  canvas.releasePointerCapture(e.pointerId);
});

camera.position.copy(ENTER_FROM);

/* ═══════════════ Sky: gradient dome, stars, moon ═══════════════ */

const sky = new THREE.Mesh(
  new THREE.SphereGeometry(90, 32, 20),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      cTop: { value: new THREE.Color(0x120c1c) },
      cMid: { value: new THREE.Color(0x2b1c3a) },
      cBot: { value: new THREE.Color(0x4b2c48) },
    },
    vertexShader: /* glsl */ `
      varying float vH;
      void main() {
        vH = normalize(position).y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 cTop; uniform vec3 cMid; uniform vec3 cBot;
      varying float vH;
      void main() {
        vec3 c = vH > 0.0 ? mix(cMid, cTop, smoothstep(0.0, 0.7, vH))
                          : mix(cMid, cBot, smoothstep(0.0, -0.5, vH));
        gl_FragColor = vec4(c, 1.0);
      }
    `,
  })
);
scene.add(sky);

// Stars
let starsMat;
{
  const n = 400;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(80);
    v.y = Math.abs(v.y) * 0.9 + 4;
    pos.set([v.x, v.y, v.z], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  starsMat = new THREE.PointsMaterial({ color: 0xfdf3e3, size: 0.14, sizeAttenuation: true, transparent: true, opacity: 0.8 });
  scene.add(new THREE.Points(g, starsMat));
}

// Moon by night, sun by day — same orb, regraded
const orb = new THREE.Mesh(
  new THREE.SphereGeometry(2.4, 24, 24),
  new THREE.MeshBasicMaterial({ color: 0xfff3d6 })
);
orb.position.set(6, 22, -60);
scene.add(orb);

/* ═══════════════ Lights ═══════════════ */

const ambient = new THREE.AmbientLight(0x7a689c, 0.9);
scene.add(ambient);
const hemi = new THREE.HemisphereLight(0x5a4a7a, 0xd96f43, 0.35);
scene.add(hemi);

const moonlight = new THREE.DirectionalLight(0xa8c4ff, 1.1);
moonlight.position.set(8, 16, -14);
moonlight.castShadow = true;
moonlight.shadow.mapSize.set(2048, 2048);
moonlight.shadow.camera.left = -14;
moonlight.shadow.camera.right = 14;
moonlight.shadow.camera.top = 14;
moonlight.shadow.camera.bottom = -14;
moonlight.shadow.bias = -0.002;
scene.add(moonlight);

/* ═══════════════ Room + critters + fireflies ═══════════════ */

const { room, interactives, windowWorldPos, radioNotes, materials, lamp, refs, zoneTargets } = buildRoom();
scene.add(room);

// In-scene content surfaces (decision 1C)
const surfaces = buildSurfaces();
refs.laptop.screen.material = new THREE.MeshBasicMaterial({ map: surfaces.screen });
refs.envelope.letter.material = new THREE.MeshBasicMaterial({ map: surfaces.letter, side: THREE.DoubleSide });
refs.photo.bioPanel.material = new THREE.MeshBasicMaterial({ map: surfaces.bio, side: THREE.DoubleSide });
refs.fashion.card.material = new THREE.MeshBasicMaterial({ map: surfaces.style, side: THREE.DoubleSide });

/* ═══════════════ Day / night moods (decision 4C) ═══════════════ */

// "Day" is a dreamy golden sunset: low sun streaming through the window,
// lamp off, long warm shadows. Night keeps the lamp-lit cabin mood.
const MOODS = {
  night: {
    skyTop: new THREE.Color(0x120c1c), skyMid: new THREE.Color(0x2b1c3a), skyBot: new THREE.Color(0x4b2c48),
    stars: 0.8,
    orb: new THREE.Color(0xfff3d6), orbPos: new THREE.Vector3(6, 22, -60),
    ambient: 0.3, ambientColor: new THREE.Color(0x9c8a7a), hemi: 0.12,
    dir: new THREE.Color(0xa8c4ff), dirIntensity: 1.0, dirPos: new THREE.Vector3(8, 16, -14),
    lampLight: 32, lampShade: 0.9, exposure: 1.0, env: 0.07,
    wall: new THREE.Color(0x8a7266), floor: new THREE.Color(0.55, 0.44, 0.36),
    trim: new THREE.Color(0.42, 0.3, 0.22), ceil: new THREE.Color(0x6a5a4c),
  },
  day: {
    skyTop: new THREE.Color(0x5a6ba8), skyMid: new THREE.Color(0xf2a878), skyBot: new THREE.Color(0xffc188),
    stars: 0,
    orb: new THREE.Color(0xffdba0), orbPos: new THREE.Vector3(3.5, 8.5, -60), // low sun, visible through the panes
    ambient: 0.5, ambientColor: new THREE.Color(0xffd9c0), hemi: 0.25,
    dir: new THREE.Color(0xffa860), dirIntensity: 4.4, dirPos: new THREE.Vector3(4.5, 6.5, -16), // shallow golden shaft
    lampLight: 0, lampShade: 0.05, exposure: 1.1, env: 0.32,
    wall: new THREE.Color(0xf7e6cd), floor: new THREE.Color(1.35, 1.05, 0.75), trim: new THREE.Color(0.95, 0.66, 0.45),
    ceil: new THREE.Color(0xf5ecdc),
  },
};

const _c = new THREE.Color();
function lerpC(target, a, b, k) {
  target.copy(_c.lerpColors(a, b, k));
}

function applyMood(k) {
  const n = MOODS.night, d = MOODS.day;
  const sky_ = sky.material.uniforms;
  lerpC(sky_.cTop.value, n.skyTop, d.skyTop, k);
  lerpC(sky_.cMid.value, n.skyMid, d.skyMid, k);
  lerpC(sky_.cBot.value, n.skyBot, d.skyBot, k);
  starsMat.opacity = THREE.MathUtils.lerp(n.stars, d.stars, k);
  lerpC(orb.material.color, n.orb, d.orb, k);
  orb.position.lerpVectors(n.orbPos, d.orbPos, k);
  moonlight.position.lerpVectors(n.dirPos, d.dirPos, k);
  lerpC(ambient.color, n.ambientColor, d.ambientColor, k);
  ambient.intensity = THREE.MathUtils.lerp(n.ambient, d.ambient, k);
  hemi.intensity = THREE.MathUtils.lerp(n.hemi, d.hemi, k);
  lerpC(moonlight.color, n.dir, d.dir, k);
  moonlight.intensity = THREE.MathUtils.lerp(n.dirIntensity, d.dirIntensity, k);
  lamp.light.intensity = THREE.MathUtils.lerp(n.lampLight, d.lampLight, k);
  lamp.shadeMat.emissiveIntensity = THREE.MathUtils.lerp(n.lampShade, d.lampShade, k);
  renderer.toneMappingExposure = THREE.MathUtils.lerp(n.exposure, d.exposure, k);
  lerpC(materials.wall.color, n.wall, d.wall, k);
  lerpC(materials.floor.color, n.floor, d.floor, k);
  lerpC(materials.trim.color, n.trim, d.trim, k);
  lerpC(materials.ceil.color, n.ceil, d.ceil, k);
  scene.environmentIntensity = THREE.MathUtils.lerp(n.env, d.env, k);
}

// Day by default — the bright storybook read is the brief
let moodMix = 1;
let moodTarget = 1;
applyMood(moodMix);
document.body.classList.add("day");

// Big owl on top of the bookshelf — clickable
const ollie = buildOwl({ scale: 1.05 });
ollie.group.position.set(-4.2, 4.95, 1.6);
ollie.group.rotation.y = Math.PI / 2.6;
ollie.group.traverse((o) => (o.userData.action = "owl"));
scene.add(ollie.group);
interactives.push({ object: ollie.group, action: "owl" });

// Small owl on the windowsill
const smallOwl = buildOwl({ scale: 0.5, accent: 0xf0a35e });
smallOwl.group.position.set(windowWorldPos.x - 0.7, windowWorldPos.y - 1.05, windowWorldPos.z + 0.35);
smallOwl.group.rotation.y = -0.4;
scene.add(smallOwl.group);

// Robin flying loops outside the window
const bird = buildBird({
  center: windowWorldPos.clone().add(new THREE.Vector3(0.5, 1.2, -4.5)),
  radius: 3.2,
  speed: 0.55,
});
scene.add(bird.group);

// Butterfly drifting near the window (7A)
const butterfly = buildButterfly({
  center: new THREE.Vector3(1.2, 3.1, -3.2),
  radius: 1.4,
  speed: REDUCED_MOTION ? 0.15 : 0.3,
});
scene.add(butterfly.group);

// Ollie's speech bubble (shows during the owl performance)
const bubble = new THREE.Sprite(
  new THREE.SpriteMaterial({ map: surfaces.bubble, transparent: true, opacity: 0, depthWrite: false })
);
bubble.position.set(-3.55, 5.45, 1.7);
bubble.scale.set(0.001, 0.001, 1);
scene.add(bubble);

/* ═══════════════ Choreography (three beats, decision 3A) ═══════════════ */

const rig = new Choreography({
  camera,
  interactives,
  refs: { ...refs, ollie },
  reducedMotion: REDUCED_MOTION,
});

/* ═══════════════ Post-processing: subtle bloom, film-ish finish ═══════════════ */

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.22, // strength — a whisper, not a glow party
  0.5,
  0.88
);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* ═══════════════ UI: loader, modal, hint, audio ═══════════════ */

const ambience = new Ambience();
const loader = document.getElementById("loader");
const loaderFill = document.getElementById("loader-fill");
const enterBtn = document.getElementById("enter-btn");
const hint = document.getElementById("hint");
const muteBtn = document.getElementById("mute-btn");
const modal = document.getElementById("modal");
const modalEyebrow = document.getElementById("modal-eyebrow");
const modalTitle = document.getElementById("modal-title");
const modalBody = document.getElementById("modal-body");

// Everything is procedural, so "loading" is theatre — but it sets the mood
// (and becomes real once you swap in GLB models with a LoadingManager).
let fakeProgress = 0;
const progressTimer = setInterval(() => {
  fakeProgress = Math.min(100, fakeProgress + 8 + Math.random() * 16);
  loaderFill.style.width = `${fakeProgress}%`;
  if (fakeProgress >= 100) {
    clearInterval(progressTimer);
    enterBtn.disabled = false;
  }
}, 140);

let entering = false;
let enterT = 0;

// No autoplay — the record player starts the music when the visitor asks
// (observed: even the site's author muted the auto-start on every load)
enterBtn.addEventListener("click", () => {
  loader.classList.add("hidden");
  document.body.classList.add("entered");
  entering = true;
});

muteBtn.addEventListener("click", () => {
  const playing = ambience.toggle();
  muteBtn.classList.toggle("muted", !playing);
});

const dayNightBtn = document.getElementById("daynight-btn");
dayNightBtn.addEventListener("click", () => {
  moodTarget = moodTarget > 0.5 ? 0 : 1;
  document.body.classList.toggle("day", moodTarget > 0.5);
  dayNightBtn.setAttribute("aria-pressed", String(moodTarget > 0.5));
});

function openModal(key) {
  const c = CONTENT[key];
  if (!c) return;
  modalEyebrow.textContent = c.eyebrow;
  modalTitle.textContent = c.title;
  modalBody.innerHTML = c.body;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

document.getElementById("modal-close").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});
window.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!stepBack()) closeModal();
});

/* ═══════════════ Raycasting ═══════════════ */

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(-10, -10);
const clickables = [...interactives.map((i) => i.object), ...zoneTargets];
let hovered = null;
let interacted = false;

function findAction(object) {
  let o = object;
  while (o) {
    if (o.userData.action) return o.userData.action;
    o = o.parent;
  }
  return null;
}

function findZone(object) {
  let o = object;
  while (o) {
    if (o.userData.zone) return o.userData.zone;
    o = o.parent;
  }
  return null;
}

function getHomePose() {
  _homePose.pos.copy(STAND);
  _homePose.dir.set(
    Math.sin(look.yaw) * Math.cos(look.pitch),
    Math.sin(look.pitch),
    Math.cos(look.yaw) * Math.cos(look.pitch)
  );
  return _homePose;
}

canvas.addEventListener("pointermove", (e) => {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  if (look.dragging) {
    // Grab-the-world: drag right looks left
    look.targetYaw += (e.clientX - look.lastX) * 0.0028;
    look.targetPitch += (e.clientY - look.lastY) * 0.0024;
    look.targetYaw = THREE.MathUtils.clamp(look.targetYaw, BASE_YAW - YAW_RANGE, BASE_YAW + YAW_RANGE);
    look.targetPitch = THREE.MathUtils.clamp(look.targetPitch, PITCH_MIN, PITCH_MAX);
    look.lastX = e.clientX;
    look.lastY = e.clientY;
  }
});

const backPill = document.getElementById("back-pill");
const srLive = document.getElementById("sr-live");

function plainText(action) {
  const s = SURFACES[action];
  if (!s) return "";
  if (action === "projects") return `${s.title}. ${s.items.map(([n, d]) => `${n}: ${d}`).join(" ")}`;
  if (action === "contact") return `${s.title}. ${s.lines.map(([l, v]) => `${l}: ${v}`).join(". ")}`;
  return `${s.title}. ${s.lines.join(" ")}`;
}

function stepBack() {
  const res = rig.back(getHomePose());
  if (res === "home") srLive.textContent = "";
  return !!res;
}

function markInteracted() {
  if (interacted) return;
  interacted = true;
  hint.classList.add("faded");
}

/** Item activation, only valid inside the item's zone. */
function activateItem(action) {
  if (action === "radio") {
    rig.performRadio();
    const playing = ambience.toggle();
    muteBtn.classList.toggle("muted", !playing);
    return;
  }
  if (rig.focusItem(action)) srLive.textContent = plainText(action);
}

canvas.addEventListener("click", (e) => {
  if (modal.classList.contains("open") || rig.traveling || entering) return;
  // Raycast from the click itself so taps (no hover) work too
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(clickables, true);
  const hit = hits.length ? hits[0].object : null;
  const action = hit ? findAction(hit) : null;
  const zone = hit ? findZone(hit) : null;
  if (action || zone) markInteracted();

  // Ollie performs from anywhere
  if (action === "owl") {
    rig.performOwl();
    ambience.hoot();
    return;
  }

  if (rig.mode === "free") {
    // Tier 1: clicking a zone (or anything in it) pans the camera over
    const z = action ? ZONE_OF[action] : zone;
    if (z) rig.goZone(z);
    return;
  }

  if (rig.mode === "zone") {
    if (action && ZONE_OF[action] === rig.zone) {
      // Tier 2: item in the current zone
      activateItem(action);
      return;
    }
    const z = action ? ZONE_OF[action] : zone;
    if (z && z !== rig.zone) {
      rig.goZone(z); // hop straight to another zone
      return;
    }
    stepBack(); // empty click → back home
    return;
  }

  if (rig.mode === "focused") stepBack();
});

backPill.addEventListener("click", stepBack);

// Keyboard access (5A): hidden proxy buttons focus = hover glow, Enter walks the tiers
for (const btn of document.querySelectorAll("#sr-nav button")) {
  const action = btn.dataset.action;
  btn.addEventListener("focus", () => rig.setHover(action));
  btn.addEventListener("blur", () => rig.setHover(null));
  btn.addEventListener("click", () => {
    if (rig.traveling) return;
    markInteracted();
    if (action === "owl") {
      rig.performOwl();
      ambience.hoot();
      return;
    }
    const z = ZONE_OF[action];
    if (rig.mode === "zone" && rig.zone === z) activateItem(action);
    else if (rig.mode === "focused") stepBack();
    else rig.goZone(z);
  });
}

/* ═══════════════ Loop ═══════════════ */

const clock = new THREE.Clock();
const _lookDir = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _homePose = { pos: new THREE.Vector3(), dir: new THREE.Vector3() };

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  // Camera intro glide: step from the doorway to the standpoint
  if (entering) {
    enterT += dt / (REDUCED_MOTION ? 0.25 : 2.8);
    const k = 1 - Math.pow(1 - Math.min(enterT, 1), 3); // ease-out cubic
    camera.position.lerpVectors(ENTER_FROM, STAND, k);
    if (enterT >= 1) {
      entering = false;
      look.enabled = true;
    }
  }

  // First-person look: smooth toward target, breathe a little.
  // The choreography rig owns the camera while traveling/focused.
  look.yaw += (look.targetYaw - look.yaw) * Math.min(1, dt * 7);
  look.pitch += (look.targetPitch - look.pitch) * Math.min(1, dt * 7);
  const sway = REDUCED_MOTION ? 0 : 1;
  const swayYaw = look.yaw + Math.sin(t * 0.32) * 0.006 * sway;
  const swayPitch = look.pitch + Math.sin(t * 0.47) * 0.004 * sway;
  _lookDir.set(
    Math.sin(swayYaw) * Math.cos(swayPitch),
    Math.sin(swayPitch),
    Math.cos(swayYaw) * Math.cos(swayPitch)
  );
  if (rig.mode === "free") {
    camera.lookAt(_lookTarget.copy(camera.position).add(_lookDir));
  }

  // Choreography: hover springs, camera travel, reveals, performances
  rig.update(dt, bubble);
  butterfly.update(t);
  document.body.classList.toggle("focused", rig.mode !== "free" && !entering);

  // Record spins while the music plays
  if (ambience.playing) refs.radio.knobs[0].rotation.y += dt * 3.2;

  // Candle flicker — layered sines read as flame, not strobe
  {
    const n = Math.sin(t * 11.3) * 0.5 + Math.sin(t * 17.7 + 1) * 0.3 + Math.sin(t * 29.1 + 2) * 0.2;
    const base = 1.7 - moodMix * 1.1; // dimmer by day
    refs.candle.light.intensity = base + n * (REDUCED_MOTION ? 0.12 : 0.4);
    refs.candle.flame.scale.set(1 + n * 0.12, 1 + n * 0.28, 1 + n * 0.12);
  }

  // Day/night crossfade
  if (Math.abs(moodTarget - moodMix) > 0.0008) {
    moodMix += (moodTarget - moodMix) * Math.min(1, dt * (REDUCED_MOTION ? 20 : 2.4));
    if (Math.abs(moodTarget - moodMix) <= 0.0008) moodMix = moodTarget;
    applyMood(moodMix);
  }

  ollie.update(t, dt);
  smallOwl.update(t + 5, dt);
  bird.update(t);

  // Radio notes float while music plays
  if (radioNotes) {
    for (const n of radioNotes.children) {
      const cycle = (t * 0.6 + n.userData.phase) % 2;
      n.position.y = 1.9 + cycle * 0.9;
      n.material.opacity = ambience.playing ? Math.max(0, 0.9 - cycle * 0.5) : 0;
    }
  }

  // Hover raycast — active at home and inside zones
  if (!modal.classList.contains("open") && !entering && (rig.mode === "free" || rig.mode === "zone")) {
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(clickables, true);
    const hit = hits.length ? hits[0].object : null;
    hovered = hit ? findAction(hit) : null;
    const zoneHover = hit ? findZone(hit) : null;
    if (!look.dragging) rig.setHover(hovered);
    document.body.classList.toggle("can-click", !!(hovered || zoneHover));
  } else {
    hovered = null;
    document.body.classList.toggle("can-click", rig.mode === "focused"); // clicking steps back
  }

  composer.render();
  requestAnimationFrame(tick);
}

tick();

// Dev hook for state inspection (harmless in prod)
window.__rig = rig;

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  composer.setSize(window.innerWidth, window.innerHeight);
});
