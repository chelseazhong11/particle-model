// Particle simulation inside a cylindrical jar with a lid.
//
// One "heat" value (0 = very cold, 1 = very hot) controls everything.
// Each particle has its own melting and evaporating point inside a small
// band, so particles change state one at a time instead of all at once.
//   solid  -> held near a fixed spot in a packed block, vibrates in place
//   liquid -> pulled down by gravity, stays close, slides past others
//   gas    -> no gravity, fast, bounces off walls, lid, and each other

export const SOLID = 0;
export const LIQUID = 1;
export const GAS = 2;

export const MELT_BAND = [0.3, 0.4];
export const EVAPORATE_BAND = [0.62, 0.72];

const GRAVITY = 6;
const SPRING = 140;
const SPRING_DAMPING = 16;
const LIQUID_DAMPING = 1.6;

const randomDirection = () => {
  const u = Math.random() * 2 - 1;
  const t = Math.random() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  return [s * Math.cos(t), u, s * Math.sin(t)];
};

const lerp = (a, b, t) => a + (b - a) * t;

export class ParticleSim {
  constructor({ heat = 0.15, radius = 0.13, jarRadius = 1, jarHeight = 2.4, side = 3 } = {}) {
    this.heat = heat;
    this.radius = radius;
    this.jarRadius = jarRadius;
    this.jarHeight = jarHeight;
    this.count = side * side * side;
    this.time = 0;

    this.pos = new Float32Array(this.count * 3);
    this.vel = new Float32Array(this.count * 3);
    this.home = new Float32Array(this.count * 3);
    this.meltAt = new Float32Array(this.count);
    this.evaporateAt = new Float32Array(this.count);
    this.phase = new Float32Array(this.count * 3);
    this.state = new Uint8Array(this.count);

    // Packed block of touching particles sitting on the bottom of the jar.
    const gap = radius * 2;
    const offset = ((side - 1) * gap) / 2;
    let i = 0;
    for (let y = 0; y < side; y++) {
      for (let z = 0; z < side; z++) {
        for (let x = 0; x < side; x++) {
          this.home[i * 3] = x * gap - offset;
          this.home[i * 3 + 1] = radius + y * gap;
          this.home[i * 3 + 2] = z * gap - offset;
          i++;
        }
      }
    }

    for (let i = 0; i < this.count; i++) {
      this.meltAt[i] = lerp(MELT_BAND[0], MELT_BAND[1], Math.random());
      this.evaporateAt[i] = lerp(EVAPORATE_BAND[0], EVAPORATE_BAND[1], Math.random());
      for (let k = 0; k < 3; k++) {
        this.phase[i * 3 + k] = Math.random() * Math.PI * 2;
        this.pos[i * 3 + k] = this.home[i * 3 + k];
      }
    }

    // Start already settled into whatever state the starting heat gives.
    this.updateStates();
    for (let i = 0; i < this.count; i++) {
      if (this.state[i] === GAS) {
        const [dx, dy, dz] = randomDirection();
        this.pos[i * 3] = dx * (jarRadius - radius) * 0.7;
        this.pos[i * 3 + 1] = lerp(radius, jarHeight - radius, Math.random());
        this.pos[i * 3 + 2] = dz * (jarRadius - radius) * 0.7;
        this.vel[i * 3] = dx;
        this.vel[i * 3 + 1] = dy;
        this.vel[i * 3 + 2] = dz;
      }
    }
    for (let n = 0; n < 240; n++) this.step(1 / 120);
  }

  updateStates() {
    for (let i = 0; i < this.count; i++) {
      if (this.heat < this.meltAt[i]) this.state[i] = SOLID;
      else if (this.heat < this.evaporateAt[i]) this.state[i] = LIQUID;
      else this.state[i] = GAS;
    }
  }

  // How many particles are in each state: [solid, liquid, gas].
  counts() {
    const c = [0, 0, 0];
    for (let i = 0; i < this.count; i++) c[this.state[i]]++;
    return c;
  }

  gasSpeed() {
    return 2.2 + 2.5 * this.heat;
  }

  step(dt) {
    this.time += dt;
    this.updateStates();
    const { pos, vel, home, heat } = this;
    const liquidKick = (5 + 8 * heat) * dt;

    for (let i = 0; i < this.count; i++) {
      const ix = i * 3;
      const state = this.state[i];

      if (state === SOLID) {
        for (let k = 0; k < 3; k++) {
          vel[ix + k] += (SPRING * (home[ix + k] - pos[ix + k]) - SPRING_DAMPING * vel[ix + k]) * dt;
        }
      } else if (state === LIQUID) {
        const [kx, ky, kz] = randomDirection();
        vel[ix] += kx * liquidKick - vel[ix] * LIQUID_DAMPING * dt;
        vel[ix + 1] += ky * liquidKick - vel[ix + 1] * LIQUID_DAMPING * dt - GRAVITY * dt;
        vel[ix + 2] += kz * liquidKick - vel[ix + 2] * LIQUID_DAMPING * dt;
      } else {
        // Keep gas particles moving at a speed that depends on the heat.
        let speed = Math.hypot(vel[ix], vel[ix + 1], vel[ix + 2]);
        if (speed < 1e-3) {
          [vel[ix], vel[ix + 1], vel[ix + 2]] = randomDirection();
          speed = 1;
        }
        const scale = lerp(speed, this.gasSpeed(), 0.08) / speed;
        vel[ix] *= scale;
        vel[ix + 1] *= scale;
        vel[ix + 2] *= scale;
      }

      pos[ix] += vel[ix] * dt;
      pos[ix + 1] += vel[ix + 1] * dt;
      pos[ix + 2] += vel[ix + 2] * dt;
    }

    this.collideParticles();
    this.collideWalls();
  }

  collideParticles() {
    const { pos, vel, radius: r } = this;
    const minDist = r * 2;
    for (let i = 0; i < this.count; i++) {
      for (let j = i + 1; j < this.count; j++) {
        const ix = i * 3;
        const jx = j * 3;
        const dx = pos[jx] - pos[ix];
        const dy = pos[jx + 1] - pos[ix + 1];
        const dz = pos[jx + 2] - pos[ix + 2];
        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq >= minDist * minDist || distSq === 0) continue;

        const dist = Math.sqrt(distSq);
        const nx = dx / dist;
        const ny = dy / dist;
        const nz = dz / dist;

        // Push apart so particles never overlap.
        const push = (minDist - dist) / 2;
        pos[ix] -= nx * push;
        pos[ix + 1] -= ny * push;
        pos[ix + 2] -= nz * push;
        pos[jx] += nx * push;
        pos[jx + 1] += ny * push;
        pos[jx + 2] += nz * push;

        // Bounce: gas collisions are springy, liquid/solid ones are soft.
        const approach =
          (vel[jx] - vel[ix]) * nx + (vel[jx + 1] - vel[ix + 1]) * ny + (vel[jx + 2] - vel[ix + 2]) * nz;
        if (approach >= 0) continue;
        const bounce = this.state[i] === GAS && this.state[j] === GAS ? 1 : 0.2;
        const impulse = (-(1 + bounce) * approach) / 2;
        vel[ix] -= nx * impulse;
        vel[ix + 1] -= ny * impulse;
        vel[ix + 2] -= nz * impulse;
        vel[jx] += nx * impulse;
        vel[jx + 1] += ny * impulse;
        vel[jx + 2] += nz * impulse;
      }
    }
  }

  collideWalls() {
    const { pos, vel, radius: r } = this;
    const maxRho = this.jarRadius - r;
    const top = this.jarHeight - r;
    for (let i = 0; i < this.count; i++) {
      const ix = i * 3;
      const bounce = this.state[i] === GAS ? 1 : 0.3;

      const rho = Math.hypot(pos[ix], pos[ix + 2]);
      if (rho > maxRho) {
        const nx = pos[ix] / rho;
        const nz = pos[ix + 2] / rho;
        pos[ix] = nx * maxRho;
        pos[ix + 2] = nz * maxRho;
        const outward = vel[ix] * nx + vel[ix + 2] * nz;
        if (outward > 0) {
          vel[ix] -= (1 + bounce) * outward * nx;
          vel[ix + 2] -= (1 + bounce) * outward * nz;
        }
      }
      if (pos[ix + 1] < r) {
        pos[ix + 1] = r;
        if (vel[ix + 1] < 0) vel[ix + 1] *= -bounce;
      } else if (pos[ix + 1] > top) {
        pos[ix + 1] = top;
        if (vel[ix + 1] > 0) vel[ix + 1] *= -bounce;
      }
    }
  }

  // Position to draw particle i at. Solid particles get a small wiggle on
  // top of their spot so the vibration is easy to see.
  renderPosition(i, out) {
    const ix = i * 3;
    out[0] = this.pos[ix];
    out[1] = this.pos[ix + 1];
    out[2] = this.pos[ix + 2];
    if (this.state[i] === SOLID) {
      const amount = 0.012 + 0.07 * this.heat;
      const t = this.time * 22;
      out[0] += Math.sin(t + this.phase[ix]) * amount;
      out[1] += Math.sin(t * 1.13 + this.phase[ix + 1]) * amount;
      out[2] += Math.sin(t * 0.91 + this.phase[ix + 2]) * amount;
    }
    return out;
  }
}
