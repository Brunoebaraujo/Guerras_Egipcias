using UnityEngine;

namespace GuerrasEgipcias.VR.Phase1
{
    /// <summary>
    /// Builds the Phase 1 VR board entirely from primitives so the first Quest build
    /// does not depend on final art assets. This script contains presentation only.
    /// It knows nothing about cards, rules, turns, power or effects.
    /// </summary>
    public sealed class BoardSandboxBuilder : MonoBehaviour
    {
        private const string RootName = "GE_VR_PHASE1_SANDBOX";

        private static readonly float[] LaneCenters = { -0.88f, 0f, 0.88f };
        private static readonly float[] SlotColumnOffsets = { -0.17f, 0.17f };
        private static readonly float[] SlotRowOffsets = { -0.20f, 0.20f };

        private Material _tableMaterial;
        private Material _slotMaterial;
        private Material _riverMaterial;
        private Material _dividerMaterial;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void AutoCreateSandbox()
        {
            if (GameObject.Find(RootName) != null)
                return;

            var root = new GameObject(RootName);
            root.AddComponent<BoardSandboxBuilder>().Build();
        }

        public void Build()
        {
            if (transform.childCount > 0)
                return;

            gameObject.name = RootName;
            CreateMaterials();
            CreateTable();
            CreateRiver();
            CreateLaneDividers();
            CreateAllSlots();
            CreatePlayerReferenceMarker();
        }

        private void CreateMaterials()
        {
            var shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
            _tableMaterial = NewMaterial(shader, new Color(0.30f, 0.19f, 0.08f));
            _slotMaterial = NewMaterial(shader, new Color(0.78f, 0.58f, 0.24f));
            _riverMaterial = NewMaterial(shader, new Color(0.03f, 0.20f, 0.36f));
            _dividerMaterial = NewMaterial(shader, new Color(0.55f, 0.38f, 0.12f));
        }

        private static Material NewMaterial(Shader shader, Color color)
        {
            var material = new Material(shader);
            material.color = color;
            return material;
        }

        private void CreateTable()
        {
            CreateBox(
                "BoardTable",
                new Vector3(0f, 0.72f, 0f),
                new Vector3(2.80f, 0.08f, 1.72f),
                _tableMaterial);
        }

        private void CreateRiver()
        {
            CreateBox(
                "Nile",
                new Vector3(0f, 0.775f, 0f),
                new Vector3(2.66f, 0.012f, 0.20f),
                _riverMaterial);
        }

        private void CreateLaneDividers()
        {
            CreateBox("LaneDivider_1_2", new Vector3(-0.44f, 0.777f, 0f), new Vector3(0.018f, 0.016f, 1.42f), _dividerMaterial);
            CreateBox("LaneDivider_2_3", new Vector3(0.44f, 0.777f, 0f), new Vector3(0.018f, 0.016f, 1.42f), _dividerMaterial);
        }

        private void CreateAllSlots()
        {
            for (var lane = 0; lane < 3; lane++)
            {
                CreateSideSlots(lane, owner: 0, sideCenterZ: -0.48f, sideName: "Player");
                CreateSideSlots(lane, owner: 1, sideCenterZ: 0.48f, sideName: "Opponent");
            }
        }

        private void CreateSideSlots(int lane, int owner, float sideCenterZ, string sideName)
        {
            for (var row = 0; row < 2; row++)
            {
                for (var column = 0; column < 2; column++)
                {
                    var x = LaneCenters[lane] + SlotColumnOffsets[column];
                    var z = sideCenterZ + SlotRowOffsets[row];
                    var slot = CreateBox(
                        $"{sideName}_Lane{lane + 1}_Slot_{row + 1}_{column + 1}",
                        new Vector3(x, 0.795f, z),
                        new Vector3(0.29f, 0.018f, 0.34f),
                        _slotMaterial);

                    var marker = slot.AddComponent<VrBoardSlot>();
                    marker.Owner = owner;
                    marker.Lane = lane;
                    marker.Row = row;
                    marker.Column = column;
                }
            }
        }

        private void CreatePlayerReferenceMarker()
        {
            // A simple reference point for seated-scale testing. It is not gameplay UI.
            CreateBox(
                "PlayerSeatReference",
                new Vector3(0f, 0.02f, -1.35f),
                new Vector3(0.38f, 0.02f, 0.18f),
                _dividerMaterial);
        }

        private GameObject CreateBox(string objectName, Vector3 position, Vector3 scale, Material material)
        {
            var obj = GameObject.CreatePrimitive(PrimitiveType.Cube);
            obj.name = objectName;
            obj.transform.SetParent(transform, worldPositionStays: true);
            obj.transform.position = position;
            obj.transform.localScale = scale;
            obj.GetComponent<Renderer>().sharedMaterial = material;
            return obj;
        }
    }
}
