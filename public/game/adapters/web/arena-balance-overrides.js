"use strict";

/* ==============================================================
   V1.5.2 · ONE GLANCE
   Corrige counters, defensa predictiva, ventanas de greed y cierre.
================================================================ */
GAME_CONFIG.economicLevels=[9,15,23,34];
GAME_CONFIG.economicUpgradeCosts=[0,170,390,780];
GAME_CONFIG.defenseCosts.small=100;
GAME_CONFIG.defenseCosts.large=220;
GAME_CONFIG.defenseCapacity.small=120;
GAME_CONFIG.defenseCapacity.large=280;
GAME_CONFIG.maxShield=420;
Object.assign(GAME_CONFIG.production,{
  ecoDurations:[0,9.5,12.0,15.0],
  closureStart:195,
  closureMilitaryTempoMax:.24,
  closureShieldDurationMin:.72
});
Object.assign(CIVILIZATIONS.bastion,{summary:"Escudos +14% · mejoras económicas +6% costo",ecoCost:1.06,defenseHP:1.14});
Object.assign(CIVILIZATIONS.nexus,{summary:"Sabotaje -26% · ataques +4% costo",attackCost:1.04,sabotageCost:.74});
const CIV_MASTERY_BASE=Object.fromEntries(Object.entries(CIVILIZATIONS).map(([id,civ])=>[id,{ecoCost:civ.ecoCost,attackCost:civ.attackCost,defenseCost:civ.defenseCost,defenseHP:civ.defenseHP,sabotageCost:civ.sabotageCost}]));
function readPersistedCivMastery(civ){try{const state=JSON.parse(localStorage.getItem('factory-wars-v15-imperios-local')||'{}');return Math.min(10,Number(state.civ_legacies?.[civ]||state.civLegacies?.[civ]||0)+Number(state.loyalty?.[civ]||0));}catch{return 0;}}
const __v131Civ=Match.prototype.civ;
Match.prototype.civ=function(p){const values={...__v131Civ.call(this,p)},base=CIV_MASTERY_BASE[p.civ],step=Math.min(10,Math.max(0,Number(p.civMasteryLevel)||0))*.005;if(!base)return values;switch(p.civ){case'forge':values.ecoCost=Math.max(.75,base.ecoCost-step);break;case'bastion':values.defenseHP=Math.min(1.24,base.defenseHP+step);break;case'swarm':values.attackCost=Math.max(.70,base.attackCost-step);break;case'nexus':values.sabotageCost=Math.max(.60,base.sabotageCost-step);break;}return values;};

function v131Closure(m){return clamp((m.t-GAME_CONFIG.production.closureStart)/Math.max(1,GAME_CONFIG.matchDuration-GAME_CONFIG.production.closureStart),0,1);}
function v131JobSlots(j){return j&&j.action==='eco'?2:1;}
v13LineOccupancy=function(p){return (p.prodJobs||[]).filter(j=>j.status==='active').reduce((n,j)=>n+v131JobSlots(j),0)+(p.moduleBuild?1:0);};
v13StartJobs=function(m,p){let free=v13ProductionCapacity(p)-v13LineOccupancy(p);if(free<=0)return;for(const j of p.prodJobs){if(j.status!=='queued')continue;const need=v131JobSlots(j);if(need>free)continue;j.status='active';j.startedAt=m.t;j.finish=m.t+v13JobEta(m,p,j);m.log('production_start',p,{action:j.action,family:j.family,label:v13Label(j.action),estimate:round(j.finish),lanes:need});free-=need;if(free<=0)break;}};
function v131CoreVulnerability(p,m){const eco=(p.prodJobs||[]).some(j=>j.action==='eco'&&j.status==='active')?1.12:1;return eco*(1+v131Closure(m)*.20);}
function v131ShieldDuration(m){const C=GAME_CONFIG.production,k=v131Closure(m);return GAME_CONFIG.shieldDuration*(1-k*(1-C.closureShieldDurationMin));}
const __v131JobSpeed=v13JobSpeed;
v13JobSpeed=function(m,p,j){let sp=__v131JobSpeed(m,p,j);const family=(j.family||v13JobFamily(j.action)),ecoActive=(p.prodJobs||[]).some(x=>x.action==='eco'&&x.status==='active');if(family==='military')sp*=1+v131Closure(m)*GAME_CONFIG.production.closureMilitaryTempoMax;if(ecoActive&&j.action!=='eco'){if(family==='defense')sp*=.68;else if(family==='military')sp*=.82;else if(family==='control')sp*=.86;}return sp;};

// Todos los caminos de simulación arrancan con el mismo estado que la arena jugable.
const __v131CreatePlayer=Match.prototype.createPlayer;
Match.prototype.createPlayer=function(id,civ,bot){const p=__v131CreatePlayer.call(this,id,civ,bot);p.factoryProgress=this.settings.mode==='human'?(this.settings.factoryProgress?.[id]||(id==='A'?window.__fwLeagueMatch?.factoryProgress:null)||null):null;p.civMasteryLevel=this.settings.mode==='human'?(p.factoryProgress?.civMastery??(id==='A'?readPersistedCivMastery(civ):0)):0;p.factory=true;const profile=this.settings.enableSimulationFactoryLink?this.settings.simulationFactoryProfiles?.[id]:null;p.simulationFactoryProfile=profile||null;const buildingKeys=['generator','refinery','lab','automation'];const upgradedLevels=profile?Math.max(0,buildingKeys.reduce((total,key)=>total+Math.max(1,Number(profile.buildings?.[key])||1),0)-buildingKeys.length):0;p.simulationFactoryReservePct=Math.min(.12,upgradedLevels*.005);p.bank=Math.round(Math.max(p.bank,300)*(1+p.simulationFactoryReservePct));p.simulationFactoryStartingBank=p.bank;p.nextThink=.75;if(!p.tiles.includes('fabricator')){const idx=PICK_ORDER.find(k=>p.tiles[k]===null);if(idx!==undefined)p.tiles[idx]='fabricator';}p.telemetry.botActions=0;p.telemetry.tacticalDecisions=p.telemetry.validDecisions||0;p.telemetry.strategicCommitments=p.telemetry.majorDecisions||0;return p;};

function v131PendingShield(m,p){let total=m.shield(p),layers=p.shields.length;for(const j of (p.prodJobs||[])){if(j.family!=='defense'||j.status==='done')continue;const size=j.action==='defLarge'?'large':'small',base=Math.round(GAME_CONFIG.defenseCapacity[size]*m.civ(p).defenseHP*(hasModule(p,'shield2')?1.15:1)),stack=[1,.65,.35][Math.min(2,layers)]||.35;total+=Math.round(base*stack);layers++;}return Math.min(GAME_CONFIG.maxShield,total);}
function v131IncomingShieldDemand(m,p){return m.incoming(p).reduce((sum,x)=>{const attacker=m.players.find(q=>q.id===x.from),breaker=x.size==='large'?(GAME_CONFIG.production.heavyShieldBreaker*(attacker&&hasModule(attacker,'armory3_siege')?1.15:1)):1;return sum+x.damage*breaker;},0);}
function v131SabotageValue(m,target){let score=0;for(const j of (target.prodJobs||[])){if(j.status!=='active')continue;if(j.action==='eco')score+=4;else if(j.action==='large')score+=3.5;else if(j.family==='military')score+=2;else if(j.family==='control')score+=1.2;}if(target.moduleBuild)score+=2.5;if(target.level>=3)score+=.6;if(m.owner===target.id)score+=.5;return score;}
function v131RecentEcoCommit(m,p,window=15){return m.events.some(e=>e.player===p.id&&(e.type==='econ_construction'||(e.type==='production_order'&&e.action==='eco'))&&m.t-e.t<window);}
const __v131Income=Match.prototype.income;
Match.prototype.income=function(p){let n=__v131Income.call(this,p);if((p.prodJobs||[]).some(j=>j.action==='eco'&&j.status==='active'))n*=.90;return n;};
function v131RecordBot(p,m,action){if(!p.bot)return;p.telemetry.inputs++;p.telemetry.botActions=(p.telemetry.botActions||0)+1;const major=['eco','large','capture'].includes(action),now=m.t,T=GAME_CONFIG.production.decisionGroupSeconds;if(major||now-p.telemetry.lastDecisionAt>=T){p.telemetry.validDecisions++;p.telemetry.tacticalDecisions=p.telemetry.validDecisions;p.telemetry.lastDecisionAt=now;p.telemetry.decisionGroups.push(round(now,1));if(major){p.telemetry.majorDecisions++;p.telemetry.strategicCommitments=p.telemetry.majorDecisions;}}}
const __v131Act=Match.prototype.act;
Match.prototype.act=function(p,action,cell){const ok=__v131Act.call(this,p,action,cell);if(ok&&p.bot)v131RecordBot(p,this,action);return ok;};
const __v131StartModule=Match.prototype.startModule;
Match.prototype.startModule=function(p,key){const ok=__v131StartModule.call(this,p,key);if(ok&&p.bot){p.telemetry.inputs++;p.telemetry.botActions=(p.telemetry.botActions||0)+1;p.telemetry.validDecisions++;p.telemetry.tacticalDecisions=p.telemetry.validDecisions;p.telemetry.majorDecisions++;p.telemetry.strategicCommitments=p.telemetry.majorDecisions;p.telemetry.lastDecisionAt=this.t;p.telemetry.decisionGroups.push(round(this.t,1));}return ok;};

Match.prototype.readIntent=function(p){const rec=this.events.filter(e=>e.player===p.id&&this.t-e.t<=24&&e.type!=='state_sample'),prep=rec.filter(e=>e.type==='production_order'),econ=rec.filter(e=>e.type==='econ_construction'||(e.type==='production_order'&&e.action==='eco')).length,off=prep.filter(e=>e.family==='military').length,def=prep.filter(e=>e.family==='defense').length,ctrl=prep.filter(e=>e.family==='control').length;if(off>Math.max(econ,def,ctrl))return 'preparación militar';if(def>Math.max(econ,off,ctrl))return 'postura defensiva';if(ctrl>Math.max(econ,off,def))return 'operaciones de control';if(econ>0)return 'expansión económica en obra';return 'intención poco clara';};

Match.prototype.botDecision=function(p){
 const C=GAME_CONFIG,o=this.other(p),t=this.t,remain=C.matchDuration-t,strat=p.bot,can=a=>this.can(p,a),buy=a=>this.act(p,a);
 const simulationTuning=this.settings.simulationBotTuning?.[strat]||{};
 if(this.settings.training&&p.id==='B'&&(this.tutorialStep<3||t<45)){if(t>12&&p.level===1&&can('eco'))buy('eco');return;}
 const demand=v131IncomingShieldDemand(this,p),projected=v131PendingShield(this,p),uncovered=Math.max(0,demand-projected);
 // Evolución: evita abrir una obra si ambas líneas ya están comprometidas.
 if(!p.moduleBuild&&moduleUsed(p)<industrialCap(p)&&v13LineOccupancy(p)<v13ProductionCapacity(p)){
  const pref={GREEDY:['refinery2','control2','shield2'],RUSHER:['armory2','armory3_siege','control2'],TURTLE:['shield2','refinery2','shield3_reactive'],TEMPO:['armory2','control2','armory3_salvo'],ADAPTIVE:['control2','armory2','shield2','refinery2'],BALANCED:['armory2','refinery2','control2','shield2'],HOARDER:['refinery2','shield2','control2'],SABOTEUR:['control2','control3_interference','refinery2'],RANDOM:Object.keys(INDUSTRIAL_MODULES)}[strat]||['armory2','refinery2','shield2','control2'];
  for(const k of pref){if(this.canModule(p,k)&&this.rand()<.38){this.startModule(p,k);return;}}
 }
 // Defensa predictiva: cuenta escudos activos + escudos ya encargados. Evita spam defensivo.
 const defenseThreshold=(strat==='GREEDY'&&t<55)?105:(strat==='HOARDER'&&t<50)?125:45;
 if(uncovered>defenseThreshold){if(uncovered>175&&can('defLarge')){buy('defLarge');return;}if(can('defSmall')){buy('defSmall');return;}}
 const enemyMilitary=(o.prodJobs||[]).some(j=>j.family==='military'&&j.status==='active'),saboValue=v131SabotageValue(this,o);
 if(enemyMilitary&&saboValue>=2&&can('sabotage')&&this.rand()<.45){buy('sabotage');return;}
 const smallEff=can('small')?v13AttackEfficiency(this,p,'small'):-1,largeEff=can('large')?v13AttackEfficiency(this,p,'large'):-1,bestEff=Math.max(smallEff,largeEff),shielded=this.shield(o)>185;
 const ecoPayback=()=>{if(p.level>=4)return Infinity;const inc=C.economicLevels[p.level]-C.economicLevels[p.level-1];return this.cost(p,'eco')/Math.max(1,inc);},grow=fac=>can('eco')&&remain>ecoPayback()*fac;
 const control=()=>{if(can('capture')&&this.owner!==p.id&&remain>22){buy('capture');return true;}return false;};
 const minimumAttackEfficiency=simulationTuning.minimumAttackEfficiency??.255,shieldAttackEfficiency=simulationTuning.shieldAttackEfficiency??.30,smallAttackEfficiency=simulationTuning.smallAttackEfficiency??.22;
 const attack=()=>{if(bestEff<shieldAttackEfficiency&&shielded)return false;if(largeEff>=smallEff&&largeEff>minimumAttackEfficiency&&buy('large'))return true;if(smallEff>smallAttackEfficiency&&buy('small'))return true;return false;};
 const ecoWindow=v131RecentEcoCommit(this,o,16),enemyEcoActive=(o.prodJobs||[]).some(j=>j.action==='eco'&&j.status==='active');
 if(strat==='RUSHER'){const stalled=p.stats.militarySpend>430&&p.stats.damageDealt<150,economyAfter=simulationTuning.economyAfter??42,growthFactor=simulationTuning.growthFactor??1.7;if(ecoWindow){if(can('small')){buy('small');return;}if(can('large')){buy('large');return;}}if((stalled||t>economyAfter)&&p.level<3&&grow(stalled?1.45:growthFactor)&&v13LineOccupancy(p)<2){buy('eco');return;}if(shielded){if(control())return;if(saboValue>=1.5&&can('sabotage')){buy('sabotage');return;}}if(attack())return;if(control())return;return;}
 if(strat==='GREEDY'){const growthFactor=simulationTuning.growthFactor??1.62,economyUntil=simulationTuning.economyUntil??145,attackAfter=simulationTuning.attackAfter??98;if(grow(growthFactor)&&t<economyUntil&&v13LineOccupancy(p)<2){buy('eco');return;}if(this.owner!==p.id&&t>58&&control())return;if(t>attackAfter&&attack())return;if(saboValue>=2.5&&can('sabotage')){buy('sabotage');return;}return;}
 if(strat==='HOARDER'){if(grow(1.9)&&p.level<3&&t<105&&v13LineOccupancy(p)<2){buy('eco');return;}if(p.bank<850&&t<155){if(this.owner!==p.id&&t>72&&control())return;return;}if(control())return;if(attack())return;return;}
 if(strat==='TURTLE'){if(grow(1.92)&&t<125&&v13LineOccupancy(p)<2){buy('eco');return;}if(this.owner!==p.id&&control())return;if(saboValue>=2.5&&can('sabotage')){buy('sabotage');return;}if(t>112&&attack())return;return;}
 if(strat==='SABOTEUR'){if(saboValue>=1.8&&can('sabotage')){buy('sabotage');return;}if(enemyEcoActive&&can('sabotage')){buy('sabotage');return;}if(control())return;if(grow(1.85)&&t<128&&v13LineOccupancy(p)<2){buy('eco');return;}if(t>105)attack();return;}
 if(strat==='TEMPO'){if(ecoWindow){if(can('small')){buy('small');return;}if(enemyEcoActive&&can('sabotage')){buy('sabotage');return;}if(attack())return;}if(this.owner===o.id&&control())return;if(grow(1.95)&&t<142&&p.level<3&&v13LineOccupancy(p)<2){buy('eco');return;}if(shielded&&control())return;if(attack())return;if(control())return;return;}
 if(strat==='ADAPTIVE'){if(ecoWindow&&can('small')){buy('small');return;}if(enemyEcoActive&&can('sabotage')&&saboValue>=1){buy('sabotage');return;}if(ecoWindow&&can('small')){buy('small');return;}if(ecoWindow&&attack())return;if(this.owner===o.id&&control())return;if(grow(1.9)&&t<140&&p.level<3&&v13LineOccupancy(p)<2){buy('eco');return;}if(shielded&&control())return;if(attack())return;if(control())return;return;}
 if(strat==='RANDOM'){const ops=['eco','small','large','defSmall','capture','sabotage'].filter(can),actionProbability=simulationTuning.actionProbability??.68;if(ops.length&&this.rand()<actionProbability){const weights=ops.map(action=>Math.max(0,simulationTuning.actionWeights?.[action]??1)),totalWeight=weights.reduce((sum,weight)=>sum+weight,0);let roll=this.rand()*totalWeight;for(let index=0;index<ops.length;index++){roll-=weights[index];if(roll<=0){buy(ops[index]);break;}}}return;}
 // BALANCED
 if(ecoWindow&&attack())return;if(this.owner===o.id&&control())return;if(grow(1.9)&&t<138&&p.level<3&&v13LineOccupancy(p)<2){buy('eco');return;}if(shielded&&control())return;if(attack())return;if(control())return;if(saboValue>=2&&can('sabotage'))buy('sabotage');
};

// Simulación justa: los bots no reciben prioridad fija por estar en A o B.
// Ejecutamos el tick físico sin IA y luego alternamos el orden de decisión cuando ambos bots están listos.
const __v131PhysicalStep=Match.prototype.step;
Match.prototype.step=function(dt,withBots=true){__v131PhysicalStep.call(this,dt,false);if(this.ended||!withBots)return;const order=this.rand()<.5?[this.players[0],this.players[1]]:[this.players[1],this.players[0]];for(const p of order){if(p.bot&&this.t>=p.nextThink){p.nextThink=this.t+GAME_CONFIG.botThinkInterval*(.78+this.rand()*.49);this.botDecision(p);if(this.ended)break;}}};

// Recibir daño durante una expansión retrasa la obra económica: greed tiene una ventana real de castigo.
const __v131ResolveTrip=Match.prototype.resolveTrip;
Match.prototype.resolveTrip=function(x){const target=x.kind==='attack'?this.players.find(q=>q.id===x.to):null,before=target?target.hp:null;__v131ResolveTrip.call(this,x);if(target&&before!==null&&target.hp<before){const eco=(target.prodJobs||[]).find(j=>j.action==='eco'&&j.status==='active');if(eco){const lost=Math.min(1.6,eco.progress);eco.progress=Math.max(0,eco.progress-lost);this.log('econ_disrupted',target,{lostProgress:round(lost,1),reason:'core_hit'});}}};

// Balance Lab: usa el estado inicial real y permite muestras mayores.
GAME_CONFIG.batchMatches=1000;
/* FACTORY_WARS_HEADLESS_RULES_END */
runBatch=function(){if(settings.mode!=='bots')return;const btn=$('batchBtn'),countEl=$('batchCount'),N=clamp(Number(countEl?.value||1000),100,5000);btn.disabled=true;btn.textContent='SIMULANDO...';$('batchResults').innerHTML=`<small>Corriendo ${N.toLocaleString('es-AR')} partidas headless con el mismo estado inicial de la arena...</small>`;
 setTimeout(()=>{try{const results=[],startSeed=(Date.now()>>>0);for(let i=0;i<N;i++){const sim=new Match(settings,(startSeed+i*104729)>>>0);while(!sim.ended)sim.step(.5,true);results.push({winner:sim.winner,duration:sim.t,reason:sim.endReason,players:sim.players.map(p=>({hp:p.hp,level:p.level,income:sim.income(p),firstAttack:p.stats.firstAttack,stats:p.stats,telemetry:p.telemetry}))});}
 const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0,wA=results.filter(r=>r.winner==='A').length,wB=results.filter(r=>r.winner==='B').length,draws=N-wA-wB,timeouts=results.filter(r=>String(r.reason||'').startsWith('Tiempo agotado')).length,rateA=wA/N*100,rateB=wB/N*100,extreme=Math.max(rateA,rateB)>=65,timeoutBad=timeouts/N>=.30,meanDur=mean(results.map(r=>r.duration));batchData={settings:{...settings},version:'1.3.1',matches:N,startSeed,winsA:wA,winsB:wB,draws,timeouts,meanDuration:meanDur,results};
 $('batchResults').innerHTML=`<table><tbody><tr><th>${N.toLocaleString('es-AR')} partidas</th><th>BOT A</th><th>BOT B</th></tr><tr><td>Victorias</td><td>${wA} (${rateA.toFixed(1)}%)</td><td>${wB} (${rateB.toFixed(1)}%)</td></tr><tr><td>HP final medio</td><td>${Math.round(mean(results.map(r=>r.players[0].hp)))}</td><td>${Math.round(mean(results.map(r=>r.players[1].hp)))}</td></tr><tr><td>Gasto defensa medio</td><td>${Math.round(mean(results.map(r=>r.players[0].stats.defensiveSpend)))}</td><td>${Math.round(mean(results.map(r=>r.players[1].stats.defensiveSpend)))}</td></tr><tr><td>Desperdicio escudo</td><td>${Math.round(mean(results.map(r=>r.players[0].stats.shieldStackLoss||0)))}</td><td>${Math.round(mean(results.map(r=>r.players[1].stats.shieldStackLoss||0)))}</td></tr></tbody></table><p class="batch-note">Duración media ${fmtTime(meanDur)} · Timeouts ${timeouts} (${(timeouts/N*100).toFixed(1)}%) · Empates ${draws}. ${extreme?'⚠ Matchup extremo (>65/35).':'✓ Sin alerta 65/35.'} ${timeoutBad?'⚠ Demasiados timeouts.':'✓ Tasa de timeout aceptable.'}</p>`;
 }catch(err){$('batchResults').textContent='Error en la simulación: '+err.message;console.error(err);}finally{btn.disabled=false;btn.textContent='SIMULAR MATCHUP';}},20);
};

// La lectura postpartida distingue inputs, decisiones agrupadas y commitments.
const __v131ShowEnd=showEnd;
showEnd=function(){__v131ShowEnd();if(!match)return;const [a,b]=match.players,tbody=$('endPanel')?.querySelector('tbody');if(tbody){const row=(n,x,y)=>{const tr=document.createElement('tr');tr.innerHTML=`<td>${n}</td><td>${x}</td><td>${y}</td>`;tbody.appendChild(tr);};row('Inputs / órdenes',a.telemetry.inputs,b.telemetry.inputs);row('Commitments estratégicos',a.telemetry.majorDecisions,b.telemetry.majorDecisions);row('Defensa desperdiciada',Math.round(a.stats.shieldStackLoss||0),Math.round(b.stats.shieldStackLoss||0));row('Fase de cierre alcanzada',match.t>=GAME_CONFIG.production.closureStart?'Sí':'No',match.t>=GAME_CONFIG.production.closureStart?'Sí':'No');}}

// Copys de la nueva defensa y del cierre. Se ejecuta después del populate base.
const __v131Populate=populate;
populate=function(){__v131Populate();const copy={defSmall:'120 absorción · 1,4 s carga',defLarge:'280 absorción · 3,3 s carga'};for(const [a,t] of Object.entries(copy)){const q=document.querySelector(`.quickcmd[data-quick="${a}"] .cmd-copy small`);if(q)q.textContent=t;}const lab=$('decisionLab')?.querySelector('.lab-note');if(lab)lab.textContent='Acción ≠ decisión. Los clicks cercanos se agrupan; las mejoras, pesados y capturas cuentan además como commitments estratégicos.';};

const __v131Render=render;
render=function(){__v131Render();if(!match)return;const k=v131Closure(match),exp=$('actionExplainer'),A=match.players[0],ecoActive=(A.prodJobs||[]).some(j=>j.action==='eco'&&j.status==='active');if(exp&&k>0){exp.textContent=`⚠ FASE DE CIERRE ${Math.round(k*100)}%: la fabricación militar acelera gradualmente y los nuevos escudos duran menos. El objetivo es convertir ventajas antes del minuto 4.`;}else if(exp&&ecoActive){exp.textContent='⚠ REFINERÍA EN OBRA: ocupa LAS 2 LÍNEAS, -10% ingreso temporal y núcleo +12% vulnerable hasta terminar. Escalar ahora abre una ventana real para que el rival te castigue.';}};


