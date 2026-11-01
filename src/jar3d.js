import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const PARTICLE_COLOR = 0x3b82f6;
const OUTLINE_COLOR = 0x1e2a44;

// A glass jar with a lid, filled with the particles of one simulation.
export function createJar(sim) {
  const group = new THREE.Group();
  const { jarRadius: R, jarHeight: H, radius: r, count } = sim;

  const glass = new THREE.MeshStandardMaterial({
    color: 0xeaf6ff,
    transparent: true,
    opacity: 0.12,
    roughness: 0.05,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 64, 1, true), glass);
  wall.position.y = H / 2;
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(R, 64), glass);
  bottom.rotation.x = -Math.PI / 2;
  bottom.position.y = 0.001;
  group.add(wall, bottom);

  // Dark rims give the jar a drawn, outlined look.
  const rimMaterial = new THREE.MeshBasicMaterial({ color: 0x4a5568 });
  for (const y of [0, H]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.018, 8, 96), rimMaterial);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = y;
    group.add(rim);
  }

  const lid = new THREE.Mesh(
    new THREE.CylinderGeometry(R * 1.06, R * 1.06, 0.14, 64),
    new THREE.MeshStandardMaterial({ color: 0xa0aab5, metalness: 0.4, roughness: 0.45 }),
  );
  lid.position.y = H + 0.07;
  group.add(lid);

  const sphere = new THREE.SphereGeometry(r, 24, 16);
  const particles = new THREE.InstancedMesh(
    sphere,
    new THREE.MeshStandardMaterial({ color: PARTICLE_COLOR, roughness: 0.3 }),
    count,
  );
  // Slightly bigger dark back faces behind each ball = cartoon outline.
  const outlines = new THREE.InstancedMesh(
    sphere,
    new THREE.MeshBasicMaterial({ color: OUTLINE_COLOR, side: THREE.BackSide }),
    count,
  );
  group.add(particles, outlines);

  const matrix = new THREE.Matrix4();
  const outlineScale = new THREE.Matrix4().makeScale(1.14, 1.14, 1.14);
  const p = [0, 0, 0];

  function update() {
    for (let i = 0; i < count; i++) {
      sim.renderPosition(i, p);
      matrix.makeTranslation(p[0], p[1], p[2]);
      particles.setMatrixAt(i, matrix);
      outlines.setMatrixAt(i, matrix.multiply(outlineScale));
    }
    particles.instanceMatrix.needsUpdate = true;
    outlines.instanceMatrix.needsUpdate = true;
  }
  update();

  return { group, update };
}

// A 3D view in `container` showing the given jars side by side.
// `halfWidth` is how much of the scene must always fit across the view,
// so the jars never get cut off on narrow screens.
export function createStage(container, { sims, spacing = 2.7, halfWidth = 1.6, height = 1.3 }) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8cfc0, 1.4));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(3, 6, 5);
  scene.add(sun);

  const jars = sims.map((sim, i) => {
    const jar = createJar(sim);
    jar.group.position.x = (i - (sims.length - 1) / 2) * spacing;
    scene.add(jar.group);
    return jar;
  });

  const target = new THREE.Vector3(0, height, 0);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(target);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.minPolarAngle = Math.PI * 0.2;
  controls.maxPolarAngle = Math.PI * 0.55;

  function fit() {
    const width = container.clientWidth;
    const h = container.clientHeight;
    if (!width || !h) return;
    renderer.setSize(width, h);
    camera.aspect = width / h;
    camera.updateProjectionMatrix();

    const vHalf = THREE.MathUtils.degToRad(camera.fov / 2);
    const needWidth = halfWidth / (Math.tan(vHalf) * camera.aspect);
    const needHeight = 1.9 / Math.tan(vHalf);
    const dist = Math.max(needWidth, needHeight);
    camera.position.set(0, height + dist * 0.28, dist);
    controls.update();
  }
  new ResizeObserver(fit).observe(container);
  fit();

  // Only animate while the view is on screen, to save school laptop batteries.
  const clock = new THREE.Clock();
  function frame() {
    const dt = Math.min(clock.getDelta(), 1 / 30);
    const steps = 3;
    for (const sim of sims) for (let s = 0; s < steps; s++) sim.step(dt / steps);
    for (const jar of jars) jar.update();
    controls.update();
    renderer.render(scene, camera);
  }
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      clock.getDelta();
      renderer.setAnimationLoop(frame);
    } else {
      renderer.setAnimationLoop(null);
    }
  }).observe(container);
  renderer.render(scene, camera);
}
