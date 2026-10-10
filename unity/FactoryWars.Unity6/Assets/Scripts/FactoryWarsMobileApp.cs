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
        private readonly Dictionary<string, TextMesh> worldBadges = new Dictionary<string, TextMesh>();

        private Canvas canvas;
        private GameObject factoryArtLayer;
        private RectTransform factoryArtRect;
        private RectTransform factoryMapOverlay;
        private LayoutElement factoryMapSpace;
        private ScrollRect screenScroll;
        private readonly List<FactoryMapMarker> factoryMapMarkers = new List<FactoryMapMarker>();
        private sealed class FactoryMapMarker
        {
            public RectTransform rect;
            public Vector2 artAnchor;
        }
        private RectTransform content;
        private RectTransform nav;
        private Text headerTitle;
        private readonly Text[] resourceHudAmounts = new Text[4];
        private readonly Text[] resourceHudRates = new Text[4];
        private enum HudIcon { Credits, Energy, Steel, Intel, Factory, Swords, Trophy, Globe }
        private readonly Sprite[] hudIconSprites = new Sprite[8];
        private GameObject toastPanel;
        private Text toast;
        private HubSection currentSection = HubSection.MegaFactory;
        private int selectedCivilization = -1;
        private float toastUntil;
        private bool arenaScene;
        private Camera worldCamera;
        private Material waterMaterial;
        private FactoryWarsApiClient apiClient;
        private FactoryWarsApiConfiguration apiConfiguration;
        private FactoryWarsMeResponse onlineProfile;
        private InputField emailInput, passwordInput;
        private Text connectionStatus;
        private bool apiBusy;
        private int rankingViewEpoch;
        private FactoryWarsLeaderboardResponse leaderboard;
        private FactoryWarsApiError rankingError;
        private bool rankingBusy;
        private string rankingStatus;

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
            LoadHudIcons();
            BuildInterface();
            ShowSection(HubSection.MegaFactory);
        }

        private void Update()
        {
            if (toastPanel != null && toastPanel.activeSelf && Time.unscaledTime > toastUntil) toastPanel.SetActive(false);
            if (waterMaterial != null) waterMaterial.SetTextureOffset("_MainTex", new Vector2(0, Time.time * .008f));
        }

        private void LateUpdate()
        {
            UpdateFactoryMapLayout();
        }

        private void LoadHudIcons()
        {
            var atlas = Resources.Load<Texture2D>("FactoryWarsHudIconAtlas");
            if (atlas == null) return;
            // Four columns, two rows. Trim the empty vertical padding in this UI atlas.
            // Sprite coordinates start at the bottom; the resource row is the upper row.
            float cellWidth = atlas.width / 4f;
            for (int i = 0; i < hudIconSprites.Length; i++)
            {
                float bottom = i < 4 ? .52f : .16f;
                var region = new Rect((i % 4) * cellWidth, atlas.height * bottom, cellWidth, atlas.height * .30f);
                hudIconSprites[i] = Sprite.Create(atlas, region, new Vector2(.5f, .5f), 100, 0, SpriteMeshType.FullRect);
                hudIconSprites[i].name = "HUD " + (HudIcon)i;
            }
        }

        private void OnDestroy()
        {
            foreach (var sprite in hudIconSprites)
                if (sprite != null) Destroy(sprite);
        }

        private Image HudIconImage(Transform parent, HudIcon icon, Vector2 anchor, Vector2 size)
        {
            var go = Panel("Icon", parent, Color.white);
            var rect = go.GetComponent<RectTransform>();
            rect.anchorMin = rect.anchorMax = anchor; rect.sizeDelta = size; rect.anchoredPosition = Vector2.zero;
            var image = go.GetComponent<Image>();
            image.sprite = hudIconSprites[(int)icon]; image.preserveAspect = true; image.raycastTarget = false;
            // An absent atlas leaves the readable label rather than an opaque white square.
            image.enabled = image.sprite != null;
            return image;
        }

        private static void NameIllumination(Transform parent, Color accent, Vector2 min, Vector2 max, Vector2 insetMin, Vector2 insetMax)
        {
            var backing = Panel("Name illumination", parent, new Color(accent.r, accent.g, accent.b, .10f));
            Anchor(backing, min, max, insetMin, insetMax);
            backing.GetComponent<Image>().raycastTarget = false;
            var glow = backing.AddComponent<Outline>();
            glow.effectColor = new Color(accent.r, accent.g, accent.b, .09f); glow.effectDistance = new Vector2(3, -2);
        }

        private static void ButtonFeedback(Button button)
        {
            button.transition = Selectable.Transition.ColorTint;
            var colors = button.colors;
            colors.normalColor = Color.white; colors.highlightedColor = new Color(1.08f, 1.08f, 1.08f);
            colors.pressedColor = new Color(.65f, .79f, .86f); colors.selectedColor = Color.white;
            colors.fadeDuration = .08f; button.colors = colors;
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

            var backdrop = new GameObject("Canvas Backdrop", typeof(RectTransform), typeof(Image));
            backdrop.transform.SetParent(canvas.transform, false);
            var backdropRect = backdrop.GetComponent<RectTransform>();
            backdropRect.anchorMin = Vector2.zero; backdropRect.anchorMax = Vector2.one;
            backdropRect.offsetMin = Vector2.zero; backdropRect.offsetMax = Vector2.zero;
            var backdropImage = backdrop.GetComponent<Image>();
            backdropImage.color = ink;
            backdropImage.raycastTarget = false;

            factoryArtLayer = new GameObject("Factory Fullscreen Art", typeof(RectTransform));
            factoryArtLayer.transform.SetParent(canvas.transform, false);
            Anchor(factoryArtLayer, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            var artwork = Panel("Megafactory Island Cover", factoryArtLayer.transform, Color.white);
            factoryArtRect = artwork.GetComponent<RectTransform>();
            var artworkImage = artwork.GetComponent<Image>();
            artworkImage.sprite = Resources.Load<Sprite>("MegafactoryIsland");
            artworkImage.raycastTarget = false;
            if (artworkImage.sprite != null)
            {
                var cover = artwork.AddComponent<AspectRatioFitter>();
                cover.aspectMode = AspectRatioFitter.AspectMode.EnvelopeParent;
                cover.aspectRatio = artworkImage.sprite.rect.width / artworkImage.sprite.rect.height;
            }
            else
            {
                Anchor(artwork, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
                artworkImage.color = ink;
            }

            var eventSystem = new GameObject("Mobile Event System", typeof(UnityEngine.EventSystems.EventSystem), typeof(UnityEngine.EventSystems.StandaloneInputModule));
            eventSystem.transform.SetParent(transform, false);

            var safe = Panel("Safe Area", canvas.transform, new Color(0, 0, 0, 0));
            var safeRect = safe.GetComponent<RectTransform>();
            safeRect.anchorMin = Vector2.zero; safeRect.anchorMax = Vector2.one;
            safeRect.offsetMin = Vector2.zero; safeRect.offsetMax = Vector2.zero;
            safe.AddComponent<SafeAreaFitter>();

            var header = Panel("Top Bar", safe.transform, new Color(0, 0, 0, 0));
            Anchor(header, new Vector2(0, 1), new Vector2(1, 1), new Vector2(0, -110), new Vector2(0, 0));
            headerTitle = PlacedLabel(header.transform, "MEGAFÁBRICA", 12, white, FontStyle.Bold, TextAnchor.MiddleLeft, new Vector2(0, .88f), Vector2.one, new Vector2(10, 0), new Vector2(-10, 0));
            BuildResourceHud(header.transform);

            var scrollRoot = new GameObject("Screen Scroll", typeof(RectTransform), typeof(ScrollRect), typeof(Image));
            scrollRoot.transform.SetParent(safe.transform, false);
            var scrollRect = scrollRoot.GetComponent<RectTransform>();
            scrollRect.anchorMin = Vector2.zero; scrollRect.anchorMax = Vector2.one;
            scrollRect.offsetMin = new Vector2(0, 86); scrollRect.offsetMax = new Vector2(0, -110);
            scrollRoot.GetComponent<Image>().color = new Color(0, 0, 0, 0);
            var viewport = new GameObject("Viewport", typeof(RectTransform), typeof(RectMask2D));
            viewport.transform.SetParent(scrollRoot.transform, false);
            var viewportRect = viewport.GetComponent<RectTransform>();
            viewportRect.anchorMin = Vector2.zero; viewportRect.anchorMax = Vector2.one;
            viewportRect.offsetMin = Vector2.zero; viewportRect.offsetMax = Vector2.zero;
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

            screenScroll = scrollRoot.GetComponent<ScrollRect>();
            screenScroll.onValueChanged.AddListener(_ => UpdateFactoryMapVisibility());
            var markerLayer = new GameObject("Factory Map Markers", typeof(RectTransform));
            markerLayer.transform.SetParent(safe.transform, false);
            factoryMapOverlay = markerLayer.GetComponent<RectTransform>();
            Anchor(markerLayer, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            header.transform.SetAsLastSibling();

            nav = Panel("Bottom Navigation", safe.transform, new Color32(5, 37, 61, 240)).GetComponent<RectTransform>();
            Anchor(nav.gameObject, Vector2.zero, new Vector2(1, 0), new Vector2(5, 5), new Vector2(-5, 86));
            nav.gameObject.AddComponent<Outline>().effectColor = cyan;
            var navLayout = nav.gameObject.AddComponent<HorizontalLayoutGroup>();
            navLayout.padding = new RectOffset(6, 6, 6, 6); navLayout.spacing = 4;
            navLayout.childControlHeight = true; navLayout.childControlWidth = true; navLayout.childForceExpandHeight = true; navLayout.childForceExpandWidth = true;

            NavButton(HudIcon.Factory, "FAB", HubSection.MegaFactory);
            NavButton(HudIcon.Swords, "PVP", HubSection.Pvp);
            NavButton(HudIcon.Trophy, "RANKING", HubSection.Rankings);
            NavButton(HudIcon.Globe, "CIVILIZACIONES", HubSection.Civilizations);

            var toastPanel = Panel("Integration Toast", safe.transform, new Color32(9, 27, 43, 250));
            Anchor(toastPanel, new Vector2(.06f, 0), new Vector2(.94f, 0), new Vector2(0, 92), new Vector2(0, 142));
            this.toastPanel = toastPanel;
            toast = Label(toastPanel.transform, "", 12, white, FontStyle.Bold, TextAnchor.MiddleCenter, new Vector2(10, 4), Vector2.one, new Vector2(-20, -8));
            toastPanel.SetActive(false);
        }

        private void NavButton(HudIcon icon, string label, HubSection section)
        {
            var button = Panel("Nav " + section, nav, panel);
            button.AddComponent<LayoutElement>().flexibleWidth = 1;
            HudIconImage(button.transform, icon, new Vector2(.5f, .67f), new Vector2(44, 42));
            var labelText = PlacedLabel(button.transform, label, label == "CIVILIZACIONES" ? 8 : 11, white, FontStyle.Bold, TextAnchor.MiddleCenter, new Vector2(0, .08f), new Vector2(1, .35f), new Vector2(2, 0), new Vector2(-2, 0));
            labelText.name = "Label";
            labelText.horizontalOverflow = HorizontalWrapMode.Overflow;
            var marker = Panel("Active marker", button.transform, new Color(0, 0, 0, 0));
            Anchor(marker, new Vector2(.12f, .025f), new Vector2(.88f, .065f), Vector2.zero, Vector2.zero);
            marker.GetComponent<Image>().raycastTarget = false;
            var click = button.AddComponent<Button>(); ButtonFeedback(click);
            click.onClick.AddListener(() => ShowSection(section));
            var outline = button.AddComponent<Outline>(); outline.effectColor = line; outline.effectDistance = new Vector2(1, -1);
        }

        private void BuildResourceHud(Transform parent)
        {
            string[] names = { "CRÉDITOS", "ENERGÍA", "ACERO", "INTEL" };
            Color[] colors = { gold, cyan, muted, new Color32(194, 136, 250, 255) };
            string[] buildingKeys = { "automation", "generator", "refinery", "lab" };
            for (int i = 0; i < names.Length; i++)
            {
                float left = i * .25f;
                var card = Panel("Resource " + names[i], parent, new Color32(13, 43, 68, 255));
                Anchor(card, new Vector2(left, .05f), new Vector2(left + .25f, .87f), new Vector2(3, 0), new Vector2(-3, 0));
                var outline = card.AddComponent<Outline>(); outline.effectColor = new Color(colors[i].r, colors[i].g, colors[i].b, .65f); outline.effectDistance = new Vector2(1, -1);
                NameIllumination(card.transform, i == 0 ? gold : cyan, new Vector2(0, .72f), Vector2.one, new Vector2(3, 0), new Vector2(-3, -3));
                var icon = HudIconImage(card.transform, (HudIcon)i, new Vector2(0, .85f), new Vector2(26, 27));
                icon.rectTransform.anchoredPosition = new Vector2(16, 0);
                var name = PlacedLabel(card.transform, names[i], 9, white, FontStyle.Bold, TextAnchor.MiddleLeft, new Vector2(0, .72f), Vector2.one, new Vector2(31, 0), new Vector2(-3, -3));
                name.horizontalOverflow = HorizontalWrapMode.Overflow;
                resourceHudAmounts[i] = PlacedLabel(card.transform, "—", 17, white, FontStyle.Bold, TextAnchor.MiddleLeft, new Vector2(0, .31f), new Vector2(1, .70f), new Vector2(6, 0), new Vector2(-47, 0));
                resourceHudAmounts[i].resizeTextForBestFit = true;
                resourceHudAmounts[i].resizeTextMinSize = 10; resourceHudAmounts[i].resizeTextMaxSize = 17;
                resourceHudRates[i] = PlacedLabel(card.transform, "—/s", 11, new Color32(89, 250, 196, 255), FontStyle.Bold, TextAnchor.MiddleCenter, Vector2.zero, new Vector2(1, .33f), new Vector2(1, 0), new Vector2(-1, 0));
                string key = buildingKeys[i];
                var manage = Panel("Manage " + names[i], card.transform, Color.clear);
                var manageRect = manage.GetComponent<RectTransform>();
                manageRect.anchorMin = manageRect.anchorMax = new Vector2(1, .49f);
                manageRect.pivot = new Vector2(1, .5f); manageRect.anchoredPosition = new Vector2(-3, 0); manageRect.sizeDelta = new Vector2(40, 40);
                var plus = Panel("Plus affordance", manage.transform, new Color32(8, 134, 103, 255));
                var plusRect = plus.GetComponent<RectTransform>();
                plusRect.anchorMin = plusRect.anchorMax = new Vector2(.5f, .5f); plusRect.sizeDelta = new Vector2(30, 30); plusRect.anchoredPosition = Vector2.zero;
                plus.GetComponent<Image>().raycastTarget = false;
                plus.AddComponent<Outline>().effectColor = new Color32(67, 255, 187, 255);
                PlacedLabel(plus.transform, "+", 20, white, FontStyle.Bold, TextAnchor.MiddleCenter, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
                var manageButton = manage.AddComponent<Button>(); manageButton.targetGraphic = plus.GetComponent<Image>(); ButtonFeedback(manageButton);
                manageButton.onClick.AddListener(() => OpenFactoryResource(key));
            }
        }

        private void ShowSection(HubSection section)
        {
            rankingViewEpoch++;
            currentSection = section;
            // Every visit reloads server state; account data is never reused across visits.
            leaderboard = null;
            rankingError = null;
            rankingBusy = section == HubSection.Rankings && apiClient != null && apiClient.IsAuthenticated;
            rankingStatus = "Cargando temporada y clasificación…";
            if (headerTitle != null)
            {
                headerTitle.text = section == HubSection.Pvp ? "ARENA PVP" : section == HubSection.Rankings ? "RANKING" : section == HubSection.Civilizations ? "CIVILIZACIONES" : "MEGAFÁBRICA";
                headerTitle.gameObject.SetActive(section != HubSection.MegaFactory);
            }
            factoryArtLayer.SetActive(section == HubSection.MegaFactory);
            for (int i = factoryMapOverlay.childCount - 1; i >= 0; i--)
            {
                var marker = factoryMapOverlay.GetChild(i).gameObject;
                marker.SetActive(false); Destroy(marker);
            }
            factoryMapMarkers.Clear(); factoryMapSpace = null;
            UpdateResourceHud();
            for (int i = content.childCount - 1; i >= 0; i--)
            {
                var previousContent = content.GetChild(i).gameObject;
                // Destroy is deferred; deactivate now so this frame's layout uses only the new section.
                previousContent.SetActive(false);
                Destroy(previousContent);
            }
            switch (section)
            {
                case HubSection.MegaFactory: BuildFactoryScreen(); break;
                case HubSection.Pvp: BuildPvpScreen(); break;
                case HubSection.Rankings: BuildRankingsScreen(); break;
                case HubSection.Civilizations: BuildCivilizationsScreen(); break;
            }
            content.anchoredPosition = Vector2.zero;
            if (screenScroll != null) screenScroll.StopMovement();
            UpdateFactoryMapLayout();
            if (rankingBusy) StartRankingLoad(rankingViewEpoch);
            for (int i = 0; i < nav.childCount; i++)
            {
                var child = nav.GetChild(i).gameObject;
                var image = child.GetComponent<Image>();
                bool active = child.name == "Nav " + section;
                image.color = active ? new Color32(18, 67, 91, 255) : new Color32(13, 32, 49, 255);
                var outline = child.GetComponent<Outline>();
                if (outline != null) outline.effectColor = active ? cyan : line;
                var icon = child.transform.Find("Icon")?.GetComponent<Image>();
                if (icon != null) icon.color = active ? Color.white : new Color(.8f, .88f, .94f, .85f);
                var label = child.transform.Find("Label")?.GetComponent<Text>();
                if (label != null) label.color = active ? white : muted;
                var marker = child.transform.Find("Active marker")?.GetComponent<Image>();
                if (marker != null) marker.color = active ? cyan : new Color(0, 0, 0, 0);
            }
        }

        private void BuildPvpScreen()
        {
            ArenaBanner();
            ArenaMatchBar();
            var arena = Panel("Arena Match Preview", content, new Color32(11, 29, 43, 240));
            LayoutElement(arena).preferredHeight = 250;
            arena.AddComponent<Outline>().effectColor = line;
            DrawArenaMiniMap(arena.transform);
            ArenaCardHand();
            var queue = Panel("Matchmaking Status", content, new Color32(15, 37, 55, 248));
            LayoutElement(queue).preferredHeight = 70;
            queue.AddComponent<Outline>().effectColor = gold;
            PlacedLabel(queue.transform, "VISTA PREVIA · SIN PARTIDA ONLINE", 9, gold, FontStyle.Bold, TextAnchor.MiddleLeft, Vector2.zero, Vector2.one, new Vector2(12, 0), new Vector2(-137, 0));
            var search = ActionButton(queue.transform, "BUSCAR RIVAL", gold, () => RequestIntegration("arena.request_matchmaking"));
            var searchRect = search.GetComponent<RectTransform>();
            searchRect.anchorMin = searchRect.anchorMax = new Vector2(1, .5f); searchRect.pivot = new Vector2(1, .5f);
            searchRect.anchoredPosition = new Vector2(-8, 0); searchRect.sizeDelta = new Vector2(124, 42);
        }

        private void ArenaBanner()
        {
            var banner = Panel("Arena Banner", content, new Color32(14, 39, 60, 248));
            LayoutElement(banner).preferredHeight = 48;
            banner.AddComponent<Outline>().effectColor = new Color32(47, 150, 207, 255);
            PlacedLabel(banner.transform, "ARENA", 15, white, FontStyle.Bold, TextAnchor.MiddleLeft, Vector2.zero, Vector2.one, new Vector2(12, 0), new Vector2(-112, 5));
            PlacedLabel(banner.transform, "1 VS 1  ·  TEMPORADA", 8, cyan, FontStyle.Bold, TextAnchor.MiddleLeft, Vector2.zero, Vector2.one, new Vector2(12, -15), new Vector2(-112, -3));
            var flag = Panel("Preview Flag", banner.transform, new Color32(107, 47, 53, 255));
            Anchor(flag, new Vector2(1, .5f), new Vector2(1, .5f), new Vector2(-105, -13), new Vector2(-10, 13));
            PlacedLabel(flag.transform, "PREVIA", 8, white, FontStyle.Bold, TextAnchor.MiddleCenter, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
        }

        private void ArenaMatchBar()
        {
            var bar = Panel("Arena Match HUD", content, new Color32(10, 25, 39, 246));
            LayoutElement(bar).preferredHeight = 38;
            ArenaHudLabel(bar.transform, "TU BASE", "4424", new Vector2(0, 0), new Vector2(.34f, 1), new Color32(79, 192, 237, 255));
            ArenaHudLabel(bar.transform, "2:51", "00  ·  00", new Vector2(.34f, 0), new Vector2(.66f, 1), gold);
            ArenaHudLabel(bar.transform, "RIVAL", "4424", new Vector2(.66f, 0), Vector2.one, new Color32(255, 128, 116, 255));
        }

        private void ArenaHudLabel(Transform parent, string title, string value, Vector2 min, Vector2 max, Color accent)
        {
            PlacedLabel(parent, title, 7, accent, FontStyle.Bold, TextAnchor.MiddleCenter, min, max, new Vector2(0, 13), new Vector2(0, -1));
            PlacedLabel(parent, value, 11, white, FontStyle.Bold, TextAnchor.MiddleCenter, min, max, new Vector2(0, -13), new Vector2(0, 3));
        }

        private void ArenaCardHand()
        {
            var hand = Panel("Arena Card Hand", content, new Color32(12, 31, 49, 248));
            LayoutElement(hand).preferredHeight = 128;
            var heading = PlacedLabel(hand.transform, "MAZO DE MUESTRA", 8, cyan, FontStyle.Bold, TextAnchor.MiddleLeft, new Vector2(0, 1), new Vector2(1, 1), new Vector2(8, -22), new Vector2(-8, -4));
            heading.name = "Deck Caption";
            var rowObject = new GameObject("Battle Cards", typeof(RectTransform), typeof(HorizontalLayoutGroup));
            rowObject.transform.SetParent(hand.transform, false);
            var rowRect = rowObject.GetComponent<RectTransform>(); rowRect.anchorMin = new Vector2(0, 0); rowRect.anchorMax = new Vector2(1, 1); rowRect.offsetMin = new Vector2(7, 28); rowRect.offsetMax = new Vector2(-7, -26);
            var row = rowObject.GetComponent<HorizontalLayoutGroup>(); row.spacing = 5; row.childControlHeight = true; row.childControlWidth = true; row.childForceExpandHeight = true; row.childForceExpandWidth = true;
            string[] cards = { "⚡\nGENERADOR\n1", "▰\nASALTO\n3", "⬡\nESCUDO\n3", "✦\nDRON\n1" };
            Color[] accents = { cyan, new Color32(255, 143, 95, 255), new Color32(118, 177, 255, 255), gold };
            for (int i = 0; i < cards.Length; i++)
            {
                int cardIndex = i;
                var slot = Panel("Preview Card " + i, rowObject.transform, new Color32(23, 54, 76, 255));
                slot.AddComponent<LayoutElement>().flexibleWidth = 1;
                slot.AddComponent<Outline>().effectColor = accents[i];
                PlacedLabel(slot.transform, cards[i], 8, white, FontStyle.Bold, TextAnchor.MiddleCenter, Vector2.zero, Vector2.one, new Vector2(2, 3), new Vector2(-2, -3));
                var cost = Panel("Energy Cost", slot.transform, accents[i]);
                Anchor(cost, new Vector2(.5f, 1), new Vector2(.5f, 1), new Vector2(-11, -22), new Vector2(11, 0));
                PlacedLabel(cost.transform, (i == 0 || i == 3 ? "1" : "3"), 9, ink, FontStyle.Bold, TextAnchor.MiddleCenter, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
                var button = slot.AddComponent<Button>(); button.transition = Selectable.Transition.None;
                button.onClick.AddListener(() => RequestIntegration("arena.preview_card." + cardIndex));
            }
            PlacedLabel(hand.transform, "ENERGÍA DE BATALLA · DEMOSTRACIÓN VISUAL", 7, muted, FontStyle.Normal, TextAnchor.MiddleLeft, Vector2.zero, new Vector2(1, 0), new Vector2(8, 2), new Vector2(-8, 18));
            var meter = Panel("Battle Energy Meter", hand.transform, new Color32(5, 16, 28, 255));
            Anchor(meter, new Vector2(0, 0), new Vector2(1, 0), new Vector2(8, 2), new Vector2(-8, 7));
            var fill = Panel("Energy Preview Fill", meter.transform, new Color32(183, 64, 209, 255));
            Anchor(fill, Vector2.zero, new Vector2(.62f, 1), Vector2.zero, Vector2.zero);
        }

        private void BuildRankingsScreen()
        {
            Hero("LIGA", "SUBÍ EN LA CLASIFICACIÓN", "Temporada competitiva · resultados verificados", new Color32(155, 103, 203, 255));
            if (apiClient == null || !apiClient.IsAuthenticated)
            {
                var login = Card("CONECTÁ TU CUENTA", "Iniciá sesión para consultar la temporada online.", 164);
                FlowActionButton(CardBody(login.transform), "IR A MEGAFÁBRICA · INICIAR SESIÓN", cyan, () => ShowSection(HubSection.MegaFactory));
                return;
            }
            if (rankingBusy)
            {
                var loading = Card("CONECTANDO", "Consultando el servidor de Factory Wars", 140);
                FlowLabel(CardBody(loading.transform), rankingStatus, 11, cyan, FontStyle.Normal, 55);
                return;
            }
            if (rankingError != null)
            {
                var failure = Card("NO SE PUDO ACTUALIZAR", "La clasificación anterior no se muestra como actual.", 220);
                Transform body = CardBody(failure.transform);
                FlowLabel(body, "HTTP " + rankingError.statusCode + " · " + rankingError.message, 11, gold, FontStyle.Normal, 70);
                FlowActionButton(body, "REINTENTAR · CONSULTAR ESTADO", cyan, RefreshRanking);
                if (rankingError.statusCode == 401)
                    FlowActionButton(body, "IR A CUENTA", gold, () => ShowSection(HubSection.MegaFactory));
                return;
            }
            if (leaderboard == null) return;

            string selfId = "human:" + apiClient.CurrentSession.userId;
            int ownIndex = Array.FindIndex(leaderboard.players, player => player.participant_id == selfId);
            FactoryWarsLeaderboardPlayer own = ownIndex >= 0 ? leaderboard.players[ownIndex] : null;
            var season = Card("TEMPORADA · " + leaderboard.seasonId, own != null ? "Inscripción confirmada por el servidor" : "Todavía no estás inscripto", own != null ? 306 : 260);
            Transform seasonBody = CardBody(season.transform);
            StatRow(seasonBody, "TU POSICIÓN", own != null ? "#" + (ownIndex + 1) : "—", own != null ? CivilizationName(own.civilization) : "Unite para participar en la liga");
            if (own != null)
            {
                StatRow(seasonBody, "PUNTOS · RATING", own.points + " · " + own.rating, "Puntuación oficial de la temporada");
                StatRow(seasonBody, "RESULTADOS", own.wins + " V · " + own.draws + " E · " + own.losses + " D", "Victorias · empates · derrotas");
            }
            else
            {
                string civ = onlineProfile != null && onlineProfile.empire != null && onlineProfile.empire.state != null ? onlineProfile.empire.state.currentCiv : null;
                bool canJoin = Array.Exists(Civilizations, entry => entry.Id == civ);
                FlowLabel(seasonBody, canJoin ? "Participarás con " + CivilizationName(civ) + "." : "Elegí primero una civilización en tu Megafábrica.", 11, muted, FontStyle.Normal, 38);
                FlowActionButton(seasonBody, canJoin ? "UNIRME A LA TEMPORADA" : "ELEGIR CIVILIZACIÓN", gold,
                    () => { if (canJoin) JoinRankingSeason(); else ShowSection(HubSection.Civilizations); }).interactable = !apiBusy && !HasAmbiguousCommand;
            }
            FlowActionButton(seasonBody, "ACTUALIZAR CLASIFICACIÓN", cyan, RefreshRanking);
            var standings = Card("TABLA DE JUGADORES", "Orden oficial · puntos, rating y victorias", 105 + leaderboard.players.Length * 65);
            Transform standingsBody = CardBody(standings.transform);
            if (leaderboard.players.Length == 0)
                FlowLabel(standingsBody, "La temporada todavía no tiene participantes.", 11, muted, FontStyle.Normal, 40);
            for (int i = 0; i < leaderboard.players.Length; i++)
            {
                var player = leaderboard.players[i];
                bool current = i == ownIndex;
                string name = player.display_name + (current ? " · VOS" : player.is_bot ? " · BOT" : "");
                StatRow(standingsBody, "#" + (i + 1) + "  " + name, player.points + " pts", CivilizationName(player.civilization) + " · Rating " + player.rating + " · " + player.wins + " V / " + player.draws + " E / " + player.losses + " D");
            }
            foreach (Text label in content.GetComponentsInChildren<Text>()) label.supportRichText = false;
        }

        private void RenderRankingContent()
        {
            for (int i = content.childCount - 1; i >= 0; i--) Destroy(content.GetChild(i).gameObject);
            BuildRankingsScreen();
            content.anchoredPosition = Vector2.zero;
        }

        private bool IsCurrentRankingRequest(int epoch, FactoryWarsApiClient client, string userId)
        {
            return currentSection == HubSection.Rankings && epoch == rankingViewEpoch &&
                   ReferenceEquals(apiClient, client) && client.IsAuthenticated && client.CurrentSession.userId == userId;
        }

        private void RefreshRanking()
        {
            if (rankingBusy || apiClient == null || !apiClient.IsAuthenticated) return;
            rankingViewEpoch++;
            leaderboard = null;
            rankingError = null;
            rankingBusy = true;
            rankingStatus = "Cargando temporada y clasificación…";
            RenderRankingContent();
            StartRankingLoad(rankingViewEpoch);
        }

        private void StartRankingLoad(int epoch)
        {
            FactoryWarsApiClient client = apiClient;
            string userId = client.CurrentSession.userId;
            // Reload /me so join eligibility is based on the latest server state.
            StartCoroutine(client.GetMe((profile, profileError) =>
            {
                if (!IsCurrentRankingRequest(epoch, client, userId)) return;
                if (profileError != null) { FinishRankingRequest(null, profileError); return; }
                onlineProfile = profile;
                UpdateResourceHud();
                StartCoroutine(client.GetLeaderboard((response, error) =>
                {
                    if (!IsCurrentRankingRequest(epoch, client, userId)) return;
                    FinishRankingRequest(response, error);
                }));
            }));
        }

        private void FinishRankingRequest(FactoryWarsLeaderboardResponse response, FactoryWarsApiError error)
        {
            rankingBusy = false;
            leaderboard = response;
            rankingError = error;
            RenderRankingContent();
        }

        private void JoinRankingSeason()
        {
            if (rankingBusy || apiBusy || HasAmbiguousCommand || apiClient == null || !apiClient.IsAuthenticated) return;
            rankingViewEpoch++;
            int epoch = rankingViewEpoch;
            FactoryWarsApiClient client = apiClient;
            string userId = client.CurrentSession.userId;
            rankingBusy = true;
            rankingStatus = "Solicitando inscripción en la temporada…";
            RenderRankingContent();
            StartCoroutine(client.JoinSeason((response, error) =>
            {
                if (!IsCurrentRankingRequest(epoch, client, userId)) return;
                if (error != null) { FinishRankingRequest(null, error); return; }
                rankingStatus = "Inscripción confirmada · actualizando clasificación…";
                RenderRankingContent();
                StartRankingLoad(epoch);
            }));
        }

        private void BuildCivilizationsScreen()
        {
            Hero("FACCIÓN", "CIVILIZACIONES", "Catálogo actual de Factory Wars", new Color32(87, 167, 147, 255));
            for (int i = 0; i < Civilizations.Length; i++)
            {
                int index = i;
                var civ = Civilizations[i];
                var card = Card(civ.Icon + "   " + civ.Name, civ.Summary, 196);
                var accent = Panel("Accent", card.transform, civ.Accent);
                Anchor(accent, new Vector2(0, 0), new Vector2(0, 1), new Vector2(0, -5), new Vector2(5, 5));
                var crest = Panel("Crest", card.transform, new Color(civ.Accent.r, civ.Accent.g, civ.Accent.b, .22f));
                Anchor(crest, new Vector2(1, 1), new Vector2(1, 1), new Vector2(-55, -54), new Vector2(-12, -11));
                PlacedLabel(crest.transform, civ.Icon, 20, civ.Accent, FontStyle.Bold, TextAnchor.MiddleCenter, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
                PlacedLabel(card.transform, "MEGAFÁBRICA", 9, cyan, FontStyle.Bold, TextAnchor.MiddleLeft, new Vector2(0, 1), new Vector2(1, 1), new Vector2(14, -53), new Vector2(-28, -35));
                PlacedLabel(card.transform, civ.FactoryBonus, 12, white, FontStyle.Bold, TextAnchor.MiddleLeft, new Vector2(0, 1), new Vector2(1, 1), new Vector2(14, -76), new Vector2(-28, -54));
                PlacedLabel(card.transform, "ARENA", 9, gold, FontStyle.Bold, TextAnchor.MiddleLeft, new Vector2(0, 1), new Vector2(1, 1), new Vector2(14, -98), new Vector2(-28, -80));
                PlacedLabel(card.transform, civ.ArenaBonus, 10, muted, FontStyle.Normal, TextAnchor.MiddleLeft, new Vector2(0, 1), new Vector2(1, 1), new Vector2(14, -120), new Vector2(-28, -99));
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
            PlacedLabel(row.transform, title, 8, cyan, FontStyle.Bold, TextAnchor.MiddleLeft, new Vector2(0, 1), new Vector2(.48f, 1), new Vector2(10, -22), new Vector2(-4, -4));
            PlacedLabel(row.transform, value, 11, white, FontStyle.Bold, TextAnchor.MiddleRight, new Vector2(.49f, 1), Vector2.one, new Vector2(0, -22), new Vector2(-10, -4));
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
            var field = Panel("Battlefield", parent, new Color32(137, 119, 91, 255));
            Anchor(field, new Vector2(.035f, .035f), new Vector2(.965f, .965f), Vector2.zero, Vector2.zero);
            var tileLayer = Panel("Arena Tile Layer", field.transform, new Color32(143, 125, 92, 255));
            Anchor(tileLayer, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            var grid = tileLayer.AddComponent<GridLayoutGroup>(); grid.cellSize = new Vector2(36, 24); grid.spacing = new Vector2(2, 2); grid.constraint = GridLayoutGroup.Constraint.FixedColumnCount; grid.constraintCount = 8; grid.childAlignment = TextAnchor.MiddleCenter;
            for (int i = 0; i < 56; i++)
            {
                Panel("Arena Tile", tileLayer.transform, i % 2 == 0 ? new Color32(197, 177, 140, 255) : new Color32(177, 157, 122, 255));
            }
            var river = Panel("River", field.transform, new Color32(47, 155, 183, 255));
            Anchor(river, new Vector2(0, .485f), new Vector2(1, .535f), Vector2.zero, Vector2.zero);
            Panel("Left Bridge", field.transform, new Color32(198, 156, 91, 255));
            Anchor(field.transform.Find("Left Bridge").gameObject, new Vector2(.26f, .455f), new Vector2(.39f, .565f), Vector2.zero, Vector2.zero);
            Panel("Right Bridge", field.transform, new Color32(198, 156, 91, 255));
            Anchor(field.transform.Find("Right Bridge").gameObject, new Vector2(.61f, .455f), new Vector2(.74f, .565f), Vector2.zero, Vector2.zero);
            Tower(field.transform, .22f, .2f, new Color32(69, 166, 219, 255));
            Tower(field.transform, .78f, .2f, new Color32(69, 166, 219, 255));
            Tower(field.transform, .5f, .14f, new Color32(55, 124, 185, 255));
            Tower(field.transform, .22f, .8f, new Color32(222, 111, 96, 255));
            Tower(field.transform, .78f, .8f, new Color32(222, 111, 96, 255));
            Tower(field.transform, .5f, .86f, new Color32(195, 89, 78, 255));
            PlacedLabel(field.transform, "RIVAL · TORRES", 7, new Color32(255, 208, 178, 255), FontStyle.Bold, TextAnchor.MiddleCenter, new Vector2(0, 1), new Vector2(1, 1), new Vector2(0, -16), new Vector2(0, -2));
            PlacedLabel(field.transform, "TU LADO", 7, new Color32(186, 230, 255, 255), FontStyle.Bold, TextAnchor.MiddleCenter, Vector2.zero, new Vector2(1, 0), new Vector2(0, 2), new Vector2(0, 16));
            PlacedLabel(field.transform, "PREVISUALIZACIÓN · NO ES UNA PARTIDA", 7, white, FontStyle.Bold, TextAnchor.MiddleCenter, new Vector2(0, .535f), new Vector2(1, .535f), new Vector2(0, 2), new Vector2(0, 15));
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
            var camera = Camera.main;
            if (camera == null)
            {
                var cameraObject = new GameObject("Procedural World Camera", typeof(Camera));
                cameraObject.transform.SetParent(transform, false);
                camera = cameraObject.GetComponent<Camera>();
            }
            else
            {
                camera.gameObject.name = "Procedural World Camera";
                camera.transform.SetParent(transform, false);
            }
            camera.clearFlags = CameraClearFlags.SolidColor; camera.backgroundColor = new Color32(5, 15, 29, 255);
            camera.orthographic = true; camera.orthographicSize = 8.7f; camera.transform.position = new Vector3(0, 11, -15); camera.transform.rotation = Quaternion.Euler(34, 0, 0);
            camera.depth = 0;
            worldCamera = camera;
            var lightObject = new GameObject("World Key Light", typeof(Light)); lightObject.transform.SetParent(transform, false);
            var light = lightObject.GetComponent<Light>(); light.type = LightType.Directional; light.intensity = 1.25f; light.color = new Color32(186, 223, 255, 255); lightObject.transform.rotation = Quaternion.Euler(47, -32, 0);
            RenderSettings.ambientLight = new Color32(84, 104, 126, 255);
            var water = Primitive("Ocean Platform", PrimitiveType.Cylinder, new Vector3(0, -1.1f, 0), new Vector3(10, .28f, 15), new Color32(14, 101, 151, 255));
            Primitive("Floating Island", PrimitiveType.Cylinder, new Vector3(0, -.58f, 0), new Vector3(8.4f, .65f, 13.8f), new Color32(63, 75, 91, 255));
            Primitive("Island Top", PrimitiveType.Cylinder, new Vector3(0, -.14f, 0), new Vector3(8.0f, .36f, 13.4f), new Color32(86, 137, 86, 255));
            waterMaterial = water.GetComponent<Renderer>().material;
            BuildMegafactoryWorld();
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

        private void BuildMegafactoryWorld()
        {
            Color steel = new Color32(94, 125, 150, 255);
            Color steelLight = new Color32(172, 195, 204, 255);
            Color trim = new Color32(245, 190, 83, 255);
            Color glow = new Color32(51, 220, 247, 255);

            // A compact cross-shaped campus keeps all four producers around the large central hub.
            FactoryPart("Campus road west", PrimitiveType.Cube, new Vector3(-1.32f, .045f, 0), new Vector3(1.55f, .055f, .36f), new Color32(137, 153, 145, 255));
            FactoryPart("Campus road east", PrimitiveType.Cube, new Vector3(1.32f, .045f, 0), new Vector3(1.55f, .055f, .36f), new Color32(137, 153, 145, 255));
            FactoryPart("Campus road north", PrimitiveType.Cube, new Vector3(0, .045f, 1.95f), new Vector3(.36f, .055f, 2.6f), new Color32(137, 153, 145, 255));
            FactoryPart("Campus road south", PrimitiveType.Cube, new Vector3(0, .045f, -1.95f), new Vector3(.36f, .055f, 2.6f), new Color32(137, 153, 145, 255));
            FactoryPart("Campus hub pad", PrimitiveType.Cylinder, new Vector3(0, .09f, 0), new Vector3(2.95f, .16f, 2.7f), new Color32(109, 135, 130, 255));

            BuildCentralFactory(steel, steelLight, trim, glow);
            BuildSolarFactory(new Vector3(-2.45f, .08f, -3.45f), steel, steelLight, trim, glow);
            BuildSteelFactory(new Vector3(2.45f, .08f, -3.45f), steel, steelLight, trim, glow);
            BuildIntelFactory(new Vector3(-2.45f, .08f, 3.45f), steel, steelLight, trim, glow);
            BuildGoldMine(new Vector3(2.45f, .08f, 3.45f), steel, steelLight, trim, glow);

            // Small terrain accents break up the flat prototype island without external art assets.
            for (int i = 0; i < 9; i++)
            {
                float angle = (i / 9f) * Mathf.PI * 2f;
                Vector3 basePosition = new Vector3(Mathf.Cos(angle) * 3.48f, .08f, Mathf.Sin(angle) * 5.9f);
                FactoryPart("Island rock " + i, PrimitiveType.Sphere, basePosition, new Vector3(.72f, .32f, .55f), new Color32(102, 118, 119, 255)).transform.rotation = Quaternion.Euler(8, i * 31, 0);
                if (i % 2 == 0)
                {
                    FactoryPart("Island tree trunk " + i, PrimitiveType.Cylinder, basePosition + Vector3.up * .48f, new Vector3(.13f, .5f, .13f), new Color32(106, 80, 52, 255));
                    FactoryPart("Island tree crown " + i, PrimitiveType.Sphere, basePosition + Vector3.up * 1.08f, new Vector3(.58f, .9f, .58f), new Color32(48, 130, 89, 255));
                }
            }
        }

        private void UpdateResourceHud()
        {
            var state = onlineProfile != null && onlineProfile.empire != null ? onlineProfile.empire.state : null;
            if (state == null || state.buildings == null)
            {
                for (int i = 0; i < resourceHudAmounts.Length; i++)
                {
                    if (resourceHudAmounts[i] != null) resourceHudAmounts[i].text = "—";
                    if (resourceHudRates[i] != null) resourceHudRates[i].text = "—/s";
                }
                RefreshWorldBadges(null, null);
                return;
            }

            double[] rates = CurrentProductionRates(state);
            double[] amounts = { state.credits, state.energy, state.steel, state.intel };
            for (int i = 0; i < resourceHudAmounts.Length; i++)
            {
                if (resourceHudAmounts[i] != null) resourceHudAmounts[i].text = amounts[i].ToString("N0", System.Globalization.CultureInfo.GetCultureInfo("es-AR"));
                if (resourceHudRates[i] != null) resourceHudRates[i].text = "+" + rates[i].ToString("0.##", System.Globalization.CultureInfo.InvariantCulture) + "/s";
            }
            RefreshWorldBadges(state, rates);
        }

        private static double[] CurrentProductionRates(FactoryWarsEmpireState state)
        {
            // Mirrors public/game/domain/empire/economy.js so the Unity HUD follows the game's balance rules.
            double legacy = 1 + Math.Min(state.prestigeCount, 10) * .01
                + Math.Min(Math.Max(state.prestigeCount - 10, 0), 10) * .005
                + Math.Max(state.prestigeCount - 20, 0) * .0025;
            double civilization = state.currentCiv == "bastion" ? 1.08 : 1;
            double research = state.research != null && Array.IndexOf(state.research, "logistics") >= 0 ? 1.08 : 1;
            double multiplier = legacy * civilization * research;
            return new[] {
                .18 * state.buildings.automation * multiplier,
                .75 * state.buildings.generator * multiplier,
                .42 * state.buildings.refinery * multiplier,
                .04 * state.buildings.lab * multiplier
            };
        }

        private void RefreshWorldBadges(FactoryWarsEmpireState state, double[] rates)
        {
            string[] names = { "ORO", "ENERGÍA", "ACERO", "INTEL" };
            string[] badgeIds = { "Gold mine badge", "Energy factory badge", "Steel factory badge", "Intel factory badge" };
            int[] levels = state != null && state.buildings != null
                ? new[] { state.buildings.automation, state.buildings.generator, state.buildings.refinery, state.buildings.lab }
                : null;
            for (int i = 0; i < badgeIds.Length; i++)
            {
                if (!worldBadges.TryGetValue(badgeIds[i], out var badge)) continue;
                badge.text = levels == null || rates == null
                    ? names[i] + "\nNIV — · —/s"
                    : names[i] + "\nNIV " + levels[i] + " · +" + rates[i].ToString("0.##", System.Globalization.CultureInfo.InvariantCulture) + "/s";
            }
        }

        private void BuildCentralFactory(Color steel, Color steelLight, Color trim, Color glow)
        {
            Vector3 c = new Vector3(0, .2f, 0);
            FactoryPart("Megafactory base", PrimitiveType.Cube, c, new Vector3(2.18f, .42f, 1.92f), steel);
            FactoryPart("Megafactory gold foundation", PrimitiveType.Cube, c + Vector3.down * .2f, new Vector3(2.3f, .09f, 2.02f), trim);
            FactoryPart("Megafactory main hall", PrimitiveType.Cube, c + Vector3.up * .62f, new Vector3(1.85f, .84f, 1.62f), steelLight);
            FactoryPart("Megafactory roof", PrimitiveType.Cube, c + Vector3.up * 1.08f, new Vector3(2.0f, .15f, 1.76f), steel);
            FactoryPart("Megafactory crown base", PrimitiveType.Cylinder, c + Vector3.up * 1.29f, new Vector3(.96f, .25f, .96f), trim);
            var core = FactoryPart("Megafactory research core", PrimitiveType.Cube, c + Vector3.up * 2.03f, new Vector3(.68f, 1.28f, .68f), new Color32(53, 143, 191, 255));
            FactoryPart("Megafactory core light front", PrimitiveType.Cube, core.transform.position + new Vector3(0, 0, -.35f), new Vector3(.27f, .94f, .035f), glow);
            FactoryPart("Megafactory core light left", PrimitiveType.Cube, core.transform.position + new Vector3(-.35f, 0, 0), new Vector3(.035f, .94f, .27f), glow);
            FactoryPart("Megafactory core light right", PrimitiveType.Cube, core.transform.position + new Vector3(.35f, 0, 0), new Vector3(.035f, .94f, .27f), glow);
            FactoryPart("Megafactory crown", PrimitiveType.Cylinder, c + Vector3.up * 2.73f, new Vector3(.82f, .14f, .82f), steelLight);
            FactoryPart("Megafactory beacon", PrimitiveType.Sphere, c + Vector3.up * 2.94f, new Vector3(.23f, .34f, .23f), glow).AddComponent<AmbientPulse>();
            FactoryPipe("Megafactory west conduit", c + new Vector3(-1.06f, .5f, 0), c + new Vector3(-1.62f, .32f, 0), glow, .11f);
            FactoryPipe("Megafactory east conduit", c + new Vector3(1.06f, .5f, 0), c + new Vector3(1.62f, .32f, 0), trim, .11f);
            FactoryBadge("Megafactory badge", new Vector3(0, 3.55f, -.2f), "MEGAFÁBRICA\nINVESTIGAR · CONTRATAR", glow, 2.15f);
        }

        private void BuildSolarFactory(Vector3 c, Color steel, Color steelLight, Color trim, Color glow)
        {
            FactoryPart("Solar facility pad", PrimitiveType.Cube, c, new Vector3(1.65f, .14f, 1.1f), steel);
            FactoryPart("Solar facility control room", PrimitiveType.Cube, c + new Vector3(.34f, .48f, .12f), new Vector3(.62f, .72f, .66f), steelLight);
            FactoryPart("Solar facility roof", PrimitiveType.Cube, c + new Vector3(.34f, .87f, .12f), new Vector3(.73f, .1f, .77f), trim);
            for (int row = 0; row < 2; row++)
                for (int col = 0; col < 3; col++)
                {
                    var panel = FactoryPart("Solar array panel", PrimitiveType.Cube, c + new Vector3(-.48f + col * .33f, .55f, -.4f + row * .37f), new Vector3(.29f, .055f, .33f), new Color32(33, 111, 204, 255));
                    panel.transform.rotation = Quaternion.Euler(-18, 0, 0);
                    FactoryPart("Solar panel cell", PrimitiveType.Cube, panel.transform.position + new Vector3(0, .04f, -.01f), new Vector3(.24f, .012f, .025f), glow).transform.rotation = panel.transform.rotation;
                }
            FactoryBadge("Energy factory badge", c + new Vector3(0, 1.28f, -.48f), "ENERGÍA\nNIV — · —/s", glow, 1.32f);
        }

        private void BuildSteelFactory(Vector3 c, Color steel, Color steelLight, Color trim, Color glow)
        {
            FactoryPart("Steel foundry pad", PrimitiveType.Cube, c, new Vector3(1.48f, .14f, 1.25f), steel);
            FactoryPart("Steel foundry furnace", PrimitiveType.Cube, c + new Vector3(-.15f, .57f, 0), new Vector3(.88f, .98f, .84f), steelLight);
            FactoryPart("Steel furnace front", PrimitiveType.Cube, c + new Vector3(-.15f, .53f, -.44f), new Vector3(.5f, .38f, .035f), new Color32(242, 128, 61, 255));
            FactoryPart("Steel furnace molten core", PrimitiveType.Sphere, c + new Vector3(-.15f, .54f, -.48f), new Vector3(.26f, .2f, .08f), new Color32(255, 193, 67, 255)).AddComponent<AmbientPulse>();
            FactoryPart("Steel tank", PrimitiveType.Cylinder, c + new Vector3(.38f, .57f, .13f), new Vector3(.42f, .98f, .42f), steel);
            FactoryPart("Steel tank rim", PrimitiveType.Cylinder, c + new Vector3(.38f, 1.09f, .13f), new Vector3(.5f, .1f, .5f), trim);
            FactoryPart("Steel chimney", PrimitiveType.Cylinder, c + new Vector3(-.42f, 1.15f, .2f), new Vector3(.2f, .62f, .2f), steel);
            FactoryPart("Steel chimney cap", PrimitiveType.Cylinder, c + new Vector3(-.42f, 1.48f, .2f), new Vector3(.29f, .12f, .29f), trim);
            FactoryBadge("Steel factory badge", c + new Vector3(0, 2.05f, -.46f), "ACERO\nNIV — · —/s", glow, 1.32f);
        }

        private void BuildIntelFactory(Vector3 c, Color steel, Color steelLight, Color trim, Color glow)
        {
            FactoryPart("Intel lab pad", PrimitiveType.Cube, c, new Vector3(1.48f, .14f, 1.24f), steel);
            FactoryPart("Intel lab body", PrimitiveType.Cube, c + new Vector3(0, .46f, .02f), new Vector3(1.04f, .68f, .88f), steelLight);
            FactoryPart("Intel lab lower trim", PrimitiveType.Cube, c + new Vector3(0, .18f, -.46f), new Vector3(.72f, .12f, .035f), glow);
            FactoryPart("Intel lab dome", PrimitiveType.Sphere, c + new Vector3(0, 1.02f, .04f), new Vector3(.86f, .55f, .86f), new Color32(39, 143, 192, 255));
            FactoryPart("Intel lab dome glint", PrimitiveType.Cube, c + new Vector3(0, 1.04f, -.41f), new Vector3(.39f, .06f, .035f), glow);
            FactoryPart("Intel satellite dish", PrimitiveType.Cylinder, c + new Vector3(.49f, 1.05f, .37f), new Vector3(.42f, .09f, .42f), steelLight).transform.rotation = Quaternion.Euler(26, 0, 0);
            FactoryPipe("Intel lab antenna", c + new Vector3(-.47f, .94f, .2f), c + new Vector3(-.47f, 1.38f, .2f), trim, .045f);
            FactoryBadge("Intel factory badge", c + new Vector3(0, 1.56f, -.48f), "INTEL\nNIV — · —/s", glow, 1.32f);
        }

        private void BuildGoldMine(Vector3 c, Color steel, Color steelLight, Color trim, Color glow)
        {
            FactoryPart("Gold mine pad", PrimitiveType.Cube, c, new Vector3(1.5f, .14f, 1.24f), steel);
            FactoryPart("Gold mine entrance", PrimitiveType.Cube, c + new Vector3(0, .44f, .15f), new Vector3(.92f, .65f, .72f), steel);
            FactoryPart("Gold mine entrance arch", PrimitiveType.Cube, c + new Vector3(0, .81f, -.22f), new Vector3(1.05f, .12f, .12f), trim);
            FactoryPart("Gold mine tunnel", PrimitiveType.Cube, c + new Vector3(0, .39f, -.23f), new Vector3(.58f, .43f, .035f), new Color32(38, 39, 44, 255));
            FactoryPart("Gold mine elevator", PrimitiveType.Cylinder, c + new Vector3(.46f, .68f, .23f), new Vector3(.2f, 1.08f, .2f), steelLight);
            FactoryPart("Gold mine lift wheel", PrimitiveType.Cylinder, c + new Vector3(.46f, 1.25f, .23f), new Vector3(.42f, .12f, .42f), trim);
            FactoryPart("Gold ore seam", PrimitiveType.Sphere, c + new Vector3(-.46f, .3f, .36f), new Vector3(.52f, .42f, .48f), new Color32(118, 100, 64, 255));
            for (int i = 0; i < 5; i++)
            {
                float x = -.64f + (i % 3) * .22f;
                float z = .16f + (i / 3) * .21f;
                FactoryPart("Gold ore nugget", PrimitiveType.Sphere, c + new Vector3(x, .52f + (i % 2) * .1f, z), new Vector3(.14f, .18f, .14f), trim).AddComponent<AmbientPulse>().phase = i * .6f;
            }
            FactoryBadge("Gold mine badge", c + new Vector3(0, 1.85f, -.48f), "ORO\nNIV — · —/s", glow, 1.32f);
        }

        private GameObject FactoryPart(string name, PrimitiveType type, Vector3 position, Vector3 scale, Color color)
        {
            return Primitive(name, type, position, scale, color);
        }

        private GameObject FactoryPipe(string name, Vector3 start, Vector3 end, Color color, float radius)
        {
            Vector3 direction = end - start;
            var pipe = FactoryPart(name, PrimitiveType.Cylinder, (start + end) * .5f, new Vector3(radius, direction.magnitude * .5f, radius), color);
            pipe.transform.up = direction.normalized;
            return pipe;
        }

        private void FactoryBadge(string name, Vector3 position, string caption, Color accent, float width)
        {
            var background = FactoryPart(name + " backing", PrimitiveType.Cube, position, new Vector3(width, .32f, .055f), new Color32(12, 35, 56, 245));
            background.transform.rotation = Quaternion.LookRotation(CameraDirection(position));
            FactoryPart(name + " top edge", PrimitiveType.Cube, position + Vector3.up * .145f, new Vector3(width, .025f, .07f), accent).transform.rotation = background.transform.rotation;
            var labelObject = new GameObject(name + " text", typeof(TextMesh));
            labelObject.transform.SetParent(transform, false);
            labelObject.transform.position = position + background.transform.forward * .04f;
            labelObject.transform.rotation = background.transform.rotation;
            var label = labelObject.GetComponent<TextMesh>();
            label.text = caption;
            label.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            label.fontSize = 100;
            label.characterSize = .12f;
            label.anchor = TextAnchor.MiddleCenter;
            label.alignment = TextAlignment.Center;
            label.color = new Color32(236, 249, 255, 255);
            label.richText = false;
            sceneObjects.Add(labelObject);
            worldBadges[name] = label;
        }

        private Vector3 CameraDirection(Vector3 position)
        {
            return worldCamera != null ? worldCamera.transform.position - position : new Vector3(0, 1, -1);
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
            var text = go.GetComponent<Text>(); text.text = value; text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf"); text.fontSize = size; text.color = color; text.fontStyle = style; text.alignment = alignment; text.horizontalOverflow = HorizontalWrapMode.Wrap; text.verticalOverflow = VerticalWrapMode.Overflow; text.raycastTarget = false;
            return text;
        }

        private static Text PlacedLabel(Transform parent, string value, int size, Color color, FontStyle style, TextAnchor alignment, Vector2 anchorMin, Vector2 anchorMax, Vector2 offsetMin, Vector2 offsetMax)
        {
            var go = new GameObject("Label", typeof(RectTransform), typeof(Text)); go.transform.SetParent(parent, false);
            var rect = go.GetComponent<RectTransform>(); rect.anchorMin = anchorMin; rect.anchorMax = anchorMax; rect.offsetMin = offsetMin; rect.offsetMax = offsetMax;
            var text = go.GetComponent<Text>(); text.text = value; text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf"); text.fontSize = size; text.color = color; text.fontStyle = style; text.alignment = alignment; text.horizontalOverflow = HorizontalWrapMode.Wrap; text.verticalOverflow = VerticalWrapMode.Overflow; text.raycastTarget = false;
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

    // Supply height through the layout so an AspectRatioFitter does not compete with it.
    public sealed class PortraitArtworkLayout : MonoBehaviour
    {
        private RectTransform rect;
        private LayoutElement element;
        private void Awake()
        {
            rect = GetComponent<RectTransform>();
            element = GetComponent<LayoutElement>();
        }
        private void LateUpdate()
        {
            if (rect == null || element == null || rect.rect.width <= 0) return;
            float height = rect.rect.width * 16f / 9f;
            if (Mathf.Abs(element.preferredHeight - height) > .1f) element.preferredHeight = height;
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
