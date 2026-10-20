using System;

namespace FactoryWars.Unity6
{
    // Values copied from public/game/domain/arena-v2/balance.js. No power comes from factory resources.
    internal sealed class ArenaModule
    {
        public string Id;
        public string Name;
        public float Cost;
        public float Cooldown;
        public float Damage;
        public float Travel;
        public float Shots;
        public float Bypass;
        public string Detail;
        public float ShieldMultiplier;
        public float ShieldDelay;
        public float EffectDuration;
        public float Spacing;
        public float ExposedMultiplier;
        public float GuardianDelay;
        public float Capacity;
        public float Duration;
        public float Delay;
        public float Reduction;
        public float MultiReduction;
        public float BypassReduction;
        public float Regen;
        public float RegenWait;
        public float Reflect;
        public float CapacityMultiplier;
        public float EmergencyThreshold;
        public float Penalty;
        public string Effect;
        public bool Targeted;
        public bool SlotTargeted;
    }

    internal static class ArenaCatalog
    {
        public static readonly string[] Families = { "rockets", "shields", "sabotage" };
        public static readonly string[] Names = { "COHETES", "ESCUDOS", "SABOTAJE" };
        public static readonly int[] CandidateCounts = { 4, 4, 3 }, ActiveCounts = { 2, 2, 1 };
        public static readonly ArenaModule[][] Modules = {
            new ArenaModule[] {
                new ArenaModule { Id = "fast", Name = "Rastreador", Cost = 110f, Cooldown = 10f, Damage = 120f, Travel = 4f, Shots = 1f, Bypass = 0f, Detail = "Llega en 4 s; 120 de daño." },
                new ArenaModule { Id = "heavy", Name = "Asedio", Cost = 275f, Cooldown = 18f, Damage = 300f, Travel = 10f, Shots = 1f, Bypass = 0f, Detail = "300 de daño; viaja 10 s." },
                new ArenaModule { Id = "burst", Name = "Ráfaga", Cost = 190f, Cooldown = 14f, Damage = 75f, Travel = 6f, Shots = 3f, Bypass = 0f, Detail = "Tres impactos separados." },
                new ArenaModule { Id = "piercing", Name = "Perforante", Cost = 205f, Cooldown = 16f, Damage = 170f, Travel = 8f, Shots = 1f, Bypass = 0.45f, Detail = "45% del daño atraviesa escudos." },
                new ArenaModule { Id = "breaker", Name = "Rompeescudos", Cost = 165f, Cooldown = 16f, Damage = 90f, Travel = 7f, Shots = 1f, Bypass = 0f, ShieldMultiplier = 2.5f, Detail = "90 al núcleo; consume 2,5 veces más capacidad de escudo." },
                new ArenaModule { Id = "emp", Name = "Pulso EMP", Cost = 135f, Cooldown = 22f, Damage = 35f, Travel = 5f, Shots = 1f, Bypass = 0f, ShieldDelay = 3f, EffectDuration = 6f, Detail = "35 de daño; retrasa 3 s escudos en activación y los iniciados durante 6 s." },
                new ArenaModule { Id = "vector", Name = "Doble vector", Cost = 225f, Cooldown = 17f, Damage = 125f, Travel = 6f, Shots = 2f, Spacing = 2f, Bypass = 0f, Detail = "Dos impactos de 125 separados por 2 s." },
                new ArenaModule { Id = "exposed", Name = "Carga de núcleo", Cost = 195f, Cooldown = 18f, Damage = 140f, Travel = 8f, Shots = 1f, Bypass = 0f, ExposedMultiplier = 1.8f, Detail = "140 de daño; 252 si llega sin escudos activos." },
                new ArenaModule { Id = "economical", Name = "Cohete económico", Cost = 60f, Cooldown = 19f, Damage = 70f, Travel = 7f, Shots = 1f, Bypass = 0f, Detail = "70 de daño por 60 Créditos; recarga 19 s." },
                new ArenaModule { Id = "node", Name = "Disruptor de nodo", Cost = 125f, Cooldown = 24f, Damage = 40f, Travel = 6f, Shots = 1f, Bypass = 0f, GuardianDelay = 3f, EffectDuration = 8f, Detail = "40 de daño; retrasa 3 s guardianes en tránsito y los enviados durante 8 s." },
            },
            new ArenaModule[] {
                new ArenaModule { Id = "quick", Name = "Carga rápida", Cost = 90f, Cooldown = 12f, Capacity = 145f, Duration = 12f, Delay = 0f, Reduction = 0f, Detail = "145 de capacidad inmediata por 12 s." },
                new ArenaModule { Id = "heavy", Name = "Barrera pesada", Cost = 210f, Cooldown = 22f, Capacity = 330f, Duration = 24f, Delay = 4f, Reduction = 0f, Detail = "330 de capacidad; activa en 4 s." },
                new ArenaModule { Id = "interceptor", Name = "Interceptor", Cost = 140f, Cooldown = 18f, Capacity = 160f, Duration = 18f, Delay = 1f, Reduction = 0.25f, Detail = "Reduce cada impacto absorbido un 25%." },
                new ArenaModule { Id = "sustained", Name = "Sostenido", Cost = 155f, Cooldown = 20f, Capacity = 210f, Duration = 35f, Delay = 2f, Reduction = 0f, Detail = "Duración larga; capacidad intermedia." },
                new ArenaModule { Id = "antiburst", Name = "Antirráfaga", Cost = 155f, Cooldown = 19f, Capacity = 180f, Duration = 20f, Delay = 1f, Reduction = 0f, MultiReduction = 0.45f, Detail = "180 de capacidad; reduce 45% los impactos de cohetes múltiples." },
                new ArenaModule { Id = "antipiercing", Name = "Antiperforante", Cost = 150f, Cooldown = 20f, Capacity = 170f, Duration = 18f, Delay = 1f, Reduction = 0f, BypassReduction = 0.7f, Detail = "170 de capacidad; devuelve al escudo 70% del daño perforante." },
                new ArenaModule { Id = "regenerative", Name = "Reactor regenerativo", Cost = 165f, Cooldown = 23f, Capacity = 170f, Duration = 30f, Delay = 2f, Reduction = 0f, Regen = 8f, RegenWait = 3f, Detail = "170 de capacidad; regenera 8/s tras 3 s sin impactos, hasta su capacidad inicial." },
                new ArenaModule { Id = "reflection", Name = "Escudo reflejo", Cost = 175f, Cooldown = 22f, Capacity = 155f, Duration = 18f, Delay = 2f, Reduction = 0f, Reflect = 0.2f, CapacityMultiplier = 1.2f, Detail = "Devuelve 20% del daño absorbido al núcleo rival; consume capacidad 20% más rápido." },
                new ArenaModule { Id = "reinforced", Name = "Cobertura reforzada", Cost = 220f, Cooldown = 24f, Capacity = 210f, Duration = 8f, Delay = 0f, Reduction = 0.5f, Detail = "210 de capacidad; reduce cada impacto 50%, dura solo 8 s." },
                new ArenaModule { Id = "emergency", Name = "Escudo de emergencia", Cost = 115f, Cooldown = 1f, Capacity = 180f, Duration = 15f, Delay = 0f, Reduction = 0f, EmergencyThreshold = 0.35f, Detail = "Pagás para armarlo una vez; se activa automáticamente al llegar a 35% de vida o menos." },
            },
            new ArenaModule[] {
                new ArenaModule { Id = "disrupt", Name = "Interferencia de escudos", Cost = 90f, Cooldown = 32f, Duration = 10f, Penalty = 0.25f, Effect = "shields", Detail = "Reduce 25% la capacidad efectiva de escudos ya activos durante 10 s." },
                new ArenaModule { Id = "economy", Name = "Bloqueo económico", Cost = 115f, Cooldown = 32f, Duration = 12f, Penalty = 0.30f, Effect = "income", Detail = "Reduce ingresos enemigos un 30% por 12 s." },
                new ArenaModule { Id = "production", Name = "Freno industrial", Cost = 100f, Cooldown = 32f, Duration = 12f, Penalty = 0.60f, Effect = "economicIncome", Detail = "Reduce 60% el ingreso adicional obtenido por mejoras económicas durante 12 s; conserva el ingreso base." },
                new ArenaModule { Id = "cooldown", Name = "Interferencia de recargas", Cost = 120f, Cooldown = 32f, Duration = 10f, Penalty = 0.50f, Effect = "cooldown", Targeted = true, Detail = "Recargas de una familia elegida avanzan a la mitad durante 10 s." },
                new ArenaModule { Id = "launch", Name = "Retraso de lanzamiento", Cost = 100f, Cooldown = 30f, Duration = 12f, Delay = 3f, Effect = "rocketDelay", Detail = "Los cohetes lanzados durante 12 s tardan 3 s más; no afecta los ya lanzados." },
                new ArenaModule { Id = "ambush", Name = "Emboscada al nodo", Cost = 95f, Cooldown = 30f, Delay = 6f, Effect = "nextGuardian", Detail = "Retrasa 6 s el próximo envío de guardianes; no quita control del nodo." },
                new ArenaModule { Id = "friction", Name = "Fricción económica", Cost = 90f, Cooldown = 32f, Penalty = 0.35f, Effect = "nextUpgrade", Detail = "La próxima mejora económica rival cuesta 35% más; se consume al comprarla." },
                new ArenaModule { Id = "supplies", Name = "Corte de suministros", Cost = 85f, Cooldown = 30f, Duration = 15f, Penalty = 0.4f, Effect = "nextAction", Targeted = true, Detail = "La próxima acción de la familia elegida cuesta 40% más, por hasta 15 s." },
                new ArenaModule { Id = "reconfigure", Name = "Interferencia de reconfiguración", Cost = 95f, Cooldown = 28f, Delay = 4f, Effect = "swapDelay", Detail = "Añade 4 s a un cambio rival en curso; sin cambio en curso no se puede usar." },
                new ArenaModule { Id = "precision", Name = "Sabotaje de precisión", Cost = 110f, Cooldown = 32f, Duration = 12f, Penalty = 0.35f, Effect = "precision", Targeted = true, SlotTargeted = true, Detail = "Reduce 35% la potencia de un cohete o defensa del rival durante 12 s." },
            }
        };
        public static ArenaModule Find(int family, string id)
        {
            return Array.Find(Modules[family], item => item.Id == id);
        }
    }
}
