#!/usr/bin/env python3
"""Builds src/data/grammar/<lang>.json from the compact source files content/grammar/<lang>.txt.

Format (one item per line, '|' separated):
  == unitId|level|kind|after|title|subtitle        kind: grammar/dialog/text, after: unit id or 'end'
  -- grammar|title|intro
  R  rule title|rule text
  E  example sentence|Turkish
  Q  sentence with ___|answer|wrong1;wrong2;wrong3|Turkish|why (optional)
  -- dialog|title|intro|speaker A|speaker B
  A  line|Turkish          (speaker A, female voice)
  B  line|Turkish          (speaker B, male voice — the learner says these)
  -- text|title|intro
  T  text            TR  translation
  G  word|Turkish    Q   question|answer|wrong1;wrong2;wrong3
Lines starting with '#' are comments.
"""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "content" / "grammar"
OUT = ROOT / "src" / "data" / "grammar"


def build(lang: str) -> tuple[dict, list[str]]:
    units, errs = [], []
    unit = lesson = None
    for n, raw in enumerate((SRC / f"{lang}.txt").read_text(encoding="utf-8").splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        tag, _, rest = line.partition(" ")
        f = [x.strip() for x in rest.split("|")]
        where = f"{lang}.txt:{n}"
        try:
            if tag == "==":
                uid, level, kind, after, title, sub = f
                unit = {"id": uid, "level": level, "kind": kind, "title": title, "subtitle": sub, "lessons": []}
                units.append({"after": after, "unit": unit})
            elif tag == "--":
                kind = f[0]
                lesson = {"id": f"{unit['id']}l{len(unit['lessons']) + 1}", "kind": kind, "title": f[1], "subtitle": "", "intro": f[2]}
                if kind == "grammar":
                    lesson.update(rules=[], drills=[])
                elif kind == "dialog":
                    lesson["dialog"] = {"who": [f[3], f[4]], "lines": []}
                elif kind == "text":
                    lesson["text"] = {"t": "", "tr": "", "gloss": [], "qs": []}
                unit["lessons"].append(lesson)
            elif tag == "R":
                lesson["rules"].append({"title": f[0], "text": f[1], "examples": []})
            elif tag == "E":
                lesson["rules"][-1]["examples"].append({"t": f[0], "tr": f[1], "read": ""})
            elif tag == "Q" and lesson["kind"] == "grammar":
                s, a, o, tr = f[0], f[1], [x.strip() for x in f[2].split(";") if x.strip()], f[3]
                if s.count("___") != 1:
                    raise ValueError("boşluk (___) tam bir kez olmalı")
                if a in o or len(o) < 2:
                    raise ValueError("yanlış şıklar hatalı")
                d = {"s": s, "a": a, "o": o, "tr": tr}
                if len(f) > 4 and f[4]:
                    d["why"] = f[4]
                lesson["drills"].append(d)
            elif tag == "Q" and lesson["kind"] == "text":
                o = [x.strip() for x in f[2].split(";") if x.strip()]
                if f[1] in o or len(o) < 2:
                    raise ValueError("yanlış şıklar hatalı")
                lesson["text"]["qs"].append({"q": f[0], "a": f[1], "o": o})
            elif tag in ("A", "B"):
                lesson["dialog"]["lines"].append({"p": 0 if tag == "A" else 1, "t": f[0], "tr": f[1]})
            elif tag == "T":
                lesson["text"]["t"] = rest.strip()
            elif tag == "TR":
                lesson["text"]["tr"] = rest.strip()
            elif tag == "G":
                lesson["text"]["gloss"].append([f[0], f[1]])
            else:
                raise ValueError(f"bilinmeyen satır: {tag}")
        except Exception as e:  # noqa: BLE001
            errs.append(f"{where}: {e} :: {line[:70]}")
    # subtitles + sanity checks
    for u in units:
        for ls in u["unit"]["lessons"]:
            k = ls["kind"]
            if k == "grammar":
                ls["subtitle"] = " · ".join(r["title"] for r in ls["rules"])
                if len(ls["drills"]) < 4 or not ls["rules"] or any(len(r["examples"]) < 2 for r in ls["rules"]):
                    errs.append(f"{lang} {ls['id']}: en az 4 alıştırma ve kural başına 2 örnek gerekli")
            elif k == "dialog":
                lines = ls["dialog"]["lines"]
                ls["subtitle"] = lines[0]["t"] if lines else ""
                if len(lines) < 6 or not any(x["p"] == 1 for x in lines):
                    errs.append(f"{lang} {ls['id']}: diyalog en az 6 replik olmalı")
            elif k == "text":
                tx = ls["text"]
                ls["subtitle"] = " ".join(tx["t"].split()[:6]) + " …"
                if not tx["t"] or not tx["tr"] or len(tx["gloss"]) < 4 or len(tx["qs"]) < 3:
                    errs.append(f"{lang} {ls['id']}: metin, çeviri, 4+ sözlük, 3+ soru gerekli")
        u["unit"]["subtitle"] = f"{u['unit']['subtitle']} · {len(u['unit']['lessons'])} ders"
    return {"units": units, "upcoming": []}, errs


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    bad = 0
    for lang in ("ru", "en", "de", "fr", "it"):
        if not (SRC / f"{lang}.txt").exists():
            print(f"{lang}: kaynak yok")
            bad += 1
            continue
        data, errs = build(lang)
        for e in errs:
            print("HATA", e)
        bad += len(errs)
        (OUT / f"{lang}.json").write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
        ls = [l for u in data["units"] for l in u["unit"]["lessons"]]
        print(f"{lang}: {len(data['units'])} ünite, {len(ls)} ders, {sum(len(l.get('drills', [])) for l in ls)} alıştırma, {sum(len(l['dialog']['lines']) for l in ls if l['kind'] == 'dialog')} replik")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
