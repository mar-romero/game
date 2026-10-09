using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Events;
using UnityEngine.UI;

namespace FactoryWars.Unity6
{
    public enum HubSection { MegaFactory, Pvp, Rankings, Civilizations }

    [Serializable]
    public sealed class IntegrationEvent : UnityEvent<string> { }

    [DefaultExecutionOrder(-100)]
    public sealed partial class FactoryWarsMobileApp : MonoBehaviour
    {
        [Header("Integration seams")]
        [Tooltip("Connect this event to the future identity, matchmaking, save, or leaderboard adapters.")]
        public IntegrationEvent onIntegrationRequested = new IntegrationEvent();

        private readonly Color ink = new Color32(7, 16, 29, 255);
        private readonly Color panel = new Color32(16, 34, 53, 245);
        private readonly Color panelLight = new Color32(22, 46, 68, 245);
        private readonly Color line = new Color32(52, 86, 112, 255);
        private readonly Color cyan = new Color32(73, 205, 235, 255);
        private readonly Color gold = new Color32(255, 195, 74, 255);
        private readonly Color white = new Color32(237, 246, 252, 255);
        private readonly Color muted = new Color32(157, 181, 198, 255);
        private readonly List<GameObject> sceneObjects = new List<GameObject>();
        private readonly Dictionary<Color, Material> worldMaterials = new Dictionary<Color, Material>();

        private Canvas canvas;
        private RectTransform content;
        private RectTransform nav;
        private GameObject toastPanel;
        private Text toast;
        private HubSection currentSection = HubSection.MegaFactory;
        private int selectedCivilization = -1;
        private float toastUntil;
        private bool arenaScene;
        private Material waterMaterial;
        private FactoryWarsApiClient apiClient;
        private FactoryWarsApiConfiguration apiConfiguration;
        private FactoryWarsMeResponse onlineProfile;
        private InputField emailInput, passwordInput;
        private Text connectionStatus;
        private bool apiBusy;

        private static readonly Civilization[] Civilizations = {
            new Civilization("forge", "FORJA", "F", "Expansión industrial.", "Edificios 10% más baratos.", "Mejoras económicas -7% costo · ataques +8% costo", new Color32(232, 133, 69, 255)),
            new Civilization("bastion", "BASTIÓN", "B", "Eficiencia industrial.", "Producción persistente +8%.", "Escudos +14% resistencia · mejoras económicas +6% costo", new Color32(82, 174, 204, 255)),
            new Civilization("swarm", "ENJAMBRE", "E", "Volumen operativo.", "Contratos 10% más rápidos.", "Ataques -12% costo · defensas +12% costo", new Color32(111, 205, 145, 255)),
            new Civilization("nexus", "NEXO", "N", "Tecnología.", "Investigación 10% más barata.", "Sabotaje -26% costo · ataques +4% costo", new Color32(178, 130, 231, 255))
        };

        private struct Civilization
        {
            public string Id, Name, Icon, Summary, FactoryBonus, ArenaBonus;
            public Color Accent;
            public Civilization(string id, string name, string icon, string summary, string factoryBonus, string arenaBonus, Color accent)
            { Id = id; Name = name; Icon = icon; Summary = summary; FactoryBonus = factoryBonus; ArenaBonus = arenaBonus; Accent = accent; }
        }

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void Bootstrap()
        {
            if (FindObjectOfType<FactoryWarsMobileApp>() != null) return;
            var app = new GameObject("FactoryWars Mobile Client");
            app.AddComponent<FactoryWarsMobileApp>();
        }

        private void Awake()
        {
            apiConfiguration = Resources.Load<FactoryWarsApiConfiguration>("FactoryWarsApiConfiguration");
            Application.targetFrameRate = 60;
            Screen.orientation = ScreenOrientation.Portrait;
            BuildWorld();
            BuildInterface();
            ShowSection(HubSection.MegaFactory);
        }

        private void Update()
        {
            if (toastPanel != null && toastPanel.activeSelf && Time.unscaledTime > toastUntil) toastPanel.SetActive(false);
            if (waterMaterial != null) waterMaterial.SetTextureOffset("_MainTex", new Vector2(0, Time.time * .008f));
        }

        private void BuildInterface()
        {
            var canvasObject = new GameObject("Mobile UI", typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            canvasObject.transform.SetParent(transform, false);
            canvas = canvasObject.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = canvasObject.GetComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(432, 936);
            scaler.matchWidthOrHeight = .35f;

            var eventSystem = new GameObject("Mobile Event System", typeof(UnityEngine.EventSystems.EventSystem), typeof(UnityEngine.EventSystems.StandaloneInputModule));
            eventSystem.transform.SetParent(transform, false);

            var safe = Panel("Safe Area", canvas.transform, ink);
            var safeRect = safe.GetComponent<RectTransform>();
            safeRect.anchorMin = Vector2.zero; safeRect.anchorMax = Vector2.one;
            safeRect.offsetMin = Vector2.zero; safeRect.offsetMax = Vector2.zero;
            safe.AddComponent<SafeAreaFitter>();

            var header = Panel("Top Bar", safe.transform, new Color32(8, 18, 31, 246));
            Anchor(header, new Vector2(0, 1), new Vector2(1, 1), new Vector2(0, 0), new Vector2(0, -70));
            PlacedLabel(header.transform, "FACTORY WARS", 18, white, FontStyle.Bold, TextAnchor.MiddleLeft, new Vector2(0, .5f), new Vector2(.58f, .5f), new Vector2(16, -15), new Vector2(-4, 15));
            PlacedLabel(header.transform, "FACTORY WARS · UNITY 6", 9, cyan, FontStyle.Bold, TextAnchor.MiddleRight, new Vector2(.58f, .5f), new Vector2(1, .5f), new Vector2(0, -15), new Vector2(-15, 15));

            var scrollRoot = new GameObject("Screen Scroll", typeof(RectTransform), typeof(ScrollRect), typeof(Image));
            scrollRoot.transform.SetParent(safe.transform, false);
            var scrollRect = scrollRoot.GetComponent<RectTransform>();
            scrollRect.anchorMin = Vector2.zero; scrollRect.anchorMax = Vector2.one;
            scrollRect.offsetMin = new Vector2(0, 76); scrollRect.offsetMax = new Vector2(0, -70);
            scrollRoot.GetComponent<Image>().color = new Color(0, 0, 0, 0);
            var viewport = new GameObject("Viewport", typeof(RectTransform), typeof(Image), typeof(Mask));
            viewport.transform.SetParent(scrollRoot.transform, false);
            var viewportRect = viewport.GetComponent<RectTransform>();
            viewportRect.anchorMin = Vector2.zero; viewportRect.anchorMax = Vector2.one;
            viewportRect.offsetMin = Vector2.zero; viewportRect.offsetMax = Vector2.zero;
            viewport.GetComponent<Image>().color = new Color(1, 1, 1, 0); viewport.GetComponent<Mask>().showMaskGraphic = false;
            var contentObject = new GameObject("Content", typeof(RectTransform), typeof(VerticalLayoutGroup), typeof(ContentSizeFitter));
            contentObject.transform.SetParent(viewport.transform, false);
            content = contentObject.GetComponent<RectTransform>();
            content.anchorMin = new Vector2(0, 1); content.anchorMax = new Vector2(1, 1); content.pivot = new Vector2(.5f, 1);
            content.offsetMin = Vector2.zero; content.offsetMax = Vector2.zero;
            var layout = contentObject.GetComponent<VerticalLayoutGroup>();
            layout.padding = new RectOffset(14, 14, 14, 24); layout.spacing = 12;
            layout.childControlWidth = true; layout.childControlHeight = true; layout.childForceExpandWidth = true; layout.childForceExpandHeight = false;
            contentObject.GetComponent<ContentSizeFitter>().verticalFit = ContentSizeFitter.FitMode.PreferredSize;
            scrollRoot.GetComponent<ScrollRect>().content = content; scrollRoot.GetComponent<ScrollRect>().viewport = viewportRect;
            scrollRoot.GetComponent<ScrollRect>().horizontal = false; scrollRoot.GetComponent<ScrollRect>().movementType = ScrollRect.MovementType.Clamped;

            nav = Panel("Bottom Navigation", safe.transform, new Color32(9, 21, 36, 255)).GetComponent<RectTransform>();
            Anchor(nav.gameObject, Vector2.zero, new Vector2(1, 0), Vector2.zero, new Vector2(0, 76));
            var navLayout = nav.gameObject.AddComponent<HorizontalLayoutGroup>();
            navLayout.padding = new RectOffset(6, 6, 6, 6); navLayout.spacing = 4;
            navLayout.childControlHeight = true; navLayout.childControlWidth = true; navLayout.childForceExpandHeight = true; navLayout.childForceExpandWidth = true;

            NavButton("FAB", "MEGAFÁBRICA", HubSection.MegaFactory);
            NavButton("VS", "PVP", HubSection.Pvp);
            NavButton("TOP", "RANKING", HubSection.Rankings);
            NavButton("CIV", "CIVILIZACIONES", HubSection.Civilizations);

            var toastPanel = Panel("Integration Toast", safe.transform, new Color32(9, 27, 43, 250));
            Anchor(toastPanel, new Vector2(.06f, 0), new Vector2(.94f, 0), new Vector2(0, 92), new Vector2(0, 142));
            this.toastPanel = toastPanel;
            toast = Label(toastPanel.transform, "", 12, white, FontStyle.Bold, TextAnchor.MiddleCenter, new Vector2(10, 4), Vector2.one, new Vector2(-20, -8));
            toastPanel.SetActive(false);
        }

        private void NavButton(string icon, string label, HubSection section)
        {
            var button = Panel("Nav " + section, nav, panel);
            button.AddComponent<LayoutElement>().flexibleWidth = 1;
            var iconText = PlacedLabel(button.transform, icon, 20, cyan, FontStyle.Bold, TextAnchor.MiddleCenter, new Vector2(0, .36f), Vector2.one, new Vector2(0, 1), new Vector2(0, -2));
            iconText.name = "Icon";
            PlacedLabel(button.transform, label, 8, muted, FontStyle.Bold, TextAnchor.MiddleCenter, Vector2.zero, new Vector2(1, .38f), Vector2.zero, Vector2.zero);
            var click = button.AddComponent<Button>(); click.transition = Selectable.Transition.None;
            click.onClick.AddListener(() => ShowSection(section));
            var outline = button.AddComponent<Outline>(); outline.effectColor = line; outline.effectDistance = new Vector2(1, -1);
        }

        private void ShowSection(HubSection section)
        {
            currentSection = section;
            for (int i = content.childCount - 1; i >= 0; i--) Destroy(content.GetChild(i).gameObject);
            SetWorld(section == HubSection.Pvp);
            switch (section)
            {
                case HubSection.MegaFactory: BuildFactoryScreen(); break;
                case HubSection.Pvp: BuildPvpScreen(); break;
                case HubSection.Rankings: BuildRankingsScreen(); break;
                case HubSection.Civilizations: BuildCivilizationsScreen(); break;
            }
            content.anchoredPosition = Vector2.zero;
            for (int i = 0; i < nav.childCount; i++)
            {
                var child = nav.GetChild(i).gameObject;
                var image = child.GetComponent<Image>();
                bool active = child.name == "Nav " + section;
                image.color = active ? new Color32(23, 72, 91, 255) : panel;
                var icon = child.transform.Find("Icon")?.GetComponent<Text>();
                if (icon != null) icon.color = active ? cyan : muted;
            }
        }

        private void BuildPvpScreen()
        {
            Hero("ARENA", "PVP · VISTA DE PARTIDA", "Combate táctico · cámara vertical", new Color32(32, 125, 186, 255));
            var match = Card("ARENA · 1 VS 1", "Previsualización 3D original · partida no iniciada", 420);
            var matchBody = CardBody(match.transform);
            var zone = Panel("Arena Preview", matchBody, new Color32(10, 26, 39, 255));
            LayoutElement(zone).preferredHeight = 248;
            DrawArenaMiniMap(zone.transform);
            var hand = Panel("Command Hand", matchBody, panelLight);
            LayoutElement(hand).preferredHeight = 76;
            var row = hand.AddComponent<HorizontalLayoutGroup>(); row.padding = new RectOffset(10, 10, 8, 8); row.spacing = 7; row.childControlHeight = true; row.childControlWidth = true; row.childForceExpandWidth = true;
            string[] cards = { "ECO\nENERGÍA", "ATQ\nATAQUE", "ESC\nESCUDO", "TEC\nSABOTAJE" };
            foreach (var card in cards)
            {
                var slot = Panel("Card", hand.transform, new Color32(28, 64, 87, 255));
                slot.AddComponent<LayoutElement>().flexibleWidth = 1;
                Label(slot.transform, card, 9, white, FontStyle.Bold, TextAnchor.MiddleCenter, Vector2.zero, Vector2.one);
            }
            var integration = Card("SERVICIO DE PARTIDA", "Estado: sin cuenta ni matchmaking conectado.", 205);
            BodyCopy(integration.transform, "La versión web tiene su propio motor y adaptador online. Esta app todavía no envía órdenes ni recibe resultados.");
            ActionButton(integration.transform, "BUSCAR RIVAL · INTEGRACIÓN PENDIENTE", gold, () => RequestIntegration("arena.request_matchmaking"));
        }

        private void BuildRankingsScreen()
        {
            Hero("LIGA", "RANKING", "Competí · escalá · dejá legado", new Color32(155, 103, 203, 255));
            var status = Card("RANKING NO DISPONIBLE", "Todavía no hay una cuenta conectada.", 205);
            BodyCopy(status.transform, "No mostramos posiciones ni puntajes de ejemplo. Al conectar identidad y el servicio de clasificación aparecerán acá tus temporadas, tabla y resultados verificados.");
            ActionButton(status.transform, "CONECTAR SERVICIO DE RANKING", cyan, () => RequestIntegration("ranking.connect"));
            var info = Card("DATOS COMPETITIVOS", "El cliente no declara resultados ranked.");
            BodyCopy(info.transform, "La arquitectura actual requiere validar partidas y recompensas en servidor. La interfaz queda preparada para consumir un leaderboard autenticado.");
        }

        private void BuildCivilizationsScreen()
        {
            Hero("FACCIÓN", "CIVILIZACIONES", "Catálogo actual de Factory Wars", new Color32(87, 167, 147, 255));
            for (int i = 0; i < Civilizations.Length; i++)
            {
                int index = i;
                var civ = Civilizations[i];
                var card = Card(civ.Icon + "   " + civ.Name, civ.Summary);
                LayoutElement(card).preferredHeight = 183;
                var accent = Panel("Accent", card.transform, civ.Accent);
                Anchor(accent, new Vector2(0, 0), new Vector2(0, 1), new Vector2(0, -5), new Vector2(5, 5));
                PlacedLabel(card.transform, "MEGAFÁBRICA", 9, cyan, FontStyle.Bold, TextAnchor.MiddleLeft, new Vector2(0, 1), new Vector2(1, 1), new Vector2(14, -53), new Vector2(-28, -35));
                PlacedLabel(card.transform, civ.FactoryBonus, 12, white, FontStyle.Bold, TextAnchor.MiddleLeft, new Vector2(0, 1), new Vector2(1, 1), new Vector2(14, -76), new Vector2(-28, -54));
                PlacedLabel(card.transform, "ARENA", 9, gold, FontStyle.Bold, TextAnchor.MiddleLeft, new Vector2(0, 1), new Vector2(1, 1), new Vector2(14, -98), new Vector2(-28, -80));
                PlacedLabel(card.transform, civ.ArenaBonus, 11, muted, FontStyle.Normal, TextAnchor.MiddleLeft, new Vector2(0, 1), new Vector2(1, 1), new Vector2(14, -120), new Vector2(-28, -101));
                bool connected = onlineProfile != null && onlineProfile.empire != null && onlineProfile.empire.state != null;
                bool current = connected && onlineProfile.empire.state.currentCiv == civ.Id;
                bool locked = connected && onlineProfile.empire.state.civLocked && !current;
                string action = HasAmbiguousCommand ? "ORDEN PENDIENTE"
                    : connected ? (current ? "CIVILIZACIÓN ACTIVA" : locked ? "BLOQUEADA HASTA PRESTIGIO" : "ELEGIR CIVILIZACIÓN")
                    : (selectedCivilization == i ? "VISTA PREVIA ACTIVA · NO GUARDADA" : "VER FICHA");
                var pick = ActionButton(card.transform, action, civ.Accent, () =>
                {
                    if (HasAmbiguousCommand) return;
                    if (connected)
                    {
                        if (!locked && !current) SendEmpireCommand("select-civilization", null, civ.Id);
                        return;
                    }
                    selectedCivilization = index;
                    ShowSection(HubSection.Civilizations);
                    Notice("Vista previa local seleccionada; no modifica tu partida.");
                });
                pick.interactable = !locked && !current && !HasAmbiguousCommand;
            }
        }

        private void Hero(string category, string title, string sub, Color accent)
        {
            var hero = Panel("Hero", content, new Color32(12, 31, 48, 213));
            LayoutElement(hero).preferredHeight = 230;
            var art = Panel("Hero Art", hero.transform, accent * .28f);
            Anchor(art, new Vector2(0, .28f), Vector2.one, new Vector2(0, 0), Vector2.zero);
            var glow = Panel("Hero Glow", art.transform, new Color(accent.r, accent.g, accent.b, .12f));
            Anchor(glow, new Vector2(.12f, .04f), new Vector2(.88f, .42f), Vector2.zero, Vector2.zero);
            var badge = Panel("Category", hero.transform, new Color32(12, 38, 57, 245));
            Anchor(badge, new Vector2(0, 1), new Vector2(0, 1), new Vector2(16, -40), new Vector2(192, -12));
            Label(badge.transform, category, 10, cyan, FontStyle.Bold, TextAnchor.MiddleCenter, Vector2.zero, Vector2.one);
            PlacedLabel(hero.transform, title, 24, white, FontStyle.Bold, TextAnchor.MiddleLeft, new Vector2(0, 1), new Vector2(1, 1), new Vector2(17, -91), new Vector2(-32, -49));
            PlacedLabel(hero.transform, sub, 11, muted, FontStyle.Normal, TextAnchor.MiddleLeft, new Vector2(0, 1), new Vector2(1, 1), new Vector2(18, -116), new Vector2(-36, -94));
            PlacedLabel(hero.transform, arenaScene ? "ARENA // LIVE VISUAL" : "INDUSTRIAL WORLD // LIVE VISUAL", 8, accent, FontStyle.Bold, TextAnchor.MiddleRight, new Vector2(0, 0), new Vector2(1, 0), new Vector2(10, 3), new Vector2(-14, 18));
            for (int i = 0; i < 5; i++)
            {
                var sparkle = Panel("Light " + i, hero.transform, new Color(accent.r, accent.g, accent.b, .28f));
                Anchor(sparkle, new Vector2(.12f + i * .16f, .57f + (i % 2) * .11f), new Vector2(.12f + i * .16f, .57f + (i % 2) * .11f), new Vector2(-2, -2), new Vector2(2, 2));
                sparkle.AddComponent<AmbientPulse>().phase = i * .7f;
            }
        }

        private GameObject Card(string title, string subtitle, float preferredHeight = 148)
        {
            var card = Panel("Card · " + title, content, panel);
            LayoutElement(card).preferredHeight = preferredHeight;
            PlacedLabel(card.transform, title, 14, white, FontStyle.Bold, TextAnchor.MiddleLeft, new Vector2(0, 1), new Vector2(1, 1), new Vector2(13, -33), new Vector2(-26, -8));
            PlacedLabel(card.transform, subtitle, 10, muted, FontStyle.Normal, TextAnchor.MiddleLeft, new Vector2(0, 1), new Vector2(1, 1), new Vector2(13, -52), new Vector2(-26, -34));
            card.AddComponent<Outline>().effectColor = line;
            return card;
        }

        private Transform CardBody(Transform card)
        {
            var body = new GameObject("Card Body", typeof(RectTransform), typeof(VerticalLayoutGroup));
            body.transform.SetParent(card, false);
            var rect = body.GetComponent<RectTransform>();
            rect.anchorMin = Vector2.zero; rect.anchorMax = Vector2.one;
            rect.offsetMin = new Vector2(12, 8); rect.offsetMax = new Vector2(-12, -56);
            var layout = body.GetComponent<VerticalLayoutGroup>();
            layout.spacing = 5; layout.childControlWidth = true; layout.childControlHeight = true;
            layout.childForceExpandWidth = true; layout.childForceExpandHeight = false;
            return body.transform;
        }

        private void BodyCopy(Transform card, string copy)
        {
            PlacedLabel(card, copy, 12, muted, FontStyle.Normal, TextAnchor.MiddleLeft, Vector2.zero, Vector2.one, new Vector2(13, 58), new Vector2(-26, -56));
        }

        private void StatRow(Transform parent, string title, string value, string hint)
        {
            var row = Panel("Stat " + title, parent, panelLight); LayoutElement(row).preferredHeight = 55;
            PlacedLabel(row.transform, title, 8, cyan, FontStyle.Bold, TextAnchor.MiddleLeft, new Vector2(0, 1), new Vector2(.48f, 1), new Vector2(10, -4), new Vector2(-4, -22));
            PlacedLabel(row.transform, value, 11, white, FontStyle.Bold, TextAnchor.MiddleRight, new Vector2(.49f, 1), Vector2.one, new Vector2(0, -4), new Vector2(-10, -22));
            PlacedLabel(row.transform, hint, 8, muted, FontStyle.Normal, TextAnchor.MiddleLeft, Vector2.zero, Vector2.one, new Vector2(10, 3), new Vector2(-10, 20));
        }

        private void ModuleRow(Transform parent, string icon, string name, string description, string level)
        {
            var row = Panel("Module " + name, parent, panelLight); LayoutElement(row).preferredHeight = 64;
            PlacedLabel(row.transform, icon, 10, gold, FontStyle.Bold, TextAnchor.MiddleCenter, new Vector2(0, 0), new Vector2(0, 1), new Vector2(8, 0), new Vector2(50, 0));
            PlacedLabel(row.transform, name, 12, white, FontStyle.Bold, TextAnchor.MiddleLeft, new Vector2(0, 1), new Vector2(1, 1), new Vector2(58, -33), new Vector2(-72, -7));
            PlacedLabel(row.transform, description, 9, muted, FontStyle.Normal, TextAnchor.MiddleLeft, new Vector2(0, 1), new Vector2(1, 1), new Vector2(58, -54), new Vector2(-72, -32));
            PlacedLabel(row.transform, level, 10, cyan, FontStyle.Bold, TextAnchor.MiddleRight, new Vector2(1, .5f), new Vector2(1, .5f), new Vector2(-54, -12), new Vector2(-10, 12));
        }

        private void DrawArenaMiniMap(Transform parent)
        {
            var field = Panel("Tiles", parent, new Color32(143, 125, 92, 255));
            Anchor(field, new Vector2(.1f, .07f), new Vector2(.9f, .93f), Vector2.zero, Vector2.zero);
            var grid = field.AddComponent<GridLayoutGroup>(); grid.cellSize = new Vector2(32, 26); grid.spacing = new Vector2(2, 2); grid.constraint = GridLayoutGroup.Constraint.FixedColumnCount; grid.constraintCount = 8; grid.childAlignment = TextAnchor.MiddleCenter;
            for (int i = 0; i < 56; i++)
            {
                var tile = Panel("Arena Tile", field.transform, i % 2 == 0 ? new Color32(192, 171, 131, 255) : new Color32(178, 157, 119, 255));
            }
            var river = Panel("River", field.transform, new Color32(47, 155, 183, 255));
            Anchor(river, new Vector2(0, .49f), new Vector2(1, .53f), Vector2.zero, Vector2.zero);
            Tower(field.transform, .2f, .2f, new Color32(68, 171, 219, 255));
            Tower(field.transform, .8f, .2f, new Color32(68, 171, 219, 255));
            Tower(field.transform, .5f, .79f, new Color32(220, 159, 74, 255));
            Tower(field.transform, .2f, .8f, new Color32(229, 110, 96, 255));
            Tower(field.transform, .8f, .8f, new Color32(229, 110, 96, 255));
            Label(parent, "ARENA TÁCTICA · PREVISUALIZACIÓN", 8, white, FontStyle.Bold, TextAnchor.MiddleCenter, new Vector2(0, 2), new Vector2(1, 0), new Vector2(0, 20));
        }

        private void Tower(Transform parent, float x, float y, Color color)
        {
            var tower = Panel("Tower", parent, color);
            Anchor(tower, new Vector2(x, y), new Vector2(x, y), new Vector2(-16, -14), new Vector2(16, 14));
            tower.AddComponent<Outline>().effectColor = new Color32(255, 230, 157, 255);
        }

        private Button ActionButton(Transform parent, string text, Color color, UnityAction callback)
        {
            var go = Panel("Action " + text, parent, new Color(color.r, color.g, color.b, .22f));
            var rect = go.GetComponent<RectTransform>();
            rect.anchorMin = new Vector2(0, 0); rect.anchorMax = new Vector2(1, 0); rect.pivot = new Vector2(.5f, 0);
            rect.anchoredPosition = new Vector2(0, 10); rect.sizeDelta = new Vector2(-20, 40);
            go.AddComponent<Outline>().effectColor = color;
            Label(go.transform, text, 10, white, FontStyle.Bold, TextAnchor.MiddleCenter, Vector2.zero, Vector2.one);
            var button = go.AddComponent<Button>(); button.transition = Selectable.Transition.None; button.onClick.AddListener(callback);
            return button;
        }

        private void RequestIntegration(string action)
        {
            Notice("Adaptador no conectado · acción pendiente: " + action);
            if (onIntegrationRequested != null) onIntegrationRequested.Invoke(action);
        }

        private void Notice(string message)
        {
            toast.text = message; toastPanel.SetActive(true); toastUntil = Time.unscaledTime + 3.2f;
        }

        private void BuildWorld()
        {
            var cameraObject = new GameObject("Procedural World Camera", typeof(Camera));
            cameraObject.transform.SetParent(transform, false);
            var camera = cameraObject.GetComponent<Camera>();
            camera.clearFlags = CameraClearFlags.SolidColor; camera.backgroundColor = new Color32(5, 15, 29, 255);
            camera.orthographic = true; camera.orthographicSize = 8.7f; camera.transform.position = new Vector3(0, 11, -15); camera.transform.rotation = Quaternion.Euler(34, 0, 0);
            camera.depth = -2;
            var lightObject = new GameObject("World Key Light", typeof(Light)); lightObject.transform.SetParent(transform, false);
            var light = lightObject.GetComponent<Light>(); light.type = LightType.Directional; light.intensity = 1.25f; light.color = new Color32(186, 223, 255, 255); lightObject.transform.rotation = Quaternion.Euler(47, -32, 0);
            RenderSettings.ambientLight = new Color32(84, 104, 126, 255);
            var water = Primitive("Ocean Platform", PrimitiveType.Cylinder, new Vector3(0, -1.1f, 0), new Vector3(13, .28f, 13), new Color32(14, 101, 151, 255));
            var island = Primitive("Floating Island", PrimitiveType.Cylinder, new Vector3(0, -.58f, 0), new Vector3(9.8f, .65f, 8.2f), new Color32(49, 91, 102, 255));
            Primitive("Island Top", PrimitiveType.Cylinder, new Vector3(0, -.14f, 0), new Vector3(9.3f, .36f, 7.8f), new Color32(43, 116, 105, 255));
            waterMaterial = water.GetComponent<Renderer>().material;
            for (int i = 0; i < 15; i++)
            {
                float x = Mathf.Sin(i * 2.31f) * 4.0f, z = Mathf.Cos(i * 3.18f) * 3.2f;
                if (Mathf.Abs(x) < 1.6f && Mathf.Abs(z) < 1.6f) x += 2.5f;
                var building = Primitive("Factory Block " + i, PrimitiveType.Cube, new Vector3(x, .28f, z), new Vector3(.65f + (i % 3) * .22f, .8f + (i % 4) * .28f, .65f + (i % 2) * .25f), i % 3 == 0 ? new Color32(75, 168, 204, 255) : new Color32(103, 137, 153, 255));
                building.transform.rotation = Quaternion.Euler(0, i * 19, 0);
                var roof = Primitive("Roof " + i, PrimitiveType.Cube, building.transform.position + Vector3.up * (building.transform.localScale.y * .58f), new Vector3(building.transform.localScale.x * 1.14f, .12f, building.transform.localScale.z * 1.14f), new Color32(216, 175, 91, 255));
                roof.transform.SetParent(building.transform, true);
                if (i % 4 == 0) { var chimney = Primitive("Stack " + i, PrimitiveType.Cylinder, building.transform.position + new Vector3(.12f, building.transform.localScale.y * .72f, 0), new Vector3(.12f, .4f, .12f), new Color32(73, 206, 220, 255)); chimney.transform.SetParent(building.transform, true); chimney.AddComponent<AmbientPulse>().phase = i; }
            }
            for (int i = 0; i < 12; i++)
            {
                float angle = i * Mathf.PI * 2 / 12; var crystal = Primitive("Crystal " + i, PrimitiveType.Sphere, new Vector3(Mathf.Cos(angle) * 5.7f, .15f, Mathf.Sin(angle) * 4.9f), new Vector3(.28f, .58f, .28f), new Color32(55, 206, 226, 255));
                crystal.AddComponent<AmbientPulse>().phase = i * .55f;
            }
            var arenaFloor = Primitive("Arena Field", PrimitiveType.Cube, new Vector3(0, -.1f, 0), new Vector3(8.5f, .18f, 13), new Color32(172, 151, 112, 255));
            for (int z = -5; z <= 5; z++)
                for (int x = -3; x <= 3; x++)
                {
                    var tile = Primitive("Arena paving", PrimitiveType.Cube, new Vector3(x * 1.15f, .02f, z * 1.15f), new Vector3(1.12f, .08f, 1.12f), ((x + z) & 1) == 0 ? new Color32(194, 177, 139, 255) : new Color32(164, 148, 117, 255));
                    tile.transform.SetParent(arenaFloor.transform, true);
                }
            var river = Primitive("Arena river", PrimitiveType.Cube, new Vector3(0, .13f, 0), new Vector3(8.7f, .1f, .7f), new Color32(52, 171, 198, 255));
            var bridgeA = Primitive("Arena bridge left", PrimitiveType.Cube, new Vector3(-2.6f, .21f, 0), new Vector3(1, .22f, 1.35f), new Color32(218, 177, 96, 255));
            var bridgeB = Primitive("Arena bridge right", PrimitiveType.Cube, new Vector3(2.6f, .21f, 0), new Vector3(1, .22f, 1.35f), new Color32(218, 177, 96, 255));
            ArenaTower("Arena blue tower left", new Vector3(-2.5f, .55f, -4.3f), new Color32(64, 178, 222, 255));
            ArenaTower("Arena blue tower right", new Vector3(2.5f, .55f, -4.3f), new Color32(64, 178, 222, 255));
            ArenaTower("Arena blue core", new Vector3(0, .8f, -5.6f), new Color32(79, 149, 208, 255));
            ArenaTower("Arena red tower left", new Vector3(-2.5f, .55f, 4.3f), new Color32(224, 111, 91, 255));
            ArenaTower("Arena red tower right", new Vector3(2.5f, .55f, 4.3f), new Color32(224, 111, 91, 255));
            ArenaTower("Arena red core", new Vector3(0, .8f, 5.6f), new Color32(201, 103, 88, 255));
            SetWorld(false);
        }

        private void ArenaTower(string name, Vector3 position, Color color)
        {
            var baseTower = Primitive(name, PrimitiveType.Cube, position, new Vector3(1.25f, 1.05f, 1.05f), color);
            var crown = Primitive(name + " crown", PrimitiveType.Cylinder, position + Vector3.up * .75f, new Vector3(.72f, .3f, .72f), gold);
            crown.transform.SetParent(baseTower.transform, true);
        }

        private GameObject Primitive(string name, PrimitiveType type, Vector3 position, Vector3 scale, Color color)
        {
            var obj = GameObject.CreatePrimitive(type); obj.name = name; obj.transform.SetParent(transform, false); obj.transform.localPosition = position; obj.transform.localScale = scale;
            var renderer = obj.GetComponent<Renderer>();
            if (!worldMaterials.TryGetValue(color, out var material))
            {
                material = new Material(Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard"));
                material.color = color;
                worldMaterials.Add(color, material);
            }
            renderer.sharedMaterial = material;
            sceneObjects.Add(obj); return obj;
        }

        private void SetWorld(bool arena)
        {
            arenaScene = arena;
            foreach (var obj in sceneObjects) obj.SetActive(arena ? obj.name.StartsWith("Arena") : !obj.name.StartsWith("Arena"));
        }

        private static GameObject Panel(string name, Transform parent, Color color)
        {
            var go = new GameObject(name, typeof(RectTransform), typeof(Image)); go.transform.SetParent(parent, false);
            go.GetComponent<Image>().color = color;
            var rect = go.GetComponent<RectTransform>(); rect.localScale = Vector3.one;
            return go;
        }

        private static Text Label(Transform parent, string value, int size, Color color, FontStyle style, TextAnchor alignment, Vector2 min, Vector2 max, Vector2 inset = default)
        {
            var go = new GameObject("Label", typeof(RectTransform), typeof(Text)); go.transform.SetParent(parent, false);
            var rect = go.GetComponent<RectTransform>(); rect.anchorMin = Vector2.zero; rect.anchorMax = max; rect.offsetMin = min; rect.offsetMax = inset;
            var text = go.GetComponent<Text>(); text.text = value; text.font = Resources.GetBuiltinResource<Font>("Arial.ttf"); text.fontSize = size; text.color = color; text.fontStyle = style; text.alignment = alignment; text.horizontalOverflow = HorizontalWrapMode.Wrap; text.verticalOverflow = VerticalWrapMode.Overflow; text.raycastTarget = false;
            return text;
        }

        private static Text PlacedLabel(Transform parent, string value, int size, Color color, FontStyle style, TextAnchor alignment, Vector2 anchorMin, Vector2 anchorMax, Vector2 offsetMin, Vector2 offsetMax)
        {
            var go = new GameObject("Label", typeof(RectTransform), typeof(Text)); go.transform.SetParent(parent, false);
            var rect = go.GetComponent<RectTransform>(); rect.anchorMin = anchorMin; rect.anchorMax = anchorMax; rect.offsetMin = offsetMin; rect.offsetMax = offsetMax;
            var text = go.GetComponent<Text>(); text.text = value; text.font = Resources.GetBuiltinResource<Font>("Arial.ttf"); text.fontSize = size; text.color = color; text.fontStyle = style; text.alignment = alignment; text.horizontalOverflow = HorizontalWrapMode.Wrap; text.verticalOverflow = VerticalWrapMode.Overflow; text.raycastTarget = false;
            return text;
        }

        private static void Anchor(GameObject go, Vector2 min, Vector2 max, Vector2 offsetMin, Vector2 offsetMax)
        {
            var rect = go.GetComponent<RectTransform>(); rect.anchorMin = min; rect.anchorMax = max; rect.offsetMin = offsetMin; rect.offsetMax = offsetMax;
        }

        private static LayoutElement LayoutElement(GameObject go)
        {
            var element = go.GetComponent<LayoutElement>(); return element != null ? element : go.AddComponent<LayoutElement>();
        }
    }

    public sealed class SafeAreaFitter : MonoBehaviour
    {
        private RectTransform rect;
        private Rect previous;
        private void Awake() { rect = GetComponent<RectTransform>(); Apply(); }
        private void Update() { if (previous != Screen.safeArea) Apply(); }
        private void Apply()
        {
            if (rect == null) return;
            previous = Screen.safeArea;
            var min = previous.position; var max = previous.position + previous.size;
            rect.anchorMin = new Vector2(min.x / Screen.width, min.y / Screen.height);
            rect.anchorMax = new Vector2(max.x / Screen.width, max.y / Screen.height);
            rect.offsetMin = rect.offsetMax = Vector2.zero;
        }
    }

    public sealed class AmbientPulse : MonoBehaviour
    {
        [NonSerialized] public float phase;
        private Vector3 origin;
        private void Start() { origin = transform.localPosition; }
        private void Update()
        {
            transform.localPosition = origin + Vector3.up * (Mathf.Sin(Time.time * 1.5f + phase) * .08f);
            if (transform.name.StartsWith("Crystal")) transform.Rotate(Vector3.up, 20 * Time.deltaTime, Space.World);
        }
    }
}
