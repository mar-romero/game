/* Empire civilizations, research catalog, building data and research paths. */
(function attachEmpireCatalog(root) {
const CIVS={
 forge:{name:'FORJA',icon:'⚒',desc:'Expansión industrial. Edificios 10% más baratos.',bonus:'-10% costo de edificios',factory:'Edificios -10% costo',pvp:'Mejoras económicas -7% costo · ataques +8% costo'},
 bastion:{name:'BASTIÓN',icon:'⬡',desc:'Eficiencia industrial. Producción persistente +8%.',bonus:'+8% producción industrial',factory:'Producción industrial +8%',pvp:'Escudos +14% resistencia · mejoras económicas +6% costo'},
 swarm:{name:'ENJAMBRE',icon:'↗',desc:'Volumen operativo. Contratos 10% más rápidos.',bonus:'-10% duración de contratos',factory:'Contratos -10% duración',pvp:'Ataques -12% costo · defensas +12% costo'},
 nexus:{name:'NEXO',icon:'⌁',desc:'Tecnología. Investigación 10% más barata.',bonus:'-10% costo de investigación',factory:'Investigación -10% costo',pvp:'Sabotaje -26% costo · ataques +4% costo'}
};
const RESEARCH={
 // Las tecnologías de Arena se investigan en la Megafábrica y se muestran
 // dentro de la partida como opciones desbloqueadas; el coste de uso sigue siendo de Arena.
 eco_output:{name:'Economía · Producción optimizada',category:'ECONOMÍA',cost:130,gain:'+10% ingreso al construir módulo',desc:'Desbloquea una evolución económica de Arena para aumentar el ingreso temporal.'},
 eco_speed:{name:'Economía · Obra acelerada',category:'ECONOMÍA',cost:115,gain:'Obras económicas más breves',desc:'Desbloquea una evolución que reduce el tiempo y la penalización de ingreso durante una mejora.'},
 eco_discount:{name:'Economía · Costos optimizados',category:'ECONOMÍA',cost:145,gain:'Mejoras económicas más baratas',desc:'Desbloquea una evolución que reduce el costo del siguiente nivel económico.'},
 eco_storage:{name:'Economía · Almacén ampliado',category:'ECONOMÍA',cost:100,gain:'Más capacidad de reserva',desc:'Desbloquea una evolución de almacenamiento; no aumenta el ingreso por segundo.'},
 eco_recovery:{name:'Economía · Protocolos de recuperación',category:'ECONOMÍA',cost:125,gain:'Recuperación parcial de inversión',desc:'Desbloquea una evolución que devuelve parte del costo si una obra se interrumpe.'},
 rocket_efficiency:{name:'Cohetes · Munición eficiente',category:'COHETES',cost:125,gain:'Cohetes más baratos',desc:'Desbloquea una evolución para reducir el costo de los cohetes.'},
 rocket_line:{name:'Cohetes · Línea de montaje rápida',category:'COHETES',cost:140,gain:'Fabricación más rápida',desc:'Desbloquea una evolución para acortar el tiempo de fabricación militar.'},
 rocket_propulsion:{name:'Cohetes · Propulsión avanzada',category:'COHETES',cost:135,gain:'Menor tiempo de vuelo',desc:'Desbloquea una evolución que reduce el tiempo de viaje de los cohetes.'},
 rocket_payload:{name:'Cohetes · Carga reforzada',category:'COHETES',cost:160,gain:'Más daño',desc:'Desbloquea una evolución que aumenta el daño de los ataques.'},
 rocket_capacity:{name:'Cohetes · Línea militar ampliada',category:'COHETES',cost:150,gain:'Más órdenes militares en curso',desc:'Desbloquea capacidad adicional de fabricación militar.'},
 rocket_piercing:{name:'Cohetes · Cabeza perforante',category:'COHETES',cost:155,gain:'Perfora parte del escudo',desc:'Desbloquea una variante que atraviesa escudos a cambio de menor daño directo.'},
 rocket_burst:{name:'Cohetes · Carga de ráfaga',category:'COHETES',cost:150,gain:'Varios impactos pequeños',desc:'Desbloquea una variante de impactos múltiples, con daño parcialmente desperdiciado contra escudos pequeños.'},
 rocket_decoy:{name:'Cohetes · Señuelo',category:'COHETES',cost:120,gain:'Presiona la defensa rival',desc:'Desbloquea un señuelo de bajo daño que busca provocar una respuesta defensiva.'},
 shield_strength:{name:'Escudos · Blindaje reforzado',category:'ESCUDOS',cost:145,gain:'Más absorción por escudo',desc:'Desbloquea una evolución para aumentar la potencia de cada escudo.'},
 shield_capacity:{name:'Escudos · Batería ampliada',category:'ESCUDOS',cost:135,gain:'Más capacidad acumulable',desc:'Desbloquea una evolución para elevar el límite total de escudo.'},
 shield_duration:{name:'Escudos · Campo persistente',category:'ESCUDOS',cost:120,gain:'Mayor duración',desc:'Desbloquea una evolución para prolongar la duración de los escudos.'},
 shield_charge:{name:'Escudos · Carga acelerada',category:'ESCUDOS',cost:130,gain:'Carga defensiva más rápida',desc:'Desbloquea una evolución que acorta el tiempo de preparación.'},
 shield_efficiency:{name:'Escudos · Materiales eficientes',category:'ESCUDOS',cost:125,gain:'Escudos más baratos',desc:'Desbloquea una evolución que reduce el costo defensivo.'},
 shield_anti_fast:{name:'Escudos · Campo antirrápidos',category:'ESCUDOS',cost:140,gain:'Especializado contra cohetes rápidos',desc:'Desbloquea un escudo eficaz contra cohetes rápidos y menos eficaz contra pesados.'},
 shield_anti_heavy:{name:'Escudos · Campo antipesados',category:'ESCUDOS',cost:140,gain:'Especializado contra pesados',desc:'Desbloquea un escudo eficaz contra cohetes pesados y menos eficaz contra rápidos.'},
 shield_emergency:{name:'Escudos · Reactor de emergencia',category:'ESCUDOS',cost:165,gain:'Escudo pequeño de respuesta rápida',desc:'Desbloquea una defensa de emergencia con costo alto y recarga prolongada.'},
 sabotage_economy:{name:'Sabotaje · Interferencia económica',category:'SABOTAJE',cost:150,gain:'Reduce ingresos rivales',desc:'Desbloquea una interferencia económica breve y anunciada.'},
 sabotage_industry:{name:'Sabotaje · Interferencia industrial',category:'SABOTAJE',cost:145,gain:'Ralentiza fabricación rival',desc:'Desbloquea una interferencia de producción breve y anunciada.'},
 sabotage_shield:{name:'Sabotaje · Perturbación de escudos',category:'SABOTAJE',cost:160,gain:'Retrasa una carga defensiva',desc:'Desbloquea una interferencia especializada contra la preparación de escudos.'},
 sabotage_node:{name:'Sabotaje · Perturbación del nodo',category:'SABOTAJE',cost:145,gain:'Retrasa refuerzos enemigos',desc:'Desbloquea una interferencia que retrasa guardianes sin capturar el nodo.'},
 sabotage_detection:{name:'Sabotaje · Detección temprana',category:'SABOTAJE',cost:130,gain:'Aviso anticipado',desc:'Desbloquea información temprana sobre sabotajes entrantes.'},
 sabotage_counter:{name:'Sabotaje · Contramedidas',category:'SABOTAJE',cost:150,gain:'Reduce efecto o duración',desc:'Desbloquea una defensa que reduce el efecto de sabotajes recibidos.'},
 sabotage_decoy:{name:'Sabotaje · Señuelo electrónico',category:'SABOTAJE',cost:135,gain:'Distorsiona escaneos',desc:'Desbloquea un señuelo informativo; no altera los valores reales.'},
 node_deploy:{name:'Nodo · Despliegue rápido',category:'NODO',cost:130,gain:'Guardianes llegan antes',desc:'Desbloquea despliegues más rápidos hacia el nodo.'},
 node_logistics:{name:'Nodo · Logística de guardianes',category:'NODO',cost:125,gain:'Oleadas más baratas',desc:'Desbloquea un costo menor para enviar guardianes.'},
 node_reserve:{name:'Nodo · Reserva de guardianes',category:'NODO',cost:155,gain:'Mayor capacidad de fuerzas',desc:'Desbloquea más capacidad para desplegar o sostener guardianes.'},
 node_reinforce:{name:'Nodo · Refuerzos eficientes',category:'NODO',cost:140,gain:'Refuerzo propio más rápido',desc:'Desbloquea una respuesta más rápida para reforzar el nodo propio.'},
 node_intel:{name:'Nodo · Exploración',category:'NODO',cost:120,gain:'Mejor lectura de fuerzas',desc:'Desbloquea información más precisa de fuerzas y oleadas rivales.'},
 node_retreat:{name:'Nodo · Retirada ordenada',category:'NODO',cost:135,gain:'Recupera parte del costo',desc:'Desbloquea una retirada que recupera parte de la inversión en guardianes.'},
 node_fortify:{name:'Nodo · Fortificación',category:'NODO',cost:150,gain:'Mejor defensa del nodo',desc:'Desbloquea una ventaja defensiva limitada al sostener el nodo.'},
 node_income:{name:'Nodo · Explotación',category:'NODO',cost:145,gain:'Más ingreso por control',desc:'Desbloquea un aumento acotado al ingreso por controlar el nodo.'},
 missile_breaker:{name:'Misil · Rompeescudos',cost:80,gain:'MEJOR VS ESCUDOS',desc:'Doctrina PvP horizontal: perfora mejor escudos, a cambio de menor presión directa al núcleo. No aumenta poder bruto de Ranked.'},
 missile_siege:{name:'Misil · Asedio',cost:110,gain:'MÁS PRESIÓN AL NÚCLEO',desc:'Doctrina PvP horizontal: amenaza más al núcleo, pero viaja más lento y deja más tiempo de respuesta.'},
 missile_fast:{name:'Misil · Impacto rápido',cost:95,gain:'MENOS TIEMPO DE REACCIÓN',desc:'Doctrina PvP horizontal: llega antes, pero sacrifica daño. Sirve para tempo y castigar ventanas.'},
 blueprint_armory:{name:'Plano · Armería II',cost:120,gain:'DESBLOQUEA ARMERÍA II EN ARENA',desc:'Permite pagar y construir Armería II durante una partida: mejora el daño de los cohetes.'},
 blueprint_refinery:{name:'Plano · Refinería II',cost:110,gain:'DESBLOQUEA REFINERÍA II EN ARENA',desc:'Permite pagar y construir Refinería II durante una partida: aumenta el ingreso temporal.'},
 blueprint_shield:{name:'Plano · Escudos II',cost:110,gain:'DESBLOQUEA ESCUDOS II EN ARENA',desc:'Permite pagar y construir Escudos II durante una partida: mejora la fabricación y resistencia defensiva.'},
 blueprint_control:{name:'Plano · Control II',cost:100,gain:'DESBLOQUEA CONTROL II EN ARENA',desc:'Permite pagar y construir Control II durante una partida: mejora el control territorial y la duración del sabotaje.'},
 recon:{name:'Reconocimiento',cost:70,gain:'LEER AL RIVAL',desc:'Desbloquea Intel previo a Arena y lectura de tendencias. Da información, no estadísticas de combate.'},
 logistics:{name:'Logística',cost:120,gain:'+8% PRODUCCIÓN',desc:'+8% a toda la producción de la Megafábrica. No modifica producción, daño ni HP dentro de Ranked.'},
 archive:{name:'Archivo tecnológico',cost:150,gain:'-5% COSTO FUTURO',desc:'Después de prestigiar, las investigaciones futuras cuestan 5% menos. El Archivo se conserva al ascender.'}
};
const RESEARCH_PATHS={
 economy:[['eco_output'],['eco_discount'],['eco_speed'],['eco_storage','eco_recovery']],
 rockets:[['rocket_efficiency'],['rocket_line','rocket_propulsion'],['rocket_payload'],['rocket_capacity','rocket_piercing','rocket_burst','rocket_decoy','missile_breaker','missile_siege','missile_fast']],
 defense:[['shield_efficiency'],['shield_charge','shield_duration'],['shield_strength','shield_capacity'],['shield_anti_fast','shield_anti_heavy','shield_emergency']],
 intel:[['node_intel','sabotage_detection'],['node_logistics','node_deploy','node_reinforce'],['sabotage_economy','sabotage_industry','sabotage_shield','sabotage_node','sabotage_counter','sabotage_decoy'],['node_fortify','node_reserve','node_retreat','node_income']]
};
const RESEARCH_BRANCH_LABELS={economy:'ECONOMÍA',rockets:'COHETES',defense:'DEFENSA',intel:'INVESTIGACIÓN'};
function researchPathInfo(k){for(const [branch,tiers] of Object.entries(RESEARCH_PATHS)){const tier=tiers.findIndex(ids=>ids.includes(k));if(tier>=0)return {branch,tier:tier+1,tiers};}if(['recon','logistics'].includes(k))return{branch:'intel',tier:1,tiers:RESEARCH_PATHS.intel};return null;}
function researchCountForBranch(research,branch){return research.filter(k=>researchPathInfo(k)?.branch===branch).length;}
function researchLockReason(research,k){const branch=researchPathInfo(k)?.branch;return branch&&researchCountForBranch(research,branch)>=4?`Límite de 4 investigaciones en ${RESEARCH_BRANCH_LABELS[branch]}`:'';}
const BUILDINGS={
 generator:{name:'Generadores',base:120,growth:1.55,desc:'Produce Energía',icon:'⚡'},
 refinery:{name:'Refinerías',base:140,growth:1.58,desc:'Produce Acero',icon:'▣'},
 lab:{name:'Laboratorios',base:180,growth:1.62,desc:'Produce Intel',icon:'⌁'},
 automation:{name:'Automatización',base:220,growth:1.65,desc:'Produce Créditos',icon:'◈'}
};

  root.FactoryWars = root.FactoryWars || {};
  root.FactoryWars.EmpireCatalog = { CIVS, RESEARCH, RESEARCH_PATHS, RESEARCH_BRANCH_LABELS, BUILDINGS, researchPathInfo, researchCountForBranch, researchLockReason };
})(window);
