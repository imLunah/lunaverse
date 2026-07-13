import * as THREE from "three";

/**
 * Procedural placeholder critters.
 * PLACEHOLDER: swap these for real GLB models (an owl, a robin) exported from
 * Blender — keep userData.action = "owl" on the big owl so it stays clickable.
 */

function std(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, ...opts });
}

/** A round little owl made of spheres. Returns { group, update(t) } */
export function buildOwl({ scale = 1, accent = 0xd96f43 } = {}) {
  const owl = new THREE.Group();

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 20), std(0x8a6548));
  body.scale.set(1, 1.2, 0.95);
  body.castShadow = true;
  owl.add(body);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 16), std(0xd9b98c));
  belly.scale.set(1, 1.15, 0.6);
  belly.position.set(0, -0.08, 0.18);
  owl.add(belly);

  // The face lives in a head group pivoted at the body's center — real owls
  // turn the whole face, so the features sweep around the round body together
  const head = new THREE.Group();
  owl.add(head);

  // Eye discs + pupils — both squash vertically to blink, and close to a
  // slit while asleep (shrinking only the pupils leaves blank staring eyes)
  const pupils = [];
  const eyeDiscs = [];
  for (const side of [-1, 1]) {
    const disc = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), std(0xf3e5c8));
    disc.scale.set(1, 1, 0.5);
    disc.position.set(side * 0.16, 0.22, 0.32);
    head.add(disc);
    eyeDiscs.push(disc);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), std(0x241b2f, { roughness: 0.4 }));
    pupil.position.set(side * 0.16, 0.22, 0.44);
    head.add(pupil);
    pupils.push(pupil);
  }

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.14, 6), std(accent, { roughness: 0.6 }));
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.1, 0.44);
  head.add(beak);

  // Ear tufts
  for (const side of [-1, 1]) {
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 6), std(0x6e4a30));
    tuft.position.set(side * 0.24, 0.55, 0.05);
    tuft.rotation.z = -side * 0.35;
    head.add(tuft);
  }

  // Wings (kept for the flap performance)
  const wings = [];
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), std(0x6e4a30));
    wing.scale.set(0.5, 1.1, 0.8);
    wing.position.set(side * 0.4, -0.05, 0);
    wing.rotation.z = side * 0.25;
    wing.userData.side = side;
    owl.add(wing);
    wings.push(wing);
  }

  // Feet
  for (const side of [-1, 1]) {
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), std(accent, { roughness: 0.6 }));
    foot.scale.set(1.4, 0.5, 1.2);
    foot.position.set(side * 0.14, -0.5, 0.12);
    owl.add(foot);
  }

  owl.scale.setScalar(scale);

  let nextBlink = 2 + Math.random() * 3;
  let blinkT = -1;
  const baseY = pupils[0].scale.y;

  // Cursor gaze: main.js feeds a world-space point; the whole head turns
  const gaze = new THREE.Vector3();
  let hasGaze = false;
  const _local = new THREE.Vector3();

  // Sleep: 0 awake … 1 asleep (main.js feeds the day mix — owls sleep by day)
  let sleepTarget = 0;
  let sleepK = 0;

  function setLookTarget(worldPoint) {
    if (worldPoint) {
      gaze.copy(worldPoint);
      hasGaze = true;
    } else {
      hasGaze = false;
    }
  }

  function setSleep(v) {
    sleepTarget = THREE.MathUtils.clamp(v, 0, 1);
  }

  function update(t, dt) {
    sleepK += (sleepTarget - sleepK) * Math.min(1, dt * 1.8);
    // breathing: slower and deeper while asleep
    body.scale.y = 1.2 + Math.sin(t * (1.6 - 0.9 * sleepK)) * (0.02 + 0.02 * sleepK);
    // gentle body sway, settling when asleep
    owl.rotation.y = Math.sin(t * 0.4) * 0.12 * (1 - 0.6 * sleepK);

    // Head tracking — the face swivels toward the cursor like a real owl
    let ty = 0;
    let tx = 0;
    if (hasGaze && sleepK < 0.95) {
      _local.copy(gaze);
      owl.worldToLocal(_local);
      const dx = _local.x, dy = _local.y - 0.25, dz = _local.z;
      const awake = 1 - sleepK;
      ty = THREE.MathUtils.clamp(Math.atan2(dx, dz), -1.1, 1.1) * awake;
      tx = THREE.MathUtils.clamp(-Math.atan2(dy, Math.hypot(dx, dz)), -0.35, 0.3) * awake;
    }
    tx += 0.38 * sleepK; // asleep: face tucked down into the chest
    const hk = Math.min(1, dt * 6);
    head.rotation.y += (ty - head.rotation.y) * hk;
    head.rotation.x += (tx - head.rotation.x) * hk;

    // Blinking (only while awake) + eyelids shut as sleep sets in
    nextBlink -= dt;
    if (nextBlink <= 0 && blinkT < 0 && sleepK < 0.5) {
      blinkT = 0;
      nextBlink = 2.5 + Math.random() * 4;
    }
    let blinkS = 1;
    if (blinkT >= 0) {
      blinkT += dt * 9;
      blinkS = blinkT < 1 ? 1 - blinkT : blinkT - 1; // down then up
      if (blinkT >= 2) blinkT = -1;
    }
    const open = blinkS * (1 - 0.94 * sleepK);
    pupils.forEach((p) => p.scale.setY(Math.max(0.05, baseY * open)));
    eyeDiscs.forEach((d) => d.scale.setY(Math.max(0.1, open)));
  }

  return { group: owl, update, wings, body, setLookTarget, setSleep };
}

/** A tiny robin that orbits a point (outside the window). Returns { group, update(t) } */
export function buildBird({ center = new THREE.Vector3(), radius = 2.2, speed = 0.7 } = {}) {
  const bird = new THREE.Group();

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12), std(0x7a5a44));
  body.scale.set(1.4, 1, 1);
  bird.add(body);

  const breast = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), std(0xe07a4f));
  breast.position.set(0.08, -0.03, 0);
  bird.add(breast);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), std(0x7a5a44));
  head.position.set(0.18, 0.1, 0);
  bird.add(head);

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 6), std(0xf0a35e, { roughness: 0.5 }));
  beak.rotation.z = -Math.PI / 2;
  beak.position.set(0.3, 0.1, 0);
  bird.add(beak);

  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.08), std(0x5d4433));
  tail.position.set(-0.22, 0.02, 0);
  tail.rotation.z = 0.3;
  bird.add(tail);

  const wingGeo = new THREE.BoxGeometry(0.16, 0.02, 0.3);
  wingGeo.translate(0, 0, 0.15);
  const wingL = new THREE.Mesh(wingGeo, std(0x5d4433));
  wingL.position.set(0, 0.05, 0.08);
  const wingR = new THREE.Mesh(wingGeo.clone(), std(0x5d4433));
  wingR.rotation.y = Math.PI;
  wingR.position.set(0, 0.05, -0.08);
  bird.add(wingL, wingR);

  const pos = new THREE.Vector3();
  const prev = new THREE.Vector3();

  function update(t) {
    const a = t * speed;
    pos.set(
      center.x + Math.cos(a) * radius,
      center.y + Math.sin(a * 1.7) * 0.5,
      center.z + Math.sin(a) * radius * 0.5
    );
    prev.copy(bird.position);
    bird.position.copy(pos);
    if (prev.lengthSq() > 0) {
      const dir = pos.clone().sub(prev);
      if (dir.lengthSq() > 1e-6) {
        bird.lookAt(pos.clone().add(dir));
        bird.rotateY(Math.PI / 2); // model faces +x
      }
    }
    const flap = Math.sin(t * 14) * 0.7;
    wingL.rotation.x = -Math.abs(flap);
    wingR.rotation.x = Math.abs(flap);
  }

  return { group: bird, update };
}
