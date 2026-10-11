import { SAVE_KEY, RESOURCES, BUILDINGS, MAX_BUILDING_LEVEL, PROJECTS, CONTRACTS, FAMILY_NAMES, BASE_ARSENAL, ARSENAL_OPTIONS, RESEARCH } from '../../domain/factory-v2/catalog.js';
import { createFactory, advanceFactory, executeCommand, productionRates, buildingCost, missingResources, missions, availableResearch, canPrestige, exportUnlocks } from '../../domain/factory-v2/factory-engine.js';
import { decodeSave, encodeSave } from '../../domain/factory-v2/save-format.js';

const $ = id => document.getElementById(id);
const number = value => value.toLocaleString('es-AR', { maximumFractionDigits: 1 });
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const materials = cost => Object.entries(cost).map(([key, amount]) => `${number(amount)} ${RESOURCES[key]}`).join(' · ');
let state = null;
let lastRaw = null;
let blocked = false;

function announce(message) { $('message').textContent = message; }
function storageError(message) {
  blocked = true; $('factory').hidden = true; $('storage-error').hidden = false;
  $('storage-detail').textContent = message; $('prestige-dialog').close();
  announce('La práctica está pausada para proteger el guardado.');
}
function commit(next) {
  if (localStorage.getItem(SAVE_KEY) !== lastRaw) throw new Error('El guardado cambió en otra pestaña. Volvé a cargar para usar sus datos.');
  const raw = encodeSave(next);
  localStorage.setItem(SAVE_KEY, raw);
  lastRaw = raw; state = next;
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    lastRaw = raw;
    const now = Date.now();
    const loaded = raw === null ? createFactory(now) : decodeSave(raw);
    const elapsed = now - loaded.savedAt;
    const next = advanceFactory(loaded, now);
    commit(next); blocked = false; $('storage-error').hidden = true; $('factory').hidden = false;
    render(); announce(elapsed >= 5000 ? 'Bienvenido. Se acreditó tu producción acumulada (máximo 4 horas) y los contratos terminados.' : 'Elegí tu proyecto y decidí dónde invertir.');
  } catch (error) { storageError(`No podemos cargar o guardar la práctica. ${error.message}`); }
}
function setHTML(id, html) {
  const node = $(id);
  if (node.innerHTML !== html) {
    const focusedId = node.contains(document.activeElement) ? document.activeElement.id : null;
    node.innerHTML = html;
    if (focusedId) $(focusedId)?.focus({ preventScroll: true });
  }
}
function shortage(cost) {
  const missing = missingResources(state, cost);
  return Object.keys(missing).length ? `Falta: ${materials(missing)}` : 'Tenés los recursos necesarios.';
}
function affordable(cost) { return Object.keys(missingResources(state, cost)).length === 0; }
function render() {
  if (!state || blocked) return;
  const rates = productionRates(state);
  $('cycle-label').textContent = `Ciclo ${state.permanent.prestigeCount + 1} · ${state.permanent.prestigeCount} Prestigios`;
  setHTML('resources', Object.entries(RESOURCES).map(([key, name]) => `<div class="resource"><span>${name}</span><strong>${number(state.cycle.resources[key])}</strong><small>+${number(rates[key])} / segundo</small></div>`).join(''));
  setHTML('buildings', Object.entries(BUILDINGS).map(([id, building]) => {
    const cost = buildingCost(state, id); const max = state.cycle.buildings[id] >= MAX_BUILDING_LEVEL;
    return `<article class="card"><div class="card-top"><h3>${building.name}</h3><span>Nivel ${state.cycle.buildings[id]}</span></div><p>Produce ${RESOURCES[building.resource]} · ${number(rates[building.resource])}/s</p><p>${max ? 'Nivel máximo.' : `Costo: ${materials(cost)}<br>${shortage(cost)}`}</p><button id="upgrade-${id}" data-action="upgrade" data-id="${id}" ${max || !affordable(cost) ? 'disabled' : ''}>Mejorar ${building.name}</button></article>`;
  }).join(''));
  const project = state.cycle.project;
  if (project) {
    const definition = PROJECTS[project.id];
    const canDeliver = Object.entries(definition.cost).some(([key, amount]) => amount > project.delivered[key] && state.cycle.resources[key] > 0);
    setHTML('project', `<article class="card"><h3>${definition.name}</h3><p>${definition.detail}</p>${Object.entries(definition.cost).map(([key, amount]) => `<div class="mission">${RESOURCES[key]}: ${number(project.delivered[key])} / ${number(amount)}<progress value="${project.delivered[key]}" max="${amount}" aria-label="Entrega de ${RESOURCES[key]}"></progress></div>`).join('')}<p>${project.completed ? 'Terminado. Recompensa activa hasta el próximo Prestigio.' : 'Cada entrega aporta todo el material disponible que todavía necesita el proyecto. Guardá recursos si preferís invertirlos en otra cosa.'}</p>${project.completed ? '' : `<button id="deliver-project" data-action="deliverProject" ${canDeliver ? '' : 'disabled'}>Entregar materiales disponibles</button>`}</article>`);
  } else {
    setHTML('project', Object.entries(PROJECTS).map(([id, item]) => `<article class="card"><h3>${item.name}</h3><p>${item.detail}</p><p>Objetivo: ${materials(item.cost)}</p><button id="project-${id}" data-action="selectProject" data-id="${id}">Elegir ${item.name}</button></article>`).join(''));
  }
  const contract = state.cycle.contract;
  $('contract-status').textContent = contract ? `${CONTRACTS[contract.id].name} en curso · ${Math.max(0, Math.ceil((contract.endsAt - state.savedAt) / 1000))} s restantes. Recompensa: ${materials(CONTRACTS[contract.id].reward)}.` : 'Cola libre. La recompensa se acredita automáticamente.';
  setHTML('contracts', Object.entries(CONTRACTS).map(([id, item]) => `<article class="card"><h3>${item.name} · ${item.duration} s</h3><p>${item.detail}<br>Entrega: ${materials(item.cost)}<br>Recibís: ${materials(item.reward)}</p><p>${shortage(item.cost)}</p><button id="contract-${id}" data-action="startContract" data-id="${id}" ${contract || !affordable(item.cost) ? 'disabled' : ''}>Iniciar ${item.name}</button></article>`).join(''));
  setHTML('missions', missions(state).map(item => `<div class="mission">${item.name}: ${item.progress}/${item.target}<progress value="${item.progress}" max="${item.target}" aria-label="${item.name}"></progress></div>`).join(''));
  $('open-prestige').disabled = !canPrestige(state);
  $('prestige-reason').textContent = availableResearch(state).length === 0 ? 'Completaste el catálogo de investigaciones. No hay nuevos Prestigios disponibles en esta práctica.' : canPrestige(state) ? 'Cumpliste todas las misiones. Podés elegir una investigación nueva y comenzar otro ciclo.' : 'Completá las tres misiones para desbloquear el Prestigio.';
  setHTML('collection', `<p>Arsenal inicial gratuito: 4 cohetes, 4 defensas, 3 sabotajes y Expansión. No cuenta como recompensa de Prestigio.</p>${Object.entries(FAMILY_NAMES).map(([family, label]) => {
    const gained = state.permanent.research.filter(key => RESEARCH[key].family === family);
    return `<div class="collection-group"><h3>${label}</h3><p class="muted">Iniciales: ${BASE_ARSENAL[family].map(id => escape(ARSENAL_OPTIONS[family][id].name)).join(', ')}</p>${gained.length ? `<ul>${gained.map(key => `<li><strong>${escape(RESEARCH[key].name)}</strong> — ${escape(RESEARCH[key].detail)}</li>`).join('')}</ul>` : '<p>Todavía no ganaste investigaciones de esta familia.</p>'}</div>`;
  }).join('')}`);
  const payload = JSON.stringify(exportUnlocks(state), null, 2);
  if ($('unlocks').value !== payload) $('unlocks').value = payload;
}

function dispatch(command) {
  if (blocked || !state) return;
  let result;
  try { result = executeCommand(state, command, Date.now()); }
  catch (error) { announce(error.message); return; }
  try { commit(result.state); }
  catch (error) { storageError(`La acción no se confirmó. ${error.message}`); return; }
  if (command.type === 'prestige') $('prestige-dialog').close();
  render(); announce(result.message);
}
$('factory').addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (button) dispatch({ type: button.dataset.action, id: button.dataset.id });
});
function researchDetail() {
  const item = RESEARCH[$('research-choice').value];
  $('research-detail').textContent = item ? `${FAMILY_NAMES[item.family]} · ${item.name}: ${item.detail}` : '';
}
$('open-prestige').addEventListener('click', () => {
  if (!state || blocked || !canPrestige(state)) return;
  $('research-choice').innerHTML = Object.entries(FAMILY_NAMES).map(([family, name]) => `<optgroup label="${name}">${availableResearch(state).filter(([, item]) => item.family === family).map(([key, item]) => `<option value="${key}">${escape(item.name)}</option>`).join('')}</optgroup>`).join('');
  researchDetail(); $('prestige-dialog').showModal();
});
$('research-choice').addEventListener('change', researchDetail);
$('cancel-prestige').addEventListener('click', () => $('prestige-dialog').close());
$('prestige-form').addEventListener('submit', event => { event.preventDefault(); dispatch({ type: 'prestige', research: $('research-choice').value }); });
$('copy-unlocks').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('unlocks').value); announce('Opciones copiadas. Arena todavía requiere integrar este formato.'); }
  catch { $('unlocks').focus(); $('unlocks').select(); announce('Seleccionamos el texto. Podés copiarlo manualmente.'); }
});
$('reload-save').addEventListener('click', load);
$('download-save').addEventListener('click', () => {
  let raw = lastRaw;
  try { raw = localStorage.getItem(SAVE_KEY); } catch { /* Preserve the last readable data. */ }
  if (raw === null) { announce('No hay datos guardados para descargar.'); return; }
  const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'factory-v2-guardado.json'; anchor.click(); URL.revokeObjectURL(url);
});
$('reset-save').addEventListener('click', () => {
  if (!window.confirm('¿Reiniciar solamente esta práctica? Se perderán su fábrica y sus investigaciones permanentes. El juego principal conserva sus datos.')) return;
  try {
    const fresh = createFactory(Date.now()); const raw = encodeSave(fresh);
    localStorage.setItem(SAVE_KEY, raw); lastRaw = raw; state = fresh; blocked = false;
    $('prestige-dialog').close(); $('storage-error').hidden = true; $('factory').hidden = false; render(); announce('Práctica reiniciada.');
  } catch (error) { storageError(`No pudimos reiniciar. ${error.message}`); }
});
window.addEventListener('storage', event => {
  if (event.key === SAVE_KEY || event.key === null) storageError('Otra pestaña cambió los datos de la práctica. Volvé a cargar para usar el guardado actual.');
});
setInterval(() => {
  if (blocked || !state) return;
  try {
    const hadActiveContract = state.cycle.contract !== null;
    const next = advanceFactory(state, Date.now());
    const contractCompleted = hadActiveContract && next.cycle.contract === null;
    commit(next); render();
    if (contractCompleted) announce('Contrato completado. La recompensa se acreditó en tu fábrica.');
  }
  catch (error) { storageError(`No podemos continuar guardando. ${error.message}`); }
}, 1000);
load();
