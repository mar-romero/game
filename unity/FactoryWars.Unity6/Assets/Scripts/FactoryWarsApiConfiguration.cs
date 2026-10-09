using System;
using UnityEngine;

namespace FactoryWars.Unity6
{
    /// <summary>Build-time endpoint settings. Keep the production API origin trusted and fixed.</summary>
    [CreateAssetMenu(fileName = "FactoryWarsApiConfiguration", menuName = "Factory Wars/Online API Configuration")]
    public sealed class FactoryWarsApiConfiguration : ScriptableObject
    {
        public string apiBaseUrl;
        public string supabaseUrl;
        public string supabasePublicKey;
    }

    /// <summary>In-memory authentication status. Tokens are deliberately not exposed.</summary>
    public sealed class FactoryWarsSessionInfo
    {
        public string userId { get; internal set; }
        public string email { get; internal set; }
    }

    /// <summary>HTTP failure details safe to show in the UI; never contains request headers.</summary>
    public sealed class FactoryWarsApiError
    {
        public int statusCode { get; private set; }
        public string message { get; private set; }

        internal FactoryWarsApiError(int status, string detail)
        {
            statusCode = status;
            message = string.IsNullOrWhiteSpace(detail) ? "No se pudo completar la solicitud." : detail;
        }
    }

    [Serializable]
    public sealed class FactoryWarsAuthUser
    {
        public string id;
        public string email;
    }

    [Serializable]
    public sealed class FactoryWarsEmpireProfile
    {
        public string nickname;
        public string user_id;
        public string current_civ;
        public int rating;
        public int points;
    }

    [Serializable]
    public sealed class FactoryWarsEmpireBuildings
    {
        public int generator;
        public int refinery;
        public int lab;
        public int automation;
    }

    [Serializable]
    public sealed class FactoryWarsEmpireContract
    {
        public string name;
        public string id;
        public FactoryWarsEmpireContractInputs inputs;
        public long endsAt;
        public int reward;
        public int intelReward;
        public double seconds;
    }

    [Serializable]
    public sealed class FactoryWarsEmpireContractInputs
    {
        public double energy;
        public double steel;
        public double credits;
    }

    [Serializable]
    public sealed class FactoryWarsCivilizationProgress
    {
        public double forge;
        public double bastion;
        public double swarm;
        public double nexus;
    }

    [Serializable]
    public sealed class FactoryWarsFactionProgress
    {
        public double pvp;
        public double industrial;
        public double operations;
    }

    [Serializable]
    public sealed class FactoryWarsFactionLocalProgress
    {
        public FactoryWarsFactionProgress forge;
        public FactoryWarsFactionProgress bastion;
        public FactoryWarsFactionProgress swarm;
        public FactoryWarsFactionProgress nexus;
    }

    [Serializable]
    public sealed class FactoryWarsProductionTelemetry
    {
        public double credits;
        public double energy;
        public double steel;
        public double intel;
        public double fragments;
        public double dominion;
    }

    [Serializable]
    public sealed class FactoryWarsEmpireState
    {
        public string version;
        public string nickname;
        public string currentCiv;
        public bool civLocked;
        public double credits;
        public double energy;
        public double steel;
        public double intel;
        public double fragments;
        public double dominion;
        public int dominionTier;
        public int warWins;
        public FactoryWarsEmpireBuildings buildings;
        public string[] research;
        public string activeDoctrine;
        public int contractsCompleted;
        public double lifetimeProduction;
        public double cycleProduction;
        public double bestIndustrialScore;
        public int prestigeCount;
        public int legacyNodes;
        public FactoryWarsCivilizationProgress civLegacies;
        public FactoryWarsCivilizationProgress loyalty;
        public FactoryWarsFactionLocalProgress factionLocal;
        public FactoryWarsEmpireContract activeContract;
        public long lastTick;
        public long telemetryWindowStartedAt;
        public double telemetryWindowSeconds;
        public FactoryWarsProductionTelemetry telemetryPendingProduction;
    }

    [Serializable]
    public sealed class FactoryWarsEmpireEnvelope
    {
        public FactoryWarsEmpireState state;
        public int revision;
    }

    [Serializable]
    public sealed class FactoryWarsMeResponse
    {
        public FactoryWarsEmpireProfile profile;
        public FactoryWarsEmpireEnvelope empire;
        public FactoryWarsAuthUser user;
        public bool isAdmin;
    }

    [Serializable]
    public sealed class FactoryWarsEmpireEvent
    {
        public string eventType;
        public string resource;
        public double amount;
    }

    [Serializable]
    public sealed class FactoryWarsEmpireMutationResponse
    {
        public FactoryWarsEmpireState state;
        public int revision;
        public bool duplicate;
        public FactoryWarsEmpireEvent[] events;
    }

    /// <summary>Only command properties used by the current server contract are serialized.</summary>
    [Serializable]
    public sealed class FactoryWarsEmpireCommand
    {
        public string type;
        public string key;
        public string civilization;
    }

    [Serializable]
    internal sealed class FactoryWarsPasswordGrantRequest
    {
        public string email;
        public string password;
    }

    [Serializable]
    internal sealed class FactoryWarsRefreshGrantRequest
    {
        public string refresh_token;
    }

    [Serializable]
    internal sealed class FactoryWarsPasswordGrantResponse
    {
        public string access_token;
        public string refresh_token;
        public int expires_in;
        public string token_type;
        public FactoryWarsAuthUser user;
    }

    [Serializable]
    internal sealed class FactoryWarsErrorBody
    {
        public string error;
        public string error_description;
        public string msg;
        public string message;
    }

    [Serializable]
    internal sealed class FactoryWarsCommandEnvelope
    {
        public string eventId;
        public FactoryWarsEmpireCommand command;
    }
}
