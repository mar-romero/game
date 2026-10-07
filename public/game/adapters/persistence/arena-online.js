(() => {
  'use strict';
  const cfg = window.FACTORY_WARS_CONFIG || {};
  const state = { client:null, user:null, profile:null, ready:false, syncing:false };
  const $id = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const configured = () => Boolean(cfg.ONLINE_ENABLED && cfg.SUPABASE_URL && cfg.SUPABASE_PUBLISHABLE_KEY && window.supabase?.createClient);

  function injectUI(){
    const host = document.querySelector('.top') || document.querySelector('.shell');
    if(!host || $id('fwOnlineCard')) return;
    const box=document.createElement('section');
    box.id='fwOnlineCard';
    box.style.cssText='width:100%;margin-top:4px;padding:12px 14px;border:1px solid #34536a;border-radius:12px;background:#0b1724;display:grid;gap:9px';
    box.innerHTML=`<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><div><b style="font-size:12px">ONLINE BETA</b><div id="fwOnlineStatus" style="font-size:10px;color:#9fb7c6;margin-top:2px">Inicializando…</div></div><button id="fwLeaderboardBtn" class="btn-secondary" type="button">RANKING</button></div><div style="display:flex;gap:7px;flex-wrap:wrap;align-items:center"><input id="fwNickname" maxlength="20" placeholder="Tu nickname" style="min-height:38px;flex:1;min-width:170px;background:#14263a;color:#fff;border:1px solid #3d5b70;border-radius:8px;padding:8px 10px;font-size:16px"><button id="fwSaveNick" class="btn-secondary" type="button">GUARDAR NOMBRE</button></div><div id="fwLeaderboard" class="hidden" style="font-size:10px;overflow:auto;max-height:280px"></div>`;
    host.appendChild(box);
    $id('fwSaveNick').addEventListener('click', saveNickname);
    $id('fwLeaderboardBtn').addEventListener('click', async()=>{const el=$id('fwLeaderboard');el.classList.toggle('hidden');if(!el.classList.contains('hidden'))await loadLeaderboard();});
  }
  function status(msg, bad=false){const el=$id('fwOnlineStatus');if(el){el.textContent=msg;el.style.color=bad?'#ffad9f':'#9fdccf';}}
  function defaultNick(uid){return 'Factory-'+String(uid||'PLAYER').replace(/-/g,'').slice(0,6).toUpperCase();}

  async function init(){
    injectUI();
    if(!configured()){status('Modo local. Configurá game/adapters/web/config.js para activar base de datos y ranking.');return;}
    try{
      state.client=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
      let {data:{session}}=await state.client.auth.getSession();
      if(!session){const {data,error}=await state.client.auth.signInAnonymously();if(error)throw error;session=data.session;}
      state.user=session.user;
      await ensureProfile();
      const empireCiv=localStorage.getItem('factory-wars-v15-current-civ')||state.profile?.current_civ||null;
      const profUpdate=await state.client.from('profiles').update({season:cfg.SEASON||'BETA-IMPERIOS-01',current_civ:empireCiv,updated_at:new Date().toISOString()}).eq('user_id',state.user.id).select().single();
      if(!profUpdate.error){state.profile=profUpdate.data;lockCivilization();}
      state.ready=true;
      status(`Conectado · ${state.profile?.nickname||'tester'} · ${cfg.SEASON||'BETA'}`);
      if($id('fwNickname'))$id('fwNickname').value=state.profile?.nickname||'';
      await syncLocalRecords();
    }catch(err){console.error('Factory Wars online init',err);status('No se pudo conectar. El juego sigue guardando localmente. '+(err.message||''),true);}
  }
  async function ensureProfile(){
    const uid=state.user.id;
    let {data,error}=await state.client.from('profiles').select('*').eq('user_id',uid).maybeSingle();
    if(error)throw error;
    if(!data){
      const nickname=defaultNick(uid);
      const selected=localStorage.getItem('factory-wars-v15-current-civ')||null; const ins=await state.client.from('profiles').insert({user_id:uid,nickname,season:cfg.SEASON||'BETA-IMPERIOS-01',current_civ:selected}).select().single();
      if(ins.error)throw ins.error;data=ins.data;
    }
    state.profile=data;
    lockCivilization();
  }
  function lockCivilization(){
    const civ=state.profile?.current_civ||localStorage.getItem('factory-wars-v15-current-civ');
    const sel=document.getElementById('civA');
    if(civ && sel){sel.value=civ; sel.disabled=true; sel.title='Civilización fijada por tu Imperio. Para cambiarla: Prestigio 100%.';}
  }
  async function saveNickname(){
    if(!state.ready){status('Primero activá/conectá Supabase.',true);return;}
    const input=$id('fwNickname');const nickname=(input?.value||'').trim();
    if(!/^[A-Za-z0-9_\-ÁÉÍÓÚÜÑáéíóúüñ ]{3,20}$/.test(nickname)){status('Nickname: 3–20 caracteres; letras, números, espacio, _ o -.',true);return;}
    const {data,error}=await state.client.from('profiles').update({nickname}).eq('user_id',state.user.id).select().single();
    if(error){status(error.code==='23505'?'Ese nickname ya existe.':'No pude guardar el nickname: '+error.message,true);return;}
    state.profile=data;status(`Conectado · ${nickname} · ${cfg.SEASON||'BETA'}`);
  }
  function normalize(rec){
    const o=rec.objective||{};
    return {
      id:String(rec.id),user_id:state.user.id,season:cfg.SEASON||'BETA-01',version:rec.version||'1.5-arena',played_at:rec.ts||new Date().toISOString(),
      result:o.result||null,duration:o.duration??null,civ:o.civ||null,opponent:o.opponent||null,invalid_rate:o.invalidRate??null,inputs:o.inputs??null,tactical:o.tactical??null,commitments:o.commitments??null,max_threats:o.maxThreats??null,territory_delta:o.territoryDelta??null,lead_changes:o.leadChanges??null,comeback:o.comeback??null,counterplay:o.counterplay??null,build:o.build||null,military_spend:o.militarySpend??null,defensive_spend:o.defensiveSpend??null,economic_spend:o.economicSpend??null,shield_waste:o.shieldWaste??null,peak_bank:o.peakBank??null,rematch:rec.rematch??null,survey:rec.survey||null,objective:o
    };
  }
  async function syncRecord(rec){
    if(!state.ready||!rec?.id||rec.localRewardManaged)return;
    try{
      const {error}=await state.client.from('matches').upsert(normalize(rec),{onConflict:'id'});if(error)throw error;
      const claim=rec.localRewardManaged?null:await state.client.rpc('claim_match_reward',{p_match_id:String(rec.id)});
      if(claim&&!claim.error && claim.data?.claimed){
        try{window.parent?.postMessage({type:'factory-wars-match-synced',reward:claim.data.reward||{}},'*');}catch(_){}
      }
    } catch(err){console.warn('sync match failed',err);}
  }
  async function syncLocalRecords(){
    if(state.syncing)return;state.syncing=true;
    try{const rows=typeof v14LoadPX==='function'?v14LoadPX():[];for(const r of rows)await syncRecord(r);status(`Conectado · ${state.profile?.nickname||'tester'} · ${rows.length} partida(s) sincronizada(s)`);}finally{state.syncing=false;}
  }
  async function loadLeaderboard(){
    const el=$id('fwLeaderboard');if(!el)return;
    if(!state.ready){el.innerHTML='<p>Ranking online desactivado.</p>';return;}
    el.innerHTML='Cargando…';
    const {data,error}=await state.client.from('leaderboard').select('*').eq('season',cfg.SEASON||'BETA-01').order('rating',{ascending:false}).limit(50);
    if(error){el.textContent='Error: '+error.message;return;}
    el.innerHTML=`<table style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:left">#</th><th style="text-align:left">Jugador</th><th>Rating*</th><th>Top10</th><th>W</th><th>J</th></tr></thead><tbody>${(data||[]).map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.nickname)}</td><td style="text-align:right">${Number(r.rating||0).toFixed(0)}</td><td style="text-align:right">${Number(r.top10_score||0).toFixed(0)}</td><td style="text-align:right">${r.wins||0}</td><td style="text-align:right">${r.games||0}</td></tr>`).join('')}</tbody></table><p style="color:#8fa8b5">*Ranking de beta no verificado: sirve para testing. Antes de premios debe validarse el motor en servidor.</p>`;
  }

  // Hook no destructivo: el juego sigue usando localStorage y además sincroniza cuando hay backend.
  const hook=()=>{
    if(typeof v14UpsertPX==='function'){
      const baseUpsert=v14UpsertPX;v14UpsertPX=function(rec){baseUpsert(rec);setTimeout(()=>syncRecord(rec),0);};
    }
    if(typeof v14UpdatePX==='function'){
      const baseUpdate=v14UpdatePX;v14UpdatePX=function(id,patch){baseUpdate(id,patch);setTimeout(()=>{const row=(typeof v14LoadPX==='function'?v14LoadPX():[]).find(x=>x.id===id);if(row)syncRecord(row);},0);};
    }
  };
  hook();
  window.FactoryWarsOnline={state,syncLocalRecords,loadLeaderboard};
  init();
})();
