import fs from 'node:fs';
import { createFactory,executeCommand,advanceFactory,canPrestige,availableResearch, projectCost,contractCost,contractReward,contractDuration,buildingCost,productionRates,efficiencyMultiplier,costMultiplier,projectProgress,projectMultiplier } from '../public/game/domain/factory-v2/factory-engine.js';
import { CONTRACTS,PROJECTS,PRODUCTION_MODES,BUILDINGS,PRESTIGE_ROUTES,RESEARCH,OFFLINE_LIMIT_MS,MAX_PRESTIGE_COUNT } from '../public/game/domain/factory-v2/catalog.js';
const dest=process.argv[2]??'resultados-v31';
const cycleCount=Number(process.argv[3]??28);
if(!Number.isSafeInteger(cycleCount)||cycleCount<1||cycleCount>MAX_PRESTIGE_COUNT)throw new Error('La cantidad de ciclos debe ser un entero entre 1 y 100.');
fs.mkdirSync(dest,{recursive:true});
const act=(s,c,t)=>executeCommand(s,c,t).state;
const allCosts=[];for(let p=0;p<=100;p++){
 const s=createFactory(0);s.permanent.prestigeCount=p;s.permanent.research=Object.keys(RESEARCH).slice(0,Math.min(p,28));
 const row={prestige:p,costMultiplier:costMultiplier(s),productionMultiplier:efficiencyMultiplier(s),production:productionRates(s),
 contracts:Object.fromEntries(Object.keys(CONTRACTS).map(id=>[id,{timeSeconds:contractDuration(s,id),cost:contractCost(s,id),reward:contractReward(s,id)}])),
 projects:Object.fromEntries(Object.keys(PROJECTS).map(id=>[id,projectCost(s,id)])),
 upgradeAutomation1to2:buildingCost(s,'automation')};
 allCosts.push(row);
}
const csv=(file,records)=>{if(!records.length)return;const keys=Object.keys(records[0]);fs.writeFileSync(dest+'/'+file,[keys.join(','),...records.map(r=>keys.map(k=>JSON.stringify(r[k]??'')).join(','))].join('\n')+'\n')};
csv('factory_contracts_0_100.csv',allCosts.flatMap(r=>Object.entries(r.contracts).map(([id,c])=>({prestige:r.prestige,contract:id,seconds:c.timeSeconds,creditsCost:c.cost.credits??0,steelCost:c.cost.steel??0,energyCost:c.cost.energy??0,creditsReward:c.reward.credits??0,intelReward:c.reward.intel??0}))));
csv('factory_projects_0_100.csv',allCosts.flatMap(r=>Object.entries(r.projects).map(([id,c])=>({prestige:r.prestige,project:id,...c}))));
csv('factory_industrial_multipliers_0_100.csv',allCosts.map(r=>({prestige:r.prestige,requirementsMultiplier:r.costMultiplier,outputMultiplier:r.productionMultiplier,creditsPerSec:r.production.credits,energyPerSec:r.production.energy,steelPerSec:r.production.steel,intelPerSec:r.production.intel,upgradeAutomationCost:r.upgradeAutomation1to2.credits})));
const variants={
 mixed:{routes:['industrial','logistics','scientific','priority'],projects:['reactor','drones','archive'],modes:['science','commercial','heavy','balanced'],building:['automation','refinery','generator'],contract:['urgent','regular','scientific']},
 industrial:{routes:['industrial'],projects:['drones'],modes:['commercial'],building:['automation'],contract:['urgent']},
 logistics:{routes:['logistics'],projects:['drones'],modes:['heavy'],building:['automation'],contract:['urgent']},
 scientific:{routes:['scientific'],projects:['archive'],modes:['science'],building:['automation'],contract:['urgent']},
 priority:{routes:['priority'],projects:['reactor'],modes:['heavy'],building:['automation'],contract:['freight']},
};
function simulate(policy,stepMs=5000,count=cycleCount){let s=createFactory(0),now=0;const rows=[],failures=[];const eventCounters={upgrades:0,deliveries:0,contractsStarted:0,modeChanges:0};
 for(let p=0;p<count;p++){
  const t0=now,route=policy.routes[p%policy.routes.length];s=act(s,{type:'chooseRoute',id:route},now);
  const project=route==='scientific'?'archive':policy.projects[p%policy.projects.length];s=act(s,{type:'selectProject',id:project},now);
  const mode=policy.modes[p%policy.modes.length]; if(mode!=='balanced'){s=act(s,{type:'setMode',id:mode},now);eventCounters.modeChanges++}
  const routeDef=PRESTIGE_ROUTES[route];let steps=0,contractWaitMs=0,firstProjectBonusAt=null,firstContractStarted=null,allContracts=[],lastCompletion=null;
  while(!canPrestige(s)&&steps++<15000){let changed=false;
   if(s.cycle.upgrades<routeDef.upgrades){try{s=act(s,{type:'upgrade',id:policy.building[p%policy.building.length]},now);changed=true;eventCounters.upgrades++}catch(e){if(!/Faltan recursos/.test(e.message))throw e}}
   if(!changed && !s.cycle.project.completed){try{s=act(s,{type:'deliverProject'},now);changed=true;eventCounters.deliveries++;if(firstProjectBonusAt===null&&projectMultiplier(s)>1)firstProjectBonusAt=(now-t0)/1000;}catch(e){if(!/materiales/.test(e.message))throw e}}
   const special=routeDef.specialContracts&&s.cycle.specialContractsCompleted<routeDef.specialContracts;
   if(!s.cycle.contract&&(s.cycle.contractsCompleted<routeDef.contracts||special)){
    const id=special?'freight':policy.contract[p%policy.contract.length];
    try{const dur=contractDuration(s,id);s=act(s,{type:'startContract',id},now);eventCounters.contractsStarted++;allContracts.push({id,start:(now-t0)/1000,ends:(now-t0)/1000+dur});changed=true;if(firstContractStarted===null)firstContractStarted=(now-t0)/1000;}
    catch(e){if(!/Faltan recursos/.test(e.message))throw e}
   }
   if(changed)continue;
   if(s.cycle.contract)contractWaitMs+=stepMs;
   now+=stepMs;s=advanceFactory(s,now);
  }
  if(!canPrestige(s)){failures.push({prestige:p+1,route,steps,resources:s.cycle.resources});break}
  const research=availableResearch(s)[0]?.[0]??null;s=act(s,{type:'prestige',research},now);
  rows.push({prestige:p+1,route,project,mode,seconds:(now-t0)/1000,minutes:(now-t0)/60000,cumulativeMinutes:now/60000,steps,contracts:allContracts,contractsStarted:allContracts.length,firstContractStarted,firstProjectBonusAt,contractBusySeconds:contractWaitMs/1000});
 }
 return {count:rows.length,totalSeconds:now/1000,rows,failures,actions:eventCounters};
}
const outcomes={};
for(const [key,policy] of Object.entries(variants)){outcomes[key]=simulate(policy)}
const mixed10=simulate(variants.mixed,10000),mixed1=simulate(variants.mixed,1000);
const cadenceComparisons=Object.fromEntries([1000,5000,10000,30000,60000,300000].map(step=>[step,{mixed: simulate(variants.mixed,step),industrial:simulate(variants.industrial,step)}]));
csv(`factory_${cycleCount}_prestiges_by_policy.csv`,Object.entries(outcomes).flatMap(([policy,out])=>out.rows.map(r=>({policy,prestige:r.prestige,route:r.route,project:r.project,mode:r.mode,seconds:r.seconds,cumulativeSeconds:r.cumulativeMinutes*60,contractsStarted:r.contractsStarted,contractBusySeconds:r.contractBusySeconds}))));
const result={meta:{runAt:new Date().toISOString(),engine:'factory-v2 directory / Factory V3.1 schema 2',simulator:'deterministic eager policies, no resource injection, simulated continuous production, actions on 1-10s intervals',maxPrestigeCount:MAX_PRESTIGE_COUNT},initialState:createFactory(0),catalog:{contracts:CONTRACTS,projects:PROJECTS,building:BUILDINGS,modes:PRODUCTION_MODES,routes:PRESTIGE_ROUTES,offlineCapHours:OFFLINE_LIMIT_MS/3600000,baseProjectMilestoneBonus:{at25Pct:0.2,at60Pct:0.5,at100Pct:1}},contractTimings:[0,1,5,10,20,27,28,50,99,100].map(p=>allCosts[p]),policyResults:Object.fromEntries(Object.entries(outcomes).map(([id,r])=>[id,{count:r.count,totalSeconds:r.totalSeconds,failures:r.failures,actions:r.actions,first5:r.rows.slice(0,5),last5:r.rows.slice(-5),fullCycles:r.rows,allCycles:r.rows.map(({prestige,route,seconds,cumulativeMinutes})=>({prestige,route,seconds,cumulativeMinutes}))}])),tenSecondBaseline:{count:mixed10.count,totalSeconds:mixed10.totalSeconds},oneSecondBaseline:{count:mixed1.count,totalSeconds:mixed1.totalSeconds},cadenceComparisons:Object.fromEntries(Object.entries(cadenceComparisons).map(([step,p])=>[step,Object.fromEntries(Object.entries(p).map(([policy,r])=>[policy,{completed:r.count,seconds:r.totalSeconds,actions:r.actions,failures:r.failures}]))])),researchCount:Object.keys(RESEARCH).length,allContracts:allCosts};
fs.writeFileSync(dest+'/factory_measurement_v31.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({contractSecondsAt0:Object.fromEntries(Object.entries(allCosts[0].contracts).map(([id,c])=>[id,c.timeSeconds])),contractSecondsAt28:Object.fromEntries(Object.entries(allCosts[28].contracts).map(([id,c])=>[id,c.timeSeconds])),policies:Object.fromEntries(Object.entries(outcomes).map(([id,r])=>[id,{cycles:r.count,totalMinutes:+(r.totalSeconds/60).toFixed(2),errors:r.failures.length,first5:r.rows.slice(0,5).map(x=>x.seconds),last5:r.rows.slice(-5).map(x=>x.seconds)}])),mixed10Minutes:mixed10.totalSeconds/60,mixed1Minutes:mixed1.totalSeconds/60,outputs:fs.readdirSync(dest).filter(x=>x.startsWith('factory_'))},null,2));
if(Object.values(outcomes).some(x=>x.failures.length)||mixed1.failures.length||mixed10.failures.length||Object.values(cadenceComparisons).some(p=>Object.values(p).some(x=>x.failures.length)))process.exitCode=1;
