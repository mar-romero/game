using System;
using UnityEngine;
using UnityEngine.UI;

namespace FactoryWars.Unity6
{
    public sealed partial class FactoryWarsMobileApp
    {
        private string[][] arenaCandidates;
        private string[] arenaBans;
        private GameObject arenaPicker;
        private Transform arenaCombatRoot;
        private int arenaCollectionFocusFamily = -1;
        private readonly Button[,] arenaCombatButtons = new Button[3, 2];
        private readonly System.Collections.Generic.List<GameObject> arenaFlightMarkers = new System.Collections.Generic.List<GameObject>();
        private GameObject arenaPlayerBarrierVisual, arenaEnemyBarrierVisual;
        private Image arenaFightTint;
        private readonly Text[] arenaQueueLabels = new Text[3];
        private readonly GameObject[] arenaQueueSlots = new GameObject[3];
        private readonly Image[] arenaQueueFills = new Image[3];
        private Text arenaAlertText;
        private GameObject arenaImpactVisual;
        private GameObject arenaSabotageVisual, arenaGrowthVisual;
        private readonly System.Collections.Generic.Dictionary<string, Sprite> arenaArtSprites = new System.Collections.Generic.Dictionary<string, Sprite>();
        private float arenaFightViewportHeight;
        private static readonly string[][] ArenaIds = {
            new[] { "fast", "heavy", "burst", "piercing", "breaker", "emp", "vector", "exposed", "economical", "node" },
            new[] { "quick", "heavy", "interceptor", "sustained", "antiburst", "antipiercing", "regenerative", "reflection", "reinforced", "emergency" },
            new[] { "disrupt", "economy", "production", "cooldown", "launch", "ambush", "friction", "supplies", "reconfigure", "precision" }
        };

        private void InitArenaLoadout()
        {
            if (factoryV2Save == null) LoadFactoryV2();
            if (arenaCandidates != null) return;
            arenaCandidates = new[] { new[] { "fast", "heavy", "burst", "piercing" }, new[] { "quick", "heavy", "interceptor", "sustained" }, new[] { "disrupt", "economy", "production" } };
            arenaBans = new[] { "piercing", "sustained", "production" };
        }

        private void BuildArenaLobbyScreen()
        {
            InitArenaLoadout();
            Hero("ARENA", "TU FÁBRICA · TU ESTRATEGIA", "Prepará tu arsenal y elegí cómo jugar", cyan);
            var art = Card("MEGAFÁBRICA", "Cohetes · escudos · sabotaje", 470);
            var image = Panel("Arena Factory Art", art.transform, Color.white);
            image.transform.SetAsFirstSibling();
            Anchor(image, new Vector2(.015f, .025f), new Vector2(.985f, .975f), Vector2.zero, Vector2.zero);
            var imageComponent = image.GetComponent<Image>(); imageComponent.enabled = false; imageComponent.raycastTarget = false;
            var raw = new GameObject("Arena megafactory backdrop and tactics", typeof(RectTransform), typeof(RawImage)); raw.transform.SetParent(image.transform, false);
            Anchor(raw, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            var crop = raw.GetComponent<RawImage>();
            crop.texture = Resources.Load<Texture2D>("ArenaMegafactoryMenu") ?? Resources.Load<Texture2D>("MegafactoryIslandActive");
            crop.uvRect = new Rect(0, .11f, 1, .78f); crop.color = Color.white; crop.raycastTarget = false;
            var rocketButton = FlowActionButton(raw.transform, "⚡ COHETES", new Color32(240, 128, 70, 245), () => OpenArenaCollectionFamily(0));
            Anchor(rocketButton.gameObject, new Vector2(.025f, .155f), new Vector2(.335f, .245f), Vector2.zero, Vector2.zero);
            var shieldButton = FlowActionButton(raw.transform, "◈ ESCUDOS", cyan, () => OpenArenaCollectionFamily(1));
            Anchor(shieldButton.gameObject, new Vector2(.345f, .155f), new Vector2(.655f, .245f), Vector2.zero, Vector2.zero);
            var sabotageButton = FlowActionButton(raw.transform, "⌁ SABOTAJE", new Color32(177, 120, 250, 245), () => OpenArenaCollectionFamily(2));
            Anchor(sabotageButton.gameObject, new Vector2(.665f, .155f), new Vector2(.975f, .245f), Vector2.zero, Vector2.zero);
            var bansButton = FlowActionButton(raw.transform, "⛨ BLOQUEOS", new Color32(117, 177, 255, 245), OpenArenaCollectionBans);
            Anchor(bansButton.gameObject, new Vector2(.16f, .05f), new Vector2(.49f, .14f), Vector2.zero, Vector2.zero);
            var researchButton = FlowActionButton(raw.transform, "✦ INVESTIGAR", new Color32(255, 205, 101, 245), OpenArenaResearch);
            Anchor(researchButton.gameObject, new Vector2(.51f, .05f), new Vector2(.84f, .14f), Vector2.zero, Vector2.zero);

            var modes = Card("MODOS DE JUEGO", "Práctica local disponible · partidas clasificadas online todavía no conectadas", 196);
            var modeBody = CardBody(modes.transform);
            FlowActionButton(modeBody, "PVP · JUGAR CONTRA BOT", new Color32(72, 229, 202, 255), StartArenaLocalMatch);
            var ranked = FlowActionButton(modeBody, "PVP · CONTRA RANKING · NO DISPONIBLE", muted,
                () => Notice("Las partidas clasificadas todavía no están conectadas a Unity."));
            ranked.interactable = false;
            FlowActionButton(modeBody, "RANKING · VER CLASIFICACIÓN", gold, () => ShowSection(HubSection.Rankings));
            ApplyArenaGlassStyle(content);
        }

        private void BuildArenaCollectionScreen()
        {
            InitArenaLoadout();
            if (arenaCollectionBansOnly)
            {
                Hero("BLOQUEOS", "ELEGÍ QUÉ EXCLUIR", "Cada familia mantiene un bloqueo activo.", cyan);
                for (int family = 0; family < 3; family++)
                {
                    int f = family;
                    var card = Card(ArenaCatalog.Names[f], "Cambiar el módulo que queda fuera de la carga", 104);
                    FlowActionButton(CardBody(card.transform), "BLOQUEADO · " + ArenaCatalog.Find(f, arenaBans[f]).Name + "   ↻", muted, () => CycleArenaBan(f));
                }
                FlowActionButton(content, "VER COHETES, ESCUDOS Y SABOTAJES", cyan, () => { arenaCollectionBansOnly = false; ShowSection(HubSection.Pvp); });
                FlowActionButton(content, "VOLVER A ARENA", muted, () => { arenaCollectionVisible = false; arenaCollectionBansOnly = false; ShowSection(HubSection.Pvp); });
                ApplyArenaGlassStyle(content);
                return;
            }
            Hero("COLECCIÓN", "PREPARÁ TU CARGA", "4 / 4 / 3 elegidos · 2 / 2 / 1 activos · módulos investigados en Megafábrica", cyan);
            for (int family = 0; family < 3; family++)
            {
                int f = family; var glyph = f == 0 ? "⚡ " : f == 1 ? "◈ " : "⌁ ";
                var card = Card(glyph + (f == arenaCollectionFocusFamily ? "◉ " : "") + ArenaCatalog.Names[f], "Tocá un espacio para elegir variante", 315);
                var body = CardBody(card.transform);
                for (int slot = 0; slot < ArenaCatalog.CandidateCounts[f]; slot++)
                {
                    int s = slot;
                    var button = FlowActionButton(body, "", cyan, () => CycleArenaCandidate(f, s));
                    LayoutElement(button.gameObject).preferredHeight = 44;
                    RefreshArenaLoadoutButton(button, f, s);
                }
                if (f < 3)
                {
                    var ban = FlowActionButton(body, "BLOQUEO: " + ArenaCatalog.Find(f, arenaBans[f]).Name + "   ›", muted, () => CycleArenaBan(f));
                    LayoutElement(ban.gameObject).preferredHeight = 38;
                }
            }
            FlowActionButton(content, "VOLVER A ARENA", muted, () => { arenaCollectionVisible = false; ShowSection(HubSection.Pvp); });
            ApplyArenaGlassStyle(content);
        }

        private void OpenArenaCollectionFamily(int family)
        {
            arenaCollectionFocusFamily = family;
            arenaCollectionBansOnly = false;
            arenaCollectionVisible = true; ShowSection(HubSection.Pvp);
        }

        private void OpenArenaCollectionBans()
        {
            arenaCollectionBansOnly = true;
            arenaCollectionVisible = true;
            ShowSection(HubSection.Pvp);
        }

        private void OpenArenaResearch()
        {
            arenaCollectionVisible = false;
            arenaCollectionBansOnly = false;
            OpenFactoryV2Tab("prestige");
        }

        private void RefreshArenaLoadoutButton(Button button, int family, int slot)
        {
            var txt = button.GetComponentInChildren<Text>();
            if (txt == null) return;
            var module = ArenaCatalog.Find(family, arenaCandidates[family][slot]);
            txt.text = (slot < ArenaCatalog.ActiveCounts[family] ? "ACTIVO · " : "RESERVA · ") + module.Name + "   ›";
        }

        private void CycleArenaCandidate(int family, int slot)
        {
            string current = arenaCandidates[family][slot]; int index = Array.IndexOf(ArenaIds[family], current);
            for (int step = 1; step <= ArenaIds[family].Length; step++)
            {
                string next = ArenaIds[family][(index + step) % ArenaIds[family].Length];
                if (!ArenaVariantUnlocked(family, next)) continue;
                int existing = Array.IndexOf(arenaCandidates[family], next);
                if (existing >= 0) { arenaCandidates[family][existing] = current; }
                arenaCandidates[family][slot] = next; ShowSection(HubSection.Pvp); return;
            }
        }

        private void CycleArenaBan(int family)
        {
            int index = Array.IndexOf(ArenaIds[family], arenaBans[family]);
            for (int step = 1; step <= ArenaIds[family].Length; step++)
            {
                string next = ArenaIds[family][(index + step) % ArenaIds[family].Length];
                if (!ArenaVariantUnlocked(family, next)) continue;
                arenaBans[family] = next; ShowSection(HubSection.Pvp); return;
            }
        }

        private bool ArenaVariantUnlocked(int family, string id)
        {
            if (family == 0 && Array.IndexOf(new[] { "fast", "heavy", "burst", "piercing" }, id) >= 0) return true;
            if (family == 1 && Array.IndexOf(new[] { "quick", "heavy", "interceptor", "sustained" }, id) >= 0) return true;
            if (family == 2 && Array.IndexOf(new[] { "disrupt", "economy", "production" }, id) >= 0) return true;
            return factoryV2Save != null && HasFactoryV2Research(ArenaCatalog.Families[family] + ":" + id);
        }

        private void StartArenaLocalMatch()
        {
            InitArenaLoadout(); arenaCollectionVisible = false; arenaCollectionBansOnly = false;
            arenaLocalMatch = new ArenaLocalMatch(arenaCandidates, arenaBans);
            arenaBattleVisible = true; ShowSection(HubSection.Pvp);
        }

        private void BuildArenaCombatScreen()
        {
            var root = Panel("Arena Fullscreen Fight", content, new Color32(5, 20, 34, 245));
            arenaCombatRoot = root.transform;
            float viewportHeight = screenScroll != null && screenScroll.viewport != null ? screenScroll.viewport.rect.height : Screen.height;
            if (viewportHeight <= 0) viewportHeight = Screen.height;
            LayoutElement(root).preferredHeight = Mathf.Max(1, viewportHeight);
            var art = Panel("Arena Fight Art", root.transform, Color.white);
            Anchor(art, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            art.GetComponent<Image>().sprite = Resources.Load<Sprite>("ArenaMegafactoryBattlefield") ?? Resources.Load<Sprite>("FactoryWarsBattlefield"); art.GetComponent<Image>().preserveAspect = true;
            art.GetComponent<Image>().color = Color.white;
            Panel("Fight glass overlay", art.transform, new Color(5f / 255, 22f / 255, 38f / 255, .035f));
            Anchor(art.transform.Find("Fight glass overlay").gameObject, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            var tintObject = Panel("Arena effect tint", art.transform, new Color(0, 0, 0, 0));
            Anchor(tintObject, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            arenaFightTint = tintObject.GetComponent<Image>();
            arenaFightTint.raycastTarget = false;
            arenaEnemyBarrierVisual = Panel("Enemy barrier glow", art.transform, new Color32(30, 204, 255, 85));
            Anchor(arenaEnemyBarrierVisual, new Vector2(.28f, .72f), new Vector2(.72f, .90f), Vector2.zero, Vector2.zero);
            ConfigureArenaArt(arenaEnemyBarrierVisual, "ArenaShield");
            arenaPlayerBarrierVisual = Panel("Player barrier glow", art.transform, new Color32(30, 204, 255, 85));
            Anchor(arenaPlayerBarrierVisual, new Vector2(.28f, .22f), new Vector2(.72f, .40f), Vector2.zero, Vector2.zero);
            ConfigureArenaArt(arenaPlayerBarrierVisual, "ArenaShield");
            arenaImpactVisual = Panel("Arena impact ring", art.transform, Color.clear);
            ConfigureArenaArt(arenaImpactVisual, "ArenaShield");
            arenaSabotageVisual = Panel("Arena sabotage interference", art.transform, Color.clear); ConfigureArenaArt(arenaSabotageVisual, "ArenaSabotage");
            arenaGrowthVisual = Panel("Arena economic growth", art.transform, Color.clear); ConfigureArenaArt(arenaGrowthVisual, "ArenaEconomy");
            var top = ArenaGlassPanel("Arena status", root.transform, .55f);
            Anchor(top, new Vector2(.02f, .90f), new Vector2(.98f, .985f), Vector2.zero, Vector2.zero);
            arenaTimeText = PlacedLabel(top.transform, "05:00", 17, white, FontStyle.Bold, TextAnchor.MiddleCenter, new Vector2(.38f, .5f), new Vector2(.62f, 1), Vector2.zero, Vector2.zero);
            arenaResourceText = PlacedLabel(top.transform, "", 10, white, FontStyle.Bold, TextAnchor.MiddleCenter, new Vector2(.02f, 0), new Vector2(.98f, .4f), Vector2.zero, Vector2.zero);
            arenaPlayerHpText = PlacedLabel(top.transform, "", 10, white, FontStyle.Bold, TextAnchor.MiddleLeft, new Vector2(.02f, .4f), new Vector2(.39f, .95f), Vector2.zero, Vector2.zero);
            arenaBotHpText = PlacedLabel(top.transform, "", 10, white, FontStyle.Bold, TextAnchor.MiddleRight, new Vector2(.61f, .4f), new Vector2(.98f, .95f), Vector2.zero, Vector2.zero);
            var alerts = ArenaGlassPanel("Arena notifications", root.transform, .62f);
            Anchor(alerts, new Vector2(.04f, .755f), new Vector2(.96f, .892f), Vector2.zero, Vector2.zero);
            arenaAlertText = PlacedLabel(alerts.transform, "", 10, white, FontStyle.Bold, TextAnchor.MiddleLeft, new Vector2(.03f, .03f), new Vector2(.97f, .97f), Vector2.zero, Vector2.zero);
            arenaNodeText = PlacedLabel(root.transform, "NODO CENTRAL · NEUTRAL", 10, gold, FontStyle.Bold, TextAnchor.MiddleCenter, new Vector2(.18f, .54f), new Vector2(.82f, .58f), Vector2.zero, Vector2.zero);
            arenaQueueText = PlacedLabel(root.transform, "PREPARACIÓN · 0 / 2", 10, white, FontStyle.Bold, TextAnchor.MiddleCenter, new Vector2(.08f, .49f), new Vector2(.92f, .525f), Vector2.zero, Vector2.zero);
            for (int i = 0; i < 3; i++)
            {
                arenaQueueSlots[i] = ArenaGlassPanel("Preparation slot " + i, root.transform, .48f);
                arenaQueueLabels[i] = PlacedLabel(arenaQueueSlots[i].transform, "DISPONIBLE", 9, white, FontStyle.Bold, TextAnchor.MiddleCenter, new Vector2(.02f, .15f), new Vector2(.98f, .98f), Vector2.zero, Vector2.zero);
                var progress = Panel("Preparation progress", arenaQueueSlots[i].transform, cyan);
                Anchor(progress, new Vector2(.03f, .03f), new Vector2(.03f, .10f), Vector2.zero, Vector2.zero);
                arenaQueueFills[i] = progress.GetComponent<Image>(); arenaQueueFills[i].raycastTarget = false;
            }
            BuildArenaTap(root.transform, 0, 0, "COHETE IZQ.", new Vector2(.025f, .285f), new Vector2(.325f, .405f));
            BuildArenaTap(root.transform, 0, 1, "COHETE DER.", new Vector2(.675f, .285f), new Vector2(.975f, .405f));
            BuildArenaTap(root.transform, 1, 0, "ESCUDO IZQ.", new Vector2(.025f, .16f), new Vector2(.485f, .275f));
            BuildArenaTap(root.transform, 1, 1, "ESCUDO DER.", new Vector2(.515f, .16f), new Vector2(.975f, .275f));
            var guardians = ArenaArtButton(root.transform, "GUARDIANES · 65 C", "ArenaGuardian", () => { arenaLocalMatch.Guardians(0); RefreshArenaCombatHud(); });
            Anchor(guardians.gameObject, new Vector2(.345f, .285f), new Vector2(.655f, .405f), Vector2.zero, Vector2.zero);
            BuildArenaTap(root.transform, 2, 0, "SABOTAJE", new Vector2(.025f, .055f), new Vector2(.485f, .15f));
            var economy = ArenaArtButton(root.transform, "MEJORAR ECONOMÍA", "ArenaEconomy", () => { arenaLocalMatch.Upgrade(0); RefreshArenaCombatHud(); });
            Anchor(economy.gameObject, new Vector2(.515f, .055f), new Vector2(.975f, .15f), Vector2.zero, Vector2.zero);
            arenaEffectText = PlacedLabel(root.transform, "", 9, cyan, FontStyle.Bold, TextAnchor.MiddleCenter, new Vector2(.03f, .405f), new Vector2(.97f, .428f), Vector2.zero, Vector2.zero);
            var exit = FlowActionButton(root.transform, "SALIR", muted, LeaveArenaFight);
            Anchor(exit.gameObject, new Vector2(.36f, .007f), new Vector2(.64f, .048f), Vector2.zero, Vector2.zero);
            StyleArenaCombatButton(exit); RefreshArenaCombatHud();
        }

        private void ConfigureArenaArt(GameObject go, string resource)
        {
            Sprite sprite;
            if (!arenaArtSprites.TryGetValue(resource, out sprite)) { sprite = Resources.Load<Sprite>(resource); arenaArtSprites[resource] = sprite; }
            var image = go.GetComponent<Image>(); image.sprite = sprite;
            image.type = Image.Type.Simple; image.preserveAspect = true; image.raycastTarget = false;
        }
        private GameObject ArenaGlassPanel(string name, Transform parent, float opacity)
        {
            EnsureHudPanelSprites();
            var go = Panel(name, parent, new Color(.025f, .12f, .19f, opacity));
            var image = go.GetComponent<Image>(); image.sprite = hudPanelFill; image.type = Image.Type.Sliced;
            var border = Panel("Glass border", go.transform, new Color(.35f, .9f, 1, .65f));
            Anchor(border, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            border.GetComponent<Image>().sprite = hudPanelEdge; border.GetComponent<Image>().type = Image.Type.Sliced; border.GetComponent<Image>().raycastTarget = false;
            return go;
        }
        private void StyleArenaCombatButton(Button button)
        {
            EnsureHudPanelSprites();
            var image = button.GetComponent<Image>(); image.sprite = hudPanelFill; image.type = Image.Type.Sliced;
            image.color = new Color(.03f, .24f, .33f, .10f);
            var outline = button.GetComponent<Outline>(); if (outline != null) outline.enabled = false;
            var border = Panel("Glass button border", button.transform, new Color(.38f, .94f, 1, .7f));
            Anchor(border, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            border.GetComponent<Image>().sprite = hudPanelEdge; border.GetComponent<Image>().type = Image.Type.Sliced; border.GetComponent<Image>().raycastTarget = false;
            ButtonFeedback(button);
            var colors = button.colors; colors.pressedColor = new Color(.45f, 1, 1, .95f); colors.highlightedColor = new Color(.75f, 1, 1, 1); button.colors = colors;
        }
        private Button ArenaArtButton(Transform parent, string label, string art, Action action)
        {
            var button = FlowActionButton(parent, label, cyan, () => action()); StyleArenaCombatButton(button);
            var text = button.GetComponentInChildren<Text>(); text.fontSize = 9;
            Anchor(text.gameObject, new Vector2(.03f, .03f), new Vector2(.97f, .27f), Vector2.zero, Vector2.zero);
            var shadow = text.gameObject.AddComponent<Shadow>(); shadow.effectColor = new Color(0, .02f, .05f, .95f); shadow.effectDistance = new Vector2(1, -1);
            var icon = Panel("Complete module illustration", button.transform, Color.white);
            Anchor(icon, new Vector2(.1f, .28f), new Vector2(.9f, .98f), Vector2.zero, Vector2.zero);
            ConfigureArenaArt(icon, art); icon.GetComponent<Image>().color = new Color(1, 1, 1, .9f);
            return button;
        }

        private void BuildArenaTap(Transform parent, int family, int slot, string label, Vector2 min, Vector2 max)
        {
            var module = ArenaCatalog.Find(family, arenaLocalMatch.Players[0].Active[family][slot]);
            var button = ArenaArtButton(parent, label + " · " + module.Name, family == 0 ? "ArenaRocket" : family == 1 ? "ArenaShield" : "ArenaSabotage", () => { });
            var gesture = button.gameObject.AddComponent<ArenaLongPressGesture>();
            gesture.Initialize(() => OpenArenaPicker(family, slot), () =>
            {
                var selected = ArenaCatalog.Find(family, arenaLocalMatch.Players[0].Active[family][slot]);
                if (family == 2 && selected.Targeted) OpenArenaTargetPicker(selected);
                else { arenaLocalMatch.Use(0, family, slot); RefreshArenaCombatHud(); }
            });
            button.onClick.RemoveAllListeners(); button.onClick.AddListener(gesture.HandleClick);
            arenaCombatButtons[family, slot] = button;
            Anchor(button.gameObject, min, new Vector2(min.x + (max.x - min.x) * .78f, max.y), Vector2.zero, Vector2.zero);
            var change = FlowActionButton(parent, "↻", cyan, () => OpenArenaPicker(family, slot));
            StyleArenaCombatButton(change);
            Anchor(change.gameObject, new Vector2(min.x + (max.x - min.x) * .80f, min.y), max, Vector2.zero, Vector2.zero);
        }

        private void OpenArenaPicker(int family, int slot)
        {
            if (arenaPicker != null) Destroy(arenaPicker);
            arenaPicker = Panel("Arena module picker", arenaCombatRoot, new Color32(3, 17, 29, 248));
            Anchor(arenaPicker, new Vector2(.08f, .12f), new Vector2(.92f, .88f), Vector2.zero, Vector2.zero);
            PlacedLabel(arenaPicker.transform, "ELEGIR " + ArenaCatalog.Names[family], 15, white, FontStyle.Bold, TextAnchor.MiddleCenter, new Vector2(0, .84f), Vector2.one, Vector2.zero, Vector2.zero);
            int index = 0;
            for (int i = 0; i < arenaLocalMatch.Players[0].Options[family].Length; i++)
            {
                string id = arenaLocalMatch.Players[0].Options[family][i]; if (Array.IndexOf(arenaLocalMatch.Players[0].Active[family], id) >= 0) continue;
                string option = id; var m = ArenaCatalog.Find(family, id);
                var choice = FlowActionButton(arenaPicker.transform, m.Name + " · 40 E", cyan, () =>
                { arenaLocalMatch.Change(0, family, slot, option); Destroy(arenaPicker); arenaPicker = null; RefreshArenaCombatHud(); });
                float top = .78f - index * .13f; Anchor(choice.gameObject, new Vector2(.08f, top - .11f), new Vector2(.92f, top), Vector2.zero, Vector2.zero); index++;
            }
            var close = FlowActionButton(arenaPicker.transform, "CERRAR", muted, () => { Destroy(arenaPicker); arenaPicker = null; });
            Anchor(close.gameObject, new Vector2(.25f, .03f), new Vector2(.75f, .13f), Vector2.zero, Vector2.zero);
        }

        private void OpenArenaTargetPicker(ArenaModule module)
        {
            if (arenaPicker != null) Destroy(arenaPicker);
            arenaPicker = Panel("Arena target picker", arenaCombatRoot, new Color32(3, 17, 29, 248));
            Anchor(arenaPicker, new Vector2(.08f, .18f), new Vector2(.92f, .82f), Vector2.zero, Vector2.zero);
            PlacedLabel(arenaPicker.transform, "OBJETIVO · " + module.Name, 14, white, FontStyle.Bold, TextAnchor.MiddleCenter, new Vector2(0, .84f), Vector2.one, Vector2.zero, Vector2.zero);
            int[] families = module.SlotTargeted ? new[] { 0, 0, 1, 1 } : new[] { 0, 1, 2 };
            int[] slots = module.SlotTargeted ? new[] { 0, 1, 0, 1 } : new[] { 0, 0, 0 };
            for (int i = 0; i < families.Length; i++)
            {
                int targetFamily = families[i], targetSlot = slots[i];
                string targetName = ArenaCatalog.Names[targetFamily] + (module.SlotTargeted ? (targetSlot == 0 ? " · IZQUIERDO" : " · DERECHO") : "");
                var choice = FlowActionButton(arenaPicker.transform, targetName, cyan, () =>
                {
                    arenaLocalMatch.Use(0, 2, 0, targetFamily, targetSlot); RefreshArenaCombatHud();
                    Destroy(arenaPicker); arenaPicker = null;
                });
                float top = .76f - i * .15f; Anchor(choice.gameObject, new Vector2(.08f, top - .12f), new Vector2(.92f, top), Vector2.zero, Vector2.zero);
            }
            var close = FlowActionButton(arenaPicker.transform, "CERRAR", muted, () => { Destroy(arenaPicker); arenaPicker = null; });
            Anchor(close.gameObject, new Vector2(.25f, .03f), new Vector2(.75f, .14f), Vector2.zero, Vector2.zero);
        }

        private void RefreshArenaCombatHud()
        {
            if (arenaLocalMatch == null || arenaTimeText == null) return;
            var p = arenaLocalMatch.Players[0]; var e = arenaLocalMatch.Players[1];
            int remaining = Mathf.CeilToInt(300 - arenaLocalMatch.Time);
            arenaTimeText.text = (remaining / 60).ToString("00") + ":" + (remaining % 60).ToString("00");
            arenaResourceText.text = p.Credits.ToString("0") + " C · " + p.Energy.ToString("0") + " E · +" + arenaLocalMatch.Income(0).ToString("0") + " C/s";
            arenaPlayerHpText.text = "TU NÚCLEO · " + p.Hp.ToString("0") + "   ◈ " + p.Shield.ToString("0");
            arenaBotHpText.text = "RIVAL · " + e.Hp.ToString("0") + "   ◈ " + e.Shield.ToString("0");
            if (arenaQueueText != null)
            {
                int queueLimit = arenaLocalMatch.Orders.Count == 3 ? 3 : 2;
                bool extraAvailable = arenaLocalMatch.Orders.Count == 2 && arenaLocalMatch.Orders[0].Key == arenaLocalMatch.Orders[1].Key;
                arenaQueueText.text = "PREPARACIÓN · " + arenaLocalMatch.Orders.Count + " / " + queueLimit + (extraAvailable ? " · +1 IGUAL" : "") + (p.Pending != null ? " · CAMBIO " + Mathf.CeilToInt(p.Pending.Remaining) + "s" : "");
                for (int i = 0; i < 3; i++)
                {
                    if (arenaQueueSlots[i] == null) continue;
                    arenaQueueSlots[i].SetActive(i < queueLimit);
                    if (i >= queueLimit) continue;
                    float width = .94f / queueLimit;
                    Anchor(arenaQueueSlots[i], new Vector2(.03f + i * width, .434f), new Vector2(.03f + (i + 1) * width - .012f, .489f), Vector2.zero, Vector2.zero);
                    bool occupied = i < arenaLocalMatch.Orders.Count;
                    var order = occupied ? arenaLocalMatch.Orders[i] : null;
                    arenaQueueLabels[i].text = !occupied ? "ESPACIO " + (i + 1) + "\nDISPONIBLE" : order.Name + "\n" + (order.Remaining > .00001f ? "CREANDO · " + order.Remaining.ToString("0.0") + " s" : "LISTO · ESPERA TURNO");
                    float progress = occupied ? 1 - order.Remaining / order.Duration : 0;
                    arenaQueueFills[i].rectTransform.anchorMax = new Vector2(.03f + .94f * progress, .10f);
                    arenaQueueFills[i].color = occupied && order.Remaining <= .00001f ? new Color(.35f, 1, .65f) : cyan;
                }
            }
            if (arenaNodeText != null) arenaNodeText.text = arenaLocalMatch.NodeOwner < 0 ? "NODO CENTRAL · NEUTRAL" : arenaLocalMatch.NodeOwner == 0 ? "NODO · TUYO · " + arenaLocalMatch.NodeGuardians + " GUARDIANES" : "NODO · RIVAL · " + arenaLocalMatch.NodeGuardians + " GUARDIANES";
            for (int family = 0; family < 3; family++) for (int slot = 0; slot < ArenaCatalog.ActiveCounts[family]; slot++)
            {
                var button = arenaCombatButtons[family, slot]; if (button == null) continue;
                var module = ArenaCatalog.Find(family, p.Active[family][slot]); var label = button.GetComponentInChildren<Text>();
                float cooldown = p.Cooldowns[family][slot];
                if (label != null) label.text = module.Name + " · " + (cooldown > 0 ? "RECARGA " + Mathf.CeilToInt(cooldown) + " s" : module.Cost.ToString("0") + " C");
            }
            var traveling = arenaLocalMatch.Flights.FindAll(f => f.Side == 0 && f.Kind != "shield");
            if (arenaEffectText != null) arenaEffectText.text = traveling.Count > 0 ? "EN CAMINO · " + traveling.Count + " · PRÓXIMA LLEGADA " + Mathf.CeilToInt(Mathf.Max(0, traveling[0].At - arenaLocalMatch.Time)) + " s" : arenaLocalMatch.Status;
            RefreshArenaAlerts();
            SyncArenaFlightMarkers();
            UpdateArenaBarrierVisual(arenaPlayerBarrierVisual, p);
            UpdateArenaBarrierVisual(arenaEnemyBarrierVisual, e);
            if (arenaImpactVisual != null)
            {
                float pulse = arenaLocalMatch.ImpactPulse;
                arenaImpactVisual.SetActive(pulse > 0);
                float y = arenaLocalMatch.LastImpactSide == 0 ? .31f : .81f;
                float radius = .1f + (.8f - pulse) * .10f;
                Anchor(arenaImpactVisual, new Vector2(.5f - radius, y - radius * .6f), new Vector2(.5f + radius, y + radius * .6f), Vector2.zero, Vector2.zero);
                arenaImpactVisual.GetComponent<Image>().color = new Color(1, .4f, .12f, pulse);
            }
            AnimateArenaEvent(arenaSabotageVisual, arenaLocalMatch.SabotagePulse, arenaLocalMatch.LastSabotageTarget, ArenaSabotageColor(arenaLocalMatch.LastSabotageId));
            AnimateArenaEvent(arenaGrowthVisual, arenaLocalMatch.GrowthPulse, arenaLocalMatch.LastGrowthSide, new Color(.35f, 1, .65f, 1));
            if (arenaFightTint != null)
            {
                float pulse = Mathf.Max(arenaLocalMatch.SabotagePulse, Mathf.Max(arenaLocalMatch.GrowthPulse, arenaLocalMatch.NodePulse));
                Color tint = arenaLocalMatch.SabotagePulse > 0 ? ArenaSabotageColor(arenaLocalMatch.LastSabotageId) : arenaLocalMatch.GrowthPulse > 0 ? new Color(.15f, 1f, .5f, .12f) : new Color(1f, .7f, .12f, .12f);
                tint.a *= pulse > 0 ? Mathf.Clamp01(pulse) : 0; arenaFightTint.color = tint;
            }
            UpdateArenaFightHeight();
        }

        private void AnimateArenaEvent(GameObject visual, float pulse, int side, Color color)
        {
            if (visual == null) return;
            visual.SetActive(pulse > 0);
            if (pulse <= 0) return;
            float y = (side == 0 ? .35f : .83f) + (2 - pulse) * .012f;
            Anchor(visual, new Vector2(.37f, y - .05f), new Vector2(.63f, y + .05f), Vector2.zero, Vector2.zero);
            color.a = Mathf.Clamp01(pulse) * .85f; visual.GetComponent<Image>().color = color;
            visual.transform.localEulerAngles = new Vector3(0, 0, Mathf.Sin(Time.unscaledTime * 15) * 5);
        }

        private void UpdateArenaFightHeight()
        {
            if (arenaCombatRoot == null || screenScroll == null || screenScroll.viewport == null) return;
            float height = screenScroll.viewport.rect.height;
            if (height <= 0 || Mathf.Abs(height - arenaFightViewportHeight) < 1) return;
            arenaFightViewportHeight = height;
            LayoutElement(arenaCombatRoot.gameObject).preferredHeight = Mathf.Max(1, height);
            LayoutRebuilder.MarkLayoutForRebuild(content);
        }

        private void RefreshArenaAlerts()
        {
            if (arenaAlertText == null) return;
            var lines = new System.Collections.Generic.List<string>();
            var attacks = arenaLocalMatch.Flights.FindAll(f => f.Side == 1 && f.Kind == "rocket");
            attacks.Sort((a, b) => a.At.CompareTo(b.At));
            if (attacks.Count > 0) lines.Add("¡ATAQUE EN CAMINO! " + attacks.Count + " · LLEGA EN " + Mathf.Max(0, attacks[0].At - arenaLocalMatch.Time).ToString("0.0") + " s");
            foreach (var order in arenaLocalMatch.BotOrders)
                if (order.Family == 0) { lines.Add("RIVAL PREPARA " + order.Name + " · " + (order.Remaining > 0 ? order.Remaining.ToString("0.0") + " s" : "LISTO EN COLA")); break; }
            // Oldest events keep their row until their lifetime ends; new events cannot overwrite them.
            foreach (var notice in arenaLocalMatch.Notices)
            {
                if (lines.Count >= 5) break;
                if (notice.ShownUntil < 0) notice.ShownUntil = arenaLocalMatch.Time + 7;
                lines.Add(notice.Text);
            }
            if (arenaLocalMatch.Finished) lines.Insert(0, arenaLocalMatch.Status);
            arenaAlertText.text = string.Join("\n", lines.ToArray());
            arenaAlertText.transform.parent.gameObject.SetActive(lines.Count > 0);
        }

        private static Color ArenaSabotageColor(string id)
        {
            switch (id)
            {
                case "economy": return new Color(.95f, .28f, .35f, .15f);
                case "production": return new Color(1f, .56f, .16f, .15f);
                case "cooldown": return new Color(.54f, .34f, 1f, .15f);
                case "launch": return new Color(1f, .3f, .19f, .15f);
                case "ambush": return new Color(.22f, .5f, 1f, .15f);
                case "friction": return new Color(.94f, .72f, .19f, .15f);
                case "supplies": return new Color(.22f, .84f, .6f, .15f);
                case "reconfigure": return new Color(.9f, .26f, .72f, .15f);
                case "precision": return new Color(.24f, .72f, 1f, .15f);
                default: return new Color(.65f, .25f, .9f, .14f);
            }
        }

        private void SyncArenaFlightMarkers()
        {
            int count = arenaLocalMatch.Flights.Count;
            while (arenaFlightMarkers.Count < count)
            {
                var marker = Panel("Arena flying effect", arenaCombatRoot, new Color32(255, 191, 87, 255));
                marker.GetComponent<Image>().raycastTarget = false;
                arenaFlightMarkers.Add(marker);
            }
            while (arenaFlightMarkers.Count > count)
            {
                int last = arenaFlightMarkers.Count - 1; Destroy(arenaFlightMarkers[last]); arenaFlightMarkers.RemoveAt(last);
            }
            for (int i = 0; i < count; i++)
            {
                var flight = arenaLocalMatch.Flights[i]; var marker = arenaFlightMarkers[i]; var rect = marker.GetComponent<RectTransform>();
                float span = Mathf.Max(.1f, flight.At - flight.Started); float progress = Mathf.Clamp01((arenaLocalMatch.Time - flight.Started) / span);
                float x = flight.Kind == "guardians" ? .5f : flight.Slot == 0 ? .29f : .71f;
                x += Mathf.Sin(progress * Mathf.PI) * (flight.Slot == 0 ? -.045f : .045f);
                float y;
                if (flight.Kind == "guardians") y = flight.Side == 0 ? Mathf.Lerp(.31f, .56f, progress) : Mathf.Lerp(.81f, .56f, progress);
                else if (flight.Kind == "shield") y = flight.Side == 0 ? Mathf.Lerp(.41f, .31f, progress) : Mathf.Lerp(.71f, .81f, progress);
                else y = flight.Side == 0 ? Mathf.Lerp(.31f, .81f, progress) : Mathf.Lerp(.81f, .31f, progress);
                rect.anchorMin = rect.anchorMax = new Vector2(x, y); rect.anchoredPosition = Vector2.zero; rect.sizeDelta = new Vector2(flight.Kind == "rocket" ? 44 : 38, flight.Kind == "rocket" ? 58 : 44);
                rect.localEulerAngles = flight.Kind == "rocket" ? new Vector3(0, 0, flight.Side == 0 ? -18 : 162) : Vector3.zero;
                ConfigureArenaArt(marker, flight.Kind == "rocket" ? "ArenaRocket" : flight.Kind == "guardians" ? "ArenaGuardian" : "ArenaShield");
                var color = ArenaFlightColor(flight);
                if (flight.Kind == "rocket" && flight.Module != null && flight.Module.Shots > 1) rect.sizeDelta = new Vector2(36, 48);
                marker.GetComponent<Image>().color = color;
            }
        }

        private static Color ArenaFlightColor(ArenaLocalMatch.Flight flight)
        {
            string id = flight.Module == null ? "" : flight.Module.Id;
            if (flight.Kind == "guardians") return new Color32(252, 216, 110, 255);
            if (flight.Kind == "shield")
            {
                switch (id)
                {
                    case "interceptor": case "antiburst": case "antipiercing": return new Color32(182, 145, 255, 255);
                    case "regenerative": return new Color32(87, 249, 156, 255);
                    case "reflection": return new Color32(255, 118, 214, 255);
                    case "reinforced": case "heavy": return new Color32(71, 165, 255, 255);
                    case "emergency": return new Color32(255, 218, 83, 255);
                    default: return new Color32(71, 223, 255, 255);
                }
            }
            switch (id)
            {
                case "heavy": return new Color32(255, 71, 61, 255);
                case "burst": return new Color32(255, 202, 74, 255);
                case "piercing": return new Color32(203, 110, 255, 255);
                case "emp": return new Color32(79, 218, 255, 255);
                case "breaker": return new Color32(255, 107, 86, 255);
                case "vector": return new Color32(141, 245, 111, 255);
                case "exposed": return new Color32(255, 137, 61, 255);
                default: return flight.Side == 0 ? new Color32(255, 164, 86, 255) : new Color32(255, 91, 92, 255);
            }
        }

        private void UpdateArenaBarrierVisual(GameObject visual, ArenaLocalMatch.Player player)
        {
            if (visual == null) return;
            if (player.Barriers.Count == 0) { visual.SetActive(false); return; }
            visual.SetActive(true);
            var barrier = player.Barriers[player.Barriers.Count - 1];
            Color tint = ArenaFlightColor(new ArenaLocalMatch.Flight { Kind = "shield", Module = barrier.Module });
            tint.a = .6f + Mathf.Sin(Time.unscaledTime * 4f) * .12f;
            visual.GetComponent<Image>().color = tint;
            visual.transform.localScale = Vector3.one * (1 + Mathf.Sin(Time.unscaledTime * 2.5f) * .035f);
        }

        private void LeaveArenaFight()
        {
            if (arenaPicker != null) Destroy(arenaPicker);
            arenaPicker = null; arenaCombatRoot = null; arenaLocalMatch = null; arenaBattleVisible = false;
            arenaFlightMarkers.Clear(); arenaPlayerBarrierVisual = null; arenaEnemyBarrierVisual = null; arenaFightTint = null; arenaFightViewportHeight = 0;
            arenaImpactVisual = null; arenaAlertText = null; arenaSabotageVisual = null; arenaGrowthVisual = null;
            for (int family = 0; family < 3; family++) for (int slot = 0; slot < 2; slot++) arenaCombatButtons[family, slot] = null;
            ShowSection(HubSection.Pvp);
        }

    }

    internal sealed class ArenaLongPressGesture : MonoBehaviour, UnityEngine.EventSystems.IPointerDownHandler,
        UnityEngine.EventSystems.IPointerUpHandler, UnityEngine.EventSystems.IPointerExitHandler
    {
        private Action openPicker, tapAction;
        private float downAt;
        private bool isDown, fired, suppressClick;
        public void Initialize(Action picker, Action tap) { openPicker = picker; tapAction = tap; }
        public void OnPointerDown(UnityEngine.EventSystems.PointerEventData eventData)
        { isDown = true; fired = false; suppressClick = false; downAt = Time.unscaledTime; }
        public void OnPointerUp(UnityEngine.EventSystems.PointerEventData eventData)
        { isDown = false; }
        public void OnPointerExit(UnityEngine.EventSystems.PointerEventData eventData) { isDown = false; }
        private void Update()
        {
            if (isDown && !fired && Time.unscaledTime - downAt >= 3f)
            { fired = true; suppressClick = true; openPicker?.Invoke(); }
        }
        public void HandleClick()
        { if (suppressClick) { suppressClick = false; return; } tapAction?.Invoke(); }
    }
}
