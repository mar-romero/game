using System;
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

namespace FactoryWars.Unity6
{
    /// <summary>
    /// Thin UnityWebRequest adapter for the existing server-authoritative Empire API.
    /// It never persists credentials or changes a local copy of game state.
    /// Run public operations as coroutines on a MonoBehaviour host.
    /// </summary>
    public sealed class FactoryWarsApiClient
    {
        private readonly MonoBehaviour coroutineHost;
        private readonly FactoryWarsApiConfiguration configuration;
        private Session session;
        private bool refreshInFlight;
        private FactoryWarsApiError lastRefreshError;
        private int sessionEpoch;

        private sealed class Session
        {
            public string accessToken;
            public string refreshToken;
            public string userId;
            public string email;
            public DateTime accessExpiresAtUtc;
        }

        public FactoryWarsApiClient(MonoBehaviour host, FactoryWarsApiConfiguration settings)
        {
            coroutineHost = host;
            configuration = settings;
        }

        public bool IsAuthenticated { get { return session != null && !string.IsNullOrEmpty(session.accessToken); } }

        public FactoryWarsSessionInfo CurrentSession
        {
            get
            {
                if (session == null) return null;
                return new FactoryWarsSessionInfo { userId = session.userId, email = session.email };
            }
        }

        /// <summary>Clears only this process's tokens. No remote session or game state is modified.</summary>
        public void SignOut()
        {
            sessionEpoch++;
            session = null;
            lastRefreshError = null;
        }

        /// <summary>Signs in an existing Supabase email/password account; inputs and tokens remain in memory only.</summary>
        public IEnumerator SignIn(string email, string password, Action<FactoryWarsSessionInfo, FactoryWarsApiError> completed)
        {
            int signInEpoch = sessionEpoch;
            FactoryWarsApiError invalid = ValidateConfiguration(true);
            if (invalid != null) { completed?.Invoke(null, invalid); yield break; }
            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrEmpty(password))
            {
                completed?.Invoke(null, new FactoryWarsApiError(0, "Ingresá email y contraseña."));
                yield break;
            }

            var payload = new FactoryWarsPasswordGrantRequest { email = email.Trim(), password = password };
            FactoryWarsPasswordGrantResponse grant = null;
            FactoryWarsApiError error = null;
            yield return RequestJson(
                SupabaseUrl + "/auth/v1/token?grant_type=password",
                JsonUtility.ToJson(payload), null, true,
                (FactoryWarsPasswordGrantResponse value, FactoryWarsApiError failure) => { grant = value; error = failure; });

            if (error != null) { completed?.Invoke(null, error); yield break; }
            if (!IsValidGrant(grant))
            {
                completed?.Invoke(null, new FactoryWarsApiError(502, "Supabase devolvió una sesión incompleta."));
                yield break;
            }
            if (signInEpoch != sessionEpoch)
            {
                completed?.Invoke(null, new FactoryWarsApiError(0, "El inicio de sesión fue cancelado."));
                yield break;
            }

            session = SessionFrom(grant);
            sessionEpoch++;
            lastRefreshError = null;
            completed?.Invoke(CurrentSession, null);
        }

        public IEnumerator GetMe(Action<FactoryWarsMeResponse, FactoryWarsApiError> completed)
        {
            int requestEpoch = sessionEpoch;
            FactoryWarsMeResponse response = null;
            FactoryWarsApiError error = null;
            yield return AuthenticatedRequest("GET", "/me", null,
                (FactoryWarsMeResponse value, FactoryWarsApiError failure) => { response = value; error = failure; });
            if (requestEpoch != sessionEpoch) yield break;
            if (error == null && (response == null || response.empire == null || !IsCompleteEmpireState(response.empire.state)))
                error = new FactoryWarsApiError(502, "La API devolvió un perfil de Megafábrica incompleto.");
            completed?.Invoke(error == null ? response : null, error);
        }

        public IEnumerator AdvanceEmpire(Action<FactoryWarsEmpireMutationResponse, FactoryWarsApiError> completed)
        {
            int requestEpoch = sessionEpoch;
            FactoryWarsEmpireMutationResponse response = null;
            FactoryWarsApiError error = null;
            yield return AuthenticatedRequest("POST", "/me/empire/advance", "{}",
                (FactoryWarsEmpireMutationResponse value, FactoryWarsApiError failure) => { response = value; error = failure; });
            if (requestEpoch != sessionEpoch) yield break;
            if (error == null && (response == null || !IsCompleteEmpireState(response.state)))
                error = new FactoryWarsApiError(502, "La API devolvió un estado de Megafábrica incompleto.");
            completed?.Invoke(error == null ? response : null, error);
        }

        public IEnumerator GetLeaderboard(Action<FactoryWarsLeaderboardResponse, FactoryWarsApiError> completed)
        {
            int requestEpoch = sessionEpoch;
            FactoryWarsLeaderboardResponse response = null;
            FactoryWarsApiError error = null;
            yield return AuthenticatedRequest("GET", "/leaderboard", null,
                (FactoryWarsLeaderboardResponse value, FactoryWarsApiError failure) => { response = value; error = failure; });
            if (requestEpoch != sessionEpoch) yield break;
            if (error == null && !IsValidLeaderboard(response))
                error = new FactoryWarsApiError(502, "La API devolvió una clasificación incompleta.");
            completed?.Invoke(error == null ? response : null, error);
        }

        public IEnumerator JoinSeason(Action<FactoryWarsSeasonJoinResponse, FactoryWarsApiError> completed)
        {
            int requestEpoch = sessionEpoch;
            FactoryWarsSeasonJoinResponse response = null;
            FactoryWarsApiError error = null;
            // Civilization and player identity come exclusively from server-side state.
            yield return AuthenticatedRequest("POST", "/season/join", "{}",
                (FactoryWarsSeasonJoinResponse value, FactoryWarsApiError failure) => { response = value; error = failure; });
            if (requestEpoch != sessionEpoch) yield break;
            if (error == null && (response == null || !response.joined || string.IsNullOrWhiteSpace(response.seasonId)))
                error = new FactoryWarsApiError(502, "La API no confirmó la inscripción en temporada. Actualizá para consultar tu estado.");
            completed?.Invoke(error == null ? response : null, error);
        }

        private static bool IsValidLeaderboard(FactoryWarsLeaderboardResponse response)
        {
            if (response == null || string.IsNullOrWhiteSpace(response.seasonId) || response.players == null) return false;
            var ids = new System.Collections.Generic.HashSet<string>();
            foreach (var player in response.players)
            {
                if (player == null || string.IsNullOrWhiteSpace(player.participant_id) ||
                    string.IsNullOrWhiteSpace(player.display_name) || string.IsNullOrWhiteSpace(player.civilization) ||
                    !ids.Add(player.participant_id) || player.points < 0 ||
                    player.wins < 0 || player.draws < 0 || player.losses < 0) return false;
            }
            return true;
        }

        /// <summary>
        /// Creates an event identifier for a command. Keep it with the pending command if the UI
        /// needs to offer a manual retry after an ambiguous response.
        /// </summary>
        public static string CreateCommandEventId()
        {
            return Guid.NewGuid().ToString("D");
        }

        public IEnumerator SendEmpireCommand(FactoryWarsEmpireCommand command,
            Action<FactoryWarsCommandResult, FactoryWarsApiError> completed)
        {
            return SendEmpireCommand(command, CreateCommandEventId(), completed);
        }

        /// <summary>Sends once with the supplied event ID. Reuse the same ID for a manual retry.</summary>
        public IEnumerator SendEmpireCommand(FactoryWarsEmpireCommand command, string eventId,
            Action<FactoryWarsCommandResult, FactoryWarsApiError> completed)
        {
            if (command == null || string.IsNullOrWhiteSpace(command.type) || !IsValidEventId(eventId))
            {
                completed?.Invoke(null, new FactoryWarsApiError(0, "La orden o su identificador no son válidos."));
                yield break;
            }

            int requestEpoch = sessionEpoch;
            var envelope = new FactoryWarsCommandEnvelope { eventId = eventId, command = command };
            FactoryWarsEmpireMutationResponse response = null;
            FactoryWarsApiError error = null;
            yield return AuthenticatedRequest("POST", "/me/empire/command", JsonUtility.ToJson(envelope),
                (FactoryWarsEmpireMutationResponse value, FactoryWarsApiError failure) => { response = value; error = failure; });
            if (requestEpoch != sessionEpoch) yield break;
            if (error == null && (response == null || !IsCompleteEmpireState(response.state)))
                error = new FactoryWarsApiError(502, "La API devolvió un estado de Megafábrica incompleto.");
            completed?.Invoke(error == null ? new FactoryWarsCommandResult { eventId = eventId, response = response } : null, error);
        }

        private IEnumerator AuthenticatedRequest<T>(string method, string path, string body, Action<T, FactoryWarsApiError> completed)
        {
            int requestEpoch = sessionEpoch;
            if (coroutineHost == null)
            {
                completed?.Invoke(default(T), new FactoryWarsApiError(0, "Falta el host de coroutines de Unity."));
                yield break;
            }
            FactoryWarsApiError invalid = ValidateConfiguration(false);
            if (invalid != null) { completed?.Invoke(default(T), invalid); yield break; }

            string token = null;
            FactoryWarsApiError authError = null;
            yield return EnsureAccessToken((value, failure) => { token = value; authError = failure; });
            if (requestEpoch != sessionEpoch) yield break;
            if (authError != null) { completed?.Invoke(default(T), authError); yield break; }
            if (string.IsNullOrEmpty(token))
            {
                completed?.Invoke(default(T), new FactoryWarsApiError(401, "Iniciá sesión para conectar Megafábrica."));
                yield break;
            }

            T response = default(T);
            FactoryWarsApiError error = null;
            yield return RequestJson(ApiUrl + "/api/v1" + path, body, token, false,
                (T value, FactoryWarsApiError failure) => { response = value; error = failure; }, method);
            if (requestEpoch != sessionEpoch) yield break;
            completed?.Invoke(response, error);
        }

        private IEnumerator EnsureAccessToken(Action<string, FactoryWarsApiError> completed)
        {
            if (session == null)
            {
                completed?.Invoke(null, new FactoryWarsApiError(401, "Iniciá sesión para conectar Megafábrica."));
                yield break;
            }
            if (session.accessExpiresAtUtc > DateTime.UtcNow.AddSeconds(45))
            {
                completed?.Invoke(session.accessToken, null);
                yield break;
            }
            if (string.IsNullOrEmpty(session.refreshToken))
            {
                completed?.Invoke(null, new FactoryWarsApiError(401, "La sesión venció. Iniciá sesión de nuevo."));
                yield break;
            }

            if (refreshInFlight)
            {
                while (refreshInFlight) yield return null;
                if (session != null && session.accessExpiresAtUtc > DateTime.UtcNow.AddSeconds(5))
                    completed?.Invoke(session.accessToken, null);
                else
                    completed?.Invoke(null, lastRefreshError ?? new FactoryWarsApiError(401, "No se pudo renovar la sesión."));
                yield break;
            }

            refreshInFlight = true;
            int refreshEpoch = sessionEpoch;
            FactoryWarsPasswordGrantResponse grant = null;
            FactoryWarsApiError error = null;
            var payload = new FactoryWarsRefreshGrantRequest { refresh_token = session.refreshToken };
            yield return RequestJson(
                SupabaseUrl + "/auth/v1/token?grant_type=refresh_token",
                JsonUtility.ToJson(payload), null, true,
                (FactoryWarsPasswordGrantResponse value, FactoryWarsApiError failure) => { grant = value; error = failure; });

            if (refreshEpoch != sessionEpoch)
            {
                error = new FactoryWarsApiError(401, "La sesión cambió antes de completar la renovación.");
            }
            else if (error == null && IsValidGrant(grant))
            {
                session = SessionFrom(grant);
                lastRefreshError = null;
            }
            else
            {
                if (error == null) error = new FactoryWarsApiError(502, "Supabase devolvió una sesión renovada incompleta.");
                lastRefreshError = error;
            }
            refreshInFlight = false;
            completed?.Invoke(error == null ? session.accessToken : null, error);
        }

        private IEnumerator RequestJson<T>(string url, string body, string bearerToken, bool includeSupabaseKey,
            Action<T, FactoryWarsApiError> completed, string method = "POST")
        {
            using (var request = new UnityWebRequest(url, method))
            {
                request.redirectLimit = 0;
                request.downloadHandler = new DownloadHandlerBuffer();
                if (body != null) request.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(body));
                request.SetRequestHeader("Accept", "application/json");
                if (body != null) request.SetRequestHeader("Content-Type", "application/json");
                if (includeSupabaseKey) request.SetRequestHeader("apikey", configuration.supabasePublicKey.Trim());
                if (!string.IsNullOrEmpty(bearerToken)) request.SetRequestHeader("Authorization", "Bearer " + bearerToken);

                yield return request.SendWebRequest();
                int status = (int)request.responseCode;
                if (request.result != UnityWebRequest.Result.Success)
                {
                    completed?.Invoke(default(T), new FactoryWarsApiError(status, ReadErrorMessage(request.downloadHandler?.text, request.error)));
                    yield break;
                }

                try
                {
                    T parsed = JsonUtility.FromJson<T>(request.downloadHandler.text);
                    if (parsed == null) throw new FormatException("empty response");
                    completed?.Invoke(parsed, null);
                }
                catch (Exception)
                {
                    completed?.Invoke(default(T), new FactoryWarsApiError(502, "La respuesta del servidor no tiene el formato esperado."));
                }
            }
        }

        private FactoryWarsApiError ValidateConfiguration(bool requireSupabase)
        {
            if (coroutineHost == null) return new FactoryWarsApiError(0, "Falta el host de coroutines de Unity.");
            if (!IsHttpUrl(configuration == null ? null : configuration.apiBaseUrl))
                return new FactoryWarsApiError(0, "Configurá la URL base del servidor Factory Wars.");
            if (requireSupabase || !string.IsNullOrEmpty(session?.refreshToken))
            {
                if (!IsHttpUrl(configuration == null ? null : configuration.supabaseUrl) ||
                    string.IsNullOrWhiteSpace(configuration.supabasePublicKey))
                    return new FactoryWarsApiError(0, "Configurá la URL y la clave pública de Supabase.");
            }
            return null;
        }

        private string ApiUrl { get { return configuration.apiBaseUrl.Trim().TrimEnd('/'); } }
        private string SupabaseUrl { get { return configuration.supabaseUrl.Trim().TrimEnd('/'); } }

        private static bool IsHttpUrl(string value)
        {
            Uri uri;
            if (!Uri.TryCreate(value, UriKind.Absolute, out uri) || !string.IsNullOrEmpty(uri.UserInfo)) return false;
            if (uri.Scheme == Uri.UriSchemeHttps) return true;
            if (uri.Scheme != Uri.UriSchemeHttp) return false;
            string host = uri.Host.Trim('[', ']').ToLowerInvariant();
            return host == "localhost" || host == "127.0.0.1" || host == "::1";
        }

        private static bool IsValidEventId(string value)
        {
            if (string.IsNullOrEmpty(value) || value.Length < 8 || value.Length > 100) return false;
            for (int i = 0; i < value.Length; i++)
            {
                char character = value[i];
                if ((character >= 'A' && character <= 'Z') || (character >= 'a' && character <= 'z') ||
                    (character >= '0' && character <= '9') || character == '-') continue;
                return false;
            }
            return true;
        }

        private static bool IsValidGrant(FactoryWarsPasswordGrantResponse grant)
        {
            return grant != null && !string.IsNullOrEmpty(grant.access_token) && !string.IsNullOrEmpty(grant.refresh_token) &&
                   grant.user != null && !string.IsNullOrEmpty(grant.user.id);
        }

        private static bool IsCompleteEmpireState(FactoryWarsEmpireState state)
        {
            return state != null && !string.IsNullOrEmpty(state.version) && state.buildings != null && state.research != null;
        }

        private static Session SessionFrom(FactoryWarsPasswordGrantResponse grant)
        {
            int lifetime = Math.Max(1, grant.expires_in);
            return new Session
            {
                accessToken = grant.access_token,
                refreshToken = grant.refresh_token,
                userId = grant.user.id,
                email = grant.user.email,
                accessExpiresAtUtc = DateTime.UtcNow.AddSeconds(lifetime)
            };
        }

        private static string ReadErrorMessage(string json, string transportMessage)
        {
            if (!string.IsNullOrWhiteSpace(json))
            {
                try
                {
                    FactoryWarsErrorBody body = JsonUtility.FromJson<FactoryWarsErrorBody>(json);
                    if (body != null)
                    {
                        if (!string.IsNullOrWhiteSpace(body.message)) return body.message;
                        if (!string.IsNullOrWhiteSpace(body.error_description)) return body.error_description;
                        if (!string.IsNullOrWhiteSpace(body.msg)) return body.msg;
                        if (!string.IsNullOrWhiteSpace(body.error)) return body.error;
                    }
                }
                catch (Exception) { }
            }
            return string.IsNullOrWhiteSpace(transportMessage) ? "Error de red o respuesta HTTP inválida." : transportMessage;
        }
    }

    public sealed class FactoryWarsCommandResult
    {
        public string eventId;
        public FactoryWarsEmpireMutationResponse response;
    }
}
