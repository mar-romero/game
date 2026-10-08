(() => {
  'use strict';
  const cfg = window.FACTORY_WARS_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const catalog = window.FactoryWars.EmpireCatalog;
  const progression = window.FactoryWars.EmpireProgression;
  const economy = window.FactoryWars.EmpireEconomy;
  let supabase, session, user, empire, revision = 0, socket, matchId = null, side = null, queuePoll;
  let passwordRecovery = false;
  let arenaReady = false, arenaSource = '';
  let latestMatchState = null;
  let lastEvents = new Set();
  const currencies = [['credits','CRÉDITOS'],['energy','ENERGÍA'],['steel','ACERO'],['intel','INTEL'],['dominion','DOMINIO'],['fragments','FRAGMENTOS']];
  const names = {generator:'Generadores',refinery:'Refinerías',lab:'Laboratorios',automation:'Automatización'};
  const money = (value) => Math.floor(Number(value || 0)).toLocaleString('es-AR');
  const eventId = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const toast = (message, error = false) => { const el=$('toast');el.textContent=message;el.classList.toggle('error',error);el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3500); };

  async function api(path, options = {}) {
    const response = await fetch(`${cfg.API_URL || ''}/api/v1${path}`, {
      ...options,
      headers: { 'content-type':'application/json', authorization:`Bearer ${session.access_token}`, ...(options.headers || {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
    return data;
  }

  async function command(type, extra = {}) {
    try {
      const response = await api('/me/empire/command', { method:'POST', body:JSON.stringify({eventId:eventId(),command:{type,...extra}}) });
      empire=response.state;revision=response.revision;renderEmpire();
      for (const event of response.events || []) if (event.eventType==='contract_complete') toast(`Contrato: +${event.payload.credits} créditos y +${event.payload.intel} Intel.`);
    } catch (error) { toast(error.message,true); }
  }

  function renderEmpire() {
    if (!empire) return;
    const rates=economy.productionRates(empire);
    $('resources').innerHTML=currencies.map(([key,label])=>`<div class="resource"><span>${label}</span><b>${money(empire[key])}</b><em>${rates[key]===undefined?'':`+${rates[key].toFixed(2)}/s`}</em></div>`).join('');
    $('civilization').value=empire.currentCiv||'';
    $('nextCivilization').value=empire.currentCiv||'forge';
    $('buildings').innerHTML=Object.entries(catalog.BUILDINGS).map(([key,building])=>{
      const cost=progression.buildingCost(empire,key),gain=economy.buildingGain(empire,key);
      return `<div class="building"><div class="building-head"><b>${building.icon} ${building.name}</b><strong>NV ${empire.buildings[key]}</strong></div><small>${gain.current.toFixed(2)} → ${gain.next.toFixed(2)} recurso/s</small><button data-upgrade="${key}" ${!empire.currentCiv||empire.credits<cost?'disabled':''}>MEJORAR · ${money(cost)} ◈</button></div>`;
    }).join('');
    $('buildings').querySelectorAll('[data-upgrade]').forEach((button)=>button.onclick=()=>command('upgrade-building',{key:button.dataset.upgrade}));
    const spec=progression.contractSpec(empire),missing=progression.contractMissing(empire,spec).filter(x=>x.missing>0);
    $('contractInfo').textContent=empire.activeContract?`En curso · ${Math.max(0,Math.ceil((empire.activeContract.endsAt-Date.now())/1000))} s · recibís ${money(empire.activeContract.reward)} Créditos + ${empire.activeContract.intelReward} Intel`:`Entregás ${money(spec.inputs.energy)} Energía, ${money(spec.inputs.steel)} Acero y ${money(spec.inputs.credits)} Créditos · esperás ${Math.ceil(spec.seconds)} s · recibís ${money(spec.reward)} Créditos + ${spec.intelReward} Intel${missing.length?` · faltan ${missing.map(x=>money(x.missing)).join(', ')}`:''}`;
    $('startContract').disabled=Boolean(empire.activeContract)||missing.length>0||!empire.currentCiv;
    const branches=['economy','rockets','defense','intel'];
    const rows=Object.entries(catalog.RESEARCH);
    $('research').innerHTML=rows.map(([key,item])=>{
      const cost=progression.researchCost(empire,key),done=empire.research.includes(key),locked=catalog.researchLockReason(empire.research,key);
      const family=catalog.researchPathInfo(key)?.branch||'especial';
      return `<button data-research="${key}" title="${escapeHtml(item.desc)}" ${done||locked||empire.intel<cost?'disabled':''}><b>${escapeHtml(item.name)}</b><span>${family.toUpperCase()} · ${done?'DESBLOQUEADA':locked||`${cost} Intel`}</span></button>`;
    }).join('');
    $('research').querySelectorAll('[data-research]').forEach((button)=>button.onclick=()=>command('buy-research',{key:button.dataset.research}));
    const doctrines=empire.research.filter((key)=>progression.isDoctrine(key));
    $('doctrine').innerHTML=`<option value="">Elegí una doctrina desbloqueada</option>${doctrines.map((key)=>`<option value="${escapeHtml(key)}">${escapeHtml(catalog.RESEARCH[key]?.name||key)}</option>`).join('')}`;
    $('doctrine').value=doctrines.includes(empire.activeDoctrine)?empire.activeDoctrine:'';
    $('doctrine').disabled=!doctrines.length;
    $('equipDoctrine').disabled=!doctrines.length||!$('doctrine').value;
    const pct=progression.prestigeProgress(empire);
    $('prestigeInfo').textContent=`Progreso ${pct}% · ${empire.prestigeCount} prestigios · Legado industrial ${((economy.legacyEfficiency(empire)-1)*100).toFixed(1)}%`;
    $('prestige').disabled=pct<100||!empire.currentCiv;
    $('nickname').value=empire.nickname||$('nickname').value;
  }

  async function refreshLeaderboard() {
    const data=await api('/leaderboard');
    $('leaderboard').innerHTML=`<table><thead><tr><th>#</th><th>Jugador</th><th>Civilización</th><th>Pts</th><th>Rating</th><th>Industria</th><th>V-E-D</th><th>Tipo</th></tr></thead><tbody>${data.players.map((p,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(p.display_name)}</td><td>${p.civilization.toUpperCase()}</td><td>${p.points}</td><td>${p.rating}</td><td>${p.industrial_score}</td><td>${p.wins}-${p.draws}-${p.losses}</td><td>${p.is_bot?`BOT · ${p.bot_strategy}`:'HUMANO'}</td></tr>`).join('')}</tbody></table>`;
  }

  function renderMatch(state) {
    latestMatchState = state;
    const [a,b]=state.players;
    const own=state.players.find((player)=>player.id===side);
    $('arenaStatus').textContent=state.ended?'Partida finalizada':`En curso · ${side||'—'}`;
    $('matchClock').textContent=`${Math.floor((state.duration-state.time)/60).toString().padStart(2,'0')}:${Math.floor((state.duration-state.time)%60).toString().padStart(2,'0')}`;
    $('nodeOwner').textContent=state.territoryOwner?`Jugador ${state.territoryOwner}`:'Neutral';
    $('players').innerHTML=[a,b].map((p)=>{
      const modules=Object.entries(p.modules||{}).filter(([,installed])=>installed).map(([key])=>key.replaceAll('_',' ')).join(', ')||'Sin mejoras';
      const jobs=(p.productionQueue||[]).map((job)=>`${job.action} ${job.status==='active'?`${Math.max(0,job.duration-job.progress).toFixed(1)}s`:'en cola'}`).join(' · ')||'Sin órdenes';
      const g=state.guardians||{};
      const guardianCount=g[p.id]===null||g[p.id]===undefined?'—':g[p.id];
      return `<div class="player"><small>${p.id===side?'VOS':p.isBot?`BOT · ${p.botStrategy}`:'JUGADOR'} · ${p.civilization.toUpperCase()}</small><b>${p.coreHp} ♥ · ${p.bank===null?'Banco oculto':`${money(p.bank)} ◈`}</b><small>Ingreso ${p.income}/s · economía ${p.level} · escudo ${p.shield} · guardianes ${guardianCount}</small><small>Entrantes: ${p.incoming.map((x)=>`${x.size} ${x.damage} daño en ${x.eta}s`).join(' · ')||'Ninguno'}</small><small class="player-meta">Mejoras: ${escapeHtml(modules)} · Fábrica: ${escapeHtml(jobs)}</small></div>`;
    }).join('');
    $('actions').querySelectorAll('button').forEach((button)=>button.disabled=state.ended||!side);
    $('retreatGuardians').disabled=state.ended||!side||!own?.factoryResearch?.includes('node_retreat');
    $('emergencyShield').disabled=state.ended||!side||!own?.factoryResearch?.includes('shield_emergency')||Number(own.emergencyShieldCooldown)>state.time;
    const available=(own?.moduleOptions||[]).filter((option)=>option.canBuild);
    $('moduleControls').innerHTML=available.length?available.map((option)=>`<div class="module-choice"><span><b>${escapeHtml(option.name)}</b><small>${money(option.cost)} ◈ · ${option.build}s</small></span><button data-build-module="${escapeHtml(option.key)}" ${state.ended?'disabled':''}>INICIAR</button></div>`).join(''):'<small>No hay mejoras desbloqueadas disponibles ahora; investigá planos o liberá una línea industrial.</small>';
    $('guardianCount').max=own?.factoryResearch?.includes('node_reserve')?'300':'200';
    const additions=(state.events||[]).filter((event)=>!lastEvents.has(event)).slice(-6);
    for(const event of additions)lastEvents.add(event);
    if(lastEvents.size>1000)lastEvents=new Set((state.events||[]).slice(-100));
    $('combatLog').textContent=(state.events||[]).slice(-20).map((e)=>`${Number(e.t).toFixed(1)}s · ${e.type}${e.player?` · ${e.player}`:''}`).join('\n')||'Partida iniciada.';
    if(state.ended){$('arenaStatus').textContent=state.winner===side?'Victoria':state.winner?'Derrota':'Empate';void refreshLeaderboard().catch(()=>{});}
  }

  function showArena(state) {
    const frame=$('arenaFrame'), viewport=$('arenaViewport');
    if(!frame||!state)return;
    viewport.classList.remove('hidden');
    ['matchSummary','players','actions','retreatGuardians','emergencyShield','guardianCount','moduleControls','combatLog'].forEach((id)=>$(id)?.classList.add('hidden'));
    if(!frame.src||!arenaSource){arenaSource=`/arena.html?online=1&match=${encodeURIComponent(matchId)}`;frame.src=arenaSource;arenaReady=false;}
    if(arenaReady)frame.contentWindow.postMessage({type:'fw-online-state',matchId,side,state},location.origin);
  }

  async function sendArenaAction(action) {
    if(!matchId||!session?.access_token)return;
    try{const response=await api(`/matches/${matchId}/action`,{method:'POST',body:JSON.stringify(action)});if(!response.accepted){toast('Acción no disponible con el estado actual.',true);$('arenaFrame').contentWindow.postMessage({type:'fw-online-action-result',accepted:false},location.origin);}else{renderMatch(response.state);showArena(response.state);}}
    catch(error){toast(error.message,true);$('arenaFrame')?.contentWindow.postMessage({type:'fw-online-action-result',accepted:false,error:error.message},location.origin);}
  }

  async function connectSocket() {
    if(socket?.readyState===WebSocket.OPEN)return;
    const url=new URL('/ws',location.href);url.protocol=location.protocol==='https:'?'wss:':'ws:';
    socket=new WebSocket(url,['factory-wars-v1',`fw-token.${session.access_token}`]);
    socket.onmessage=(event)=>{
      const message=JSON.parse(event.data);
      if(message.type==='queue')$('arenaStatus').textContent='Buscando rival…';
      if(message.type==='match.started'){matchId=message.matchId;side=message.side;socket.send(JSON.stringify({type:'match.join',matchId}));$('arenaStatus').textContent='Partida iniciada';$('queueMatch').disabled=true;renderMatch(message.state);showArena(message.state);}
      if(message.type==='match.state'&&message.matchId===matchId){if(message.side)side=message.side;renderMatch(message.state);showArena(message.state);}
      if(message.type==='match.complete'&&message.matchId===matchId){renderMatch(message.state);showArena(message.state);$('queueMatch').disabled=false;if(message.reward){toast(`Recompensa PvP: +${money(message.reward.credits)} Créditos · +${money(message.reward.intel)} Intel · +${money(message.reward.fragments)} Fragmentos · +${money(message.reward.dominion)} Dominio.`);void api('/me/empire').then((updated)=>{empire=updated.state;revision=updated.revision;renderEmpire();}).catch((error)=>console.warn('Empire refresh after match reward:',error));}else toast('Resultado guardado en el servidor.');}
      if(message.type==='error')toast(message.error,true);
    };
    socket.onopen=()=>{ $('connection').textContent='Servidor conectado'; if(matchId)socket.send(JSON.stringify({type:'match.join',matchId})); };
    socket.onclose=()=>{ if(session) setTimeout(()=>void connectSocket().catch(()=>{}),2000); };
    if(socket.readyState!==WebSocket.OPEN)await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('No se pudo conectar con el servidor online.')),8000);socket.addEventListener('open',()=>{clearTimeout(timer);resolve();},{once:true});socket.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('Falló la conexión con el servidor online.'));},{once:true});});
  }

  function beginQueuePolling() {
    clearInterval(queuePoll);
    queuePoll=setInterval(async()=>{
      try{
        const result=await api('/matches/status');
        const current=result.status;
        if(current?.status==='active'){
          matchId=current.matchId;
          if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:'match.join',matchId}));
          clearInterval(queuePoll);
        }else if(!current){
          clearInterval(queuePoll);$('queueMatch').disabled=false;$('arenaStatus').textContent='Fuera de partida';
        }
      }catch(error){clearInterval(queuePoll);$('queueMatch').disabled=false;toast(error.message,true);}
    },1000);
  }

  async function restoreOnlineState() {
    const response=await api('/matches/status');
    const current=response.status;
    if(!current)return;
    $('queueMatch').disabled=true;
    if(current.status==='active'||current.status==='starting'){
      matchId=current.matchId;side=null;
      $('arenaStatus').textContent='Reconectando a la partida…';
      $('arenaViewport')?.classList.remove('hidden');
      if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:'match.join',matchId}));
      if(current.status==='starting')beginQueuePolling();
      return;
    }
    if(current.status==='queued'){
      matchId=null;side=null;
      $('arenaStatus').textContent='Volviste a la cola…';
      beginQueuePolling();
    }
  }

  window.addEventListener('message',(event)=>{
    if(event.origin!==location.origin||event.source!==$('arenaFrame')?.contentWindow)return;
    const message=event.data||{};
    if(message.type==='fw-online-arena-ready'){arenaReady=true;if(latestMatchState)showArena(latestMatchState);}
    if(message.type==='fw-online-action'&&typeof message.action==='object')void sendArenaAction(message.action);
  });

  async function startQueue() {
    if(!empire.currentCiv) return toast('Elegí una civilización para participar.',true);
    arenaSource='';arenaReady=false;$('arenaViewport')?.classList.add('hidden');
    ['matchSummary','players','actions','retreatGuardians','emergencyShield','guardianCount','moduleControls','combatLog'].forEach((id)=>$(id)?.classList.remove('hidden'));
    await api('/season/join',{method:'POST',body:JSON.stringify({civilization:empire.currentCiv})});
    matchId=null;side=null;lastEvents.clear();
    $('queueMatch').disabled=true;$('arenaStatus').textContent='Buscando rival…';
    if(!socket||socket.readyState!==WebSocket.OPEN)await connectSocket();
    await api('/matches/queue',{method:'POST',body:'{}'});
    beginQueuePolling();
  }

  async function initialize() {
    if(!window.supabase?.createClient||!cfg.SUPABASE_URL||!cfg.SUPABASE_PUBLISHABLE_KEY)throw new Error('Falta configurar Supabase Auth en el servidor.');
    supabase=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
    supabase.auth.onAuthStateChange((event,nextSession)=>{
      if(nextSession)session=nextSession;
      if(event==='PASSWORD_RECOVERY'){
        passwordRecovery=true;
        if(nextSession)user=nextSession.user;
      }
    });
    let result=await supabase.auth.getSession();session=result.data.session;
    if(!session){result=await supabase.auth.signInAnonymously({options:{data:{display_name:'Factory Player'}}});if(result.error)throw result.error;session=result.data.session;}
    user=session.user;$('playerId').textContent=user.id;
    $('accountStatus').textContent=passwordRecovery
      ?'Recuperación iniciada. Escribí tu contraseña nueva y pulsá GUARDAR CONTRASEÑA.'
      :user.is_anonymous
      ?'Cuenta anónima de prueba. Vinculala para recuperar esta fábrica desde otro navegador.'
      :`Cuenta vinculada · ${user.email||'sesión registrada'}. Usá estas credenciales para recuperar tu imperio.`;
    $('accountPassword').autocomplete='new-password';
    $('linkAccount').textContent=user.is_anonymous?'VINCULAR CORREO':'GUARDAR CONTRASEÑA';
    $('linkAccount').onclick=async()=>{
      const email=$('accountEmail').value.trim(),password=$('accountPassword').value;
      if(user.is_anonymous&&!email)return toast('Ingresá el correo que querés vincular.',true);
      if(password.length<6)return toast('Ingresá una contraseña de al menos 6 caracteres.',true);
      const linkingEmail=user.is_anonymous;
      try{
        const result=linkingEmail
          ?await supabase.auth.updateUser({email},{emailRedirectTo:new URL('/online.html',location.origin).href})
          :await supabase.auth.updateUser({password});
        if(result.error)throw result.error;
        user=result.data.user;session=(await supabase.auth.getSession()).data.session;
        if(linkingEmail&&user?.is_anonymous){
          $('accountStatus').textContent='Revisá tu correo y confirmá la dirección. Volvé a esta página con esta misma sesión; después guardá una contraseña para entrar desde otros navegadores.';
          toast('Te enviamos el correo de confirmación.');
        }else if(linkingEmail){
          $('accountEmail').value=user.email||email;
          $('linkAccount').textContent='GUARDAR CONTRASEÑA';
          $('accountStatus').textContent='Correo vinculado. Guardá una contraseña para recuperar esta cuenta desde otros navegadores.';
          toast('Correo vinculado. Ahora guardá una contraseña.');
        }else{
          $('accountEmail').value=user.email||email;
          $('accountStatus').textContent='Contraseña guardada. Tu imperio y tus estadísticas quedan asociados a este correo.';
          toast('Contraseña guardada para esta cuenta.');
        }
      }catch(error){toast(error.message,true);}
    };
    $('signInAccount').onclick=async()=>{
      const email=$('accountEmail').value.trim(),password=$('accountPassword').value;
      if(!email||!password)return toast('Ingresá el correo y la contraseña de tu cuenta.',true);
      if(user.is_anonymous&&!window.confirm('Vas a salir de esta cuenta de prueba y abrir la cuenta guardada con ese correo. Los imperios no se fusionan: el progreso de esta cuenta anónima quedará en su perfil anterior. ¿Continuar?'))return;
      try{const result=await supabase.auth.signInWithPassword({email,password});if(result.error)throw result.error;location.reload();}
      catch(error){toast(error.message,true);}
    };
    $('recoverAccount').onclick=async()=>{
      const email=$('accountEmail').value.trim();
      if(!email)return toast('Ingresá el correo de tu cuenta.',true);
      try{
        const result=await supabase.auth.resetPasswordForEmail(email,{redirectTo:new URL('/online.html',location.origin).href});
        if(result.error)throw result.error;
        $('accountStatus').textContent='Revisá tu correo. El enlace abrirá este portal para que puedas guardar una contraseña nueva.';
        toast('Enviamos el enlace para restablecer la contraseña.');
      }catch(error){toast(error.message,true);}
    };
    const oldSave=cfg.ALLOW_LOCAL_SAVE_IMPORT&&localStorage.getItem('factory-wars-v15-imperios-local');
    if(oldSave){try{await api('/me/empire/import-local-save',{method:'POST',body:JSON.stringify({state:JSON.parse(oldSave)})});}catch(error){if(!error.message.includes('already exists'))console.warn('Save import:',error.message);}}
    const me=await api('/me');empire=me.empire.state;revision=me.empire.revision;
    $('adminAnalytics').classList.toggle('hidden',!me.isAdmin);
    if(me.profile?.nickname&&me.profile.nickname!==empire.nickname)empire.nickname=me.profile.nickname;
    $('connection').textContent='Conectado';$('seasonName').textContent=cfg.SEASON||'Liga online';
    $('seasonStatus').textContent=`Cuenta ${user.is_anonymous?'de prueba anónima':'registrada'} · los datos quedan vinculados a esta sesión.`;
    renderEmpire();
    await refreshLeaderboard();
    await connectSocket();
    $('joinSeason').onclick=async()=>{try{await api('/season/join',{method:'POST',body:JSON.stringify({civilization:empire.currentCiv})});$('seasonStatus').textContent='Estás en la temporada y aparecés en el ranking.';await refreshLeaderboard();toast('Te uniste a la Liga compartida.');}catch(error){toast(error.message,true);}};
    $('chooseCivilization').onclick=()=>command('select-civilization',{civilization:$('civilization').value});
    $('saveNickname').onclick=async()=>{try{const nickname=$('nickname').value.trim();const data=await api('/me/profile',{method:'PATCH',body:JSON.stringify({nickname})});empire.nickname=data.profile.nickname;renderEmpire();toast('Nombre guardado.');}catch(error){toast(error.message,true);}};
    $('startContract').onclick=()=>command('start-contract');
    $('doctrine').addEventListener('change',()=>{$('equipDoctrine').disabled=!$('doctrine').value;});
    $('equipDoctrine').onclick=()=>command('equip-doctrine',{key:$('doctrine').value});
    $('prestige').onclick=()=>command('prestige',{civilization:$('nextCivilization').value});
    $('queueMatch').onclick=()=>void startQueue().catch((error)=>{$('queueMatch').disabled=false;toast(error.message,true);});
    await restoreOnlineState();
    $('refreshLeaderboard').onclick=()=>void refreshLeaderboard().catch((error)=>toast(error.message,true));
    $('actions').addEventListener('click',async(event)=>{const button=event.target.closest('[data-action]');if(!button||!matchId)return;try{const action=button.dataset.action;const payload={action};if(action==='capture')payload.count=Number($('guardianCount').value);const response=await api(`/matches/${matchId}/action`,{method:'POST',body:JSON.stringify(payload)});if(!response.accepted)toast('Acción no disponible con el estado actual.',true);else renderMatch(response.state);}catch(error){toast(error.message,true);}});
    $('moduleControls').addEventListener('click',async(event)=>{const button=event.target.closest('[data-build-module]');if(!button||!matchId)return;try{const response=await api(`/matches/${matchId}/action`,{method:'POST',body:JSON.stringify({action:'module',key:button.dataset.buildModule})});if(!response.accepted)toast('No se puede iniciar esa mejora ahora.',true);else renderMatch(response.state);}catch(error){toast(error.message,true);}});
    document.querySelectorAll('[data-special-action]').forEach((button)=>button.addEventListener('click',async()=>{if(!matchId)return;const action=button.dataset.specialAction;const payload={action};if(action==='retreat')payload.count=Number($('guardianCount').value);try{const response=await api(`/matches/${matchId}/action`,{method:'POST',body:JSON.stringify(payload)});if(!response.accepted)toast('Acción no disponible; verificá investigación, guardianes y recarga.',true);else renderMatch(response.state);}catch(error){toast(error.message,true);}}));
    setInterval(async()=>{try{const update=await api('/me/empire/advance',{method:'POST',body:'{}'});empire=update.state;revision=update.revision;renderEmpire();if(update.events?.length)for(const e of update.events)if(e.eventType==='contract_complete')toast(`Contrato: +${e.payload.credits} Créditos y +${e.payload.intel} Intel.`);}catch(error){console.warn(error);}},15000);
    $('refreshAnalytics').onclick=async()=>{try{const data=await api('/analytics/summary'),p=data.myPerformance;$('analyticsSummary').textContent=`${p.games} partidas · ${p.wins}V/${p.draws}E/${p.losses}D · espera media ${p.average_queue_wait_seconds}s · daño medio ${p.average_damage} · control ${p.average_territory_seconds}s · ${p.average_decisions} decisiones y ${p.average_invalid_inputs} inválidas por partida · duración general ${data.matches.average_duration}s · ${data.arenaEvents.length} tipos de evento.`;}catch(error){toast(error.message,true);}};
    $('exportTelemetry').onclick=async()=>{
      try{
        const query=new URLSearchParams({limit:'500'}),matches=[],economyEvents=[];
        let firstPage=null,hasMoreMatches=true,hasMoreEconomyEvents=true;
        while(hasMoreMatches||hasMoreEconomyEvents){
          const page=await api(`/analytics/export?${query.toString()}`);
          firstPage||=page;matches.push(...page.matches);economyEvents.push(...page.economyEvents);
          if(page.next.exportAsOf)query.set('exportAsOf',page.next.exportAsOf);
          hasMoreMatches=page.hasMoreMatches;hasMoreEconomyEvents=page.hasMoreEconomyEvents;
          if(page.next.matchesBefore){query.set('matchesBefore',page.next.matchesBefore);query.set('matchesBeforeId',page.next.matchesBeforeId);}
          if(page.next.economyBefore)query.set('economyBefore',page.next.economyBefore);
        }
        const data={exportFormatVersion:firstPage.exportFormatVersion,exportedAt:firstPage.exportedAt,seasonId:firstPage.seasonId,ownEmpire:firstPage.ownEmpire,matches,economyEvents};
        const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),link=document.createElement('a');
        link.href=URL.createObjectURL(blob);link.download=`factory-wars-${data.seasonId}-telemetry-${Date.now()}.json`;link.click();
        setTimeout(()=>URL.revokeObjectURL(link.href),1000);toast('Telemetría completa descargada.');
      }catch(error){toast(error.message,true);}
    };
    $('exportSeasonTelemetry').onclick=async()=>{
      const button=$('exportSeasonTelemetry');button.disabled=true;
      try{
        const query=new URLSearchParams({limit:'100'}),matches=[],economyEvents=[];
        let firstPage=null,hasMoreMatches=true,hasMoreEconomyEvents=true;
        while(hasMoreMatches||hasMoreEconomyEvents){
          const page=await api(`/analytics/admin/export?${query.toString()}`);
          firstPage||=page;matches.push(...page.matches);economyEvents.push(...page.economyEvents);
          hasMoreMatches=page.hasMoreMatches;hasMoreEconomyEvents=page.hasMoreEconomyEvents;
          if(page.next.matchesBefore){query.set('matchesBefore',page.next.matchesBefore);query.set('matchesBeforeId',page.next.matchesBeforeId);}
          if(page.next.economyBefore)query.set('economyBefore',page.next.economyBefore);
          if(page.next.exportAsOf)query.set('exportAsOf',page.next.exportAsOf);
          button.textContent=`DESCARGANDO · ${matches.length} partidas · ${economyEvents.length} eventos`;
        }
        const data={exportFormatVersion:firstPage.exportFormatVersion,exportedAt:firstPage.exportedAt,seasonId:firstPage.seasonId,profiles:firstPage.profiles,seasonPlayers:firstPage.seasonPlayers,matches,economyEvents};
        const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),link=document.createElement('a');
        link.href=URL.createObjectURL(blob);link.download=`factory-wars-${data.seasonId}-all-telemetry-${Date.now()}.json`;link.click();
        setTimeout(()=>URL.revokeObjectURL(link.href),1000);toast('Datos de toda la temporada descargados.');
      }catch(error){toast(error.message,true);}
      finally{button.disabled=false;button.textContent='DESCARGAR DATOS DE TODA LA TEMPORADA';}
    };
  }
  initialize().catch((error)=>{$('connection').textContent='Sin conexión';$('connection').style.color='#ff9f9b';toast(error.message,true);});
})();
