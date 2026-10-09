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

        private void BuildFactoryScreen()
        {
            Hero("MEGAFÁBRICA", "CRECÉ · PRODUCÍ · INVESTIGÁ", "Progreso persistente · conectado al servidor", new Color32(33, 156, 189, 255));
            if (onlineProfile == null || onlineProfile.empire == null || onlineProfile.empire.state == null)
            {
                BuildOnlineSignInCard();
                return;
            }

            FactoryWarsEmpireState state = onlineProfile.empire.state;
            var account = Card("FÁBRICA ONLINE", (onlineProfile.profile != null ? onlineProfile.profile.nickname : "Cuenta conectada") + " · revisión " + onlineProfile.empire.revision, 166);
            Transform accountBody = CardBody(account.transform);
            StatRow(accountBody, "CIVILIZACIÓN", CivilizationName(state.currentCiv), state.civLocked ? "Bloqueada hasta prestigiar" : "Elegí tu civilización");
            FlowActionButton(accountBody, "ACTUALIZAR PRODUCCIÓN", cyan, RefreshFactory);
            if (HasAmbiguousCommand) BuildPendingCommandCard();

            var resources = Card("RESERVAS", "Saldos confirmados por el servidor", 430);
            Transform resourceBody = CardBody(resources.transform);
            StatRow(resourceBody, "CRÉDITOS", FormatAmount(state.credits), "Automatización · gasto de fábrica");
            StatRow(resourceBody, "ENERGÍA", FormatAmount(state.energy), "Generadores · contratos");
            StatRow(resourceBody, "ACERO", FormatAmount(state.steel), "Refinerías · contratos");
            StatRow(resourceBody, "INTEL", FormatAmount(state.intel), "Laboratorios · investigación");
            StatRow(resourceBody, "FRAGMENTOS", FormatAmount(state.fragments), "Recompensas competitivas");
            StatRow(resourceBody, "DOMINIO", FormatAmount(state.dominion), "Progreso de dominio");

            var modules = Card("COMPLEJO INDUSTRIAL", "Las mejoras se validan y aplican en el servidor.", 430);
            Transform moduleList = CardBody(modules.transform);
            BuildingCard(moduleList, state, "generator", "GENERADORES", "Energía industrial", "⚡", 120, 1.55);
            BuildingCard(moduleList, state, "refinery", "REFINERÍAS", "Acero industrial", "▣", 140, 1.58);
            BuildingCard(moduleList, state, "lab", "LABORATORIOS", "Investigación", "⌁", 180, 1.62);
            BuildingCard(moduleList, state, "automation", "AUTOMATIZACIÓN", "Créditos", "◈", 220, 1.65);

            BuildResearchCard(state);
            BuildContractCard(state);
            var controls = Card("CUENTA", "La sesión es temporal y se borra al cerrar la app.", 110);
            FlowActionButton(CardBody(controls.transform), "CERRAR SESIÓN", gold, SignOut).interactable = !HasAmbiguousCommand;
        }

        private void BuildOnlineSignInCard()
        {
            var auth = Card("CONECTAR TU FÁBRICA", "Usá una cuenta online existente vinculada a email. No importamos ni reemplazamos saves locales.", 340);
            Transform body = CardBody(auth.transform);
            bool configured = apiConfiguration != null && !string.IsNullOrWhiteSpace(apiConfiguration.apiBaseUrl) &&
                              !string.IsNullOrWhiteSpace(apiConfiguration.supabaseUrl) && !string.IsNullOrWhiteSpace(apiConfiguration.supabasePublicKey);
            connectionStatus = FlowLabel(body, configured ? "Ingresá con tu cuenta Factory Wars." : "El build necesita configurar el asset Resources/FactoryWarsApiConfiguration en Unity.", 10, muted, 46);
            emailInput = TextInput(body, "Email vinculado a la cuenta", false, 42);
            passwordInput = TextInput(body, "Contraseña", true, 42);
            FlowActionButton(body, "CONECTAR Y CARGAR", cyan, SignInAndLoad).interactable = configured;
            FlowLabel(body, "No uses service_role. La contraseña y sesión no se guardan en este dispositivo.", 9, muted, 34);
        }

        private void SignInAndLoad()
        {
            if (apiBusy) return;
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
                        ShowSection(HubSection.MegaFactory);
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
            if (state.activeContract == null) subtitle = "Completa pedidos para recibir Créditos e Intel.";
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
            var text = go.GetComponent<Text>(); text.text = value; text.font = Resources.GetBuiltinResource<Font>("Arial.ttf"); text.fontSize = size; text.color = color; text.fontStyle = style; text.alignment = TextAnchor.MiddleLeft; text.horizontalOverflow = HorizontalWrapMode.Wrap; text.verticalOverflow = VerticalWrapMode.Overflow; text.raycastTarget = false;
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
}
