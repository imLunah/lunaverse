import * as THREE from "three";

/** Loads an ambientCG 1K-JPG texture set from /textures/<Asset>/. CC0 licensed. */
const loader = new THREE.TextureLoader();

function tex(path, { srgb = false, repeat = [1, 1] } = {}) {
  const t = loader.load(path);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  return t;
}

export function pbrMaps(asset, repeat = [1, 1]) {
  const base = `/textures/${asset}/${asset}_1K-JPG`;
  return {
    map: tex(`${base}_Color.jpg`, { srgb: true, repeat }),
    normalMap: tex(`${base}_NormalGL.jpg`, { repeat }),
    roughnessMap: tex(`${base}_Roughness.jpg`, { repeat }),
  };
}
