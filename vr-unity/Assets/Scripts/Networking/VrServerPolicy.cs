namespace GuerrasEgipcias.VR.Networking
{
    /// <summary>
    /// Architectural policy for the VR client.
    /// The Quest client never resolves gameplay locally, including BOT matches.
    /// </summary>
    public static class VrServerPolicy
    {
        public const int ProtocolVersion = 2;
        public const bool ServerRequiredForHumanMatches = true;
        public const bool ServerRequiredForBotMatches = true;
        public const bool AllowLocalGameplayRules = false;
    }
}
