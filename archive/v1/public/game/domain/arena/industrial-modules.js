/* Arena industrial module definitions, independent of presentation. */
(function attachIndustrialModules(root) {
  const INDUSTRIAL_MODULES = {
   armory2:{name:"ARMERÍA II",family:"armory",tier:2,minLevel:2,cost:190,build:7,desc:"+15% daño de todos los ataques.",trade:"Consumís el único slot de Industria II y 190 ◈ ahora."},
   refinery2:{name:"REFINERÍA II",family:"refinery",tier:2,minLevel:2,cost:180,build:7,desc:"+16% producción permanente durante la partida.",trade:"Más futuro, menos banco para sobrevivir ahora."},
   shield2:{name:"ESCUDOS II",family:"shield",tier:2,minLevel:2,cost:175,build:6,desc:"+20% absorción y -5% costo defensivo.",trade:"Si el rival no ataca, gran parte de la inversión queda ociosa."},
   control2:{name:"CONTROL II",family:"control",tier:2,minLevel:2,cost:170,build:6,desc:"Nodo más eficiente, captura -12% y sabotaje +3 s.",trade:"No aumenta tu daño directo ni tu producción fuera del nodo."},
   armory3_salvo:{name:"ARMERÍA III · SALVAS",family:"armory",tier:3,minLevel:3,cost:255,build:8,requires:"armory2",group:"armory3",desc:"Cohete rápido +18% daño; costo +8%.",trade:"Presión frecuente, pero cada ciclo consume más economía."},
   armory3_siege:{name:"ARMERÍA III · ASEDIO",family:"armory",tier:3,minLevel:3,cost:265,build:9,requires:"armory2",group:"armory3",desc:"Pesado +30% daño, pero tarda +3 s y recarga +4 s.",trade:"Amenaza enorme y muy telegráfica: si falla, quedás expuesto."},
   refinery3_compound:{name:"REFINERÍA III · COMPOUND",family:"refinery",tier:3,minLevel:3,cost:250,build:8,requires:"refinery2",desc:"Tras 20 s sin daño, producción escala gradualmente hasta +24%.",trade:"Un impacto al núcleo reinicia el bonus compuesto."},
   shield3_reactive:{name:"ESCUDOS III · REACTIVO",family:"shield",tier:3,minLevel:3,cost:245,build:8,requires:"shield2",desc:"Bloquear completamente un ataque devuelve parte de la energía.",trade:"Solo genera valor si anticipás correctamente el ataque."},
   control3_interference:{name:"CONTROL III · INTERFERENCIA",family:"control",tier:3,minLevel:3,cost:240,build:8,requires:"control2",desc:"Con el nodo: sabotaje recarga 30% más rápido y bonus territorial mayor.",trade:"Depende de conservar el centro; si lo perdés, cae su valor."}
  };
  root.FactoryWars = root.FactoryWars || {};
  root.FactoryWars.IndustrialModules = INDUSTRIAL_MODULES;
  root.INDUSTRIAL_MODULES = INDUSTRIAL_MODULES;
})(window);
