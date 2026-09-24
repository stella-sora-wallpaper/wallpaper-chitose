"""Export the three streamed Unity clips used by Chitose's opening timeline."""

from __future__ import annotations

import json
import math
import struct
from pathlib import Path
from typing import Any

import UnityPy


ROOT = Path(__file__).resolve().parents[1]
BUNDLE = ROOT / ".cache" / "official-en-1.13.0" / "char_l2d_14401.unity3d"
OUTPUT = ROOT / "public" / "assets" / "chitose-live2d" / "opening" / "timeline-curves.json"
CLIPS = {"Recorded", "Recorded (1)", "Recorded (2)"}


def streamed_frames(words: list[int]) -> list[dict[str, Any]]:
    raw = struct.pack(f"<{len(words)}I", *words)
    frames: list[dict[str, Any]] = []
    offset = 0
    while offset < len(raw):
        time, count = struct.unpack_from("<fi", raw, offset)
        offset += 8
        values = []
        for _ in range(count):
            index, c0, c1, c2, value = struct.unpack_from("<i4f", raw, offset)
            offset += 20
            values.append({"index": index, "value": value, "outSlope": c2, "coeff": [c0, c1, c2, value]})
        if math.isfinite(time):
            frames.append({"time": time, "values": values})
    return frames


def component_count(binding: dict[str, Any]) -> int:
    if binding["typeID"] == 4:  # Transform
        return {1: 3, 3: 3, 4: 4}.get(binding["attribute"], 1)
    return 1


def main() -> None:
    environment = UnityPy.load(str(BUNDLE))
    exported: dict[str, Any] = {}
    for obj in environment.objects:
        if obj.type.name != "AnimationClip":
            continue
        data = obj.read_typetree()
        name = data.get("m_Name")
        if name not in CLIPS:
            continue
        clip = data["m_MuscleClip"]["m_Clip"]["data"]
        bindings = data["m_ClipBindingConstant"]["genericBindings"]
        start = 0
        frames = streamed_frames(clip["m_StreamedClip"]["data"])
        initial = next((frame["values"] for frame in frames if frame["time"] <= -1e20), [])
        exported[name] = {
            "sampleRate": data["m_SampleRate"],
            "bindings": [
                {
                    "startIndex": (start := start + component_count(binding)) - component_count(binding),
                    "componentCount": component_count(binding),
                    "path": binding["path"],
                    "attribute": binding["attribute"],
                    "typeId": binding["typeID"],
                }
                for binding in bindings
            ],
            "initialValues": initial,
            "frames": [frame for frame in frames if frame["time"] > -1e20],
        }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps({"source": "14401_LFTimeline", "clips": exported}, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT.relative_to(ROOT)} ({', '.join(sorted(exported))})")


if __name__ == "__main__":
    main()
