import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { woodPlanks, woodGrain, plasterBump, fabricBump } from "./textures.js";

/**
 * The room, rebuilt to the warm wood reference (2026-07-12): wood-paneled
 * walls, dark plank floor, ceiling beams, bed, record player, hanging plants,
 * curtains, skateboard, and an avant-garde fashion corner. Expanded to 14×12 m
 * so more things fit later. All procedural placeholder geometry over scanned
 * CC0 PBR textures — swap for a Blender GLB when ready (keep userData.action
 * tags: about / projects / contact / radio / owl / style).
 */

const PALETTE = {
  wood: 0x6e4a30,
  woodLight: 0x9c7351,
  cream: 0xf3e5c8,
  ember: 0xd96f43,
  amber: 0xf0a35e,
  moss: 0x7c8a5a,
  screen: 0xbfe8d8,
  dark: 0x35262b,
  rug: 0xb75c4a,
  rugTrim: 0xe8c99b,
  charcoal: 0x22201f,
  rust: 0x7a3f28,
};

// Room shell: x spans -5..9, z spans -5..7, walls 6 high
const RX = 14, RZ = 12, CX = 2, CZ = 1, WALL_H = 6;
const BACK_Z = -5 + 0.15;

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05, ...opts });
}

// Soft edges everywhere — hard box edges are what read as "low poly"
function box(w, h, d, material, x = 0, y = 0, z = 0) {
  const r = Math.min(0.045, Math.min(w, h, d) * 0.24);
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, r), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// Cute-cartoony surfaces (design-review 2026-07-12): clean stylized albedo,
// realism comes from the LIGHTING (IBL, soft shadows, bloom), not photo scans.
const FURN_WOOD = woodGrain();
const FABRIC = fabricBump();

function woodMat(hex, opts = {}) {
  const m = mat(0xffffff, { map: FURN_WOOD, roughness: 0.72, ...opts });
  m.color.set(hex).multiplyScalar(1.35).addScalar(0.12); // grain base is light — gentle tint
  return m;
}

function fabricMat(hex, opts = {}) {
  return mat(hex, { roughness: 1, bumpMap: FABRIC, bumpScale: 0.4, ...opts });
}

function mulberry(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Canvas texture that says "your photo here" — swap for a real image later. */
function placeholderPhotoTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 640;
  const g = c.getContext("2d");
  g.fillStyle = "#f3e5c8";
  g.fillRect(0, 0, 512, 640);
  g.strokeStyle = "#b9a488";
  g.setLineDash([20, 16]);
  g.lineWidth = 8;
  g.strokeRect(32, 32, 448, 576);
  g.setLineDash([]);
  g.fillStyle = "#8a7357";
  g.font = "144px serif";
  g.textAlign = "center";
  g.fillText("🦉", 256, 300);
  g.font = "600 44px Karla, sans-serif";
  g.fillText("your photo", 256, 420);
  g.fillText("here", 256, 476);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** "hello" in handwriting for the monitor, like the reference render. */
function helloTexture() {
  const c = document.createElement("canvas");
  c.width = 640;
  c.height = 400;
  const g = c.getContext("2d");
  const grad = g.createLinearGradient(0, 0, 0, 400);
  grad.addColorStop(0, "#fdf8ee");
  grad.addColorStop(1, "#f1e4cd");
  g.fillStyle = grad;
  g.fillRect(0, 0, 640, 400);
  g.fillStyle = "#4a382e";
  g.font = "150px 'Homemade Apple', cursive";
  g.textAlign = "center";
  g.fillText("hello", 320, 240);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildDesk(interactives, refs) {
  const desk = new THREE.Group();
  const top = box(3.4, 0.16, 1.5, woodMat(PALETTE.wood), 0, 1.55, 0);
  const legMat = woodMat(PALETTE.dark);
  const legs = [
    [-1.5, 0.775, -0.6],
    [1.5, 0.775, -0.6],
    [-1.5, 0.775, 0.6],
    [1.5, 0.775, 0.6],
  ].map(([x, y, z]) => box(0.14, 1.55, 0.14, legMat, x, y, z));
  desk.add(top, ...legs);

  // Laptop — clickable → projects. Lid hinges at the back edge; idle is
  // nearly closed, the focus choreography opens it (beat 3).
  const laptop = new THREE.Group();
  const base = box(1.15, 0.06, 0.8, mat(PALETTE.dark, { roughness: 0.4 }));
  const lidGroup = new THREE.Group();
  lidGroup.position.set(0, 0.03, -0.4);
  const lid = box(1.15, 0.78, 0.05, mat(PALETTE.dark, { roughness: 0.4 }), 0, 0.39, 0);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.02, 0.64),
    new THREE.MeshBasicMaterial({ color: PALETTE.screen })
  );
  screen.position.set(0, 0.39, 0.032);
  lidGroup.add(lid, screen);
  lidGroup.rotation.x = 1.42; // idle: nearly closed
  laptop.add(base, lidGroup);
  laptop.position.set(-0.85, 1.66, 0.1);
  laptop.rotation.y = 0.24;
  laptop.traverse((o) => (o.userData.action = "projects"));
  desk.add(laptop);
  interactives.push({ object: laptop, action: "projects" });
  refs.laptop = { lidGroup, screen };

  // Monitor with a handwritten "hello", like the reference
  const monitor = new THREE.Group();
  const frame = box(1.34, 0.86, 0.07, mat(PALETTE.charcoal, { roughness: 0.35 }), 0, 0.95, 0);
  const mScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.22, 0.74),
    new THREE.MeshBasicMaterial({ map: helloTexture() })
  );
  mScreen.position.set(0, 0.95, 0.045);
  const stand = box(0.1, 0.5, 0.1, mat(PALETTE.charcoal, { roughness: 0.35 }), 0, 0.3, -0.06);
  const foot = box(0.5, 0.05, 0.3, mat(PALETTE.charcoal, { roughness: 0.35 }), 0, 0.05, 0);
  monitor.add(frame, mScreen, stand, foot);
  monitor.position.set(0.85, 1.63, -0.35);
  monitor.rotation.y = -0.08;
  desk.add(monitor);

  // Keyboard in front of the monitor
  const keyboard = box(0.85, 0.045, 0.3, mat(0xe7dcc4, { roughness: 0.6 }), 0.8, 1.66, 0.35);
  keyboard.rotation.y = -0.06;
  desk.add(keyboard);

  // Envelope — clickable → contact. The letter rises out on focus.
  const envelope = new THREE.Group();
  const paper = box(0.62, 0.04, 0.42, mat(PALETTE.cream, { roughness: 0.6 }));
  const seal = new THREE.Mesh(new THREE.CircleGeometry(0.07, 20), new THREE.MeshBasicMaterial({ color: PALETTE.ember }));
  seal.rotation.x = -Math.PI / 2;
  seal.position.y = 0.025;
  const letter = new THREE.Mesh(
    new THREE.PlaneGeometry(0.52, 0.7),
    new THREE.MeshBasicMaterial({ color: PALETTE.cream, side: THREE.DoubleSide })
  );
  letter.scale.setScalar(0.001);
  letter.position.set(0, 0.05, 0);
  envelope.add(paper, seal, letter);
  envelope.position.set(0.15, 1.66, 0.5);
  envelope.rotation.y = -0.35;
  envelope.traverse((o) => (o.userData.action = "contact"));
  desk.add(envelope);
  interactives.push({ object: envelope, action: "contact" });
  refs.envelope = { letter };

  return desk;
}

function buildOfficeChair() {
  const chair = new THREE.Group();
  const gray = mat(0x8a8580, { roughness: 0.7 });
  const dark = mat(PALETTE.charcoal, { roughness: 0.4, metalness: 0.4 });
  const seat = box(0.62, 0.1, 0.58, gray, 0, 0.78, 0);
  const back = box(0.58, 0.75, 0.09, gray, 0, 1.35, 0.28);
  back.rotation.x = 0.12;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 10), dark);
  post.position.y = 0.5;
  chair.add(seat, back, post);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const leg = box(0.35, 0.04, 0.06, dark, Math.cos(a) * 0.2, 0.12, Math.sin(a) * 0.2);
    leg.rotation.y = -a;
    const wheel = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), dark);
    wheel.position.set(Math.cos(a) * 0.36, 0.05, Math.sin(a) * 0.36);
    chair.add(leg, wheel);
  }
  return chair;
}

function buildBed() {
  const bed = new THREE.Group();
  const frame = box(2.2, 0.35, 3.2, woodMat(PALETTE.wood), 0, 0.28, 0);
  const headboard = box(2.2, 1.1, 0.14, woodMat(PALETTE.wood), 0, 0.9, -1.55);
  const mattress = box(2.0, 0.28, 3.0, fabricMat(0xefe4cd), 0, 0.58, 0);
  // Duvet folded over the lower two-thirds
  const duvet = box(2.08, 0.18, 2.0, fabricMat(0xe3cba4), 0, 0.72, 0.45);
  bed.add(frame, headboard, mattress, duvet);
  const pillowMat = fabricMat(0xf6ecd8);
  for (const [x, r] of [[-0.5, 0.25], [0.52, -0.2]]) {
    const p = box(0.78, 0.2, 0.5, pillowMat, x, 0.78, -1.1);
    p.rotation.z = r * 0.3;
    p.rotation.y = r;
    bed.add(p);
  }
  // Rust throw cushion, like the reference
  const cushion = box(0.42, 0.16, 0.42, fabricMat(PALETTE.rust), 0.1, 0.86, -0.35);
  cushion.rotation.y = 0.6;
  bed.add(cushion);
  return bed;
}

function buildRecordPlayer(interactives, refs) {
  const g = new THREE.Group();
  // Low wooden bench
  g.add(
    box(1.7, 0.1, 0.75, woodMat(PALETTE.woodLight), 0, 0.5, 0),
    box(0.1, 0.5, 0.62, woodMat(PALETTE.wood), -0.72, 0.25, 0),
    box(0.1, 0.5, 0.62, woodMat(PALETTE.wood), 0.72, 0.25, 0)
  );

  // Suitcase record player — clickable → music (keeps action "radio")
  const player = new THREE.Group();
  const caseMat = mat(PALETTE.rust, { roughness: 0.6 });
  const body = box(0.85, 0.24, 0.62, caseMat, 0, 0.68, 0);
  const lid = box(0.85, 0.2, 0.62, caseMat, 0, 0.98, -0.36);
  lid.rotation.x = -1.85; // propped open
  const lining = box(0.75, 0.06, 0.52, fabricMat(0xe7d9bd), 0, 0.99, -0.33);
  lining.rotation.x = -1.85;
  const platter = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.035, 28),
    mat(0x1c1a19, { roughness: 0.35 })
  );
  platter.position.set(-0.1, 0.82, 0.02);
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 16), mat(PALETTE.amber, { roughness: 0.5 }));
  label.position.set(-0.1, 0.825, 0.02);
  const tonearm = box(0.3, 0.03, 0.04, mat(0xd9cfc0, { roughness: 0.3, metalness: 0.5 }), 0.22, 0.86, 0.1);
  tonearm.rotation.y = 0.7;
  const latch = box(0.1, 0.05, 0.04, mat(PALETTE.amber, { metalness: 0.6, roughness: 0.3 }), 0, 0.6, 0.32);
  player.add(body, lid, lining, platter, label, tonearm, latch);
  player.traverse((o) => (o.userData.action = "radio"));
  g.add(player);
  interactives.push({ object: player, action: "radio" });
  refs.radio = { body: player, knobs: [platter], antenna: tonearm };

  // Records leaning next to the player
  for (let i = 0; i < 4; i++) {
    const sleeve = box(0.02, 0.42, 0.42, mat([0x3a3a45, 0x6b3a2a, 0xd9cfc0, 0x22201f][i], { roughness: 0.8 }), -0.62 + i * 0.035, 0.77, 0.05);
    sleeve.rotation.z = -0.08 - i * 0.02;
    g.add(sleeve);
  }

  // Music notes float up while playing (toggled from main.js)
  const notes = new THREE.Group();
  notes.name = "radio-notes";
  const noteMat = new THREE.MeshBasicMaterial({ color: PALETTE.amber, transparent: true, opacity: 0 });
  for (let i = 0; i < 3; i++) {
    const n = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), noteMat.clone());
    n.position.set((i - 1) * 0.16, 1.25, 0);
    n.userData.phase = i * 2.1;
    notes.add(n);
  }
  g.add(notes);
  return g;
}

function buildBookshelf() {
  const shelf = new THREE.Group();
  const frame = woodMat(PALETTE.wood);
  shelf.add(
    box(0.14, 4.4, 1.1, frame, -1.1, 2.2, 0),
    box(0.14, 4.4, 1.1, frame, 1.1, 2.2, 0),
    box(2.34, 0.12, 1.1, frame, 0, 0.5, 0),
    box(2.34, 0.12, 1.1, frame, 0, 1.75, 0),
    box(2.34, 0.12, 1.1, frame, 0, 3.0, 0),
    box(2.34, 0.12, 1.1, frame, 0, 4.35, 0)
  );
  const bookColors = [PALETTE.ember, PALETTE.amber, PALETTE.moss, PALETTE.cream, 0x9b6a8f, 0x5a7a8c];
  const rng = mulberry(7);
  for (const shelfY of [0.56, 1.81, 3.06]) {
    let x = -0.95;
    while (x < 0.85) {
      const w = 0.1 + rng() * 0.12;
      const h = 0.55 + rng() * 0.4;
      const b = box(w, h, 0.7, mat(bookColors[Math.floor(rng() * bookColors.length)], { roughness: 0.9 }), x + w / 2, shelfY + h / 2, 0);
      b.rotation.z = (rng() - 0.5) * 0.06;
      shelf.add(b);
      x += w + 0.025;
    }
  }
  return shelf;
}

function buildWallShelves() {
  const g = new THREE.Group();
  const rng = mulberry(21);
  for (const y of [3.1, 4.0]) {
    g.add(box(2.6, 0.09, 0.5, woodMat(PALETTE.woodLight), 0, y, 0));
    // brackets
    g.add(box(0.06, 0.3, 0.4, woodMat(PALETTE.wood), -1.1, y - 0.18, -0.02));
    g.add(box(0.06, 0.3, 0.4, woodMat(PALETTE.wood), 1.1, y - 0.18, -0.02));
  }
  // Books on the top shelf
  let x = -1.15;
  while (x < 0.1) {
    const w = 0.09 + rng() * 0.1;
    const h = 0.4 + rng() * 0.25;
    const b = box(w, h, 0.34, mat([0xd9cfc0, 0x6b3a2a, 0x3a3a45, PALETTE.moss][Math.floor(rng() * 4)], { roughness: 0.9 }), x + w / 2, 4.05 + h / 2, 0);
    b.rotation.z = (rng() - 0.5) * 0.05;
    g.add(b);
    x += w + 0.02;
  }
  // Alarm clock, like the reference
  const clock = new THREE.Group();
  const face = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 20), mat(PALETTE.amber, { roughness: 0.4 }));
  face.rotation.x = Math.PI / 2;
  face.position.y = 0.16;
  const dial = new THREE.Mesh(new THREE.CircleGeometry(0.1, 20), new THREE.MeshBasicMaterial({ color: 0xfdf6e9 }));
  dial.position.set(0, 0.16, 0.045);
  for (const s of [-1, 1]) {
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), mat(PALETTE.ember, { roughness: 0.4 }));
    bell.position.set(s * 0.08, 0.29, 0);
    clock.add(bell);
  }
  clock.add(face, dial);
  clock.position.set(0.55, 4.05, 0.02);
  g.add(clock);
  // Mug
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.18, 16), mat(PALETTE.moss, { roughness: 0.7 }));
  mug.position.set(0.95, 3.24, 0);
  g.add(mug);
  return g;
}

function buildHangingPlant() {
  const g = new THREE.Group();
  const rng = mulberry(53);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.2, 12), mat(0xc98a5e, { roughness: 0.9 }));
  g.add(pot);
  const leafMat = mat(PALETTE.moss, { roughness: 1 });
  for (let v = 0; v < 5; v++) {
    const a = (v / 5) * Math.PI * 2 + rng();
    let px = Math.cos(a) * 0.12, pz = Math.sin(a) * 0.12, py = -0.02;
    const len = 4 + Math.floor(rng() * 5);
    for (let i = 0; i < len; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.05 + rng() * 0.025, 8, 6), leafMat);
      leaf.scale.set(1.4, 0.7, 1);
      leaf.position.set(px, py, pz);
      leaf.rotation.z = rng();
      g.add(leaf);
      py -= 0.11 + rng() * 0.05;
      px += (rng() - 0.5) * 0.06;
      pz += (rng() - 0.5) * 0.06;
    }
  }
  return g;
}

function buildCurtains() {
  const g = new THREE.Group();
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 3.4, 10), woodMat(PALETTE.wood));
  rod.rotation.z = Math.PI / 2;
  rod.position.y = 4.75;
  g.add(rod);
  const curtainMat = fabricMat(0xf0e2c6);
  for (const s of [-1, 1]) {
    const panel = box(0.55, 3.4, 0.1, curtainMat, s * 1.5, 3.0, 0.08);
    panel.rotation.y = s * 0.06;
    g.add(panel);
  }
  return g;
}

function buildSkateboard() {
  const g = new THREE.Group();
  const deck = box(0.62, 0.045, 1.85, woodMat(0x8a5a36), 0, 0, 0);
  const wheelMat = mat(0xf0d9a8, { roughness: 0.5 });
  for (const [x, z] of [[-0.2, -0.6], [0.2, -0.6], [-0.2, 0.6], [0.2, 0.6]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 12), wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.07, z);
    g.add(w);
  }
  return g;
}

/** Avant-garde fashion corner: garment rack, dress form, mirror, boots. Clickable → style. */
function buildFashionCorner(interactives, refs) {
  const g = new THREE.Group();
  const rackMat = mat(PALETTE.charcoal, { roughness: 0.35, metalness: 0.55 });

  // Rack: two uprights + crossbar (runs along z, faces -x into the room)
  const rack = new THREE.Group();
  rack.add(
    box(0.06, 2.2, 0.06, rackMat, 0, 1.1, -0.85),
    box(0.06, 2.2, 0.06, rackMat, 0, 1.1, 0.85),
    box(0.05, 0.05, 1.85, rackMat, 0, 2.18, 0),
    box(0.4, 0.05, 0.05, rackMat, 0, 0.05, -0.85),
    box(0.4, 0.05, 0.05, rackMat, 0, 0.05, 0.85)
  );

  // Sculptural garments — draped, asymmetric, monochrome-leaning
  const rng = mulberry(99);
  const garmentSpecs = [
    { c: 0x1c1a19, w: 0.5, h: 1.5, drape: 0.35 }, // long black draped coat
    { c: 0xd9cfc0, w: 0.42, h: 1.1, drape: 0.2 }, // cream layered tunic
    { c: PALETTE.rust, w: 0.36, h: 0.9, drape: 0.28 }, // rust wrap
    { c: 0x3a3a45, w: 0.46, h: 1.3, drape: 0.4 }, // charcoal-blue asymmetric
  ];
  let hz = -0.62;
  for (const spec of garmentSpecs) {
    const hanger = box(0.3, 0.03, 0.03, rackMat, 0, 2.1, hz);
    const garment = new THREE.Group();
    // body of the garment: tapered, off-axis drape
    const cloth = new THREE.Mesh(
      new THREE.CylinderGeometry(spec.w * 0.32, spec.w * 0.62, spec.h, 10),
      fabricMat(spec.c)
    );
    cloth.position.y = 2.05 - spec.h / 2;
    cloth.rotation.z = (rng() - 0.5) * 0.12;
    cloth.scale.z = 0.55;
    // asymmetric panel
    const panel = box(spec.w * 0.5, spec.h * 0.7, 0.05, fabricMat(spec.c), spec.w * 0.28, 2.0 - spec.h * 0.4, spec.drape * 0.3);
    panel.rotation.z = -spec.drape;
    garment.add(cloth, panel);
    garment.position.z = hz;
    rack.add(hanger, garment);
    hz += 0.42;
  }
  rack.position.set(0.4, 0, 0);
  g.add(rack);

  // Dress form on a stand, wearing an angular cape
  const form = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.5, 6, 14), fabricMat(0xcbbba2));
  torso.position.y = 1.45;
  torso.scale.set(1, 1, 0.72);
  const cape = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.9, 8, 1, true), fabricMat(0x1c1a19, { side: THREE.DoubleSide }));
  cape.position.y = 1.35;
  cape.rotation.z = 0.16;
  cape.scale.z = 0.7;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 10), rackMat);
  pole.position.y = 0.55;
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.05, 14), rackMat);
  foot.position.y = 0.03;
  form.add(torso, cape, pole, foot);
  form.position.set(-0.7, 0, 1.5);
  g.add(form);

  // Statement boots by the rack
  for (const [z, r] of [[-0.95, 0.2], [-0.65, -0.15]]) {
    const boot = new THREE.Group();
    const shaft = box(0.14, 0.42, 0.18, fabricMat(0x1c1a19), 0, 0.28, 0);
    const toe = box(0.14, 0.09, 0.3, fabricMat(0x1c1a19), 0, 0.06, 0.09);
    const sole = box(0.16, 0.06, 0.34, mat(0xd9cfc0, { roughness: 0.5 }), 0, 0.015, 0.08);
    boot.add(shaft, toe, sole);
    boot.position.set(-0.15, 0, z);
    boot.rotation.y = r;
    g.add(boot);
  }

  // Stack of fashion books
  let by = 0;
  for (const c of [0x1c1a19, 0xd9cfc0, PALETTE.rust]) {
    g.add(box(0.42, 0.06, 0.32, mat(c, { roughness: 0.8 }), -0.75, by + 0.03, 0.6));
    by += 0.062;
  }

  // Lookbook card — reveal surface for the style focus (beat 3)
  const card = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 0.8),
    new THREE.MeshBasicMaterial({ color: PALETTE.cream, side: THREE.DoubleSide })
  );
  card.scale.setScalar(0.001);
  card.position.set(-0.9, 1.7, 0);
  g.add(card);

  g.traverse((o) => (o.userData.action = "style"));
  interactives.push({ object: g, action: "style" });
  refs.fashion = { card };
  return g;
}

function buildLamp() {
  const refs = {};
  const lamp = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.4, 12), mat(PALETTE.dark, { roughness: 0.4 }));
  pole.position.y = 1.7;
  pole.castShadow = true;
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.46, 0.1, 20), mat(PALETTE.dark, { roughness: 0.4 }));
  foot.position.y = 0.05;
  const shade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.62, 0.7, 20, 1, true),
    new THREE.MeshStandardMaterial({
      color: PALETTE.amber,
      emissive: PALETTE.amber,
      emissiveIntensity: 0.85,
      side: THREE.DoubleSide,
      roughness: 0.7,
    })
  );
  shade.position.y = 3.35;
  refs.shadeMat = shade.material;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffe8c0 }));
  bulb.position.y = 3.2;
  lamp.add(pole, foot, shade, bulb);

  const light = new THREE.PointLight(0xffb46b, 30, 14, 1.8);
  light.position.y = 3.3;
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.bias = -0.004;
  lamp.add(light);
  refs.light = light;
  return { group: lamp, refs };
}

function buildPhotoFrame(interactives, refs) {
  const group = new THREE.Group();
  const frame = box(1.15, 1.45, 0.08, woodMat(PALETTE.woodLight));
  const photo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.95, 1.22),
    new THREE.MeshStandardMaterial({ map: placeholderPhotoTexture(), roughness: 0.9 })
  );
  photo.position.z = 0.05;
  const bioPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 1.05),
    new THREE.MeshBasicMaterial({ color: PALETTE.cream, side: THREE.DoubleSide })
  );
  bioPanel.scale.setScalar(0.001);
  bioPanel.position.set(0, -0.1, 0.03);
  group.add(frame, photo, bioPanel);
  group.traverse((o) => (o.userData.action = "about"));
  interactives.push({ object: group, action: "about" });
  refs.photo = { group, bioPanel };
  return group;
}

function buildWindow() {
  const group = new THREE.Group();
  const frameMat = mat(PALETTE.cream, { roughness: 0.7 });
  group.add(
    box(2.6, 0.14, 0.18, frameMat, 0, 1.3, 0),
    box(2.6, 0.14, 0.18, frameMat, 0, -1.3, 0),
    box(0.14, 2.74, 0.18, frameMat, -1.23, 0, 0),
    box(0.14, 2.74, 0.18, frameMat, 1.23, 0, 0),
    box(0.08, 2.6, 0.1, frameMat, 0, 0, 0),
    box(2.46, 0.08, 0.1, frameMat, 0, 0, 0)
  );
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(2.46, 2.6),
    new THREE.MeshBasicMaterial({ color: 0x7fa0c8, transparent: true, opacity: 0.08 })
  );
  group.add(glass);
  group.add(box(2.9, 0.12, 0.5, frameMat, 0, -1.42, 0.16));
  return group;
}

/**
 * Builds the full room. Returns { room, interactives, windowWorldPos,
 * radioNotes, materials, lamp, refs }.
 */
export function buildRoom() {
  const interactives = [];
  const refs = {};
  const room = new THREE.Group();

  // Shared materials the day/night grade lerps (see MOODS in main.js).
  // Clean stylized: plank lines on the floor, soft plaster walls, honey trim.
  const floorMat = mat(0xffffff, { map: woodPlanks([4, 3.5]), roughness: 0.7, metalness: 0 });
  const wallMat = mat(0xf7e6cd, { roughness: 0.95, bumpMap: plasterBump([4, 2.4]), bumpScale: 0.35 });
  const trimMat = woodMat(PALETTE.wood);
  const ceilMat = mat(0xf2e6d4, { roughness: 0.95, bumpMap: plasterBump([5, 4]), bumpScale: 0.25 });

  // Floor + rug
  const floor = box(RX, 0.35, RZ, floorMat, CX, -0.175, CZ);
  floor.receiveShadow = true;
  room.add(floor);

  const rugMat = mat(0xe0836a, { roughness: 1, bumpMap: FABRIC, bumpScale: 0.4 }); // flat coral, woven feel
  const rug = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.05, 64), rugMat);
  rug.position.set(0.6, 0.03, 0.8);
  rug.receiveShadow = true;
  const rugTrim = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.045, 8, 60), mat(PALETTE.rugTrim, { roughness: 1 }));
  rugTrim.rotation.x = Math.PI / 2;
  rugTrim.position.set(0.6, 0.06, 0.8);
  room.add(rug, rugTrim);

  // Back wall with the window hole (window unchanged at x 1.4)
  const winW = 2.6, winH = 2.8, winCx = 1.4, winCy = 3.1;
  const wz = BACK_Z;
  const leftW = winCx - winW / 2 - -5; // -5 .. 0.1
  const rightW = 9 - (winCx + winW / 2); // 2.7 .. 9
  room.add(
    box(RX, winCy - winH / 2, 0.3, wallMat, CX, (winCy - winH / 2) / 2, wz),
    box(RX, WALL_H - (winCy + winH / 2), 0.3, wallMat, CX, (WALL_H + winCy + winH / 2) / 2, wz),
    box(leftW, winH, 0.3, wallMat, -5 + leftW / 2, winCy, wz),
    box(rightW, winH, 0.3, wallMat, 9 - rightW / 2, winCy, wz)
  );

  const win = buildWindow();
  win.position.set(winCx, winCy, wz);
  room.add(win);

  const curtains = buildCurtains();
  curtains.position.set(winCx, 0, wz + 0.18);
  room.add(curtains);

  // Remaining shell: left, right, near walls + ceiling with beams
  room.add(
    box(0.3, WALL_H, RZ, wallMat, -4.85, WALL_H / 2, CZ),
    box(0.3, WALL_H, RZ, wallMat, 8.85, WALL_H / 2, CZ),
    box(RX, WALL_H, 0.3, wallMat, CX, WALL_H / 2, 6.85)
  );
  const ceiling = box(RX, 0.3, RZ, ceilMat, CX, WALL_H + 0.15, CZ);
  ceiling.castShadow = false;
  room.add(ceiling);
  for (const bx of [-2.2, 2, 6.2]) {
    room.add(box(0.28, 0.24, RZ, woodMat(PALETTE.wood), bx, WALL_H - 0.12, CZ));
  }

  // Baseboards + panel rail (the horizontal line the reference paneling has)
  room.add(
    box(RX, 0.3, 0.12, trimMat, CX, 0.15, wz + 0.21),
    box(0.12, 0.3, RZ, trimMat, -4.64, 0.15, CZ),
    box(0.12, 0.3, RZ, trimMat, 8.64, 0.15, CZ),
    box(RX, 0.3, 0.12, trimMat, CX, 0.15, 6.64),
    box(RX, 0.1, 0.08, trimMat, CX, 2.65, wz + 0.19),
    box(0.08, 0.1, RZ, trimMat, -4.66, 2.65, CZ),
    box(0.08, 0.1, RZ, trimMat, 8.66, 2.65, CZ)
  );

  // Door on the right wall
  const door = new THREE.Group();
  const doorFrameMat = mat(PALETTE.cream, { roughness: 0.7 });
  const doorMat = woodMat(PALETTE.wood);
  door.add(
    box(0.16, 4.3, 0.22, doorFrameMat, 0, 2.15, -0.93),
    box(0.16, 4.3, 0.22, doorFrameMat, 0, 2.15, 0.93),
    box(0.16, 0.22, 2.0, doorFrameMat, 0, 4.2, 0),
    box(0.1, 4.1, 1.7, doorMat, 0, 2.05, 0)
  );
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), mat(PALETTE.amber, { roughness: 0.4, metalness: 0.4 }));
  knob.position.set(-0.11, 2.0, 0.6);
  door.add(knob);
  door.position.set(8.68, 0, -1.4);
  room.add(door);

  // ── Furniture ──
  const desk = buildDesk(interactives, refs);
  desk.position.set(-2.2, 0, -3.4);
  room.add(desk);
  refs.desk = desk;
  // Zone tag: clicking the desk area pans the camera over (items keep their action tags)
  desk.traverse((o) => {
    if (!o.userData.action) o.userData.zone = "desk";
  });

  const chair = buildOfficeChair();
  chair.position.set(-2.3, 0, -2.0);
  chair.rotation.y = Math.PI + 0.35;
  room.add(chair);
  chair.traverse((o) => (o.userData.zone = "desk"));

  const shelf = buildBookshelf();
  shelf.position.set(-4.2, 0, 1.6);
  shelf.rotation.y = Math.PI / 2;
  room.add(shelf);
  shelf.traverse((o) => (o.userData.zone = "gallery"));

  const wallShelves = buildWallShelves();
  wallShelves.position.set(-2.6, 0, wz + 0.42);
  room.add(wallShelves);

  const hangingPlant = buildHangingPlant();
  hangingPlant.position.set(-0.4, 4.5, wz + 0.5);
  room.add(hangingPlant);
  const hangingPlant2 = buildHangingPlant();
  hangingPlant2.position.set(-4.55, 4.7, 4.4);
  room.add(hangingPlant2);

  const bed = buildBed();
  bed.position.set(5.2, 0, -3.2);
  room.add(bed);

  const player = buildRecordPlayer(interactives, refs);
  player.position.set(8.1, 0, 1.9);
  player.rotation.y = -Math.PI / 2;
  room.add(player);
  player.traverse((o) => {
    if (!o.userData.action) o.userData.zone = "music";
  });

  const fashion = buildFashionCorner(interactives, refs);
  fashion.position.set(8.2, 0, 4.6);
  room.add(fashion);

  const skateboard = buildSkateboard();
  skateboard.position.set(7.2, 0.28, 6.4);
  skateboard.rotation.set(-1.15, 0, 0.05);
  room.add(skateboard);

  const lamp = buildLamp();
  lamp.group.position.set(3.6, 0, -4.0);
  room.add(lamp.group);

  const photo = buildPhotoFrame(interactives, refs);
  photo.position.set(-4.6, 3.4, -2.0);
  photo.rotation.y = Math.PI / 2;
  room.add(photo);

  // Mirror on the near wall by the fashion corner
  const mirror = new THREE.Group();
  const mFrame = box(1.0, 2.6, 0.08, woodMat(PALETTE.wood));
  const mGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(0.82, 2.4),
    new THREE.MeshStandardMaterial({ color: 0xcfd8dd, roughness: 0.05, metalness: 1 })
  );
  mGlass.position.z = -0.05;
  mGlass.rotation.y = Math.PI;
  mirror.add(mFrame, mGlass);
  mirror.position.set(5.6, 1.55, 6.62);
  room.add(mirror);

  // Potted plants
  const plant = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.45, 14), mat(0xc98a5e, { roughness: 0.9 }));
  pot.position.y = 0.22;
  pot.castShadow = true;
  plant.add(pot);
  const rng = mulberry(3);
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.8 + rng() * 0.5, 6), mat(PALETTE.moss, { roughness: 1 }));
    leaf.position.set((rng() - 0.5) * 0.3, 0.7 + rng() * 0.25, (rng() - 0.5) * 0.3);
    leaf.rotation.set((rng() - 0.5) * 0.7, 0, (rng() - 0.5) * 0.7);
    leaf.castShadow = true;
    plant.add(leaf);
  }
  plant.position.set(-4.1, 0, -3.9);
  room.add(plant);

  const plant2 = plant.clone();
  plant2.scale.setScalar(0.7);
  plant2.position.set(2.9, 0, -4.3);
  room.add(plant2);

  // Candle on the desk (7A) — the light flickers in the main loop
  const candle = new THREE.Group();
  const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.24, 16), mat(PALETTE.cream, { roughness: 0.5 }));
  wax.position.y = 0.12;
  wax.castShadow = true;
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.08, 8), new THREE.MeshBasicMaterial({ color: 0xffc873 }));
  flame.position.y = 0.29;
  const candleLight = new THREE.PointLight(0xffa54f, 1.6, 2.5, 2);
  candleLight.position.y = 0.34;
  candle.add(wax, flame, candleLight);
  candle.position.set(-3.5, 1.63, -3.75);
  room.add(candle);
  refs.candle = { light: candleLight, flame };

  const windowWorldPos = new THREE.Vector3(winCx, winCy, wz);

  return {
    room,
    interactives,
    windowWorldPos,
    radioNotes: player.getObjectByName("radio-notes"),
    materials: { wall: wallMat, floor: floorMat, trim: trimMat, ceil: ceilMat },
    lamp: lamp.refs,
    refs,
    zoneTargets: [desk, chair, shelf, player],
  };
}
