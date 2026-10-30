#!/usr/bin/env python3
"""content/examples/<lang>.txt → src/data/examples/<lang>.json

Line format:  word|example sentence|Turkish translation
'word' is the course word exactly as in the pack (stress marks optional). Lines starting with '#' are comments.
Reports words without an example and examples whose word is not in the course.
"""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "content" / "examples"
OUT = ROOT / "src" / "data" / "examples"
LANGS = ("ru", "en", "de", "fr", "it")


def key(s: str) -> str:
    return s.replace("́", "").strip().lower()


def course_words(lang: str) -> dict[str, str]:
    words: dict[str, str] = {}
    packs = [json.loads((ROOT / "src" / "data" / f"{lang}.json").read_text(encoding="utf-8"))["units"]]
    g = ROOT / "src" / "data" / "grammar" / f"{lang}.json"
    if g.exists():
        packs.append([x["unit"] for x in json.loads(g.read_text(encoding="utf-8"))["units"]])
    for units in packs:
        for u in units:
            for l in u["lessons"]:
                for le in l.get("letters", []):
                    for w in le["words"]:
                        words.setdefault(key(w["t"]), w["t"])
                for w in l.get("words", []):
                    words.setdefault(key(w["t"]), w["t"])
                for v in l.get("v", []):
                    words.setdefault(key(v[0]), v[0])
    return words


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    problems = 0
    for lang in LANGS:
        src = SRC / f"{lang}.txt"
        data: dict[str, list[str]] = {}
        if src.exists():
            words = course_words(lang)
            for n, raw in enumerate(src.read_text(encoding="utf-8").splitlines(), 1):
                line = raw.strip()
                if not line or line.startswith("#"):
                    continue
                f = [x.strip() for x in line.split("|")]
                if len(f) != 3 or not all(f):
                    print(f"HATA {lang}.txt:{n} 3 alan olmalı: {line[:60]}")
                    problems += 1
                    continue
                k = key(f[0])
                if k not in words:
                    print(f"UYARI {lang}.txt:{n} kursta yok: {f[0]}")
                    continue
                data[k] = [f[1], f[2]]
            missing = [w for w in words if w not in data]
            print(f"{lang}: {len(data)}/{len(words)} kelimenin örneği var" + (f", eksik {len(missing)}: {', '.join(missing[:12])}…" if missing else ""))
        (OUT / f"{lang}.json").write_text(json.dumps(data, ensure_ascii=False, indent=0), encoding="utf-8")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
