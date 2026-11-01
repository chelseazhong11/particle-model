import { ParticleSim, MELT_BAND, EVAPORATE_BAND } from './sim.js';
import { createStage } from './jar3d.js';
import { startCloseup } from './closeup.js';
import { jarIcon, cycleDiagram } from './drawings.js';

// Panel 1: three jars, each kept at a heat that makes one state.
createStage(document.getElementById('jars'), {
  sims: [0.12, 0.5, 0.9].map((heat) => new ParticleSim({ heat })),
  spacing: 2.7,
  halfWidth: 4,
});

// Panel 2: flat close-ups.
for (const canvas of document.querySelectorAll('.closeup canvas')) {
  startCloseup(canvas, canvas.dataset.kind);
}

// Panel 3: one jar controlled by the heat slider.
const slider = document.getElementById('heat');
const heatSim = new ParticleSim({ heat: slider.value / 100 });
createStage(document.getElementById('heat-jar'), { sims: [heatSim], halfWidth: 1.5 });

const stateName = document.getElementById('state-name');
const stateDetail = document.getElementById('state-detail');
document.getElementById('particle-count').textContent = heatSim.count;

function describe(heat) {
  heatSim.updateStates();
  const [solid, liquid, gas] = heatSim.counts();
  const total = heatSim.count;
  if (heat < MELT_BAND[0]) return ['Solid ❄️', 'Particles vibrate in place.'];
  if (heat <= MELT_BAND[1] && solid > 0) {
    return ['Melting…', `${liquid} of ${total} particles have melted into liquid.`];
  }
  if (heat < EVAPORATE_BAND[0]) return ['Liquid 💧', 'Particles slide past each other.'];
  if (heat <= EVAPORATE_BAND[1] && liquid > 0) {
    return ['Evaporating…', `${gas} of ${total} particles have turned into gas.`];
  }
  return ['Gas ☁️', 'Particles zoom around and fill the whole jar.'];
}

let lastHeat = slider.value / 100;
function updateStatus() {
  const heat = slider.value / 100;
  heatSim.heat = heat;
  const [name, detail] = describe(heat);
  stateName.textContent = name;
  let direction = '';
  if (heat > lastHeat) direction = 'Heating up → particles speed up.';
  else if (heat < lastHeat) direction = 'Cooling down → particles slow down.';
  stateDetail.textContent = name.endsWith('…') ? detail : `${detail} ${direction}`.trim();
  lastHeat = heat;
}
slider.addEventListener('input', updateStatus);
updateStatus();

// Panel 4: little jar drawings next to each list.
for (const card of document.querySelectorAll('.property')) {
  card.prepend(jarIcon(card.dataset.kind));
}

// Panel 5: solid <-> liquid <-> gas diagram.
document.getElementById('cycle').append(cycleDiagram());
