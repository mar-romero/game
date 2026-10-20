using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Events;
using UnityEngine.UI;

namespace FactoryWars.Unity6
{
    public enum HubSection { MegaFactory, MegaFactoryV2, Pvp, Rankings, Civilizations }

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
        private readonly List<GameObject>[] factoryUpgradeDetails = { new List<GameObject>(), new List<GameObject>(), new List<GameObject>(), new List<GameObject>() };
        private readonly List<GameObject>[] factoryPrestigeDetails = { new List<GameObject>(), new List<GameObject>(), new List<GameObject>() };
        private readonly List<FactoryCargoLoop> factoryCargoLoops = new List<FactoryCargoLoop>();

        private Canvas canvas;
        private GameObject factoryArtLayer;
        private RectTransform factoryArtRect;
        private Image canvasBackdropImage;
        private RectTransform factoryMapOverlay;
        private LayoutElement factoryMapSpace;
        private ScrollRect screenScroll;
        private readonly List<FactoryMapMarker> factoryMapMarkers = new List<FactoryMapMarker>();
        private sealed class FactoryMapMarker
        {
            public RectTransform rect;
            public Vector2 artAnchor;
            public int row;
            public float preferredWidth;
        }
        private readonly float[] factoryMapRowHeights = new float[4];
        private readonly float[] factoryMapRowPositions = new float[4];
        private RectTransform content;
        private RectTransform nav;
        private Text headerTitle;
        private readonly Text[] resourceHudAmounts = new Text[4];
        private readonly Text[] resourceHudRates = new Text[4];
        private enum HudIcon { Credits, Energy, Steel, Intel, Factory, Swords, Trophy, Globe }
        private readonly Sprite[] hudIconSprites = new Sprite[8];
        private Sprite hudPanelFill, hudPanelEdge, hudPanelGlow, hudPanelSheen;
        private readonly List<Texture2D> hudPanelTextures = new List<Texture2D>();
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
        private FactoryV2Save factoryMapLocalPreview;
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
            BuildWorld();
            ShowSection(HubSection.MegaFactory);
        }

        private void Update()
        {
            if (toastPanel != null && toastPanel.activeSelf && Time.unscaledTime > toastUntil) toastPanel.SetActive(false);
            if (waterMaterial != null) waterMaterial.SetTextureOffset("_MainTex", new Vector2(0, Time.time * .008f));
            ArenaTick(Time.unscaledDeltaTime);
            TickFactoryV2(Time.unscaledDeltaTime);
        }

        private void OnApplicationPause(bool paused) { if (paused) SaveFactoryV2(true); }
        private void OnApplicationQuit() { SaveFactoryV2(true); }

        private void LateUpdate()
        {
            UpdateFactoryMapLayout();
            UpdateFactoryV2NavigationLayout();
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
            if (hudPanelFill != null) Destroy(hudPanelFill);
            if (hudPanelEdge != null) Destroy(hudPanelEdge);
            if (hudPanelGlow != null) Destroy(hudPanelGlow);
            if (hudPanelSheen != null) Destroy(hudPanelSheen);
            foreach (var texture in hudPanelTextures) Destroy(texture);
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

        private void EnsureHudPanelSprites()
        {
            if (hudPanelFill != null) return;
            const int size = 64;
            const float radius = 18;
            var pixels = new Color[4][] { new Color[size * size], new Color[size * size], new Color[size * size], new Color[size * size] };
            for (int y = 0; y < size; y++)
            for (int x = 0; x < size; x++)
            {
                // Nine-slicing stretches the center and edges while retaining the rounded corners.
                float dx = Mathf.Abs(x + .5f - size / 2f) - (size / 2f - radius);
                float dy = Mathf.Abs(y + .5f - size / 2f) - (size / 2f - radius);
                float distance = Mathf.Min(Mathf.Max(dx, dy), 0) + new Vector2(Mathf.Max(dx, 0), Mathf.Max(dy, 0)).magnitude - radius;
                float fill = Mathf.Clamp01(.5f - distance);
                int index = y * size + x;
                pixels[0][index] = new Color(1, 1, 1, fill);
                pixels[1][index] = new Color(1, 1, 1, fill - Mathf.Clamp01(-1f - distance));
                pixels[2][index] = new Color(1, 1, 1, Mathf.Clamp01(1f - Mathf.Abs(distance + 2f) / 5f) * .32f);
                float reflection = Mathf.Pow((y + .5f) / size, 4) * .18f;
                pixels[3][index] = new Color(.8f, .96f, 1, fill * reflection);
            }
            var sprites = new Sprite[4];
            for (int i = 0; i < sprites.Length; i++)
            {
                var texture = new Texture2D(size, size, TextureFormat.RGBA32, false);
                texture.name = "Rounded HUD " + i; texture.wrapMode = TextureWrapMode.Clamp;
                texture.filterMode = FilterMode.Bilinear; texture.SetPixels(pixels[i]); texture.Apply(false, true);
                hudPanelTextures.Add(texture);
                sprites[i] = Sprite.Create(texture, new Rect(0, 0, size, size), new Vector2(.5f, .5f), 100, 0, SpriteMeshType.FullRect, new Vector4(20, 20, 20, 20));
            }
            hudPanelFill = sprites[0]; hudPanelEdge = sprites[1]; hudPanelGlow = sprites[2]; hudPanelSheen = sprites[3];
        }

        private GameObject RoundedHudPanel(string name, Transform parent, Color fill, Color accent)
        {
            EnsureHudPanelSprites();
            var panelObject = Panel(name, parent, fill);
            var image = panelObject.GetComponent<Image>(); image.sprite = hudPanelFill; image.type = Image.Type.Sliced;
            var glow = Panel("Edge glow", panelObject.transform, new Color(accent.r, accent.g, accent.b, .6f));
            Anchor(glow, Vector2.zero, Vector2.one, new Vector2(-3, -3), new Vector2(3, 3));
            var glowImage = glow.GetComponent<Image>(); glowImage.sprite = hudPanelGlow; glowImage.type = Image.Type.Sliced; glowImage.raycastTarget = false;
            LayoutElement(glow).ignoreLayout = true;
            // Layered translucency and reflections; standard UI images do not blur the artwork.
            var sheen = Panel("Glass reflection", panelObject.transform, Color.white);
            Anchor(sheen, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            var sheenImage = sheen.GetComponent<Image>(); sheenImage.sprite = hudPanelSheen; sheenImage.type = Image.Type.Sliced; sheenImage.raycastTarget = false;
            LayoutElement(sheen).ignoreLayout = true;
            var edge = Panel("Lit edge", panelObject.transform, new Color(accent.r, accent.g, accent.b, .5f));
            Anchor(edge, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            var edgeImage = edge.GetComponent<Image>(); edgeImage.sprite = hudPanelEdge; edgeImage.type = Image.Type.Sliced; edgeImage.raycastTarget = false;
            LayoutElement(edge).ignoreLayout = true;
            return panelObject;
        }

        private static void HudDivider(Transform parent, Vector2 min, Vector2 max, Vector2 insetMin, Vector2 insetMax)
        {
            var divider = Panel("Inset divider", parent, new Color32(106, 183, 204, 145));
            Anchor(divider, min, max, insetMin, insetMax);
            divider.GetComponent<Image>().raycastTarget = false;
            LayoutElement(divider).ignoreLayout = true;
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
            canvasBackdropImage = backdropImage;

            factoryArtLayer = new GameObject("Factory Fullscreen Art", typeof(RectTransform));
            factoryArtLayer.transform.SetParent(canvas.transform, false);
            Anchor(factoryArtLayer, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            var artwork = Panel("Megafactory Island Cover", factoryArtLayer.transform, Color.white);
            factoryArtRect = artwork.GetComponent<RectTransform>();
            var artworkImage = artwork.GetComponent<Image>();
            artworkImage.sprite = Resources.Load<Sprite>("MegafactoryIslandActive") ?? Resources.Load<Sprite>("MegafactoryIsland");
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
            safe.GetComponent<Image>().raycastTarget = false;
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
            scrollRoot.GetComponent<Image>().raycastTarget = false;
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

            nav = RoundedHudPanel("Bottom Navigation", safe.transform, new Color32(7, 39, 67, 214), cyan).GetComponent<RectTransform>();
            Anchor(nav.gameObject, Vector2.zero, new Vector2(1, 0), new Vector2(5, 5), new Vector2(-5, 86));
            var navLayout = nav.gameObject.AddComponent<HorizontalLayoutGroup>();
            navLayout.padding = new RectOffset(6, 6, 6, 6); navLayout.spacing = 0;
            navLayout.childControlHeight = true; navLayout.childControlWidth = true; navLayout.childForceExpandHeight = true; navLayout.childForceExpandWidth = true;

            NavButton(HudIcon.Factory, "FAB", HubSection.MegaFactory);
            NavButton(HudIcon.Swords, "PVP", HubSection.Pvp);
            NavButton(HudIcon.Trophy, "RANKING", HubSection.Rankings);
            NavButton(HudIcon.Globe, "CIVILIZACIONES", HubSection.Civilizations);
            for (int i = 1; i < 4; i++)
            {
                float dividerX = i * .25f;
                HudDivider(nav, new Vector2(dividerX, .18f), new Vector2(dividerX, .82f), new Vector2(-.5f, 0), new Vector2(.5f, 0));
            }

            var toastPanel = Panel("Integration Toast", safe.transform, new Color32(9, 27, 43, 250));
            Anchor(toastPanel, new Vector2(.06f, 0), new Vector2(.94f, 0), new Vector2(0, 92), new Vector2(0, 142));
            this.toastPanel = toastPanel;
            toast = Label(toastPanel.transform, "", 12, white, FontStyle.Bold, TextAnchor.MiddleCenter, new Vector2(10, 4), Vector2.one, new Vector2(-20, -8));
            toastPanel.SetActive(false);
        }

        private void NavButton(HudIcon icon, string label, HubSection section)
        {
            var button = Panel("Nav " + section, nav, Color.clear);
            var surface = button.GetComponent<Image>(); surface.sprite = hudPanelFill; surface.type = Image.Type.Sliced;
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
        }

        private void BuildResourceHud(Transform parent)
        {
            string[] names = { "CRÉDITOS", "ENERGÍA", "ACERO", "INTEL" };
            string[] buildingKeys = { "automation", "generator", "refinery", "lab" };
            for (int i = 0; i < names.Length; i++)
            {
                float left = i * .25f;
                var card = RoundedHudPanel("Resource " + names[i], parent, new Color32(5, 40, 65, 255), cyan);
                Anchor(card, new Vector2(left, .05f), new Vector2(left + .25f, .87f), new Vector2(3, 0), new Vector2(-3, 0));
                var name = PlacedLabel(card.transform, names[i], 10, white, FontStyle.Bold, TextAnchor.MiddleLeft, new Vector2(0, 1), Vector2.one, new Vector2(5, -40), new Vector2(-43, 0));
                name.horizontalOverflow = HorizontalWrapMode.Overflow;
                var icon = HudIconImage(card.transform, (HudIcon)i, new Vector2(0, .40f), new Vector2(30, 26));
                icon.rectTransform.anchoredPosition = new Vector2(17, 0);
                resourceHudAmounts[i] = PlacedLabel(card.transform, "—", 18, white, FontStyle.Bold, TextAnchor.MiddleLeft, new Vector2(0, .26f), new Vector2(1, .54f), new Vector2(34, 0), new Vector2(-5, 0));
                resourceHudAmounts[i].resizeTextForBestFit = true;
                resourceHudAmounts[i].resizeTextMinSize = 9; resourceHudAmounts[i].resizeTextMaxSize = 18;
                HudDivider(card.transform, new Vector2(0, .25f), new Vector2(1, .25f), new Vector2(8, 0), new Vector2(-8, 1));
                resourceHudRates[i] = PlacedLabel(card.transform, "—/s", 12, new Color32(89, 250, 196, 255), FontStyle.Bold, TextAnchor.MiddleCenter, Vector2.zero, new Vector2(1, .24f), new Vector2(4, 0), new Vector2(-4, 0));
                string key = buildingKeys[i];
                var manage = Panel("Manage " + names[i], card.transform, Color.clear);
                var manageRect = manage.GetComponent<RectTransform>();
                manageRect.anchorMin = manageRect.anchorMax = Vector2.one;
                manageRect.pivot = Vector2.one; manageRect.anchoredPosition = new Vector2(-1, 0); manageRect.sizeDelta = new Vector2(40, 40);
                var plus = RoundedHudPanel("Plus affordance", manage.transform, new Color32(8, 134, 103, 255), new Color32(67, 255, 187, 255));
                var plusRect = plus.GetComponent<RectTransform>();
                plusRect.anchorMin = plusRect.anchorMax = new Vector2(.5f, .5f); plusRect.sizeDelta = new Vector2(20, 20); plusRect.anchoredPosition = new Vector2(6, 0);
                plus.GetComponent<Image>().raycastTarget = false;
                PlacedLabel(plus.transform, "+", 17, white, FontStyle.Bold, TextAnchor.MiddleCenter, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
                var manageButton = manage.AddComponent<Button>(); manageButton.targetGraphic = plus.GetComponent<Image>(); ButtonFeedback(manageButton);
                manageButton.onClick.AddListener(() => OpenFactoryResource(key));
            }
        }

        private void ShowSection(HubSection section)
        {
            CloseFactoryV2ProducerPopup();
            if (factoryBuildingTargets != null) { factoryBuildingTargets.SetActive(false); Destroy(factoryBuildingTargets); factoryBuildingTargets = null; }
            rankingViewEpoch++;
            currentSection = section;
            if (canvasBackdropImage != null) canvasBackdropImage.color = ink;
            bool arenaFullscreen = section == HubSection.Pvp && arenaLocalMatch != null;
            var contentLayout = content.GetComponent<VerticalLayoutGroup>();
            if (contentLayout != null)
            {
                contentLayout.padding = arenaFullscreen ? new RectOffset(0, 0, 0, 0) : new RectOffset(14, 14, 14, 24);
                contentLayout.spacing = arenaFullscreen ? 0 : 12;
            }
            if (screenScroll != null)
            {
                var scrollRect = screenScroll.GetComponent<RectTransform>();
                scrollRect.offsetMin = arenaFullscreen ? Vector2.zero : new Vector2(0, 86);
                scrollRect.offsetMax = arenaFullscreen ? Vector2.zero : new Vector2(0, -110);
                screenScroll.vertical = !arenaFullscreen;
            }
            if (nav != null) nav.gameObject.SetActive(!arenaFullscreen);
            if (headerTitle != null && headerTitle.transform.parent != null) headerTitle.transform.parent.gameObject.SetActive(!arenaFullscreen);
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
            factoryArtLayer.SetActive(section == HubSection.MegaFactory || section == HubSection.MegaFactoryV2);
            SetWorld(section == HubSection.Pvp);
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
                case HubSection.MegaFactoryV2: BuildFactoryV2Screen(); break;
                case HubSection.Pvp: BuildArenaScreen(); break;
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
                if (child.GetComponent<Button>() == null) continue;
                var image = child.GetComponent<Image>();
                bool active = child.name == "Nav " + (section == HubSection.MegaFactoryV2 ? HubSection.MegaFactory : section);
                image.color = active ? new Color(73f / 255, 205f / 255, 235f / 255, .14f) : Color.clear;
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
                BuildOnlineSignInCard();
                return;
            }
            var account = Card("CUENTA ONLINE", "La sesión se cierra al salir de la aplicación.", 110);
            FlowActionButton(CardBody(account.transform), "CERRAR SESIÓN", gold, SignOut).interactable = !HasAmbiguousCommand;
            if (HasAmbiguousCommand) BuildPendingCommandCard();
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
                    FlowActionButton(body, "CONECTAR CUENTA", gold, BuildOnlineSignInCard);
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

            BuildFactoryProgressDetails(steel, steelLight, trim, glow);
            BuildFactoryCargoLoops();

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
            if ((currentSection == HubSection.MegaFactory || currentSection == HubSection.MegaFactoryV2) && factoryV2Save != null && !factoryV2NeedsReset)
            {
                double[] v2Rates = FactoryV2Rates(factoryV2Save.cycle);
                double[] v2Amounts = { factoryV2Save.cycle.credits, factoryV2Save.cycle.energy, factoryV2Save.cycle.steel, factoryV2Save.cycle.intel };
                int[] v2Levels = { factoryV2Save.cycle.automation, factoryV2Save.cycle.generator, factoryV2Save.cycle.refinery, factoryV2Save.cycle.lab };
                for (int i = 0; i < resourceHudAmounts.Length; i++)
                {
                    if (resourceHudAmounts[i] != null) resourceHudAmounts[i].text = v2Amounts[i].ToString("N0", System.Globalization.CultureInfo.GetCultureInfo("es-AR"));
                    if (resourceHudRates[i] != null) resourceHudRates[i].text = "+" + v2Rates[i].ToString("0.##", System.Globalization.CultureInfo.InvariantCulture) + "/s";
                }
                RefreshWorldBadges(v2Levels, v2Rates, factoryV2Save.permanent.prestigeCount);
                return;
            }
            if (currentSection == HubSection.MegaFactory && factoryMapLocalPreview != null)
            {
                double[] localRates = FactoryV2Rates(factoryMapLocalPreview.cycle);
                double[] localAmounts = { factoryMapLocalPreview.cycle.credits, factoryMapLocalPreview.cycle.energy, factoryMapLocalPreview.cycle.steel, factoryMapLocalPreview.cycle.intel };
                for (int i = 0; i < resourceHudAmounts.Length; i++)
                {
                    if (resourceHudAmounts[i] != null) resourceHudAmounts[i].text = localAmounts[i].ToString("N0", System.Globalization.CultureInfo.GetCultureInfo("es-AR"));
                    if (resourceHudRates[i] != null) resourceHudRates[i].text = "+" + localRates[i].ToString("0.##", System.Globalization.CultureInfo.InvariantCulture) + "/s";
                }
                return;
            }
            var state = onlineProfile != null && onlineProfile.empire != null ? onlineProfile.empire.state : null;
            if (state == null || state.buildings == null)
            {
                for (int i = 0; i < resourceHudAmounts.Length; i++)
                {
                    if (resourceHudAmounts[i] != null) resourceHudAmounts[i].text = "—";
                    if (resourceHudRates[i] != null) resourceHudRates[i].text = "—/s";
                }
                RefreshWorldBadges(null, null, 0);
                return;
            }

            double[] rates = CurrentProductionRates(state);
            double[] amounts = { state.credits, state.energy, state.steel, state.intel };
            for (int i = 0; i < resourceHudAmounts.Length; i++)
            {
                if (resourceHudAmounts[i] != null) resourceHudAmounts[i].text = amounts[i].ToString("N0", System.Globalization.CultureInfo.GetCultureInfo("es-AR"));
                if (resourceHudRates[i] != null) resourceHudRates[i].text = "+" + rates[i].ToString("0.##", System.Globalization.CultureInfo.InvariantCulture) + "/s";
            }
            RefreshWorldBadges(state != null && state.buildings != null ? new[] { state.buildings.automation, state.buildings.generator, state.buildings.refinery, state.buildings.lab } : null, rates, state != null ? state.prestigeCount : 0);
        }

        private static double[] CurrentProductionRates(FactoryWarsEmpireState state)
        {
            // Mirrors public/game/domain/factory-v2/factory-engine.js so the Unity HUD follows the active factory balance.
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

        private void RefreshWorldBadges(int[] levels, double[] rates, int prestigeCount)
        {
            string[] names = { "ORO", "ENERGÍA", "ACERO", "INTEL" };
            string[] badgeIds = { "Gold mine badge", "Energy factory badge", "Steel factory badge", "Intel factory badge" };
            if (worldBadges.TryGetValue("Gold mine badge", out var mineBadge)) mineBadge.gameObject.SetActive(currentSection != HubSection.MegaFactoryV2);
            for (int i = 0; i < badgeIds.Length; i++)
            {
                if (currentSection == HubSection.MegaFactoryV2 && i == 0) continue;
                if (!worldBadges.TryGetValue(badgeIds[i], out var badge)) continue;
                badge.text = levels == null || rates == null
                    ? names[i] + "\nNIV — · —/s"
                    : names[i] + "\nNIV " + levels[i] + " · +" + rates[i].ToString("0.##", System.Globalization.CultureInfo.InvariantCulture) + "/s";
            }
            if (worldBadges.TryGetValue("Megafactory badge", out var hub))
                hub.text = currentSection == HubSection.MegaFactoryV2 && levels != null && rates != null
                    ? "CRÉDITOS NIV " + levels[0] + "\nPRESTIGIO " + prestigeCount.ToString("00")
                    : "MEGAFÁBRICA\nINVESTIGAR · CONTRATAR";
            int[] visualLevels = levels == null ? new[] { 1, 1, 1, 1 } : levels;
            for (int i = 0; i < factoryUpgradeDetails.Length; i++)
                for (int tier = 0; tier < factoryUpgradeDetails[i].Count / 2; tier++)
                {
                    int milestone = tier == 0 ? 2 : tier == 1 ? 5 : 10;
                    bool visible = visualLevels[i] >= milestone;
                    factoryUpgradeDetails[i][tier * 2].SetActive(visible);
                    factoryUpgradeDetails[i][tier * 2 + 1].SetActive(visible);
                }
            for (int tier = 0; tier < factoryPrestigeDetails.Length; tier++)
                for (int detail = 0; detail < factoryPrestigeDetails[tier].Count; detail++)
                    factoryPrestigeDetails[tier][detail].SetActive(prestigeCount >= (tier + 1) * 2);
            int[] activeRates = currentSection != HubSection.MegaFactoryV2 || levels == null || rates == null
                ? new[] { 0, 0, 0, 0 }
                : new[] { rates[0] > 0 ? 1 : 0, rates[1] > 0 ? 1 : 0, rates[2] > 0 ? 1 : 0, rates[3] > 0 ? 1 : 0 };
            for (int i = 0; i < factoryCargoLoops.Count; i++) factoryCargoLoops[i].isRunning = activeRates[factoryCargoLoops[i].producerIndex] != 0;
        }

        private void BuildFactoryProgressDetails(Color steel, Color steelLight, Color trim, Color glow)
        {
            // Milestone add-ons make upgrades and permanent prestige visible on the illustrated diorama.
            Vector3[] sites = { new Vector3(0, .08f, 0), new Vector3(-2.45f, .08f, -3.45f), new Vector3(2.45f, .08f, -3.45f), new Vector3(-2.45f, .08f, 3.45f) };
            for (int producer = 0; producer < sites.Length; producer++)
            for (int tier = 0; tier < 3; tier++)
            {
                float side = tier % 2 == 0 ? -1 : 1;
                Vector3 p = sites[producer] + new Vector3(side * (1.05f + tier * .18f), .08f, -.12f + tier * .18f);
                var module = FactoryPart("Factory upgrade " + producer + " tier " + tier, PrimitiveType.Cylinder, p, new Vector3(.32f, .38f + tier * .09f, .32f), tier == 2 ? trim : steelLight);
                var light = FactoryPart("Factory upgrade light " + producer + " tier " + tier, PrimitiveType.Cube, p + new Vector3(0, .04f, -.17f), new Vector3(.18f, .08f, .025f), glow);
                module.SetActive(false);
                light.SetActive(false);
                factoryUpgradeDetails[producer].Add(module);
                factoryUpgradeDetails[producer].Add(light);
            }
            // Prestige stages surround the hub beacon like hand-painted rings in an isometric strategy diorama.
            for (int ring = 0; ring < factoryPrestigeDetails.Length; ring++)
            {
                float radius = 1.28f + ring * .22f;
                Color accent = ring == 2 ? trim : glow;
                Vector3[] markers = { new Vector3(-radius, 1.48f + ring * .1f, 0), new Vector3(radius, 1.48f + ring * .1f, 0), new Vector3(0, 1.48f + ring * .1f, -radius), new Vector3(0, 1.48f + ring * .1f, radius) };
                for (int i = 0; i < markers.Length; i++)
                {
                    var detail = FactoryPart("Factory prestige marker " + ring + " " + i, PrimitiveType.Sphere, markers[i], new Vector3(.13f, .13f, .13f), accent);
                    detail.SetActive(false);
                    factoryPrestigeDetails[ring].Add(detail);
                }
            }
        }

        private void BuildFactoryCargoLoops()
        {
            // Credits travel above the front roof so the opaque central hall cannot hide the flow.
            Vector3[] starts = { new Vector3(-.85f, 1.5f, -.88f), new Vector3(-2.45f, .38f, -3.45f), new Vector3(2.45f, .32f, -3.45f), new Vector3(-2.45f, .32f, 3.45f) };
            Color[] colors = { new Color32(255, 195, 74, 255), new Color32(73, 205, 235, 255), new Color32(242, 128, 61, 255), new Color32(178, 130, 231, 255) };
            for (int producer = 0; producer < starts.Length; producer++)
            for (int cargo = 0; cargo < 3; cargo++)
            {
                var pod = FactoryPart("Factory cargo " + producer + " " + cargo, PrimitiveType.Sphere, starts[producer], new Vector3(.12f, .12f, .12f), colors[producer]);
                var loop = pod.AddComponent<FactoryCargoLoop>();
                loop.start = starts[producer];
                loop.end = producer == 0 ? new Vector3(.85f, 1.5f, -.88f) : new Vector3(0, .24f, 0);
                loop.phase = cargo / 3f; loop.producerIndex = producer;
                factoryCargoLoops.Add(loop);
            }
        }

        private void TickFactoryCameraInput()
        {
            if (worldCamera == null || currentSection != HubSection.MegaFactoryV2) return;
            var events = UnityEngine.EventSystems.EventSystem.current;
            if (Input.touchCount == 1)
            {
                var touch = Input.GetTouch(0);
                if (events != null && events.IsPointerOverGameObject(touch.fingerId)) return;
                if (touch.phase == TouchPhase.Moved) worldCamera.transform.RotateAround(Vector3.zero, Vector3.up, touch.deltaPosition.x * .22f);
            }
            else if (Input.touchCount >= 2)
            {
                var a = Input.GetTouch(0); var b = Input.GetTouch(1);
                if (events != null && (events.IsPointerOverGameObject(a.fingerId) || events.IsPointerOverGameObject(b.fingerId))) return;
                float previous = (a.position - a.deltaPosition - b.position + b.deltaPosition).magnitude;
                float current = (a.position - b.position).magnitude;
                worldCamera.orthographicSize = Mathf.Clamp(worldCamera.orthographicSize - (current - previous) * .008f, 6.8f, 11.5f);
            }
            else if (Input.GetMouseButton(1) && (events == null || !events.IsPointerOverGameObject())) worldCamera.transform.RotateAround(Vector3.zero, Vector3.up, Input.GetAxis("Mouse X") * 2.5f);
            else if (Input.mouseScrollDelta.y != 0 && (events == null || !events.IsPointerOverGameObject())) worldCamera.orthographicSize = Mathf.Clamp(worldCamera.orthographicSize - Input.mouseScrollDelta.y * .35f, 6.8f, 11.5f);
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
            foreach (var obj in sceneObjects) obj.SetActive(arena && obj.name.StartsWith("Arena"));
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

    public sealed class FactoryCargoLoop : MonoBehaviour
    {
        [NonSerialized] public Vector3 start;
        [NonSerialized] public Vector3 end;
        [NonSerialized] public float phase;
        [NonSerialized] public int producerIndex;
        [NonSerialized] public bool isRunning;
        private Renderer cargoRenderer;
        private void Awake() { cargoRenderer = GetComponent<Renderer>(); }
        private void Update()
        {
            if (cargoRenderer != null) cargoRenderer.enabled = isRunning;
            if (!isRunning) return;
            float t = Mathf.Repeat(Time.time * .22f + phase, 1f);
            transform.localPosition = Vector3.Lerp(start, end, t) + Vector3.up * (Mathf.Sin(t * Mathf.PI) * .14f);
            transform.Rotate(Vector3.up, 100f * Time.deltaTime, Space.World);
        }
    }

    public sealed class FactoryMapCargoLoop : MonoBehaviour
    {
        public sealed class Route
        {
            public readonly int producer, mergeGroup, mergeNode, hiddenFromNode, hiddenToNode;
            public readonly Vector2[] anchors;
            public Route(int source, Vector2[] path, int junction = 0, int inlet = -1, int hideFrom = -1, int hideTo = -1)
            {
                producer = source; anchors = path; mergeGroup = junction; mergeNode = inlet;
                hiddenFromNode = hideFrom; hiddenToNode = hideTo;
            }
        }

        private sealed class CargoPiece
        {
            public RectTransform rect;
            public CanvasGroup fade;
            public float distance;
            public long arrival;
            public bool active;
            public Belt belt;
        }

        private sealed class Belt
        {
            public Route route;
            public Vector2[] points;
            public float[] cumulative;
            public bool[] ownsSection;
            public readonly List<CargoPiece> cargo = new List<CargoPiece>();
            public readonly List<Image> treads = new List<Image>();
            public float spawnAt;
            public float Length { get { return cumulative[cumulative.Length - 1]; } }
            public float Merge { get { return route.mergeGroup == 0 ? float.PositiveInfinity : cumulative[route.mergeNode]; } }
        }

        private sealed class ConveyorSection
        {
            public Belt belt;
            public int node;
            public Image surface;
        }

        private RectTransform artwork, overlay;
        private RectTransform conveyorLayer;
        private readonly List<Belt> belts = new List<Belt>();
        private readonly List<ConveyorSection> conveyorSections = new List<ConveyorSection>();
        private readonly Dictionary<int, CargoPiece> reservations = new Dictionary<int, CargoPiece>();
        private long arrivalSequence;
        private float clock;
        private float artWidth;
        private static readonly Sprite[] materialFaceSprites = new Sprite[4];
        private static Sprite contactShadowSprite;
        private static Sprite conveyorPlateSprite;
        public const float Speed = .072f;
        private const float Separation = .052f, SpawnInterval = 1.8f;
        // All distances use the same artwork units and clock as the packages.
        // Closely linked metal shoes read as one working belt at phone scale.
        private const float TreadSpacing = .0195f, TreadHalfLength = .0084f, TreadWidth = .0165f;
        private const float CargoWidth = .022f, CargoHeight = .026f;
        private const float ContactHeight = 27f / 80f;

        public void Initialize(RectTransform illustration, RectTransform mapOverlay, double[] rates, Route[] routes)
        {
            artwork = illustration;
            overlay = mapOverlay;
            for (int i = 0; i < routes.Length; i++)
            {
                Route route = routes[i];
                if (rates == null || route.producer >= rates.Length || !(rates[route.producer] > 0)) continue;
                var belt = new Belt { route = route, points = new Vector2[route.anchors.Length],
                    cumulative = new float[route.anchors.Length], ownsSection = new bool[route.anchors.Length - 1],
                    spawnAt = i * .31f };
                for (int j = 0; j < 6; j++)
                {
                    CargoPiece piece = CreateCargo(j, route.producer);
                    piece.belt = belt;
                    belt.cargo.Add(piece);
                }
                belts.Add(belt);
            }
            BuildConveyorSurfaces();
        }

        private void BuildConveyorSurfaces()
        {
            // Standard UI Images share the cargo's render path. Keep the entire
            // surface layer underneath every package, including plates created later.
            var layer = new GameObject("Conveyors · moving metal treads", typeof(RectTransform));
            var rect = layer.GetComponent<RectTransform>();
            conveyorLayer = rect;
            rect.SetParent(transform, false);
            rect.anchorMin = Vector2.zero; rect.anchorMax = Vector2.one;
            rect.offsetMin = rect.offsetMax = Vector2.zero;
            rect.SetAsFirstSibling();
            var seen = new HashSet<Vector4>();
            foreach (Belt belt in belts)
            for (int node = 0; node < belt.route.anchors.Length - 1; node++)
            {
                if (belt.route.hiddenFromNode >= 0 && node >= belt.route.hiddenFromNode
                    && node < belt.route.hiddenToNode) continue;
                Vector2 from = belt.route.anchors[node], to = belt.route.anchors[node + 1];
                var segment = new Vector4(from.x, from.y, to.x, to.y);
                var reversed = new Vector4(to.x, to.y, from.x, from.y);
                if (seen.Contains(segment) || seen.Contains(reversed)) continue;
                seen.Add(segment);
                belt.ownsSection[node] = true;
                var surface = ConveyorImage(rect, "Recessed graphite conveyor bed", null, new Color32(22, 38, 51, 255));
                surface.gameObject.SetActive(false);
                conveyorSections.Add(new ConveyorSection { belt = belt, node = node, surface = surface });
            }
        }

        private static Image ConveyorImage(Transform parent, string name, Sprite sprite, Color tint)
        {
            var go = new GameObject(name, typeof(RectTransform), typeof(Image));
            var rect = go.GetComponent<RectTransform>();
            rect.SetParent(parent, false);
            rect.anchorMin = rect.anchorMax = new Vector2(.5f, .5f);
            rect.pivot = new Vector2(.5f, .5f);
            var image = go.GetComponent<Image>();
            image.sprite = sprite;
            image.color = tint;
            image.raycastTarget = false;
            return image;
        }

        private static Sprite ConveyorPlateTexture()
        {
            if (conveyorPlateSprite != null) return conveyorPlateSprite;
            const int width = 64, height = 48;
            var pixels = new Color32[width * height];
            for (int y = 0; y < height; y++)
            for (int x = 0; x < width; x++)
            {
                // A complete articulated shoe: dark seam, rounded corner guards,
                // satin steel crown, raised leading lip and inset traction grooves.
                float edge = Mathf.Min(y, height - 1 - y);
                if ((x < 3 || x > width - 4) && edge < 3) continue;
                Color pixel = Color.Lerp(new Color32(67, 94, 111, 255),
                    new Color32(167, 198, 211, 255), Mathf.Sin((y + .5f) / height * Mathf.PI));
                if (x < 4) pixel = new Color32(24, 47, 64, 255);
                else if (x < 7) pixel = new Color32(100, 135, 153, 255);
                if (x >= width - 6) pixel = x >= width - 3
                    ? new Color32(228, 246, 250, 255) : new Color32(181, 216, 229, 255);
                if (edge < 3) pixel = new Color32(30, 59, 78, 255);
                else if (edge < 6) pixel = new Color32(191, 223, 233, 255);
                if (x > 12 && x < 47 && (y == 15 || y == 31)) pixel = new Color32(69, 111, 133, 255);
                // Tiny inset fasteners and a muted cyan edge match the factory steelwork.
                if ((x - 13) * (x - 13) + (y - 8) * (y - 8) < 7
                    || (x - 13) * (x - 13) + (y - 39) * (y - 39) < 7)
                    pixel = new Color32(24, 57, 76, 255);
                if (x > 25 && x < 40 && y == height - 7) pixel = new Color32(105, 213, 225, 255);
                pixels[y * width + x] = pixel;
            }
            var texture = new Texture2D(width, height, TextureFormat.RGBA32, false);
            texture.name = "Factory conveyor · moving steel plate";
            texture.hideFlags = HideFlags.DontSave;
            texture.filterMode = FilterMode.Bilinear;
            texture.wrapMode = TextureWrapMode.Clamp;
            texture.SetPixels32(pixels);
            texture.Apply(false, true);
            conveyorPlateSprite = Sprite.Create(texture, new Rect(0, 0, width, height), new Vector2(.5f, .5f), width);
            conveyorPlateSprite.hideFlags = HideFlags.DontSave;
            return conveyorPlateSprite;
        }

        private void DrawConveyorSurfaces()
        {
            foreach (ConveyorSection section in conveyorSections)
            {
                Belt belt = section.belt;
                int node = section.node;
                Vector2 start = belt.points[node], delta = belt.points[node + 1] - start;
                float length = delta.magnitude;
                float inlet = node == 0 ? artWidth * .008f : 0;
                float outlet = node == belt.points.Length - 2 ? artWidth * .008f : 0;
                float usableLength = length - inlet - outlet;
                bool visible = usableLength > .01f;
                section.surface.gameObject.SetActive(visible);
                if (!visible)
                    continue;
                Vector2 direction = delta / length;
                Quaternion rotation = Quaternion.Euler(0, 0, Mathf.Atan2(direction.y, direction.x) * Mathf.Rad2Deg);
                RectTransform surface = section.surface.rectTransform;
                surface.anchoredPosition = start + direction * (inlet + usableLength * .5f);
                surface.localRotation = rotation;
                surface.sizeDelta = new Vector2(usableLength, artWidth * TreadWidth);
            }
            foreach (Belt belt in belts)
            {
                int count = Mathf.CeilToInt(belt.Length / TreadSpacing) + 1;
                while (belt.treads.Count < count)
                    belt.treads.Add(ConveyorImage(conveyorLayer, "Articulated steel conveyor shoe", ConveyorPlateTexture(), Color.white));
                // Feeders share a single phase measured from their merge. Deduplicated
                // trunk sections therefore continue without changing cadence at a junction.
                float phaseOrigin = belt.route.mergeGroup == 0 ? 0 : belt.Merge;
                float phase = Mathf.Repeat(clock * Speed + phaseOrigin, TreadSpacing);
                for (int i = 0; i < belt.treads.Count; i++)
                {
                    Image plate = belt.treads[i];
                    float distance = phase + i * TreadSpacing;
                    int node = PathSegment(belt, distance);
                    bool hidden = belt.route.hiddenFromNode >= 0 && node >= belt.route.hiddenFromNode
                        && node < belt.route.hiddenToNode;
                    bool onBelt = i < count && distance >= .014f && distance <= belt.Length - .014f
                        && belt.ownsSection[node] && !hidden;
                    plate.gameObject.SetActive(onBelt);
                    if (!onBelt) continue;
                    float halfLength = TreadHalfLength;
                    // Never let a shoe project into the hidden bridge opening. At a
                    // corner shorten only its footprint, while its centre keeps moving
                    // continuously over the complete polyline instead of restarting.
                    if (belt.route.hiddenFromNode >= 0)
                    {
                        float from = belt.cumulative[belt.route.hiddenFromNode];
                        float to = belt.cumulative[belt.route.hiddenToNode];
                        if (distance <= from) halfLength = Mathf.Min(halfLength, from - distance);
                        if (distance >= to) halfLength = Mathf.Min(halfLength, distance - to);
                    }
                    float cornerDistance = Mathf.Min(distance - belt.cumulative[node], belt.cumulative[node + 1] - distance);
                    float cornerBlend = Mathf.Clamp01(cornerDistance / TreadHalfLength);
                    halfLength *= Mathf.Lerp(.55f, 1f, cornerBlend);
                    Vector2 position, before, after;
                    SamplePath(belt, distance, out position);
                    SamplePath(belt, Mathf.Max(0, distance - .002f), out before);
                    SamplePath(belt, Mathf.Min(belt.Length, distance + .002f), out after);
                    Vector2 direction = (after - before).normalized;
                    RectTransform tread = plate.rectTransform;
                    tread.anchoredPosition = position;
                    tread.localRotation = Quaternion.Euler(0, 0, Mathf.Atan2(direction.y, direction.x) * Mathf.Rad2Deg);
                    tread.sizeDelta = new Vector2(artWidth * halfLength * 2, artWidth * TreadWidth * .94f);
                    float gateFade = Mathf.Clamp01((Mathf.Min(distance, belt.Length - distance) - .014f) / .008f);
                    plate.color = new Color(1, 1, 1, gateFade);
                }
            }
        }

        private CargoPiece CreateCargo(int index, int producer)
        {
            var root = new GameObject("Moving resource " + producer + " · " + index, typeof(RectTransform), typeof(CanvasGroup));
            root.transform.SetParent(transform, false);
            var rect = root.GetComponent<RectTransform>();
            rect.anchorMin = rect.anchorMax = new Vector2(.5f, .5f);
            rect.pivot = new Vector2(.5f, .5f);
            // The shadow stays below the package while both inherit the root's scale and fade.
            CreateCargoVisual(root.transform, "Contact shadow", ContactShadowTexture());
            CreateCargoVisual(root.transform, "Metal package", MaterialFaceTexture(producer));
            var group = root.GetComponent<CanvasGroup>();
            group.interactable = false;
            group.blocksRaycasts = false;
            group.alpha = 0;

            return new CargoPiece { rect = rect, fade = group };
        }

        private static void CreateCargoVisual(Transform parent, string name, Sprite sprite)
        {
            var child = new GameObject(name, typeof(RectTransform), typeof(Image));
            child.transform.SetParent(parent, false);
            var rect = child.GetComponent<RectTransform>();
            rect.anchorMin = Vector2.zero; rect.anchorMax = Vector2.one;
            rect.offsetMin = rect.offsetMax = Vector2.zero;
            var image = child.GetComponent<Image>();
            image.sprite = sprite;
            image.raycastTarget = false;
        }

        private static Sprite ContactShadowTexture()
        {
            if (contactShadowSprite != null) return contactShadowSprite;
            const int width = 96, height = 80;
            var pixels = new Color32[width * height];
            for (int y = 0; y < height; y++)
            for (int x = 0; x < width; x++)
            {
                float shadow = Mathf.Abs(x + .5f - 48) / 39 + Mathf.Abs(y + .5f - 27) / 20;
                if (shadow < 1) pixels[y * width + x] = new Color(.015f, .035f, .055f, .55f * (1 - shadow));
            }
            var texture = new Texture2D(width, height, TextureFormat.RGBA32, false);
            texture.name = "Factory cargo · contact shadow";
            texture.hideFlags = HideFlags.DontSave;
            texture.filterMode = FilterMode.Bilinear;
            texture.wrapMode = TextureWrapMode.Clamp;
            texture.SetPixels32(pixels);
            texture.Apply(false, true);
            contactShadowSprite = Sprite.Create(texture, new Rect(0, 0, width, height), new Vector2(.5f, .5f), width);
            contactShadowSprite.hideFlags = HideFlags.DontSave;
            return contactShadowSprite;
        }

        private static Sprite MaterialFaceTexture(int producer)
        {
            if (materialFaceSprites[producer] != null) return materialFaceSprites[producer];
            const int width = 96, height = 80;
            Color accent = producer == 0 ? new Color32(255, 194, 49, 255) : producer == 1
                ? new Color32(92, 234, 255, 255) : producer == 2 ? new Color32(171, 202, 223, 255)
                : new Color32(90, 134, 255, 255);
            var pixels = new Color32[width * height];
            // Both side faces share the island's isometric axes. The lower diamond is
            // centered on ContactHeight, so its shadow follows the belt centerline.
            var silhouette = new[] { new Vector2(8, 28), new Vector2(48, 7), new Vector2(88, 28),
                new Vector2(88, 56), new Vector2(48, 77), new Vector2(8, 56) };
            var front = new[] { new Vector2(11, 29), new Vector2(47, 11), new Vector2(47, 36), new Vector2(11, 54) };
            var top = new[] { new Vector2(12, 57), new Vector2(48, 74), new Vector2(84, 57), new Vector2(48, 39) };
            var side = new[] { new Vector2(50, 11), new Vector2(85, 29), new Vector2(85, 54), new Vector2(50, 36) };
            var topStrap = new[] { new Vector2(22, 62), new Vector2(28, 65), new Vector2(65, 47), new Vector2(59, 44) };
            var lidPanel = new[] { new Vector2(32, 57), new Vector2(48, 65), new Vector2(68, 56), new Vector2(52, 48) };
            for (int y = 0; y < height; y++)
            {
                for (int x = 0; x < width; x++)
                {
                    Vector2 point = new Vector2(x + .5f, y + .5f);
                    Color pixel = Color.clear;
                    if (InsideCargoFace(point, silhouette)) pixel = new Color32(14, 35, 51, 255);
                    if (InsideCargoFace(point, front))
                    {
                        float faceY = point.y + (point.x - 11) * .5f - 29;
                        pixel = Color.Lerp(new Color32(64, 98, 122, 255), new Color32(221, 239, 246, 255), faceY / 25);
                        // A recessed resource badge and broad corner guards survive phone scale.
                        if (point.x > 18 && point.x < 42 && faceY > 4 && faceY < 23)
                        {
                            pixel = new Color32(19, 45, 62, 255);
                            pixel = CargoEmblemPixel(producer, (point.x - 18) * 30 / 24, (faceY - 4) * 25 / 19, accent, pixel);
                        }
                        if (point.x < 16 || point.x > 44) pixel = Color.Lerp(accent, Color.white, .15f);
                        if (faceY > 23 || faceY < 2) pixel = new Color32(224, 245, 249, 255);
                    }
                    if (InsideCargoFace(point, top))
                    {
                        pixel = Color.Lerp(new Color32(156, 203, 224, 255), Color.white, (point.y - 39) / 35);
                        if (InsideCargoFace(point, lidPanel)) pixel = Color.Lerp(accent, new Color32(25, 66, 96, 255), .55f);
                        if (InsideCargoFace(point, topStrap)) pixel = Color.Lerp(accent, Color.white, .35f);
                    }
                    if (InsideCargoFace(point, side))
                    {
                        float faceY = point.y - (point.x - 50) * (18f / 35f) - 11;
                        pixel = Color.Lerp(new Color32(30, 59, 83, 255), new Color32(108, 162, 190, 255), faceY / 25);
                        if (point.x < 54 || point.x > 81) pixel = Color.Lerp(accent, Color.black, .25f);
                        if (point.x > 59 && point.x < 77 && (faceY > 7 && faceY < 10 || faceY > 14 && faceY < 17))
                            pixel = new Color32(19, 45, 62, 255);
                        if (faceY > 23) pixel = new Color32(193, 224, 237, 255);
                    }
                    pixels[y * width + x] = pixel;
                }
            }
            var texture = new Texture2D(width, height, TextureFormat.RGBA32, false);
            texture.name = "Factory cargo · metal resource case " + producer;
            texture.hideFlags = HideFlags.DontSave;
            texture.filterMode = FilterMode.Bilinear;
            texture.wrapMode = TextureWrapMode.Clamp;
            texture.SetPixels32(pixels);
            texture.Apply(false, true);
            var sprite = Sprite.Create(texture, new Rect(0, 0, width, height), new Vector2(.5f, .5f), width);
            sprite.name = texture.name;
            sprite.hideFlags = HideFlags.DontSave;
            materialFaceSprites[producer] = sprite;
            return sprite;
        }

        private static bool InsideCargoFace(Vector2 point, Vector2[] corners)
        {
            bool positive = false, negative = false;
            for (int i = 0; i < corners.Length; i++)
            {
                Vector2 edge = corners[(i + 1) % corners.Length] - corners[i];
                Vector2 offset = point - corners[i];
                float cross = edge.x * offset.y - edge.y * offset.x;
                positive |= cross > 0; negative |= cross < 0;
                if (positive && negative) return false;
            }
            return true;
        }

        private static Color CargoEmblemPixel(int producer, float x, float y, Color accent, Color background)
        {
            if (producer == 0 || producer == 2)
            {
                // A broad beveled ingot; steel carries a second stacked billet.
                float ingotY = producer == 2 && y < 12 ? y + 10 : y;
                if (x > 4 && x < 26 && ingotY > 8 && ingotY < 19 && x > 6 - (ingotY - 8) * .2f)
                    return ingotY > 15 ? Color.Lerp(accent, Color.white, .55f) : accent;
            }
            else if (producer == 1)
            {
                // Two wide strokes form a cyan lightning bolt.
                if ((y >= 12 && y <= 22 && x >= 18 - (22 - y) * .8f && x <= 25 - (22 - y) * .8f)
                    || (y >= 3 && y < 13 && x >= 7 + (y - 3) * .7f && x <= 14 + (y - 3) * .7f))
                    return Color.Lerp(accent, Color.white, .2f);
            }
            else
            {
                bool pin = ((x > 3 && x < 27 && (y > 3 && y < 6 || y > 19 && y < 22))
                    || (y > 5 && y < 20 && (x > 3 && x < 6 || x > 24 && x < 27)));
                if (pin) return accent;
                if (x > 7 && x < 23 && y > 7 && y < 18)
                    return x > 10 && x < 20 && y > 10 && y < 15 ? Color.Lerp(accent, Color.white, .75f) : accent;
            }
            return background;
        }

        private void Update()
        {
            if (artwork == null || overlay == null) return;
            artWidth = Vector2.Distance(MapPoint(Vector2.zero), MapPoint(Vector2.right));
            if (artWidth <= .01f) return;
            // Small steps preserve physical spacing even after a slow Editor frame.
            float dt = Mathf.Min(Time.unscaledDeltaTime, .05f);
            clock += dt;
            foreach (Belt belt in belts)
            {
                for (int i = 0; i < belt.points.Length; i++)
                {
                    belt.points[i] = MapPoint(belt.route.anchors[i]);
                    if (i > 0) belt.cumulative[i] = belt.cumulative[i - 1]
                        + Vector2.Distance(belt.points[i - 1], belt.points[i]) / artWidth;
                }
                if (clock >= belt.spawnAt) Spawn(belt);
            }
            DrawConveyorSurfaces();
            UpdateJunctions();
            foreach (Belt belt in belts)
            {
                belt.cargo.Sort(FrontFirst);
                float leader = float.PositiveInfinity;
                foreach (CargoPiece piece in belt.cargo)
                {
                    if (!piece.active) continue;
                    float next = Mathf.Min(piece.distance + Speed * dt, leader - Separation);
                    if (belt.route.mergeGroup != 0)
                    {
                        float stop = belt.Merge - Separation;
                        if (next >= stop && piece.arrival == 0) piece.arrival = ++arrivalSequence;
                        CargoPiece reservation;
                        reservations.TryGetValue(belt.route.mergeGroup, out reservation);
                        if (piece.distance < belt.Merge && reservation != piece) next = Mathf.Min(next, stop);
                        // Shared-trunk distance is measured from the same junction for every feeder.
                        foreach (Belt other in belts)
                        {
                            if (other.route.mergeGroup != belt.route.mergeGroup) continue;
                            foreach (CargoPiece ahead in other.cargo)
                            {
                                if (ahead == piece || !ahead.active) continue;
                                float progress = ahead.distance - other.Merge;
                                if (progress >= 0 && progress > piece.distance - belt.Merge)
                                    next = Mathf.Min(next, belt.Merge + progress - Separation);
                            }
                        }
                    }
                    piece.distance = Mathf.Max(piece.distance, next);
                    if (piece.distance >= belt.Length)
                    {
                        piece.active = false;
                        piece.fade.alpha = 0;
                        CargoPiece owner;
                        if (reservations.TryGetValue(belt.route.mergeGroup, out owner) && owner == piece)
                            reservations.Remove(belt.route.mergeGroup);
                        continue;
                    }
                    leader = piece.distance;
                    DrawCargo(piece);
                }
            }
        }

        private static int FrontFirst(CargoPiece a, CargoPiece b)
        {
            return (b.active ? b.distance : -1).CompareTo(a.active ? a.distance : -1);
        }

        private void Spawn(Belt belt)
        {
            foreach (CargoPiece piece in belt.cargo)
                if (piece.active && piece.distance < Separation) return;
            foreach (CargoPiece piece in belt.cargo)
            {
                if (piece.active) continue;
                piece.active = true; piece.distance = 0; piece.arrival = 0;
                belt.spawnAt = clock + SpawnInterval;
                return;
            }
        }

        private void UpdateJunctions()
        {
            foreach (Belt belt in belts)
            {
                int group = belt.route.mergeGroup;
                if (group == 0) continue;
                CargoPiece owner;
                if (reservations.TryGetValue(group, out owner) && owner != null && owner.active
                    && owner.distance < owner.belt.Merge + Separation) continue;
                CargoPiece first = null;
                foreach (Belt feeder in belts)
                {
                    if (feeder.route.mergeGroup != group) continue;
                    foreach (CargoPiece piece in feeder.cargo)
                        if (piece.active && piece.arrival > 0 && piece.distance < feeder.Merge
                            && (first == null || piece.arrival < first.arrival)) first = piece;
                }
                reservations[group] = first;
            }
        }

        private void DrawCargo(CargoPiece piece)
        {
            Belt belt = piece.belt;
            // Fading alone leaves part of the sprite past the gate. Keep the entire
            // contact diamond on the tread without changing transport/merge distance.
            float endpointInset = Mathf.Min(.01f, belt.Length * .2f);
            float visualDistance = Mathf.Clamp(piece.distance, endpointInset, belt.Length - endpointInset);
            Vector2 position;
            SamplePath(belt, visualDistance, out position);
            // Route anchors sit on the belt surface. The sprite pivot is at its visual center,
            // so raise the cargo until its lower face and contact shadow sit on that anchor.
            float contactOffset = artWidth * CargoHeight * (.5f - ContactHeight);
            piece.rect.anchoredPosition = position + Vector2.up * contactOffset;
            piece.rect.sizeDelta = new Vector2(artWidth * CargoWidth, artWidth * CargoHeight);
            // The diamond footprint follows both isometric axes; keep the case's walls
            // upright instead of tilting its whole sprite with a screen-space rotation.
            float gateFade = Mathf.Max(.0001f, Mathf.Min(.015f, (belt.Length - endpointInset * 2) * .5f));
            float entrance = Mathf.SmoothStep(0, 1, Mathf.Clamp01((piece.distance - endpointInset) / gateFade));
            float exit = Mathf.SmoothStep(0, 1, Mathf.Clamp01((belt.Length - endpointInset - piece.distance) / gateFade));
            float visible = 1;
            if (belt.route.hiddenFromNode >= 0)
            {
                float from = belt.cumulative[belt.route.hiddenFromNode], to = belt.cumulative[belt.route.hiddenToNode];
                if (piece.distance > from && piece.distance < to)
                {
                    float enterShadow = Mathf.SmoothStep(0, 1, Mathf.Clamp01((piece.distance - from) / .012f));
                    float leaveShadow = Mathf.SmoothStep(0, 1, Mathf.Clamp01((to - piece.distance) / .012f));
                    visible = 1 - Mathf.Min(enterShadow, leaveShadow);
                }
            }
            piece.fade.alpha = entrance * exit * visible;
            piece.rect.localScale = Vector3.one * Mathf.Lerp(.85f, 1, Mathf.Min(entrance, exit));
        }

        private void SamplePath(Belt belt, float distance, out Vector2 position)
        {
            int segment = PathSegment(belt, distance);
            float length = belt.cumulative[segment + 1] - belt.cumulative[segment];
            float t = length > .0001f ? (distance - belt.cumulative[segment]) / length : 0;
            position = Vector2.Lerp(belt.points[segment], belt.points[segment + 1], t);
        }

        private static int PathSegment(Belt belt, float distance)
        {
            int segment = 0;
            while (segment < belt.points.Length - 2 && distance > belt.cumulative[segment + 1]) segment++;
            return segment;
        }

        private Vector2 MapPoint(Vector2 anchor)
        {
            Vector2 source = Vector2.Scale(anchor - artwork.pivot, artwork.rect.size);
            return overlay.InverseTransformPoint(artwork.TransformPoint(source));
        }
    }
}
