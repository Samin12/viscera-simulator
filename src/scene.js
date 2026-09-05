import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Synthetic teaching geometry. Coordinates and colors are illustrative, not patient data.
const LABELS = {
  liver: 'Liver', gallbladder: 'Gallbladder', cysticDuct: 'Cystic duct',
  bileDuct: 'Extrahepatic bile duct', cysticArtery: 'Cystic artery',
  hepaticArtery: 'Hepatic artery', portalVein: 'Portal vein', stomach: 'Stomach',
  duodenum: 'Duodenum', omentum: 'Omentum / fat', adhesions: 'Adhesion bands',
  nerves: 'Nerve overlay · schematic',
};
const DEFAULT_LABELS = ['liver', 'gallbladder', 'cysticDuct', 'bileDuct', 'cysticArtery', 'duodenum'];
const LAYER_FOR = {
  liver: 'organs', gallbladder: 'organs', stomach: 'organs', duodenum: 'organs',
  cysticDuct: 'biliary', bileDuct: 'biliary', cysticArtery: 'vessels',
  hepaticArtery: 'vessels', portalVein: 'vessels', omentum: 'fat', adhesions: 'adhesions', nerves: 'nerves',
};
const vector = (point) => new THREE.Vector3(...point);

function tissueTexture(seed = 4) {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  let value = seed;
  const random = () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const offset = (y * size + x) * 4;
      const n = 185 + random() * 42 + 13 * Math.sin(x * .12) * Math.cos(y * .16);
      data[offset] = n; data[offset + 1] = n; data[offset + 2] = n; data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function organicSphere(scale, detail = 1, seed = 0) {
  const geometry = new THREE.SphereGeometry(1, 56, 40);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const wave = 1 + detail * (.018 * Math.sin(x * 9 + seed) * Math.cos(y * 8) + .012 * Math.sin(z * 13 + y * 6));
    positions.setXYZ(i, x * scale[0] * wave, y * scale[1] * wave, z * scale[2] * wave);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function variableTube(points, radiusAt, radialSegments = 24, lengthSegments = 72) {
  const curve = new THREE.CatmullRomCurve3(points.map(vector));
  const frames = curve.computeFrenetFrames(lengthSegments, false);
  const positions = [], normals = [], uv = [], indices = [];
  for (let i = 0; i <= lengthSegments; i++) {
    const t = i / lengthSegments;
    const center = curve.getPointAt(t);
    const radius = Math.max(.001, radiusAt(t));
    for (let j = 0; j <= radialSegments; j++) {
      const angle = j / radialSegments * Math.PI * 2;
      const normal = frames.normals[i].clone().multiplyScalar(Math.cos(angle))
        .addScaledVector(frames.binormals[i], Math.sin(angle));
      const p = center.clone().addScaledVector(normal, radius * (1 + .016 * Math.sin(t * 33 + angle * 3)));
      positions.push(p.x, p.y, p.z); normals.push(normal.x, normal.y, normal.z); uv.push(j / radialSegments, t);
      if (i < lengthSegments && j < radialSegments) {
        const a = i * (radialSegments + 1) + j, b = a + radialSegments + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function ribbon(points, width = .16) {
  const curve = new THREE.CatmullRomCurve3(points.map(vector));
  const geometry = new THREE.PlaneGeometry(width, 1, 3, 36);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const localX = positions.getX(i);
    const t = positions.getY(i) + .5;
    const p = curve.getPoint(t);
    positions.setXYZ(i, p.x + localX * (.65 + Math.sin(t * Math.PI) * .35), p.y, p.z + Math.sin(localX * 14 + t * 8) * .025);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function createScene(container, { onSelect = () => {}, onHover = () => {} } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#171b1b');
  scene.fog = new THREE.FogExp2('#171b1b', .037);
  const camera = new THREE.PerspectiveCamera(39, 1, .1, 60);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.domElement.className = 'anatomy-canvas';
  renderer.domElement.setAttribute('aria-label', 'Interactive schematic abdominal anatomy. Drag to orbit, scroll to zoom, or use the anatomy list to select structures.');
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none;';
  renderer.domElement.tabIndex = 0;
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
  container.appendChild(renderer.domElement);

  const overlay = document.createElement('div');
  overlay.className = 'anatomy-label-overlay';
  overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:2;';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;overflow:visible;';
  overlay.appendChild(svg);
  container.appendChild(overlay);
  const labels = new Map();
  for (const [id, title] of Object.entries(LABELS)) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    line.setAttribute('fill', 'none'); line.setAttribute('stroke', 'rgba(211,228,222,.48)'); line.setAttribute('stroke-width', '.8');
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('r', '2'); dot.setAttribute('fill', '#d0e5dc');
    svg.append(line, dot);
    const el = document.createElement('div');
    el.className = 'anatomy-label';
    el.textContent = title;
    el.style.cssText = 'position:absolute;font:500 10px/1.1 Inter,system-ui,sans-serif;letter-spacing:.025em;color:#ecf0e9;padding:7px 9px;border:1px solid rgba(210,230,217,.18);border-radius:4px;background:rgba(23,29,27,.80);white-space:nowrap;box-shadow:0 2px 10px #0002;backdrop-filter:blur(5px);';
    overlay.appendChild(el);
    labels.set(id, { el, line, dot });
  }

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = .075;
  controls.rotateSpeed = .6;
  controls.zoomSpeed = .8;
  controls.minDistance = 4.7;
  controls.maxDistance = 18;
  controls.maxPolarAngle = Math.PI * .87;
  controls.minPolarAngle = Math.PI * .1;
  controls.enablePan = true;

  const ambient = new THREE.HemisphereLight('#f9eee2', '#352c2b', 2.0);
  scene.add(ambient);
  const key = new THREE.DirectionalLight('#fff2dd', 3.3);
  key.position.set(-3.5, 5, 7);
  scene.add(key);
  const fill = new THREE.DirectionalLight('#dcebf0', 1.0);
  fill.position.set(5, 0, 5);
  scene.add(fill);
  const rim = new THREE.DirectionalLight('#b9d2c6', 2.1);
  rim.position.set(-3, 3, -4);
  scene.add(rim);
  const scopeLight = new THREE.PointLight('#fff0d6', 15, 20, 2);
  scopeLight.position.set(0, .3, 5);
  scene.add(scopeLight);

  const texture = tissueTexture();
  const materials = new Set();
  function tissue(color, options = {}) {
    const material = new THREE.MeshPhysicalMaterial({
      color, roughness: .39, metalness: 0, clearcoat: .3, clearcoatRoughness: .23,
      bumpMap: texture, bumpScale: .025, ...options,
    });
    material.userData.baseEmissive = material.emissive.clone();
    materials.add(material);
    return material;
  }
  const liverMaterial = tissue('#7b3028', { roughness: .46, clearcoat: .24, bumpScale: .022 });
  const gbMaterial = tissue('#7a9a43', { roughness: .33, clearcoat: .55, bumpScale: .014 });
  const ductMaterial = tissue('#b3c36a', { roughness: .4, bumpScale: .009 });
  const arteryMaterial = tissue('#bd4b43', { roughness: .32, clearcoat: .45, bumpScale: .012 });
  const portalMaterial = tissue('#507b90', { roughness: .37, bumpScale: .01 });
  const stomachMaterial = tissue('#b77f68', { roughness: .49 });
  const bowelMaterial = tissue('#c28c76', { roughness: .42 });
  const fatMaterial = tissue('#bd9a56', { roughness: .54, clearcoat: .1, bumpScale: .037 });
  const adhesionMaterial = tissue('#d0b798', { side: THREE.DoubleSide, transparent: true, opacity: .64, roughness: .58, depthWrite: false });
  const nerveMaterial = tissue('#e5d5a0', { roughness: .58, emissive: '#7f6f32', emissiveIntensity: .13, bumpMap: null });
  const cavityMaterial = tissue('#4d3531', { side: THREE.BackSide, roughness: .9, clearcoat: 0, bumpScale: .06 });
  const fissureMaterial = tissue('#4e251f', { roughness: .75, bumpMap: null });
  const vesselSkinMaterial = tissue('#627536', { roughness: .5, bumpMap: null });
  const stomachVeinMaterial = tissue('#a66658', { roughness: .6, bumpMap: null });
  const bedMaterial = tissue('#a46b57', { side: THREE.DoubleSide, roughness: .63, clearcoat: .14, bumpScale: .022 });

  const anatomy = new THREE.Group();
  scene.add(anatomy);
  const groups = {}, anchors = {};
  const layerState = { organs: true, biliary: true, vessels: true, fat: true, adhesions: true, nerves: false };
  let caseData = { adhesionLevel: 0, inflamed: false, shortDuct: false, variant: 'typical' };
  let selected = null, tool = 'inspect', labelsVisible = true, disposed = false;
  let retracted = false, lowerThirdReviewed = false, clearedCount = 0, hoverId = null;
  let width = 1, height = 1, frameId, cameraTween = null;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const cavity = new THREE.Mesh(organicSphere([5.1, 4.2, 3.0], 2), cavityMaterial);
  cavity.position.set(0, -.2, .1);
  // Open the anterior abdominal wall for a cutaway operative teaching view.
  const cp = cavity.geometry.attributes.position;
  const cavityIndices = cavity.geometry.index.array;
  const openIndices = [];
  for (let i = 0; i < cavityIndices.length; i += 3) {
    const triangle = [cavityIndices[i], cavityIndices[i + 1], cavityIndices[i + 2]];
    if (triangle.every((index) => cp.getZ(index) < .25)) openIndices.push(...triangle);
  }
  cavity.geometry.setIndex(openIndices);
  cavity.geometry.computeVertexNormals();
  scene.add(cavity);

  function register(id, anchor) {
    const group = new THREE.Group();
    group.name = id;
    group.userData.anatomyId = id;
    group.visible = layerState[LAYER_FOR[id]];
    anatomy.add(group); groups[id] = group;
    const point = new THREE.Object3D();
    point.position.copy(vector(anchor)); group.add(point); anchors[id] = point;
    return group;
  }
  function mesh(group, geometry, material) {
    const object = new THREE.Mesh(geometry, material);
    object.userData.anatomyId = group.userData.anatomyId;
    group.add(object);
    return object;
  }
  function tube(group, points, radius, material, segments = 48) {
    return mesh(group, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(vector)), segments, radius, 12, false), material);
  }
  function destroyGroup(group) {
    if (!group) return;
    group.traverse((object) => { if (object.geometry) object.geometry.dispose(); });
    anatomy.remove(group);
  }
  function clearAnatomy() {
    Object.values(groups).forEach(destroyGroup);
    Object.keys(groups).forEach((id) => { delete groups[id]; delete anchors[id]; });
  }

  function makeLiver() {
    const group = register('liver', [-1.8, 1.6, .52]);
    const geometry = new THREE.SphereGeometry(1, 80, 52);
    const p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const taper = 1 - Math.max(0, x) * .47;
      const notch = y < 0 ? Math.exp(-((x - .2) ** 2) / .085) * .18 * -y : 0;
      const ripple = .013 * Math.sin(x * 17 + z * 4) * Math.cos(y * 11);
      p.setXYZ(i, x * 3.05, 1.45 + y * 1.06 * taper + x * .07 + notch, z * .87 * taper - .42 + ripple);
    }
    geometry.computeVertexNormals();
    mesh(group, geometry, liverMaterial);
    group.position.y = retracted ? .28 : 0;
    // A shallow surface fissure helps the broad asymmetric organ read as a liver.
    tube(group, [[.27, 1.77, .32], [.26, 1.29, .38], [.36, .94, .41], [.5, .73, .31]], .015, fissureMaterial);
    if (lowerThirdReviewed) {
      // An organic teaching patch, revealed by the review action. This is a
      // visual explanation of the bed region, not a simulated tissue dissection.
      const lift = retracted ? .28 : 0;
      const bedCurve = new THREE.CatmullRomCurve3([
        vector([-.45, -.38 - lift, .83]), vector([-.68, -.12 - lift, .82]),
        vector([-.91, .22 - lift, .73]), vector([-1.10, .63, .52]),
      ]);
      const bedGeometry = new THREE.PlaneGeometry(1, 1, 24, 40);
      const bp = bedGeometry.attributes.position;
      for (let i = 0; i < bp.count; i++) {
        const across = bp.getX(i) * 2;
        const t = bp.getY(i) + .5;
        const center = bedCurve.getPoint(t);
        const tangent = bedCurve.getTangent(t);
        const halfWidth = .02 + .22 * Math.pow(Math.sin(Math.PI * t), .62);
        const bulge = .036 * (1 - across * across) * Math.sin(Math.PI * t);
        bp.setXYZ(i, center.x + across * halfWidth * tangent.y,
          center.y - across * halfWidth * tangent.x,
          center.z + bulge + .009 * Math.sin(t * 24 + across * 8));
      }
      bedGeometry.computeVertexNormals();
      mesh(group, bedGeometry, bedMaterial);
    }
  }

  function makeGallbladder() {
    const group = register('gallbladder', [-1.27, .13 + (retracted ? .32 : 0), 1.35]);
    const lift = retracted ? .55 : 0;
    const points = [[-.39, -.47, 1.12], [-.57, -.32, 1.19], [-.83 - lift * .14, -.08 + lift * .35, 1.21], [-1.10 - lift * .18, .19 + lift * .75, 1.12], [-1.19 - lift * .22, .49 + lift, .98]];
    const radius = (t) => {
      const roundEnd = Math.pow(Math.max(0, Math.sin(Math.PI * t)), .58);
      return .071 + .33 * roundEnd * (.5 + t) - .071 * Math.pow(t, 16);
    };
    gbMaterial.color.set(caseData.inflamed ? '#b18250' : '#819744');
    mesh(group, variableTube(points, (t) => radius(t) * (caseData.inflamed ? 1.17 : 1)), gbMaterial);
    vesselSkinMaterial.color.set(caseData.inflamed ? '#985347' : '#627536');
    tube(group, [[-.72, -.25 + lift * .25, 1.48], [-.88, .0 + lift * .45, 1.58], [-1.09, .23 + lift * .8, 1.37]], .013, vesselSkinMaterial);
  }

  function makeBiliary() {
    const main = register('bileDuct', [.74, -.92, 1.0]);
    tube(main, [[.42, .84, .08], [.64, .37, .58], [.73, -.25, .89], [.82, -.78, .96], [1.03, -1.38, .55]], .105, ductMaterial);
    tube(main, [[.44, .83, .08], [-.05, .83, -.02], [-.45, .86, -.16]], .068, ductMaterial);
    tube(main, [[.44, .83, .08], [.98, .94, -.13], [1.45, 1.06, -.3]], .071, ductMaterial);
    const cystic = register('cysticDuct', [caseData.shortDuct ? .3 : .08, -.55, 1.2]);
    const points = caseData.shortDuct
      ? [[-.39, -.47, 1.12], [-.10, -.51, 1.17], [.26, -.46, 1.13], [.75, -.44, .93]]
      : [[-.39, -.47, 1.12], [-.24, -.54, 1.2], [.03, -.49, 1.2], [.22, -.57, 1.15], [.56, -.62, 1.01], [.79, -.63, .94]];
    // Short-duct case shifts the main tree toward the gallbladder neck coherently.
    if (caseData.shortDuct) {
      main.position.x = -.37;
      points[2] = [.18, -.47, 1.08]; points[3] = [.38, -.44, .93];
      anchors.cysticDuct.position.set(.0, -.51, 1.21);
    }
    tube(cystic, points, .072, ductMaterial);
  }

  function makeVessels() {
    const hepatic = register('hepaticArtery', [.42, -.28, .6]);
    tube(hepatic, [[1.48, -1.67, .06], [1.14, -1.02, .25], [.43, -.40, .60], [.3, .12, .63], [.01, .56, .26], [-.51, .86, -.06]], .075, arteryMaterial);
    tube(hepatic, [[.32, .14, .61], [.77, .4, .45], [1.1, .73, .06]], .053, arteryMaterial);
    const cystic = register('cysticArtery', [-.13, -.06, 1.18]);
    const variantOffset = caseData.variant === 'variant-artery' || caseData.variant === 'vascular' ? .16 : 0;
    tube(cystic, [[.3, .13, .62], [.13 + variantOffset, .04, .89], [-.14, -.04, 1.11], [-.44, -.13, 1.25], [-.68, -.17, 1.24]], .044, arteryMaterial);
    tube(cystic, [[-.42, -.12, 1.24], [-.69, .05 + (retracted ? .2 : 0), 1.39], [-.90, .20 + (retracted ? .31 : 0), 1.40]], .028, arteryMaterial);
    const portal = register('portalVein', [.95, -.55, .14]);
    tube(portal, [[1.45, -1.78, -.48], [1.06, -.99, -.12], [.7, -.26, .04], [.56, .41, .04], [.26, .77, -.17]], .17, portalMaterial);
    tube(portal, [[.59, .34, .01], [.02, .65, -.11], [-.73, .83, -.42]], .11, portalMaterial);
    tube(portal, [[.57, .37, .01], [1.11, .77, -.26], [1.83, .94, -.52]], .105, portalMaterial);
  }

  function makeSurroundings() {
    const stomach = register('stomach', [2.11, -.4, .03]);
    const stomachPoints = [[1.56, 1.19, -.87], [1.91, .60, -.60], [2.23, .03, -.36], [2.13, -.57, -.29], [1.51, -.77, -.17]];
    mesh(stomach, variableTube(stomachPoints, (t) => .12 + .50 * Math.pow(Math.sin(Math.PI * t), .7)), stomachMaterial);
    tube(stomach, [[1.76, .61, -.01], [1.88, .05, .24], [1.61, -.48, .22]], .017, stomachVeinMaterial);
    const duodenum = register('duodenum', [1.45, -1.68, .37]);
    const bowelPoints = [[1.49, -.77, -.17], [1.08, -.95, -.02], [1.37, -1.22, .22], [1.59, -1.64, .32], [1.3, -1.93, .24], [.58, -1.98, .08], [-.14, -1.75, -.16]];
    mesh(duodenum, variableTube(bowelPoints, (t) => .23 + .025 * Math.cos(t * 27), 24, 88), bowelMaterial);
    const fat = register('omentum', [-1.56, -1.87, .37]);
    // A continuous draped apron with its lobules sculpted into the surface.
    // A rounded boundary and embedded lobules avoid floating beads or flat cards.
    const fatGeometry = new THREE.PlaneGeometry(1, 1, 100, 44);
    const p = fatGeometry.attributes.position;
    const colors = [];
    const fatLobules = [];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 17; col++) {
        fatLobules.push({ x: -2.72 + col * .34 + (row % 2) * .17,
          y: -1.85 - row * .24 + .07 * Math.sin(col * 1.7),
          strength: .07 + .035 * Math.sin(col * 2.1 + row) });
      }
    }
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) * 2;
      const t = .5 - p.getY(i);
      const shoulder = Math.sqrt(Math.max(0, 1 - u * u));
      const x = -.36 + u * (2.79 - .16 * t);
      const top = -1.66 + .11 * Math.sin(u * 4.1) - .22 * (1 - shoulder);
      const y = top - t * (1.23 * shoulder + .24)
        + .035 * Math.cos(u * 31) * (1 - t) + .04 * Math.sin(u * 23) * t;
      let lobuleHeight = 0;
      for (const lobe of fatLobules) {
        const dx = (x - lobe.x) / .20, dy = (y - lobe.y) / .16;
        lobuleHeight += lobe.strength * Math.exp(-(dx * dx + dy * dy) * 1.5);
      }
      const z = .24 + .12 * Math.cos(u * 3.2) - t * .30 + lobuleHeight
        + .035 * Math.sin(u * 13 + t * 4) * Math.sin(Math.PI * t);
      p.setXYZ(i, x, y, z);
      const tone = .88 + .1 * Math.min(1, lobuleHeight / .12) + .025 * Math.sin(u * 24 + t * 14);
      colors.push(tone, tone, tone * .98);
    }
    fatGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    fatGeometry.computeVertexNormals();
    fatMaterial.side = THREE.DoubleSide;
    fatMaterial.vertexColors = true;
    mesh(fat, fatGeometry, fatMaterial);
    const nerve = register('nerves', [.89, -.06, 1.05]);
    tube(nerve, [[1.63, -1.64, .35], [1.21, -.95, .65], [1.03, -.18, .78], [.83, .48, .54]], .018, nerveMaterial);
    tube(nerve, [[1.04, -.23, .78], [.54, .06, .85], [.07, .28, .88], [-.34, .31, .91]], .012, nerveMaterial);
    tube(nerve, [[.58, .05, .84], [.18, -.24, 1.16], [-.22, -.31, 1.27]], .01, nerveMaterial);
  }

  function makeAdhesions() {
    const adhesion = register('adhesions', [-1.23, -.94, 1.05]);
    const count = Math.max(0, Math.min(3, Math.round(Number(caseData.adhesionLevel) || 0))) * 2;
    for (let i = 0; i < count; i++) {
      const band = new THREE.Group();
      band.userData.band = true;
      band.visible = i >= clearedCount;
      adhesion.add(band);
      const x = -1.8 + i * .29;
      const startY = .27 + (i % 3) * .12 + (retracted ? .26 : 0);
      const points = [[x, startY, .91], [x - .07, -.51, 1.23], [x + .11, -1.02, 1.08], [x + .20, -1.57, .60]];
      const strip = new THREE.Mesh(ribbon(points, .14 + (i % 2) * .07), adhesionMaterial);
      strip.userData.anatomyId = 'adhesions'; band.add(strip);
      for (let j = -1; j <= 1; j++) {
        const fiberPoints = points.map((p, index) => [p[0] + j * .035 + .008 * Math.sin(index + i), p[1], p[2] + .015]);
        const fiber = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(fiberPoints.map(vector)), 28, .008, 5, false), adhesionMaterial);
        fiber.userData.anatomyId = 'adhesions'; band.add(fiber);
      }
    }
    adhesion.visible = layerState.adhesions && count > clearedCount;
  }

  const instrument = new THREE.Group();
  scene.add(instrument);
  instrument.visible = false;
  const metalMaterial = new THREE.MeshStandardMaterial({ color: '#becacc', metalness: .72, roughness: .28 });
  const darkMetalMaterial = new THREE.MeshStandardMaterial({ color: '#404b4b', metalness: .55, roughness: .35 });
  materials.add(metalMaterial); materials.add(darkMetalMaterial);
  function instrumentSegment(start, end, radius, material) {
    const a = vector(start), b = vector(end), direction = b.clone().sub(a);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 16), material);
    m.position.copy(a).add(b).multiplyScalar(.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    instrument.add(m);
  }
  instrumentSegment([-3.5, -2.6, 2.5], [-1.35, -.03, 1.45], .053, metalMaterial);
  instrumentSegment([-1.45, -.14, 1.5], [-1.24, .08, 1.41], .08, darkMetalMaterial);
  instrumentSegment([-1.25, .02, 1.41], [-1.15, .20, 1.35], .027, metalMaterial);
  instrumentSegment([-1.30, .05, 1.38], [-1.36, .25, 1.30], .027, metalMaterial);

  function updateSelection() {
    const label = selected && labels.get(selected);
    for (const [id, { el, line, dot }] of labels) {
      const active = id === selected;
      el.style.borderColor = active ? 'rgba(197,225,127,.8)' : 'rgba(210,230,217,.18)';
      el.style.color = active ? '#e4f4b4' : '#ecf0e9';
      el.style.background = active ? 'rgba(56,67,40,.94)' : 'rgba(23,29,27,.80)';
      line.setAttribute('stroke', active ? '#bfd77e' : 'rgba(211,228,222,.48)');
      dot.setAttribute('fill', active ? '#d4ef95' : '#d0e5dc');
    }
    selectionHalo.visible = Boolean(selected && groups[selected]?.visible);
    if (label) label.el.style.zIndex = '1';
  }
  const selectionHalo = new THREE.Mesh(new THREE.TorusGeometry(.14, .009, 8, 48), new THREE.MeshBasicMaterial({ color: '#d6eeb0', transparent: true, opacity: .88, depthTest: false }));
  selectionHalo.renderOrder = 10;
  selectionHalo.visible = false;
  scene.add(selectionHalo);

  function rebuild() {
    clearAnatomy();
    makeLiver(); makeGallbladder(); makeBiliary(); makeVessels(); makeSurroundings(); makeAdhesions();
    updateSelection();
  }
  const views = {
    operative: { position: [0, .05, 10.9], target: [-.05, -.05, .25] },
    anterior: { position: [0, 1.3, 11.9], target: [0, -.05, .0] },
    posterior: { position: [4.5, -.6, -9.8], target: [0, -.12, .15] },
    closeup: { position: [-.4, .0, 6.0], target: [-.15, -.31, 1.0] },
  };
  function setView(name) {
    const view = views[name] || views.operative;
    if (reduceMotion) {
      camera.position.copy(vector(view.position)); controls.target.copy(vector(view.target)); controls.update();
    } else {
      cameraTween = { start: performance.now(), from: camera.position.clone(), targetFrom: controls.target.clone(), to: vector(view.position), targetTo: vector(view.target) };
    }
  }
  function setLayer(id, visible) {
    if (!(id in layerState)) return;
    layerState[id] = Boolean(visible);
    for (const [anatomyId, group] of Object.entries(groups)) {
      if (LAYER_FOR[anatomyId] === id) group.visible = Boolean(visible);
    }
    if (id === 'adhesions') groups.adhesions.visible = visible && Number(caseData.adhesionLevel) * 2 > clearedCount;
    updateSelection();
  }
  function select(id) {
    const alias = { commonBileDuct: 'bileDuct', commonHepaticDuct: 'bileDuct' };
    selected = alias[id] || id;
    if (!groups[selected]) selected = null;
    updateSelection();
  }
  function setTool(value) {
    tool = value;
    renderer.domElement.style.cursor = value === 'inspect' ? 'grab' : 'crosshair';
    instrument.visible = value === 'retract';
  }
  function performAction(action) {
    if (action === 'retract') {
      retracted = true;
      rebuild();
      instrument.visible = true;
      return { success: true, message: 'Schematic retraction applied. The gallbladder neck remains attached.' };
    }
    if (action === 'clear') {
      const count = Math.max(0, Math.min(3, Math.round(Number(caseData.adhesionLevel) || 0))) * 2;
      if (clearedCount >= count) return { success: true, remainingAdhesions: 0, message: 'No adhesion bands remain in this schematic case.' };
      clearedCount = Math.min(count, clearedCount + 2);
      destroyGroup(groups.adhesions); makeAdhesions(); updateSelection();
      return { success: true, remainingAdhesions: Math.ceil((count - clearedCount) / 2), message: 'One layer of schematic adhesion bands removed.' };
    }
    if (action === 'reviewLowerThird') {
      lowerThirdReviewed = true;
      rebuild();
      setView('closeup');
      select('gallbladder');
      return { success: true, message: 'Organic gallbladder-bed teaching patch shown for conceptual review; this is not verified operative evidence.' };
    }
    return { success: false, message: 'Action is not available in this prototype.' };
  }
  function setCase(next = {}) {
    caseData = { adhesionLevel: 0, inflamed: false, shortDuct: false, variant: 'typical', ...next };
    retracted = false; lowerThirdReviewed = false; clearedCount = 0; selected = null; instrument.visible = false;
    rebuild(); setView('operative');
  }
  function reset() {
    retracted = false; lowerThirdReviewed = false; clearedCount = 0; selected = null; instrument.visible = false;
    rebuild(); setTool('inspect'); setView('operative');
  }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const pointerDown = { x: 0, y: 0 };
  function pick(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const visible = [];
    anatomy.traverseVisible((object) => { if (object.isMesh && object.userData.anatomyId) visible.push(object); });
    return raycaster.intersectObjects(visible, false)[0]?.object.userData.anatomyId || null;
  }
  function onPointerDown(event) {
    pointerDown.x = event.clientX; pointerDown.y = event.clientY;
    cameraTween = null;
    if (tool === 'inspect') renderer.domElement.style.cursor = 'grabbing';
  }
  function onPointerUp(event) {
    if (tool === 'inspect') renderer.domElement.style.cursor = 'grab';
    if (Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 5) return;
    const id = pick(event);
    if (id) { select(id); onSelect(id); }
  }
  let lastHoverAt = 0;
  function onPointerMove(event) {
    if (event.buttons || performance.now() - lastHoverAt < 55) return;
    lastHoverAt = performance.now();
    const id = pick(event);
    if (id !== hoverId) { hoverId = id; onHover(id); }
    renderer.domElement.style.cursor = tool === 'inspect' ? (id ? 'pointer' : 'grab') : 'crosshair';
  }
  function onPointerLeave() { if (hoverId) { hoverId = null; onHover(null); } }
  function onWheel() { cameraTween = null; }
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerleave', onPointerLeave);
  renderer.domElement.addEventListener('wheel', onWheel, { passive: true });

  function resize() {
    const rect = container.getBoundingClientRect();
    width = Math.max(1, rect.width); height = Math.max(1, rect.height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();
  camera.position.copy(vector(views.operative.position));
  controls.target.copy(vector(views.operative.target));
  controls.update();
  rebuild();

  const labelOffsets = {
    liver: [-115, -43], gallbladder: [-151, 28], cysticDuct: [-40, 47],
    bileDuct: [54, 42], cysticArtery: [75, -55], duodenum: [54, 47],
    omentum: [-110, 25], stomach: [35, -25], portalVein: [65, -5],
    hepaticArtery: [75, 18], adhesions: [-145, 17], nerves: [55, -20],
  };
  function updateLabels() {
    const activeLabels = [];
    const worldPoint = new THREE.Vector3();
    const isPosterior = camera.position.z < -1;
    for (const [id, data] of labels) {
      const group = groups[id];
      const visible = labelsVisible && group?.visible && (DEFAULT_LABELS.includes(id) || selected === id) && anchors[id];
      let screenPoint;
      if (visible) {
        anchors[id].getWorldPosition(worldPoint);
        screenPoint = worldPoint.clone().project(camera);
      }
      const onscreen = visible && screenPoint.z >= -1 && screenPoint.z <= 1 && Math.abs(screenPoint.x) < 1.1 && Math.abs(screenPoint.y) < 1.05;
      const shown = onscreen && (!isPosterior || ['liver', 'bileDuct', 'duodenum', selected].includes(id));
      data.el.style.display = shown ? 'block' : 'none';
      data.line.style.display = shown ? 'block' : 'none';
      data.dot.style.display = shown ? 'block' : 'none';
      if (!shown) continue;
      const anchorX = (screenPoint.x * .5 + .5) * width;
      const anchorY = (-screenPoint.y * .5 + .5) * height;
      const offset = labelOffsets[id] || [30, -20];
      const labelWidth = data.el.offsetWidth;
      let x = Math.max(14, Math.min(width - labelWidth - 14, anchorX + offset[0]));
      let y = Math.max(68, Math.min(height - 65, anchorY + offset[1]));
      activeLabels.push({ id, ...data, x, y, anchorX, anchorY, width: labelWidth, height: 28 });
    }
    activeLabels.sort((a, b) => a.y - b.y);
    for (let i = 0; i < activeLabels.length; i++) {
      const current = activeLabels[i];
      for (let j = 0; j < i; j++) {
        const prior = activeLabels[j];
        if (current.x < prior.x + prior.width + 8 && current.x + current.width + 8 > prior.x && current.y < prior.y + 34) current.y = prior.y + 34;
      }
      current.y = Math.min(height - 43, current.y);
      current.el.style.transform = `translate(${Math.round(current.x)}px,${Math.round(current.y)}px)`;
      const endX = current.anchorX < current.x ? current.x : current.anchorX > current.x + current.width ? current.x + current.width : current.x + current.width / 2;
      const endY = current.y + 13;
      current.line.setAttribute('d', `M ${current.anchorX.toFixed(1)} ${current.anchorY.toFixed(1)} L ${((current.anchorX + endX) / 2).toFixed(1)} ${endY.toFixed(1)} L ${endX.toFixed(1)} ${endY.toFixed(1)}`);
      current.dot.setAttribute('cx', current.anchorX); current.dot.setAttribute('cy', current.anchorY);
    }
  }
  let lastLabelUpdate = 0;
  function animate(now) {
    if (disposed) return;
    frameId = requestAnimationFrame(animate);
    if (cameraTween) {
      const t = Math.min(1, (now - cameraTween.start) / 620);
      const ease = 1 - (1 - t) ** 3;
      camera.position.lerpVectors(cameraTween.from, cameraTween.to, ease);
      controls.target.lerpVectors(cameraTween.targetFrom, cameraTween.targetTo, ease);
      if (t === 1) cameraTween = null;
    }
    controls.update();
    if (selectionHalo.visible && anchors[selected]) {
      anchors[selected].getWorldPosition(selectionHalo.position);
      selectionHalo.quaternion.copy(camera.quaternion);
      selectionHalo.scale.setScalar(reduceMotion ? 1 : 1 + .08 * Math.sin(now * .003));
    }
    renderer.render(scene, camera);
    if (now - lastLabelUpdate > 30) { updateLabels(); lastLabelUpdate = now; }
  }
  frameId = requestAnimationFrame(animate);

  return {
    setCase, setLayer, select, setView, setTool, performAction, reset,
    setLabels(value) { labelsVisible = Boolean(value); overlay.style.display = labelsVisible ? 'block' : 'none'; },
    dispose() {
      disposed = true; cancelAnimationFrame(frameId); resizeObserver.disconnect(); controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      renderer.domElement.removeEventListener('wheel', onWheel);
      scene.traverse((object) => { if (object.geometry) object.geometry.dispose(); });
      materials.forEach((material) => material.dispose());
      selectionHalo.material.dispose(); texture.dispose(); renderer.dispose();
      renderer.domElement.remove(); overlay.remove();
    },
  };
}
