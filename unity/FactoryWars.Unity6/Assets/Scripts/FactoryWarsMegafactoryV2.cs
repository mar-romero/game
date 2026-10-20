using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Events;
using UnityEngine.UI;

namespace FactoryWars.Unity6
{
    public sealed partial class FactoryWarsMobileApp
    {
        private const string FactoryV2SaveKey = "factory-wars.factory-v2.unity.local.v1";
        private const int FactoryV2Schema = 1;
        private const long FactoryV2OfflineLimitMs = 4L * 60L * 60L * 1000L;
        private const int FactoryV2MaxLevel = 50;

        [Serializable] private sealed class FactoryV2Permanent { public int prestigeCount; public string[] research = new string[0]; }
        [Serializable] private sealed class FactoryV2Cycle
        {
            public double credits, energy, steel, intel;
            public int automation = 1, generator = 1, refinery = 1, lab = 1;
            public int upgrades, contractsCompleted;
            public string contractId, projectId;
            public long contractEndsAt;
            public bool projectCompleted;
            public double deliveredCredits, deliveredEnergy, deliveredSteel, deliveredIntel;
        }
        [Serializable] private sealed class FactoryV2Save
        {
            public int schemaVersion;
            public long savedAt;
            public FactoryV2Permanent permanent;
            public FactoryV2Cycle cycle;
        }
        private sealed class FactoryV2Producer
        {
            public string id, name, resource;
            public double rate, baseCost;
            public FactoryV2Producer(string key, string title, string output, double outputRate, double cost)
            { id = key; name = title; resource = output; rate = outputRate; baseCost = cost; }
        }
        private sealed class FactoryV2Option
        {
            public string key, family, name, detail;
            public FactoryV2Option(string id, string group, string title, string description)
            { key = id; family = group; name = title; detail = description; }
        }

        private static readonly FactoryV2Producer[] FactoryV2Producers = {
            new FactoryV2Producer("automation", "Automatización", "Créditos", 2, 100),
            new FactoryV2Producer("generator", "Generador", "Energía", 1.5, 90),
            new FactoryV2Producer("refinery", "Refinería", "Acero", 1, 110),
            new FactoryV2Producer("lab", "Laboratorio", "Intel", .3, 130),
        };
        private static readonly FactoryV2Option[] FactoryV2ResearchOptions = {
            new FactoryV2Option("rockets:breaker", "COHETES", "Rompeescudos", "90 al núcleo; consume 2,5 veces más capacidad de escudo."),
            new FactoryV2Option("rockets:emp", "COHETES", "Pulso EMP", "35 de daño; retrasa escudos en activación y los iniciados durante 6 s."),
            new FactoryV2Option("rockets:vector", "COHETES", "Doble vector", "Dos impactos de 125 separados por 2 s."),
            new FactoryV2Option("rockets:exposed", "COHETES", "Carga de núcleo", "140 de daño; 252 si llega sin escudos activos."),
            new FactoryV2Option("rockets:economical", "COHETES", "Cohete económico", "70 de daño por 60 Créditos; recarga 19 s."),
            new FactoryV2Option("rockets:node", "COHETES", "Disruptor de nodo", "40 de daño; retrasa guardianes en tránsito y los enviados durante 8 s."),
            new FactoryV2Option("shields:antiburst", "DEFENSAS", "Antirráfaga", "180 de capacidad; reduce 45% los impactos de cohetes múltiples."),
            new FactoryV2Option("shields:antipiercing", "DEFENSAS", "Antiperforante", "170 de capacidad; devuelve al escudo 70% del daño perforante."),
            new FactoryV2Option("shields:regenerative", "DEFENSAS", "Reactor regenerativo", "170 de capacidad; regenera 8/s tras 3 s sin impactos."),
            new FactoryV2Option("shields:reflection", "DEFENSAS", "Escudo reflejo", "Devuelve 20% del daño absorbido; consume capacidad 20% más rápido."),
            new FactoryV2Option("shields:reinforced", "DEFENSAS", "Cobertura reforzada", "210 de capacidad; reduce cada impacto 50%, dura solo 8 s."),
            new FactoryV2Option("shields:emergency", "DEFENSAS", "Escudo de emergencia", "Se activa automáticamente al llegar a 35% de vida o menos."),
            new FactoryV2Option("sabotage:cooldown", "SABOTAJES", "Interferencia de recargas", "Las recargas de una familia elegida avanzan a la mitad durante 10 s."),
            new FactoryV2Option("sabotage:launch", "SABOTAJES", "Retraso de lanzamiento", "Los cohetes lanzados durante 12 s tardan 3 s más."),
            new FactoryV2Option("sabotage:ambush", "SABOTAJES", "Emboscada al nodo", "Retrasa 6 s el próximo envío de guardianes."),
            new FactoryV2Option("sabotage:friction", "SABOTAJES", "Fricción económica", "La próxima mejora económica rival cuesta 35% más."),
            new FactoryV2Option("sabotage:supplies", "SABOTAJES", "Corte de suministros", "La próxima acción de una familia cuesta 40% más, por hasta 15 s."),
            new FactoryV2Option("sabotage:reconfigure", "SABOTAJES", "Interferencia de reconfiguración", "Añade 4 s a un cambio rival en curso."),
            new FactoryV2Option("sabotage:precision", "SABOTAJES", "Sabotaje de precisión", "Reduce 35% la potencia de un cohete o defensa rival durante 12 s."),
            new FactoryV2Option("bonuses:sustained", "BONUS", "Rendimiento sostenido", "+15% ingresos toda la partida."),
            new FactoryV2Option("bonuses:efficiency", "BONUS", "Eficiencia", "Las mejoras económicas cuestan 12% menos."),
            new FactoryV2Option("bonuses:compound", "BONUS", "Compuesto", "+0,12% ingresos por segundo sin daño al núcleo, hasta +35%."),
            new FactoryV2Option("bonuses:treasury", "BONUS", "Tesorería", "+80 Créditos iniciales."),
            new FactoryV2Option("bonuses:logistics", "BONUS", "Logística", "Guardianes cuestan 25% menos."),
            new FactoryV2Option("bonuses:emergency", "BONUS", "Reserva de emergencia", "Una vez, recibís 100 Créditos al quedar con 35 o menos."),
            new FactoryV2Option("bonuses:rocketsSlot", "BONUS", "Reserva extra de cohetes", "Elegís una quinta variante. Seguís con 2 activos y sumás una reserva."),
            new FactoryV2Option("bonuses:shieldsSlot", "BONUS", "Reserva extra de escudos", "Elegís una quinta variante. Seguís con 2 activos y sumás una reserva."),
            new FactoryV2Option("bonuses:sabotageSlot", "BONUS", "Reserva extra de sabotaje", "Elegís una cuarta variante. Seguís con 1 activo y sumás una reserva."),
        };

        private static readonly string[] FactoryV2Tabs = { "resumen", "project", "contracts", "missions", "prestige" };
        private static readonly string[] FactoryV2TabLabels = { "PRESTIGIO", "PROYECTOS", "CONTRATOS", "MISIONES", "INVESTIGACIÓN PVP" };
        private static readonly string[] FactoryV2TabHints = { "Progreso del ciclo", "Bonus de este ciclo", "Pedidos y recompensas", "Objetivos del ciclo", "Colección permanente" };
        private static readonly string[] FactoryV2ProjectIds = { "reactor", "drones", "archive" };
        private static readonly string[] FactoryV2ContractIds = { "urgent", "regular", "scientific" };
        private static readonly string[] FactoryV2ProjectNames = { "Reactor industrial", "Red de drones", "Centro científico" };
        private static readonly string[] FactoryV2ProjectDetails = { "+50% producción de Energía durante este ciclo.", "+35% producción de Créditos durante este ciclo.", "+50% producción de Intel durante este ciclo." };
        private static readonly string[] FactoryV2ContractNames = { "Entrega urgente", "Pedido industrial", "Pedido científico" };
        private static readonly string[] FactoryV2ContractDetails = { "45 s · 60 Acero + 40 Energía → 110 Créditos + 8 Intel.", "90 s · 90 Acero + 70 Energía → 190 Créditos + 16 Intel.", "150 s · 100 Acero + 100 Energía + 80 Créditos → 160 Créditos + 50 Intel." };

        private FactoryV2Save factoryV2Save;
        private string factoryV2Tab = "resumen";
        private string factoryV2SelectedResearch;
        private bool factoryV2NeedsReset;
        private bool factoryV2Fresh;
        private float factoryV2SaveTimer;
        private float factoryV2HudTimer;
        private string factoryV2Notice;
        private GridLayoutGroup factoryV2Navigation;
        private GameObject factoryV2NavigationCard;
        private GameObject factoryV2ProducerPopup;
        private string factoryV2PopupProducer;
        private Text factoryV2PopupLevel, factoryV2PopupProduction, factoryV2PopupCost, factoryV2PopupAction;
        private Button factoryV2PopupUpgrade;

        private static long FactoryV2Now() { return DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(); }

        private static FactoryV2Save NewFactoryV2(long now)
        {
            return new FactoryV2Save { schemaVersion = FactoryV2Schema, savedAt = now,
                permanent = new FactoryV2Permanent { prestigeCount = 0, research = new string[0] },
                cycle = new FactoryV2Cycle { credits = 350, energy = 100, steel = 100, intel = 20 } };
        }

        private void LoadFactoryV2()
        {
            if (factoryV2Save != null || factoryV2NeedsReset || factoryV2Fresh) return;
            if (!PlayerPrefs.HasKey(FactoryV2SaveKey))
            {
                factoryV2Save = NewFactoryV2(FactoryV2Now()); factoryV2Fresh = true; SaveFactoryV2(true); return;
            }
            try
            {
                var parsed = JsonUtility.FromJson<FactoryV2Save>(PlayerPrefs.GetString(FactoryV2SaveKey));
                if (!ValidFactoryV2(parsed)) { factoryV2NeedsReset = true; return; }
                factoryV2Save = parsed;
                AdvanceFactoryV2(FactoryV2Now());
            }
            catch { factoryV2NeedsReset = true; }
        }

        private static bool ValidFactoryV2(FactoryV2Save state)
        {
            if (state == null || state.schemaVersion != FactoryV2Schema || state.savedAt < 0 || state.permanent == null || state.cycle == null || state.permanent.prestigeCount < 0 || state.permanent.research == null) return false;
            if (!FactoryV2Finite(state.cycle.credits) || !FactoryV2Finite(state.cycle.energy) || !FactoryV2Finite(state.cycle.steel) || !FactoryV2Finite(state.cycle.intel)) return false;
            if (state.cycle.credits < 0 || state.cycle.energy < 0 || state.cycle.steel < 0 || state.cycle.intel < 0) return false;
            if (state.cycle.automation < 1 || state.cycle.generator < 1 || state.cycle.refinery < 1 || state.cycle.lab < 1 || state.cycle.automation > FactoryV2MaxLevel || state.cycle.generator > FactoryV2MaxLevel || state.cycle.refinery > FactoryV2MaxLevel || state.cycle.lab > FactoryV2MaxLevel) return false;
            var uniqueResearch = new HashSet<string>();
            for (int i = 0; i < state.permanent.research.Length; i++)
            {
                if (FindFactoryV2Research(state.permanent.research[i]) < 0 || !uniqueResearch.Add(state.permanent.research[i])) return false;
            }
            if (state.cycle.projectId != null && Array.IndexOf(FactoryV2ProjectIds, state.cycle.projectId) < 0) return false;
            if (state.cycle.contractId != null && (Array.IndexOf(FactoryV2ContractIds, state.cycle.contractId) < 0 || state.cycle.contractEndsAt < 0)) return false;
            return FactoryV2Finite(state.cycle.deliveredCredits) && FactoryV2Finite(state.cycle.deliveredEnergy) && FactoryV2Finite(state.cycle.deliveredSteel) && FactoryV2Finite(state.cycle.deliveredIntel)
                && state.cycle.deliveredCredits >= 0 && state.cycle.deliveredEnergy >= 0 && state.cycle.deliveredSteel >= 0 && state.cycle.deliveredIntel >= 0;
        }

        private static bool FactoryV2Finite(double value) { return !double.IsNaN(value) && !double.IsInfinity(value) && value <= 1e15; }

        private void SaveFactoryV2(bool force)
        {
            if (factoryV2Save == null || factoryV2NeedsReset) return;
            if (!force && factoryV2SaveTimer < 5f) return;
            factoryV2Save.savedAt = FactoryV2Now();
            PlayerPrefs.SetString(FactoryV2SaveKey, JsonUtility.ToJson(factoryV2Save)); PlayerPrefs.Save();
            factoryV2SaveTimer = 0;
        }

        private void TickFactoryV2(float delta)
        {
            if (factoryV2Save == null || factoryV2NeedsReset) return;
            factoryV2SaveTimer += delta;
            AdvanceFactoryV2(FactoryV2Now());
            if (factoryV2SaveTimer >= 5f) SaveFactoryV2(false);
            if (currentSection == HubSection.MegaFactory || currentSection == HubSection.MegaFactoryV2)
            {
                factoryV2HudTimer += delta;
                if (factoryV2HudTimer >= .5f) { factoryV2HudTimer = 0; UpdateResourceHud(); RefreshFactoryV2ProducerPopup(); }
            }
        }

        private void AdvanceFactoryV2(long now)
        {
            if (factoryV2Save == null || now < factoryV2Save.savedAt) return;
            long elapsed = Math.Min(now - factoryV2Save.savedAt, FactoryV2OfflineLimitMs);
            var rates = FactoryV2Rates(factoryV2Save.cycle);
            AddFactoryV2Resource("credits", rates[0] * elapsed / 1000d);
            AddFactoryV2Resource("energy", rates[1] * elapsed / 1000d);
            AddFactoryV2Resource("steel", rates[2] * elapsed / 1000d);
            AddFactoryV2Resource("intel", rates[3] * elapsed / 1000d);
            factoryV2Save.savedAt = now;
            if (!string.IsNullOrEmpty(factoryV2Save.cycle.contractId) && now >= factoryV2Save.cycle.contractEndsAt)
            {
                string contract = factoryV2Save.cycle.contractId;
                if (contract == "urgent") { AddFactoryV2Resource("credits", 110); AddFactoryV2Resource("intel", 8); }
                else if (contract == "regular") { AddFactoryV2Resource("credits", 190); AddFactoryV2Resource("intel", 16); }
                else { AddFactoryV2Resource("credits", 160); AddFactoryV2Resource("intel", 50); }
                factoryV2Save.cycle.contractId = null; factoryV2Save.cycle.contractEndsAt = 0; factoryV2Save.cycle.contractsCompleted++;
                factoryV2Notice = "Contrato completado: recibiste la recompensa.";
            }
        }

        private void AddFactoryV2Resource(string key, double value)
        {
            if (value <= 0) return;
            if (key == "credits") factoryV2Save.cycle.credits = Math.Min(1e15, factoryV2Save.cycle.credits + value);
            else if (key == "energy") factoryV2Save.cycle.energy = Math.Min(1e15, factoryV2Save.cycle.energy + value);
            else if (key == "steel") factoryV2Save.cycle.steel = Math.Min(1e15, factoryV2Save.cycle.steel + value);
            else factoryV2Save.cycle.intel = Math.Min(1e15, factoryV2Save.cycle.intel + value);
        }

        private static double[] FactoryV2Rates(FactoryV2Cycle cycle)
        {
            var result = new[] { 2d * cycle.automation, 1.5d * cycle.generator, 1d * cycle.refinery, .3d * cycle.lab };
            if (cycle.projectCompleted)
            {
                if (cycle.projectId == "reactor") result[1] *= 1.5;
                else if (cycle.projectId == "drones") result[0] *= 1.35;
                else if (cycle.projectId == "archive") result[3] *= 1.5;
            }
            return result;
        }

        private void BuildFactoryV2Screen()
        {
            LoadFactoryV2();
            UpdateResourceHud();
            factoryV2Navigation = null;
            factoryV2NavigationCard = null;
            factoryArtLayer.SetActive(true);
            int currentTab = Array.IndexOf(FactoryV2Tabs, factoryV2Tab);
            if (currentTab < 0) { currentTab = 0; factoryV2Tab = "resumen"; }
            FactoryV2AddCard("MEGAFÁBRICA · " + FactoryV2TabLabels[currentTab], factoryV2NeedsReset ? "El guardado local no se pudo validar." : FactoryV2TabHints[currentTab], 146, body => {
                if (factoryV2NeedsReset)
                {
                    FactoryV2Label(body, "Los datos se conservaron sin modificarlos. Podés volver al menú o borrar únicamente este guardado local para empezar de nuevo.", 66);
                    FactoryV2Button(body, "REINICIAR GUARDADO LOCAL V2", gold, ResetFactoryV2Save);
                }
                else FactoryV2Button(body, "ACTUALIZAR RECURSOS Y ACCIONES", cyan, RefreshFactoryV2View);
                if (factoryV2Tab != "resumen") FactoryV2Button(body, "ATRÁS · MENÚ DE MEGAFÁBRICA", cyan, () => OpenFactoryV2Tab("resumen"));
                FactoryV2Button(body, "VOLVER A LA ISLA", cyan, () => ShowSection(HubSection.MegaFactory));
            });
            if (factoryV2NeedsReset) return;
            if (factoryV2Tab == "resumen") BuildFactoryV2Navigation();
            switch (factoryV2Tab)
            {
                case "project": BuildFactoryV2Project(); break;
                case "contracts": BuildFactoryV2Contracts(); break;
                case "missions": BuildFactoryV2Missions(); break;
                case "prestige": BuildFactoryV2Prestige(); break;
                default: BuildFactoryV2Overview(); break;
            }
        }

        private void BuildFactoryV2Navigation()
        {
            factoryV2NavigationCard = FactoryV2Card("ADMINISTRAR MEGAFÁBRICA", "Elegí una sección para ver sus acciones.", 300);
            Transform body = FactoryV2Body(factoryV2NavigationCard.transform);
            var grid = new GameObject("Factory sections", typeof(RectTransform), typeof(GridLayoutGroup), typeof(LayoutElement));
            grid.transform.SetParent(body, false);
            factoryV2Navigation = grid.GetComponent<GridLayoutGroup>();
            factoryV2Navigation.spacing = new Vector2(10, 10);
            factoryV2Navigation.constraint = GridLayoutGroup.Constraint.FixedColumnCount;
            for (int i = 0; i < FactoryV2Tabs.Length; i++)
            {
                string destination = FactoryV2Tabs[i];
                Color accent = i == 5 ? gold : cyan;
                var tile = RoundedHudPanel("Factory section · " + destination, grid.transform, new Color32(9, 60, 88, 206), accent);
                var title = PlacedLabel(tile.transform, FactoryV2TabLabels[i], 13, white, FontStyle.Bold, TextAnchor.MiddleLeft,
                    new Vector2(0, .5f), Vector2.one, new Vector2(12, 0), new Vector2(-10, -7));
                title.resizeTextForBestFit = true; title.resizeTextMinSize = 11; title.resizeTextMaxSize = 13;
                PlacedLabel(tile.transform, FactoryV2TabHints[i], 10, muted, FontStyle.Normal, TextAnchor.UpperLeft,
                    Vector2.zero, new Vector2(1, .5f), new Vector2(12, 5), new Vector2(-10, -1));
                var button = tile.AddComponent<Button>(); ButtonFeedback(button);
                button.onClick.AddListener(() => OpenFactoryV2Tab(destination));
            }
            UpdateFactoryV2NavigationLayout();
        }

        private void UpdateFactoryV2NavigationLayout()
        {
            if (currentSection != HubSection.MegaFactoryV2 || factoryV2Navigation == null || factoryV2NavigationCard == null) return;
            float width = ((RectTransform)factoryV2Navigation.transform.parent).rect.width;
            if (width <= 0) width = content.rect.width - content.GetComponent<VerticalLayoutGroup>().padding.horizontal - 24;
            width = Mathf.Max(1, width);
            int columns = width < 280 ? 1 : 2;
            factoryV2Navigation.constraintCount = columns;
            factoryV2Navigation.cellSize = new Vector2((width - (columns - 1) * 10) / columns, 76);
            int rows = (FactoryV2Tabs.Length + columns - 1) / columns;
            float height = rows * 76 + (rows - 1) * 10;
            LayoutElement(factoryV2Navigation.gameObject).preferredHeight = height;
            LayoutElement(factoryV2NavigationCard).preferredHeight = 90 + height;
        }

        private GameObject FactoryV2Card(string title, string subtitle, float height)
        {
            var card = RoundedHudPanel("Factory glass card · " + title, content, new Color32(7, 39, 67, 226), cyan);
            LayoutElement(card).preferredHeight = height;
            var heading = PlacedLabel(card.transform, title, 14, white, FontStyle.Bold, TextAnchor.MiddleLeft,
                Vector2.up, Vector2.one, new Vector2(14, -31), new Vector2(-14, -7));
            heading.resizeTextForBestFit = true; heading.resizeTextMinSize = 11; heading.resizeTextMaxSize = 14;
            PlacedLabel(card.transform, subtitle, 11, muted, FontStyle.Normal, TextAnchor.UpperLeft,
                Vector2.up, Vector2.one, new Vector2(14, -70), new Vector2(-14, -33));
            return card;
        }

        private Transform FactoryV2Body(Transform card)
        {
            Transform body = CardBody(card);
            body.GetComponent<RectTransform>().offsetMax = new Vector2(-12, -74);
            return body;
        }

        private static void SizeFactoryV2Card(GameObject card, Transform body)
        {
            var layout = body.GetComponent<VerticalLayoutGroup>();
            float bodyHeight = layout != null ? layout.padding.top + layout.padding.bottom : 0;
            for (int i = 0; i < body.childCount; i++)
            {
                var element = body.GetChild(i).GetComponent<LayoutElement>();
                if (element != null && element.enabled && element.preferredHeight > 0) bodyHeight += element.preferredHeight;
            }
            if (layout != null && body.childCount > 1) bodyHeight += layout.spacing * (body.childCount - 1);
            var cardLayout = LayoutElement(card);
            cardLayout.preferredHeight = Mathf.Max(cardLayout.preferredHeight, bodyHeight + 92);
            LayoutElement(card).preferredHeight += 18;
        }

        private Button FactoryV2Button(Transform parent, string text, Color accent, UnityAction callback)
        {
            var go = RoundedHudPanel("Factory action · " + text, parent, new Color(accent.r, accent.g, accent.b, .18f), accent);
            LayoutElement(go).preferredHeight = 46;
            var label = PlacedLabel(go.transform, text, 11, white, FontStyle.Bold, TextAnchor.MiddleCenter,
                Vector2.zero, Vector2.one, new Vector2(10, 4), new Vector2(-10, -4));
            label.resizeTextForBestFit = true; label.resizeTextMinSize = 9; label.resizeTextMaxSize = 11;
            var button = go.AddComponent<Button>(); ButtonFeedback(button); button.onClick.AddListener(callback);
            return button;
        }

        private void FactoryV2AddCard(string title, string subtitle, float height, Action<Transform> render)
        {
            var card = FactoryV2Card(title, subtitle, height); Transform body = FactoryV2Body(card.transform); render(body); SizeFactoryV2Card(card, body);
        }

        private void FactoryV2Label(Transform body, string value, float height = 34)
        {
            FlowLabel(body, value, 11, white, FontStyle.Normal, height);
        }

        private void BuildFactoryV2Overview()
        {
            var c = factoryV2Save.cycle;
            FactoryV2AddCard("PROGRESO DE PRESTIGIO", "Prestigios completados: " + factoryV2Save.permanent.prestigeCount, 205, body => {
                FactoryV2Label(body, "Mejoras " + c.upgrades + "/2 · Contratos " + c.contractsCompleted + "/2 · Proyecto " + (c.projectCompleted ? "terminado" : c.projectId == null ? "sin elegir" : "en curso"), 48);
                FactoryV2Label(body, "Investigaciones permanentes: " + factoryV2Save.permanent.research.Length + "/" + FactoryV2ResearchOptions.Length, 34);
                FactoryV2Button(body, FactoryV2CanPrestige() ? "ELEGIR INVESTIGACIÓN Y PRESTIGIAR" : "VER MISIONES DEL CICLO", gold, () => OpenFactoryV2Tab(FactoryV2CanPrestige() ? "prestige" : "missions"));
            });
            FactoryV2AddCard("OBJETIVO DEL JUEGO", "Producí, mejorá, cumplí encargos y completá un proyecto.", 151, body => {
                FactoryV2Label(body, "Al completar las 3 misiones podés prestigiar. Elegís una investigación PvP que no tengas y queda guardada para siempre. El prestigio reinicia este ciclo, no tu colección.", 84);
                FactoryV2Button(body, "VER MISIONES", gold, () => OpenFactoryV2Tab("missions"));
            });
            if (!string.IsNullOrEmpty(factoryV2Notice)) FactoryV2AddCard("AVISO", factoryV2Notice, 112, body => FactoryV2Button(body, "ENTENDIDO", cyan, () => { factoryV2Notice = null; ShowSection(HubSection.MegaFactoryV2); }));
        }

        private void OpenFactoryV2ProducerPopup(string id)
        {
            int index = Array.FindIndex(FactoryV2Producers, entry => entry.id == id);
            if (index < 0) return;
            LoadFactoryV2();
            if (factoryV2NeedsReset || factoryV2Save == null) { OpenFactoryV2Tab("resumen"); return; }
            if (currentSection != HubSection.MegaFactory && currentSection != HubSection.MegaFactoryV2) ShowSection(HubSection.MegaFactory);
            CloseFactoryV2ProducerPopup();
            AdvanceFactoryV2(FactoryV2Now());
            factoryV2PopupProducer = id;
            factoryV2ProducerPopup = Panel("Factory building popup", nav.parent, new Color32(2, 11, 23, 210));
            Anchor(factoryV2ProducerPopup, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            factoryV2ProducerPopup.transform.SetAsLastSibling();
            string[] names = { "MINA DE ORO", "PLANTA SOLAR", "FÁBRICA DE ACERO", "LABORATORIO" };
            var card = FactoryV2Card(names[index], FactoryV2Producers[index].resource + " · Mejorá esta fábrica", 340);
            card.transform.SetParent(factoryV2ProducerPopup.transform, false);
            Transform body = FactoryV2Body(card.transform);
            factoryV2PopupLevel = FlowLabel(body, "", 15, cyan, FontStyle.Bold, 32);
            factoryV2PopupProduction = FlowLabel(body, "", 12, white, FontStyle.Normal, 60);
            factoryV2PopupCost = FlowLabel(body, "", 12, white, FontStyle.Normal, 48);
            factoryV2PopupUpgrade = FactoryV2Button(body, "MEJORAR", gold, () => UpgradeFactoryV2(id));
            factoryV2PopupAction = factoryV2PopupUpgrade.GetComponentInChildren<Text>();
            FactoryV2Button(body, "CERRAR · VOLVER A LA FÁBRICA", cyan, CloseFactoryV2ProducerPopup);
            SizeFactoryV2Card(card, body);
            float height = LayoutElement(card).preferredHeight;
            Anchor(card, new Vector2(.04f, .5f), new Vector2(.96f, .5f), new Vector2(0, -height / 2), new Vector2(0, height / 2));
            RefreshFactoryV2ProducerPopup();
        }

        private void RefreshFactoryV2ProducerPopup()
        {
            if (factoryV2ProducerPopup == null || factoryV2Save == null) return;
            int index = Array.FindIndex(FactoryV2Producers, entry => entry.id == factoryV2PopupProducer);
            if (index < 0) return;
            var building = FactoryV2Producers[index];
            int level = FactoryV2Level(building.id);
            double production = FactoryV2Rates(factoryV2Save.cycle)[index];
            double cost = Math.Ceiling(building.baseCost * Math.Pow(1.4, level - 1));
            bool maxLevel = level >= FactoryV2MaxLevel;
            factoryV2PopupLevel.text = "NIVEL " + level + " / " + FactoryV2MaxLevel;
            factoryV2PopupProduction.text = "Producción: " + V2Rate(production) + " " + building.resource + "/s\n" + (maxLevel ? "Producción máxima alcanzada." : "Siguiente nivel: " + V2Rate(production + production / level) + " " + building.resource + "/s");
            factoryV2PopupCost.text = (maxLevel ? "Sin más mejoras disponibles." : "Costo: " + V2Amount(cost) + " Créditos") + "\nSaldo: " + V2Amount(factoryV2Save.cycle.credits) + " Créditos";
            factoryV2PopupAction.text = maxLevel ? "NIVEL MÁXIMO" : factoryV2Save.cycle.credits < cost ? "CRÉDITOS INSUFICIENTES" : "MEJORAR A NIVEL " + (level + 1);
            factoryV2PopupUpgrade.interactable = !maxLevel && factoryV2Save.cycle.credits >= cost;
        }

        private void CloseFactoryV2ProducerPopup()
        {
            if (factoryV2ProducerPopup != null) { factoryV2ProducerPopup.SetActive(false); Destroy(factoryV2ProducerPopup); }
            factoryV2ProducerPopup = null;
            factoryV2PopupProducer = null;
        }

        private void BuildFactoryV2Project()
        {
            var c = factoryV2Save.cycle;
            if (c.projectId == null)
            {
                FactoryV2AddCard("PROYECTO DE CICLO", "Elegí un solo proyecto. La elección queda fija hasta prestigiar.", 135, body => FactoryV2Label(body, "Entregá materiales de a poco. Al completarlo recibís un aumento de producción hasta el próximo prestigio.", 66));
                for (int i = 0; i < FactoryV2ProjectIds.Length; i++)
                {
                    int project = i;
                    FactoryV2AddCard(FactoryV2ProjectNames[i].ToUpperInvariant(), FactoryV2ProjectDetails[i], 132, body => {
                        FactoryV2Label(body, FactoryV2ProjectCostText(project), 44);
                        FactoryV2Button(body, "ELEGIR PROYECTO", gold, () => { c.projectId = FactoryV2ProjectIds[project]; SaveFactoryV2(true); ShowSection(HubSection.MegaFactoryV2); });
                    });
                }
            }
            else
            {
                int index = Array.IndexOf(FactoryV2ProjectIds, c.projectId);
                FactoryV2AddCard(FactoryV2ProjectNames[index].ToUpperInvariant(), c.projectCompleted ? "COMPLETADO · " + FactoryV2ProjectDetails[index] : FactoryV2ProjectDetails[index], 152, body => {
                    FactoryV2Label(body, FactoryV2ProjectProgressText(index), 54);
                    if (!c.projectCompleted)
                    {
                        FactoryV2Button(body, "ENTREGAR MATERIALES DISPONIBLES", cyan, DeliverFactoryV2Project).interactable = FactoryV2HasDeliverable(index);
                    }
                });
            }
        }

        private void BuildFactoryV2Contracts()
        {
            var active = factoryV2Save.cycle.contractId;
            FactoryV2AddCard("CONTRATOS", active == null ? "Hay un espacio para un pedido a la vez." : "En curso: " + FactoryV2ContractNames[Array.IndexOf(FactoryV2ContractIds, active)], 141, body => {
                FactoryV2Label(body, active == null ? "Elegí el pedido según los recursos y el tiempo que quieras esperar." : "La recompensa se entrega automáticamente cuando vence, incluso si la aplicación está cerrada.", 55);
                if (active != null) FactoryV2Button(body, "ACTUALIZAR ESTADO", cyan, RefreshFactoryV2View);
            });
            if (active != null) return;
            for (int i = 0; i < FactoryV2ContractIds.Length; i++)
            {
                int contract = i;
                FactoryV2AddCard(FactoryV2ContractNames[i].ToUpperInvariant(), FactoryV2ContractDetails[i], 144, body => {
                    FactoryV2Button(body, "INICIAR CONTRATO", gold, () => StartFactoryV2Contract(contract)).interactable = FactoryV2CanPayContract(contract);
                });
            }
        }

        private void BuildFactoryV2Missions()
        {
            var c = factoryV2Save.cycle;
            FactoryV2AddCard("MISIONES DE PRESTIGIO", "Completá las tres para elegir una investigación permanente.", 148, body => FactoryV2Label(body, "Prestigiar reinicia recursos, niveles, contrato y proyecto. Conservás el contador y todas las investigaciones.", 73));
            FactoryV2AddCard("MEJORAR EDIFICIOS", "Progreso " + Math.Min(2, c.upgrades) + "/2", 97, body => FactoryV2Label(body, "Subí dos niveles de cualquier productor durante este ciclo."));
            FactoryV2AddCard("COMPLETAR CONTRATOS", "Progreso " + Math.Min(2, c.contractsCompleted) + "/2", 97, body => FactoryV2Label(body, "Terminá dos pedidos. La recompensa llega al vencer el temporizador."));
            FactoryV2AddCard("TERMINAR EL PROYECTO", "Progreso " + (c.projectCompleted ? "1/1" : "0/1"), 112, body => FactoryV2Label(body, "Entregá todos los materiales del proyecto elegido."));
            if (FactoryV2CanPrestige()) FactoryV2AddCard("LISTO PARA PRESTIGIAR", "Elegí una investigación nueva que conservarás.", 150,
                body => FactoryV2Button(body, "ELEGIR INVESTIGACIÓN", gold, () => OpenFactoryV2Tab("prestige")));
        }

        private void BuildFactoryV2Prestige()
        {
            var missing = FactoryV2CanPrestige() ? null : "Primero completá las tres misiones del ciclo.";
            FactoryV2AddCard("PRESTIGIO E INVESTIGACIONES", "La investigación desbloquea una opción de Arena; no aumenta sus estadísticas.", 157, body => {
                FactoryV2Label(body, "Las investigaciones se guardan permanentemente en este dispositivo y no se repiten. Hoy la práctica de Arena V2 de Unity aún no consume este catálogo automáticamente.", 89);
                if (missing != null) FactoryV2Label(body, missing, 34);
                else if (!string.IsNullOrEmpty(factoryV2SelectedResearch)) FactoryV2Label(body, "Elegiste: " + FactoryV2ResearchOptions[FindFactoryV2Research(factoryV2SelectedResearch)].name, 34);
            });
            if (FactoryV2CanPrestige() && !string.IsNullOrEmpty(factoryV2SelectedResearch))
                FactoryV2AddCard("CONFIRMAR PRESTIGIO", "Se reinicia el ciclo actual; se conservan investigación y prestigios.", 105,
                    body => FactoryV2Button(body, "PRESTIGIAR Y COMENZAR DE NUEVO", gold, CompleteFactoryV2Prestige));
            for (int i = 0; i < FactoryV2ResearchOptions.Length; i++)
            {
                var option = FactoryV2ResearchOptions[i];
                if (HasFactoryV2Research(option.key)) continue;
                FactoryV2AddCard(option.family + " · " + option.name, option.detail, 128, body => {
                    string selected = option.key;
                    FactoryV2Button(body, factoryV2SelectedResearch == selected ? "SELECCIONADA" : "ELEGIR INVESTIGACIÓN", factoryV2SelectedResearch == selected ? gold : cyan,
                        () => { factoryV2SelectedResearch = selected; ShowSection(HubSection.MegaFactoryV2); }).interactable = FactoryV2CanPrestige();
                });
            }
            FactoryV2AddCard("COLECCIÓN PERMANENTE", "Desbloqueos: " + factoryV2Save.permanent.research.Length + "/" + FactoryV2ResearchOptions.Length, 100, body => {
                if (factoryV2Save.permanent.research.Length == 0) FactoryV2Label(body, "Todavía no tenés investigaciones. Completá las misiones de un ciclo y elegí una.");
                else foreach (string id in factoryV2Save.permanent.research) { int idx = FindFactoryV2Research(id); if (idx >= 0) FactoryV2Label(body, FactoryV2ResearchOptions[idx].family + " · " + FactoryV2ResearchOptions[idx].name, 28); }
            });
        }

        private void OpenFactoryV2Tab(string tab)
        {
            if (Array.IndexOf(FactoryV2Tabs, tab) < 0) tab = "resumen";
            factoryV2Tab = tab;
            if (currentSection != HubSection.MegaFactoryV2) ShowSection(HubSection.MegaFactoryV2);
            else ShowSection(HubSection.MegaFactoryV2);
        }

        private void RefreshFactoryV2View()
        {
            if (currentSection != HubSection.MegaFactoryV2 || factoryV2NeedsReset || factoryV2Save == null) return;
            float scrollPosition = content.anchoredPosition.y;
            AdvanceFactoryV2(FactoryV2Now());
            SaveFactoryV2(true);
            ShowSection(HubSection.MegaFactoryV2);
            Canvas.ForceUpdateCanvases();
            float maximum = Mathf.Max(0, content.rect.height - screenScroll.viewport.rect.height);
            content.anchoredPosition = new Vector2(0, Mathf.Clamp(scrollPosition, 0, maximum));
        }

        private void ResetFactoryV2Save()
        {
            PlayerPrefs.DeleteKey(FactoryV2SaveKey);
            factoryV2NeedsReset = false; factoryV2Fresh = true; factoryV2Save = NewFactoryV2(FactoryV2Now()); factoryV2Notice = null;
            factoryV2SelectedResearch = null; factoryV2Tab = "resumen";
            SaveFactoryV2(true); ShowSection(HubSection.MegaFactoryV2);
        }

        private int FactoryV2Level(string id)
        {
            var c = factoryV2Save.cycle;
            if (id == "automation") return c.automation;
            if (id == "generator") return c.generator;
            if (id == "refinery") return c.refinery;
            return c.lab;
        }

        private void UpgradeFactoryV2(string id)
        {
            var i = Array.FindIndex(FactoryV2Producers, entry => entry.id == id); if (i < 0) return;
            var building = FactoryV2Producers[i]; int level = FactoryV2Level(id); double cost = Math.Ceiling(building.baseCost * Math.Pow(1.4, level - 1));
            if (level >= FactoryV2MaxLevel || factoryV2Save.cycle.credits < cost) return;
            factoryV2Save.cycle.credits -= cost;
            if (id == "automation") factoryV2Save.cycle.automation++;
            else if (id == "generator") factoryV2Save.cycle.generator++;
            else if (id == "refinery") factoryV2Save.cycle.refinery++;
            else factoryV2Save.cycle.lab++;
            factoryV2Save.cycle.upgrades++; SaveFactoryV2(true);
            ShowSection(currentSection);
            OpenFactoryV2ProducerPopup(id);
        }

        private static string FactoryV2ProjectCostText(int index)
        {
            if (index == 0) return "Costo: 450 Créditos · 350 Energía · 450 Acero · 60 Intel.";
            if (index == 1) return "Costo: 600 Créditos · 300 Energía · 350 Acero · 90 Intel.";
            return "Costo: 450 Créditos · 250 Energía · 300 Acero · 150 Intel.";
        }

        private bool FactoryV2HasDeliverable(int index)
        {
            var c = factoryV2Save.cycle;
            if (c.projectId == null || c.projectCompleted) return false;
            double[] cost = index == 0 ? new[] { 450d, 350d, 450d, 60d } : index == 1 ? new[] { 600d, 300d, 350d, 90d } : new[] { 450d, 250d, 300d, 150d };
            double[] available = { c.credits, c.energy, c.steel, c.intel };
            double[] delivered = { c.deliveredCredits, c.deliveredEnergy, c.deliveredSteel, c.deliveredIntel };
            for (int i = 0; i < cost.Length; i++) if (available[i] > 0 && delivered[i] < cost[i]) return true;
            return false;
        }

        private string FactoryV2ProjectProgressText(int index)
        {
            var c = factoryV2Save.cycle;
            string costs = index == 0 ? "450 CR · 350 EN · 450 AC · 60 INT" : index == 1 ? "600 CR · 300 EN · 350 AC · 90 INT" : "450 CR · 250 EN · 300 AC · 150 INT";
            return "Costo total: " + costs + "\nEntregado: " + V2Amount(c.deliveredCredits) + " CR · " + V2Amount(c.deliveredEnergy) + " EN · " + V2Amount(c.deliveredSteel) + " AC · " + V2Amount(c.deliveredIntel) + " INT";
        }

        private void DeliverFactoryV2Project()
        {
            var c = factoryV2Save.cycle; int index = Array.IndexOf(FactoryV2ProjectIds, c.projectId); if (index < 0 || c.projectCompleted) return;
            double[] cost = index == 0 ? new[] { 450d, 350d, 450d, 60d } : index == 1 ? new[] { 600d, 300d, 350d, 90d } : new[] { 450d, 250d, 300d, 150d };
            double[] current = { c.credits, c.energy, c.steel, c.intel }; double[] delivered = { c.deliveredCredits, c.deliveredEnergy, c.deliveredSteel, c.deliveredIntel };
            bool any = false;
            for (int i = 0; i < current.Length; i++) { double amount = Math.Min(current[i], Math.Max(0, cost[i] - delivered[i])); current[i] -= amount; delivered[i] += amount; if (amount > 0) any = true; }
            if (!any) return;
            c.credits = current[0]; c.energy = current[1]; c.steel = current[2]; c.intel = current[3]; c.deliveredCredits = delivered[0]; c.deliveredEnergy = delivered[1]; c.deliveredSteel = delivered[2]; c.deliveredIntel = delivered[3];
            c.projectCompleted = delivered[0] >= cost[0] && delivered[1] >= cost[1] && delivered[2] >= cost[2] && delivered[3] >= cost[3];
            SaveFactoryV2(true); ShowSection(HubSection.MegaFactoryV2);
        }

        private bool FactoryV2CanPayContract(int index)
        {
            var c = factoryV2Save.cycle;
            if (index == 0) return c.steel >= 60 && c.energy >= 40;
            if (index == 1) return c.steel >= 90 && c.energy >= 70;
            return c.steel >= 100 && c.energy >= 100 && c.credits >= 80;
        }

        private void StartFactoryV2Contract(int index)
        {
            if (index < 0 || index >= FactoryV2ContractIds.Length || factoryV2Save.cycle.contractId != null || !FactoryV2CanPayContract(index)) return;
            var c = factoryV2Save.cycle;
            if (index == 0) { c.steel -= 60; c.energy -= 40; c.contractEndsAt = FactoryV2Now() + 45000; }
            else if (index == 1) { c.steel -= 90; c.energy -= 70; c.contractEndsAt = FactoryV2Now() + 90000; }
            else { c.steel -= 100; c.energy -= 100; c.credits -= 80; c.contractEndsAt = FactoryV2Now() + 150000; }
            c.contractId = FactoryV2ContractIds[index]; SaveFactoryV2(true); ShowSection(HubSection.MegaFactoryV2);
        }

        private bool FactoryV2CanPrestige()
        {
            var c = factoryV2Save.cycle;
            bool hasUnownedResearch = false;
            for (int i = 0; i < FactoryV2ResearchOptions.Length; i++)
            {
                if (!HasFactoryV2Research(FactoryV2ResearchOptions[i].key)) { hasUnownedResearch = true; break; }
            }
            return c.upgrades >= 2 && c.contractsCompleted >= 2 && c.projectCompleted && hasUnownedResearch;
        }

        private static int FindFactoryV2Research(string id)
        {
            for (int i = 0; i < FactoryV2ResearchOptions.Length; i++) if (FactoryV2ResearchOptions[i].key == id) return i;
            return -1;
        }

        private bool HasFactoryV2Research(string id)
        {
            return Array.IndexOf(factoryV2Save.permanent.research, id) >= 0;
        }

        private void CompleteFactoryV2Prestige()
        {
            if (!FactoryV2CanPrestige() || string.IsNullOrEmpty(factoryV2SelectedResearch) || FindFactoryV2Research(factoryV2SelectedResearch) < 0 || HasFactoryV2Research(factoryV2SelectedResearch)) return;
            var research = new List<string>(factoryV2Save.permanent.research); research.Add(factoryV2SelectedResearch);
            factoryV2Save.permanent.research = research.ToArray(); factoryV2Save.permanent.prestigeCount++;
            factoryV2Save.cycle = new FactoryV2Cycle { credits = 350, energy = 100, steel = 100, intel = 20 };
            factoryV2SelectedResearch = null; factoryV2Notice = "Prestigio completado. " + FactoryV2ResearchOptions[FindFactoryV2Research(research[research.Count - 1])].name + " quedó desbloqueada permanentemente.";
            SaveFactoryV2(true); factoryV2Tab = "resumen"; ShowSection(HubSection.MegaFactoryV2);
        }

        private static string V2Amount(double amount) { return amount.ToString("N0", System.Globalization.CultureInfo.GetCultureInfo("es-AR")); }
        private static string V2Rate(double amount) { return amount.ToString("0.##", System.Globalization.CultureInfo.GetCultureInfo("es-AR")); }
    }
}
