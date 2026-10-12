import { ArenaMatch, resolveLoadout } from '../../domain/arena-v2/match-engine.js';
import { BONUSES, CATALOG, FAMILIES, candidateCountsForBonus, defaultLoadout } from '../../domain/arena-v2/balance.js';
import { ArenaPracticeBot, BOT_ARCHETYPES } from '../../application/arena-v2-bot.js';
import { BASE_ARSENAL, SAVE_KEY } from '../../domain/factory-v2/catalog.js';
import { decodeSave } from '../../domain/factory-v2/save-format.js';
import { exportUnlocks } from '../../domain/factory-v2/factory-engine.js';

const $ = id => document.getElementById(id);
const names = { rockets: 'Cohetes', shields: 'Escudos', sabotage: 'Sabotaje' };
const effectNames = { income: 'ingresos reducidos', economicIncome: 'ingreso de mejoras económicas reducido', cooldown: 'recarga lenta', rocketDelay: 'lanzamientos demorados', nextGuardian: 'próximo envío demorado', nextUpgrade: 'próxima mejora económica encarecida', nextAction: 'próxima acción encarecida', precision: 'potencia reducida', shieldDelay: 'activación de defensa demorada', guardianDelay: 'guardianes demorados' };
let loadout = defaultLoadout(), prepared = null, match = null, bot = null, paused = false;
let lastFrame = null, renderElapsed = 0, interactionHeld = false, resultRendered = false;
const sabotageTargets = {};
let availableUnlocks = BASE_ARSENAL;

function freezeUnlocks(unlocks) {
  return Object.freeze(Object.fromEntries(Object.entries(unlocks).map(([family, ids]) => [family, Object.freeze([...ids])])));
}
function usableBonuses(unlocks) {
  return unlocks.bonuses.filter(id => {
    const family = BONUSES[id].extraReserveFamily;
    return !family || unlocks[family].length >= candidateCountsForBonus(id)[family];
  });
}
function resizeCandidates(target, unlocks) {
  const counts = candidateCountsForBonus(target.bonus);
  for (const family of FAMILIES) {
    const eligible = target.candidates[family].filter(id => unlocks[family].includes(id));
    target.candidates[family] = [...new Set([...eligible, ...unlocks[family]])].slice(0, counts[family]);
  }
}
function refreshFactoryUnlocks(onlyIfChanged = false) {
  const previousUnlocks = availableUnlocks;
  let message;
  availableUnlocks = BASE_ARSENAL;
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (raw === null) message = 'Arsenal inicial disponible. Prestigiá en Megafábrica nueva para desbloquear más opciones.';
    else {
      const factory = decodeSave(raw);
      availableUnlocks = freezeUnlocks(exportUnlocks(factory));
      message = `Megafábrica conectada: ${factory.permanent.research.length} investigaciones permanentes. Se agregan opciones para elegir; las estadísticas de combate siguen siendo las de cada variante.`;
    }
  } catch {
    message = 'No pudimos leer un guardado válido de Megafábrica. Usás el arsenal inicial; tus datos se conservan. Revisá el guardado desde Megafábrica nueva.';
  }
  if ($('factory-sync-status').textContent !== message) $('factory-sync-status').textContent = message;
  const optionsChanged = Object.keys(availableUnlocks).some(family =>
    previousUnlocks[family].length !== availableUnlocks[family].length
    || availableUnlocks[family].some(id => !previousUnlocks[family].includes(id)))
    || previousUnlocks.bonuses.length !== availableUnlocks.bonuses.length
    || availableUnlocks.bonuses.some(id => !previousUnlocks.bonuses.includes(id));
  // Factory saves every second; preserve focused controls for resource-only saves.
  if (onlyIfChanged && !optionsChanged) return;
  const bonusOptions = usableBonuses(availableUnlocks);
  if (!bonusOptions.includes(loadout.bonus)) loadout.bonus = bonusOptions[0] ?? 'expansion';
  resizeCandidates(loadout, availableUnlocks);
  $('bonus').replaceChildren(...availableUnlocks.bonuses.map(id => {
    const family = BONUSES[id].extraReserveFamily;
    const item = option(id, `${BONUSES[id].name}${family && !bonusOptions.includes(id) ? ' · requiere una variante investigada más' : ''}`);
    item.disabled = !bonusOptions.includes(id);
    return item;
  }));
  $('bonus').value = loadout.bonus;
  $('bonus-detail').textContent = BONUSES[loadout.bonus].detail;
  renderPreparation();
}

function button(text, onClick, disabled = false) {
  const el = document.createElement('button'); el.textContent = text; el.disabled = disabled;
  el.addEventListener('click', onClick); return el;
}
function paragraph(text, className = '') {
  const el = document.createElement('p'); el.textContent = text; el.className = className; return el;
}
function option(value, text) {
  const el = document.createElement('option'); el.value = value; el.textContent = text; return el;
}
function invalidate() { prepared = null; $('start').hidden = true; $('preview').hidden = true; }
function updateBotStyleDetail() {
  $('bot-style-detail').textContent = BOT_ARCHETYPES[$('bot-style').value]?.description ?? '';
}

function renderPreparation() {
  $('loadout').replaceChildren();
  for (const family of FAMILIES) {
    const card = document.createElement('div'); card.className = 'card';
    const title = document.createElement('h3'); title.textContent = names[family]; card.append(title);
    const list = document.createElement('ol'); list.className = 'order';
    loadout.candidates[family].forEach((id, index) => {
      const row = document.createElement('li');
      const choice = document.createElement('select');
      choice.setAttribute('aria-label', `${names[family]}, opción ${index + 1}`);
      Object.entries(CATALOG[family]).forEach(([variant, data]) => {
        if (availableUnlocks[family].includes(variant) && (variant === id || !loadout.candidates[family].includes(variant))) choice.append(option(variant, `${index + 1}. ${data.name} · ${data.cost} C`));
      });
      choice.value = id; choice.title = CATALOG[family][id].detail;
      choice.addEventListener('change', () => { loadout.candidates[family][index] = choice.value; invalidate(); renderPreparation(); });
      row.append(choice);
      for (const [direction, label] of [[-1, '↑'], [1, '↓']]) {
        const move = button(label, () => {
          const ids = loadout.candidates[family], next = index + direction;
          [ids[index], ids[next]] = [ids[next], ids[index]];
          invalidate(); renderPreparation();
        }, index + direction < 0 || index + direction >= loadout.candidates[family].length);
        move.setAttribute('aria-label', `${direction < 0 ? 'Subir' : 'Bajar'} ${CATALOG[family][id].name}`);
        row.append(move);
      }
      list.append(row);
      const detail = document.createElement('li'); detail.className = 'hint'; detail.textContent = CATALOG[family][id].detail; list.append(detail);
    });
    card.append(list);
    const label = document.createElement('label'); label.textContent = 'Bloquear al rival';
    const select = document.createElement('select'); select.id = `ban-${family}`;
    Object.entries(CATALOG[family]).forEach(([id, data]) => select.append(option(id, data.name)));
    select.value = prepared?.bans?.[0]?.[family] ?? loadout.candidates[family][loadout.candidates[family].length - 1];
    // Preserve the chosen ban across reorder renders.
    select.value = chosenBans[family] ?? select.value;
    select.addEventListener('change', () => { chosenBans[family] = select.value; invalidate(); });
    label.append(select); card.append(label); $('loadout').append(card);
  }
}
const chosenBans = {};
function bonusChanged() {
  if (!usableBonuses(availableUnlocks).includes($('bonus').value)) return;
  loadout.bonus = $('bonus').value;
  resizeCandidates(loadout, availableUnlocks);
  $('bonus-detail').textContent = BONUSES[loadout.bonus].detail;
  invalidate(); renderPreparation();
}
$('bonus').addEventListener('change', bonusChanged);
$('bot-style').replaceChildren(...Object.entries(BOT_ARCHETYPES).map(([id, profile]) => option(id, profile.name)));
$('bot-style').value = 'balanced';
updateBotStyleDetail();
$('bot-style').addEventListener('change', () => { updateBotStyleDetail(); invalidate(); });
$('seed').addEventListener('input', invalidate);
refreshFactoryUnlocks();
window.addEventListener('storage', event => {
  if (event.key !== SAVE_KEY && event.key !== null) return;
  if (prepared || match) {
    $('factory-sync-status').textContent = 'El guardado de Megafábrica cambió. Se actualizará al resolver una nueva preparación; esta configuración y la partida conservan sus opciones.';
  } else refreshFactoryUnlocks(true);
});

$('prepare').addEventListener('click', () => {
  const seed = Number($('seed').value);
  if (!Number.isInteger(seed) || seed < 1 || seed > 4294967295) { $('preview').hidden = false; $('preview').textContent = 'Elegí una semilla entera válida.'; return; }
  for (const family of FAMILIES) chosenBans[family] = $(`ban-${family}`).value;
  invalidate(); refreshFactoryUnlocks();
  const unlocks = freezeUnlocks(availableUnlocks);
  const picker = new ArenaPracticeBot(seed);
  const botArchetype = $('bot-style').value;
  const profile = BOT_ARCHETYPES[botArchetype] ?? BOT_ARCHETYPES.balanced;
  const enemyBonusOptions = usableBonuses(unlocks);
  const favoredBonuses = profile.bonusPriority.filter(id => enemyBonusOptions.includes(id));
  const enemyBonus = favoredBonuses[0] ?? enemyBonusOptions[Math.floor(picker.random() * enemyBonusOptions.length)];
  const enemy = defaultLoadout(enemyBonus);
  const enemyCounts = candidateCountsForBonus(enemy.bonus);
  for (const family of FAMILIES) {
    const pool = [...unlocks[family]];
    const preferred = profile.preferences[family].filter(id => pool.includes(id));
    const remaining = pool.filter(id => !preferred.includes(id));
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(picker.random() * (i + 1)); [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }
    enemy.candidates[family] = [...preferred, ...remaining].slice(0, enemyCounts[family]);
  }
  const ownBans = Object.fromEntries(FAMILIES.map(family => [family, $(`ban-${family}`).value]));
  const enemyBans = Object.fromEntries(FAMILIES.map(family => {
    const list = Object.keys(CATALOG[family]); return [family, list[Math.floor(picker.random() * list.length)]];
  }));
  prepared = { loadouts: [structuredClone(loadout), enemy], bans: [ownBans, enemyBans], unlocks: Object.freeze([unlocks, unlocks]), seed, botArchetype };
  renderPreview();
});

function renderPreview() {
  $('preview').replaceChildren(paragraph('Bloqueos resueltos. El bonus que elegiste queda fijo durante toda la partida.'));
  const profile = BOT_ARCHETYPES[prepared.botArchetype];
  $('preview').append(paragraph(`Estilo del rival: ${profile.name}. ${profile.description}`, 'hint'));
  for (let i = 0; i < 2; i++) {
    const resolved = resolveLoadout(prepared.loadouts[i], prepared.bans[1 - i], prepared.unlocks[i]);
    $('preview').append(paragraph(i === 0 ? 'Tu configuración:' : 'Configuración del rival:'));
    $('preview').append(paragraph(`Bonus permanente: ${BONUSES[resolved.bonus].name}. ${BONUSES[resolved.bonus].detail}`, 'hint'));
    for (const family of FAMILIES) {
      const label = ids => ids.map(id => CATALOG[family][id].name).join(' + ');
      const ban = prepared.bans[1 - i][family];
      const coincides = prepared.loadouts[i].candidates[family].includes(ban);
      $('preview').append(paragraph(`${names[family]} activos: ${label(resolved.active[family])}. Reserva: ${label(resolved.reserve[family]) || 'ninguna; no se puede cambiar'}. Bloqueo: ${CATALOG[family][ban].name}${coincides ? '' : ' (no coincide con tu lista)'}.`, 'hint'));
    }
  }
  $('preview').hidden = false; $('start').hidden = false;
}

$('start').addEventListener('click', () => {
  if (!prepared) return;
  for (const key of Object.keys(sabotageTargets)) delete sabotageTargets[key];
  match = new ArenaMatch(prepared); bot = new ArenaPracticeBot(prepared.seed, 1, prepared.botArchetype);
  paused = false; lastFrame = null; resultRendered = false; $('pause').textContent = 'Pausar'; $('pause').disabled = false;
  $('notice').textContent = ''; $('preparation').hidden = true; $('battle').hidden = false; renderBattle();
});
$('pause').addEventListener('click', () => { paused = !paused; $('pause').textContent = paused ? 'Continuar' : 'Pausar'; });
$('battle').addEventListener('pointerdown', event => {
  if (event.target.closest('button')) interactionHeld = true;
});
window.addEventListener('pointerup', () => { interactionHeld = false; });
window.addEventListener('pointercancel', () => { interactionHeld = false; });
$('battle').addEventListener('keydown', event => {
  if ((event.key === 'Enter' || event.key === ' ') && event.target.closest('button')) interactionHeld = true;
});
window.addEventListener('keyup', event => {
  if (event.key === 'Enter' || event.key === ' ') interactionHeld = false;
});
$('restart').addEventListener('click', () => { match = null; $('battle').hidden = true; $('preparation').hidden = false; invalidate(); refreshFactoryUnlocks(); });
function act(command) {
  if (paused) { $('notice').textContent = 'Continuá la partida para actuar.'; return; }
  const result = match.dispatch(0, command);
  $('notice').textContent = result.ok ? 'Acción confirmada.' : result.error;
  renderBattle();
}
function actionButton(label, command) {
  const quote = match.quote(0, command);
  const text = `${label}${quote.credits ? ` · ${Math.ceil(quote.credits)} C` : ''}${quote.energy ? ` · ${quote.energy} E` : ''}`;
  const el = button(text, () => act(command), !quote.ok || paused);
  el.dataset.commandKey = JSON.stringify(command);
  if (!quote.ok) el.title = quote.error;
  return el;
}
const timeLabel = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
function renderBattle() {
  if (!match) return;
  const focusKey = document.activeElement?.dataset?.commandKey;
  const controlFocusKey = document.activeElement?.dataset?.controlKey;
  const state = match.snapshot(0), p = state.players[0];
  resultRendered = state.status === 'finished';
  $('clock').textContent = state.status === 'finished' ? (state.winner === null ? 'Empate' : state.winner === 0 ? 'Ganaste' : 'Ganó el rival') : `Tiempo ${timeLabel(match.config.duration - state.time)}`;
  $('node').textContent = `Nodo: ${state.node.owner === null ? 'neutral' : state.node.owner === 0 ? 'tuyo' : 'rival'} · ${state.node.guardians} guardianes`;
  $('pause').disabled = state.status === 'finished';
  $('players').replaceChildren();
  state.players.forEach((player, index) => {
    const card = document.createElement('div'); card.className = 'card';
    const title = document.createElement('h3'); title.textContent = index === 0 ? 'Vos' : `Rival · ${BOT_ARCHETYPES[prepared?.botArchetype]?.name ?? 'Equilibrado'}`; card.append(title);
    const meter = document.createElement('meter'); meter.min = 0; meter.max = match.config.coreHP; meter.value = player.core; meter.setAttribute('aria-label', 'Vida del núcleo'); card.append(meter);
    card.append(paragraph(`Núcleo ${Math.ceil(player.core)} · Escudo ${Math.ceil(player.shields.reduce((total, shield) => total + shield.capacity * (1 - shield.weakening), 0))}`));
    card.append(paragraph(`Créditos ${Math.floor(player.credits)} · Energía ${player.energy.toFixed(1)} · Nodo +${player.extracted.toFixed(1)}/${match.config.nodeEnergyCap}`));
    card.append(paragraph(`Bonus fijo: ${BONUSES[player.bonus].name} · Economía nivel ${player.level + 1} · Ingreso ${match.income(index).toFixed(1)}/s`, 'hint'));
    for (const family of FAMILIES) card.append(paragraph(`${names[family]}: ${player.active[family].map(id => CATALOG[family][id].name).join(' + ')}`, 'hint'));
    if (player.emergencyArmed) card.append(paragraph('Escudo de emergencia armado: espera el umbral de vida.', 'hint'));
    if (player.effects.length) card.append(paragraph(`Interferencias: ${player.effects.map(effect => `${effectNames[effect.kind]}${effect.family ? ` (${names[effect.family]}${effect.slot !== undefined ? ` ${effect.slot + 1}` : ''})` : ''}${effect.remaining !== null ? ` ${Math.ceil(effect.remaining)} s` : ''}`).join(', ')}`, 'hint'));
    if (player.shields.some(shield => shield.weakenedFor > 0)) card.append(paragraph('Escudos presentes debilitados temporalmente.', 'hint'));
    if (player.pending) card.append(paragraph(`Cambiando ${names[player.pending.family]}: ${Math.ceil(player.pending.remaining)} s`, 'hint'));
    $('players').append(card);
  });
  $('flights').textContent = state.flights.filter(f => f.kind === 'rocket').map(f => `${f.player === 0 ? 'Tu' : 'Su'} ${CATALOG.rockets[f.variant].name}: impacto en ${Math.ceil(f.at - state.time)} s`).join(' · ') || 'Sin cohetes en tránsito.';
  $('actions').replaceChildren();
  for (const family of FAMILIES) {
    const card = document.createElement('div'); card.className = 'card';
    const title = document.createElement('h3'); title.textContent = names[family]; card.append(title);
    p.active[family].forEach((id, slot) => {
      const data = CATALOG[family][id], row = document.createElement('div'); row.className = 'action-row';
      const command = { type: 'use', family, slot };
      if (data.targeted) {
        const target = sabotageTargets[slot] ?? { family: 'rockets', slot: 0 };
        if (data.slotTargeted && target.family === 'sabotage') { target.family = 'rockets'; target.slot = 0; }
        sabotageTargets[slot] = target;
        const label = document.createElement('label'); label.textContent = 'Objetivo rival';
        const select = document.createElement('select');
        select.dataset.controlKey = `target-${slot}-family`;
        for (const f of (data.slotTargeted ? ['rockets', 'shields'] : FAMILIES)) select.append(option(f, names[f]));
        select.value = target.family; select.addEventListener('change', () => { target.family = select.value; target.slot = 0; renderBattle(); });
        label.append(select); row.append(label); command.targetFamily = target.family;
        if (data.slotTargeted) {
          const slotSelect = document.createElement('select'); slotSelect.setAttribute('aria-label', 'Acción rival objetivo');
          slotSelect.dataset.controlKey = `target-${slot}-slot`;
          state.players[1].active[target.family].forEach((variant, targetSlot) => slotSelect.append(option(String(targetSlot), CATALOG[target.family][variant].name)));
          slotSelect.value = String(target.slot); slotSelect.addEventListener('change', () => { target.slot = Number(slotSelect.value); renderBattle(); });
          row.append(slotSelect); command.targetSlot = target.slot;
        }
      }
      row.append(actionButton(`${data.emergencyThreshold ? 'Armar: ' : ''}${data.name}${p.cooldowns[family][slot] > 0 ? ` (${Math.ceil(p.cooldowns[family][slot])} s)` : ''}`, command));
      row.append(paragraph(data.detail, 'hint'));
      if (!p.changed[family]) p.reserve[family].forEach(variant => row.append(actionButton(`Cambiar ${data.name} por ${CATALOG[family][variant].name}`, { type: 'swap', family, slot, variant })));
      card.append(row);
    });
    if (p.changed[family]) card.append(paragraph('Cambio de esta familia consumido.', 'hint'));
    else if (!p.reserve[family].length) card.append(paragraph('Sin reserva disponible: esta familia no se puede reconfigurar.', 'hint'));
    $('actions').append(card);
  }
  $('economy-actions').replaceChildren(actionButton('Mejorar economía', { type: 'upgrade' }), actionButton('Enviar 1 guardián', { type: 'guardians', count: 1 }), actionButton('Enviar 3 guardianes', { type: 'guardians', count: 3 }));
  $('events').replaceChildren();
  for (const event of state.events.slice(-12).reverse()) {
    const line = document.createElement('li'), who = event.player === null ? '' : event.player === 0 ? 'Vos' : 'Rival';
    const d = event.detail;
    const texts = {
      'swap-start': `${who}: empieza cambio de ${names[d.family]}`,
      'swap-complete': `${who}: cambio completo a ${CATALOG[d.family]?.[d.variant]?.name}`,
      action: `${who}: ${CATALOG[d.family]?.[d.variant]?.name}`,
      impact: `${who}: impacto, ${Math.ceil(d.coreDamage ?? 0)} daño al núcleo`,
      node: `${who}: llega al nodo`, finished: 'Partida finalizada',
      bonus: `${who}: reserva de emergencia +100 Créditos`,
      'emergency-shield': `${who}: se activa el escudo de emergencia`,
      reflection: `${who}: refleja ${Math.ceil(d.coreDamage ?? 0)} daño al núcleo`,
    };
    line.textContent = `${timeLabel(event.time)} — ${texts[event.type] ?? event.type}`; $('events').append(line);
  }
  if (focusKey) {
    const replacement = [...document.querySelectorAll('[data-command-key]')].find(el => el.dataset.commandKey === focusKey);
    if (replacement && !replacement.disabled) replacement.focus({ preventScroll: true });
  }
  if (controlFocusKey) {
    const replacement = [...document.querySelectorAll('[data-control-key]')].find(el => el.dataset.controlKey === controlFocusKey);
    replacement?.focus({ preventScroll: true });
  }
}
function frame(now) {
  if (lastFrame !== null && match && !paused && match.state.status === 'playing') {
    // Local practice pauses while hidden; do not skip bot decisions on a long frame.
    let remaining = Math.min(0.25, Math.max(0, (now - lastFrame) / 1000));
    renderElapsed += remaining;
    while (remaining > 1e-9) { const dt = Math.min(match.config.tick, remaining); bot.think(match); match.advance(dt); remaining -= dt; }
    if ((renderElapsed >= 0.5 || match.state.status === 'finished') && !interactionHeld) { renderBattle(); renderElapsed = 0; }
  }
  if (match?.state.status === 'finished' && !resultRendered && !interactionHeld) { renderBattle(); renderElapsed = 0; }
  lastFrame = now; requestAnimationFrame(frame);
}
window.addEventListener('blur', () => { interactionHeld = false; });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) interactionHeld = false;
  if (document.hidden && match) { paused = true; $('pause').textContent = 'Continuar'; }
});
requestAnimationFrame(frame);
