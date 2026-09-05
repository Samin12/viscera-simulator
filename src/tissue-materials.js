import * as THREE from 'three';
import atlasUrl from './assets/tissue-atlas.png?inline';

const SIZE = 512;
const surfaces = {
  liver: { quadrant: [0, 1], color: [156, 88, 99], roughness: 155, seed: 4 },
  fat: { quadrant: [1, 1], color: [220, 151, 70], roughness: 181, seed: 23 },
  membrane: { quadrant: [0, 0], color: [216, 165, 171], roughness: 139, seed: 33 },
  serosa: { quadrant: [1, 0], color: [187, 157, 150], roughness: 151, seed: 13 },
};
const detailCache = new Map();
let atlasPromise;
const mix = (a, b, t) => a + (b - a) * t;
function random(x, y, seed) {
  let n = Math.imul(x + seed * 131, 374761393) + Math.imul(y, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
function noise(x, y, seed) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  return mix(mix(random(ix, iy, seed), random(ix + 1, iy, seed), u),
    mix(random(ix, iy + 1, seed), random(ix + 1, iy + 1, seed), u), v);
}
function detailFor(kind) {
  if (detailCache.has(kind)) return detailCache.get(kind);
  const config = surfaces[kind];
  const color = new Uint8ClampedArray(SIZE * SIZE * 4);
  const bump = new Uint8Array(SIZE * SIZE * 4), rough = new Uint8Array(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const index = (y * SIZE + x) * 4;
    const broad = noise(x / 61, y / 53, config.seed);
    const grain = noise(x / 3.7, y / 4.1, config.seed + 1);
    const fine = noise(x / 1.3, y / 1.6, config.seed + 2);
    const fiber = kind === 'membrane' || kind === 'serosa'
      ? Math.sin(x * .56 + y * .11 + broad * 8) * .13 : 0;
    const relief = 111 + grain * 25 + fine * 21 + fiber * 22;
    const smoothness = config.roughness + (broad - .5) * 58 + (grain - .5) * 38;
    for (let c = 0; c < 3; c++) {
      color[index + c] = config.color[c] * (.86 + broad * .22 + grain * .07);
      bump[index + c] = relief;
      rough[index + c] = smoothness;
    }
    color[index + 3] = bump[index + 3] = rough[index + 3] = 255;
  }
  const detail = { color, bump, rough };
  detailCache.set(kind, detail);
  return detail;
}
function loadAtlas() {
  if (!atlasPromise) atlasPromise = new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => {
      console.warn('Viscera: tissue atlas could not load; procedural tissue colors remain available.');
      resolve(null);
    };
    image.src = atlasUrl;
  });
  return atlasPromise;
}
function configure(texture) {
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}
function detailTexture(bytes) {
  return configure(new THREE.DataTexture(bytes.slice(), SIZE, SIZE, THREE.RGBAFormat));
}

export function createTissueMaps(kind) {
  if (!surfaces[kind]) throw new Error(`Unknown tissue material: ${kind}`);
  const detail = detailFor(kind);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  canvas.getContext('2d').putImageData(new ImageData(detail.color, SIZE, SIZE), 0, 0);
  const map = configure(new THREE.Texture(canvas));
  map.colorSpace = THREE.SRGBColorSpace;
  let disposed = false;
  map.addEventListener('dispose', () => { disposed = true; });
  loadAtlas().then((image) => {
    if (!image || disposed) return;
    // Separate GPU surfaces prevent mipmaps from mixing neighboring tissue types.
    // This samples the original asset at runtime; the saved atlas stays unmodified.
    const [column, row] = surfaces[kind].quadrant;
    const surface = document.createElement('canvas');
    const regionWidth = image.naturalWidth / 2, regionHeight = image.naturalHeight / 2;
    // Keep the allocated GPU dimensions stable when the fallback is replaced.
    surface.width = surface.height = SIZE;
    surface.getContext('2d').drawImage(image, column * regionWidth, (1 - row) * regionHeight,
      regionWidth, regionHeight, 0, 0, SIZE, SIZE);
    map.image = surface;
    if (kind === 'liver') map.repeat.set(2.6, 1.4);
    map.needsUpdate = true;
  });
  return { map, roughnessMap: detailTexture(detail.rough), bumpMap: detailTexture(detail.bump) };
}
