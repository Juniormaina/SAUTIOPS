#!/usr/bin/env python3
"""Generate timed TTS narration and mux it onto demos/sautiops-demo.mp4."""

from __future__ import annotations

import asyncio
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEMOS = ROOT / "demos"
VIDEO = DEMOS / "sautiops-demo.mp4"
OUT = DEMOS / "sautiops-demo.mp4"
VOICE = "en-US-JennyNeural"

# (start_ms, narration) aligned to the demo scenes / VOICEOVER.md
SEGMENTS = [
    (
        0,
        "Frontline operations are bogged down by clunky forms, radio static, "
        "and manual data entry. Meet SautiOps — the voice-first operations "
        "desk designed for the floor.",
    ),
    (
        8000,
        "Instead of clicking through dropdowns, workers just talk naturally. "
        "Watch as SautiOps listens to a critical alert about a failing freezer, "
        "extracts the context, and proposes a structured ticket instantly.",
    ),
    (
        22000,
        "With a quick confirmation, the ticket is logged to live work. "
        "Shift handovers become seamless, and closing out tasks automatically "
        "builds an immutable audit trail for management.",
    ),
    (
        35000,
        "Speak it. Track it. Hand it over. SautiOps — turning frontline voice "
        "data into operational velocity.",
    ),
]


def require(cmd: str) -> None:
    if shutil.which(cmd) is None and cmd != "edge-tts":
        raise SystemExit(f"Missing required command: {cmd}")


async def synthesize(text: str, dest: Path) -> None:
    import edge_tts

    communicate = edge_tts.Communicate(text, VOICE, rate="-5%")
    await communicate.save(str(dest))


def video_duration_seconds(path: Path) -> float:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return float(result.stdout.strip())


async def main() -> None:
    if not VIDEO.exists():
        raise SystemExit(
            f"Missing {VIDEO}. Run `npm run demo:record` first.",
        )

    require("ffmpeg")
    require("ffprobe")

    duration = video_duration_seconds(VIDEO)
    print(f"Video duration: {duration:.2f}s")

    with tempfile.TemporaryDirectory(prefix="sautiops-vo-") as tmp:
        tmp_path = Path(tmp)
        inputs = ["-i", str(VIDEO)]
        filter_parts: list[str] = []
        mix_labels: list[str] = []

        for index, (start_ms, text) in enumerate(SEGMENTS):
            audio_path = tmp_path / f"seg-{index}.mp3"
            print(f"Synthesizing segment {index + 1}/{len(SEGMENTS)}…")
            await synthesize(text, audio_path)
            inputs.extend(["-i", str(audio_path)])
            # Input 0 is video; audio segments start at input 1.
            audio_index = index + 1
            label = f"a{index}"
            filter_parts.append(
                f"[{audio_index}:a]adelay={start_ms}|{start_ms},"
                f"apad=whole_dur={duration:.3f}[{label}]"
            )
            mix_labels.append(f"[{label}]")

        mix = "".join(mix_labels)
        filter_parts.append(
            f"{mix}amix=inputs={len(SEGMENTS)}:duration=first:dropout_transition=0:"
            f"normalize=0[aout]"
        )
        filter_complex = ";".join(filter_parts)

        muxed = tmp_path / "with-audio.mp4"
        cmd = [
            "ffmpeg",
            "-y",
            *inputs,
            "-filter_complex",
            filter_complex,
            "-map",
            "0:v:0",
            "-map",
            "[aout]",
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-shortest",
            str(muxed),
        ]
        print("Muxing narration onto video…")
        subprocess.run(cmd, check=True)

        backup = DEMOS / "sautiops-demo.silent.mp4"
        if not backup.exists():
            shutil.copy2(VIDEO, backup)
            print(f"Kept silent original at {backup.name}")

        shutil.copy2(muxed, OUT)
        print(f"Wrote narrated demo: {OUT}")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as exc:  # noqa: BLE001
        print(f"Voiceover mux failed: {exc}", file=sys.stderr)
        sys.exit(1)
