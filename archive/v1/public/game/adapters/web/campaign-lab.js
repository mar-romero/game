"use strict";

/* ================= CAMPAIGN LAB v0.6 ================= */
const CAMPAIGN_CONFIG={
 realSecondsPerDay:3600,
 startingScrap:240,
 startingData:25,
 commandPerDay:3,
 machineBaseCost:180,
 machineGrowth:1.48,
 baseDailyScrap:160,
 machineDailyScrap:110,
 contractHours:6,
 contractScrap:105,
 contractData:16,
 dailyAllRewardScrap:120,
 dailyAllRewardBlueprints:1,
 maxTier:4,
 tierCosts:[null,{scrap:0,blueprints:0},{scrap:650,blueprints:1},{scrap:1600,blueprints:2},{scrap:3600,blueprints:4}],
 researchBaseCost:40,
 prestigeTier:4,
 prestigeMachines:10
};
const WEEKLY_PATCHES=[
 {version:"0.6.0",title:"Fundación industrial",text:"Economía exterior + PvP normalizado. Medimos si el jugador entiende qué progreso es permanente y qué poder se resetea en cada combate.",contractMult:1,machineCostMult:1},
 {version:"0.6.1",title:"Frontera energética",text:"Los contratos pagan +20% y el nodo territorial pasa a ser la fuente principal de bonus de actividad. Hipótesis: más razones para entrar al PvP sin forzar combate constante.",contractMult:1.2,machineCostMult:1},
 {version:"0.6.2",title:"Guerra electrónica",text:"Más datos por contratos y una ruta de CONTROL más valiosa. Hipótesis: sabotaje e información sostienen variedad sin daño económico permanente.",contractMult:1.12,machineCostMult:.95},
 {version:"0.6.3",title:"Era de automatización",text:"Las máquinas son 10% más baratas y el complejo 3D crece más rápido. Hipótesis: acelerar el fantasy incremental aumenta retorno sin romper el PvP.",contractMult:1.05,machineCostMult:.9}
];
let campaign=null,campaignTimer=null,metaThree=null;
function campaignDefault(){return {day:1,progress:0,week:1,speed:60,scrap:CAMPAIGN_CONFIG.startingScrap,data:CAMPAIGN_CONFIG.startingData,blueprints:0,machines:1,tier:1,archives:0,command:CAMPAIGN_CONFIG.commandPerDay,rating:1000,research:{industry:0,warfare:0,defense:0,control:0},objectives:{build:false,contract:false,pvp:false},contract:null,log:[{day:1,text:"La megafábrica abrió operaciones."}],patchIndex:0,pendingPatch:false,lastReal:Date.now()};}
function loadCampaign(){try{campaign=JSON.parse(localStorage.getItem("factory-wars-campaign-v06"));}catch(_){campaign=null}if(!campaign||!campaign.research)campaign=campaignDefault(); const now=Date.now(); const offline=Math.min(3600,(now-(campaign.lastReal||now))/1000); if(offline>1){advanceCampaign(offline/3600,false);} campaign.lastReal=now;saveCampaign();}
function saveCampaign(){if(!campaign)return;campaign.lastReal=Date.now();try{localStorage.setItem("factory-wars-campaign-v06",JSON.stringify(campaign));}catch(_){} }
function patch(){return WEEKLY_PATCHES[Math.min(campaign.patchIndex,WEEKLY_PATCHES.length-1)];}
function machineCost(){return Math.round(CAMPAIGN_CONFIG.machineBaseCost*Math.pow(CAMPAIGN_CONFIG.machineGrowth,Math.max(0,campaign.machines-1))*patch().machineCostMult);}
function dailyOutput(){return Math.round((CAMPAIGN_CONFIG.baseDailyScrap+campaign.machines*CAMPAIGN_CONFIG.machineDailyScrap)*(1+campaign.research.industry*.10)*(1+campaign.archives*.12));}
function researchCost(branch){return Math.round(CAMPAIGN_CONFIG.researchBaseCost*Math.pow(1.72,campaign.research[branch]));}
function campaignLog(text){campaign.log.push({day:campaign.day,text});if(campaign.log.length>30)campaign.log=campaign.log.slice(-30);}
function gameHour(){return campaign.progress*24;}
function formatGameHour(){const h=Math.floor(gameHour()),m=Math.floor((gameHour()-h)*60);return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;}
function completeDay(){const all=campaign.objectives.build&&campaign.objectives.contract&&campaign.objectives.pvp;if(all){campaign.scrap+=CAMPAIGN_CONFIG.dailyAllRewardScrap;campaign.blueprints+=CAMPAIGN_CONFIG.dailyAllRewardBlueprints;campaignLog(`Protocolo diario perfecto: +${CAMPAIGN_CONFIG.dailyAllRewardScrap} chatarra y +1 plano.`);}else{const n=Object.values(campaign.objectives).filter(Boolean).length;campaignLog(`Cierre del día: ${n}/3 objetivos completados.`);}campaign.day++;campaign.week=Math.floor((campaign.day-1)/7)+1;campaign.command=CAMPAIGN_CONFIG.commandPerDay;campaign.objectives={build:false,contract:false,pvp:false};if((campaign.day-1)%7===0){campaign.pendingPatch=true;campaignLog(`Semana ${campaign.week}: nuevo update disponible.`);setTimeout(showWeeklyPatch,100);} }
function advanceCampaign(days,renderNow=true){if(!campaign)return;let remain=days;while(remain>0){const step=Math.min(remain,1-campaign.progress);const before=campaign.progress;campaign.progress+=step;campaign.scrap+=dailyOutput()*step; if(campaign.contract){campaign.contract.remaining-=step*24;if(campaign.contract.remaining<=0){const mult=patch().contractMult;const s=Math.round((CAMPAIGN_CONFIG.contractScrap+campaign.research.defense*8)*mult),d=Math.round((CAMPAIGN_CONFIG.contractData+campaign.research.control*4)*mult);campaign.scrap+=s;campaign.data+=d;campaign.objectives.contract=true;campaignLog(`Contrato completado: +${s} chatarra, +${d} datos.`);campaign.contract=null;}}
 remain-=step;if(campaign.progress>=.999999){campaign.progress=0;completeDay();}}
 saveCampaign();if(renderNow)renderCampaign();}
function campaignTick(){if(!campaign||document.body.classList.contains("show-match"))return;const now=Date.now();let dt=(now-(campaign.lastReal||now))/1000;campaign.lastReal=now;dt=Math.min(dt,2);advanceCampaign(dt*campaign.speed/CAMPAIGN_CONFIG.realSecondsPerDay,true);}
function buyMachine(){const c=machineCost();if(campaign.scrap<c)return;campaign.scrap-=c;campaign.machines++;campaign.objectives.build=true;campaignLog(`Máquina #${campaign.machines} instalada. Producción diaria aumentó.`);saveCampaign();renderCampaign();rebuildMetaFactory();}
function tierUp(){if(campaign.tier>=CAMPAIGN_CONFIG.maxTier)return;const next=campaign.tier+1,c=CAMPAIGN_CONFIG.tierCosts[next];if(campaign.scrap<c.scrap||campaign.blueprints<c.blueprints)return;campaign.scrap-=c.scrap;campaign.blueprints-=c.blueprints;campaign.tier=next;campaignLog(`Complejo expandido a Era ${next}.`);saveCampaign();renderCampaign();rebuildMetaFactory();}
function startContract(){if(campaign.contract||campaign.command<=0)return;campaign.command--;campaign.contract={remaining:CAMPAIGN_CONFIG.contractHours,name:["Recuperación orbital","Convoy mineral","Reparación de frontera","Auditoría de reactor"][Math.floor(Math.random()*4)]};campaignLog(`Contrato enviado: ${campaign.contract.name}.`);saveCampaign();renderCampaign();}
function buyResearch(branch){const c=researchCost(branch);if(campaign.data<c)return;campaign.data-=c;campaign.research[branch]++;campaignLog(`${branch.toUpperCase()} subió a nivel ${campaign.research[branch]}.`);saveCampaign();renderCampaign();}
function canPrestige(){return campaign.tier>=CAMPAIGN_CONFIG.prestigeTier&&campaign.machines>=CAMPAIGN_CONFIG.prestigeMachines;}
function prestigeCampaign(){if(!canPrestige())return;const gain=1+Math.floor((campaign.machines-10)/4);campaign.archives+=gain;campaign.scrap=CAMPAIGN_CONFIG.startingScrap;campaign.data=Math.round(campaign.data*.35);campaign.blueprints=0;campaign.machines=1;campaign.tier=1;campaign.research={industry:0,warfare:0,defense:0,control:0};campaignLog(`Prestigio industrial: +${gain} archivo(s). Nuevo ciclo con +${gain*12}% producción acumulativa.`);saveCampaign();renderCampaign();rebuildMetaFactory();}
function showWeeklyPatch(){if(!campaign||!campaign.pendingPatch)return;const nextIndex=Math.min(campaign.patchIndex+1,WEEKLY_PATCHES.length-1),p=WEEKLY_PATCHES[nextIndex];$("weeklyModal").classList.remove("hidden");$("weeklyModalVersion").textContent=`UPDATE ${p.version}`;$("weeklyModalTitle").textContent=p.title;$("weeklyModalText").textContent=p.text;$("weeklyModalInstall").dataset.index=String(nextIndex);}
function installWeeklyPatch(){const idx=Number($("weeklyModalInstall").dataset.index||campaign.patchIndex);campaign.patchIndex=idx;campaign.pendingPatch=false;campaignLog(`Update ${patch().version} instalado: ${patch().title}.`);$("weeklyModal").classList.add("hidden");saveCampaign();renderCampaign();}
function renderCampaign(){if(!campaign)return;const p=patch();$("campDayLabel").textContent=`DÍA ${campaign.day} · SEMANA ${campaign.week}`;$("campClockLabel").textContent=`${formatGameHour()} · ${gameHour()<6?"turno nocturno":gameHour()<12?"mañana industrial":gameHour()<18?"turno de producción":"cierre operativo"}`;$("campDayProgress").style.width=(campaign.progress*100)+"%";$("campScrap").textContent=money(campaign.scrap);$("campData").textContent=money(campaign.data);$("campBlueprints").textContent=campaign.blueprints;$("campCommand").textContent=`${campaign.command}/${CAMPAIGN_CONFIG.commandPerDay}`;$("campRating").textContent=campaign.rating;$("metaTierLabel").textContent=["","TALLER · I","INDUSTRIA · II","AUTOMATIZACIÓN · III","SINGULARIDAD · IV"][campaign.tier];$("metaOutputLabel").textContent=`+${dailyOutput()} chatarra/día`;
 document.querySelectorAll("[data-cspeed]").forEach(b=>b.classList.toggle("active",Number(b.dataset.cspeed)===campaign.speed));$("machineCostLabel").textContent=`${money(machineCost())} chatarra`;$("buildMachineBtn").disabled=campaign.scrap<machineCost(); const nc=campaign.tier<CAMPAIGN_CONFIG.maxTier?CAMPAIGN_CONFIG.tierCosts[campaign.tier+1]:null;$("tierCostLabel").textContent=nc?`${money(nc.scrap)} + ${nc.blueprints} plano(s)`:"ERA MÁXIMA";$("tierUpBtn").disabled=!nc||campaign.scrap<nc.scrap||campaign.blueprints<nc.blueprints;$("contractBtn").disabled=!!campaign.contract||campaign.command<=0;$("prestigeBtn").disabled=!canPrestige();$("prestigeLabel").textContent=canPrestige()?`+${1+Math.floor((campaign.machines-10)/4)} archivo(s)`:"Tier IV + 10 máquinas";
 const cc=$("contractCard");cc.classList.toggle("hidden",!campaign.contract);if(campaign.contract){$("contractName").textContent=campaign.contract.name;$("contractEta").textContent=`${Math.max(0,campaign.contract.remaining).toFixed(1)} h restantes`;$("contractReward").textContent=`Recompensa base: ${Math.round(CAMPAIGN_CONFIG.contractScrap*p.contractMult)} chatarra + ${Math.round(CAMPAIGN_CONFIG.contractData*p.contractMult)} datos`;$("contractProgress").style.width=((1-campaign.contract.remaining/CAMPAIGN_CONFIG.contractHours)*100)+"%";}
 for(const [id,key] of [["objBuild","build"],["objContract","contract"],["objPvp","pvp"]]){const el=$(id),done=campaign.objectives[key];el.classList.toggle("done",done);el.querySelector(".state").textContent=done?"HECHO":"PENDIENTE";}
 document.querySelectorAll(".research-btn").forEach(b=>{const k=b.dataset.research,l=campaign.research[k],c=researchCost(k);b.querySelector("b").textContent=`${k.toUpperCase()} · NIVEL ${l}`;b.querySelector("em").textContent=`${c} datos`;b.disabled=campaign.data<c;});
 const dayInWeek=((campaign.day-1)%7)+1;$("weekStrip").innerHTML=Array.from({length:7},(_,i)=>`<div class="week-day ${i+1<dayInWeek?'complete':i+1===dayInWeek?'current':''}">D${i+1}</div>`).join("");$("patchVersion").textContent=`PATCH ${p.version}`;$("patchTitle").textContent=p.title;$("patchText").textContent=p.text;$("campaignLog").innerHTML=campaign.log.slice(-10).reverse().map(x=>`<div><b>Día ${x.day}</b> · ${x.text}</div>`).join(""); if(campaign.pendingPatch)setTimeout(showWeeklyPatch,50);updateMetaFactoryVisual();}
function startPvPAgain(){if(!$('civA').value)$('civA').value='forge';if(!$('civB').value)$('civB').value='swarm';if(!$('botB').value)$('botB').value='BALANCED';$('mode').value='human';$('learning').value='free';start();}
function enterPvpSetup(){document.body.classList.add("show-pvp-setup");document.body.classList.remove("show-match");$("setup").classList.remove("hidden");window.scrollTo({top:0,behavior:"smooth"});}
function returnToArenaSetup(){if(loopHandle)clearInterval(loopHandle);loopHandle=null;match=null;clearSelections();document.body.classList.remove("show-match");$("game").classList.add("hidden");enterPvpSetup();}
/* ---------- 3D MEGAFACTORY ---------- */
function safeInitMetaThree(){
 try{
  initMetaThree();
  const n=$("meta3dNotice");
  if(n)n.classList.toggle("hidden",!!metaThree);
 }catch(err){
  console.error("Factory Wars: no se pudo iniciar la megafábrica 3D",err);
  metaThree=null;
  const n=$("meta3dNotice");if(n)n.classList.remove("hidden");
 }
}
function initMetaThree(){if(metaThree||typeof THREE==="undefined")return;const cv=$("metaCanvas");if(!cv)return;const scene=new THREE.Scene();scene.background=new THREE.Color(0x07111a);scene.fog=new THREE.FogExp2(0x07111a,.045);const camera=new THREE.PerspectiveCamera(42,1,.1,100);camera.position.set(9,9,12);camera.lookAt(0,0,0);const renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,powerPreference:"high-performance"});renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));renderer.shadowMap.enabled=true;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;scene.add(new THREE.HemisphereLight(0x8ee7ff,0x091018,1.3));const dl=new THREE.DirectionalLight(0xffffff,2.1);dl.position.set(4,10,6);dl.castShadow=true;scene.add(dl);const glow=new THREE.PointLight(0x54f3d1,14,15,2);glow.position.set(0,3,0);scene.add(glow);const ground=new THREE.Mesh(new THREE.CylinderGeometry(5.5,5.9,.45,10),new THREE.MeshStandardMaterial({color:0x13202c,metalness:.65,roughness:.38}));ground.position.y=-.25;ground.receiveShadow=true;scene.add(ground);const grid=new THREE.GridHelper(11,11,0x31566a,0x172f3e);grid.position.y=.01;scene.add(grid);const factory=new THREE.Group();scene.add(factory);const particles=[];for(let i=0;i<30;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.035,6,4),new THREE.MeshBasicMaterial({color:0x82ffe1}));scene.add(m);particles.push(m);}metaThree={scene,camera,renderer,factory,particles,t:0,lastMachines:-1,lastTier:-1};rebuildMetaFactory();requestAnimationFrame(metaThreeLoop);}
function rebuildMetaFactory(){if(!metaThree||!campaign)return;const g=metaThree.factory;while(g.children.length)g.remove(g.children[0]);const dark=new THREE.MeshStandardMaterial({color:0x1b2b38,metalness:.72,roughness:.3}),metal=new THREE.MeshStandardMaterial({color:0x32596a,metalness:.66,roughness:.27}),gold=new THREE.MeshStandardMaterial({color:0xb88138,emissive:0x55320e,emissiveIntensity:.8,metalness:.5,roughness:.28});function box(x,y,z,sx,sy,sz,mat){const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat);m.position.set(x,y,z);m.castShadow=true;g.add(m);return m}function cyl(x,y,z,r,h,mat){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,12),mat);m.position.set(x,y,z);m.castShadow=true;g.add(m);return m}
 cyl(0,.65,0,1.1,1.3,dark);const core=new THREE.Mesh(new THREE.IcosahedronGeometry(.62,1),new THREE.MeshStandardMaterial({color:0x9fffea,emissive:0x39ffce,emissiveIntensity:2.5,roughness:.12}));core.position.y=1.55;core.userData.core=true;g.add(core);const ring=new THREE.Mesh(new THREE.TorusGeometry(1.05,.07,10,48),new THREE.MeshBasicMaterial({color:0x74f6dc}));ring.rotation.x=Math.PI/2;ring.position.y=1.5;ring.userData.ring=true;g.add(ring);
 const count=Math.min(18,campaign.machines);for(let i=0;i<count;i++){const a=(i/count)*Math.PI*2+(i%2)*.12,r=2.1+(i%3)*.7,x=Math.cos(a)*r,z=Math.sin(a)*r;box(x,.25,z,.75,.5,.75,i%4===0?gold:metal);if(i%2===0)cyl(x,.75,z,.16,.65,gold);if(i%3===0){const pipe=box(x*.62,.18,z*.62,Math.abs(x)*.7+.25,.12,.12,metal);pipe.lookAt(x,.18,z);}}
 for(let t=2;t<=campaign.tier;t++){const r=3.25+(t-2)*.65;for(let j=0;j<4;j++){const a=j*Math.PI/2+Math.PI/4;const tower=cyl(Math.cos(a)*r,.7,Math.sin(a)*r,.32,1.4+(t*.22),dark);box(Math.cos(a)*r,1.55+(t*.12),Math.sin(a)*r,.55,.18,.55,gold);}}
 metaThree.lastMachines=campaign.machines;metaThree.lastTier=campaign.tier;}
function updateMetaFactoryVisual(){if(metaThree&&(metaThree.lastMachines!==campaign.machines||metaThree.lastTier!==campaign.tier))rebuildMetaFactory();}
function metaThreeLoop(ts){if(!metaThree)return;const T=metaThree,cv=$("metaCanvas"),r=cv.getBoundingClientRect();if(r.width>10&&r.height>10){T.renderer.setSize(r.width,r.height,false);T.camera.aspect=r.width/r.height;T.camera.updateProjectionMatrix();T.t=ts*.001;const core=T.factory.children.find(x=>x.userData.core),ring=T.factory.children.find(x=>x.userData.ring);if(core){core.rotation.y=T.t*.55;core.position.y=1.55+Math.sin(T.t*2)*.05}if(ring)ring.rotation.z=T.t*.35;T.factory.rotation.y=Math.sin(T.t*.12)*.18;T.particles.forEach((m,i)=>{const a=T.t*(.25+(i%4)*.03)+i*.63,rad=2+(i%7)*.45;m.position.set(Math.cos(a)*rad,.45+(i%5)*.22,Math.sin(a)*rad)});T.renderer.render(T.scene,T.camera);}requestAnimationFrame(metaThreeLoop);}

