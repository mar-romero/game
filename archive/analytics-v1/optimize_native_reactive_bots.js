import fs from 'node:fs';
import vm from 'node:vm';
import { performance } from 'node:perf_hooks';

// Optimize a reactive tail after each bot's native decision, against a pool of
// native opponents and the previous calibrated generation.
globalThis.window=globalThis;
for(const file of ['public/game/domain/random.js','public/game/domain/arena-config.js','public/game/domain/arena/match-engine.js'])vm.runInThisContext(fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8'),{filename:file});
const prior=JSON.parse(fs.readFileSync(new URL('./all_bots_pvp_optimization.json',import.meta.url),'utf8'));
const {GAME_CONFIG,CIVILIZATIONS,BOTS}=FactoryWars.Config,Match=FactoryWars.Match,strategies=Object.keys(BOTS),civs=Object.keys(CIVILIZATIONS);
const nativeDecision=Match.prototype.baseBotDecision;
const ranges={reactWindow:[8,38],dangerThreshold:[0,200],economyDelay:[0,32],economyPunishChance:[.2,.95],counterAttackChance:[.15,.9],captureAfter:[18,100],captureChance:[.15,.9],largeAttackBank:[280,720],sabotageAfterDefenseChance:[.1,.8]};
const ints=new Set(['reactWindow','dangerThreshold','economyDelay','captureAfter','largeAttackBank']);
let rngState=0x52454143;const rng=()=>{rngState=(Math.imul(rngState,1664525)+1013904223)>>>0;return rngState/4294967296;};
const clamp=(n,r)=>Math.max(r[0],Math.min(r[1],n));
function randomGenome(){const g={};for(const[k,r]of Object.entries(ranges)){const n=r[0]+rng()*(r[1]-r[0]);g[k]=ints.has(k)?Math.round(n):Number(n.toFixed(2));}return g;}
function mutate(g,power=1){const out={...g};for(const[k,r]of Object.entries(ranges))if(rng()<.42){const n=out[k]+(rng()+rng()+rng()-1.5)*(r[1]-r[0])*.2*power;out[k]=ints.has(k)?Math.round(clamp(n,r)):Number(clamp(n,r).toFixed(2));}return out;}
function adaptiveTail(p,g){const C=GAME_CONFIG,o=this.other(p),t=this.t,remain=C.matchDuration-t,can=k=>this.can(p,k),act=k=>this.act(p,k);
 const threat=this.incoming(p),netDamage=threat.reduce((s,x)=>s+x.damage,0)-this.shield(p);
 const recent=this.events.filter(e=>e.player===o.id&&t-e.t<=g.reactWindow&&e.type!=='state_sample');
 const lastEco=[...recent].reverse().find(e=>e.type==='econ_upgrade');
 const recentAttacks=recent.filter(e=>e.type==='attack_commit').length;
 const recentDefenses=recent.filter(e=>e.type==='defense_commit').length;
 const defend=()=>{if(netDamage<g.dangerThreshold)return false;if(netDamage>155&&can('defLarge'))return act('defLarge');return can('defSmall')&&act('defSmall');};
 const attack=()=>{if(!p.factory)return false;if(p.bank>=g.largeAttackBank&&can('large'))return act('large');return can('small')&&act('small');};
 // React to attacks already in flight before the native policy gets another think.
 if(defend())return true;
 // Punish recently visible economic investment after a tunable delay.
 if(lastEco&&p.factory&&t-lastEco.t>=g.economyDelay&&this.rand()<g.economyPunishChance&&attack())return true;
 // A visible enemy strike raises counter-pressure, while the shield check above
 // prevents spending on an attack when an urgent defense is available.
 if(recentAttacks&&p.factory&&this.rand()<g.counterAttackChance&&attack())return true;
 if(t>=g.captureAfter&&remain>29&&this.owner!==p.id&&this.rand()<g.captureChance&&can('capture')&&act('capture'))return true;
 if(recentDefenses&&t>=g.captureAfter&&this.rand()<g.sabotageAfterDefenseChance&&can('sabotage')&&act('sabotage'))return true;
 return false;
}
Match.prototype.botDecision=function(p){const mode=p.optimizationMode||'native';if(mode==='previous')return nativeDecision.call(this,p);const saved=this.calibratedBotDecision;this.calibratedBotDecision=()=>false;const before=this.events.length;nativeDecision.call(this,p);this.calibratedBotDecision=saved;if(mode==='candidate'&&this.events.length===before)adaptiveTail.call(this,p,p.reactiveGenome);};

const POP=Number(process.env.REACTIVE_POPULATION||12),GENS=Number(process.env.REACTIVE_GENERATIONS||4),TRAIN_REPS=Number(process.env.REACTIVE_TRAIN_REPS||2),HOLDOUT=Number(process.env.REACTIVE_HOLDOUT_REPS||8);
const start=performance.now(),bestByBot={};let candidateEvaluations=0,searchMatches=0;
// Keep real strategy IDs so both native and calibrated opponent branches execute.
function matchup(seed,target,opponent,targetMode,targetGenome,opponentMode,civA,civB,targetFirst){
 const m=new Match({mode:'bots',civA,civB,botA:targetFirst?target:opponent,botB:targetFirst?opponent:target},seed);
 const tp=m.players.find(p=>p.id===(targetFirst?'A':'B')),rp=m.players.find(p=>p.id===(targetFirst?'B':'A'));
 tp.optimizationMode=targetMode;rp.optimizationMode=opponentMode;if(targetMode==='candidate')tp.reactiveGenome=targetGenome;
 let n=0;while(!m.ended&&n++<1200)m.step(.5,true);return m.winner===tp.id?1:m.winner===null?.5:0;
}
// Match bot labels stay native. Candidate mode wraps its native strategy with
// the genome; previous mode leaves the current calibrated policy active.
for(let ti=0;ti<strategies.length;ti++){
 const target=strategies[ti],opponents=strategies.filter(x=>x!==target);let population=Array.from({length:POP},randomGenome),best=null;
 for(let gen=0;gen<GENS;gen++){
  const ranked=population.map((g,ix)=>{let sum=0,count=0,perOpponent={};for(let oi=0;oi<opponents.length;oi++){let s=0;for(let modeIndex=0;modeIndex<2;modeIndex++){const opponentMode=modeIndex===0?'native':'previous';for(let r=0;r<TRAIN_REPS;r++){const seed=250000000+ti*10000000+gen*100000+oi*1000+modeIndex*100+r,ca=civs[(r+oi+ti)%civs.length],cb=civs[(r*3+oi+1)%civs.length];s+=matchup(seed,target,opponents[oi],'candidate',g,opponentMode,ca,cb,true);s+=matchup(seed,target,opponents[oi],'candidate',g,opponentMode,cb,ca,false);}}perOpponent[opponents[oi]]=s/(TRAIN_REPS*4);sum+=s;count+=TRAIN_REPS*4;}const mean=sum/count,worst=Math.min(...Object.values(perOpponent));return{genome:g,mean,worst,fitness:.75*mean+.25*worst};}).sort((a,b)=>b.fitness-a.fitness);
  candidateEvaluations+=ranked.length;searchMatches+=ranked.length*opponents.length*2*TRAIN_REPS*2;if(!best||ranked[0].fitness>best.fitness)best=ranked[0];const next=ranked.slice(0,3).map(x=>x.genome);while(next.length<POP)next.push(mutate(ranked[Math.floor(rng()*Math.min(6,ranked.length))].genome,gen<2?1:.75));population=next;
 }
 bestByBot[target]=best;
}

// Paired validation against a broader opponent pool on two untouched seed families.
const seedFamilies={previous:97000000,fresh:180000000},results={};let validationMatches=0;
for(let ti=0;ti<strategies.length;ti++){const target=strategies[ti],opponents=strategies.filter(x=>x!==target);results[target]={};for(let oi=0;oi<opponents.length;oi++){const opp=opponents[oi];results[target][opp]={};for(const opponentMode of ['native','previous']){results[target][opp][opponentMode]={};for(const [family,base]of Object.entries(seedFamilies)){const scores={native:0,previous:0,reactive:0};for(let r=0;r<HOLDOUT;r++){const seed=base+ti*10000000+oi*100000+opponentMode.length*10000+r,ca=civs[(r+oi+ti)%civs.length],cb=civs[(r*3+2)%civs.length];for(const side of [true,false]){const x=side?ca:cb,y=side?cb:ca;for(const [name,mode,genome]of [['native','native',null],['previous','previous',null],['reactive','candidate',bestByBot[target].genome]]){scores[name]+=matchup(seed,target,opp,mode,genome,opponentMode,x,y,side);validationMatches++;}}}results[target][opp][opponentMode][family]=Object.fromEntries(Object.entries(scores).map(([k,v])=>[k,Number((v/(HOLDOUT*2)).toFixed(4))]));}}}}
const summary={};for(const target of strategies){const native=[],previous=[],reactive=[];for(const opp of strategies.filter(x=>x!==target))for(const mode of ['native','previous'])for(const family of Object.keys(seedFamilies)){const row=results[target][opp][mode][family];native.push(row.native);previous.push(row.previous);reactive.push(row.reactive);}const avg=a=>a.reduce((s,x)=>s+x,0)/a.length;summary[target]={nativeMean:avg(native),previousMean:avg(previous),reactiveMean:avg(reactive),deltaVsNative:avg(reactive)-avg(native),deltaVsPrevious:avg(reactive)-avg(previous),perOpponent:Object.fromEntries(strategies.filter(x=>x!==target).map(opp=>{const vals=[];for(const mode of ['native','previous'])for(const family of Object.keys(seedFamilies))vals.push(results[target][opp][mode][family].reactive);return[opp,avg(vals)];}))};}
const elapsed=Number(((performance.now()-start)/1000).toFixed(2));
const output={title:'Native reactive PvP bot optimization',createdAt:new Date().toISOString(),method:'Preserved each target bot’s native decision function. The candidate adds a reactive tail only when the native policy takes no action, using recent public opponent actions and in-flight attack telemetry. Evolutionary search optimized reactive thresholds against every other strategy in both native and previous calibrated forms. Validation used two separate paired seed families and compared native, previous, and reactive policies.',budget:{elapsedSeconds:elapsed,maxSeconds:180,population:POP,generations:GENS,trainingRepetitionsPerOpponentAndPolicyAndSide:TRAIN_REPS,validationRepetitionsPerOpponentAndPolicyAndSide:HOLDOUT,candidateEvaluations,searchMatches,validationMatches},bots:Object.fromEntries(strategies.map(s=>[s,{genome:bestByBot[s].genome,searchMean:bestByBot[s].mean,searchWorst:bestByBot[s].worst,summary:summary[s],matchups:results[s]}]))};
fs.writeFileSync(new URL('./native_reactive_bot_results.json',import.meta.url),JSON.stringify(output,null,2));
const pct=n=>`${(n*100).toFixed(1)}%`,lines=['# Optimización reactiva preservando la lógica nativa','',`- Tiempo: **${elapsed}s** (límite 180s).`,`- Búsqueda: ${candidateEvaluations} evaluaciones, ${searchMatches.toLocaleString('es-AR')} partidas.`,`- Validación: ${validationMatches.toLocaleString('es-AR')} partidas.`,`- Cada rival se probó con su política nativa y con la generación calibrada anterior; dos familias de semillas separadas.`,`- La política nueva solo agrega una respuesta cuando la política nativa no ejecuta una acción. Observa ataques en vuelo, mejoras económicas y defensas recientes.`, '', '| Bot | Nueva vs nativa | Nueva vs gen. previa | Cambio vs nativa | Cambio vs previa |','|---|---:|---:|---:|---:|'];
for(const s of strategies){const x=summary[s];lines.push(`| ${s} | ${pct(x.reactiveMean)} | ${pct(x.previousMean)} | ${pct(x.deltaVsNative)} | ${pct(x.deltaVsPrevious)} |`);}lines.push('','Las cifras son puntuación por partida (victoria=1, empate=0,5, derrota=0), no estimaciones con significación estadística. Para elegir una versión final también se revisan los cruces individuales y el peor rival.','','## Parámetros elegidos','');for(const s of strategies)lines.push(`- **${s}:** ${Object.entries(bestByBot[s].genome).map(([k,v])=>`${k}=${v}`).join(', ')}.`);lines.push('','','## Cruces detallados','');for(const s of strategies){lines.push(`### ${s}`,'');for(const opp of strategies.filter(x=>x!==s)){const vals=[];for(const mode of ['native','previous'])for(const fam of Object.keys(seedFamilies)){const x=results[s][opp][mode][fam];vals.push(`${mode}/${fam}: nativa ${pct(x.native)}, previa ${pct(x.previous)}, reactiva ${pct(x.reactive)}`);}lines.push(`- ${opp}: ${vals.join('; ')}.`);}lines.push('');}fs.writeFileSync(new URL('./native_reactive_bot_results.md',import.meta.url),lines.join('\n'));
console.log(JSON.stringify({elapsedSeconds:elapsed,candidateEvaluations,searchMatches,validationMatches,summary},null,2));
