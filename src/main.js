import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Placeholder scene to confirm Three.js works after deploying:
// a box of gas particles bouncing off the walls.

const container = document.getElementById('scene');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
camera.position.set(0, 0, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const light = new THREE.DirectionalLight(0xffffff, 1.2);
light.position.set(3, 5, 4);
scene.add(light);

const SIZE = 2;
const box = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(SIZE * 2, SIZE * 2, SIZE * 2)),
  new THREE.LineBasicMaterial({ color: 0x8aa0b8 }),
);
scene.add(box);

const COUNT = 9;
const RADIUS = 0.2;
const particles = new THREE.InstancedMesh(
  new THREE.SphereGeometry(RADIUS, 24, 16),
  new THREE.MeshStandardMaterial({ color: 0x2f80ed, roughness: 0.35 }),
  COUNT,
);
scene.add(particles);

const positions = [];
const velocities = [];
for (let i = 0; i < COUNT; i++) {
  positions.push(new THREE.Vector3().randomDirection().multiplyScalar(SIZE * 0.6));
  velocities.push(new THREE.Vector3().randomDirection().multiplyScalar(1.5));
}

const matrix = new THREE.Matrix4();
const clock = new THREE.Clock();
const limit = SIZE - RADIUS;

function animate() {
  const dt = Math.min(clock.getDelta(), 0.05);
  for (let i = 0; i < COUNT; i++) {
    const p = positions[i];
    const v = velocities[i];
    p.addScaledVector(v, dt);
    for (const axis of ['x', 'y', 'z']) {
      if (Math.abs(p[axis]) > limit) {
        p[axis] = Math.sign(p[axis]) * limit;
        v[axis] *= -1;
      }
    }
    particles.setMatrixAt(i, matrix.makeTranslation(p.x, p.y, p.z));
  }
  particles.instanceMatrix.needsUpdate = true;
  controls.update();
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

window.addEventListener('resize', () => {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
});
