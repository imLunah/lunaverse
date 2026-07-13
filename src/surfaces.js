import * as THREE from "three";
import { SURFACES } from "./content.js";

/**
 * In-scene content surfaces (decision 1C): the laptop screen, the letter,
 * and the bio card render their content as canvas textures, readable at
 * each object's camera focus distance.
 */

function makeCanvas(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

const INK = "#3b2b26";
const EMBER = "#c25a32";
const FADED = "rgba(59,43,38,0.62)";

// The laptop screen shows the résumé: a tall page the visitor scrolls through.
// The plane maps a window of this canvas; main.js moves texture.offset.y on
// wheel input while the laptop is focused.
export const RESUME_W = 1024;
export const RESUME_H = 2600;

function drawResume(g, w, h) {
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "#fdf6e9");
  grad.addColorStop(1, "#f3e2c8");
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  const r = SURFACES.resume;

  g.fillStyle = INK;
  g.font = "600 84px Fraunces, Georgia, serif";
  g.fillText(r.name, 70, 150);
  g.fillStyle = FADED;
  g.font = "italic 32px Karla, sans-serif";
  g.fillText(r.role, 70, 210);
  g.strokeStyle = "rgba(59,43,38,0.2)";
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(70, 258);
  g.lineTo(w - 70, 258);
  g.stroke();
  g.fillStyle = FADED;
  g.font = "600 26px Karla, sans-serif";
  g.textAlign = "right";
  g.fillText("scroll ↓", w - 70, 150);
  g.textAlign = "left";

  let y = 350;
  for (const section of r.sections) {
    g.fillStyle = EMBER;
    g.font = "700 30px Karla, sans-serif";
    g.fillText(section.heading.toUpperCase(), 70, y);
    y += 64;
    for (const entry of section.entries) {
      g.fillStyle = INK;
      g.font = "600 44px Fraunces, Georgia, serif";
      g.fillText(entry.title, 70, y);
      if (entry.meta) {
        g.fillStyle = EMBER;
        g.font = "italic 26px Karla, sans-serif";
        g.fillText(entry.meta, 70, y + 40);
        y += 44;
      }
      y += 52;
      g.fillStyle = FADED;
      g.font = "28px Karla, sans-serif";
      for (const line of entry.lines) {
        g.fillText(line, 70, y);
        y += 42;
      }
      y += 36;
    }
    y += 28;
  }
  g.fillStyle = FADED;
  g.font = "italic 26px Karla, sans-serif";
  g.fillText("placeholder résumé — the real one lives in src/content.js", 70, h - 60);
}

export function buildSurfaces() {
  const resume = makeCanvas(RESUME_W, RESUME_H, drawResume);

  // Letter — contact
  const letter = makeCanvas(640, 860, (g, w, h) => {
    g.fillStyle = "#fdf6e9";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(59,43,38,0.2)";
    g.lineWidth = 3;
    g.strokeRect(18, 18, w - 36, h - 36);
    g.fillStyle = EMBER;
    g.font = "700 24px Karla, sans-serif";
    g.fillText("SEND A LETTER", 60, 110);
    g.fillStyle = INK;
    g.font = "600 56px Fraunces, Georgia, serif";
    g.fillText(SURFACES.contact.title, 60, 190);
    let y = 300;
    for (const [label, value] of SURFACES.contact.lines) {
      g.fillStyle = FADED;
      g.font = "700 24px Karla, sans-serif";
      g.fillText(label.toUpperCase(), 60, y);
      g.fillStyle = INK;
      g.font = "34px Karla, sans-serif";
      g.fillText(value, 60, y + 44);
      y += 130;
    }
    g.fillStyle = FADED;
    g.font = "italic 30px 'Homemade Apple', cursive";
    g.fillText("— john", 60, h - 90);
  });

  // Bio card — about
  const bio = makeCanvas(1120, 840, (g, w, h) => {
    g.fillStyle = "#fdf6e9";
    g.fillRect(0, 0, w, h);
    g.fillStyle = EMBER;
    g.font = "700 26px Karla, sans-serif";
    g.fillText("THE PERSON BEHIND THE DESK", 70, 110);
    g.fillStyle = INK;
    g.font = "600 72px Fraunces, Georgia, serif";
    g.fillText(SURFACES.about.title, 70, 210);
    g.fillStyle = FADED;
    g.font = "34px Karla, sans-serif";
    let y = 300;
    for (const line of SURFACES.about.lines) {
      g.fillText(line, 70, y);
      y += 52;
    }
  });

  // Lookbook card — fashion corner
  const style = makeCanvas(1024, 712, (g, w, h) => {
    g.fillStyle = "#fdf6e9";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#1c1a19";
    g.fillRect(0, 0, w, 14);
    g.fillStyle = EMBER;
    g.font = "700 26px Karla, sans-serif";
    g.fillText("WORN, NOT DISPLAYED", 70, 110);
    g.fillStyle = INK;
    g.font = "600 76px Fraunces, Georgia, serif";
    g.fillText(SURFACES.style.title, 70, 210);
    g.fillStyle = FADED;
    g.font = "34px Karla, sans-serif";
    let y = 300;
    for (const line of SURFACES.style.lines) {
      g.fillText(line, 70, y);
      y += 54;
    }
  });

  return { resume, letter, bio, style };
}

/* ─────────────────── the "hello" on the monitor ───────────────────
   A hand-authored cursive stroke that draws itself on, pen-style: the
   path is flattened to a polyline once, then each frame we stroke it up
   to the current arc length. Loops gently: draw → hold → fade → redraw. */

// One continuous cursive "hello": cubic segments [c1x,c1y, c2x,c2y, x,y]
// following a moveTo(START). Baseline ~250, x-height ~188, ascenders ~95.
const HELLO_START = [100, 240];
const HELLO_SEGS = [
  // h — entry stroke, tall narrow ascender loop, down, shoulder arch
  [118, 234, 138, 190, 146, 122],
  [149, 98, 156, 92, 158, 106],
  [160, 124, 152, 195, 148, 232],
  [146, 246, 147, 253, 152, 252],
  [158, 250, 164, 216, 178, 204],
  [190, 194, 198, 204, 197, 222],
  [196, 236, 196, 248, 206, 251],
  // e — rise into an open eye, around the bottom, out to the right
  [220, 252, 236, 240, 240, 224],
  [243, 210, 232, 202, 220, 209],
  [207, 217, 203, 238, 214, 247],
  [225, 255, 242, 251, 252, 242],
  // l — tall loop
  [264, 232, 278, 175, 283, 122],
  [285, 100, 292, 94, 294, 108],
  [296, 126, 287, 200, 283, 234],
  [281, 247, 283, 253, 291, 250],
  // l — second tall loop
  [301, 244, 314, 180, 319, 126],
  [321, 104, 328, 98, 330, 112],
  [332, 130, 323, 202, 319, 236],
  [317, 248, 319, 254, 327, 250],
  // o — rise to the top, loop counterclockwise, exit right from the top
  [335, 247, 346, 232, 350, 214],
  [340, 208, 330, 216, 330, 228],
  [330, 242, 342, 252, 352, 244],
  [360, 237, 361, 222, 352, 214],
  [354, 209, 362, 206, 370, 212],
];

export function createHello(reduced = false) {
  const W = 640, H = 400;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;

  // Flatten to a polyline with cumulative arc lengths (drawing space)
  const pts = [[...HELLO_START]];
  let [px, py] = HELLO_START;
  for (const [c1x, c1y, c2x, c2y, x, y] of HELLO_SEGS) {
    for (let i = 1; i <= 22; i++) {
      const t = i / 22, u = 1 - t;
      pts.push([
        u * u * u * px + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * x,
        u * u * u * py + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * y,
      ]);
    }
    px = x;
    py = y;
  }
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  const TOTAL = cum[cum.length - 1];

  // Center the word from the polyline's actual bounds
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  for (const [x, y] of pts) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const SCALE = Math.min((W * 0.78) / (maxX - minX), (H * 0.62) / (maxY - minY));
  const OFF_X = (W - (maxX - minX) * SCALE) / 2 - minX * SCALE;
  const OFF_Y = (H - (maxY - minY) * SCALE) / 2 - minY * SCALE;

  function draw(len, alpha = 1) {
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#fdf8ee");
    grad.addColorStop(1, "#f1e4cd");
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    if (len <= 0 || alpha <= 0) return;
    g.save();
    g.translate(OFF_X, OFF_Y);
    g.scale(SCALE, SCALE);
    g.strokeStyle = INK;
    g.globalAlpha = alpha;
    g.lineWidth = 7;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    let i = 1;
    for (; i < pts.length && cum[i] <= len; i++) g.lineTo(pts[i][0], pts[i][1]);
    if (i < pts.length) {
      const k = (len - cum[i - 1]) / (cum[i] - cum[i - 1]);
      g.lineTo(
        pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k,
        pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k
      );
    }
    g.stroke();
    g.restore();
  }

  // Cycle: draw 2.6s → hold 6s → fade 0.9s → start over
  const DRAW = 2.6, HOLD = 6.0, FADE = 0.9;
  let t = reduced ? DRAW : 0;
  let lastLen = -1, lastAlpha = -1;

  function update(dt) {
    if (reduced) {
      if (lastLen < 0) {
        draw(TOTAL);
        tex.needsUpdate = true;
        lastLen = TOTAL;
      }
      return;
    }
    t += dt;
    let len = TOTAL, alpha = 1;
    if (t < DRAW) {
      const k = t / DRAW;
      len = TOTAL * (k * k * (3 - 2 * k)); // smoothstep: the pen eases in and out
    } else if (t < DRAW + HOLD) {
      // hold
    } else if (t < DRAW + HOLD + FADE) {
      alpha = 1 - (t - DRAW - HOLD) / FADE;
    } else {
      t = 0;
      len = 0;
    }
    if (Math.abs(len - lastLen) > 0.5 || Math.abs(alpha - lastAlpha) > 0.01) {
      draw(len, alpha);
      tex.needsUpdate = true;
      lastLen = len;
      lastAlpha = alpha;
    }
  }

  return { texture: tex, update };
}
