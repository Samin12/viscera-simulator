import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Procedural operative field for a synthetic training prototype. No patient images,
// recorded operations, or third-party anatomy textures are used by this renderer.
const TITLES = {
  liver: 'Liver', gallbladder: 'Gallbladder', omentum: 'Omentum', adhesions: 'Adhesion',
  triangleFat: 'Peritoneum / triangle fat', cysticDuct: 'Cystic duct', cysticArtery: 'Cystic artery',
  bileDuct: 'Main bile duct · protected', liverBed: 'Gallbladder bed', duodenum: 'Duodenum',
  bleeding: 'Bleeding site', specimen: 'Retrieval bag',
};
const v3 = (p) => new THREE.Vector3(...p);
const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;
const TAU = Math.PI * 2;
const hash = (x, y, seed = 0) => {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return n - Math.floor(n);
};
function noise(x, y, seed = 0) {
  const a = Math.floor(x), b = Math.floor(y), u = x - a, v = y - b;
  const sx = u * u * (3 - 2 * u), sy = v * v * (3 - 2 * v);
  return lerp(lerp(hash(a, b, seed), hash(a + 1, b, seed), sx),
    lerp(hash(a, b + 1, seed), hash(a + 1, b + 1, seed), sx), sy);
}
function proceduralMaps(baseHex, seed, variation = .28) {
  const size = 256, base = new THREE.Color(baseHex);
  const rgba = new Uint8Array(size * size * 4), rough = new Uint8Array(size * size * 4);
  const bump = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const broad = noise(x / 48, y / 48, seed);
      const medium = noise(x / 11, y / 11, seed + 2);
      const fine = noise(x / 2.1, y / 2.1, seed + 3);
      const shade = 1 - variation * .6 + variation * (broad * .75 + medium * .25);
      const redPatch = (medium - .5) * variation * .3;
      const color = base.clone().multiplyScalar(shade);
      color.r = clamp(color.r + redPatch * .16, 0, 1);
      color.g = clamp(color.g - redPatch * .09, 0, 1);
      if (seed === 23 || seed === 28) {
        const primary = Math.abs(x - (29 + y * .28 + Math.sin(y / 34) * 13));
        const branch = y > 91 ? Math.abs(x - (58 + (y - 91) * .74 + Math.sin(y / 25) * 6)) : 99;
        const secondary = Math.abs(x - (208 - y * .13 + Math.sin(y / 42) * 9));
        const vessel = Math.max(Math.exp(-primary * primary / 1.4), Math.exp(-branch * branch / .6) * .7,
          Math.exp(-secondary * secondary / .5) * .52);
        color.r *= 1 - vessel * .28; color.g *= 1 - vessel * .67; color.b *= 1 - vessel * .54;
      }
      color.convertLinearToSRGB();
      rgba[i] = color.r * 255; rgba[i + 1] = color.g * 255; rgba[i + 2] = color.b * 255; rgba[i + 3] = 255;
      const r = 151 + broad * 59 + medium * 18;
      rough[i] = rough[i + 1] = rough[i + 2] = r; rough[i + 3] = 255;
      const b = 105 + medium * 50 + fine * 34;
      bump[i] = bump[i + 1] = bump[i + 2] = b; bump[i + 3] = 255;
    }
  }
  const make = (data, color = false) => {
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true; texture.needsUpdate = true;
    if (color) texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  };
  return { map: make(rgba, true), roughnessMap: make(rough), bumpMap: make(bump) };
}
function sculptedEllipsoid(scale, seed = 0, segments = 42) {
  const geometry = new THREE.SphereGeometry(1, segments, Math.round(segments * .7));
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const wave = 1 + .055 * Math.sin(x * 7 + seed) * Math.cos(y * 8 - seed * .3)
      + .024 * Math.sin(z * 13 + y * 5);
    p.setXYZ(i, x * scale[0] * wave, y * scale[1] * wave, z * scale[2] * wave);
  }
  geometry.computeVertexNormals();
  return geometry;
}
function tubeGeometry(points, radius, { start = 0, end = 1, radial = 14, segments = 54 } = {}) {
  const curve = points instanceof THREE.Curve ? points : new THREE.CatmullRomCurve3(points.map(v3));
  const frames = curve.computeFrenetFrames(segments, false);
  const pos = [], uv = [], index = [];
  for (let i = 0; i <= segments; i++) {
    const t = lerp(start, end, i / segments), p = curve.getPoint(t);
    const tangent = curve.getTangent(t).normalize();
    let normal = new THREE.Vector3(0, 0, 1).cross(tangent).normalize();
    if (normal.lengthSq() < .1) normal = frames.normals[i].clone();
    const binormal = tangent.clone().cross(normal).normalize();
    const r = typeof radius === 'function' ? radius(t) : radius;
    for (let j = 0; j <= radial; j++) {
      const a = j / radial * TAU;
      const ring = normal.clone().multiplyScalar(Math.cos(a)).addScaledVector(binormal, Math.sin(a));
      const q = p.clone().addScaledVector(ring, Math.max(.001, r));
      pos.push(q.x, q.y, q.z); uv.push(j / radial, t);
      if (i < segments && j < radial) {
        const k = i * (radial + 1) + j, n = k + radial + 1;
        index.push(k, n, k + 1, n, n + 1, k + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(index); geometry.computeVertexNormals();
  return geometry;
}
function patchGeometry(mapper, uSegments = 40, vSegments = 28) {
  const geometry = new THREE.PlaneGeometry(1, 1, uSegments, vSegments);
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i) * 2, t = p.getY(i) + .5;
    const point = mapper(u, t);
    p.setXYZ(i, point[0], point[1], point[2]);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function createOperativeScene(container, { onTarget = () => {}, onAction = () => {}, onReady = () => {} } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#130c0b');
  scene.fog = new THREE.FogExp2('#211310', .035);
  const camera = new THREE.PerspectiveCamera(43, 1, .08, 50);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.21;
  renderer.domElement.className = 'operative-canvas';
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none;cursor:crosshair;';
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', 'Operative training field. Move the active instrument with the pointer, click or drag tissue to use it. Right drag to move the camera, scroll to zoom.');
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
  container.appendChild(renderer.domElement);
  const hud = document.createElement('div');
  hud.className = 'operative-scene-hud';
  hud.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:2;';
  const vignette = document.createElement('div');
  vignette.style.cssText = 'position:absolute;inset:0;background:radial-gradient(ellipse at 50% 48%,transparent 39%,rgba(12,6,3,.08) 65%,rgba(9,4,2,.60) 100%);';
  const cursor = document.createElement('div');
  cursor.style.cssText = 'position:absolute;width:16px;height:16px;border:1px solid rgba(204,228,167,.7);border-radius:50%;transform:translate(-50%,-50%);opacity:0;box-shadow:0 0 0 3px #0002;';
  const targetLabel = document.createElement('div');
  targetLabel.style.cssText = 'position:absolute;font:500 10px/1.2 Inter,system-ui,sans-serif;padding:5px 8px;border-radius:4px;background:#101813ca;color:#e4eccd;border:1px solid #cbdba340;white-space:nowrap;display:none;';
  const overlayNotice = document.createElement('div');
  overlayNotice.textContent = 'TEACHING OVERLAY · DEEP ANATOMY';
  overlayNotice.style.cssText = 'position:absolute;right:16px;bottom:54px;font:500 9px/1.2 Inter,system-ui,sans-serif;letter-spacing:.12em;color:#d9e6c0;background:#172016c9;border:1px solid #c4d19e30;border-radius:4px;padding:7px 9px;display:none;';
  hud.append(vignette, cursor, targetLabel, overlayNotice); container.appendChild(hud);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .085;
  controls.enablePan = false; controls.rotateSpeed = .46; controls.zoomSpeed = .7;
  controls.minDistance = 3.7; controls.maxDistance = 10.5;
  controls.minPolarAngle = .3; controls.maxPolarAngle = Math.PI * .81;
  controls.mouseButtons = { LEFT: -1, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
  controls.touches = { ONE: -1, TWO: THREE.TOUCH.DOLLY_ROTATE };
  scene.add(new THREE.HemisphereLight('#eee3d3', '#301710', 1.15));
  const key = new THREE.DirectionalLight('#fff4e6', 2.2); key.position.set(-2.2, 2.8, 5); scene.add(key);
  const fill = new THREE.DirectionalLight('#dfc3bc', .65); fill.position.set(3.7, -.2, 2); scene.add(fill);
  const scopeLight = new THREE.PointLight('#fff1dc', 12, 16, 1.7); scene.add(scopeLight);
  const edge = new THREE.DirectionalLight('#eac0b0', .7); edge.position.set(-3, 1, -2); scene.add(edge);

  const allMaterials = new Set(), allTextures = new Set();
  function material(color, seed = 1, options = {}) {
    const { variation = .32, ...physicalOptions } = options;
    const maps = proceduralMaps(color, seed, variation);
    Object.values(maps).forEach((texture) => allTextures.add(texture));
    const result = new THREE.MeshPhysicalMaterial({ ...maps, color: '#ffffff',
      roughness: .83, metalness: 0, clearcoat: .35, clearcoatRoughness: .24,
      bumpScale: .022, side: THREE.DoubleSide, ...physicalOptions });
    allMaterials.add(result); return result;
  }
  function plainMaterial(options) { const m = new THREE.MeshPhysicalMaterial(options); allMaterials.add(m); return m; }
  const mat = {
    liver: material('#673236', 4, { bumpScale: .024, roughness: .93, clearcoat: .38, clearcoatRoughness: .26, variation: .60 }),
    gb: material('#adb1a0', 13, { bumpScale: .011, roughness: .83, clearcoat: .42, clearcoatRoughness: .24, variation: .32 }),
    gbInflamed: material('#bba5a0', 17, { bumpScale: .021, roughness: .87, clearcoat: .40, clearcoatRoughness: .25, variation: .39 }),
    fat: material('#d6ab50', 23, { bumpScale: .046, clearcoat: .22, clearcoatRoughness: .29, roughness: .98, variation: .49 }),
    fatInflamed: material('#c69a51', 28, { bumpScale: .052, clearcoat: .25, clearcoatRoughness: .29, roughness: .98, variation: .53 }),
    cavity: material('#663e32', 34, { bumpScale: .045, clearcoat: .15, roughness: 1, side: THREE.BackSide }),
    duodenum: material('#b89a83', 5, { bumpScale: .012, roughness: .86, clearcoat: .65 }),
    duct: material('#b9b39a', 8, { roughness: .74, bumpScale: .012, clearcoat: .63 }),
    artery: material('#974c45', 12, { bumpScale: .012, roughness: .72, clearcoat: .7 }),
    vein: plainMaterial({ color: '#824340', roughness: .54, clearcoat: .4, side: THREE.DoubleSide }),
    bed: material('#95564b', 16, { bumpScale: .023, roughness: .92, clearcoat: .54 }),
    membrane: material('#d4bca1', 33, { transparent: true, opacity: .33, depthWrite: false, roughness: .9, bumpScale: .009, clearcoat: .74 }),
    adhesion: material('#d0b7a0', 39, { transparent: true, opacity: .58, depthWrite: false, roughness: .92, bumpScale: .008 }),
    blood: plainMaterial({ color: '#760811', roughness: .19, clearcoat: 1, clearcoatRoughness: .09, side: THREE.DoubleSide }),
    char: plainMaterial({ color: '#36251b', roughness: .96, side: THREE.DoubleSide }),
    metal: plainMaterial({ color: '#aab8ba', metalness: .85, roughness: .22, clearcoat: .3 }),
    metalDark: plainMaterial({ color: '#3b4749', metalness: .76, roughness: .31 }),
    tip: plainMaterial({ color: '#d4dad6', metalness: .88, roughness: .2 }),
    clip: plainMaterial({ color: '#c9d4c6', metalness: .94, roughness: .19 }),
    bag: plainMaterial({ color: '#a2bac2', roughness: .17, metalness: 0, transparent: true, opacity: .29, depthWrite: false, side: THREE.DoubleSide, clearcoat: .9 }),
    bagRim: plainMaterial({ color: '#9fcbdf', roughness: .33, metalness: .15, transparent: true, opacity: .8 }),
    overlayDuct: plainMaterial({ color: '#cddcaf', emissive: '#68794b', emissiveIntensity: .6, transparent: true, opacity: .62, depthTest: false, depthWrite: false }),
    overlayArtery: plainMaterial({ color: '#dc8d80', emissive: '#86362e', emissiveIntensity: .4, transparent: true, opacity: .65, depthTest: false, depthWrite: false }),
  };
  // An original, procedural light environment supplies broad wet highlights
  // and reflections on metal without loading photographic environment maps.
  const environmentPixels = new Uint8Array(256 * 128 * 4);
  for (let y = 0; y < 128; y++) for (let x = 0; x < 256; x++) {
    const index = (y * 256 + x) * 4;
    const panel = Math.exp(-(((x - 71) / 31) ** 2 + ((y - 37) / 16) ** 2)) * 175
      + Math.exp(-(((x - 195) / 21) ** 2 + ((y - 61) / 30) ** 2)) * 116;
    environmentPixels[index] = 43 + panel;
    environmentPixels[index + 1] = 39 + panel * .96;
    environmentPixels[index + 2] = 34 + panel * .88;
    environmentPixels[index + 3] = 255;
  }
  const environmentSource = new THREE.DataTexture(environmentPixels, 256, 128, THREE.RGBAFormat);
  environmentSource.colorSpace = THREE.SRGBColorSpace;
  environmentSource.mapping = THREE.EquirectangularReflectionMapping;
  environmentSource.needsUpdate = true;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environmentTarget = pmrem.fromEquirectangular(environmentSource);
  scene.environment = environmentTarget.texture;
  scene.environmentIntensity = .50;
  environmentSource.dispose(); pmrem.dispose();
  const anatomy = new THREE.Group(), overlayGroup = new THREE.Group(), effects = new THREE.Group();
  scene.add(anatomy, overlayGroup, effects); overlayGroup.visible = false;
  const targets = new Map(), anchors = new Map();
  let currentCase = { initialAdhesions: 0, initialFat: 3, initialBed: 4, inflamed: false, shortDuct: false };
  let maxima = { adhesions: 0, fat: 3, bed: 4 };
  let state = { retracted: false, omentumMoved: false, adhesionsRemaining: 0, fatRemaining: 3, bedRemaining: 4,
    ductClips: 0, arteryClips: 0, ductDivided: false, arteryDivided: false, extracted: false,
    bleeding: 0, smoke: 0, charMarks: 0, injuries: [], activeArm: 'right',
    instruments: { left: 'prograsp', right: 'maryland' }, energyMode: 'off', wristAngle: 0 };
  let fingerprint = '', cameraMode = false, overlayEnabled = false, labelsEnabled = false;
  let tractionArm = 'left';
  let activeArm = 'right', hoveredTarget = null, lastContact = new THREE.Vector3(-.1, -.6, 1.2);
  const bleedingOrigin = lastContact.clone(), smokeOrigin = lastContact.clone(), charLocations = [];
  const omentumGeometryCache = new Map();
  let disposed = false, frameId = 0, width = 1, height = 1, cameraTransition = null;
  let extractionStarted = 0, readySent = false;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const armTips = { left: new THREE.Vector3(-1.34, .2, 1.5), right: new THREE.Vector3(.57, -.78, 1.45) };
  const desiredTips = { left: armTips.left.clone(), right: armTips.right.clone() };
  const instrumentTypes = { left: 'prograsp', right: 'maryland' };
  const armModels = {};
  const smokeSprites = [];
  let specimenGroup = null;

  function attach(group, geometry, material, target = null, options = {}) {
    const object = new THREE.Mesh(geometry, material);
    if (target) object.userData.targetId = target;
    Object.assign(object, options); group.add(object); return object;
  }
  function groupFor(id, anchor) {
    const group = new THREE.Group(); group.name = id; group.userData.targetId = id;
    anatomy.add(group); targets.set(id, group); anchors.set(id, v3(anchor)); return group;
  }
  function addTube(group, points, radius, material, target, options = {}) {
    return attach(group, tubeGeometry(points, radius, options), material, target);
  }
  function destroyContents(group) {
    group.traverse((object) => { if (object.geometry) object.geometry.dispose(); });
    group.clear();
  }
  function addVessel(group, points, radius, target = null) { return addTube(group, points, radius, mat.vein, target, { radial: 6, segments: 30 }); }
  function deltaForGb() {
    const released = state.ductDivided && state.arteryDivided ? 1 - state.bedRemaining / Math.max(1, maxima.bed) : 0;
    return new THREE.Vector3(-released * .43, released * .25, released * .63);
  }
  function gbPoint(t) {
    const lift = state.retracted ? .72 : 0;
    const points = [[-.25, -.65, .91], [-.45, -.4 + lift * .11, 1.00], [-.68 - lift * .18, .0 + lift * .36, 1.09], [-.81 - lift * .21, .41 + lift * .72, 1.04], [-.87 - lift * .28, .72 + lift, .9]];
    const p = new THREE.CatmullRomCurve3(points.map(v3)).getPoint(t);
    return p.add(deltaForGb());
  }
  function gbCurve() { return new THREE.CatmullRomCurve3(Array.from({ length: 8 }, (_, i) => gbPoint(i / 7))); }
  function gbRadius(t) {
    const fullness = currentCase.inflamed ? 1.2 : 1;
    return (.075 * (1 - t) + .39 * Math.pow(Math.max(.00001, Math.sin(Math.PI * t)), .65) * (.6 + t * .5)) * fullness;
  }

  function buildLiver() {
    const g = groupFor('liver', [-1.92, 1.5, .53]);
    const geo = new THREE.SphereGeometry(1, 90, 54), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const taper = 1 - Math.max(0, x) * .28;
      const notch = y < 0 ? .19 * Math.exp(-((x - .05) ** 2) / .07) * -y : 0;
      p.setXYZ(i, x * 4.65, 1.95 + y * 1.71 * taper + .11 * x + notch + (state.retracted ? .12 : 0),
        z * 1.19 * taper - .67 + .025 * Math.sin(x * 17) * Math.cos(y * 14));
    }
    geo.computeVertexNormals(); attach(g, geo, mat.liver, 'liver');
    for (let i = 0; i < 4; i++) {
      const x = -2.8 + i * 1.5;
      addVessel(g, [[x, 1.28, .4], [x + .17, 1.55, .49], [x + .06, 1.86, .48]], .009, 'liver');
    }
    // Dim curved abdominal wall remains around the operative recess, not as a flat backdrop.
    const backGeometry = sculptedEllipsoid([5.8, 4.7, 2.4], 9, 48);
    const bp = backGeometry.attributes.position, bi = backGeometry.index.array, openIndices = [];
    for (let i = 0; i < bi.length; i += 3) {
      if ([bi[i], bi[i + 1], bi[i + 2]].every((index) => bp.getZ(index) < .1)) openIndices.push(bi[i], bi[i + 1], bi[i + 2]);
    }
    backGeometry.setIndex(openIndices);
    const back = new THREE.Mesh(backGeometry, mat.cavity);
    back.position.set(0, -.05, -2.1); back.scale.z = .55; anatomy.add(back);
  }
  function buildGallbladder() {
    const anchor = gbPoint(.47).add(new THREE.Vector3(0, 0, .38));
    const g = groupFor('gallbladder', anchor.toArray());
    g.visible = !state.extracted;
    const curve = gbCurve();
    attach(g, tubeGeometry(curve, gbRadius, { radial: 32, segments: 94 }), currentCase.inflamed ? mat.gbInflamed : mat.gb, 'gallbladder');
    const p = (t, xOff = 0, zOff = 0) => {
      const q = curve.getPoint(t); q.x += xOff; q.z += gbRadius(t) + zOff; return q.toArray();
    };
    addVessel(g, [p(.19, .05), p(.34, .03), p(.52, -.07), p(.73, -.08), p(.89, -.04)], .012, 'gallbladder');
    addVessel(g, [p(.35, .03), p(.46, .15, -.02), p(.64, .25, -.06)], .007, 'gallbladder');
    addVessel(g, [p(.55, -.06), p(.65, -.19, -.02), p(.80, -.21, -.07)], .008, 'gallbladder');
    addVessel(g, [p(.71, -.08), p(.80, .02), p(.91, .06, -.03)], .006, 'gallbladder');
  }
  function buildOmentum() {
    const moved = state.omentumMoved;
    const g = groupFor('omentum', [-.75, moved ? -2.03 : -1.16, 1.31]);
    const cachedGeometry = omentumGeometryCache.get(Boolean(moved));
    const geo = cachedGeometry ? cachedGeometry.clone() : patchGeometry((u, t) => {
      const x = u * 4.0 - .23;
      const edge = Math.sqrt(Math.max(.001, 1 - u * u));
      const top = -.84 + .17 * Math.sin(u * 3.8) + .08 * Math.cos(u * 9) - .23 * (1 - edge);
      const y = top - t * (1.9 * edge + .3) - (moved ? .93 : 0);
      let bulge = 0;
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 20; col++) {
          const cx = -3.96 + col * .42 + (row % 2) * .22 + (hash(col, row, 11) - .5) * .22;
          const cy = -.98 - row * .33 + .09 * Math.sin(col * 1.8) + (hash(col, row, 18) - .5) * .16;
          const dx = (x - cx) / (.22 + .09 * hash(col, row, 9)), dy = (y + (moved ? .93 : 0) - cy) / (.18 + .10 * hash(col, row, 15));
          bulge += (.16 + .05 * Math.sin(col * 1.9 + row * 2.6)) * Math.exp(-(dx * dx + dy * dy) * 1.7);
        }
      }
      const z = 1.13 - .33 * t + .16 * Math.cos(u * 3) + bulge + .045 * Math.sin(u * 17 + t * 8) * Math.sin(t * Math.PI)
        - (moved ? .19 : 0);
      return [x, y, z];
    }, 128, 62);
    if (!cachedGeometry) {
      const positions = geo.attributes.position, colors = [];
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i), y = positions.getY(i);
        const tone = .81 + noise(x * 4, y * 4, 53) * .17 + noise(x * 13, y * 11, 19) * .045;
        colors.push(tone, tone * .976, tone * .93);
      }
      geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      omentumGeometryCache.set(Boolean(moved), geo.clone());
    }
    mat.fat.vertexColors = true; mat.fatInflamed.vertexColors = true;
    attach(g, geo, currentCase.inflamed ? mat.fatInflamed : mat.fat, 'omentum');
    // Narrow pink vessels rest on the fatty apron rather than floating as atlas tubes.
    for (let i = 0; i < 7; i++) {
      const x = -2.8 + i * .78, yOff = moved ? -.93 : 0, zOff = moved ? -.19 : 0;
      addVessel(g, [[x, -1.12 + yOff, 1.43 + zOff], [x + .17, -1.43 + yOff, 1.43 + zOff], [x + .04, -1.86 + yOff, 1.30 + zOff], [x + .23, -2.22 + yOff, 1.12 + zOff]], .009, 'omentum');
      addVessel(g, [[x + .14, -1.43 + yOff, 1.44 + zOff], [x + .36, -1.6 + yOff, 1.42 + zOff], [x + .49, -1.85 + yOff, 1.31 + zOff]], .005, 'omentum');
    }
  }
  function buildContext() {
    const g = groupFor('duodenum', [1.84, -1.32, .30]);
    const points = [[2.77, -.43, -.22], [2.38, -.77, .03], [1.8, -1.09, .11], [1.56, -1.58, .08], [1.86, -1.95, -.22]];
    attach(g, tubeGeometry(points, .31, { radial: 24, segments: 58 }), mat.duodenum, 'duodenum');
    // Mesenteric coverage keeps context organs embedded in the field.
    const flank = new THREE.Group(); anatomy.add(flank);
    const rightFat = attach(flank, sculptedEllipsoid([1.3, .86, .35], 7), mat.fat);
    rightFat.position.set(2.73, -.86, .32); rightFat.rotation.z = .25;
    const leftFat = attach(flank, sculptedEllipsoid([1.23, 1.1, .38], 11), mat.fat);
    leftFat.position.set(-3.34, -.67, .22); leftFat.rotation.z = -.35;
  }
  function buildAdhesions() {
    const remaining = clamp(Number(state.adhesionsRemaining) || 0, 0, maxima.adhesions);
    const g = groupFor('adhesions', [-.73, -.48, 1.52]);
    g.visible = remaining > 0 && !state.extracted;
    const firstVisible = maxima.adhesions - remaining;
    for (let i = firstVisible; i < maxima.adhesions; i++) {
      const x = -1.45 + i * .36, lift = state.retracted ? .43 : 0;
      const membrane = patchGeometry((u, t) => {
        const width = (.1 + .13 * Math.sin(Math.PI * t)) * (i % 2 ? 1.35 : 1);
        return [x + u * width + .15 * Math.sin(t * 3), lerp(-1.04 - (state.omentumMoved ? .65 : 0), .44 + lift, t),
          1.27 + .23 * Math.sin(Math.PI * t) - .28 * t + .035 * Math.cos(u * 4 + t * 5)];
      }, 12, 38);
      attach(g, membrane, mat.adhesion, 'adhesions');
      for (let strand = -1; strand <= 1; strand++) {
        addTube(g, [[x + strand * .08, -1.02 - (state.omentumMoved ? .65 : 0), 1.27],
          [x + strand * .09 + .12, -.30, 1.51], [x + strand * .05 + .04, .43 + lift, .99]],
        .009, mat.membrane, 'adhesions', { radial: 5, segments: 32 });
      }
    }
  }
  function buildTriangleFat() {
    const remaining = clamp(Number(state.fatRemaining) || 0, 0, maxima.fat);
    const g = groupFor('triangleFat', [-.07, -.6, 1.21]);
    g.visible = remaining > 0 && !state.extracted;
    const patches = [
      { center: [-.19, -.60, 1.13], scale: [.47, .28, .15], angle: -.34 },
      { center: [.19, -.77, .98], scale: [.42, .31, .19], angle: .23 },
      { center: [-.25, -.19, .94], scale: [.32, .33, .16], angle: -.28 },
      { center: [.35, -.33, .73], scale: [.34, .44, .15], angle: .2 },
    ];
    const firstVisible = maxima.fat - remaining;
    for (let i = firstVisible; i < maxima.fat; i++) {
      const patch = patches[i % patches.length];
      const mesh = attach(g, sculptedEllipsoid(patch.scale, 14 + i * 3, 42), currentCase.inflamed ? mat.fatInflamed : mat.fat, 'triangleFat');
      mesh.position.copy(v3(patch.center)); mesh.rotation.z = patch.angle;
      addVessel(g, [[patch.center[0] - .19, patch.center[1] - .02, patch.center[2] + patch.scale[2]],
        [patch.center[0], patch.center[1] + .07, patch.center[2] + patch.scale[2] * 1.06],
        [patch.center[0] + .21, patch.center[1] + .12, patch.center[2] + patch.scale[2] * .7]], .006, 'triangleFat');
    }
    if (remaining > 0) {
      // The shiny peritoneal film spans the fat and neck, then disappears only
      // after all modeled patches have been addressed by the simulation engine.
      const membrane = patchGeometry((u, t) => {
        const halfWidth = .14 + .38 * Math.sin(Math.PI * t);
        return [-.05 + u * halfWidth, lerp(-1.02, -.05, t), 1.0 + .29 * Math.sin(Math.PI * t)
          + .04 * Math.cos(u * 3.5) + .018 * Math.sin(u * 12 + t * 13)];
      }, 32, 38);
      attach(g, membrane, mat.membrane, 'triangleFat');
    }
  }
  function clipMesh(group, curve, t, radius, target, delta = null) {
    const center = curve.getPoint(t); if (delta) center.add(delta);
    const tangent = curve.getTangent(t).normalize();
    const clip = new THREE.Group(); clip.position.copy(center);
    clip.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent); group.add(clip);
    const width = radius * 1.45, depth = radius * 1.45;
    const points = [[-width, -.025, -depth], [-width * 1.1, -.025, depth], [0, -.025, depth * 1.27], [width * 1.1, -.025, depth], [width, -.025, -depth]];
    addTube(clip, points, .017, mat.clip, target, { radial: 7, segments: 22 });
    addTube(clip, points.map((p) => [p[0], .025, p[2]]), .014, mat.clip, target, { radial: 7, segments: 22 });
    addTube(clip, [[-width, -.025, -depth], [-width, .025, -depth]], .019, mat.clip, target, { radial: 6, segments: 4 });
  }
  function buildPedicle() {
    const baseX = currentCase.shortDuct ? .10 : .49;
    const main = groupFor('bileDuct', [baseX, -.99, .24]);
    // Main duct is embedded posteriorly; its full course is available only as a teaching overlay.
    const mainPoints = [[baseX + .03, .18, -.20], [baseX, -.55, .06], [baseX + .08, -1.08, .17], [baseX + .25, -1.76, -.07]];
    addTube(main, mainPoints, .086, mat.duct, 'bileDuct', { radial: 16 });
    const ductPoints = [[-.25, -.65, .91], [-.10, -.77, .88], [baseX - .12, -.92, .55], [baseX + .06, -1.04, .19]];
    const arteryPoints = [[-.43, -.39, 1.0], [-.19, -.30, .99], [.12, -.36, .69], [.20, -.06, .25]];
    const definitions = [
      { id: 'cysticDuct', points: ductPoints, radius: .064, material: mat.duct, divided: state.ductDivided, clips: state.ductClips },
      { id: 'cysticArtery', points: arteryPoints, radius: .034, material: mat.artery, divided: state.arteryDivided, clips: state.arteryClips },
    ];
    for (const definition of definitions) {
      const curve = new THREE.CatmullRomCurve3(definition.points.map(v3));
      const anchor = curve.getPoint(.40); anchor.z += .10;
      const g = groupFor(definition.id, anchor.toArray());
      const shift = definition.divided ? deltaForGb() : new THREE.Vector3();
      const attachedSegment = addTube(g, curve, definition.radius, definition.material, definition.id, { start: 0, end: .44, radial: 16, segments: 28 });
      attachedSegment.position.copy(shift); attachedSegment.visible = !state.extracted;
      if (!definition.divided) addTube(g, curve, definition.radius, definition.material, definition.id, { start: .44, end: .60, radial: 16, segments: 14 });
      addTube(g, curve, definition.radius, definition.material, definition.id, { start: .60, end: 1, radial: 16, segments: 28 });
      if (definition.divided) {
        for (const endpoint of [.44, .60]) {
          if (endpoint === .44 && state.extracted) continue;
          const disk = attach(g, new THREE.CircleGeometry(definition.radius * .94, 16), definition.material, definition.id);
          disk.position.copy(curve.getPoint(endpoint)); if (endpoint === .44) disk.position.add(shift);
          disk.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), curve.getTangent(endpoint));
        }
      }
      const clipLocations = [.72, .87, .26, .34, .94];
      for (let i = 0; i < Math.min(5, definition.clips || 0); i++) {
        if (state.extracted && clipLocations[i] < .44) continue;
        clipMesh(g, curve, clipLocations[i], definition.radius, definition.id, clipLocations[i] < .44 ? shift : null);
      }
      const teaching = addTube(overlayGroup, curve, definition.radius * .7, definition.id === 'cysticArtery' ? mat.overlayArtery : mat.overlayDuct, null, { radial: 10 });
      teaching.renderOrder = 8;
    }
    const teaching = addTube(overlayGroup, mainPoints, .055, mat.overlayDuct, null, { radial: 10 }); teaching.renderOrder = 8;
    // Deep hilar connective tissue stops the main duct from reading as a bare, colored target.
    const sheath = attach(anatomy, sculptedEllipsoid([.51, .95, .21], 24), mat.bed);
    sheath.position.set(baseX + .15, -.66, -.15); sheath.rotation.z = -.14;
  }
  function buildBed() {
    const remaining = clamp(Number(state.bedRemaining) || 0, 0, maxima.bed);
    const g = groupFor('liverBed', [-.84, .23, .76]);
    const bedSurface = patchGeometry((u, t) => {
      const centerX = lerp(-.39, -1.08, t), centerY = lerp(-.30, .82 + (state.retracted ? .14 : 0), t);
      const halfWidth = .04 + .27 * Math.pow(Math.sin(Math.PI * t), .65);
      return [centerX + u * halfWidth, centerY + u * halfWidth * .30,
        .58 + .13 * Math.sin(t * Math.PI) + .024 * Math.sin(u * 10 + t * 15)];
    }, 36, 44);
    attach(g, bedSurface, mat.bed, 'liverBed');
    if (state.extracted) return;
    if (!state.lowerThirdReviewed) {
      const lowerBridge = patchGeometry((u, t) => {
        const along = .10 + t * .25;
        const body = gbPoint(along), back = new THREE.Vector3(lerp(-.4, -1.08, along), lerp(-.29, .92, along), .58);
        const phase = (u + 1) / 2;
        const point = back.clone().lerp(body.clone().add(new THREE.Vector3(.03, 0, -gbRadius(along) * .74)), phase);
        return [point.x, point.y, point.z + .015 * Math.sin(u * 5 + t * 8)];
      }, 20, 24);
      attach(g, lowerBridge, mat.membrane, 'liverBed');
    }
    const removed = maxima.bed - remaining;
    for (let i = removed; i < maxima.bed; i++) {
      const t = .40 + (i + .5) / maxima.bed * .50;
      const body = gbPoint(t), back = new THREE.Vector3(lerp(-.4, -1.08, t), lerp(-.29, .92, t), .58);
      const bridge = patchGeometry((u, phase) => {
        const p = back.clone().lerp(body.clone().add(new THREE.Vector3(.04, 0, -gbRadius(t) * .72)), phase);
        const halfWidth = .085 + .026 * Math.sin(Math.PI * phase);
        return [p.x + u * halfWidth, p.y + u * .045, p.z + .016 * Math.sin(u * 5 + phase * 9)];
      }, 12, 22);
      attach(g, bridge, mat.bed, 'liverBed');
    }
  }
  function buildBloodAndChar() {
    const g = groupFor('bleeding', bleedingOrigin.toArray());
    g.visible = Number(state.bleeding) > 0;
    if (g.visible) {
      const level = clamp(Number(state.bleeding) || 0, 0, 5);
      const radius = .15 + level * .08;
      const pool = attach(g, sculptedEllipsoid([radius * 1.3, radius, .036], 40, 38), mat.blood, 'bleeding');
      pool.position.copy(bleedingOrigin).add(new THREE.Vector3(0, -.10, .045));
      for (let i = 0; i < 3; i++) {
        const x = bleedingOrigin.x + (i - 1) * .065;
        addTube(g, [[x, bleedingOrigin.y, bleedingOrigin.z + .045], [x + .07, bleedingOrigin.y - .3, bleedingOrigin.z + .055],
          [x + .15, bleedingOrigin.y - .66, Math.max(.75, bleedingOrigin.z - .16)]], .018 + level * .005, mat.blood, 'bleeding', { radial: 8, segments: 30 });
      }
    }
    const charCount = Math.min(20, Number(state.charMarks) || 0);
    for (let i = 0; i < charCount; i++) {
      const mark = attach(effects, sculptedEllipsoid([.048 + hash(i, 7) * .03, .03, .006], i, 18), mat.char);
      const point = charLocations[i] || lastContact;
      mark.position.set(point.x + (hash(i, 4) - .5) * .3, point.y + (hash(i, 9) - .5) * .28, point.z + .01);
    }
  }
  function buildSpecimen() {
    const g = groupFor('specimen', [-.7, -.2, 1.7]); specimenGroup = g;
    g.visible = Boolean(state.extracted);
    if (!state.extracted) return;
    const bagShape = new THREE.LatheGeometry([
      new THREE.Vector2(.02, -.8), new THREE.Vector2(.28, -.77), new THREE.Vector2(.47, -.48),
      new THREE.Vector2(.50, .02), new THREE.Vector2(.42, .43), new THREE.Vector2(.46, .52),
    ], 40);
    attach(g, bagShape, mat.bag, 'specimen');
    const rim = attach(g, new THREE.TorusGeometry(.46, .023, 10, 48), mat.bagRim, 'specimen');
    rim.rotation.x = Math.PI / 2; rim.position.y = .52;
    const specimen = attach(g, sculptedEllipsoid([.26, .49, .25], 13), currentCase.inflamed ? mat.gbInflamed : mat.gb, 'specimen');
    specimen.position.y = -.14;
    addTube(g, [[-.45, .51, 0], [-.29, .89, 0], [.0, 1.12, 0], [.30, .87, 0], [.46, .52, 0]], .012, mat.bagRim, 'specimen', { radial: 7, segments: 32 });
  }
  function rebuildField() {
    destroyContents(anatomy); destroyContents(overlayGroup); destroyContents(effects);
    targets.clear(); anchors.clear(); specimenGroup = null;
    buildLiver(); buildGallbladder(); buildContext(); buildPedicle(); buildBed();
    buildOmentum(); buildAdhesions(); buildTriangleFat(); buildBloodAndChar(); buildSpecimen();
    overlayGroup.visible = overlayEnabled;
  }

  function cylinderSegment(group, start, end, radius, material, radial = 16) {
    const a = v3(start), b = v3(end), direction = b.clone().sub(a);
    const object = attach(group, new THREE.CylinderGeometry(radius, radius, direction.length(), radial), material);
    object.position.copy(a).add(b).multiplyScalar(.5);
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()); return object;
  }
  function makeJaw(group, side, type) {
    const jaw = new THREE.Group(); jaw.position.set(side * .025, .01, 0); group.add(jaw);
    if (['prograsp', 'cadiere', 'fenestrated'].includes(type)) {
      const width = type === 'prograsp' ? .051 : .040;
      const length = type === 'cadiere' ? .28 : .23;
      const rim = [[-width, 0, 0], [-width * .88, length * .75, -.013], [-width * .42, length, -.027],
        [width * .42, length, -.027], [width * .88, length * .75, -.013], [width, 0, 0], [-width, 0, 0]];
      addTube(jaw, rim, .013, mat.tip, null, { radial: 7, segments: 34 });
      for (let i = 1; i < 5; i++) cylinderSegment(jaw, [-width, i * length / 5, -.015], [width, i * length / 5, -.015], .006, mat.metalDark, 6);
    } else if (type === 'scissors') {
      const shape = new THREE.Shape(); shape.moveTo(-.024, 0); shape.lineTo(.025, .07); shape.lineTo(.006, .30); shape.lineTo(-.018, .22); shape.closePath();
      const blade = attach(jaw, new THREE.ExtrudeGeometry(shape, { depth: .012, bevelEnabled: false }), mat.tip); blade.position.z = -.006;
    } else if (type === 'clip') {
      addTube(jaw, [[0, 0, 0], [side * .018, .10, 0], [side * .016, .23, -.012], [-side * .007, .28, -.018]], .019, mat.tip, null, { radial: 9, segments: 22 });
    } else {
      addTube(jaw, [[0, 0, 0], [side * .012, .11, -.006], [-side * .006, .21, -.025], [-side * .028, .27, -.04]], .015, mat.tip, null, { radial: 9, segments: 26 });
    }
    jaw.userData.side = side; return jaw;
  }
  function buildInstrument(arm, type) {
    if (armModels[arm]) {
      scene.remove(armModels[arm].group); destroyContents(armModels[arm].group);
    }
    const group = new THREE.Group(); group.name = `${arm}-instrument`; scene.add(group);
    const shaft = attach(group, new THREE.CylinderGeometry(.041, .043, 1, 20), mat.metal);
    const wrist = new THREE.Group(); group.add(wrist);
    cylinderSegment(wrist, [0, -.21, 0], [0, -.05, 0], .059, mat.metalDark);
    cylinderSegment(wrist, [0, -.04, 0], [0, .02, 0], .056, mat.tip);
    const pin = attach(wrist, new THREE.CylinderGeometry(.028, .028, .135, 14), mat.metal); pin.rotation.z = Math.PI / 2; pin.position.y = -.08;
    const tipRoot = new THREE.Group(); wrist.add(tipRoot);
    const jaws = [];
    if (type === 'hook') {
      cylinderSegment(tipRoot, [0, .01, 0], [0, .17, 0], .019, mat.metalDark);
      addTube(tipRoot, [[0, .16, 0], [0, .23, 0], [.02, .265, 0], [.092, .265, 0]], .012, mat.tip, null, { radial: 8, segments: 22 });
    } else if (type === 'suction') {
      const suction = attach(tipRoot, new THREE.CylinderGeometry(.044, .05, .25, 20, 1, true), mat.tip); suction.position.y = .13;
      const hole = attach(tipRoot, new THREE.CircleGeometry(.035, 20), mat.metalDark); hole.rotation.x = -Math.PI / 2; hole.position.y = .257;
      const rim = attach(tipRoot, new THREE.TorusGeometry(.041, .008, 8, 26), mat.tip); rim.rotation.x = Math.PI / 2; rim.position.y = .26;
    } else if (type === 'retrieval') {
      const hoop = attach(tipRoot, new THREE.TorusGeometry(.20, .012, 8, 40), mat.bagRim); hoop.position.y = .22; hoop.scale.y = .8;
      const pocket = attach(tipRoot, sculptedEllipsoid([.18, .24, .10], 11, 24), mat.bag); pocket.position.set(0, .11, -.04);
    } else {
      jaws.push(makeJaw(tipRoot, -1, type), makeJaw(tipRoot, 1, type));
    }
    const sleeve = attach(group, new THREE.CylinderGeometry(.06, .06, .45, 18), mat.metalDark);
    armModels[arm] = { group, shaft, sleeve, wrist, tipRoot, jaws, type };
  }
  function setInstrument(arm, type) {
    if (!['left', 'right'].includes(arm)) return;
    const allowed = ['prograsp', 'cadiere', 'fenestrated', 'maryland', 'scissors', 'hook', 'clip', 'suction', 'retrieval'];
    const resolved = allowed.includes(type) ? type : 'maryland';
    if (instrumentTypes[arm] === resolved && armModels[arm]) return;
    instrumentTypes[arm] = resolved; buildInstrument(arm, resolved);
  }
  function setActiveArm(arm) { if (arm === 'left' || arm === 'right') activeArm = arm; }
  const smokeTexture = (() => {
    const size = 64, data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const dx = (x - size / 2) / (size / 2), dy = (y - size / 2) / (size / 2);
      const alpha = Math.max(0, 1 - dx * dx - dy * dy) ** 2;
      data[i] = 192; data[i + 1] = 185; data[i + 2] = 170; data[i + 3] = alpha * 160;
    }
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat); texture.needsUpdate = true; texture.magFilter = THREE.LinearFilter;
    allTextures.add(texture); return texture;
  })();
  for (let i = 0; i < 12; i++) {
    const material = new THREE.SpriteMaterial({ map: smokeTexture, transparent: true, opacity: 0, depthWrite: false });
    allMaterials.add(material);
    const sprite = new THREE.Sprite(material); sprite.visible = false; scene.add(sprite); smokeSprites.push(sprite);
  }

  function sceneFingerprint(next) {
    return JSON.stringify([next.retracted, next.omentumMoved, next.adhesionsRemaining, next.fatRemaining, next.bedRemaining,
      next.ductClips, next.arteryClips, next.ductDivided, next.arteryDivided, next.extracted, next.lowerThirdReviewed,
      Math.round((Number(next.bleeding) || 0) * 4) / 4, next.charMarks, next.injuries?.length]);
  }
  function syncState(next = {}) {
    const wasExtracted = state.extracted;
    const newlyRetracted = Boolean(next.retracted) && !state.retracted;
    if (newlyRetracted) {
      const proposed = next.activeArm || activeArm;
      const proposedTool = next.instruments?.[proposed] || instrumentTypes[proposed];
      tractionArm = ['prograsp', 'cadiere', 'fenestrated'].includes(proposedTool) ? proposed : 'left';
    }
    if (Number(next.bleeding) > Number(state.bleeding)) bleedingOrigin.copy(lastContact);
    if (Number(next.smoke) > Number(state.smoke)) smokeOrigin.copy(lastContact);
    while (charLocations.length < Math.min(20, Number(next.charMarks) || 0)) charLocations.push(lastContact.clone());
    const storedInjuries = (next.injuries || []).filter((injury) => Array.isArray(injury.point) && injury.point.length === 3 && injury.point.every(Number.isFinite));
    if (storedInjuries.length && Number(next.bleeding) > 0) bleedingOrigin.copy(v3(storedInjuries.at(-1).point));
    const thermalInjuries = storedInjuries.filter((injury) => /thermal|energy/.test(injury.kind));
    for (let i = 0; i < Math.min(thermalInjuries.length, charLocations.length); i++) charLocations[i].copy(v3(thermalInjuries[i].point));
    state = { ...state, ...next, instruments: { ...state.instruments, ...next.instruments } };
    state.adhesionsRemaining = clamp(Number(state.adhesionsRemaining) || 0, 0, maxima.adhesions);
    state.fatRemaining = clamp(Number(state.fatRemaining) || 0, 0, maxima.fat);
    state.bedRemaining = clamp(Number(state.bedRemaining) || 0, 0, maxima.bed);
    if (state.extracted && !wasExtracted) extractionStarted = performance.now();
    setActiveArm(state.activeArm);
    if (newlyRetracted) desiredTips[tractionArm].copy(gbPoint(.83)).add(new THREE.Vector3(0, 0, gbRadius(.83)));
    setInstrument('left', state.instruments.left); setInstrument('right', state.instruments.right);
    const nextFingerprint = sceneFingerprint(state);
    if (nextFingerprint !== fingerprint) { fingerprint = nextFingerprint; rebuildField(); }
  }
  function setCase(caseObject = {}) {
    currentCase = { initialAdhesions: 0, initialFat: 3, initialBed: 4, inflamed: false, shortDuct: false, ...caseObject };
    maxima = { adhesions: Number(currentCase.initialAdhesions ?? currentCase.adhesionLevel) || 0,
      fat: Number(currentCase.initialFat) || 3, bed: Number(currentCase.initialBed) || 4 };
    state = { ...state, retracted: false, omentumMoved: false, adhesionsRemaining: maxima.adhesions,
      fatRemaining: maxima.fat, bedRemaining: maxima.bed, ductClips: 0, arteryClips: 0,
      ductDivided: false, arteryDivided: false, extracted: false, lowerThirdReviewed: false, bleeding: 0, smoke: 0, charMarks: 0, injuries: [] };
    lastContact.set(-.1, -.6, 1.2); bleedingOrigin.copy(lastContact); smokeOrigin.copy(lastContact); charLocations.length = 0; extractionStarted = 0; fingerprint = '';
    syncState(state); setView('operative');
  }
  const views = {
    operative: { position: [.33, -.49, 7.4], target: [-.18, -.17, .55] },
    closeup: { position: [.04, -.34, 5.1], target: [-.20, -.40, .83] },
    posterior: { position: [3.1, -.07, -5.3], target: [-.15, -.15, .45] },
  };
  function moveCamera(position, target) {
    if (reduceMotion) { camera.position.copy(position); controls.target.copy(target); controls.update(); }
    else cameraTransition = { start: performance.now(), from: camera.position.clone(), targetFrom: controls.target.clone(), to: position, targetTo: target };
  }
  function setView(view) { const preset = views[view] || views.operative; moveCamera(v3(preset.position), v3(preset.target)); }
  function setOverlay(value) { overlayEnabled = Boolean(value); overlayGroup.visible = overlayEnabled; overlayNotice.style.display = overlayEnabled ? 'block' : 'none'; }
  function setLabels(value) { labelsEnabled = Boolean(value); if (!labelsEnabled) targetLabel.style.display = 'none'; }
  function setCameraMode(value) {
    cameraMode = Boolean(value); controls.mouseButtons.LEFT = cameraMode ? THREE.MOUSE.ROTATE : -1;
    controls.touches.ONE = cameraMode ? THREE.TOUCH.ROTATE : -1;
    renderer.domElement.style.cursor = cameraMode ? 'grab' : 'crosshair';
    cursor.style.opacity = cameraMode ? '0' : hoveredTarget ? '1' : '0';
  }
  function focusTarget(id) {
    if (!anchors.has(id)) return;
    const anchor = anchors.get(id).clone();
    moveCamera(anchor.clone().add(new THREE.Vector3(.1, .14, 4.8)), anchor);
    hoveredTarget = id; desiredTips[activeArm].copy(anchor).add(new THREE.Vector3(0, 0, .1)); onTarget(id);
  }

  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  const operationPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -1.1);
  const drag = { active: false, x: 0, y: 0, target: null, point: new THREE.Vector3(), amount: 0, lastEmit: 0 };
  function pick(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const candidates = [];
    anatomy.traverseVisible((object) => { if (object.isMesh) candidates.push(object); });
    const hit = raycaster.intersectObjects(candidates, false)[0];
    const fallback = raycaster.ray.intersectPlane(operationPlane, new THREE.Vector3());
    return { target: hit?.object.userData.targetId || null, point: hit?.point || fallback };
  }
  function updatePointer(event) {
    const hit = pick(event);
    if (hit.target !== hoveredTarget) { hoveredTarget = hit.target; onTarget(hit.target); }
    if (hit.point) {
      desiredTips[activeArm].copy(hit.point).add(new THREE.Vector3(0, 0, .03));
    }
    cursor.style.opacity = hit.target && !cameraMode ? '1' : '0';
    return hit;
  }
  function pointerDown(event) {
    cameraTransition = null;
    if (event.button !== 0 || cameraMode) return;
    const hit = updatePointer(event);
    drag.active = true; drag.x = event.clientX; drag.y = event.clientY;
    drag.target = hit.target; drag.amount = 0; drag.lastEmit = performance.now();
    if (hit.point) drag.point.copy(hit.point);
    renderer.domElement.setPointerCapture(event.pointerId);
  }
  function pointerMove(event) {
    if (cameraMode || (event.buttons & 2)) return;
    const hit = updatePointer(event);
    if (!drag.active) return;
    drag.amount = Math.hypot(event.clientX - drag.x, event.clientY - drag.y);
    const now = performance.now();
    const grasping = ['prograsp', 'cadiere', 'fenestrated'].includes(instrumentTypes[activeArm]);
    const contactTarget = grasping ? drag.target : hit.target;
    if (contactTarget && drag.amount > 5 && now - drag.lastEmit > 140) {
      drag.lastEmit = now;
      lastContact.copy(hit.point || drag.point);
      onAction({ target: contactTarget, point: lastContact.toArray(), gesture: 'drag', dragAmount: drag.amount });
    }
  }
  function pointerUp(event) {
    if (event.button !== 0 || !drag.active) return;
    const hit = updatePointer(event);
    const grasping = ['prograsp', 'cadiere', 'fenestrated'].includes(instrumentTypes[activeArm]);
    const target = grasping ? drag.target : hit.target;
    if (target && !cameraMode) {
      lastContact.copy(hit.point || drag.point);
      onAction({ target, point: lastContact.toArray(), gesture: drag.amount > 5 ? 'drag' : 'activate',
        ...(drag.amount > 5 ? { dragAmount: drag.amount } : {}) });
    }
    drag.active = false; drag.target = null;
    if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId);
  }
  function pointerCancel() { drag.active = false; drag.target = null; }
  function pointerLeave() { if (!drag.active) { hoveredTarget = null; onTarget(null); cursor.style.opacity = '0'; targetLabel.style.display = 'none'; } }
  function wheel() { cameraTransition = null; }
  function contextMenu(event) { event.preventDefault(); }
  const listeners = { pointerdown: pointerDown, pointermove: pointerMove, pointerup: pointerUp, pointercancel: pointerCancel,
    pointerleave: pointerLeave, wheel, contextmenu: contextMenu };
  for (const [event, callback] of Object.entries(listeners)) renderer.domElement.addEventListener(event, callback, event === 'wheel' ? { passive: true } : undefined);
  function resize() {
    const rect = container.getBoundingClientRect(); width = Math.max(1, rect.width); height = Math.max(1, rect.height);
    camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false);
  }
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(container); resize();
  camera.position.copy(v3(views.operative.position)); controls.target.copy(v3(views.operative.target)); controls.update();
  setInstrument('left', instrumentTypes.left); setInstrument('right', instrumentTypes.right);
  syncState(state);

  const cameraBase = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  function updateInstruments(now) {
    const tractionLatched = state.retracted && !state.extracted && ['prograsp', 'cadiere', 'fenestrated'].includes(instrumentTypes[tractionArm]);
    if (tractionLatched && activeArm !== tractionArm) {
      desiredTips[tractionArm].copy(gbPoint(.83)).add(new THREE.Vector3(0, 0, gbRadius(.83)));
    }
    for (const arm of ['left', 'right']) {
      const model = armModels[arm]; if (!model) continue;
      armTips[arm].lerp(desiredTips[arm], reduceMotion ? 1 : .28);
      const tip = armTips[arm];
      cameraBase.set(arm === 'left' ? -1.65 : 1.68, -1.48, -1.15).applyMatrix4(camera.matrixWorld);
      const axis = tip.clone().sub(cameraBase).normalize();
      const wristPoint = tip.clone().addScaledVector(axis, -.27);
      const shaftEnd = wristPoint.clone().addScaledVector(axis, -.14);
      const shaftLength = cameraBase.distanceTo(shaftEnd);
      model.shaft.position.copy(cameraBase).add(shaftEnd).multiplyScalar(.5);
      model.shaft.quaternion.setFromUnitVectors(up, axis); model.shaft.scale.y = shaftLength;
      model.sleeve.position.copy(cameraBase).addScaledVector(axis, .22);
      model.sleeve.quaternion.setFromUnitVectors(up, axis);
      model.wrist.position.copy(wristPoint); model.wrist.quaternion.setFromUnitVectors(up, axis);
      const wristAngle = arm === activeArm ? Number(state.wristAngle) || 0 : 0;
      model.tipRoot.rotation.y = THREE.MathUtils.degToRad(wristAngle);
      model.tipRoot.rotation.z = Math.sin(THREE.MathUtils.degToRad(wristAngle)) * .30;
      const latched = tractionLatched && arm === tractionArm;
      const opening = (drag.active && arm === activeArm) || latched ? .035 : model.type === 'scissors' ? .29 : .18;
      for (const jaw of model.jaws) jaw.rotation.z = jaw.userData.side * -opening;
    }
    const point = armTips[activeArm].clone().project(camera);
    const x = (point.x * .5 + .5) * width, y = (-point.y * .5 + .5) * height;
    cursor.style.left = `${x}px`; cursor.style.top = `${y}px`;
    const visibleLabel = labelsEnabled && hoveredTarget && TITLES[hoveredTarget] && !cameraMode;
    targetLabel.style.display = visibleLabel ? 'block' : 'none';
    if (visibleLabel) {
      targetLabel.textContent = TITLES[hoveredTarget];
      targetLabel.style.left = `${clamp(x + 17, 10, width - targetLabel.offsetWidth - 12)}px`;
      targetLabel.style.top = `${clamp(y - 9, 50, height - 62)}px`;
    }
    const smokeLevel = clamp(Number(state.smoke) || 0, 0, 1);
    smokeSprites.forEach((sprite, index) => {
      sprite.visible = smokeLevel > 0 && index < Math.max(1, Math.ceil(smokeLevel * 12));
      if (!sprite.visible) return;
      const t = (now * .00021 + index * .083) % 1;
      sprite.position.copy(smokeOrigin).add(new THREE.Vector3(Math.sin(index * 2.6 + t * 3) * t * .4, t * 1.35, .1 + t * .55));
      sprite.scale.setScalar(.16 + t * .83);
      sprite.material.opacity = (.18 + smokeLevel * .20) * Math.sin(t * Math.PI);
      sprite.material.rotation = index * .77 + now * .00005;
    });
    if (specimenGroup?.visible) {
      const t = reduceMotion ? 1 : clamp((now - extractionStarted) / 2600, 0, 1);
      const ease = t * t * (3 - 2 * t);
      specimenGroup.position.set(lerp(-.74, -.95, ease), lerp(.05, -2.65, ease), lerp(1.70, 2.42, ease));
      specimenGroup.rotation.z = ease * -.25;
    }
  }
  function animate(now) {
    if (disposed) return;
    frameId = requestAnimationFrame(animate);
    if (cameraTransition) {
      const t = clamp((now - cameraTransition.start) / 620, 0, 1), eased = 1 - (1 - t) ** 3;
      camera.position.lerpVectors(cameraTransition.from, cameraTransition.to, eased);
      controls.target.lerpVectors(cameraTransition.targetFrom, cameraTransition.targetTo, eased);
      if (t === 1) cameraTransition = null;
    }
    controls.update();
    camera.updateMatrixWorld();
    scopeLight.position.copy(camera.position).add(new THREE.Vector3(-.4, .3, -.6));
    updateInstruments(now);
    renderer.render(scene, camera);
    if (!readySent) { readySent = true; onReady(); }
  }
  frameId = requestAnimationFrame(animate);
  return {
    setCase, syncState, setActiveArm, setInstrument, setView, setOverlay, setLabels, setCameraMode, focusTarget,
    getTargetIds() { return Object.keys(TITLES); },
    dispose() {
      disposed = true; cancelAnimationFrame(frameId); resizeObserver.disconnect(); controls.dispose();
      for (const [event, callback] of Object.entries(listeners)) renderer.domElement.removeEventListener(event, callback);
      scene.traverse((object) => { if (object.geometry) object.geometry.dispose(); });
      allMaterials.forEach((m) => m.dispose()); allTextures.forEach((texture) => texture.dispose());
      omentumGeometryCache.forEach((geometry) => geometry.dispose()); environmentTarget.dispose();
      renderer.dispose(); renderer.domElement.remove(); hud.remove();
    },
  };
}
