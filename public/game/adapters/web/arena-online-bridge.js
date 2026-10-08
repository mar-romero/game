(() => {
  'use strict';
  const query = new URLSearchParams(location.search);
  if (query.get('online') !== '1' || window.parent === window) return;
  const swap = (id, side) => id === 'A' ? side : id === 'B' ? (side === 'A' ? 'B' : 'A') : id;
  let activeMatchId = null;
  let onlineState = null;

  function relay(action) {
    if (!onlineState || onlineState.ended) return false;
    window.parent.postMessage({ type: 'fw-online-action', action }, location.origin);
    return true;
  }

  function normalize(state, side) {
    const sourceSide = side;
    const ordered = sourceSide === 'A' ? state.players : [...state.players].reverse();
    const idMap = { [sourceSide]: 'A', [sourceSide === 'A' ? 'B' : 'A']: 'B' };
    const mapObject = (value) => {
      const p = { ...value, id: idMap[value.id], civ: value.civilization, bot: value.botStrategy,
        hp: value.coreHp, shields: value.shields || [], tiles: value.tiles || [], spec: value.spec ?? value.specialization,
        cd: { sabotage: 0, capture: 0, overdrive: 0, scan: 0, large: 0, ...(value.cooldowns || {}) },
        stats: value.stats || {}, telemetry: value.telemetry || {}, history: value.history || [],
        prodJobs: value.productionQueue || [], modules: value.modules || {}, moduleBuild: value.moduleBuild || null,
        factoryProgress: value.factoryProgress || { research: [], activeDoctrine: null }, pendingGuardianCount: 100,
        emergencyShieldCooldown: value.emergencyShieldCooldown || 0, scanText: value.scanText || '' };
      return p;
    };
    const players = ordered.map(mapObject);
    const events = (state.events || []).map((event) => ({ ...event, player: idMap[event.player] || event.player,
      target: idMap[event.target] || event.target, previous: idMap[event.previous] || event.previous }));
    const transit = (state.transit || []).map((trip) => ({ ...trip, from: idMap[trip.from] || trip.from,
      to: idMap[trip.to] || trip.to }));
    return { ...state, settings: { ...(state.settings || {}), mode: 'human', civA: players[0].civ, civB: players[1].civ },
      players, events, transit, t: state.time, owner: idMap[state.territoryOwner] ?? null,
      guardians: { A: state.guardians?.[sourceSide] ?? 0, B: state.guardians?.[sourceSide === 'A' ? 'B' : 'A'],
        N: state.guardians?.N ?? 0 }, winner: idMap[state.winner] ?? null, ended: Boolean(state.ended) };
  }

  function apply(message) {
    onlineState = message.state;
    if (activeMatchId !== message.matchId) {
      activeMatchId = message.matchId;
      const state = message.state;
      $('mode').value = 'human';
      $('civA').value = state.players.find((p) => p.id === message.side)?.civilization || 'forge';
      $('civB').value = state.players.find((p) => p.id !== message.side)?.civilization || 'swarm';
      document.body.classList.add('online-authoritative');
      window.__fwLeagueStarting = true;
      window.__fwLeagueMatch = { online: true };
      window.__fwOnlineArena = true;
      start();
      window.__fwLeagueStarting = false;
      window.__fwLeagueMatch = null;
      match.settings.mode = 'human';
      match.step = () => {};
      match.act = (player, action, cell) => relay({ action, ...(Number.isInteger(cell) ? { cell } : {}),
        ...(action === 'capture' ? { count: Number($('guardianSendCount')?.value || player.pendingGuardianCount || 100) } : {}) });
      match.startModule = (_player, key) => relay({ action: 'module', key });
      match.retreatGuardians = (_player, count) => relay({ action: 'retreat', count: Number(count) });
      match.activateEmergencyShield = () => relay({ action: 'emergency-shield' });
      // These controls only affect the local prototype. The server owns the
      // shared clock and match lifecycle, so keep the iframe from implying
      // that a player can pause, speed up, or restart a live match.
      $('pauseBtn').disabled = true;
      $('resetBtn').disabled = true;
      $('clockCaption').textContent = 'Reloj de partida compartido';
    }
    const normalized = normalize(message.state, message.side);
    match.t = normalized.time;
    match.ended = normalized.ended;
    match.winner = normalized.winner;
    match.endReason = normalized.endReason || '';
    match.owner = normalized.owner;
    match.guardians = normalized.guardians;
    match.events = normalized.events;
    match.transit = normalized.transit;
    match.lastSample = message.state.lastSample ?? match.lastSample;
    match.players = normalized.players.map((incoming, i) => Object.assign(match.players[i], incoming));
    lastFxEventIndex = Math.max(0, match.events.length - 1);
    lastVisibleEventIndex = Math.max(0, match.events.length - 1);
    render();
    $('matchStatus').textContent = match.ended ? 'PARTIDA FINALIZADA' : 'En curso · reloj compartido';
    if (match.ended && !window.__fwOnlineEndedShown) {
      window.__fwOnlineEndedShown = true;
      const panel = $('endPanel');
      panel.classList.remove('hidden');
      panel.innerHTML = `<div class="eyebrow">PARTIDA ONLINE REGISTRADA</div><h2>${match.winner === 'A' ? '¡GANASTE!' : match.winner === 'B' ? 'DERROTA' : 'EMPATE'}</h2><p>${String(match.endReason || 'Resultado guardado por el servidor.')}</p><p class="fine">Las estadísticas y el ranking se guardaron en la Liga. Podés volver al portal cuando quieras.</p>`;
    }
  }

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (target?.closest('#guardianSendButton')) {
      event.preventDefault(); event.stopImmediatePropagation();
      relay({ action: 'capture', count: Number($('guardianSendCount').value || 100) });
    } else if (target?.closest('#guardianRetreatButton')) {
      event.preventDefault(); event.stopImmediatePropagation();
      relay({ action: 'retreat', count: Number($('guardianRetreatCount').value || 10) });
    } else if (target?.closest('#emergencyShieldButton')) {
      event.preventDefault(); event.stopImmediatePropagation(); relay({ action: 'emergency-shield' });
    }
  }, true);

  window.addEventListener('message', (event) => {
    if (event.origin !== location.origin || event.source !== window.parent) return;
    if (event.data?.type === 'fw-online-state') apply(event.data);
    if (event.data?.type === 'fw-online-action-result' && !event.data.accepted) {
      combatToast(event.data.error || 'Acción no disponible con el estado actual.', 'danger');
    }
  });
  window.parent.postMessage({ type: 'fw-online-arena-ready' }, location.origin);
})();
