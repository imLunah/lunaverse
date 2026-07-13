import * as THREE from "three";

/**
 * Procedural PBR-ish textures. Drawn mostly neutral so material.color
 * (which the day/night mood lerps) tints them.
 * PLACEHOLDER: for full photorealism, swap for scanned CC0 texture sets
 * (ambientCG / Poly Haven) dropped into /public/textures/.
 */

function canvasTex(size, draw, { repeat = [1, 1], srgb = true } = {}) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d"), size);
  const tex = new THREE.CanvasTexture(c);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.anisotropy = 8;
  return tex;
}

function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Floor: plank boards with grain streaks and seams. Neutral warm gray. */
export function woodPlanks(repeat = [3, 3]) {
  return canvasTex(1024, (g, s) => {
    const r = rng(11);
    g.fillStyle = "#b8b0a6";
    g.fillRect(0, 0, s, s);
    const planks = 8;
    const ph = s / planks;
    for (let p = 0; p < planks; p++) {
      const y = p * ph;
      const tone = 165 + Math.floor(r() * 40);
      g.fillStyle = `rgb(${tone + 12}, ${tone}, ${tone - 14})`;
      g.fillRect(0, y, s, ph);
      // grain streaks
      for (let i = 0; i < 46; i++) {
        const gy = y + r() * ph;
        const alpha = 0.05 + r() * 0.1;
        const dark = r() > 0.5;
        g.strokeStyle = dark ? `rgba(70,52,38,${alpha})` : `rgba(255,244,224,${alpha * 0.8})`;
        g.lineWidth = 0.6 + r() * 1.6;
        g.beginPath();
        g.moveTo(0, gy);
        for (let x = 0; x <= s; x += 64) {
          g.lineTo(x, gy + Math.sin(x * 0.01 + r() * 6) * 2.2 + (r() - 0.5) * 2);
        }
        g.stroke();
      }
      // occasional knot
      if (r() > 0.5) {
        const kx = r() * s, ky = y + ph * (0.3 + r() * 0.4);
        const grad = g.createRadialGradient(kx, ky, 1, kx, ky, 9 + r() * 8);
        grad.addColorStop(0, "rgba(60,42,30,0.55)");
        grad.addColorStop(1, "rgba(60,42,30,0)");
        g.fillStyle = grad;
        g.fillRect(kx - 20, ky - 20, 40, 40);
      }
      // seam
      g.fillStyle = "rgba(40,28,20,0.6)";
      g.fillRect(0, y + ph - 2, s, 2);
      // butt joints
      const joint = r() * s;
      g.fillRect(joint, y, 2, ph);
    }
  }, { repeat });
}

/** Furniture wood: tighter grain, neutral. */
export function woodGrain(repeat = [1, 1]) {
  return canvasTex(512, (g, s) => {
    const r = rng(29);
    g.fillStyle = "#b5aca0";
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 140; i++) {
      const y = r() * s;
      g.strokeStyle = r() > 0.5 ? `rgba(74,54,38,${0.05 + r() * 0.09})` : `rgba(250,240,222,${0.04 + r() * 0.06})`;
      g.lineWidth = 0.5 + r() * 1.4;
      g.beginPath();
      g.moveTo(0, y);
      for (let x = 0; x <= s; x += 32) {
        g.lineTo(x, y + Math.sin(x * 0.02 + i) * 1.6 + (r() - 0.5) * 1.5);
      }
      g.stroke();
    }
  }, { repeat });
}

/** Wall plaster bump: fine noise + faint trowel arcs. Grayscale (bump map). */
export function plasterBump(repeat = [3, 2]) {
  return canvasTex(512, (g, s) => {
    const r = rng(47);
    g.fillStyle = "#808080";
    g.fillRect(0, 0, s, s);
    const img = g.getImageData(0, 0, s, s);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (r() - 0.5) * 22;
      img.data[i] += n;
      img.data[i + 1] += n;
      img.data[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
    for (let i = 0; i < 26; i++) {
      g.strokeStyle = `rgba(${r() > 0.5 ? 150 : 110},${r() > 0.5 ? 150 : 110},${r() > 0.5 ? 150 : 110},0.05)`;
      g.lineWidth = 14 + r() * 26;
      g.beginPath();
      const cx = r() * s, cy = r() * s;
      g.arc(cx, cy, 30 + r() * 80, r() * Math.PI, r() * Math.PI + 1.2);
      g.stroke();
    }
  }, { repeat, srgb: false });
}

/** Rug fabric bump: woven cross-hatch. Grayscale. */
export function fabricBump(repeat = [6, 6]) {
  return canvasTex(256, (g, s) => {
    const r = rng(83);
    g.fillStyle = "#8a8a8a";
    g.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 4) {
      g.fillStyle = `rgba(255,255,255,${0.06 + r() * 0.05})`;
      g.fillRect(0, y, s, 2);
    }
    for (let x = 0; x < s; x += 4) {
      g.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.05})`;
      g.fillRect(x, 0, 2, s);
    }
  }, { repeat, srgb: false });
}
