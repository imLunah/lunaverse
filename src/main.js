import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { buildRoom } from "./room.js";
import { modelsReady } from "./models.js";
import { buildOwl, buildBird } from "./creatures.js";
import { buildSurfaces, createHello, RESUME_W, RESUME_H } from "./surfaces.js";
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
const STAND = new THREE.Vector3(1.5, 3.0, 2.6);
const ENTER_FROM = new THREE.Vector3(-1.2, 3.1, 3.5); // stepping in from the door
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
  dragDistance: 0, // suppresses the click browsers fire after a look-drag
  lastX: 0,
  lastY: 0,
  enabled: false, // until the user "comes in"
};

canvas.addEventListener("pointerdown", (e) => {
  if (!look.enabled || (typeof rig !== "undefined" && rig.mode !== "free")) return;
  look.dragging = true;
  look.dragDistance = 0;
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

// Laptop screen = résumé: the plane shows a window of the tall canvas and
// wheel input slides texture.offset.y while the laptop is focused
const RESUME_VIEW = (RESUME_W * (0.64 / 1.02)) / RESUME_H; // plane is 1.02×0.64
surfaces.resume.repeat.set(1, RESUME_VIEW);
surfaces.resume.offset.y = 1 - RESUME_VIEW;
const resumeMat = new THREE.MeshBasicMaterial({ map: surfaces.resume });
refs.laptop.screen.material = resumeMat;

// Monitor = the self-writing "hello"
const hello = createHello(REDUCED_MOTION);
const helloMat = new THREE.MeshBasicMaterial({ map: hello.texture });
refs.monitor.screen.material = helloMat;

// Screens are unlit materials — dim them after dark or they bloom into glare
const screenMats = [resumeMat, helloMat];

refs.envelope.letter.material = new THREE.MeshBasicMaterial({ map: surfaces.letter, side: THREE.DoubleSide });
refs.photo.bioPanel.material = new THREE.MeshBasicMaterial({ map: surfaces.bio, side: THREE.DoubleSide });
refs.fashion.card.material = new THREE.MeshBasicMaterial({ map: surfaces.style, side: THREE.DoubleSide });

/* ═══════════════ Day / night moods (decision 4C) ═══════════════ */

// "Day" is a dreamy golden sunset: the interior stays dim (no lights are on)
// so the low sun through the window reads golden and blooms. Night keeps the
// lamp-lit cabin mood, with the moon hanging in the window.
const MOODS = {
  night: {
    skyTop: new THREE.Color(0x120c1c), skyMid: new THREE.Color(0x2b1c3a), skyBot: new THREE.Color(0x4b2c48),
    stars: 0.8,
    orb: new THREE.Color(0xdfe9f5), orbPos: new THREE.Vector3(2.8, 11, -60), // the moon, framed by the panes
    ambient: 0.48, ambientColor: new THREE.Color(0x9c8a7a), hemi: 0.22,
    dir: new THREE.Color(0xa8c4ff), dirIntensity: 1.0, dirPos: new THREE.Vector3(8, 16, -14),
    lampLight: 32, lampShade: 0.9, exposure: 1.0, env: 0.14, screens: 0.68,
    bloom: 0.25, bloomThreshold: 0.88,
    wall: new THREE.Color(0x8a7266), floor: new THREE.Color(0.55, 0.44, 0.36),
    trim: new THREE.Color(0.42, 0.3, 0.22), ceil: new THREE.Color(0x6a5a4c),
  },
  day: {
    skyTop: new THREE.Color(0x50619e), skyMid: new THREE.Color(0xf49a62), skyBot: new THREE.Color(0xffb070),
    stars: 0,
    orb: new THREE.Color(0xffd489), orbPos: new THREE.Vector3(3.5, 8.5, -60), // low sun, visible through the panes
    ambient: 0.22, ambientColor: new THREE.Color(0xffd9c0), hemi: 0.14,
    dir: new THREE.Color(0xff9848), dirIntensity: 5.6, dirPos: new THREE.Vector3(4.5, 5.8, -16), // shallow golden shaft
    lampLight: 0, lampShade: 0.05, exposure: 1.02, env: 0.15, screens: 0.78,
    bloom: 0.5, bloomThreshold: 0.76,
    wall: new THREE.Color(0xdcc4a4), floor: new THREE.Color(1.02, 0.78, 0.56), trim: new THREE.Color(0.74, 0.5, 0.34),
    ceil: new THREE.Color(0xcdbba2),
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
  const sc = THREE.MathUtils.lerp(n.screens, d.screens, k);
  for (const m of screenMats) m.color.setScalar(sc);
  bloom.strength = THREE.MathUtils.lerp(n.bloom, d.bloom, k);
  bloom.threshold = THREE.MathUtils.lerp(n.bloomThreshold, d.bloomThreshold, k);
}

let moodMix = 1;
let moodTarget = 1;


// Small owl on the windowsill — clickable: it hoots and says a line, and its
// eyes track the cursor from the sill (see the gaze block in tick)
const smallOwl = buildOwl({ scale: 0.5, accent: 0xf0a35e });
smallOwl.group.position.set(windowWorldPos.x - 0.7, windowWorldPos.y - 1.05, windowWorldPos.z + 0.35);
smallOwl.group.rotation.y = -0.4;
smallOwl.group.traverse((o) => (o.userData.action = "owl"));
scene.add(smallOwl.group);
interactives.push({ object: smallOwl.group, action: "owl" });

// Speech bubble sprite above the owl
const owlBubble = (() => {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 224;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false })
  );
  sprite.scale.set(1.55, 0.68, 1);
  sprite.position.copy(smallOwl.group.position).add(new THREE.Vector3(0.15, 0.85, 0.25));
  scene.add(sprite);
  return { ctx: c.getContext("2d"), tex, sprite, t: -1 };
})();

function owlSay(line) {
  const g = owlBubble.ctx;
  const W = 512, H = 224;
  g.clearRect(0, 0, W, H);
  // bubble with a little tail pointing down at the owl
  g.fillStyle = "#fdf3e3";
  g.strokeStyle = "#d96f43";
  g.lineWidth = 7;
  g.beginPath();
  g.roundRect(14, 14, W - 28, H - 74, 34);
  g.fill();
  g.stroke();
  g.beginPath();
  g.moveTo(180, H - 62);
  g.lineTo(150, H - 12);
  g.lineTo(230, H - 62);
  g.closePath();
  g.fill();
  g.strokeStyle = "#d96f43";
  g.beginPath();
  g.moveTo(180, H - 60);
  g.lineTo(150, H - 12);
  g.lineTo(230, H - 60);
  g.stroke();
  // text, wrapped to the bubble
  g.fillStyle = "#3b2b26";
  g.font = "600 36px Karla, sans-serif";
  g.textAlign = "center";
  const words = line.split(" ");
  const rows = [""];
  for (const word of words) {
    const probe = rows[rows.length - 1] ? `${rows[rows.length - 1]} ${word}` : word;
    if (g.measureText(probe).width > W - 90) rows.push(word);
    else rows[rows.length - 1] = probe;
  }
  const y0 = (H - 60) / 2 + 14 - (rows.length - 1) * 22;
  rows.forEach((row, i) => g.fillText(row, W / 2, y0 + i * 44));
  owlBubble.tex.needsUpdate = true;
  owlBubble.t = 0;
}

// Robin flying loops outside the window
const bird = buildBird({
  center: windowWorldPos.clone().add(new THREE.Vector3(0.5, 1.2, -4.5)),
  radius: 3.2,
  speed: 0.55,
});
scene.add(bird.group);


/* ═══════════════ Choreography (three beats, decision 3A) ═══════════════ */

const rig = new Choreography({
  camera,
  interactives,
  refs,
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

// Day (sunset) by default — applied here because the grade drives bloom too
applyMood(moodMix);
document.body.classList.add("day");

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
    look.dragDistance += Math.abs(e.clientX - look.lastX) + Math.abs(e.clientY - look.lastY);
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
  if (action === "projects") {
    const r = SURFACES.resume;
    const body = r.sections
      .map(
        (s) =>
          `${s.heading}: ` +
          s.entries.map((en) => `${en.title}${en.meta ? ` (${en.meta})` : ""}. ${en.lines.join(" ")}`).join(" ")
      )
      .join(" ");
    return `Résumé. ${r.name} — ${r.role}. ${body}`;
  }
  const s = SURFACES[action];
  if (!s) return "";
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
  if (rig.focusItem(action)) {
    if (action === "projects") {
      // the lid opens onto the résumé — start at the top
      resumeScroll = 0;
      surfaces.resume.offset.y = 1 - RESUME_VIEW;
      showHint("scroll to read the résumé · click away to close");
    }
    srLive.textContent = plainText(action);
  }
}

/** The owl performs from its sill: a hoot, a flap, a line of dialogue. */
let owlPerfT = -1;
let owlLineIdx = 0;
function performOwl() {
  markInteracted();
  ambience.hoot();
  owlPerfT = 0;
  const line = SURFACES.owl.lines[owlLineIdx++ % SURFACES.owl.lines.length];
  owlSay(line);
  srLive.textContent = `${SURFACES.owl.name} the owl says: ${line}`;
}

let hintTimer = 0;
function showHint(text) {
  hint.innerHTML = `<span class="hint-dot"></span> ${text}`;
  hint.classList.remove("faded");
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => hint.classList.add("faded"), 4500);
}

// Résumé scrolling while the laptop is focused
let resumeScroll = 0; // 0 = top of the page, 1 = bottom
window.addEventListener(
  "wheel",
  (e) => {
    if (rig.mode !== "focused" || rig.action !== "projects") return;
    e.preventDefault();
    resumeScroll = THREE.MathUtils.clamp(resumeScroll + e.deltaY * 0.00045, 0, 1);
    surfaces.resume.offset.y = (1 - RESUME_VIEW) * (1 - resumeScroll);
  },
  { passive: false }
);

canvas.addEventListener("click", (e) => {
  if (modal.classList.contains("open") || rig.traveling || entering) return;
  if (look.dragDistance > 6) {
    look.dragDistance = 0; // that was a look-around, not a click
    return;
  }
  // Raycast from the click itself so taps (no hover) work too
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(clickables, true);
  const hit = hits.length ? hits[0].object : null;
  const action = hit ? findAction(hit) : null;
  const zone = hit ? findZone(hit) : null;
  if (action || zone) markInteracted();

  // The owl performs in place from anywhere it can be seen
  if (action === "owl" && rig.mode !== "focused") {
    performOwl();
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
      performOwl();
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
const _gaze = new THREE.Vector3();
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
  rig.update(dt);
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

  // The monitor writes its "hello" over and over
  hello.update(dt);

  // Owl gaze: pupils follow a point a few meters out along the cursor's view
  // ray (unprojected NDC alone sits at the camera and reads as no movement)
  if (pointer.x >= -1 && pointer.x <= 1 && pointer.y >= -1 && pointer.y <= 1) {
    _gaze.set(pointer.x, pointer.y, 0.5).unproject(camera).sub(camera.position).normalize();
    _gaze.multiplyScalar(7).add(camera.position);
    smallOwl.setLookTarget(_gaze);
  } else {
    smallOwl.setLookTarget(null);
  }

  smallOwl.update(t + 5, dt);
  bird.update(t);

  // Owl performance: a bounce and a wing flap after a click (post-update so it wins)
  if (owlPerfT >= 0) {
    owlPerfT += dt / 1.15;
    const p = Math.min(owlPerfT, 1);
    const flap = Math.abs(Math.sin(p * Math.PI * 4)) * (1 - p);
    for (const w of smallOwl.wings) w.rotation.z = w.userData.side * (0.25 + flap * 1.05);
    smallOwl.group.scale.setScalar(0.5 * (1 + Math.sin(p * Math.PI) * 0.09));
    if (owlPerfT >= 1) {
      owlPerfT = -1;
      smallOwl.group.scale.setScalar(0.5);
      for (const w of smallOwl.wings) w.rotation.z = w.userData.side * 0.25;
    }
  }

  // Speech bubble: pop in, linger, fade
  if (owlBubble.t >= 0) {
    owlBubble.t += dt;
    const bt = owlBubble.t;
    owlBubble.sprite.material.opacity =
      (bt < 0.22 ? bt / 0.22 : bt < 3.4 ? 1 : Math.max(0, 1 - (bt - 3.4) / 0.6)) * 0.96;
    if (bt > 4.2) owlBubble.t = -1;
  }

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

// Hover glow needs the async GLB materials once they're in
modelsReady().then(() => rig.refreshMats());

// Dev hooks for state inspection (harmless in prod)
window.__rig = rig;
window.__owlBubble = owlBubble;

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  composer.setSize(window.innerWidth, window.innerHeight);
});
