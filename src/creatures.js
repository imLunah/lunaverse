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

  // Eye discs + pupils (pupils scale to blink)
  const pupils = [];
  for (const side of [-1, 1]) {
    const disc = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), std(0xf3e5c8));
    disc.scale.set(1, 1, 0.5);
    disc.position.set(side * 0.16, 0.22, 0.32);
    owl.add(disc);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), std(0x241b2f, { roughness: 0.4 }));
    pupil.position.set(side * 0.16, 0.22, 0.44);
    owl.add(pupil);
    pupils.push(pupil);
  }

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.14, 6), std(accent, { roughness: 0.6 }));
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.1, 0.44);
  owl.add(beak);

  // Ear tufts
  for (const side of [-1, 1]) {
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 6), std(0x6e4a30));
    tuft.position.set(side * 0.24, 0.55, 0.05);
    tuft.rotation.z = -side * 0.35;
    owl.add(tuft);
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

  function update(t, dt) {
    // gentle breathing
    body.scale.y = 1.2 + Math.sin(t * 1.6) * 0.02;
    // head-ish sway
    owl.rotation.y = Math.sin(t * 0.4) * 0.12;
    // blinking
    nextBlink -= dt;
    if (nextBlink <= 0 && blinkT < 0) {
      blinkT = 0;
      nextBlink = 2.5 + Math.random() * 4;
    }
    if (blinkT >= 0) {
      blinkT += dt * 9;
      const s = blinkT < 1 ? 1 - blinkT : blinkT - 1; // down then up
      pupils.forEach((p) => p.scale.setY(Math.max(0.05, baseY * s)));
      if (blinkT >= 2) blinkT = -1;
    }
  }

  return { group: owl, update, wings, body };
}

/** A butterfly drifting a lazy figure-eight. Returns { group, update(t) } */
export function buildButterfly({ center = new THREE.Vector3(), radius = 1.2, speed = 0.35 } = {}) {
  const fly = new THREE.Group();
  const bodyMat = std(0x4a3428, { roughness: 0.7 });
  const wingMat = new THREE.MeshStandardMaterial({
    color: 0xe8a25f,
    roughness: 0.8,
    side: THREE.DoubleSide,
  });
  const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.015, 0.09, 4, 8), bodyMat);
  b.rotation.x = Math.PI / 2;
  fly.add(b);
  const wingGeo = new THREE.CircleGeometry(0.07, 12);
  wingGeo.scale(1.5, 1, 1);
  wingGeo.translate(0.08, 0, 0);
  const wingL = new THREE.Mesh(wingGeo, wingMat);
  const wingR = new THREE.Mesh(wingGeo.clone(), wingMat);
  wingR.rotation.y = Math.PI;
  fly.add(wingL, wingR);

  const pos = new THREE.Vector3();
  const prev = new THREE.Vector3();

  function update(t) {
    const a = t * speed;
    pos.set(
      center.x + Math.sin(a * 2) * radius * 0.7,
      center.y + Math.sin(a * 3.1) * 0.4,
      center.z + Math.cos(a) * radius
    );
    prev.copy(fly.position);
    fly.position.copy(pos);
    const dir = pos.clone().sub(prev);
    if (dir.lengthSq() > 1e-7) {
      fly.lookAt(pos.clone().add(dir));
    }
    const flap = Math.sin(t * 11) * 1.05;
    wingL.rotation.z = flap;
    wingR.rotation.z = -flap;
  }

  return { group: fly, update };
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
