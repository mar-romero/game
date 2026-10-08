import fs from 'node:fs';
import vm from 'node:vm';
import { performance } from 'node:perf_hooks';

// Tune every built-in Arena bot against all the others using only the domain engine.
globalThis.window = globalThis;
for (const file of ['public/game/domain/random.js', 'public/game/domain/arena-config.js', 'public/game/domain/arena/match-engine.js']) {
  vm.runInThisContext(fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), { filename: file });
}
const { GAME_CONFIG, CIVILIZATIONS, BOTS } = FactoryWars.Config;
const Match = FactoryWars.Match, strategies = Object.keys(BOTS), civs = Object.keys(CIVILIZATIONS);
const originalDecision = Match.prototype.botDecision;
const specIndex = { GREEDY:0, RUSHER:1, TURTLE:0, TEMPO:1, ADAPTIVE:2, RANDOM:2, BALANCED:1, HOARDER:0, SABOTEUR:2 };
const ranges = { ecoUntil:[55,165], ecoFactor:[1.15,2.3], factoryAfter:[10,80], defendAfter:[0,100], defendValue:[0,300], captureAfter:[25,135], captureChance:[0.15,0.9], attackAfter:[45,155], largeAfter:[75,185], largeBank:[230,680], sabotageAfter:[45,145], sabotageChance:[0.1,0.8], specialization:[0,2] };
const ints = new Set(['ecoUntil','factoryAfter','defendAfter','defendValue','captureAfter','attackAfter','largeAfter','largeBank','sabotageAfter','specialization']);
const baselineSeeds = {
 GREEDY:{ecoUntil:145,ecoFactor:1.55,factoryAfter:36,defendAfter:75,defendValue:0,captureAfter:75,captureChance:.6,attackAfter:108,largeAfter:108,largeBank:300,sabotageAfter:90,sabotageChance:.45,specialization:0},
 RUSHER:{ecoUntil:100,ecoFactor:1.8,factoryAfter:10,defendAfter:90,defendValue:120,captureAfter:68,captureChance:.7,attackAfter:38,largeAfter:100,largeBank:310,sabotageAfter:100,sabotageChance:.2,specialization:1},
 TURTLE:{ecoUntil:130,ecoFactor:1.9,factoryAfter:50,defendAfter:10,defendValue:0,captureAfter:70,captureChance:.75,attackAfter:125,largeAfter:125,largeBank:350,sabotageAfter:115,sabotageChance:.5,specialization:0},
 TEMPO:{ecoUntil:115,ecoFactor:2,factoryAfter:18,defendAfter:50,defendValue:0,captureAfter:50,captureChance:.35,attackAfter:72,largeAfter:95,largeBank:330,sabotageAfter:80,sabotageChance:.35,specialization:1},
 ADAPTIVE:{ecoUntil:135,ecoFactor:1.75,factoryAfter:25,defendAfter:15,defendValue:0,captureAfter:55,captureChance:.55,attackAfter:65,largeAfter:115,largeBank:360,sabotageAfter:65,sabotageChance:.4,specialization:2},
 RANDOM:{ecoUntil:120,ecoFactor:1.8,factoryAfter:30,defendAfter:25,defendValue:0,captureAfter:45,captureChance:.55,attackAfter:65,largeAfter:105,largeBank:350,sabotageAfter:70,sabotageChance:.5,specialization:2},
 BALANCED:{ecoUntil:130,ecoFactor:1.9,factoryAfter:25,defendAfter:30,defendValue:0,captureAfter:50,captureChance:.4,attackAfter:55,largeAfter:100,largeBank:350,sabotageAfter:75,sabotageChance:.22,specialization:1},
 HOARDER:{ecoUntil:170,ecoFactor:1.7,factoryAfter:40,defendAfter:65,defendValue:0,captureAfter:75,captureChance:.4,attackAfter:90,largeAfter:120,largeBank:500,sabotageAfter:120,sabotageChance:.2,specialization:0},
 SABOTEUR:{ecoUntil:140,ecoFactor:1.72,factoryAfter:52,defendAfter:40,defendValue:0,captureAfter:65,captureChance:.6,attackAfter:130,largeAfter:140,largeBank:370,sabotageAfter:45,sabotageChance:.7,specialization:2},
};
function policy(p) {
 const g=p.tuneGenome,C=GAME_CONFIG,o=this.other(p),t=this.t,remain=C.matchDuration-t;
 const threat=this.incoming(p),value=threat.reduce((sum,x)=>sum+x.damage,0)-this.shield(p);
 const can=k=>this.can(p,k),act=k=>this.act(p,k);
 const payback=p.level>=4?Infinity:this.cost(p,'eco')/(C.economicLevels[p.level]-C.economicLevels[p.level-1]);
 const grow=()=>can('eco')&&remain>payback*g.ecoFactor;
 const defend=()=>{if(t<g.defendAfter||value<=g.defendValue)return false;if(value>155&&can('defLarge'))return act('defLarge');return can('defSmall')&&act('defSmall');};
 if(!p.spec&&p.level>=C.specializationUnlockLevel&&t>28&&t<170){const spec=['specIndustry','specArsenal','specControl'][g.specialization];if(can(spec)&&this.rand()<.42&&act(spec))return;}
 if(defend())return;
 if(grow()&&t<g.ecoUntil&&act('eco'))return;
 if(!p.factory&&t>=g.factoryAfter&&can('factory')&&act('factory'))return;
 if(t>=g.captureAfter&&this.rand()<g.captureChance&&can('capture')&&this.owner!==p.id&&remain>29&&act('capture'))return;
 if(t>=g.sabotageAfter&&o.level>=2&&this.rand()<g.sabotageChance&&can('sabotage')&&act('sabotage'))return;
 if(p.factory&&t>=g.attackAfter){if(t>=g.largeAfter&&p.bank>=g.largeBank&&can('large')&&act('large'))return;if(can('small')&&act('small'))return;}
 if(grow()&&act('eco'))return;
 // Keep the engine's native behavior as a fallback for actions outside this search space.
 return originalDecision.call(this,p);
}
Match.prototype.botDecision=function(p){if(p.tuneGenome)return policy.call(this,p);return originalDecision.call(this,p);};

let rngState=0x414c4c42;const rng=()=>{rngState=(Math.imul(rngState,1664525)+1013904223)>>>0;return rngState/4294967296;};
const clamp=(x,[lo,hi])=>Math.max(lo,Math.min(hi,x));
function randomGenome(){const g={};for(const [k,r] of Object.entries(ranges)){let v=r[0]+rng()*(r[1]-r[0]);g[k]=ints.has(k)?Math.round(v):Number(v.toFixed(2));}return g;}
function mutate(parent,strength=1){const child={...parent};for(const [k,r] of Object.entries(ranges))if(rng()<.35){const span=r[1]-r[0],v=child[k]+(rng()+rng()+rng()-1.5)*span*.22*strength;child[k]=ints.has(k)?Math.round(clamp(v,r)):Number(clamp(v,r).toFixed(2));}return child;}
function play(seed,genome,targetStrategy,opponent,civA,civB,targetFirst,tuned){const targetBot=tuned?'TUNED_TARGET':targetStrategy;const otherBot=opponent;const botA=targetFirst?targetBot:otherBot,botB=targetFirst?otherBot:targetBot;const m=new Match({mode:'bots',civA,civB,botA,botB},seed);const target=m.players.find(p=>p.id===(targetFirst?'A':'B'));if(tuned)target.tuneGenome=genome;let n=0;while(!m.ended&&n++<1200)m.step(.5,true);return m.winner===target.id?1:m.winner===null?.5:0;}

const POP=Number(process.env.ALL_BOT_POPULATION||20),GENS=Number(process.env.ALL_BOT_GENERATIONS||5),REPS=Number(process.env.ALL_BOT_REPS||2),HOLDOUT=Number(process.env.ALL_BOT_HOLDOUT||12);
const start=performance.now(),search={};let candidateCount=0,searchMatches=0;
for(let ti=0;ti<strategies.length;ti++){
 const target=strategies[ti],opponents=strategies.filter(x=>x!==target),seeded=baselineSeeds[target];
 let population=[seeded,...Array.from({length:POP-1},(_,i)=>i<Math.floor((POP-1)/2)?mutate(seeded,.9):randomGenome())],best=null;
 const evaluate=(genome,gen,ix)=>{let sum=0,count=0,by={};for(let oi=0;oi<opponents.length;oi++){let points=0;for(let r=0;r<REPS;r++){const seed=3100000+ti*10000000+gen*100000+ix*1000+oi*20+r;const ca=civs[(r+oi+ti)%civs.length],cb=civs[(r*3+oi+1)%civs.length];points+=play(seed,genome,target,opponents[oi],ca,cb,true,true);points+=play(seed,genome,target,opponents[oi],cb,ca,false,true);}by[opponents[oi]]=points/(REPS*2);sum+=points;count+=REPS*2;}const mean=sum/count,worst=Math.min(...Object.values(by));return{genome,mean,worst,fitness:.75*mean+.25*worst,by};};
 for(let gen=0;gen<GENS;gen++){const ranked=population.map((g,i)=>evaluate(g,gen,i)).sort((a,b)=>b.fitness-a.fitness);candidateCount+=ranked.length;searchMatches+=ranked.length*opponents.length*REPS*2;if(!best||ranked[0].fitness>best.fitness)best=ranked[0];const keep=ranked.slice(0,4).map(x=>x.genome),next=[...keep];while(next.length<POP)next.push(mutate(ranked[Math.floor(rng()*Math.min(8,ranked.length))].genome,gen<2?1:.72));population=next;}
 const validation={},baseValidation={};
 for(let oi=0;oi<opponents.length;oi++){const opponent=opponents[oi];let tunedPoints=0,basePoints=0;for(let r=0;r<HOLDOUT;r++){const seed=97000000+ti*1000000+oi*1000+r;const ca=civs[(r+oi+ti)%civs.length],cb=civs[(r*3+2)%civs.length];tunedPoints+=play(seed,best.genome,target,opponent,ca,cb,true,true);tunedPoints+=play(seed,best.genome,target,opponent,cb,ca,false,true);basePoints+=play(seed,null,target,opponent,ca,cb,true,false);basePoints+=play(seed,null,target,opponent,cb,ca,false,false);}validation[opponent]=Number((tunedPoints/(HOLDOUT*2)).toFixed(4));baseValidation[opponent]=Number((basePoints/(HOLDOUT*2)).toFixed(4));}
 const mean=Object.values(validation).reduce((a,b)=>a+b,0)/opponents.length,baseMean=Object.values(baseValidation).reduce((a,b)=>a+b,0)/opponents.length;
 search[target]={bestGenome:best.genome,searchScoreRate:Number(best.mean.toFixed(4)),searchWorstOpponentRate:Number(best.worst.toFixed(4)),holdoutMean:Number(mean.toFixed(4)),baselineHoldoutMean:Number(baseMean.toFixed(4)),holdoutByOpponent:validation,baselineByOpponent:baseValidation};
}
const elapsed=Number(((performance.now()-start)/1000).toFixed(2));
const result={title:'All built-in bots PvP optimization',createdAt:new Date().toISOString(),method:'Each bot was optimized independently against the other eight using a bounded evolutionary search over economy/production/defense/capture/attack/sabotage timing, thresholds, and specialization. Tuned candidates share one rule-based action order; original named bot logic remains unchanged for opponents and baseline comparisons. Base domain engine only; paired side swaps and rotating civilizations. Validation seeds are separate.',budget:{elapsedSeconds:elapsed,maxSeconds:180,population:POP,generations:GENS,repetitionsPerOpponentPerCandidateAndSide:REPS,holdoutRepetitionsPerOpponentAndSide:HOLDOUT,candidateEvaluations:candidateCount,searchMatches,validationMatches:strategies.length*(strategies.length-1)*HOLDOUT*4},bots:search};
fs.writeFileSync(new URL('./all_bots_pvp_optimization.json',import.meta.url),JSON.stringify(result,null,2));
const pct=n=>`${(n*100).toFixed(1)}%`;const lines=['# Optimización PvP de todas las estrategias', '',`- Tiempo total: **${elapsed}s** (límite: 180s)`,`- Búsqueda: ${candidateCount} evaluaciones, ${searchMatches.toLocaleString('es-AR')} partidas`,`- Validación separada: ${result.budget.validationMatches.toLocaleString('es-AR')} partidas adicionales`,`- Motor base, sin módulos/doctrinas/bonificaciones persistentes; lados alternados y civilizaciones rotativas.`,`- Cada estrategia se optimiza por separado contra las otras ocho.`,`- Los candidatos usan el mismo orden de decisiones parametrizado; los bots originales quedan intactos para rivales y comparación base.`, '', '| Estrategia | Puntuación media optimizada | Media original | Cambio | Peor rival en validación |', '|---|---:|---:|---:|---|'];
for(const bot of strategies){const x=search[bot],worst=Object.entries(x.holdoutByOpponent).sort((a,b)=>a[1]-b[1])[0];lines.push(`| ${bot} | ${pct(x.holdoutMean)} | ${pct(x.baselineHoldoutMean)} | ${pct(x.holdoutMean-x.baselineHoldoutMean)} | ${worst[0]} ${pct(worst[1])} |`);}
lines.push('','## Parámetros y cruces','');for(const bot of strategies){const x=search[bot];lines.push(`### ${bot}`,'',`- Mejor promedio en búsqueda: ${pct(x.searchScoreRate)}; peor rival en búsqueda: ${pct(x.searchWorstOpponentRate)}.`,`- Cruces validados: ${Object.entries(x.holdoutByOpponent).map(([k,v])=>`${k} ${pct(v)} (base ${pct(x.baselineByOpponent[k])})`).join('; ')}.`,`- Parámetros: ${Object.entries(x.bestGenome).map(([k,v])=>`${k}=${v}`).join(', ')}.`,'');}
lines.push('Las tasas son puntuaciones de partidas (victoria=1, empate=0, derrota=0); son estimaciones sujetas a la semilla y al comportamiento actual de los rivales.','');fs.writeFileSync(new URL('./all_bots_pvp_optimization.md',import.meta.url),lines.join('\n'));
console.log(JSON.stringify({elapsedSeconds:elapsed,candidateEvaluations:candidateCount,searchMatches,bots:Object.fromEntries(Object.entries(search).map(([k,v])=>[k,{optimized:v.holdoutMean,baseline:v.baselineHoldoutMean,delta:Number((v.holdoutMean-v.baselineHoldoutMean).toFixed(4)),worst:Object.entries(v.holdoutByOpponent).sort((a,b)=>a[1]-b[1])[0]}]))},null,2));
