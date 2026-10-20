"use strict";

(function attachMatchEngine(root) {
  const { GAME_CONFIG, CIVILIZATIONS, SPECIALIZATIONS } = root.FactoryWars.Config;
  const seededRng = root.FactoryWars.Random.createSeededRandom;
  const round = (value, digits = 1) => Number(value.toFixed(digits));
  const PICK_ORDER = [17,11,13,18,6,8,16,2,22,10,14,1,3,5,9,15,19,20,21,23,0,4,24];
  // Best measured policies retained from paired old/new seed validation.
  // GREEDY, TURTLE, and SABOTEUR keep their native decisions, which scored higher.
  const CALIBRATED_BOT_PARAMETERS = {
    TEMPO: { ecoUntil:75,ecoFactor:2.08,factoryAfter:37,defendAfter:26,defendValue:28,captureAfter:117,captureChance:.83,attackAfter:109,largeAfter:129,largeBank:618,sabotageAfter:54,sabotageChance:.38,specialization:0 },
    ADAPTIVE: { ecoUntil:155,ecoFactor:1.73,factoryAfter:28,defendAfter:67,defendValue:56,captureAfter:98,captureChance:.76,attackAfter:55,largeAfter:144,largeBank:446,sabotageAfter:112,sabotageChance:.59,specialization:0 },
    RANDOM: { ecoUntil:150,ecoFactor:2.13,factoryAfter:10,defendAfter:23,defendValue:8,captureAfter:45,captureChance:.47,attackAfter:72,largeAfter:167,largeBank:594,sabotageAfter:49,sabotageChance:.20,specialization:0 },
    BALANCED: { ecoUntil:86,ecoFactor:1.53,factoryAfter:56,defendAfter:66,defendValue:58,captureAfter:58,captureChance:.73,attackAfter:132,largeAfter:147,largeBank:269,sabotageAfter:135,sabotageChance:.41,specialization:0 },
    HOARDER: { ecoUntil:165,ecoFactor:1.70,factoryAfter:40,defendAfter:69,defendValue:0,captureAfter:75,captureChance:.40,attackAfter:99,largeAfter:145,largeBank:500,sabotageAfter:105,sabotageChance:.20,specialization:0 },
  };
  const REACTIVE_BOT_PARAMETERS = {
    GREEDY: { reactWindow:24,dangerThreshold:42,economyDelay:31,economyPunishChance:.87,counterAttackChance:.32,captureAfter:80,captureChance:.60,largeAttackBank:410,sabotageAfterDefenseChance:.68 },
  };
  const NATIVE_BOT_PARAMETERS = {
    RUSHER: { factoryAfter:13,preFactoryEcoUntil:12,growthFactor:1.68,ecoAfterFactory:56,ecoUntil:137,ecoMaxLevel:3,attackAfter:90,largeAfter:92,largeBank:261,defendHP:398,defendThreshold:10,captureAfter:71,captureChance:.44,captureShield:272,counterEcoDelay:13,counterEcoChance:.79,sabotageAfter:61,sabotageChance:.52 },
    TURTLE: { turtleGrowth:1.47,turtleEcoUntil:107,turtleShieldBelow:63,turtleShieldBank:99,turtleShieldAfter:29,turtleFactoryAfter:77,turtleCaptureAfter:55,turtleAttackAfter:150,turtleSabotageAfter:94,turtleSabotageChance:.59 },
    SABOTEUR: { saboteurGrowth:1.64,saboteurEcoUntil:150,saboteurSabotageAfter:33,saboteurFactoryAfter:31,saboteurCaptureAfter:77,saboteurCaptureChance:.70,saboteurAttackAfter:129 },
  };

  class Match {
   constructor(settings,seed) {
    this.settings={...settings};this.seed=seed;this.rand=seededRng(seed);this.t=0;this.ended=false;this.winner=null;this.endReason="";
    this.owner=null;this.events=[];this.transit=[];this.lastSample=-GAME_CONFIG.sampleInterval;
    this.players=[this.createPlayer("A",settings.civA,settings.mode==="bots"?settings.botA:null),this.createPlayer("B",settings.civB,settings.botB)];
    this.log("match_start",null,{seed,mode:settings.mode});this.sample();
   }
   createPlayer(id,civ,bot){const tiles=Array(GAME_CONFIG.gridSize**2).fill(null);tiles[12]="core";tiles[7]="mine";
    return {id,civ,bot,tiles,bank:GAME_CONFIG.startingResources,hp:GAME_CONFIG.coreHP,level:1,factory:false,spec:null,shields:[],sabotagedUntil:0,overdriveUntil:0,scanUntil:0,scanText:"",cd:{sabotage:0,capture:0,overdrive:0,scan:0,large:0},heavyCommitUntil:0,nextThink:.5+this.rand()*.6,history:[],stats:{economicSpend:0,militarySpend:0,defensiveSpend:0,sabotageSpend:0,territorySpend:0,utilitySpend:0,damageDealt:0,damageTaken:0,firstAttack:null,territorySeconds:0,upgrades:0,attacks:0,defenses:0,sabotages:0,captures:0,overdrives:0,specializations:0}};
   }
   other(p){return this.players[p.id==="A"?1:0];}
   civ(p){return CIVILIZATIONS[p.civ];}
   cost(p,what){const C=GAME_CONFIG,V=this.civ(p),S=p.spec?SPECIALIZATIONS[p.spec]:null;switch(what){case "eco":return p.level>=4?Infinity:Math.round(C.economicUpgradeCosts[p.level]*V.ecoCost);case "factory":return C.factoryCost;case "small":case "large":return Math.round(C.attackCosts[what]*V.attackCost*(S?S.attackCost:1));case "defSmall":return Math.round(C.defenseCosts.small*V.defenseCost*(p.heavyCommitUntil>this.t?C.heavyDefenseCostMult:1));case "defLarge":return Math.round(C.defenseCosts.large*V.defenseCost*(p.heavyCommitUntil>this.t?C.heavyDefenseCostMult:1));case "sabotage":return Math.round(C.sabotageCost*V.sabotageCost);case "capture":return Math.round(C.territoryCaptureCost*(S?.captureCost||1));case "overdrive":return C.overdriveCost;case "scan":return C.scanCost;case "specIndustry":case "specArsenal":case "specControl":return C.specializationCost;default:return Infinity;}}
   income(p){const C=GAME_CONFIG;let n=C.economicLevels[p.level-1];if(this.owner===p.id)n*=1+C.territoryBonus+(p.spec?SPECIALIZATIONS[p.spec].territoryBonus:0);if(p.spec)n*=SPECIALIZATIONS[p.spec].incomeMult;if(p.sabotagedUntil>this.t)n*=1-C.sabotagePenalty;if(p.overdriveUntil>this.t)n*=1+C.overdriveIncomeBonus;return n;}
   shield(p){return round(p.shields.reduce((s,x)=>s+x.hp,0));}
   log(type,p,data={}){const ev={t:round(this.t,2),type,player:p?p.id:null,...data};this.events.push(ev);if(p){p.history.push(ev);if(p.history.length>100)p.history.shift();}return ev;}
   place(p,type,cell){if(Number.isInteger(cell)&&p.tiles[cell]===null){p.tiles[cell]=type;return true;}const free=PICK_ORDER.find(k=>p.tiles[k]===null);if(free!==undefined){p.tiles[free]=type;return true;}return false;}
   can(p,action){const C=GAME_CONFIG;if(this.ended||p.bank+1e-8<this.cost(p,action))return false;switch(action){case "eco":return p.level<4&&p.tiles.includes(null);case "specIndustry":case "specArsenal":case "specControl":return p.level>=C.specializationUnlockLevel&&!p.spec&&p.tiles.includes(null);case "factory":return !p.factory&&p.tiles.includes(null);case "defSmall":case "defLarge":return this.shield(p)<=C.maxShield-Math.round(C.defenseCapacity[action==="defSmall"?"small":"large"]*this.civ(p).defenseHP)*0.5;case "small":return p.factory;case "large":return p.factory&&this.t>=p.cd.large;case "capture":return p.factory&&(this.owner!==p.id&&this.t>=p.cd.capture);case "sabotage":return this.t>=p.cd.sabotage;case "overdrive":return C.overdriveEnabled&&this.t>=p.cd.overdrive&&p.overdriveUntil<=this.t;case "scan":return this.t>=p.cd.scan;default:return true;}}
   act(p,action,cell){if(!this.can(p,action))return false;const C=GAME_CONFIG,op=this.other(p),price=this.cost(p,action);if(["eco","factory"].includes(action) && !this.place(p,action==="eco"?"refinery":"fabricator",cell))return false;
    p.bank-=price;
    switch(action){
     case "eco":p.level++;p.stats.economicSpend+=price;p.stats.upgrades++;this.log("econ_upgrade",p,{level:p.level,cost:price,income:C.economicLevels[p.level-1]});break;
     case "factory":p.factory=true;p.stats.militarySpend+=price;this.log("factory_build",p,{cost:price});break;
     case "small":case "large":{const trip={kind:"attack",from:p.id,to:op.id,size:action,start:this.t,eta:this.t+C.attackTravel[action],damage:Math.round(C.attackDamage[action]*(p.spec?SPECIALIZATIONS[p.spec].attackDamage:1))};this.transit.push(trip);p.stats.militarySpend+=price;p.stats.attacks++;if(p.stats.firstAttack===null)p.stats.firstAttack=round(this.t);if(action==="large"){p.cd.large=this.t+C.heavyAttackCooldown;p.heavyCommitUntil=this.t+C.heavyCommitDuration;}this.log("attack_commit",p,{size:action,cost:price,damage:trip.damage,eta:round(trip.eta),commitUntil:action==="large"?round(p.heavyCommitUntil):null});break;}
     case "defSmall":case "defLarge":{const size=action==="defSmall"?"small":"large";const available=Math.max(0,C.maxShield-this.shield(p));const capacity=Math.min(available,Math.round(C.defenseCapacity[size]*this.civ(p).defenseHP));if(capacity>0)p.shields.push({hp:capacity,expires:this.t+C.shieldDuration});this.placeDecoration(p,"shieldTower");p.stats.defensiveSpend+=price;p.stats.defenses++;this.log("defense_commit",p,{size,cost:price,shield:capacity});break;}
     case "sabotage":{const duration=C.sabotageDuration+(p.spec?SPECIALIZATIONS[p.spec].sabotageDuration:0);op.sabotagedUntil=Math.max(this.t,op.sabotagedUntil)+duration;p.cd.sabotage=this.t+C.sabotageCooldown;this.placeDecoration(p,"antenna");p.stats.sabotageSpend+=price;p.stats.sabotages++;this.log("sabotage",p,{target:op.id,cost:price,duration,penalty:C.sabotagePenalty});break;}
     case "capture":this.transit.push({kind:"capture",from:p.id,to:"NODE",start:this.t,eta:this.t+C.territoryTravel});p.cd.capture=this.t+C.territoryCooldown;p.stats.territorySpend+=price;this.log("territory_commit",p,{cost:price,eta:round(this.t+C.territoryTravel)});break;
     case "overdrive":p.overdriveUntil=this.t+C.overdriveDuration;p.cd.overdrive=this.t+C.overdriveCooldown;p.stats.utilitySpend+=price;p.stats.overdrives++;this.log("overdrive",p,{duration:C.overdriveDuration,bonus:C.overdriveIncomeBonus,vulnerability:C.overdriveCoreVulnerability,cost:price});break;
     case "specIndustry":case "specArsenal":case "specControl":{p.spec=action;this.placeDecoration(p,action);p.stats.economicSpend+=price;p.stats.specializations++;this.log("specialization",p,{branch:action,cost:price});break;}
     case "scan":p.scanUntil=this.t+C.scanDuration;p.cd.scan=this.t+C.scanCooldown;p.scanText=this.approxBank(op.bank)+" · "+this.readIntent(op);p.stats.utilitySpend+=price;this.log("scan",p,{cost:price,result:p.scanText});break;
    }
    return true;
   }
   placeDecoration(p,type){if(!p.tiles.includes(type))this.place(p,type);}
   approxBank(value){return value<140?"Banco bajo (<140)":value<380?"Banco medio (140–379)":"Banco alto (380+)";}
   readIntent(p){const rec=this.events.filter(e=>e.player===p.id&&this.t-e.t<=26);let econ=rec.filter(x=>x.type==="econ_upgrade").length,off=rec.filter(x=>x.type==="attack_commit").length,def=rec.filter(x=>x.type==="defense_commit").length;if(econ>off&&econ>def)return "actividad económica";if(off>econ&&off>=def)return "actividad militar";if(def>econ&&def>off)return "postura defensiva";return "intención poco clara";}
   incoming(p){return this.transit.filter(x=>x.kind==="attack"&&x.to===p.id).sort((a,b)=>a.eta-b.eta);}
   resolveTrip(x){const p=this.players.find(q=>q.id===x.from);if(x.kind==="capture"){const prev=this.owner;this.owner=p.id;p.stats.captures++;this.log("territory_capture",p,{previous:prev,bonus:GAME_CONFIG.territoryBonus});return;}
    const target=this.players.find(q=>q.id===x.to);let left=x.damage,absorbed=0;for(const sh of target.shields){if(left<=0)break;const n=Math.min(left,sh.hp);sh.hp-=n;left-=n;absorbed+=n;}target.shields=target.shields.filter(s=>s.hp>0);
    const hpDamage=Math.min(target.hp,Math.ceil(left*(target.overdriveUntil>this.t?1+GAME_CONFIG.overdriveCoreVulnerability:1)));
    target.hp=Math.max(0,target.hp-hpDamage);p.stats.damageDealt+=hpDamage;target.stats.damageTaken+=hpDamage;this.log("base_damage",p,{target:target.id,attackSize:x.size,absorbed,damage:hpDamage,targetHp:target.hp});
    /* La victoria se resuelve después de todos los impactos del mismo paso. */
   }
   sample(){if(this.t+1e-8<this.lastSample+GAME_CONFIG.sampleInterval)return;this.lastSample=this.t;for(const p of this.players){this.log("state_sample",p,{bank:round(p.bank,2),income:round(this.income(p),2),hp:p.hp,shield:this.shield(p),specialization:p.spec,economicSpend:p.stats.economicSpend,militarySpend:p.stats.militarySpend,defensiveSpend:p.stats.defensiveSpend,level:p.level,territory:this.owner===p.id});}}
   step(dt,withBots=true){if(this.ended)return;const until=Math.min(dt,GAME_CONFIG.matchDuration-this.t);if(until<=0){this.timeout();return;}
    this.t=round(this.t+until,5);for(const p of this.players){p.shields=p.shields.filter(s=>s.expires>this.t&&s.hp>0);p.bank+=this.income(p)*until;if(this.owner===p.id)p.stats.territorySeconds+=until;}
    const due=this.transit.filter(x=>x.eta<=this.t+1e-6).sort((a,b)=>a.eta-b.eta||a.from.localeCompare(b.from));this.transit=this.transit.filter(x=>x.eta>this.t+1e-6);for(const x of due)this.resolveTrip(x);
    if(this.players.some(p=>p.hp<=0)){const alive=this.players.filter(p=>p.hp>0);this.finish(alive.length===1?alive[0].id:null,alive.length===1?"Núcleo destruido":"Destrucción simultánea");return;}
    if(this.ended)return;
    if(withBots){for(const p of this.players){if(p.bot&&this.t>=p.nextThink){p.nextThink=this.t+GAME_CONFIG.botThinkInterval*(.78+this.rand()*.49);this.botDecision(p);if(this.ended)break;}}}
    this.sample();if(this.t>=GAME_CONFIG.matchDuration-1e-6)this.timeout();
   }
   timeout(){if(this.ended)return;const [a,b]=this.players;let victor=null;if(a.hp>b.hp)victor=a.id;else if(b.hp>a.hp)victor=b.id;else if(a.stats.territorySeconds>b.stats.territorySeconds+1e-4)victor=a.id;else if(b.stats.territorySeconds>a.stats.territorySeconds+1e-4)victor=b.id;this.finish(victor,"Tiempo agotado: HP; desempate por control territorial");}
   finish(winner,reason){if(this.ended)return;this.ended=true;this.winner=winner;this.endReason=reason;this.log("match_end",null,{winner,reason,finalTime:round(this.t)});this.sample();}
   calibratedBotDecision(p){const g=CALIBRATED_BOT_PARAMETERS[p.bot];if(!g)return false;const C=GAME_CONFIG,o=this.other(p),t=this.t,remain=C.matchDuration-t,threat=this.incoming(p),value=threat.reduce((s,x)=>s+x.damage,0)-this.shield(p),can=k=>this.can(p,k),act=k=>this.act(p,k),payback=p.level>=4?Infinity:this.cost(p,"eco")/(C.economicLevels[p.level]-C.economicLevels[p.level-1]),grow=()=>can("eco")&&remain>payback*g.ecoFactor;
    if(!p.spec&&p.level>=C.specializationUnlockLevel&&t>28&&t<170){const spec=["specIndustry","specArsenal","specControl"][g.specialization];if(can(spec)&&this.rand()<.42&&act(spec))return true;}
    if(t>=g.defendAfter&&value>g.defendValue){if(value>155&&can("defLarge")&&act("defLarge"))return true;if(can("defSmall")&&act("defSmall"))return true;}
    if(grow()&&t<g.ecoUntil&&act("eco"))return true;
    if(!p.factory&&t>=g.factoryAfter&&can("factory")&&act("factory"))return true;
    if(t>=g.captureAfter&&this.rand()<g.captureChance&&can("capture")&&this.owner!==p.id&&remain>29&&act("capture"))return true;
    if(t>=g.sabotageAfter&&o.level>=2&&this.rand()<g.sabotageChance&&can("sabotage")&&act("sabotage"))return true;
    if(p.factory&&t>=g.attackAfter){if(t>=g.largeAfter&&p.bank>=g.largeBank&&can("large")&&act("large"))return true;if(can("small")&&act("small"))return true;}
    if(grow()&&act("eco"))return true;
    return false;
   }
   rusherBotDecision(p,g){const C=GAME_CONFIG,o=this.other(p),t=this.t,remain=C.matchDuration-t,can=k=>this.can(p,k),act=k=>this.act(p,k),threat=this.incoming(p),net=threat.reduce((s,x)=>s+x.damage,0)-this.shield(p),recent=this.events.filter(e=>e.player===o.id&&t-e.t<=36&&e.type!=="state_sample"),lastEco=[...recent].reverse().find(e=>e.type==="econ_upgrade"),growthPayback=p.level>=4?Infinity:this.cost(p,"eco")/(C.economicLevels[p.level]-C.economicLevels[p.level-1]),grow=()=>can("eco")&&remain>growthPayback*g.growthFactor;
    const defend=()=>{if(net<g.defendThreshold&&!(threat.length&&p.hp<g.defendHP))return false;if(net>155&&can("defLarge"))return act("defLarge");return can("defSmall")&&act("defSmall");};
    const attack=preferLarge=>{if(!p.factory)return false;if(preferLarge&&p.bank>=g.largeBank&&can("large"))return act("large");return can("small")&&act("small");};
    const capture=()=>can("capture")&&this.owner!==p.id&&remain>29&&act("capture");
    if(defend())return true;
    if(!p.factory){if(t<g.preFactoryEcoUntil&&p.level===1&&p.bank>=this.cost(p,"eco")+this.cost(p,"factory")+45&&grow()&&act("eco"))return true;if(t>=g.factoryAfter&&can("factory")&&act("factory"))return true;}
    if(lastEco&&p.factory&&t-lastEco.t>=g.counterEcoDelay&&this.rand()<g.counterEcoChance&&attack(t>=g.largeAfter))return true;
    if(p.factory&&t>=g.attackAfter&&attack(t>=g.largeAfter))return true;
    if(p.factory&&t>=g.ecoAfterFactory&&t<g.ecoUntil&&p.level<g.ecoMaxLevel&&grow()&&act("eco"))return true;
    if(t>=g.captureAfter&&this.shield(o)>=g.captureShield&&this.rand()<g.captureChance&&capture())return true;
    if(t>=g.captureAfter&&this.owner!==p.id&&this.rand()<g.captureChance*.45&&capture())return true;
    if(t>=g.sabotageAfter&&lastEco&&this.rand()<g.sabotageChance&&can("sabotage")&&act("sabotage"))return true;
    return false;
   }
   /* Bots leen edificios, ataques en vuelo y acciones ejecutadas. No leen el banco rival. */
   baseBotDecision(p){const C=GAME_CONFIG,o=this.other(p),t=this.t,remain=C.matchDuration-t,threat=this.incoming(p),value=threat.reduce((s,x)=>s+x.damage,0)-this.shield(p),strat=p.bot,T=p.nativeGenome||NATIVE_BOT_PARAMETERS[strat]||{},v=(key,fallback)=>Number.isFinite(T[key])?T[key]:fallback;
    // Sólo la introducción: el enemigo no presiona antes de que el jugador conozca economía/hangar/ataque.
    if(this.settings.training&&p.id==="B"&&(this.tutorialStep<3||t<45)){
     if(t>12&&p.level===1&&this.can(p,"eco"))this.act(p,"eco");
     return;
    }
    // Use the best cross-seed policy for strategies whose tuned version scored higher.
    if(this.calibratedBotDecision(p))return;
    if(strat==="RUSHER"){this.rusherBotDecision(p,T);return;}
    const can=k=>this.can(p,k),buy=k=>this.act(p,k),ecoPayback=()=>{if(p.level>=4)return Infinity;const inc=C.economicLevels[p.level]-C.economicLevels[p.level-1];return this.cost(p,"eco")/inc;};
    const grow=(factor=1.75)=>can("eco")&&remain>ecoPayback()*factor*v("growthScale",1);
    const defend=()=>{if(!threat.length)return false;if(value<=v("defendSurplus",0))return false;const large=value>v("largeDefenseThreshold",155);if(large&&can("defLarge"))return buy("defLarge");if(can("defSmall"))return buy("defSmall");return false;};
    const factory=()=>can("factory")&&buy("factory");
    const capture=()=>can("capture")&&this.owner!==p.id&&remain>29&&buy("capture");
    const attack=(preferLarge=false)=>{if(!p.factory)return false;if(preferLarge&&can("large"))return buy("large");if(can("small"))return buy("small");return false;};
    const sabotage=()=>can("sabotage")&&o.level>=2&&remain>16&&buy("sabotage");
    const publicMoves=this.events.filter(e=>e.player===o.id&&t-e.t<=22&&e.type!=="state_sample");
    // Una elección simple por bot: genera diversidad sin multiplicar la complejidad de las acciones.
    if(!p.spec&&p.level>=C.specializationUnlockLevel&&t>28&&t<170){let spec={GREEDY:"specIndustry",RUSHER:"specArsenal",TURTLE:"specIndustry",TEMPO:"specArsenal",ADAPTIVE:o.level>p.level?"specArsenal":"specControl",SABOTEUR:"specControl",HOARDER:"specIndustry",BALANCED:"specArsenal",RANDOM:["specIndustry","specArsenal","specControl"][Math.floor(this.rand()*3)]}[strat];if(spec&&can(spec)&&this.rand()<.42&&buy(spec))return;}
  
    const econMoves=publicMoves.filter(e=>e.type==="econ_upgrade").length;
    const atkMoves=publicMoves.filter(e=>e.type==="attack_commit").length;
    const defMoves=publicMoves.filter(e=>e.type==="defense_commit").length;
    if(strat!=="RUSHER"&&(strat!=="GREEDY"||t>=75)&&defend())return; // GREEDY sacrifica defensa temprana, pero reacciona a ataques tardíos.
    if(strat==="GREEDY"){
     if(grow(v("greedyGrowth",1.55))&&t<v("greedyEcoUntil",160)&&buy("eco"))return;
     if(!p.factory&&t>v("greedyFactoryAfter",36)&&factory())return;
     if(t>v("greedyCaptureAfter",75)&&this.rand()<v("greedyCaptureChance",.6)&&capture())return;
     if(t>v("greedyAttackAfter",108)&&attack(true))return;
     if(t>v("greedySabotageAfter",90)&&this.rand()<v("greedySabotageChance",.45)&&sabotage())return;
     if(t>v("greedyLateAttackAfter",155))attack(true);return;
    }
    if(strat==="TURTLE"){
     if(grow(v("turtleGrowth",1.9))&&t<v("turtleEcoUntil",130)&&buy("eco"))return;
     if(o.factory&&this.shield(p)<v("turtleShieldBelow",130)&&p.bank>v("turtleShieldBank",160)&&t>v("turtleShieldAfter",24)&&can("defSmall")&&buy("defSmall"))return;
     if(t>v("turtleFactoryAfter",50)&&!p.factory&&factory())return;
     if(t>v("turtleCaptureAfter",70)&&capture())return;
     if(t>v("turtleAttackAfter",125)&&attack(true))return;
     if(t>v("turtleSabotageAfter",115)&&this.rand()<v("turtleSabotageChance",.5)&&sabotage())return;return;
    }
    if(strat==="TEMPO"){
     if(!p.factory&&t>v("tempoFactoryAfter",20)&&factory())return;
     if(econMoves>v("tempoPunishEconomyCount",0)&&p.factory&&attack(p.bank>this.cost(p,"large")))return;
     if(grow(v("tempoGrowth",2.0))&&t<v("tempoEcoUntil",120)&&buy("eco"))return;
     if(t>v("tempoCaptureAfter",50)&&this.rand()<v("tempoCaptureChance",.35)&&capture())return;
     if(t>v("tempoAttackAfter",92)&&attack(true))return;
     if(t>v("tempoSabotageAfter",80)&&this.rand()<v("tempoSabotageChance",.35)&&sabotage())return;return;
    }
    if(strat==="ADAPTIVE"){
     if(atkMoves>0&&defend())return;
     if(econMoves>=1){if(!p.factory&&factory())return;if(attack(p.bank>this.cost(p,"large")+45))return;}
     if(defMoves-atkMoves>v("adaptiveDefenseLead",0)){if(grow(v("adaptiveDefenseGrowth",1.8))&&buy("eco"))return;if(!p.factory&&factory())return;if(capture())return;}
     if(grow(v("adaptiveGrowth",1.75))&&t<v("adaptiveEcoUntil",135)&&buy("eco"))return;
     if(!p.factory&&t>v("adaptiveFactoryAfter",25)&&factory())return;
     if(this.rand()<v("adaptiveCaptureChance",.35)&&capture())return;
     if(t>v("adaptiveAttackAfter",65)&&attack(t>v("adaptiveLargeAfter",120)))return;
     if(this.rand()<v("adaptiveSabotageChance",.35)&&sabotage())return;return;
    }
    if(strat==="HOARDER"){
     if(!p.factory&&t>v("hoarderFactoryAfter",30)&&p.bank>v("hoarderFactoryBank",325)&&factory())return;
     if(p.bank<v("hoarderHoldBank",550)&&t<v("hoarderHoldUntil",180))return;
     if(p.level<v("hoarderEcoMaxLevel",3)&&grow(v("hoarderGrowth",1.7))&&buy("eco"))return;
     if(t>v("hoarderCaptureAfter",65)&&this.rand()<v("hoarderCaptureChance",.4)&&capture())return;
     if(attack(true))return;return;
    }
    if(strat==="SABOTEUR"){
     if(grow(v("saboteurGrowth",1.72))&&t<v("saboteurEcoUntil",145)&&buy("eco"))return;
     if(t>v("saboteurSabotageAfter",0)&&sabotage())return;
     if(!p.factory&&t>v("saboteurFactoryAfter",52)&&factory())return;
     if(t>v("saboteurCaptureAfter",65)&&this.rand()<v("saboteurCaptureChance",.6)&&capture())return;
     if(t>v("saboteurAttackAfter",130)&&attack(true))return;return;
    }
    if(strat==="RANDOM"){
     const options=["eco","eco","factory","small","small","large","defSmall","defLarge","sabotage","capture","overdrive"].filter(k=>can(k)&&(k!=="defSmall"&&k!=="defLarge"||value>0||this.rand()<.04));
     if(options.length&&this.rand()<v("randomActionChance",.78))buy(options[Math.floor(this.rand()*options.length)]);return;
    }
    // BALANCED (y fallback)
    if(grow(v("balancedGrowth",1.9))&&t<v("balancedEcoUntil",130)&&p.level<v("balancedEcoMaxLevel",3)&&buy("eco"))return;
    if(!p.factory&&t>v("balancedFactoryAfter",0)&&factory())return;
    if(t>v("balancedCaptureAfter",40)&&this.rand()<v("balancedCaptureChance",.40)&&capture())return;
    if(t>v("balancedAttackAfter",45)&&attack(p.bank>this.cost(p,"large")+v("balancedLargeReserve",80)))return;
    if(this.rand()<v("balancedSabotageChance",.22)&&sabotage())return;
    if(grow(v("balancedFallbackGrowth",1.8))&&buy("eco"))return;
   }
   reactiveBotDecision(p){const g=REACTIVE_BOT_PARAMETERS[p.bot];if(!g)return false;const C=GAME_CONFIG,o=this.other(p),t=this.t,remain=C.matchDuration-t,can=k=>this.can(p,k),act=k=>this.act(p,k),threat=this.incoming(p),netDamage=threat.reduce((s,x)=>s+x.damage,0)-this.shield(p);
    const recent=this.events.filter(e=>e.player===o.id&&t-e.t<=g.reactWindow&&e.type!=="state_sample"),lastEco=[...recent].reverse().find(e=>e.type==="econ_upgrade"),recentAttacks=recent.filter(e=>e.type==="attack_commit").length,recentDefenses=recent.filter(e=>e.type==="defense_commit").length;
    const attack=()=>{if(!p.factory)return false;if(p.bank>=g.largeAttackBank&&can("large"))return act("large");return can("small")&&act("small");};
    if(netDamage>=g.dangerThreshold){if(netDamage>155&&can("defLarge")&&act("defLarge"))return true;if(can("defSmall")&&act("defSmall"))return true;}
    if(lastEco&&p.factory&&t-lastEco.t>=g.economyDelay&&this.rand()<g.economyPunishChance&&attack())return true;
    if(recentAttacks&&p.factory&&this.rand()<g.counterAttackChance&&attack())return true;
    if(t>=g.captureAfter&&remain>29&&this.owner!==p.id&&this.rand()<g.captureChance&&can("capture")&&act("capture"))return true;
    if(recentDefenses&&t>=g.captureAfter&&this.rand()<g.sabotageAfterDefenseChance&&can("sabotage")&&act("sabotage"))return true;
    return false;
   }
   botDecision(p){if(this.settings.training&&p.id==="B"&&(this.tutorialStep<3||this.t<45))return this.baseBotDecision(p);const before=this.events.length;this.baseBotDecision(p);if(this.events.length===before)this.reactiveBotDecision(p);}
   report(){return {seed:this.seed,config:GAME_CONFIG,civilizations:CIVILIZATIONS,settings:this.settings,winner:this.winner,endReason:this.endReason,duration:round(this.t),territoryOwner:this.owner,players:this.players.map(p=>({id:p.id,civilization:p.civ,bot:p.bot,final:{bank:round(p.bank,1),income:round(this.income(p),2),hp:p.hp,level:p.level,shield:this.shield(p),specialization:p.spec},stats:{...p.stats,territorySeconds:round(p.stats.territorySeconds)}})),events:this.events};}
  
  }

  root.FactoryWars.Match = Match;
  root.Match = Match; // temporary compatibility export for existing browser adapters
  root.PICK_ORDER = PICK_ORDER; // temporary compatibility export used by the simulation adapter
})(window);
