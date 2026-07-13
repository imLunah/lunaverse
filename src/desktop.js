import * as THREE from "three";
import { SURFACES } from "./content.js";

/**
 * The little desktop OS that lives on the monitor (action "computer").
 * Drawn to a canvas texture in the site's own warm palette — an OS-shaped
 * homage, not anyone's real system UI. main.js routes screen clicks in as
 * (u,v) hits and forwards keystrokes to the Notes window.
 */

const W = 1280;
const H = 800;
const MENU_H = 34;
const INK = "#3b2b26";
const FADED = "rgba(59,43,38,0.6)";
const CREAM = "#fdf3e3";
const PAPER = "#fdf6e9";
const AMBER = "#f0a35e";
const EMBER = "#c25a32";

export function createDesktop() {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  const CFG = SURFACES.computer;

  // Desktop icons: folders down the right edge, Notes beneath them
  const icons = CFG.folders.map((f, i) => ({
    kind: "folder",
    folder: i,
    label: f.name,
    x: W - 128,
    y: MENU_H + 34 + i * 128,
  }));
  icons.push({ kind: "notes", label: CFG.notesTitle, x: W - 128, y: MENU_H + 34 + CFG.folders.length * 128 });

  // Dock mirrors the icons
  const DOCK_W = icons.length * 74 + 26;
  const dock = { x: (W - DOCK_W) / 2, y: H - 84, w: DOCK_W, h: 68 };

  const windows = []; // { kind, folder?, x, y, w, h } — last = topmost
  let notesText = "";
  let caretOn = true;
  let caretT = 0;
  let lastMinute = -1;
  let dirty = true;

  function openFolder(i) {
    const existing = windows.findIndex((w) => w.kind === "folder" && w.folder === i);
    if (existing >= 0) {
      windows.push(windows.splice(existing, 1)[0]);
    } else {
      windows.push({ kind: "folder", folder: i, x: 140 + i * 52, y: MENU_H + 56 + i * 40, w: 620, h: 400 });
    }
    dirty = true;
  }

  function openNotes() {
    const existing = windows.findIndex((w) => w.kind === "notes");
    if (existing >= 0) {
      windows.push(windows.splice(existing, 1)[0]);
    } else {
      windows.push({ kind: "notes", x: 560, y: MENU_H + 130, w: 520, h: 380 });
    }
    dirty = true;
  }

  function drawFolderGlyph(x, y, s) {
    g.fillStyle = AMBER;
    g.beginPath();
    g.roundRect(x, y + s * 0.14, s, s * 0.68, s * 0.1);
    g.fill();
    g.beginPath();
    g.roundRect(x, y + s * 0.04, s * 0.44, s * 0.24, s * 0.08);
    g.fill();
    g.fillStyle = "#f6bd7e";
    g.beginPath();
    g.roundRect(x, y + s * 0.22, s, s * 0.6, s * 0.1);
    g.fill();
  }

  function drawNoteGlyph(x, y, s) {
    g.fillStyle = PAPER;
    g.beginPath();
    g.roundRect(x + s * 0.08, y, s * 0.84, s * 0.9, s * 0.08);
    g.fill();
    g.fillStyle = AMBER;
    g.beginPath();
    g.roundRect(x + s * 0.08, y, s * 0.84, s * 0.2, s * 0.08);
    g.fill();
    g.strokeStyle = "rgba(59,43,38,0.35)";
    g.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.moveTo(x + s * 0.22, y + s * 0.38 + i * s * 0.16);
      g.lineTo(x + s * 0.78, y + s * 0.38 + i * s * 0.16);
      g.stroke();
    }
  }

  function drawChrome(w, title) {
    // window body
    g.fillStyle = PAPER;
    g.beginPath();
    g.roundRect(w.x, w.y, w.w, w.h, 14);
    g.fill();
    g.strokeStyle = "rgba(59,43,38,0.18)";
    g.lineWidth = 2;
    g.stroke();
    // title bar
    g.fillStyle = "#f3e2c8";
    g.beginPath();
    g.roundRect(w.x, w.y, w.w, 40, [14, 14, 0, 0]);
    g.fill();
    // traffic lights (close is live, the others are decoration)
    for (const [i, col] of ["#e0655a", "#ecb64f", "#7fb069"].entries()) {
      g.fillStyle = col;
      g.beginPath();
      g.arc(w.x + 24 + i * 26, w.y + 20, 8, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = INK;
    g.font = "600 19px Karla, sans-serif";
    g.textAlign = "center";
    g.fillText(title, w.x + w.w / 2, w.y + 26);
    g.textAlign = "left";
  }

  function wrapText(text, maxWidth, font) {
    g.font = font;
    const out = [];
    for (const raw of text.split("\n")) {
      let line = "";
      for (const word of raw.split(" ")) {
        const probe = line ? `${line} ${word}` : word;
        if (g.measureText(probe).width > maxWidth && line) {
          out.push(line);
          line = word;
        } else {
          line = probe;
        }
      }
      out.push(line);
    }
    return out;
  }

  function draw() {
    // — wallpaper: the room's own sunset, in miniature
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#46568c");
    sky.addColorStop(0.45, "#e8834e");
    sky.addColorStop(0.75, "#f29a58");
    sky.addColorStop(1, "#f6b478");
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);
    g.fillStyle = "#ffe2a8";
    g.beginPath();
    g.arc(W * 0.38, H * 0.56, 84, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "rgba(74,52,40,0.85)";
    g.beginPath();
    g.moveTo(0, H);
    g.quadraticCurveTo(W * 0.22, H * 0.6, W * 0.48, H * 0.82);
    g.quadraticCurveTo(W * 0.72, H * 1.0, W, H * 0.78);
    g.lineTo(W, H);
    g.closePath();
    g.fill();

    // — desktop icons
    for (const icon of icons) {
      if (icon.kind === "folder") drawFolderGlyph(icon.x, icon.y, 84);
      else drawNoteGlyph(icon.x, icon.y, 84);
      g.fillStyle = CREAM;
      g.font = "600 17px Karla, sans-serif";
      g.textAlign = "center";
      g.fillText(icon.label, icon.x + 42, icon.y + 106);
      g.textAlign = "left";
    }

    // — windows, bottom to top
    for (const w of windows) {
      if (w.kind === "folder") {
        const folder = CFG.folders[w.folder];
        drawChrome(w, folder.name);
        let y = w.y + 86;
        for (const [name, desc] of folder.items) {
          drawFolderGlyph(w.x + 26, y - 26, 34);
          g.fillStyle = INK;
          g.font = "600 24px Fraunces, Georgia, serif";
          g.fillText(name, w.x + 76, y);
          g.fillStyle = FADED;
          g.font = "17px Karla, sans-serif";
          g.fillText(desc, w.x + 76, y + 24);
          y += 74;
        }
      } else {
        drawChrome(w, CFG.notesTitle);
        const pad = 26;
        const lines = wrapText(notesText, w.w - pad * 2, "21px Karla, sans-serif");
        g.fillStyle = notesText ? INK : FADED;
        g.font = notesText ? "21px Karla, sans-serif" : "italic 21px Karla, sans-serif";
        const maxLines = Math.floor((w.h - 66) / 30);
        const shown = lines.slice(-maxLines);
        let y = w.y + 72;
        if (!notesText) g.fillText(CFG.notesPlaceholder, w.x + pad, y);
        for (const line of shown) {
          g.fillText(line, w.x + pad, y);
          y += 30;
        }
        if (caretOn) {
          const last = shown[shown.length - 1] || "";
          g.font = "21px Karla, sans-serif";
          const cx = w.x + pad + (notesText ? g.measureText(last).width : 0) + 2;
          g.fillStyle = EMBER;
          g.fillRect(cx, y - 30 - 18, 2.5, 24);
        }
      }
    }

    // — dock
    g.fillStyle = "rgba(253,243,227,0.55)";
    g.beginPath();
    g.roundRect(dock.x, dock.y, dock.w, dock.h, 20);
    g.fill();
    for (const [i, icon] of icons.entries()) {
      const ix = dock.x + 16 + i * 74;
      if (icon.kind === "folder") drawFolderGlyph(ix, dock.y + 10, 48);
      else drawNoteGlyph(ix, dock.y + 10, 48);
    }

    // — menu bar on top of everything
    g.fillStyle = "rgba(253,243,227,0.94)";
    g.fillRect(0, 0, W, MENU_H);
    g.fillStyle = INK;
    g.font = "20px serif";
    g.fillText("🦉", 16, 25);
    g.font = "700 18px Karla, sans-serif";
    g.fillText(CFG.osName, 48, 24);
    g.font = "17px Karla, sans-serif";
    g.fillStyle = FADED;
    let mx = 140;
    for (const m of CFG.menus) {
      g.fillText(m, mx, 24);
      mx += g.measureText(m).width + 30;
    }
    const now = new Date();
    const hh = now.getHours() % 12 || 12;
    const mm = String(now.getMinutes()).padStart(2, "0");
    g.fillStyle = INK;
    g.textAlign = "right";
    g.fillText(`${hh}:${mm} ${now.getHours() >= 12 ? "pm" : "am"}`, W - 18, 24);
    g.textAlign = "left";
  }

  /** Screen click from a raycast hit: u,v in plane space (v up). */
  function click(u, v) {
    const px = u * W;
    const py = (1 - v) * H;
    // windows, topmost first
    for (let i = windows.length - 1; i >= 0; i--) {
      const w = windows[i];
      if (px >= w.x && px <= w.x + w.w && py >= w.y && py <= w.y + w.h) {
        if (Math.hypot(px - (w.x + 24), py - (w.y + 20)) <= 13) {
          windows.splice(i, 1); // close button
        } else if (i !== windows.length - 1) {
          windows.push(windows.splice(i, 1)[0]); // bring to front
        }
        dirty = true;
        return;
      }
    }
    // desktop icons
    for (const icon of icons) {
      if (px >= icon.x - 10 && px <= icon.x + 94 && py >= icon.y - 6 && py <= icon.y + 112) {
        icon.kind === "folder" ? openFolder(icon.folder) : openNotes();
        return;
      }
    }
    // dock
    if (px >= dock.x && px <= dock.x + dock.w && py >= dock.y && py <= dock.y + dock.h) {
      const i = Math.floor((px - dock.x - 16) / 74);
      const icon = icons[Math.max(0, Math.min(icons.length - 1, i))];
      icon.kind === "folder" ? openFolder(icon.folder) : openNotes();
    }
  }

  /** Keystroke from main.js — typing always lands in Notes. */
  function type(key) {
    if (!windows.some((w) => w.kind === "notes")) openNotes();
    else {
      const i = windows.findIndex((w) => w.kind === "notes");
      if (i !== windows.length - 1) windows.push(windows.splice(i, 1)[0]);
    }
    if (key === "Backspace") notesText = notesText.slice(0, -1);
    else if (key === "Enter") notesText += "\n";
    else if (notesText.length < 900) notesText += key;
    caretOn = true;
    caretT = 0;
    dirty = true;
  }

  /** Advance the caret blink + clock; returns true when a redraw happened. */
  function update(dt) {
    caretT += dt;
    if (caretT >= 0.53 && windows.some((w) => w.kind === "notes")) {
      caretT = 0;
      caretOn = !caretOn;
      dirty = true;
    }
    const minute = new Date().getMinutes();
    if (minute !== lastMinute) {
      lastMinute = minute;
      dirty = true;
    }
    if (!dirty) return false;
    dirty = false;
    draw();
    texture.needsUpdate = true;
    return true;
  }

  draw();
  texture.needsUpdate = true;
  return { texture, click, type, update };
}
