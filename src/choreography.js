import * as THREE from "three";

/**
 * Two-tier navigation (John's request, 2026-07-12):
 *   home → click a zone (desk area, music bench, gallery wall, fashion corner)
 *        → camera pans over to that zone
 *   zone → click an item there → close-up focus + the object performs
 *        (lid opens, letter rises, bio card slides, lookbook card, record wobble)
 *   back (Esc / pill / empty click) walks the tiers in reverse.
 *
 * Plus the original three beats: hover glow, camera travel, object reveal.
 */

const EASE = (k) => 1 - Math.pow(1 - k, 3); // ease-out cubic

// Mid-distance zone poses: where you stand to survey each area
const ZONES = {
  desk: { pos: new THREE.Vector3(-2.0, 3.0, 0.7), target: new THREE.Vector3(-2.3, 1.5, -3.2) },
  gallery: { pos: new THREE.Vector3(-2.2, 3.5, -1.9), target: new THREE.Vector3(-4.6, 3.3, -2.0) },
  music: { pos: new THREE.Vector3(2.6, 2.5, 0.4), target: new THREE.Vector3(4.4, 0.85, 0.4) },
  fashion: { pos: new THREE.Vector3(2.3, 2.4, 2.2), target: new THREE.Vector3(4.4, 1.35, 2.7) },
};

export const ZONE_OF = { projects: "desk", contact: "desk", about: "gallery", radio: "music", style: "fashion" };

// Close-up item poses within a zone
const FOCUS = {
  // The laptop's open lid tilts back ~22°, so the camera sits high, along its normal
  projects: { pos: new THREE.Vector3(-2.65, 2.9, -1.65), target: new THREE.Vector3(-3.1, 2.1, -3.55) },
  contact: { pos: new THREE.Vector3(-2.15, 2.55, -1.2), target: new THREE.Vector3(-2.15, 2.0, -2.75) },
  about: { pos: new THREE.Vector3(-3.15, 3.35, -2.0), target: new THREE.Vector3(-4.6, 3.35, -2.0) },
  style: { pos: new THREE.Vector3(3.0, 1.8, 2.3), target: new THREE.Vector3(4.5, 1.5, 2.7) },
};

export class Choreography {
  constructor({ camera, interactives, refs, reducedMotion = false }) {
    this.camera = camera;
    this.refs = refs;
    this.reduced = reducedMotion;
    this.duration = reducedMotion ? 0.18 : 0.95;

    // Hover registry: action → { group, mats, baseScale, k, targetK }
    this.hover = new Map();
    for (const item of interactives) {
      const mats = [];
      item.object.traverse((o) => {
        if (o.isMesh && o.material && o.material.isMeshStandardMaterial) mats.push(o.material);
      });
      this.hover.set(item.action, {
        group: item.object,
        mats,
        baseScale: item.object.scale.clone(),
        k: 0,
        targetK: 0,
      });
    }

    // State machine: free | travel | zone | focused
    this.mode = "free";
    this.zone = null; // current zone name once arrived (or traveling toward)
    this.action = null; // focused item
    this.pending = null; // mode to enter when travel completes
    this.t = 0;
    this.from = { pos: new THREE.Vector3(), dir: new THREE.Vector3() };
    this.dest = { pos: new THREE.Vector3(), dir: new THREE.Vector3() };
    this.reveal = 0;
    this.revealTarget = 0;

    // In-place performances
    this.radioT = -1;

    this._v = new THREE.Vector3();
    this._q = new THREE.Vector3();
  }

  get traveling() {
    return this.mode === "travel";
  }

  _startTravel(pose, arriveMode) {
    this.from.pos.copy(this.camera.position);
    this.camera.getWorldDirection(this.from.dir);
    this.dest.pos.copy(pose.pos);
    if (pose.dir) {
      this.dest.dir.copy(pose.dir);
    } else {
      this.dest.dir.copy(pose.target).sub(pose.pos).normalize();
    }
    this.pending = arriveMode;
    this.mode = "travel";
    this.t = 0;
    this.setHover(null);
  }

  setHover(action) {
    const interactable = this.mode === "free" || this.mode === "zone";
    for (const [a, h] of this.hover) h.targetK = a === action && interactable ? 1 : 0;
  }

  goZone(name) {
    if (!ZONES[name] || this.mode === "travel" || this.mode === "focused") return false;
    this.zone = name;
    this._startTravel(ZONES[name], "zone");
    return true;
  }

  focusItem(action) {
    if (!FOCUS[action] || this.mode !== "zone" || ZONE_OF[action] !== this.zone) return false;
    this.action = action;
    this.revealTarget = 1;
    this._startTravel(FOCUS[action], "focused");
    return true;
  }

  /** Walk one tier back. Returns "zone", "home", or null. home = { pos, dir }. */
  back(home) {
    if (this.mode === "travel") return null;
    if (this.mode === "focused") {
      this.revealTarget = 0;
      this._startTravel(ZONES[this.zone], "zone");
      return "zone";
    }
    if (this.mode === "zone") {
      this.zone = null;
      this._startTravel(home, "free");
      return "home";
    }
    return null;
  }

  performRadio() {
    this.radioT = 0;
  }

  /** Re-collect hover materials — call after async GLB models finish loading. */
  refreshMats() {
    for (const h of this.hover.values()) {
      h.mats.length = 0;
      h.group.traverse((o) => {
        if (o.isMesh && o.material && o.material.isMeshStandardMaterial) h.mats.push(o.material);
      });
    }
  }

  update(dt) {
    // — Beat 1: hover glow + spring scale
    for (const h of this.hover.values()) {
      h.k += (h.targetK - h.k) * Math.min(1, dt * 9);
      if (Math.abs(h.k) > 0.001) {
        const s = 1 + 0.055 * h.k;
        h.group.scale.set(h.baseScale.x * s, h.baseScale.y * s, h.baseScale.z * s);
      } else {
        h.group.scale.copy(h.baseScale);
      }
      for (const m of h.mats) {
        m.emissive.setHex(0xf0a35e);
        m.emissiveIntensity = h.k * 0.38;
      }
    }

    // — Beat 2: camera travel / hold
    if (this.mode === "travel") {
      this.t += dt / this.duration;
      const k = EASE(Math.min(this.t, 1));
      this.camera.position.lerpVectors(this.from.pos, this.dest.pos, k);
      this._v.lerpVectors(this.from.dir, this.dest.dir, k).normalize();
      this.camera.lookAt(this._q.copy(this.camera.position).add(this._v));
      if (this.t >= 1) {
        this.mode = this.pending;
        this.pending = null;
        if (this.mode === "free" || this.mode === "zone") this.action = null;
      }
    } else if (this.mode === "zone" || this.mode === "focused") {
      this.camera.position.copy(this.dest.pos);
      this.camera.lookAt(this._q.copy(this.dest.pos).add(this.dest.dir));
    }

    // — Beat 3: object reveals track the reveal target
    this.reveal += (this.revealTarget - this.reveal) * Math.min(1, dt * (this.reduced ? 14 : 5));
    const r = this.reveal;
    const { laptop, envelope, photo } = this.refs;

    if (this.action === "projects" || r > 0.002) {
      // The laptop lid hinges open onto the résumé screen
      const pr = this.action === "projects" ? r : 0;
      laptop.lid.rotation.x = -1.95 * pr;
      laptop.screen.visible = pr > 0.03;
    }
    if (this.action === "contact" || r > 0.002) {
      const lr = this.action === "contact" ? r : 0;
      const letter = envelope.letter;
      letter.scale.setScalar(Math.max(0.001, lr));
      letter.position.y = 0.05 + lr * 0.85;
      if (lr > 0.05) letter.lookAt(this.camera.position);
    }
    if (this.action === "about" || r > 0.002) {
      const br = this.action === "about" ? r : 0;
      const panel = photo.bioPanel;
      panel.scale.setScalar(Math.max(0.001, br));
      panel.position.x = -0.1 - br * 1.18;
      panel.position.y = -0.1 + br * 0.1;
      panel.position.z = 0.03 + br * 0.22;
      panel.rotation.y = -br * 0.28;
    }
    if (this.action === "style" || r > 0.002) {
      const sr = this.action === "style" ? r : 0;
      const card = this.refs.fashion.card;
      card.scale.setScalar(Math.max(0.001, sr));
      card.position.y = 1.7 + sr * 0.35;
      if (sr > 0.05) card.lookAt(this.camera.position);
    }

    // — In-place performers
    if (this.radioT >= 0) {
      this.radioT += dt / 1.1;
      const p = Math.min(this.radioT, 1);
      const wob = Math.sin(p * Math.PI * 3) * (1 - p);
      const radio = this.refs.radio;
      radio.body.scale.y = 1 - wob * 0.14;
      radio.body.scale.x = 1 + wob * 0.1;
      radio.body.rotation.z = wob * 0.06;
      for (const knob of radio.knobs) knob.rotation.y += dt * 14 * (1 - p); // platter spin-up
      radio.antenna.rotation.y = 0.7 + wob * 0.3; // tonearm swings into place
      if (p >= 1) {
        radio.body.scale.set(1, 1, 1);
        radio.body.rotation.z = 0;
        this.radioT = -1;
      }
    }

  }
}
