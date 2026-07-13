import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/**
 * Real furniture models: Kenney Furniture Kit (kenney.nl, CC0).
 * GLBs live in /public/models/furniture/. Each placement returns a group
 * immediately (so layout/tagging is synchronous); the mesh pops in when
 * loaded. Await modelsReady() to refresh hover materials afterwards.
 */

const loader = new GLTFLoader();
const pending = [];

export function placeModel(name, { scale = 2, rotationY = 0, offsetY = 0 } = {}) {
  const group = new THREE.Group();
  const p = new Promise((resolve) => {
    loader.load(
      `/models/furniture/${name}.glb`,
      (gltf) => {
        const m = gltf.scene;
        m.scale.setScalar(scale);
        m.rotation.y = rotationY;
        m.traverse((o) => {
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
          }
        });
        // Auto-ground: node transforms vary per model, so measure and sit it on y=0
        const bb = new THREE.Box3().setFromObject(m);
        m.position.y = offsetY - bb.min.y;
        group.add(m);
        resolve(group);
      },
      undefined,
      (err) => {
        console.warn(`model ${name} failed to load`, err);
        resolve(null);
      }
    );
  });
  pending.push(p);
  return group;
}

export function modelsReady() {
  return Promise.all(pending);
}
