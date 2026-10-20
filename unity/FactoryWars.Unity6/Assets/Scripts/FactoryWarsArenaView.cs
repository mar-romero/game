using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

namespace FactoryWars.Unity6
{
    // Native Unity presentation and local-practice loop for the Arena v2 screen.
    // Online matchmaking and authoritative rewards remain on the server backlog.
    public sealed partial class FactoryWarsMobileApp
    {
        private sealed class ArenaRocketFlight
        {
            public bool FromPlayer;
            public float Remaining, Duration;
            public float Damage;
        }

        private sealed class ArenaOrder
        {
            public string Family;
            public Action Run;
        }

        private sealed class ArenaPracticeState
        {
            public float Time, PlayerHp = 1000, BotHp = 1000, Credits = 240, BotCredits = 240;
            public float Energy = 100, BotEnergy = 100, Income = 9, BotIncome = 9;
            public float Shield, BotShield, ShieldTime, BotShieldTime, SabotageTime, BotSabotageTime;
            public float NodeTravel, BotNodeTravel, PlayerNodeControl, BotNodeControl, ReconfigureTime, ActionClock, BotClock;
            public float GuardianCooldown, BotGuardianCooldown, BotSabotageCooldown, SabotageCooldown;
            public readonly float[] RocketCooldowns = new float[2], ShieldCooldowns = new float[2];
            public int NextRocketSlot, NextShieldSlot;
            public float RocketDamage = 120, RocketTravel = 4, PendingRocketDamage = 300, PendingRocketTravel = 10;
            public int NodeOwner = -1, NodeGuardians, PlayerTravelGuardians, BotTravelGuardians, Level, BotLevel;
            public int Extracted, BotExtracted;
            public bool ChangedRocket, ChangedShield, ChangedSabotage, Finished;
            public string Status = "Tu turno: prepará las órdenes.";
            public string RocketName = "Rastreador";
            public readonly List<ArenaRocketFlight> Flights = new List<ArenaRocketFlight>();
            public readonly List<ArenaOrder> Queue = new List<ArenaOrder>();
            public readonly Queue<string> Feed = new Queue<string>();
        }

        private ArenaPracticeState arenaPractice;
        private bool arenaBattleVisible;
        private ArenaLocalMatch arenaLocalMatch;
        private bool arenaCollectionVisible;
        private bool arenaCollectionBansOnly;
        private Text arenaTimeText, arenaPlayerHpText, arenaBotHpText, arenaResourceText, arenaNodeText, arenaEffectText, arenaQueueText, arenaFeedText;
        private Image arenaPlayerHpFill, arenaBotHpFill, arenaPlayerShieldFill, arenaBotShieldFill;
        private Text arenaPlayerShieldLabel, arenaBotShieldLabel;
        private readonly List<GameObject> arenaRocketMarkers = new List<GameObject>();
        private RectTransform arenaRocketTrack;
        private float arenaUiRefresh;

        private void BuildArenaScreen()
        {
            if (arenaLocalMatch != null) { BuildArenaCombatScreen(); return; }
            if (arenaCollectionVisible) { BuildArenaCollectionScreen(); return; }
            BuildArenaLobbyScreen();
        }

        private void BuildArenaScreenLegacy()
        {
            if (arenaBattleVisible && arenaPractice != null) BuildArenaBattle();
            else BuildArenaLobby();
        }

        private void BuildArenaLobby()
        {
            Hero("ARENA · PRÁCTICA LOCAL", "PREPARÁ TU ESTRATEGIA", "Combate 1 vs 1 contra un bot · sin premios ni clasificación", cyan);
            var artCard = Card("EL CAMPO DE BATALLA", "Dos bases, un nodo central y caminos para disputar el control.", 300);
            var art = Panel("Arena Lobby Illustration", artCard.transform, new Color32(9, 39, 61, 220));
            Anchor(art, new Vector2(.035f, .06f), new Vector2(.965f, .79f), Vector2.zero, Vector2.zero);
            var image = art.GetComponent<Image>();
            image.sprite = Resources.Load<Sprite>("FactoryWarsArenaLobby"); image.preserveAspect = true;
            image.color = Color.white;
            PlacedLabel(artCard.transform, "AZUL  ━━━━━  ◉ NODO ◉  ━━━━━  ROJO", 9, white, FontStyle.Bold, TextAnchor.MiddleCenter,
                new Vector2(0, 0), new Vector2(1, 0), new Vector2(8, 9), new Vector2(-8, 31));

            var rules = Card("REGLAS DE ESTA ARENA", "Formato nuevo · 5 minutos · balance provisional", 315);
            Transform body = CardBody(rules.transform);
            StatRow(body, "NÚCLEO", "1000", "Gana quien conserve más vida al terminar");
            StatRow(body, "RECURSOS", "240 C · 100 E", "Créditos compran acciones; Energía paga cambios");
            StatRow(body, "ARSENAL ACTIVO", "2 · 2 · 1", "Dos cohetes, dos escudos y un sabotaje");
            StatRow(body, "NODO CENTRAL", "hasta +20 E", "Enviar guardianes; el control extrae energía");

            var actions = Card("ÓRDENES EN COLA", "Dos órdenes pendientes. Se habilita una tercera si las tres son de la misma familia.", 500);
            Transform actionBody = CardBody(actions.transform);
            ModuleRow(actionBody, "➤", "Cohete", "110 Créditos · vuela y golpea el núcleo rival", "ATACAR");
            ModuleRow(actionBody, "◈", "Escudo", "90 Créditos · cúpula visible mientras absorbe", "DEFENDER");
            ModuleRow(actionBody, "⌁", "Sabotaje", "90 Créditos · debilita el ingreso rival por 10 s", "INTERFERIR");
            ModuleRow(actionBody, "♟", "Guardianes", "65 Créditos · viaje de 8 s al nodo", "DISPUTAR");
            var start = FlowActionButton(actionBody, "JUGAR PRÁCTICA LOCAL", cyan, StartArenaPractice);
            LayoutElement(start.gameObject).preferredHeight = 48;
            FlowLabel(actionBody, "La cola de tres órdenes iguales es una regla nueva de esta interfaz; el catálogo investigado, las reservas y los bloqueos online todavía no están conectados a Unity.", 9, muted, FontStyle.Normal, 45);
            ApplyArenaGlassStyle(content);
        }

        private void StartArenaPractice()
        {
            arenaPractice = new ArenaPracticeState();
            arenaPractice.Feed.Enqueue("Partida iniciada · el bot está desplegando su base.");
            arenaBattleVisible = true;
            ShowSection(HubSection.Pvp);
        }

        private void BuildArenaBattle()
        {
            arenaRocketMarkers.Clear(); arenaRocketTrack = null;
            ArenaBanner();
            var artCard = Panel("Arena Battlefield Glass", content, new Color32(9, 27, 44, 220));
            LayoutElement(artCard).preferredHeight = 294;
            artCard.AddComponent<Outline>().effectColor = new Color32(62, 205, 245, 200);
            var field = Panel("Arena Battlefield Art", artCard.transform, Color.white);
            Anchor(field, new Vector2(.025f, .04f), new Vector2(.975f, .96f), Vector2.zero, Vector2.zero);
            var art = field.GetComponent<Image>(); art.sprite = Resources.Load<Sprite>("ArenaMegafactoryBattlefield") ?? Resources.Load<Sprite>("FactoryWarsBattlefield"); art.preserveAspect = true;
            PlacedLabel(field.transform, "NÚCLEO RIVAL", 8, new Color32(255, 193, 177, 255), FontStyle.Bold, TextAnchor.UpperCenter,
                new Vector2(.18f, .84f), new Vector2(.82f, .98f), Vector2.zero, Vector2.zero);
            PlacedLabel(field.transform, "TU NÚCLEO", 8, new Color32(184, 231, 255, 255), FontStyle.Bold, TextAnchor.LowerCenter,
                new Vector2(.18f, .02f), new Vector2(.82f, .16f), Vector2.zero, Vector2.zero);
            PlacedLabel(field.transform, "◉ NODO CENTRAL ◉", 8, gold, FontStyle.Bold, TextAnchor.MiddleCenter,
                new Vector2(.25f, .43f), new Vector2(.75f, .57f), Vector2.zero, Vector2.zero);
            arenaBotShieldLabel = PlacedLabel(field.transform, "◉ ESCUDO ACTIVO ◉", 8, cyan, FontStyle.Bold, TextAnchor.MiddleCenter,
                new Vector2(.24f, .72f), new Vector2(.76f, .84f), Vector2.zero, Vector2.zero);
            arenaPlayerShieldLabel = PlacedLabel(field.transform, "◉ ESCUDO ACTIVO ◉", 8, cyan, FontStyle.Bold, TextAnchor.MiddleCenter,
                new Vector2(.24f, .16f), new Vector2(.76f, .28f), Vector2.zero, Vector2.zero);
            arenaPlayerShieldLabel.gameObject.SetActive(false); arenaBotShieldLabel.gameObject.SetActive(false);
            arenaRocketTrack = new GameObject("Rocket flight trail", typeof(RectTransform)).GetComponent<RectTransform>();
            arenaRocketTrack.SetParent(field.transform, false); Anchor(arenaRocketTrack.gameObject, new Vector2(.49f, .16f), new Vector2(.51f, .84f), Vector2.zero, Vector2.zero);
            PlacedLabel(artCard.transform, "PRACTICA LOCAL · SIN RESULTADO OFICIAL", 8, cyan, FontStyle.Bold, TextAnchor.MiddleCenter,
                Vector2.zero, new Vector2(1, 0), new Vector2(5, 1), new Vector2(-5, 22));

            var health = Card("ESTADO DE LOS NÚCLEOS", "Barrera y vida se actualizan con los impactos del combate.", 166);
            BuildArenaHealth(health.transform, true);
            BuildArenaHealth(health.transform, false);
            var hud = Panel("Arena Live HUD", content, new Color32(8, 33, 52, 218));
            LayoutElement(hud).preferredHeight = 72;
            arenaTimeText = PlacedLabel(hud.transform, "05:00", 16, white, FontStyle.Bold, TextAnchor.MiddleCenter,
                new Vector2(.4f, .66f), new Vector2(.6f, .98f), Vector2.zero, Vector2.zero);
            arenaResourceText = PlacedLabel(hud.transform, "240 C  ·  100 E  ·  +9 C/s", 10, new Color32(134, 250, 214, 255), FontStyle.Bold,
                TextAnchor.MiddleCenter, new Vector2(0, .03f), new Vector2(1, .27f), new Vector2(4, 0), new Vector2(-4, 0));
            arenaNodeText = PlacedLabel(hud.transform, "NODO NEUTRAL · 0 / 20 E EXTRAÍDA", 8, gold, FontStyle.Bold,
                TextAnchor.MiddleCenter, new Vector2(.08f, .32f), new Vector2(.92f, .57f), Vector2.zero, Vector2.zero);

            BuildArenaCombatActions();
            var effects = Card("SEÑALES DEL COMBATE", "Los avisos describen órdenes, cambios e impactos.", 108);
            arenaEffectText = PlacedLabel(effects.transform, "Sin efectos activos", 9, cyan, FontStyle.Normal, TextAnchor.MiddleLeft,
                Vector2.zero, Vector2.one, new Vector2(14, 12), new Vector2(-14, -59));
            var feed = Card("REGISTRO DE ARENA", "Actividad reciente", 150);
            arenaFeedText = PlacedLabel(feed.transform, "", 9, white, FontStyle.Normal, TextAnchor.LowerLeft,
                Vector2.zero, Vector2.one, new Vector2(14, 12), new Vector2(-14, -58));

            var leave = FlowActionButton(content, arenaPractice.Finished ? "VOLVER A LA ARENA" : "RENDIRSE Y SALIR", muted, () =>
            {
                arenaBattleVisible = false; arenaPractice = null; ShowSection(HubSection.Pvp);
            });
            LayoutElement(leave.gameObject).preferredHeight = 42;
            ApplyArenaGlassStyle(content);
            RefreshArenaHud();
        }

        private void BuildArenaHealth(Transform parent, bool player)
        {
            Color accent = player ? new Color32(59, 193, 241, 255) : new Color32(255, 113, 99, 255);
            PlacedLabel(parent, player ? "TU NÚCLEO" : "NÚCLEO RIVAL · BOT", 8, accent, FontStyle.Bold, TextAnchor.MiddleLeft,
                new Vector2(0, player ? .51f : .20f), new Vector2(.7f, player ? .66f : .35f), new Vector2(14, 0), Vector2.zero);
            Text hp = PlacedLabel(parent, "1000 / 1000", 9, white, FontStyle.Bold, TextAnchor.MiddleRight,
                new Vector2(.7f, player ? .51f : .20f), new Vector2(1, player ? .66f : .35f), new Vector2(0, 0), new Vector2(-14, 0));
            var track = Panel(player ? "Player core health track" : "Bot core health track", parent, new Color32(3, 14, 25, 220));
            Anchor(track, new Vector2(.045f, player ? .40f : .09f), new Vector2(.955f, player ? .49f : .18f), Vector2.zero, Vector2.zero);
            var bar = Panel(player ? "Player core health" : "Bot core health", track.transform, accent);
            Anchor(bar, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            if (player) { arenaPlayerHpText = hp; arenaPlayerHpFill = bar.GetComponent<Image>(); }
            else { arenaBotHpText = hp; arenaBotHpFill = bar.GetComponent<Image>(); }
            var shield = Panel(player ? "Player shield meter" : "Bot shield meter", parent, new Color32(4, 13, 23, 210));
            Anchor(shield, new Vector2(.045f, player ? .35f : .045f), new Vector2(.955f, player ? .39f : .085f), Vector2.zero, Vector2.zero);
            var shieldFill = Panel("Shield capacity", shield.transform, new Color32(46, 224, 255, 230));
            Anchor(shieldFill, Vector2.zero, Vector2.zero, Vector2.zero, Vector2.zero);
            if (player) arenaPlayerShieldFill = shieldFill.GetComponent<Image>(); else arenaBotShieldFill = shieldFill.GetComponent<Image>();
        }

        private void BuildArenaCombatActions()
        {
            var orders = Card("ÓRDENES TÁCTICAS", "La cola limita acciones pendientes y ejecuta solo órdenes pagadas.", 470);
            arenaQueueText = PlacedLabel(orders.transform, "Cola vacía · 2 espacios", 9, muted, FontStyle.Normal, TextAnchor.MiddleLeft,
                new Vector2(0, 0), new Vector2(1, 0), new Vector2(14, 7), new Vector2(-14, 38));
            Transform body = CardBody(orders.transform);
            body.GetComponent<RectTransform>().offsetMin = new Vector2(12, 46);
            FlowActionButton(body, "➤  LANZAR COHETE · 110 C", new Color32(252, 149, 102, 255), () => QueueArenaOrder("rocket", QueueArenaRocket));
            FlowActionButton(body, "◈  ACTIVAR ESCUDO · 90 C", cyan, () => QueueArenaOrder("shield", QueueArenaShield));
            FlowActionButton(body, "⌁  SABOTAJE ECONÓMICO · 90 C", new Color32(188, 132, 255, 255), () => QueueArenaOrder("sabotage", QueueArenaSabotage));
            FlowActionButton(body, "♟  ENVIAR GUARDIANES · 65 C", gold, () => QueueArenaOrder("guardians", QueueArenaGuardians));
            FlowActionButton(body, "↗  MEJORAR CRECIMIENTO", new Color32(112, 226, 163, 255), () => QueueArenaOrder("growth", QueueArenaUpgrade));
            FlowActionButton(body, "⇄  CAMBIAR INVESTIGACIÓN · 40 E", cyan, QueueArenaReconfigure);
        }

        private void QueueArenaOrder(string family, Action run)
        {
            if (arenaPractice == null) return;
            if (arenaPractice.Finished) { Notice("La partida terminó. Volvé a la Arena para empezar otra práctica."); return; }
            int max = arenaPractice.Queue.Count >= 2 && arenaPractice.Queue.Count < 3 &&
                arenaPractice.Queue.TrueForAll(order => order.Family == family) ? 3 : 2;
            if (arenaPractice.Queue.Count >= max)
            {
                Notice(max == 2 ? "Cola completa · el 3.er espacio requiere tres órdenes de la misma familia." : "Cola completa.");
                return;
            }
            arenaPractice.Queue.Add(new ArenaOrder { Family = family, Run = run });
            ArenaLog("Orden en cola: " + family + ".");
            RefreshArenaHud();
        }

        private void QueueArenaRocket()
        {
            var s = arenaPractice;
            if (s.Credits < 110) { ArenaLog("Cohete rechazado · faltan Créditos; no se cobró."); return; }
            int slot = s.RocketCooldowns[s.NextRocketSlot] <= 0 ? s.NextRocketSlot : 1 - s.NextRocketSlot;
            if (s.RocketCooldowns[slot] > 0) { ArenaLog("Los dos cohetes están recargando; no se cobró."); return; }
            s.Credits -= 110; s.Flights.Add(new ArenaRocketFlight { FromPlayer = true, Remaining = s.RocketTravel, Duration = s.RocketTravel, Damage = s.RocketDamage });
            s.RocketCooldowns[slot] = 10; s.NextRocketSlot = 1 - slot;
            ArenaLog("Estás preparando y lanzando " + s.RocketName + " · impacto estimado en " + s.RocketTravel.ToString("0") + " s.");
        }

        private void QueueArenaShield()
        {
            var s = arenaPractice;
            if (s.Credits < 90) { ArenaLog("Escudo rechazado · faltan Créditos; no se cobró."); return; }
            int slot = s.ShieldCooldowns[s.NextShieldSlot] <= 0 ? s.NextShieldSlot : 1 - s.NextShieldSlot;
            if (s.ShieldCooldowns[slot] > 0) { ArenaLog("Los dos escudos están recargando; no se cobró."); return; }
            s.Credits -= 90; s.Shield = Mathf.Min(470, s.Shield + 145); s.ShieldTime = 12;
            s.ShieldCooldowns[slot] = 12; s.NextShieldSlot = 1 - slot;
            ArenaLog("Escudo de carga rápida activo · 145 de capacidad por 12 s.");
        }

        private void QueueArenaSabotage()
        {
            var s = arenaPractice;
            if (s.Credits < 90) { ArenaLog("Sabotaje rechazado · faltan Créditos; no se cobró."); return; }
            if (s.SabotageCooldown > 0) { ArenaLog("Sabotaje recargando · esperá " + s.SabotageCooldown.ToString("0") + " s; no se cobró."); return; }
            s.Credits -= 90; s.BotSabotageTime = 10;
            s.SabotageCooldown = 32;
            ArenaLog("Sabotaje aplicado · ingreso rival reducido durante 10 s.");
        }

        private void QueueArenaGuardians()
        {
            var s = arenaPractice;
            if (s.Credits < 65) { ArenaLog("Guardianes rechazados · faltan Créditos; no se cobró."); return; }
            if (s.GuardianCooldown > 0) { ArenaLog("Guardianes recargando · esperá " + s.GuardianCooldown.ToString("0") + " s; no se cobró."); return; }
            s.Credits -= 65; s.NodeTravel = 8; s.PlayerTravelGuardians = 1;
            s.GuardianCooldown = 8;
            ArenaLog("Guardianes enviados al nodo · llegada en 8 s.");
        }

        private void QueueArenaUpgrade()
        {
            var s = arenaPractice; int[] costs = { 165, 360, 720 }; float[] rates = { 15, 24, 38 };
            if (s.Level >= costs.Length) { ArenaLog("Crecimiento al nivel máximo."); return; }
            if (s.Credits < costs[s.Level]) { ArenaLog("Mejora rechazada · faltan " + (costs[s.Level] - s.Credits).ToString("0") + " Créditos; no se cobró."); return; }
            s.Credits -= costs[s.Level]; s.Income = rates[s.Level]; s.Level++;
            ArenaLog("Crecimiento mejorado · ahora producís " + s.Income + " Créditos/s.");
        }

        private void QueueArenaReconfigure()
        {
            var s = arenaPractice;
            if (s == null) return;
            if (s.Finished) { ArenaLog("La partida terminó. Volvé a la Arena para empezar otra práctica."); return; }
            if (s.ChangedRocket || s.ReconfigureTime > 0) { ArenaLog("Reconfiguración no disponible · ya se usó o hay un cambio en curso."); return; }
            if (s.Energy < 40) { ArenaLog("Cambio rechazado · faltan 40 Energía; no se cobró."); return; }
            s.Energy -= 40; s.ChangedRocket = true; s.ReconfigureTime = 5;
            s.PendingRocketDamage = 300; s.PendingRocketTravel = 10;
            ArenaLog("Estás cambiando una investigación de cohetes · dura 5 s.");
        }

        private void ArenaTick(float deltaTime)
        {
            if (arenaLocalMatch != null && currentSection == HubSection.Pvp)
            {
                arenaLocalMatch.Advance(deltaTime);
                RefreshArenaCombatHud();
            }
            var s = arenaPractice;
            if (!arenaBattleVisible || currentSection != HubSection.Pvp || s == null || s.Finished) return;
            float dt = Mathf.Min(deltaTime, .25f);
            s.Time += dt; s.Credits += s.Income * (s.SabotageTime > 0 ? .7f : 1) * dt;
            s.BotCredits += s.BotIncome * (s.BotSabotageTime > 0 ? .7f : 1) * dt;
            s.SabotageTime = Mathf.Max(0, s.SabotageTime - dt); s.BotSabotageTime = Mathf.Max(0, s.BotSabotageTime - dt);
            s.SabotageCooldown = Mathf.Max(0, s.SabotageCooldown - dt);
            for (int slot = 0; slot < 2; slot++)
            { s.RocketCooldowns[slot] = Mathf.Max(0, s.RocketCooldowns[slot] - dt); s.ShieldCooldowns[slot] = Mathf.Max(0, s.ShieldCooldowns[slot] - dt); }
            s.GuardianCooldown = Mathf.Max(0, s.GuardianCooldown - dt); s.BotGuardianCooldown = Mathf.Max(0, s.BotGuardianCooldown - dt);
            s.BotSabotageCooldown = Mathf.Max(0, s.BotSabotageCooldown - dt);
            s.ShieldTime = Mathf.Max(0, s.ShieldTime - dt); if (s.ShieldTime <= 0) s.Shield = 0;
            s.BotShieldTime = Mathf.Max(0, s.BotShieldTime - dt); if (s.BotShieldTime <= 0) s.BotShield = 0;
            if (s.ReconfigureTime > 0 && (s.ReconfigureTime -= dt) <= 0)
            {
                s.RocketDamage = s.PendingRocketDamage; s.RocketTravel = s.PendingRocketTravel; s.RocketName = "Asedio";
                ArenaLog("Investigación de cohetes cambiada · Asedio está listo. Cohetes en vuelo conservan su tipo.");
            }
            if (s.NodeTravel > 0 && (s.NodeTravel -= dt) <= 0) ResolveArenaNode(true);
            if (s.BotNodeTravel > 0 && (s.BotNodeTravel -= dt) <= 0) ResolveArenaNode(false);
            if (s.NodeOwner >= 0)
            {
                if (s.NodeOwner == 0 && s.Extracted < 20)
                {
                    s.PlayerNodeControl += dt; int target = Mathf.Min(20, Mathf.FloorToInt(s.PlayerNodeControl / 9));
                    int gained = target - s.Extracted;
                    if (gained > 0) { s.Extracted = target; s.Energy = Mathf.Min(120, s.Energy + gained); }
                }
                else if (s.NodeOwner == 1 && s.BotExtracted < 20)
                {
                    s.BotNodeControl += dt; int target = Mathf.Min(20, Mathf.FloorToInt(s.BotNodeControl / 9));
                    int gained = target - s.BotExtracted;
                    if (gained > 0) { s.BotExtracted = target; s.BotEnergy = Mathf.Min(120, s.BotEnergy + gained); }
                }
            }
            for (int i = s.Flights.Count - 1; i >= 0; i--)
            {
                var flight = s.Flights[i]; flight.Remaining -= dt;
                if (flight.Remaining <= 0)
                {
                    float damage = flight.Damage;
                    if (flight.FromPlayer) { float absorbed = Mathf.Min(s.BotShield, damage); s.BotShield -= absorbed; damage -= absorbed; s.BotHp = Mathf.Max(0, s.BotHp - damage); ArenaLog("Impacto de cohete · " + damage.ToString("0") + " daño al núcleo rival."); }
                    else { float absorbed = Mathf.Min(s.Shield, damage); s.Shield -= absorbed; damage -= absorbed; s.PlayerHp = Mathf.Max(0, s.PlayerHp - damage); ArenaLog("¡Impacto rival! · " + damage.ToString("0") + " daño a tu núcleo."); }
                    s.Flights.RemoveAt(i);
                }
            }
            s.ActionClock += dt; s.BotClock += dt;
            if (s.Queue.Count > 0 && s.ActionClock >= .55f)
            {
                s.ActionClock = 0; var order = s.Queue[0]; s.Queue.RemoveAt(0); order.Run();
            }
            if (s.BotClock >= 7.5f)
            {
                s.BotClock = 0;
                if (s.BotLevel < 3 && s.BotCredits >= new[] { 165, 360, 720 }[s.BotLevel])
                { s.BotCredits -= new[] { 165, 360, 720 }[s.BotLevel]; s.BotIncome = new[] { 15f, 24f, 38f }[s.BotLevel]; s.BotLevel++; ArenaLog("El rival está mejorando su crecimiento."); }
                else if (s.BotCredits >= 110) { s.BotCredits -= 110; s.Flights.Add(new ArenaRocketFlight { FromPlayer = false, Remaining = 4, Duration = 4, Damage = 120 }); ArenaLog("El rival está creando un cohete."); }
                if (s.BotHp < 900 && s.BotShield <= 0 && s.BotCredits >= 90) { s.BotCredits -= 90; s.BotShield = 145; s.BotShieldTime = 12; ArenaLog("El rival activó un escudo."); }
                if (s.BotCredits >= 65 && s.BotNodeTravel <= 0 && s.BotGuardianCooldown <= 0 && s.NodeOwner != 1) { s.BotCredits -= 65; s.BotNodeTravel = 8; s.BotTravelGuardians = 1; s.BotGuardianCooldown = 8; ArenaLog("El rival envió guardianes al nodo."); }
            }
            if (s.BotSabotageCooldown <= 0 && s.Time >= 24 && s.BotCredits >= 115)
            { s.BotCredits -= 115; s.SabotageTime = 12; s.BotSabotageCooldown = 32; ArenaLog("El rival cambió su investigación y lanzó un sabotaje económico."); }
            if (s.Time >= 300 || s.PlayerHp <= 0 || s.BotHp <= 0)
            {
                s.Time = Mathf.Min(s.Time, 300); s.Finished = true;
                ArenaLog(s.PlayerHp == s.BotHp ? "EMPATE · ambos núcleos terminaron con la misma vida." : s.PlayerHp > s.BotHp ? "VICTORIA LOCAL · conservaste más vida." : "DERROTA LOCAL · el bot conservó más vida.");
                RefreshArenaHud();
            }
            arenaUiRefresh += dt;
            if (arenaUiRefresh >= .15f) { arenaUiRefresh = 0; RefreshArenaHud(); }
        }

        private void ResolveArenaNode(bool player)
        {
            var s = arenaPractice; int side = player ? 0 : 1;
            int attack = player ? s.PlayerTravelGuardians : s.BotTravelGuardians;
            int previousOwner = s.NodeOwner;
            if (s.NodeOwner < 0 || s.NodeOwner == side) { s.NodeOwner = side; s.NodeGuardians += attack; }
            else if (attack == s.NodeGuardians) { s.NodeOwner = -1; s.NodeGuardians = 0; }
            else if (attack > s.NodeGuardians) { s.NodeOwner = side; s.NodeGuardians = attack - s.NodeGuardians; }
            else s.NodeGuardians -= attack;
            if (player) s.PlayerTravelGuardians = 0; else s.BotTravelGuardians = 0;
            ArenaLog(s.NodeOwner == side ? (previousOwner == side ? "Refuerzo recibido en" : player ? "CAPTURASTE" : "El rival capturó") + " el nodo." :
                s.NodeOwner < 0 ? "El nodo quedó neutral." : previousOwner == side ? "PERDISTE el control del nodo." : "La guarnición del nodo se redujo.");
        }

        private void ArenaLog(string message)
        {
            if (arenaPractice == null) return;
            arenaPractice.Status = message; arenaPractice.Feed.Enqueue("• " + message);
            while (arenaPractice.Feed.Count > 5) arenaPractice.Feed.Dequeue();
            if (toast != null) Notice(message);
        }

        private void ApplyArenaGlassStyle(Transform root)
        {
            EnsureHudPanelSprites();
            foreach (var image in root.GetComponentsInChildren<Image>(true))
            {
                string objectName = image.gameObject.name;
                bool glassSurface = objectName == "Hero" || objectName.StartsWith("Card ·", StringComparison.Ordinal) ||
                    objectName.StartsWith("Action ", StringComparison.Ordinal) || objectName.StartsWith("Module ", StringComparison.Ordinal);
                if (!glassSurface) continue;
                image.sprite = hudPanelFill; image.type = Image.Type.Sliced;
                image.color = objectName.StartsWith("Action ", StringComparison.Ordinal)
                    ? new Color32(7, 57, 84, 190) : new Color32(7, 39, 67, 210);
                image.raycastTarget = true;
                var outline = image.GetComponent<Outline>(); if (outline != null) outline.effectColor = new Color32(83, 216, 248, 175);
                if (image.transform.Find("Arena glass reflection") != null) continue;
                var sheen = Panel("Arena glass reflection", image.transform, Color.white);
                Anchor(sheen, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
                var sheenImage = sheen.GetComponent<Image>(); sheenImage.sprite = hudPanelSheen; sheenImage.type = Image.Type.Sliced; sheenImage.raycastTarget = false;
                sheen.transform.SetAsFirstSibling();
            }
        }

        private void RefreshArenaHud()
        {
            var s = arenaPractice; if (s == null) return;
            if (arenaTimeText != null) arenaTimeText.text = string.Format("{0:00}:{1:00}", Mathf.FloorToInt(Mathf.Max(0, 300 - s.Time) / 60), Mathf.FloorToInt(Mathf.Max(0, 300 - s.Time) % 60));
            if (arenaPlayerHpText != null) arenaPlayerHpText.text = s.PlayerHp.ToString("0") + " / 1000";
            if (arenaBotHpText != null) arenaBotHpText.text = s.BotHp.ToString("0") + " / 1000";
            if (arenaPlayerHpFill != null) arenaPlayerHpFill.rectTransform.anchorMax = new Vector2(s.PlayerHp / 1000f, 1);
            if (arenaBotHpFill != null) arenaBotHpFill.rectTransform.anchorMax = new Vector2(s.BotHp / 1000f, 1);
            if (arenaPlayerShieldFill != null) arenaPlayerShieldFill.rectTransform.anchorMax = new Vector2(s.Shield / 470f, 1);
            if (arenaBotShieldFill != null) arenaBotShieldFill.rectTransform.anchorMax = new Vector2(s.BotShield / 470f, 1);
            if (arenaResourceText != null) arenaResourceText.text = s.Credits.ToString("0") + " C  ·  " + s.Energy.ToString("0") + " E  ·  +" + s.Income.ToString("0") + " C/s";
            if (arenaNodeText != null) arenaNodeText.text = (s.NodeOwner < 0 ? "NODO NEUTRAL" : s.NodeOwner == 0 ? "NODO CAPTURADO · VOS" : "NODO CAPTURADO · RIVAL") + " · " + s.NodeGuardians + " GUARDIANES · " + (s.NodeOwner == 0 ? s.Extracted : s.NodeOwner == 1 ? s.BotExtracted : 0) + " / 20 E";
            if (arenaEffectText != null) arenaEffectText.text = (s.Shield > 0 ? "◉ Escudo activo " + s.Shield.ToString("0") + "  " : "") + (s.SabotageTime > 0 ? "⌁ Te sabotean " + s.SabotageTime.ToString("0") + " s  " : s.BotSabotageTime > 0 ? "⌁ Sabotaje activo " + s.BotSabotageTime.ToString("0") + " s  " : "") + (s.ReconfigureTime > 0 ? "⇄ Cambio anunciado " + s.ReconfigureTime.ToString("0.0") + " s" : s.Shield <= 0 && s.SabotageTime <= 0 && s.BotSabotageTime <= 0 ? "Sin efectos activos" : "");
            if (arenaQueueText != null) arenaQueueText.text = s.Queue.Count == 0 ? "Cola vacía · 2 espacios" : "EN COLA · " + string.Join("  →  ", s.Queue.ConvertAll(item => item.Family.ToUpperInvariant()).ToArray()) + "  ·  " + (s.Queue.Count == 2 && s.Queue[0].Family == s.Queue[1].Family ? "3.er espacio: misma familia" : "máximo 2");
            if (arenaFeedText != null) arenaFeedText.text = string.Join("\n", s.Feed.ToArray());
            if (arenaPlayerShieldLabel != null) arenaPlayerShieldLabel.gameObject.SetActive(s.Shield > 0);
            if (arenaBotShieldLabel != null) arenaBotShieldLabel.gameObject.SetActive(s.BotShield > 0);
            RenderArenaRocketFlights(s);
        }

        private void RenderArenaRocketFlights(ArenaPracticeState state)
        {
            if (arenaRocketTrack == null) return;
            int activeCount = Mathf.Min(6, state.Flights.Count);
            while (arenaRocketMarkers.Count < activeCount)
            {
                var marker = Panel("Rocket in flight", arenaRocketTrack, new Color32(255, 181, 78, 255));
                PlacedLabel(marker.transform, "➤", 13, ink, FontStyle.Bold, TextAnchor.MiddleCenter, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
                arenaRocketMarkers.Add(marker);
            }
            int shown = 0;
            foreach (var flight in state.Flights)
            {
                if (shown++ >= 6) break;
                var marker = arenaRocketMarkers[shown - 1]; marker.SetActive(true);
                var rect = marker.GetComponent<RectTransform>();
                float progress = flight.Duration > 0 ? 1 - Mathf.Clamp01(flight.Remaining / flight.Duration) : 1;
                float verticalPosition = flight.FromPlayer ? progress : 1 - progress;
                rect.anchorMin = rect.anchorMax = new Vector2(.5f, verticalPosition);
                rect.sizeDelta = new Vector2(22, 18); rect.anchoredPosition = new Vector2((shown - 3) * 7, 0);
                marker.GetComponentInChildren<Text>().text = flight.FromPlayer ? "➤" : "◀";
            }
            for (int i = activeCount; i < arenaRocketMarkers.Count; i++) arenaRocketMarkers[i].SetActive(false);
        }
    }
}
