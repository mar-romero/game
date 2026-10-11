import { ArenaMatch, resolveLoadout } from '../../domain/arena-v2/match-engine.js';
import { BONUSES, CATALOG, FAMILIES, LIST_COUNTS, defaultLoadout } from '../../domain/arena-v2/balance.js';
import { ArenaPracticeBot } from '../../application/arena-v2-bot.js';

const $ = id => document.getElementById(id);
const names = { rockets: 'Cohetes', shields: 'Escudos', sabotage: 'Sabotaje' };
const effectNames = { income: 'ingresos reducidos', factoryIncome: 'producción adicional reducida', cooldown: 'recarga lenta', rocketDelay: 'lanzamientos demorados', nextGuardian: 'próximo envío demorado', nextFactory: 'próxima fábrica encarecida', nextAction: 'próxima acción encarecida', precision: 'potencia reducida', shieldDelay: 'activación de defensa demorada', guardianDelay: 'guardianes demorados' };
let loadout = defaultLoadout(), prepared = null, match = null, bot = null, paused = false;
let lastFrame = null, renderElapsed = 0, interactionHeld = false, resultRendered = false;
const sabotageTargets = {};

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
function invalidate() { prepared = null; $('start').hidden = true; $('preview').hidden = true; $('bonus-choice').hidden = true; }

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
        if (variant === id || !loadout.candidates[family].includes(variant)) choice.append(option(variant, `${index + 1}. ${data.name} · ${data.cost} C`));
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
Object.entries(BONUSES).forEach(([id, data]) => $('bonus').append(option(id, data.name)));
$('bonus').value = loadout.bonus;
function bonusChanged() {
  loadout.bonus = $('bonus').value; $('bonus-detail').textContent = BONUSES[loadout.bonus].detail;
  if (prepared) { prepared.loadouts[0].bonus = loadout.bonus; renderPreview(); }
}
$('bonus').addEventListener('change', bonusChanged);
$('seed').addEventListener('input', invalidate);
bonusChanged(); renderPreparation();

$('prepare').addEventListener('click', () => {
  const seed = Number($('seed').value);
  if (!Number.isInteger(seed) || seed < 1 || seed > 4294967295) { $('preview').hidden = false; $('preview').textContent = 'Elegí una semilla entera válida.'; return; }
  const picker = new ArenaPracticeBot(seed);
  const enemy = defaultLoadout(Object.keys(BONUSES)[Math.floor(picker.random() * Object.keys(BONUSES).length)]);
  for (const family of FAMILIES) {
    const ids = Object.keys(CATALOG[family]);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(picker.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    enemy.candidates[family] = ids.slice(0, LIST_COUNTS[family]);
  }
  const ownBans = Object.fromEntries(FAMILIES.map(family => [family, $(`ban-${family}`).value]));
  const enemyBans = Object.fromEntries(FAMILIES.map(family => {
    const list = Object.keys(CATALOG[family]); return [family, list[Math.floor(picker.random() * list.length)]];
  }));
  prepared = { loadouts: [structuredClone(loadout), enemy], bans: [ownBans, enemyBans], seed };
  renderPreview(); $('bonus-choice').hidden = false;
});

function renderPreview() {
  $('preview').replaceChildren(paragraph('Bloqueos resueltos. Elegí tu bonus permanente y empezá: no podrás cambiarlo durante la partida.'));
  for (let i = 0; i < 2; i++) {
    const resolved = resolveLoadout(prepared.loadouts[i], prepared.bans[1 - i]);
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
  match = new ArenaMatch(prepared); bot = new ArenaPracticeBot(prepared.seed, 1);
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
$('restart').addEventListener('click', () => { match = null; $('battle').hidden = true; $('preparation').hidden = false; invalidate(); });
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
    const title = document.createElement('h3'); title.textContent = index === 0 ? 'Vos' : 'Rival'; card.append(title);
    const meter = document.createElement('meter'); meter.min = 0; meter.max = match.config.coreHP; meter.value = player.core; meter.setAttribute('aria-label', 'Vida del núcleo'); card.append(meter);
    card.append(paragraph(`Núcleo ${Math.ceil(player.core)} · Escudo ${Math.ceil(player.shields.reduce((total, shield) => total + shield.capacity * (1 - shield.weakening), 0))}`));
    card.append(paragraph(`Créditos ${Math.floor(player.credits)} · Energía ${player.energy.toFixed(1)} · Nodo +${player.extracted.toFixed(1)}/${match.config.nodeEnergyCap}`));
    card.append(paragraph(`Bonus fijo: ${BONUSES[player.bonus].name} · Nivel ${player.level + 1} · Fábricas ${player.factories} · Ingreso ${match.income(index).toFixed(1)}/s`, 'hint'));
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
  $('economy-actions').replaceChildren(actionButton('Mejorar economía', { type: 'upgrade' }), actionButton('Construir fábrica', { type: 'factory' }), actionButton('Enviar 1 guardián', { type: 'guardians', count: 1 }), actionButton('Enviar 3 guardianes', { type: 'guardians', count: 3 }));
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
