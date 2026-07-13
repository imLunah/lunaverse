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

export function buildSurfaces() {
  // Laptop screen — projects "desktop"
  const screen = makeCanvas(1024, 640, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#fdf6e9");
    grad.addColorStop(1, "#f3e2c8");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    // menu bar
    g.fillStyle = "rgba(59,43,38,0.08)";
    g.fillRect(0, 0, w, 44);
    g.fillStyle = FADED;
    g.font = "600 22px Karla, sans-serif";
    g.fillText("john.dang — things i've built", 24, 30);
    g.fillStyle = EMBER;
    g.font = "700 20px Karla, sans-serif";
    g.fillText(SURFACES.projects.title.toUpperCase(), 60, 108);
    let y = 170;
    for (const [name, desc] of SURFACES.projects.items) {
      g.fillStyle = INK;
      g.font = "600 40px Fraunces, Georgia, serif";
      g.fillText(name, 60, y);
      g.fillStyle = FADED;
      g.font = "26px Karla, sans-serif";
      g.fillText(desc, 60, y + 40);
      g.strokeStyle = "rgba(59,43,38,0.14)";
      g.beginPath();
      g.moveTo(60, y + 72);
      g.lineTo(w - 60, y + 72);
      g.stroke();
      y += 128;
    }
    g.fillStyle = FADED;
    g.font = "italic 22px Karla, sans-serif";
    g.fillText("placeholder list — swap in content.js", 60, h - 36);
  });

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

  // Owl speech bubble
  const bubble = makeCanvas(512, 256, (g, w, h) => {
    g.fillStyle = "rgba(253,246,233,0.97)";
    g.beginPath();
    g.roundRect(16, 16, w - 32, h - 90, 40);
    g.fill();
    g.beginPath();
    g.moveTo(w / 2 - 26, h - 76);
    g.lineTo(w / 2, h - 20);
    g.lineTo(w / 2 + 26, h - 76);
    g.fill();
    g.fillStyle = INK;
    g.font = "600 54px Fraunces, Georgia, serif";
    g.textAlign = "center";
    g.fillText(SURFACES.owl, w / 2, 112);
  });

  return { screen, letter, bio, bubble, style };
}
