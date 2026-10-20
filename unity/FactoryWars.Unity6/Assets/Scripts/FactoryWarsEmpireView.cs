using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using UnityEngine.Events;
using UnityEngine.UI;

namespace FactoryWars.Unity6
{
    public sealed partial class FactoryWarsMobileApp
    {
        [Serializable]
        private sealed class PendingCommandRecord
        {
            public string userId;
            public string eventId;
            public string type;
            public string key;
            public string civilization;
        }

        private struct ResearchEntry
        {
            public string key, name, category;
            public ResearchEntry(string id, string label, string group) { key = id; name = label; category = group; }
        }

        private static readonly ResearchEntry[] ResearchCatalog = {
            new ResearchEntry("eco_output", "Producción optimizada", "ECONOMÍA"),
            new ResearchEntry("eco_speed", "Obra acelerada", "ECONOMÍA"),
            new ResearchEntry("eco_discount", "Costos optimizados", "ECONOMÍA"),
            new ResearchEntry("eco_storage", "Almacén ampliado", "ECONOMÍA"),
            new ResearchEntry("eco_recovery", "Protocolos de recuperación", "ECONOMÍA"),
            new ResearchEntry("rocket_efficiency", "Munición eficiente", "COHETES"),
            new ResearchEntry("rocket_line", "Línea de montaje rápida", "COHETES"),
            new ResearchEntry("rocket_propulsion", "Propulsión avanzada", "COHETES"),
            new ResearchEntry("rocket_payload", "Carga reforzada", "COHETES"),
            new ResearchEntry("rocket_capacity", "Línea militar ampliada", "COHETES"),
            new ResearchEntry("rocket_piercing", "Cabeza perforante", "COHETES"),
            new ResearchEntry("rocket_burst", "Carga de ráfaga", "COHETES"),
            new ResearchEntry("rocket_decoy", "Señuelo", "COHETES"),
            new ResearchEntry("shield_strength", "Blindaje reforzado", "ESCUDOS"),
            new ResearchEntry("shield_capacity", "Batería ampliada", "ESCUDOS"),
            new ResearchEntry("shield_duration", "Campo persistente", "ESCUDOS"),
            new ResearchEntry("shield_charge", "Carga acelerada", "ESCUDOS"),
            new ResearchEntry("shield_efficiency", "Materiales eficientes", "ESCUDOS"),
            new ResearchEntry("shield_anti_fast", "Campo antirrápidos", "ESCUDOS"),
            new ResearchEntry("shield_anti_heavy", "Campo antipesados", "ESCUDOS"),
            new ResearchEntry("shield_emergency", "Reactor de emergencia", "ESCUDOS"),
            new ResearchEntry("sabotage_economy", "Interferencia económica", "SABOTAJE"),
            new ResearchEntry("sabotage_industry", "Interferencia industrial", "SABOTAJE"),
            new ResearchEntry("sabotage_shield", "Perturbación de escudos", "SABOTAJE"),
            new ResearchEntry("sabotage_node", "Perturbación del nodo", "SABOTAJE"),
            new ResearchEntry("sabotage_detection", "Detección temprana", "SABOTAJE"),
            new ResearchEntry("sabotage_counter", "Contramedidas", "SABOTAJE"),
            new ResearchEntry("sabotage_decoy", "Señuelo electrónico", "SABOTAJE"),
            new ResearchEntry("node_deploy", "Despliegue rápido", "NODO"),
            new ResearchEntry("node_logistics", "Logística de guardianes", "NODO"),
            new ResearchEntry("node_reserve", "Reserva de guardianes", "NODO"),
            new ResearchEntry("node_reinforce", "Refuerzos eficientes", "NODO"),
            new ResearchEntry("node_intel", "Exploración", "NODO"),
            new ResearchEntry("node_retreat", "Retirada ordenada", "NODO"),
            new ResearchEntry("node_fortify", "Fortificación", "NODO"),
            new ResearchEntry("node_income", "Explotación", "NODO"),
            new ResearchEntry("missile_breaker", "Misil · Rompeescudos", "DOCTRINAS"),
            new ResearchEntry("missile_siege", "Misil · Asedio", "DOCTRINAS"),
            new ResearchEntry("missile_fast", "Misil · Impacto rápido", "DOCTRINAS"),
            new ResearchEntry("blueprint_armory", "Plano · Armería II", "PLANOS DE ARENA"),
            new ResearchEntry("blueprint_refinery", "Plano · Refinería II", "PLANOS DE ARENA"),
            new ResearchEntry("blueprint_shield", "Plano · Escudos II", "PLANOS DE ARENA"),
            new ResearchEntry("blueprint_control", "Plano · Control II", "PLANOS DE ARENA"),
            new ResearchEntry("recon", "Reconocimiento", "ESTRATEGIA"),
            new ResearchEntry("logistics", "Logística", "ESTRATEGIA"),
            new ResearchEntry("archive", "Archivo tecnológico", "ESTRATEGIA")
        };

        private FactoryWarsEmpireCommand pendingEmpireCommand;
        private string pendingEmpireEventId;
        private bool HasAmbiguousCommand { get { return pendingEmpireCommand != null && !string.IsNullOrEmpty(pendingEmpireEventId); } }
        private RectTransform factoryAccountPanel;
        private RectTransform factoryBuildingsPanel;
        private RectTransform factoryResearchPanel;
        private GameObject factoryBuildingTargets;

        private void BuildFactoryIllustration(FactoryWarsEmpireState state, FactoryV2Save localPreview)
        {
            var mapSpace = new GameObject("Factory Map Scroll Space", typeof(RectTransform), typeof(LayoutElement));
            mapSpace.transform.SetParent(content, false);
            factoryMapSpace = mapSpace.GetComponent<LayoutElement>();
            factoryMapSpace.preferredHeight = 740;

            double[] localRates = localPreview != null ? FactoryV2Rates(localPreview.cycle) : null;
            double[] rates = state != null && state.buildings != null ? CurrentProductionRates(state) : localRates;
            string[] names = localPreview != null && state == null ? new[] { "ENERGÍA", "ACERO", "INTEL", "CRÉDITOS" } : new[] { "ENERGÍA", "ACERO", "INTEL", "ORO" };
            string[] keys = { "generator", "refinery", "lab", "automation" };
            int[] rateIndices = { 1, 2, 3, 0 };
            Vector2[] positions = { new Vector2(.22f, .70f), new Vector2(.78f, .70f), new Vector2(.22f, .34f), new Vector2(.78f, .34f) };
            for (int i = 0; i < keys.Length; i++)
            {
                int level = state != null && state.buildings != null
                    ? GetBuildingLevel(state.buildings, keys[i])
                    : localPreview != null
                        ? keys[i] == "automation" ? localPreview.cycle.automation : keys[i] == "generator" ? localPreview.cycle.generator : keys[i] == "refinery" ? localPreview.cycle.refinery : localPreview.cycle.lab
                        : -1;
                string detail = level < 0 ? "Nv. —\n—/s" : "Nv. " + level + "\n+" + rates[rateIndices[i]].ToString("0.##", System.Globalization.CultureInfo.InvariantCulture) + "/s";
                string key = keys[i];
                UnityAction openProducer;
                if (localPreview != null && state == null) openProducer = () => OpenFactoryV2ProducerPopup(key);
                else openProducer = () => OpenFactoryResource(key);
                FactoryMapBadge(names[i], detail, positions[i], 112, i < 2 ? 0 : 2, (HudIcon)rateIndices[i], openProducer);
            }
            string factoryStatus = state != null
                ? "PRESTIGIO " + state.prestigeCount.ToString("00")
                : localPreview != null
                    ? "PRESTIGIO " + localPreview.permanent.prestigeCount.ToString("00")
                    : "PLANTA EN ESPERA";
            UnityAction openFactory;
            if (localPreview != null && state == null) openFactory = () => OpenFactoryV2Tab("resumen");
            else openFactory = () => FocusFactoryDetails(factoryResearchPanel != null ? factoryResearchPanel : factoryAccountPanel);
            UnityAction openManage;
            if (localPreview != null && state == null) openManage = () => OpenFactoryV2Tab("resumen");
            else openManage = () => FocusFactoryDetails(factoryAccountPanel);
            FactoryMapBadge("MEGAFÁBRICA", factoryStatus, new Vector2(.5f, .45f), 165, 1, HudIcon.Factory,
                openFactory, 60);
            FactoryMapBadge("PROGRESO DE FÁBRICA", "MISIONES · INVESTIGACIÓN", new Vector2(.5f, .13f), 185, 3, HudIcon.Factory,
                openManage);
            BuildFactoryMapActivity(rates);
            BuildFactoryBuildingTargets();
        }

        private void BuildFactoryBuildingTargets()
        {
            factoryBuildingTargets = new GameObject("Factory building tap targets", typeof(RectTransform));
            factoryBuildingTargets.transform.SetParent(factoryArtRect, false);
            Anchor(factoryBuildingTargets, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            string[] keys = { "generator", "refinery", "lab", "automation" };
            Vector2[] min = { new Vector2(.02f, .59f), new Vector2(.71f, .55f), new Vector2(.02f, .33f), new Vector2(.70f, .30f) };
            Vector2[] max = { new Vector2(.29f, .75f), new Vector2(.99f, .72f), new Vector2(.33f, .48f), new Vector2(.99f, .45f) };
            for (int i = 0; i < keys.Length; i++)
            {
                string key = keys[i];
                var target = Panel("Tap factory · " + key, factoryBuildingTargets.transform, Color.clear);
                Anchor(target, min[i], max[i], Vector2.zero, Vector2.zero);
                var button = target.AddComponent<Button>();
                button.transition = Selectable.Transition.None;
                button.onClick.AddListener(() => OpenFactoryV2ProducerPopup(key));
            }
        }

        private void FactoryMapBadge(string title, string detail, Vector2 position, float width, int row, HudIcon icon, UnityAction callback, float badgeHeight = 70)
        {
            var badge = RoundedHudPanel("Map label · " + title, factoryMapOverlay, new Color32(7, 39, 67, 214), cyan);
            var rect = badge.GetComponent<RectTransform>();
            rect.anchorMin = rect.anchorMax = new Vector2(.5f, .5f);
            bool producer = icon != HudIcon.Factory;
            rect.sizeDelta = new Vector2(width, producer ? 76 : badgeHeight);
            factoryMapMarkers.Add(new FactoryMapMarker { rect = rect, artAnchor = position, row = row, preferredWidth = width });
            bool compactFactory = title == "MEGAFÁBRICA";
            var iconImage = HudIconImage(badge.transform, icon, new Vector2(0, .54f), compactFactory ? new Vector2(30, 34) : new Vector2(36, 42));
            iconImage.rectTransform.anchoredPosition = new Vector2(compactFactory ? 22 : 25, 0);
            bool titleOnly = !producer && string.IsNullOrWhiteSpace(detail);
            var name = PlacedLabel(badge.transform, title, width > 190 ? 14 : width > 150 ? 12 : 13, white, FontStyle.Bold, TextAnchor.MiddleLeft,
                new Vector2(0, producer ? .66f : titleOnly ? 0 : .53f), Vector2.one, new Vector2(46, 0), new Vector2(-7, titleOnly ? 0 : -2));
            name.resizeTextForBestFit = true; name.resizeTextMinSize = 10; name.resizeTextMaxSize = name.fontSize;
            if (producer)
            {
                var lines = detail.Split('\n');
                PlacedLabel(badge.transform, lines[0], 13, white, FontStyle.Bold, TextAnchor.MiddleLeft,
                    new Vector2(0, .35f), new Vector2(1, .66f), new Vector2(46, 0), new Vector2(-7, 0));
                HudDivider(badge.transform, new Vector2(0, .34f), new Vector2(1, .34f), new Vector2(46, 0), new Vector2(-9, 1));
                PlacedLabel(badge.transform, lines.Length > 1 ? lines[1] : "—/s", 13, new Color32(97, 252, 215, 255), FontStyle.Bold, TextAnchor.MiddleLeft,
                    Vector2.zero, new Vector2(1, .32f), new Vector2(46, 2), new Vector2(-7, 0));
            }
            else if (!titleOnly)
            {
                PlacedLabel(badge.transform, detail, width > 190 ? 13 : 11, new Color32(97, 252, 215, 255), FontStyle.Bold, TextAnchor.MiddleLeft,
                    Vector2.zero, new Vector2(1, .53f), new Vector2(46, 4), new Vector2(-7, 0));
            }
            var button = badge.AddComponent<Button>(); ButtonFeedback(button);
            button.onClick.AddListener(callback);
        }

        private void BuildFactoryMapActivity(double[] rates)
        {
            var go = new GameObject("Factory illustration · animated production", typeof(RectTransform), typeof(FactoryMapActivityGraphic));
            var rect = go.GetComponent<RectTransform>();
            rect.SetParent(factoryMapOverlay, false);
            rect.anchorMin = Vector2.zero; rect.anchorMax = Vector2.one;
            rect.offsetMin = rect.offsetMax = Vector2.zero;
            rect.SetAsFirstSibling();
            var activity = go.GetComponent<FactoryMapActivityGraphic>();
            activity.raycastTarget = false;
            // Bottom-left artwork coordinates. Shared endpoints are deliberately identical:
            // the transport controller queues feeders before admitting them onto each trunk.
            Vector2 westMerge = new Vector2(.326f, .500f), westInlet = new Vector2(.347f, .508f);
            Vector2 eastMerge = new Vector2(.697f, .456f), eastInlet = new Vector2(.639f, .486f);
            var routes = new[] {
                new FactoryMapCargoLoop.Route(1, new[] {
                    new Vector2(.278f, .677f), new Vector2(.400f, .635f), new Vector2(.419f, .628f) }),
                new FactoryMapCargoLoop.Route(1, new[] {
                    new Vector2(.222f, .605f), new Vector2(.285f, .581f), new Vector2(.312f, .571f) }),
                new FactoryMapCargoLoop.Route(2, new[] {
                    new Vector2(.740f, .661f), new Vector2(.651f, .631f), new Vector2(.609f, .615f) }),
                new FactoryMapCargoLoop.Route(3, new[] {
                    new Vector2(.195f, .462f), westMerge, westInlet }, 1, 1),
                // Mine's raised western belt joins the laboratory feeder at the square elbow.
                new FactoryMapCargoLoop.Route(0, new[] {
                    new Vector2(.748f, .360f), new Vector2(.713f, .352f), new Vector2(.695f, .354f),
                    new Vector2(.404f, .481f), new Vector2(.381f, .474f), westMerge, westInlet }, 1, 5),
                // Lab's second outlet passes beneath that raised belt, then joins the east trunk.
                new FactoryMapCargoLoop.Route(3, new[] {
                    new Vector2(.339f, .364f), new Vector2(.363f, .354f), new Vector2(.381f, .355f),
                    new Vector2(.500f, .397f), new Vector2(.526f, .407f), new Vector2(.579f, .425f),
                    eastMerge, eastInlet }, 2, 6, 4, 5),
                new FactoryMapCargoLoop.Route(0, new[] {
                    new Vector2(.779f, .425f), eastMerge, eastInlet }, 2, 1),
                new FactoryMapCargoLoop.Route(2, new[] {
                    new Vector2(.790f, .592f), new Vector2(.711f, .567f), new Vector2(.707f, .558f),
                    new Vector2(.845f, .514f), new Vector2(.862f, .506f), new Vector2(.854f, .497f),
                    eastMerge, eastInlet }, 2, 6)
            };
            activity.Initialize(factoryArtRect, rates, routes);
            BuildFactoryMapCargo(rates, routes);
        }

        private void BuildFactoryMapCargo(double[] rates, FactoryMapCargoLoop.Route[] routes)
        {
            var go = new GameObject("Factory conveyors · queued cargo", typeof(RectTransform), typeof(FactoryMapCargoLoop));
            var rect = go.GetComponent<RectTransform>();
            rect.SetParent(factoryMapOverlay, false);
            rect.anchorMin = Vector2.zero; rect.anchorMax = Vector2.one;
            rect.offsetMin = rect.offsetMax = Vector2.zero;
            rect.SetSiblingIndex(1);
            var belt = go.GetComponent<FactoryMapCargoLoop>();
            belt.Initialize(factoryArtRect, factoryMapOverlay, rates, routes);
        }

        private void UpdateFactoryMapVisibility()
        {
            if (factoryMapOverlay == null || content == null) return;
            factoryMapOverlay.gameObject.SetActive(currentSection == HubSection.MegaFactory && content.anchoredPosition.y < 2f);
        }

        private void UpdateFactoryMapLayout()
        {
            if (currentSection == HubSection.MegaFactory && factoryMapSpace != null && screenScroll != null)
            {
                float mapHeight = screenScroll.viewport.rect.height;
                if (mapHeight > 0 && Mathf.Abs(factoryMapSpace.preferredHeight - mapHeight) > .1f)
                    factoryMapSpace.preferredHeight = mapHeight;
            }
            UpdateFactoryMapVisibility();
            if (factoryMapOverlay == null || factoryArtRect == null || !factoryMapOverlay.gameObject.activeSelf) return;
            Rect bounds = factoryMapOverlay.rect;
            const float inset = 12, spacing = 14;
            float top = bounds.yMax - inset, bottom = bounds.yMin + inset;
            if (screenScroll != null)
            {
                var viewport = screenScroll.viewport;
                top = Mathf.Min(top, factoryMapOverlay.InverseTransformPoint(viewport.TransformPoint(new Vector3(0, viewport.rect.yMax, 0))).y - inset);
                bottom = Mathf.Max(bottom, factoryMapOverlay.InverseTransformPoint(viewport.TransformPoint(new Vector3(0, viewport.rect.yMin, 0))).y + inset);
            }
            if (top <= bottom || bounds.width <= inset * 2) return;
            Array.Clear(factoryMapRowHeights, 0, factoryMapRowHeights.Length);
            foreach (var marker in factoryMapMarkers)
            {
                if (marker.rect == null) continue;
                Vector2 source = Vector2.Scale(marker.artAnchor - factoryArtRect.pivot, factoryArtRect.rect.size);
                Vector3 local = factoryMapOverlay.InverseTransformPoint(factoryArtRect.TransformPoint(source));
                factoryMapRowPositions[marker.row] = local.y;
                factoryMapRowHeights[marker.row] = Mathf.Max(factoryMapRowHeights[marker.row], marker.rect.rect.height);
                float availableWidth = bounds.width - inset * 2;
                if (marker.row == 0 || marker.row == 2) availableWidth = (availableWidth - spacing) / 2;
                marker.rect.SetSizeWithCurrentAnchors(RectTransform.Axis.Horizontal, Mathf.Min(marker.preferredWidth, Mathf.Max(1, availableWidth)));
            }
            // Reserve four separate lanes inside the play area, independent of artwork cropping.
            float requiredHeight = spacing * (factoryMapRowHeights.Length - 1);
            foreach (float height in factoryMapRowHeights) requiredHeight += height;
            float scale = Mathf.Min(1, (top - bottom) / requiredHeight);
            float gap = spacing * scale;
            float rowTop = top;
            for (int row = 0; row < factoryMapRowHeights.Length; row++)
            {
                float halfHeight = factoryMapRowHeights[row] * scale / 2;
                float reservedBelow = 0;
                for (int next = row + 1; next < factoryMapRowHeights.Length; next++)
                    reservedBelow += factoryMapRowHeights[next] * scale + gap;
                factoryMapRowPositions[row] = Mathf.Clamp(factoryMapRowPositions[row], bottom + reservedBelow + halfHeight, rowTop - halfHeight);
                rowTop = factoryMapRowPositions[row] - halfHeight - gap;
            }
            foreach (var marker in factoryMapMarkers)
            {
                if (marker.rect == null) continue;
                marker.rect.localScale = Vector3.one * scale;
                Vector2 source = Vector2.Scale(marker.artAnchor - factoryArtRect.pivot, factoryArtRect.rect.size);
                Vector3 local = factoryMapOverlay.InverseTransformPoint(factoryArtRect.TransformPoint(source));
                float halfWidth = marker.rect.rect.width * scale / 2;
                // Preserve the art columns and keep each producer on its own side of the center.
                float minX = bounds.xMin + halfWidth + inset, maxX = bounds.xMax - halfWidth - inset;
                if (marker.row == 0 || marker.row == 2)
                {
                    if (marker.artAnchor.x < .5f) maxX = bounds.center.x - spacing / 2 - halfWidth;
                    else minX = bounds.center.x + spacing / 2 + halfWidth;
                }
                local.x = Mathf.Clamp(local.x, minX, maxX);
                marker.rect.localPosition = new Vector3(local.x, factoryMapRowPositions[marker.row], 0);
            }
        }

        private void OpenFactoryResource(string key)
        {
            OpenFactoryV2ProducerPopup(key);
        }

        private void FocusFactoryDetails(RectTransform target)
        {
            if (target == null) return;
            Canvas.ForceUpdateCanvases();
            var scroll = content.GetComponentInParent<ScrollRect>();
            if (scroll != null) scroll.StopMovement();
            float top = -content.InverseTransformPoint(target.TransformPoint(new Vector3(0, target.rect.yMax, 0))).y;
            float maxScroll = Mathf.Max(0, content.rect.height - ((RectTransform)content.parent).rect.height);
            content.anchoredPosition = new Vector2(0, Mathf.Clamp(top, 0, maxScroll));
        }

        private void BuildFactoryScreen()
        {
            factoryAccountPanel = factoryBuildingsPanel = factoryResearchPanel = null;
            LoadFactoryV2();
            // Invalid saves stay untouched and can only be reset explicitly from the menu.
            factoryMapLocalPreview = factoryV2NeedsReset ? NewFactoryV2(FactoryV2Now()) : factoryV2Save;
            BuildFactoryIllustration(null, factoryMapLocalPreview);
            UpdateResourceHud();
        }

        private void BuildOnlineSignInCard()
        {
            var auth = Card("CONECTAR TU FÁBRICA", "Usá una cuenta online existente vinculada a email. No importamos ni reemplazamos saves locales.", 340);
            factoryAccountPanel = auth.GetComponent<RectTransform>();
            Transform body = CardBody(auth.transform);
            bool configured = apiConfiguration != null && !string.IsNullOrWhiteSpace(apiConfiguration.apiBaseUrl) &&
                              !string.IsNullOrWhiteSpace(apiConfiguration.supabaseUrl) && !string.IsNullOrWhiteSpace(apiConfiguration.supabasePublicKey);
            connectionStatus = FlowLabel(body, configured ? "Ingresá con tu cuenta Factory Wars." : "El build necesita configurar el asset Resources/FactoryWarsApiConfiguration en Unity.", 10, muted, FontStyle.Normal, 46);
            emailInput = TextInput(body, "Email vinculado a la cuenta", false, 42);
            passwordInput = TextInput(body, "Contraseña", true, 42);
            FlowActionButton(body, "CONECTAR Y CARGAR", cyan, SignInAndLoad).interactable = configured;
            FlowLabel(body, "No uses service_role. La contraseña y sesión no se guardan en este dispositivo.", 9, muted, FontStyle.Normal, 34);
        }

        private void SignInAndLoad()
        {
            if (apiBusy) return;
            HubSection returnSection = currentSection;
            if (apiConfiguration == null)
            {
                SetApiBusy(false, "Falta el asset de configuración online del build.");
                return;
            }
            apiClient = new FactoryWarsApiClient(this, apiConfiguration);
            SetApiBusy(true, "Conectando con Supabase…");
            StartCoroutine(apiClient.SignIn(emailInput != null ? emailInput.text : "", passwordInput != null ? passwordInput.text : "", (session, error) =>
            {
                if (error != null) { SetApiBusy(false, ErrorMessage(error)); return; }
                if (passwordInput != null) passwordInput.text = "";
                SetApiBusy(true, "Cargando estado online…");
                StartCoroutine(apiClient.GetMe((profile, loadError) =>
                {
                    if (loadError != null) { SetApiBusy(false, ErrorMessage(loadError)); return; }
                    onlineProfile = profile;
                    RestorePendingCommandForCurrentAccount();
                    StartCoroutine(apiClient.AdvanceEmpire((advanced, advanceError) =>
                    {
                        if (advanceError == null)
                        {
                            onlineProfile.empire.state = advanced.state;
                            onlineProfile.empire.revision = advanced.revision;
                        }
                        SetApiBusy(false, advanceError == null ? "Conectado · progreso sincronizado." : "Cuenta cargada; no se pudo actualizar producción: " + ErrorMessage(advanceError));
                        ShowSection(returnSection);
                    }));
                }));
            }));
        }

        private void RefreshFactory()
        {
            if (apiBusy || apiClient == null || onlineProfile == null) return;
            SetApiBusy(true, "Actualizando producción…");
            StartCoroutine(apiClient.AdvanceEmpire((response, error) =>
            {
                if (error == null)
                {
                    onlineProfile.empire.state = response.state;
                    onlineProfile.empire.revision = response.revision;
                }
                SetApiBusy(false, error == null ? "Estado actualizado." : ErrorMessage(error));
                ShowSection(HubSection.MegaFactory);
            }));
        }

        private void SendEmpireCommand(string type, string key = null, string civilization = null)
        {
            if (apiBusy || HasAmbiguousCommand || apiClient == null || onlineProfile == null) return;
            pendingEmpireCommand = new FactoryWarsEmpireCommand { type = type, key = key, civilization = civilization };
            pendingEmpireEventId = FactoryWarsApiClient.CreateCommandEventId();
            HubSection returnSection = currentSection;
            if (!PersistPendingCommand())
            {
                pendingEmpireCommand = null;
                pendingEmpireEventId = null;
                Notice("No se pudo guardar el identificador local de la orden; no la envié.");
                return;
            }
            DispatchPendingCommand(returnSection);
        }

        private void RetryPendingEmpireCommand()
        {
            if (apiBusy || !HasAmbiguousCommand || apiClient == null) return;
            DispatchPendingCommand(HubSection.MegaFactory);
        }

        private void DispatchPendingCommand(HubSection returnSection)
        {
            SetApiBusy(true, "Enviando orden al servidor…");
            StartCoroutine(apiClient.SendEmpireCommand(pendingEmpireCommand, pendingEmpireEventId, (result, error) =>
            {
                if (error == null)
                {
                    pendingEmpireCommand = null;
                    pendingEmpireEventId = null;
                    DeletePendingCommandForCurrentAccount();
                    onlineProfile.empire.state = result.response.state;
                    onlineProfile.empire.revision = result.response.revision;
                    SetApiBusy(false, "Orden confirmada por el servidor.");
                    ShowSection(returnSection);
                    return;
                }
                bool uncertain = error.statusCode == 0 || error.statusCode >= 500 || error.statusCode == 408;
                if (uncertain)
                {
                    SetApiBusy(false, "Resultado incierto. Mantené esta pantalla abierta y reintentá la misma orden con el ID actual.");
                    ShowSection(HubSection.MegaFactory);
                    return;
                }
                pendingEmpireCommand = null;
                pendingEmpireEventId = null;
                DeletePendingCommandForCurrentAccount();
                SetApiBusy(false, ErrorMessage(error));
                ShowSection(returnSection);
            }));
        }

        private void BuildPendingCommandCard()
        {
            var card = Card("ORDEN POR CONFIRMAR", "Mantené esta sesión abierta. Reintentaremos con el mismo ID para evitar duplicarla.", 130);
            FlowActionButton(CardBody(card.transform), "REINTENTAR CON EL MISMO ID", gold, RetryPendingEmpireCommand);
        }

        private bool PersistPendingCommand()
        {
            FactoryWarsSessionInfo session = apiClient != null ? apiClient.CurrentSession : null;
            Guid userGuid;
            if (session == null || !Guid.TryParse(session.userId, out userGuid) || pendingEmpireCommand == null || string.IsNullOrEmpty(pendingEmpireEventId)) return false;
            string path = PendingCommandPath(userGuid);
            string temp = path + ".tmp";
            try
            {
                Directory.CreateDirectory(Application.persistentDataPath);
                var record = new PendingCommandRecord
                {
                    userId = userGuid.ToString("D"), eventId = pendingEmpireEventId,
                    type = pendingEmpireCommand.type, key = pendingEmpireCommand.key,
                    civilization = pendingEmpireCommand.civilization
                };
                File.WriteAllText(temp, JsonUtility.ToJson(record));
                if (File.Exists(path))
                {
                    try { File.Replace(temp, path, null); }
                    catch (Exception) { if (File.Exists(path)) File.Delete(path); File.Move(temp, path); }
                }
                else File.Move(temp, path);
                return true;
            }
            catch (Exception)
            {
                try { if (File.Exists(temp)) File.Delete(temp); } catch (Exception) { }
                return false;
            }
        }

        private void RestorePendingCommandForCurrentAccount()
        {
            FactoryWarsSessionInfo session = apiClient != null ? apiClient.CurrentSession : null;
            Guid userGuid;
            if (session == null || !Guid.TryParse(session.userId, out userGuid)) return;
            string path = PendingCommandPath(userGuid);
            try
            {
                if (!File.Exists(path)) return;
                PendingCommandRecord record = JsonUtility.FromJson<PendingCommandRecord>(File.ReadAllText(path));
                Guid recordUser;
                Guid eventGuid;
                if (record == null || !Guid.TryParse(record.userId, out recordUser) || recordUser != userGuid ||
                    !Guid.TryParseExact(record.eventId, "D", out eventGuid) || !IsSupportedEmpireCommand(record.type))
                {
                    File.Delete(path);
                    return;
                }
                pendingEmpireCommand = new FactoryWarsEmpireCommand { type = record.type, key = record.key, civilization = record.civilization };
                pendingEmpireEventId = record.eventId;
            }
            catch (Exception)
            {
                Notice("No pude leer una orden pendiente guardada en este dispositivo.");
            }
        }

        private void DeletePendingCommandForCurrentAccount()
        {
            FactoryWarsSessionInfo session = apiClient != null ? apiClient.CurrentSession : null;
            Guid userGuid;
            if (session == null || !Guid.TryParse(session.userId, out userGuid)) return;
            try
            {
                string path = PendingCommandPath(userGuid);
                if (File.Exists(path)) File.Delete(path);
                string temp = path + ".tmp";
                if (File.Exists(temp)) File.Delete(temp);
            }
            catch (Exception) { }
        }

        private static string PendingCommandPath(Guid userGuid)
        {
            return Path.Combine(Application.persistentDataPath, "factory-wars-pending-" + userGuid.ToString("N") + ".json");
        }

        private static bool IsSupportedEmpireCommand(string type)
        {
            return type == "select-civilization" || type == "upgrade-building" || type == "buy-research" ||
                   type == "equip-doctrine" || type == "start-contract" || type == "prestige";
        }

        private void BuildResearchCard(FactoryWarsEmpireState state)
        {
            var available = new List<ResearchEntry>();
            string[] unlockedResearch = state.research ?? new string[0];
            for (int i = 0; i < ResearchCatalog.Length; i++)
                if (Array.IndexOf(unlockedResearch, ResearchCatalog[i].key) < 0) available.Add(ResearchCatalog[i]);

            var card = Card("INVESTIGACIÓN", "Catálogo online · el servidor valida costos y requisitos.", 160);
            Transform body = CardBody(card.transform);
            List<string> shownCategories = new List<string>();
            for (int i = 0; i < available.Count; i++)
                if (!shownCategories.Contains(available[i].category)) shownCategories.Add(available[i].category);

            string previousCategory = null;
            for (int i = 0; i < available.Count; i++)
            {
                ResearchEntry entry = available[i];
                if (entry.category != previousCategory)
                {
                    FlowLabel(body, entry.category, 9, cyan, FontStyle.Bold, 28);
                    previousCategory = entry.category;
                }
                string key = entry.key;
                FlowActionButton(body, entry.name, panelLight, () => SendEmpireCommand("buy-research", key)).interactable = !HasAmbiguousCommand;
            }
            string[] doctrineKeys = { "missile_breaker", "missile_siege", "missile_fast" };
            int doctrineCount = 0;
            for (int i = 0; i < doctrineKeys.Length; i++)
            {
                string key = doctrineKeys[i];
                if (Array.IndexOf(state.research ?? new string[0], key) < 0 || state.activeDoctrine == key) continue;
                if (doctrineCount == 0) FlowLabel(body, "DOCTRINAS DESBLOQUEADAS", 9, gold, FontStyle.Bold, 28);
                doctrineCount++;
                FlowActionButton(body, "EQUIPAR · " + key, cyan, () => SendEmpireCommand("equip-doctrine", key)).interactable = !HasAmbiguousCommand;
            }
            if (state.activeDoctrine != null) FlowLabel(body, "Doctrina activa · " + state.activeDoctrine, 10, cyan, FontStyle.Bold, 32);
            int bodyItems = available.Count + shownCategories.Count + doctrineCount + (doctrineCount > 0 ? 1 : 0) + (state.activeDoctrine != null ? 1 : 0);
            if (bodyItems == 0)
            {
                FlowLabel(body, "Ya desbloqueaste todo el catálogo.", 10, muted, FontStyle.Normal, 34);
                bodyItems = 1;
            }
            LayoutElement(card).preferredHeight = 72 + available.Count * 47 + shownCategories.Count * 33 + doctrineCount * 47 + (doctrineCount > 0 ? 33 : 0) + (state.activeDoctrine != null ? 37 : 0) + bodyItems * 5;
        }

        private void BuildContractCard(FactoryWarsEmpireState state)
        {
            string subtitle;
            if (state.activeContract == null) subtitle = "Completa pedidos para recibir Oro e Intel.";
            else
            {
                string timer = state.activeContract.endsAt > 0
                    ? DateTimeOffset.FromUnixTimeMilliseconds(state.activeContract.endsAt).ToLocalTime().ToString("HH:mm:ss")
                    : "en curso";
                subtitle = (state.activeContract.name ?? "Contrato") + " · termina " + timer;
            }
            var card = Card("CONTRATOS", subtitle, 116);
            if (state.activeContract == null)
                FlowActionButton(CardBody(card.transform), "INICIAR CONTRATO", gold, () => SendEmpireCommand("start-contract")).interactable = !HasAmbiguousCommand;
        }

        private void BuildingCard(Transform parent, FactoryWarsEmpireState state, string key, string title, string produces, string icon, double baseCost, double growth)
        {
            int level = GetBuildingLevel(state.buildings, key);
            var row = Panel("Building " + key, parent, panelLight);
            LayoutElement(row).preferredHeight = 78;
            PlacedLabel(row.transform, icon, 21, gold, FontStyle.Bold, TextAnchor.MiddleCenter, new Vector2(0, 0), new Vector2(0, 1), new Vector2(6, 0), new Vector2(48, 0));
            PlacedLabel(row.transform, title, 10, white, FontStyle.Bold, TextAnchor.MiddleLeft, new Vector2(0, 1), new Vector2(1, 1), new Vector2(53, -30), new Vector2(-8, -6));
            PlacedLabel(row.transform, produces + " · NV " + level, 9, muted, FontStyle.Normal, TextAnchor.MiddleLeft, new Vector2(0, 1), new Vector2(1, 1), new Vector2(53, -51), new Vector2(-8, -30));
            var button = FlowActionButton(row.transform, "MEJORAR", cyan, () => SendEmpireCommand("upgrade-building", key));
            button.interactable = !HasAmbiguousCommand;
            var rect = button.GetComponent<RectTransform>(); rect.anchorMin = new Vector2(1, .5f); rect.anchorMax = new Vector2(1, .5f); rect.pivot = new Vector2(1, .5f); rect.anchoredPosition = new Vector2(-8, 0); rect.sizeDelta = new Vector2(94, 34);
            double discount = state.currentCiv == "forge" ? .9 : 1;
            long nextCost = (long)Math.Round(baseCost * Math.Pow(growth, Math.Max(0, level - 1)) * discount, MidpointRounding.AwayFromZero);
            PlacedLabel(row.transform, "SIGUIENTE · " + nextCost + " ◈", 8, cyan, FontStyle.Bold, TextAnchor.MiddleLeft, new Vector2(0, 0), new Vector2(1, 0), new Vector2(53, 2), new Vector2(-108, 22));
        }

        private void SignOut()
        {
            if (HasAmbiguousCommand) return;
            if (apiClient != null) apiClient.SignOut();
            apiBusy = false;
            apiClient = null;
            onlineProfile = null;
            pendingEmpireCommand = null;
            pendingEmpireEventId = null;
            ShowSection(HubSection.MegaFactory);
            Notice("Sesión cerrada en este dispositivo.");
        }

        private void SetApiBusy(bool busy, string message)
        {
            apiBusy = busy;
            if (connectionStatus != null) connectionStatus.text = message;
            Notice(message);
        }

        private string ErrorMessage(FactoryWarsApiError error)
        {
            if (error == null) return "No se pudo completar la operación.";
            if (error.statusCode == 401) return "La sesión venció. Cerrá sesión e iniciá de nuevo.";
            if (error.statusCode == 409) return "El servidor bloqueó la orden: revisá recursos o requisitos.";
            if (error.statusCode == 429) return "Demasiadas órdenes seguidas. Esperá un momento.";
            if (error.statusCode == 0) return "No hubo respuesta de red. El estado puede requerir una actualización.";
            return error.message;
        }

        private string CivilizationName(string id)
        {
            foreach (var civilization in Civilizations) if (civilization.Id == id) return civilization.Name;
            return "SIN SELECCIONAR";
        }

        private static int GetBuildingLevel(FactoryWarsEmpireBuildings buildings, string key)
        {
            if (buildings == null) return 1;
            switch (key) { case "generator": return buildings.generator; case "refinery": return buildings.refinery; case "lab": return buildings.lab; default: return buildings.automation; }
        }

        private static string FormatAmount(double value) { return value.ToString("N0", System.Globalization.CultureInfo.InvariantCulture); }

        private InputField TextInput(Transform parent, string placeholder, bool password, float height)
        {
            var go = Panel("Input · " + placeholder, parent, new Color32(8, 21, 35, 255));
            LayoutElement(go).preferredHeight = height;
            var input = go.AddComponent<InputField>();
            var text = PlacedLabel(go.transform, "", 12, white, FontStyle.Normal, TextAnchor.MiddleLeft, Vector2.zero, Vector2.one, new Vector2(10, 2), new Vector2(-10, -2));
            var hint = PlacedLabel(go.transform, placeholder, 10, muted, FontStyle.Normal, TextAnchor.MiddleLeft, Vector2.zero, Vector2.one, new Vector2(10, 2), new Vector2(-10, -2));
            input.textComponent = text; input.placeholder = hint; input.lineType = InputField.LineType.SingleLine;
            input.contentType = password ? InputField.ContentType.Password : InputField.ContentType.Standard;
            return input;
        }

        private Text FlowLabel(Transform parent, string value, int size, Color color, FontStyle style, float height)
        {
            var go = new GameObject("Text · " + value, typeof(RectTransform), typeof(Text)); go.transform.SetParent(parent, false);
            LayoutElement(go).preferredHeight = height;
            var text = go.GetComponent<Text>(); text.text = value; text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf"); text.fontSize = size; text.color = color; text.fontStyle = style; text.alignment = TextAnchor.MiddleLeft; text.horizontalOverflow = HorizontalWrapMode.Wrap; text.verticalOverflow = VerticalWrapMode.Overflow; text.raycastTarget = false;
            return text;
        }

        private Button FlowActionButton(Transform parent, string text, Color color, UnityAction callback)
        {
            var go = Panel("Action " + text, parent, new Color(color.r, color.g, color.b, .24f));
            LayoutElement(go).preferredHeight = 42;
            go.AddComponent<Outline>().effectColor = color;
            Label(go.transform, text, 10, white, FontStyle.Bold, TextAnchor.MiddleCenter, Vector2.zero, Vector2.one);
            var button = go.AddComponent<Button>(); button.transition = Selectable.Transition.None; button.onClick.AddListener(callback);
            return button;
        }
    }

    // Screen-space effects follow the illustration, including its aspect crop, and never own game state.
    public sealed class FactoryMapActivityGraphic : MaskableGraphic
    {
        private RectTransform artwork;
        private FactoryMapCargoLoop.Route[] conveyorRoutes;
        private bool energyActive, steelActive, intelActive, goldActive;
        private float clock, artWidth;
        private static readonly Color EnergyColor = new Color32(210, 246, 255, 255);
        private static readonly Color SteelColor = new Color32(255, 160, 61, 255);
        private static readonly Color IntelColor = new Color32(86, 217, 255, 255);
        private static readonly Color GoldColor = new Color32(255, 221, 86, 255);
        private static readonly Color GateColor = new Color32(185, 98, 255, 255);

        public void Initialize(RectTransform illustration, double[] rates, FactoryMapCargoLoop.Route[] routes)
        {
            artwork = illustration;
            conveyorRoutes = routes;
            goldActive = rates != null && rates.Length > 0 && rates[0] > 0;
            energyActive = rates != null && rates.Length > 1 && rates[1] > 0;
            steelActive = rates != null && rates.Length > 2 && rates[2] > 0;
            intelActive = rates != null && rates.Length > 3 && rates[3] > 0;
            SetVerticesDirty();
        }

        private void Update()
        {
            clock = Time.unscaledTime;
            SetVerticesDirty();
        }

        private Vector2 Point(float x, float y)
        {
            var source = Vector2.Scale(new Vector2(x, y) - artwork.pivot, artwork.rect.size);
            return rectTransform.InverseTransformPoint(artwork.TransformPoint(source));
        }

        protected override void OnPopulateMesh(VertexHelper mesh)
        {
            mesh.Clear();
            if (artwork == null || !artwork.gameObject.activeInHierarchy) return;
            artWidth = Vector2.Distance(Point(0, .5f), Point(1, .5f));
            if (artWidth <= 0) return;
            bool producing = energyActive || steelActive || intelActive || goldActive;
            float pulse = .5f + .5f * Mathf.Sin(clock * 6.8f);
            var core = Point(.520f, .604f);
            Glow(mesh, core, artWidth * .070f, EnergyColor, producing ? .28f + pulse * .40f : .09f);
            if (producing)
            {
                Ring(mesh, core, artWidth * .067f, .44f, artWidth * .007f, clock * 1.2f, EnergyColor);
                Ring(mesh, core, artWidth * .112f, .44f, artWidth * .005f, -clock * .82f, EnergyColor);
                Star(mesh, Point(.523f, .687f), artWidth * (.025f + pulse * .012f), EnergyColor, 1);
                ProductionPulse(mesh, new Vector2(.520f, .596f), new Vector2(.520f, .674f), EnergyColor, 0);
            }
            if (energyActive)
            {
                Solar(mesh);
            }
            if (steelActive)
            {
                Glow(mesh, Point(.869f, .644f), artWidth * .085f, SteelColor, .42f + pulse * .4f);
                Glow(mesh, Point(.742f, .627f), artWidth * .058f, SteelColor, .35f + pulse * .32f);
                Glow(mesh, Point(.932f, .630f), artWidth * .052f, SteelColor, .35f + pulse * .32f);
                Smoke(mesh, new Vector2(.756f, .669f), 0);
                Smoke(mesh, new Vector2(.843f, .707f), .33f);
                Smoke(mesh, new Vector2(.931f, .648f), .66f);
                Star(mesh, Point(.869f, .669f), artWidth * .022f, SteelColor, .55f + pulse * .4f);
                ProductionPulse(mesh, new Vector2(.864f, .619f), new Vector2(.864f, .668f), SteelColor, .2f);
                ProductionPulse(mesh, new Vector2(.930f, .608f), new Vector2(.930f, .647f), SteelColor, .6f);
                for (int i = 0; i < 3; i++)
                {
                    float spark = Mathf.Repeat(clock * 1.3f + i / 3f, 1);
                    Vector2 position = Point(.809f + spark * .035f, .631f + spark * .043f);
                    Star(mesh, position, artWidth * .014f, new Color32(61, 35, 19, 255), (1 - spark) * .9f);
                    Star(mesh, position, artWidth * .010f, new Color32(255, 245, 192, 255), (1 - spark) * .95f);
                }
            }
            if (intelActive)
            {
                Laboratory(mesh);
            }
            if (goldActive)
            {
                Glow(mesh, Point(.843f, .388f), artWidth * .075f, GoldColor, .25f + pulse * .32f);
                for (int i = 0; i < 6; i++)
                {
                    float t = clock * 3.2f + i * 1.71f;
                    float twinkle = .35f + .65f * (.5f + .5f * Mathf.Sin(t));
                    var sparkle = Point(.789f + i % 3 * .045f, .376f + i / 3 * .030f);
                    Star(mesh, sparkle, artWidth * (.012f + twinkle * .012f), new Color32(119, 66, 16, 255), twinkle * .85f);
                    Star(mesh, sparkle, artWidth * (.008f + twinkle * .012f), GoldColor, twinkle * .95f);
                }
            }
            GateScanner(mesh, new Vector2(.776f, .579f), 0, steelActive);
            GateScanner(mesh, new Vector2(.350f, .504f), .20f, intelActive || goldActive);
            GateScanner(mesh, new Vector2(.641f, .482f), .40f, intelActive);
            GateScanner(mesh, new Vector2(.339f, .365f), .60f, intelActive);
            GateScanner(mesh, new Vector2(.748f, .359f), .80f, goldActive);
            // Moving belt surfaces use the cargo layer's standard UI Images so they
            // follow the same visible render path as the packages above them.
        }

        private void ConveyorMotion(VertexHelper mesh)
        {
            if (conveyorRoutes == null) return;
            // An inset rubber surface hides the baked-in ribs; separated silver plates
            // then provide actual surface motion instead of competing with that texture.
            float spacing = artWidth * .052f;
            float halfPlateLength = artWidth * .010f;
            float treadTravel = clock * artWidth * .070f;
            var drawnSegments = new List<Vector4>();
            for (int routeIndex = 0; routeIndex < conveyorRoutes.Length; routeIndex++)
            {
                FactoryMapCargoLoop.Route route = conveyorRoutes[routeIndex];
                if (!IsProducerActive(route.producer)) continue;
                float routeDistance = 0;
                for (int segmentIndex = 0; segmentIndex < route.anchors.Length - 1; segmentIndex++)
                {
                    Vector2 anchorStart = route.anchors[segmentIndex];
                    Vector2 anchorEnd = route.anchors[segmentIndex + 1];
                    Vector2 start = Point(anchorStart.x, anchorStart.y);
                    Vector2 end = Point(anchorEnd.x, anchorEnd.y);
                    Vector2 delta = end - start;
                    float length = delta.magnitude;
                    if (route.hiddenFromNode >= 0 && segmentIndex >= route.hiddenFromNode
                        && segmentIndex < route.hiddenToNode) { routeDistance += length; continue; }
                    Vector4 signature = new Vector4(anchorStart.x, anchorStart.y, anchorEnd.x, anchorEnd.y);
                    if (HasDrawnSegment(drawnSegments, signature)) { routeDistance += length; continue; }
                    drawnSegments.Add(signature);
                    if (length < artWidth * .001f) { routeDistance += length; continue; }
                    Vector2 direction = delta / length;
                    // Keep the painted rails visible on either side of the moving surface.
                    Vector2 across = new Vector2(-direction.y, direction.x) * artWidth * .0065f;
                    Quad(mesh, (start + end) * .5f, across, delta * .5f, new Color32(22, 31, 39, 240));
                    float firstSlat = Mathf.Repeat(treadTravel - routeDistance, spacing);
                    for (float along = firstSlat - spacing; along < length + halfPlateLength; along += spacing)
                    {
                        // Clip each plate to this straight segment. At an elbow it exits
                        // one segment and enters the next without extending off the belt.
                        float plateStart = Mathf.Max(0, along - halfPlateLength);
                        float plateEnd = Mathf.Min(length, along + halfPlateLength);
                        if (plateEnd <= plateStart) continue;
                        Vector2 center = start + direction * ((plateStart + plateEnd) * .5f);
                        Quad(mesh, center, across * .90f, direction * ((plateEnd - plateStart) * .5f), new Color32(166, 183, 191, 255));
                        float bevelEnd = Mathf.Min(plateEnd, plateStart + artWidth * .003f);
                        Quad(mesh, start + direction * ((plateStart + bevelEnd) * .5f), across * .90f,
                            direction * ((bevelEnd - plateStart) * .5f), new Color32(237, 246, 249, 255));
                    }
                    routeDistance += length;
                }
            }
        }

        private bool IsProducerActive(int producer)
        {
            switch (producer)
            {
                case 0: return goldActive;
                case 1: return energyActive;
                case 2: return steelActive;
                case 3: return intelActive;
                default: return false;
            }
        }

        private static bool HasDrawnSegment(List<Vector4> segments, Vector4 candidate)
        {
            for (int i = 0; i < segments.Count; i++)
            {
                Vector4 segment = segments[i];
                if (segment.x == candidate.x && segment.y == candidate.y
                    && segment.z == candidate.z && segment.w == candidate.w) return true;
                if (segment.x == candidate.z && segment.y == candidate.w
                    && segment.z == candidate.x && segment.w == candidate.y) return true;
            }
            return false;
        }

        private void GateScanner(VertexHelper mesh, Vector2 aperture, float phase, bool active)
        {
            if (!active) return;
            float sweep = Mathf.Repeat(clock * .65f + phase, 1);
            float strength = Mathf.Sin(sweep * Mathf.PI);
            Vector2 center = Point(aperture.x, aperture.y);
            Vector2 across = Point(aperture.x + .011f, aperture.y + .003f) - center;
            Vector2 rise = Point(aperture.x, aperture.y + .012f) - center;
            Glow(mesh, center, artWidth * .028f, GateColor, .12f + strength * .22f);
            Color scan = GateColor; scan.a = strength * .78f;
            Quad(mesh, center + rise * (sweep * 2 - 1), across, Vector2.up * artWidth * .002f, scan);
            Star(mesh, center + rise, artWidth * .006f, GateColor, strength * .8f);
        }

        private void Smoke(VertexHelper mesh, Vector2 chimney, float phase)
        {
            for (int i = 0; i < 6; i++)
            {
                float t = Mathf.Repeat(clock * .48f + phase + i / 6f, 1);
                Vector2 center = Point(chimney.x + Mathf.Sin(t * 5 + phase * 6) * .011f + t * .025f, chimney.y + t * .084f);
                float alpha = Mathf.Sin(t * Mathf.PI) * .78f;
                float radius = artWidth * (.017f + t * .032f);
                Glow(mesh, center, radius, new Color32(55, 77, 100, 255), alpha);
                Glow(mesh, center + Vector2.up * radius * .22f, radius * .60f, new Color32(225, 237, 245, 255), alpha * .72f);
            }
        }

        private void ProductionPulse(VertexHelper mesh, Vector2 bottom, Vector2 top, Color tint, float phase)
        {
            Vector2 start = Point(bottom.x, bottom.y), end = Point(top.x, top.y);
            Vector2 direction = (end - start).normalized;
            Vector2 across = new Vector2(-direction.y, direction.x) * artWidth * .004f;
            for (int i = 0; i < 3; i++)
            {
                float t = Mathf.Repeat(clock * .64f + phase + i / 3f, 1);
                float strength = Mathf.Sin(t * Mathf.PI);
                Vector2 center = Vector2.Lerp(start, end, t);
                Glow(mesh, center, artWidth * .014f, tint, strength * .45f);
                Color light = Color.Lerp(tint, Color.white, .6f); light.a = strength * .9f;
                Quad(mesh, center, across, direction * artWidth * .006f, light);
            }
        }

        private void Solar(VertexHelper mesh)
        {
            float t = Mathf.Repeat(clock * .9f, 1);
            Vector2 left = Point(.159f - t * .064f, .700f - t * .034f);
            Vector2 right = Point(.259f - t * .059f, .676f - t * .037f);
            Vector2 across = (right - left) * .5f;
            Vector2 normal = (Point(.12f, .69f) - Point(.12f, .70f)).normalized * artWidth * .005f;
            Color scan = EnergyColor; scan.a = Mathf.Sin(t * Mathf.PI) * .95f;
            Quad(mesh, (left + right) * .5f, across, normal, scan);
            Color highlight = Color.white; highlight.a = scan.a;
            Quad(mesh, (left + right) * .5f, across, normal * .35f, highlight);
            Glow(mesh, (left + right) * .5f, artWidth * .070f, EnergyColor, .38f);
            for (int i = 0; i < 4; i++)
            {
                float strength = Mathf.Max(0, Mathf.Sin(clock * 2.6f - i));
                Star(mesh, Point(.132f + i * .029f, .679f - i * .008f), artWidth * .012f, EnergyColor, strength * .85f);
            }
        }

        private void Laboratory(VertexHelper mesh)
        {
            Vector2 center = Point(.221f, .435f);
            Glow(mesh, center, artWidth * .065f, IntelColor, .30f + .15f * Mathf.Sin(clock * 2.3f));
            Ring(mesh, center, artWidth * .080f, .46f, artWidth * .008f, -clock * .8f, new Color32(13, 52, 88, 255));
            Ring(mesh, center, artWidth * .078f, .46f, artWidth * .0045f, -clock * .8f, IntelColor);
            for (int i = 0; i < 3; i++)
            {
                float angle = clock * 1.8f + i * Mathf.PI * 2 / 3;
                Vector2 position = center + new Vector2(Mathf.Cos(angle), Mathf.Sin(angle) * .46f) * artWidth * .080f;
                Glow(mesh, position, artWidth * .018f, IntelColor, .60f);
                Quad(mesh, position, Vector2.right * artWidth * .014f, Vector2.up * artWidth * .010f, new Color32(12, 39, 65, 255));
                Quad(mesh, position, Vector2.right * artWidth * .0105f, Vector2.up * artWidth * .0075f, new Color32(239, 248, 255, 255));
                Quad(mesh, position + Vector2.left * artWidth * .017f, Vector2.right * artWidth * .006f, Vector2.up * artWidth * .006f, new Color32(12, 39, 65, 255));
                Quad(mesh, position + Vector2.right * artWidth * .017f, Vector2.right * artWidth * .006f, Vector2.up * artWidth * .006f, new Color32(12, 39, 65, 255));
                Quad(mesh, position + Vector2.left * artWidth * .017f, Vector2.right * artWidth * .004f, Vector2.up * artWidth * .004f, new Color32(81, 170, 238, 255));
                Quad(mesh, position + Vector2.right * artWidth * .017f, Vector2.right * artWidth * .004f, Vector2.up * artWidth * .004f, new Color32(81, 170, 238, 255));
                Star(mesh, position, artWidth * .005f, IntelColor, 1);
            }
        }

        private static void Quad(VertexHelper mesh, Vector2 center, Vector2 across, Vector2 up, Color tint)
        {
            int start = mesh.currentVertCount;
            mesh.AddVert(center - across - up, tint, Vector2.zero);
            mesh.AddVert(center - across + up, tint, Vector2.zero);
            mesh.AddVert(center + across + up, tint, Vector2.zero);
            mesh.AddVert(center + across - up, tint, Vector2.zero);
            mesh.AddTriangle(start, start + 1, start + 2);
            mesh.AddTriangle(start, start + 2, start + 3);
        }

        private static void Glow(VertexHelper mesh, Vector2 center, float radius, Color tint, float alpha)
        {
            const int segments = 24;
            int start = mesh.currentVertCount;
            tint.a = alpha; mesh.AddVert(center, tint, Vector2.zero);
            tint.a = 0;
            for (int i = 0; i <= segments; i++)
            {
                float angle = i * Mathf.PI * 2 / segments;
                mesh.AddVert(center + new Vector2(Mathf.Cos(angle), Mathf.Sin(angle)) * radius, tint, Vector2.zero);
                if (i > 0) mesh.AddTriangle(start, start + i, start + i + 1);
            }
        }

        private static void Star(VertexHelper mesh, Vector2 center, float radius, Color tint, float alpha)
        {
            tint.a = alpha;
            int start = mesh.currentVertCount;
            mesh.AddVert(center, tint, Vector2.zero);
            for (int i = 0; i <= 8; i++)
            {
                float angle = i * Mathf.PI / 4;
                float length = i % 2 == 0 ? radius : radius * .22f;
                mesh.AddVert(center + new Vector2(Mathf.Cos(angle), Mathf.Sin(angle)) * length, tint, Vector2.zero);
                if (i > 0) mesh.AddTriangle(start, start + i, start + i + 1);
            }
            Glow(mesh, center, radius * 1.7f, tint, alpha * .28f);
        }

        private static void Ring(VertexHelper mesh, Vector2 center, float radius, float ellipse, float thickness, float spin, Color tint)
        {
            const int segments = 48;
            for (int i = 0; i < segments; i++)
            {
                if (i % 8 >= 6) continue;
                float a = spin + i * Mathf.PI * 2 / segments;
                float b = spin + (i + 1) * Mathf.PI * 2 / segments;
                Vector2 u = new Vector2(Mathf.Cos(a), Mathf.Sin(a) * ellipse), v = new Vector2(Mathf.Cos(b), Mathf.Sin(b) * ellipse);
                int start = mesh.currentVertCount;
                tint.a = .65f;
                mesh.AddVert(center + u * (radius - thickness), tint, Vector2.zero);
                mesh.AddVert(center + u * radius, tint, Vector2.zero);
                mesh.AddVert(center + v * radius, tint, Vector2.zero);
                mesh.AddVert(center + v * (radius - thickness), tint, Vector2.zero);
                mesh.AddTriangle(start, start + 1, start + 2);
                mesh.AddTriangle(start, start + 2, start + 3);
            }
        }
    }
}
