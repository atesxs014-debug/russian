#!/usr/bin/env python3
"""Generates native-speaker audio for every letter, word, sentence and quote in all language packs.

Runs in GitHub Actions (no API key needed):
  1. Microsoft Edge neural voices (edge-tts)
  2. Fallback: Google Translate voice (gTTS)

Writes assets/audio/<lang>/<hash>.mp3 and src/audio/audioMap.ts.
- One file per text: slow playback is done by the app (pitch-corrected), so no "_s" copies.
- Files are re-encoded to mono 32 kbps with ffmpeg (speech stays clear, app stays small).
- Dialogue lines of the second speaker get a male voice (key "<lang>#m:<text>").
Existing files are kept, so only new texts are generated.
"""
import asyncio
import hashlib
import json
import pathlib
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "src" / "data"
OUT = ROOT / "assets" / "audio"
MAP = ROOT / "src" / "audio" / "audioMap.ts"
DONE = ".compressed"  # list of files already re-encoded

VOICES = {
    "ru": ("ru-RU-SvetlanaNeural", "ru-RU-DmitryNeural", "ru"),
    "en": ("en-GB-SoniaNeural", "en-GB-RyanNeural", "en"),
    "de": ("de-DE-KatjaNeural", "de-DE-ConradNeural", "de"),
    "fr": ("fr-FR-DeniseNeural", "fr-FR-HenriNeural", "fr"),
    "it": ("it-IT-ElsaNeural", "it-IT-DiegoNeural", "it"),
}


def plain(s: str) -> str:
    return s.replace("́", "").strip()


def key(s: str) -> str:
    return plain(s).lower()


def collect(lang: str) -> list[tuple[str, str, bool]]:
    """(key, text, male) for every text of the language."""
    texts: dict[tuple[str, bool], str] = {}

    def add(t: str, male: bool = False):
        if t and plain(t):
            texts.setdefault((key(t), male), plain(t))

    def walk_units(units):
        for unit in units:
            for lesson in unit["lessons"]:
                for l in lesson.get("letters", []):
                    add(l["name"])
                    if l.get("say"):
                        add(l["say"])
                    for w in l["words"]:
                        add(w["t"])
                for w in lesson.get("words", []):
                    add(w["t"])
                for v in lesson.get("v", []):
                    add(v[0])
                for r in lesson.get("rules", []):
                    for w in r["examples"]:
                        add(w["t"])
                for d in lesson.get("drills", []):
                    add(d["s"].replace("___", d["a"]))
                dlg = lesson.get("dialog")
                if dlg:
                    for line in dlg["lines"]:
                        add(line["t"], male=line["p"] == 1)
                tx = lesson.get("text")
                if tx:
                    add(tx["t"])
                    for g in tx["gloss"]:
                        add(g[0])

    data = json.loads((DATA / f"{lang}.json").read_text(encoding="utf-8"))
    walk_units(data["units"])
    gpath = DATA / "grammar" / f"{lang}.json"
    if gpath.exists():
        walk_units([x["unit"] for x in json.loads(gpath.read_text(encoding="utf-8"))["units"]])
    for q in data.get("quotes", []):
        add(q["t"])
    conj = DATA / "conj.json"
    if conj.exists():
        c = json.loads(conj.read_text(encoding="utf-8")).get(lang)
        if c:
            persons = [p.split(" / ")[0].replace("'", "") for p in c["persons"]]
            for v in c["verbs"]:
                add(v["inf"])
                for p, f in zip(persons, v["forms"]):
                    add(conj_phrase(lang, p, f))
    return sorted((k, t, m) for (k, m), t in texts.items())


def conj_phrase(lang: str, person: str, form: str) -> str:
    """'je' + 'ai' → "j'ai" (same rule as the app)."""
    if lang == "fr" and person == "je" and form[:1].lower() in "aeiouéèêh":
        return "j'" + form
    return f"{person} {form}"


def fname(lang: str, k: str, male: bool) -> str:
    return hashlib.md5(f"{lang}{'#m' if male else ''}:{k}".encode("utf-8")).hexdigest()[:12]


async def edge(text: str, voice: str, path: pathlib.Path) -> bool:
    try:
        import edge_tts

        await edge_tts.Communicate(text, voice).save(str(path))
        return path.exists() and path.stat().st_size > 1000
    except Exception as e:  # noqa: BLE001
        print(f"  edge-tts failed for {text!r}: {e}", file=sys.stderr)
        return False


def gtts(text: str, lang: str, path: pathlib.Path) -> bool:
    try:
        from gtts import gTTS

        gTTS(text, lang=lang).save(str(path))
        return path.exists() and path.stat().st_size > 500
    except Exception as e:  # noqa: BLE001
        print(f"  gTTS failed for {text!r}: {e}", file=sys.stderr)
        return False


async def make(lang: str, k: str, text: str, male: bool, sem: asyncio.Semaphore) -> None:
    female, man, gl = VOICES[lang]
    path = OUT / lang / f"{fname(lang, k, male)}.mp3"
    if path.exists() and path.stat().st_size > 500:
        return
    async with sem:
        for _ in range(3):
            if await edge(text, man if male else female, path):
                return
            await asyncio.sleep(1.5)
        if not await asyncio.to_thread(gtts, text, gl, path):
            path.unlink(missing_ok=True)


def compress(lang: str) -> None:
    """Re-encode new files to mono 32 kbps (about a third smaller than edge-tts output)."""
    if not shutil.which("ffmpeg"):
        print("ffmpeg yok — sıkıştırma atlandı")
        return
    folder = OUT / lang
    done_file = folder / DONE
    done = set(done_file.read_text().split()) if done_file.exists() else set()
    n = 0
    for f in folder.glob("*.mp3"):
        if f.name in done:
            continue
        tmp = f.with_suffix(".tmp.mp3")
        r = subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", str(f), "-ac", "1", "-ar", "22050", "-b:a", "32k", str(tmp)],
            check=False,
        )
        if r.returncode == 0 and tmp.exists() and tmp.stat().st_size > 300:
            tmp.replace(f)
            done.add(f.name)
            n += 1
        else:
            tmp.unlink(missing_ok=True)
    done_file.write_text("\n".join(sorted(done)))
    print(f"{lang}: {n} dosya sıkıştırıldı")


async def main() -> int:
    sem = asyncio.Semaphore(6)
    lines = [
        "// AUTO-GENERATED by scripts/generate_audio.py — do not edit.",
        "export const AUDIO: Record<string, number> = {",
    ]
    total = ok = 0
    for lang in VOICES:
        folder = OUT / lang
        folder.mkdir(parents=True, exist_ok=True)
        for old in folder.glob("*_s.mp3"):  # slow copies from older builds
            old.unlink()
        items = collect(lang)
        await asyncio.gather(*(make(lang, k, t, m, sem) for k, t, m in items))
        compress(lang)
        for k, _, m in items:
            total += 1
            n = folder / f"{fname(lang, k, m)}.mp3"
            if n.exists():
                ok += 1
                rel = f"../../assets/audio/{lang}"
                mapkey = f"{lang}{'#m' if m else ''}:{k}"
                lines.append(f"  {json.dumps(mapkey, ensure_ascii=False)}: require('{rel}/{n.name}'),")
        print(f"{lang}: {len(items)} texts")
    lines.append("};")
    MAP.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"audio ready: {ok}/{total}")
    # Missing clips fall back to on-device TTS; only fail if nothing was generated.
    return 1 if ok == 0 else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
