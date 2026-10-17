"""Offline macOS asset preparation; deployed builds use the committed AAC file."""
from array import array
from pathlib import Path
import subprocess
import sys
import tempfile
import wave

root = Path(__file__).resolve().parents[1]
source = next((root / "Music").glob("*.mp3"))
target = root / "public/assets/audio/arcade-kid.m4a"
target.parent.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory() as folder:
    decoded, trimmed = Path(folder) / "decoded.wav", Path(folder) / "loop.wav"
    subprocess.run(["afconvert", "-f", "WAVE", "-d", "LEI16", str(source), str(decoded)], check=True)
    with wave.open(str(decoded), "rb") as audio:
        rate, channels = audio.getframerate(), audio.getnchannels()
        frames = rate * 60
        pcm = array("h", audio.readframes(frames))
    if sys.byteorder != "little":
        pcm.byteswap()
    assert len(pcm) == frames * channels, "Source must be at least 60 seconds."
    # Short edge fades prevent clicks at the loop point without adding silence.
    fade = int(rate * 0.012)
    for i in range(fade):
        for channel in range(channels):
            pcm[i * channels + channel] = round(pcm[i * channels + channel] * i / fade)
            j = (frames - 1 - i) * channels + channel
            pcm[j] = round(pcm[j] * i / fade)
    if sys.byteorder != "little":
        pcm.byteswap()
    with wave.open(str(trimmed), "wb") as audio:
        audio.setnchannels(channels)
        audio.setsampwidth(2)
        audio.setframerate(rate)
        audio.writeframes(pcm.tobytes())
    subprocess.run(["afconvert", "-f", "m4af", "-d", "aac", "-b", "96000", str(trimmed), str(target)], check=True)
print(f"{target.relative_to(root)}: {target.stat().st_size:,} bytes; 60-second stereo loop")
