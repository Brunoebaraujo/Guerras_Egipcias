using UnityEngine;

namespace GuerrasEgipcias.VR.Phase1
{
    /// <summary>
    /// Presentation-space identity for one physical board slot.
    /// Owner: 0 = local player side, 1 = opponent side.
    /// Lane is zero-based and maps directly to the existing game protocol.
    /// </summary>
    public sealed class VrBoardSlot : MonoBehaviour
    {
        public int Owner { get; set; }
        public int Lane { get; set; }
        public int Row { get; set; }
        public int Column { get; set; }
    }
}
