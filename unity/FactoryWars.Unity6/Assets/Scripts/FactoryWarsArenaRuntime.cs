using System;
using System.Collections.Generic;
using UnityEngine;

namespace FactoryWars.Unity6
{
    // Local practice only. Mirrors the base Arena v2 catalog; no online authority or bonus system.
    internal sealed class ArenaLocalMatch
    {
        internal sealed class Effect
        {
            public string Kind;
            public int Family = -1, Slot = -1;
            public float Remaining = -1, Penalty, Delay;
        }
        internal sealed class Barrier
        {
            public ArenaModule Module;
            public float Capacity, Maximum, Remaining, SinceHit, Weakening, WeakenedFor;
        }
        internal sealed class Swap
        {
            public int Family, Slot;
            public string Id;
            public float Remaining = 5;
        }
        internal sealed class Player
        {
            public float Hp = 1000, Credits = 240, Energy = 100, GuardianCooldown, ControlSeconds, Extracted;
            public int Level;
            public readonly string[][] Active = new string[3][], Options = new string[3][];
            public readonly float[][] Cooldowns = { new float[2], new float[2], new float[1] };
            public readonly bool[] Changed = new bool[3];
            public readonly List<Barrier> Barriers = new List<Barrier>();
            public readonly List<Effect> Effects = new List<Effect>();
            public Swap Pending;
            public bool EmergencyArmed, EmergencyUsed;
            public float EmergencyPower = 1;
            public float Shield { get { float total = 0; foreach (var b in Barriers) total += b.Capacity; return total; } }
            public Effect Find(string kind, int family = -1, int slot = -1)
            { return Effects.Find(e => e.Kind == kind && e.Family == family && e.Slot == slot); }
        }
        internal sealed class Flight
        {
            public int Sequence, Side, Slot, Count;
            public string Kind;
            public ArenaModule Module;
            public float At, Started, Power = 1;
        }
        internal sealed class Order
        {
            public string Key, Name;
            public int Side, Family, Slot, TargetFamily, TargetSlot, Count;
            public ArenaModule Module;
            public float Duration, Remaining, Power = 1;
        }
        internal sealed class Notice
        {
            public string Text;
            public float ShownUntil = -1;
        }
        // Production is independent from travel, activation delay and cooldown.
        internal sealed class ProductionProfile
        {
            // Provisional presentation defaults, not a definitive balance profile.
            public float ModuleSeconds = 3, EconomySeconds = 8;
        }
        public readonly ProductionProfile Production = new ProductionProfile();
        public readonly Player[] Players = { new Player(), new Player() };
        public readonly List<Flight> Flights = new List<Flight>();
        public readonly List<Order> Orders = new List<Order>();
        public readonly List<Order> BotOrders = new List<Order>();
        public readonly List<Notice> Notices = new List<Notice>();
        public readonly Queue<string> Feed = new Queue<string>();
        public Action<string> OnMessage;
        public float Time, SabotagePulse, GrowthPulse, NodePulse;
        public string LastSabotageId;
        public int LastSabotageTarget, LastGrowthSide, LastImpactSide;
        public float ImpactPulse;
        public int NodeOwner = -1, NodeGuardians;
        public bool Finished;
        public string Status = "Práctica local · prepará tus órdenes.";
        private float accumulator, botClock;
        private int sequence;
        private static readonly int[] Costs = { 165, 360, 720 };
        private static readonly float[] Rates = { 9, 15, 24, 38 };

        public ArenaLocalMatch(string[][] candidates, string[] outgoingBans)
        {
            // Both sides use the same frozen eligible choices. The local bot announces its fixed bans.
            for (int side = 0; side < 2; side++)
            for (int family = 0; family < 3; family++)
            {
                string incoming = side == 1 ? outgoingBans[family] : ArenaCatalog.Modules[family][family == 2 ? 2 : 3].Id;
                var available = new List<string>(candidates[family]);
                available.Remove(incoming);
                int maximum = family == 2 ? 3 : 3;
                if (available.Count > maximum) available.RemoveRange(maximum, available.Count - maximum);
                Players[side].Options[family] = available.ToArray();
                Players[side].Active[family] = available.GetRange(0, ArenaCatalog.ActiveCounts[family]).ToArray();
            }
            Log("Bot local bloquea Perforante, Sostenido y Freno industrial si están en tu lista.");
        }

        public void Log(string text)
        {
            Status = text; Feed.Enqueue(text); while (Feed.Count > 4) Feed.Dequeue();
            if (OnMessage != null) OnMessage(text);
        }
        private void Alert(string text)
        {
            Notices.Add(new Notice { Text = text });
        }
        public List<Order> QueueFor(int side) { return side == 0 ? Orders : BotOrders; }
        public float Income(int side)
        {
            var p = Players[side]; float income = Rates[p.Level];
            var industrial = p.Find("economicIncome");
            if (industrial != null) income = 9 + (income - 9) * (1 - industrial.Penalty);
            var effect = p.Find("income"); return income * (effect == null ? 1 : 1 - effect.Penalty);
        }
        private bool Queue(Order order, float cost)
        {
            if (Finished) return false;
            var orders = QueueFor(order.Side);
            int maximum = orders.Count == 2 && orders.TrueForAll(o => o.Key == order.Key) ? 3 : 2;
            if (orders.Count >= maximum) { if (order.Side == 0) Log("Cola completa · el tercer espacio requiere el mismo elemento."); return false; }
            if (Players[order.Side].Credits < cost) { if (order.Side == 0) Log("Faltan Créditos · no se cobró la orden."); return false; }
            Players[order.Side].Credits -= cost;
            order.Duration = Mathf.Max(.1f, order.Family == 4 ? Production.EconomySeconds : Production.ModuleSeconds);
            order.Remaining = order.Duration;
            orders.Add(order);
            if (order.Side == 0) Log("Preparando: " + order.Name);
            return true;
        }
        public bool Use(int side, int family, int slot, int targetFamily = 0, int targetSlot = 0)
        {
            if (Finished || side < 0 || side > 1 || family < 0 || family > 2 || slot < 0 || slot >= ArenaCatalog.ActiveCounts[family]) return false;
            var p = Players[side]; var enemy = Players[1 - side]; var module = ArenaCatalog.Find(family, p.Active[family][slot]);
            string error = null;
            if (p.Cooldowns[family][slot] > 0) error = "Ese espacio sigue recargando.";
            if (module.EmergencyThreshold > 0 && (p.EmergencyArmed || p.EmergencyUsed)) error = "Emergencia solo puede armarse una vez.";
            if (module.EmergencyThreshold > 0 && QueueFor(side).Exists(o => o.Module != null && o.Module.EmergencyThreshold > 0)) error = "Emergencia ya está en preparación.";
            if (family == 2 && module.Effect == "swapDelay" && enemy.Pending == null) error = "El rival no tiene un cambio en curso.";
            if (family == 2 && module.Targeted && (targetFamily < 0 || targetFamily > (module.SlotTargeted ? 1 : 2))) error = "Objetivo inválido.";
            if (family == 2 && module.SlotTargeted && (targetFamily < 0 || targetFamily > 1 || targetSlot < 0 || targetSlot >= ArenaCatalog.ActiveCounts[targetFamily])) error = "Espacio objetivo inválido.";
            var surcharge = p.Find("nextAction", family);
            float cost = module.Cost * (surcharge == null ? 1 : 1 + surcharge.Penalty);
            if (p.Credits < cost) error = "Faltan Créditos · no se cobró la orden.";
            if (error != null) { if (side == 0) Log(error); return false; }
            var weakness = p.Find("precision", family, slot); float power = weakness == null ? 1 : 1 - weakness.Penalty;
            if (!Queue(new Order { Side = side, Family = family, Slot = slot, Key = family + ":" + module.Id, Name = module.Name,
                Module = module, TargetFamily = targetFamily, TargetSlot = targetSlot, Power = power }, cost)) return false;
            if (surcharge != null) p.Effects.Remove(surcharge);
            return true;
        }
        private void Dispatch(Order order)
        {
            int side = order.Side, family = order.Family, slot = order.Slot, targetFamily = order.TargetFamily, targetSlot = order.TargetSlot;
            var p = Players[side]; var enemy = Players[1 - side]; var module = order.Module; float power = order.Power;
            if (family == 3) { LaunchGuardians(side, order.Count); return; }
            if (family == 4)
            {
                p.Level++; GrowthPulse = 2; LastGrowthSide = side;
                string text = (side == 0 ? "TU ECONOMÍA" : "ECONOMÍA RIVAL") + " MEJORADA · +" + Rates[p.Level] + " C/s";
                Log(text); Alert(text); return;
            }
            p.Cooldowns[family][slot] = module.Cooldown;
            if (family == 0)
            {
                var delay = p.Find("rocketDelay");
                for (int shot = 0; shot < module.Shots; shot++)
                    Send(side, slot, "rocket", module, module.Travel + (delay == null ? 0 : delay.Delay) + shot * (module.Spacing > 0 ? module.Spacing : .6f), power);
                Log((side == 0 ? "Creás " : "El rival crea ") + module.Name + " · " + (slot == 0 ? "izquierda" : "derecha"));
                if (side == 1) Alert("RIVAL LANZÓ COHETE · " + module.Name);
            }
            else if (family == 1)
            {
                if (module.EmergencyThreshold > 0) { p.EmergencyArmed = true; p.EmergencyPower = power; }
                else
                {
                    var delay = p.Find("shieldDelay"); float wait = module.Delay + (delay == null ? 0 : delay.Delay);
                    if (wait == 0) DeployShield(side, module, power); else Send(side, slot, "shield", module, wait, power);
                }
                Log((side == 0 ? "Preparaste " : "El rival preparó ") + module.Name + (module.EmergencyThreshold > 0 ? " · armado" : " · activación"));
            }
            else
            {
                SabotagePulse = 2;
                LastSabotageId = module.Id;
                LastSabotageTarget = 1 - side;
                if (module.Effect == "shields") foreach (var barrier in enemy.Barriers) { barrier.Weakening = module.Penalty; barrier.WeakenedFor = module.Duration; }
                else if (module.Effect == "swapDelay") { if (enemy.Pending != null) enemy.Pending.Remaining += module.Delay; }
                else Apply(enemy, new Effect { Kind = module.Effect, Penalty = module.Penalty, Delay = module.Delay,
                    Remaining = module.Duration > 0 ? module.Duration : -1, Family = module.Targeted ? targetFamily : -1, Slot = module.SlotTargeted ? targetSlot : -1 });
                Log((side == 0 ? "Aplicás " : "El rival aplica ") + module.Name);
                Alert((side == 0 ? "SABOTAJE APLICADO" : "¡RECIBÍS SABOTAJE!") + " · " + module.Name);
            }
            Emergency(side);
        }
        private void Send(int side, int slot, string kind, ArenaModule module, float delay, float power = 1, int count = 0)
        { Flights.Add(new Flight { Sequence = ++sequence, Side = side, Slot = slot, Kind = kind, Module = module, At = Time + delay, Started = Time, Power = power, Count = count }); }
        public bool Change(int side, int family, int slot, string id)
        {
            if (side < 0 || side > 1 || family < 0 || family > 2 || slot < 0 || slot >= ArenaCatalog.ActiveCounts[family]) return false;
            var p = Players[side];
            if (Finished || p.Pending != null || p.Changed[family] || p.Energy < 40 || Array.IndexOf(p.Options[family], id) < 0 || Array.IndexOf(p.Active[family], id) >= 0)
            { if (side == 0) Log("Cambio no disponible · requiere reserva, 40 E y un cambio libre por familia."); return false; }
            p.Energy -= 40; p.Changed[family] = true; p.Pending = new Swap { Family = family, Slot = slot, Id = id };
            if (side == 1) Alert("RIVAL CAMBIA " + ArenaCatalog.Names[family] + " · 5 s");
            Log((side == 0 ? "Cambiás " : "El rival cambia ") + ArenaCatalog.Names[family] + " · 5 s"); return true;
        }
        public bool Guardians(int side, int count = 1)
        {
            if (side < 0 || side > 1) return false;
            var p = Players[side]; count = Mathf.Clamp(count, 1, 5);
            if (Finished || p.GuardianCooldown > 0 || p.Credits < 65 * count) { if (side == 0) Log("Guardianes no disponibles · recarga o Créditos insuficientes."); return false; }
            return Queue(new Order { Side = side, Family = 3, Count = count, Key = "guardians:" + count, Name = "Guardianes ×" + count }, 65 * count);
        }
        private void LaunchGuardians(int side, int count)
        {
            var p = Players[side]; p.GuardianCooldown = 8;
            var ambush = p.Find("nextGuardian"); var delay = p.Find("guardianDelay");
            Send(side, 0, "guardians", null, 8 + (ambush == null ? 0 : ambush.Delay) + (delay == null ? 0 : delay.Delay), 1, count);
            if (ambush != null) p.Effects.Remove(ambush);
            Log((side == 0 ? "Enviás " : "El rival envía ") + count + " guardianes");
        }
        public bool Upgrade(int side)
        {
            if (side < 0 || side > 1) return false;
            var p = Players[side]; int level = p.Level + QueueFor(side).FindAll(o => o.Family == 4).Count;
            if (Finished || level >= 3) return false;
            var friction = p.Find("nextUpgrade"); float cost = Costs[level] * (friction == null ? 1 : 1 + friction.Penalty);
            if (p.Credits < cost) { if (side == 0) Log("Mejora económica requiere " + cost.ToString("0") + " C."); return false; }
            if (!Queue(new Order { Side = side, Family = 4, Key = "growth", Name = "Economía Nv. " + (level + 1) }, cost)) return false;
            if (friction != null) p.Effects.Remove(friction); return true;
        }
        private static void Apply(Player p, Effect effect)
        {
            p.Effects.RemoveAll(e => e.Kind == effect.Kind && e.Family == effect.Family && e.Slot == effect.Slot); p.Effects.Add(effect);
        }
        private void DeployShield(int side, ArenaModule module, float power)
        {
            var p = Players[side]; float capacity = Mathf.Max(0, Mathf.Min(module.Capacity * power, 470 - p.Shield));
            if (capacity > 0)
            {
                p.Barriers.Add(new Barrier { Module = module, Capacity = capacity, Maximum = capacity, Remaining = module.Duration });
                Alert((side == 0 ? "TU ESCUDO ACTIVO" : "ESCUDO RIVAL ACTIVO") + " · " + module.Name);
            }
        }
        private void Emergency(int side)
        {
            var p = Players[side];
            if (p.EmergencyArmed && p.Hp > 0 && p.Hp <= 350)
            { p.EmergencyArmed = false; p.EmergencyUsed = true; DeployShield(side, ArenaCatalog.Find(1, "emergency"), p.EmergencyPower); Log("¡Escudo de emergencia automático!"); }
        }
        public void Advance(float delta)
        {
            if (Finished) return;
            accumulator += Mathf.Min(delta, .25f);
            while (accumulator >= .1f && !Finished) { accumulator -= .1f; Tick(.1f); }
        }
        private void Tick(float dt)
        {
            SabotagePulse = Mathf.Max(0, SabotagePulse - dt); GrowthPulse = Mathf.Max(0, GrowthPulse - dt); NodePulse = Mathf.Max(0, NodePulse - dt);
            ImpactPulse = Mathf.Max(0, ImpactPulse - dt);
            Notices.RemoveAll(n => n.ShownUntil >= 0 && n.ShownUntil <= Time);
            for (int side = 0; side < 2; side++)
            {
                var p = Players[side]; p.Credits += Income(side) * dt;
                for (int family = 0; family < 3; family++)
                {
                    var slow = p.Find("cooldown", family);
                    for (int slot = 0; slot < p.Cooldowns[family].Length; slot++) p.Cooldowns[family][slot] = Mathf.Max(0, p.Cooldowns[family][slot] - dt * (slow == null ? 1 : 1 - slow.Penalty));
                }
                p.GuardianCooldown = Mathf.Max(0, p.GuardianCooldown - dt);
                foreach (var effect in p.Effects) if (effect.Remaining > 0) effect.Remaining -= dt;
                p.Effects.RemoveAll(e => e.Remaining <= 0 && e.Remaining > -1);
                foreach (var b in p.Barriers)
                {
                    b.Remaining -= dt; b.SinceHit += dt; b.WeakenedFor = Mathf.Max(0, b.WeakenedFor - dt); if (b.WeakenedFor == 0) b.Weakening = 0;
                    if (b.Module.Regen > 0 && b.SinceHit >= b.Module.RegenWait && b.Capacity > 0 && b.Remaining > 0)
                        b.Capacity += Mathf.Min(b.Module.Regen * dt, Mathf.Min(b.Maximum - b.Capacity, Mathf.Max(0, 470 - p.Shield)));
                }
                p.Barriers.RemoveAll(b => b.Remaining <= 0 || b.Capacity <= 0);
                if (p.Pending != null && (p.Pending.Remaining -= dt) <= 0)
                {
                    p.Active[p.Pending.Family][p.Pending.Slot] = p.Pending.Id;
                    string equippedName = ArenaCatalog.Find(p.Pending.Family, p.Pending.Id).Name;
                    Log((side == 0 ? "Listo: " : "El rival equipó ") + equippedName);
                    if (side == 1) Alert("RIVAL EQUIPÓ " + equippedName);
                    p.Pending = null;
                }
                if (NodeOwner == side)
                {
                    p.ControlSeconds += dt; float target = Mathf.Min(20, p.ControlSeconds / 180 * 20); p.Energy += target - p.Extracted; p.Extracted = target;
                }
                Emergency(side);
            }
            Time = Mathf.Min(300, Time + dt);
            var due = Flights.FindAll(f => f.At <= Time + .00001f); due.Sort((a, b) => a.At == b.At ? a.Sequence.CompareTo(b.Sequence) : a.At.CompareTo(b.At));
            foreach (var flight in due) { Flights.Remove(flight); Arrive(flight); }
            if (Time >= 300 || Players[0].Hp <= 0 || Players[1].Hp <= 0)
            {
                Finished = true; Orders.Clear(); BotOrders.Clear(); Log(Players[0].Hp == Players[1].Hp ? "EMPATE LOCAL" : Players[0].Hp > Players[1].Hp ? "VICTORIA LOCAL" : "DERROTA LOCAL"); return;
            }
            botClock += dt;
            for (int side = 0; side < 2; side++)
            {
                var orders = QueueFor(side);
                foreach (var order in orders) order.Remaining = Mathf.Max(0, order.Remaining - dt);
                // Parallel preparation, FIFO dispatch. All ready consecutive orders leave in this tick.
                while (orders.Count > 0 && orders[0].Remaining <= .00001f)
                { var order = orders[0]; orders.RemoveAt(0); Dispatch(order); }
            }
            if (botClock >= 3) { botClock = 0; BotThink(); }
        }
        private void Arrive(Flight flight)
        {
            int side = flight.Side; var p = Players[side]; var enemy = Players[1 - side]; var module = flight.Module;
            if (flight.Kind == "guardians")
            {
                int previous = NodeOwner;
                if (NodeOwner < 0 || NodeOwner == side) { NodeOwner = side; NodeGuardians += flight.Count; }
                else if (flight.Count == NodeGuardians) { NodeOwner = -1; NodeGuardians = 0; }
                else if (flight.Count > NodeGuardians) { NodeOwner = side; NodeGuardians = flight.Count - NodeGuardians; }
                else NodeGuardians -= flight.Count;
                NodePulse = 2;
                Log(NodeOwner < 0 ? "Nodo neutralizado" : NodeOwner == 0 ? "CAPTURASTE / reforzaste el nodo" : previous == 0 ? "PERDISTE EL NODO" : "El rival controla el nodo");
            }
            else if (flight.Kind == "shield") DeployShield(side, module, flight.Power);
            else
            {
                bool hasActiveBarrier = enemy.Barriers.Exists(b => b.Capacity > 0 && b.Remaining > 0);
                float total = module.Damage * flight.Power * (!hasActiveBarrier && module.ExposedMultiplier > 0 ? module.ExposedMultiplier : 1);
                float protection = 0; foreach (var b in enemy.Barriers) if (b.Capacity > 0 && b.Remaining > 0) protection = Mathf.Max(protection, b.Module.BypassReduction);
                float direct = total * module.Bypass * (1 - protection), damage = total - direct;
                foreach (var b in enemy.Barriers)
                {
                    if (damage <= 0 || b.Capacity <= 0 || b.Remaining <= 0) continue;
                    float reduction = module.Shots > 1 ? Mathf.Max(b.Module.Reduction, b.Module.MultiReduction) : b.Module.Reduction;
                    float depletion = (1 - reduction) * (module.ShieldMultiplier > 0 ? module.ShieldMultiplier : 1) * (b.Module.CapacityMultiplier > 0 ? b.Module.CapacityMultiplier : 1) / (1 - b.Weakening);
                    float absorbed = Mathf.Min(damage, b.Capacity / depletion); b.Capacity = Mathf.Max(0, b.Capacity - absorbed * depletion); b.SinceHit = 0; damage -= absorbed;
                    if (b.Module.Reflect > 0) p.Hp = Mathf.Max(0, p.Hp - absorbed * b.Module.Reflect);
                }
                enemy.Hp = Mathf.Max(0, enemy.Hp - damage - direct);
                ImpactPulse = .8f; LastImpactSide = 1 - side;
                DelayEffect(1 - side, "shieldDelay", "shield", module.ShieldDelay, module.EffectDuration);
                DelayEffect(1 - side, "guardianDelay", "guardians", module.GuardianDelay, module.EffectDuration);
                Emergency(side); Emergency(1 - side);
                Log((side == 0 ? "Impacto rival: " : "Recibís impacto: ") + (damage + direct).ToString("0") + " daño · " + module.Name);
            }
        }
        private void DelayEffect(int target, string kind, string flightKind, float delay, float duration)
        {
            if (delay <= 0) return;
            var p = Players[target];
            if (p.Find(kind) == null) foreach (var flight in Flights) if (flight.Side == target && flight.Kind == flightKind && flight.At > Time) flight.At += delay;
            Apply(p, new Effect { Kind = kind, Delay = delay, Remaining = duration });
        }
        private void BotThink()
        {
            var p = Players[1];
            if (p.Level < 3 && p.Credits >= Costs[p.Level] + 90) Upgrade(1);
            else
            {
                for (int slot = 0; slot < 2; slot++) if (p.Cooldowns[0][slot] <= 0 && Use(1, 0, slot)) break;
            }
            if (p.Hp < 950 && p.Shield < 100) for (int slot = 0; slot < 2; slot++) if (Use(1, 1, slot)) break;
            if (NodeOwner != 1 && !Flights.Exists(f => f.Side == 1 && f.Kind == "guardians")) Guardians(1);
            if (Time > 24) Use(1, 2, 0);
            if (Time > 40 && p.Pending == null && p.Energy >= 40)
            {
                for (int family = 0; family < 3; family++)
                {
                    if (p.Changed[family]) continue;
                    string reserve = Array.Find(p.Options[family], id => Array.IndexOf(p.Active[family], id) < 0);
                    if (reserve != null) { Change(1, family, 0, reserve); break; }
                }
            }
        }
    }
}
