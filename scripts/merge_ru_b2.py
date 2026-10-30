#!/usr/bin/env python3
"""content/vocab/ru_b2.txt → extra 'yuksek' vocab units (u46+) in src/data/ru.json.

Line: tr|emoji|ru|okunuş|cinsiyet(m/f/n/boş)   Headers: "## Unit | subtitle", "# Lesson | intro"
Each lesson needs 7 words; words already in the course are reported.
"""
import json, pathlib, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
src = ROOT / "content" / "vocab" / "ru_b2.txt"
dst = ROOT / "src" / "data" / "ru.json"
dry = "--dry" in sys.argv
key = lambda s: s.replace("́", "").strip().lower()

units, errs = [], []
for n, raw in enumerate(src.read_text(encoding="utf-8").splitlines(), 1):
    line = raw.rstrip()
    if not line.strip() or line.startswith("#!"):
        continue
    if line.startswith("## "):
        t, _, s = line[3:].partition(" | "); units.append({"title": t.strip(), "sub": s.strip(), "lessons": []})
    elif line.startswith("# "):
        t, _, s = line[2:].partition(" | "); units[-1]["lessons"].append({"title": t.strip(), "intro": s.strip(), "rows": []})
    else:
        f = [x.strip() for x in line.split("|")]
        if len(f) != 5 or not f[0] or not f[2] or not f[3] or f[4] not in ("", "m", "f", "n"):
            errs.append(f"{n}: {line[:60]}"); continue
        units[-1]["lessons"][-1]["rows"].append(f)

d = json.loads(dst.read_text(encoding="utf-8"))
base = [u for u in d["units"] if int(u["id"][1:]) <= 45]
seen = set()
for u in base:
    for l in u["lessons"]:
        for v in l.get("v", []): seen.add(key(v[0]))
        for le in l.get("letters", []):
            for w in le["words"]: seen.add(key(w["t"]))
dups, new_units = [], []
for k, u in enumerate(units):
    uid = f"u{46 + k}"; ls = []
    for j, l in enumerate(u["lessons"]):
        if len(l["rows"]) != 7: errs.append(f"{u['title']} / {l['title']}: {len(l['rows'])} kelime")
        v = []
        for tr, e, t, read, g in l["rows"]:
            if key(t) in seen: dups.append(t)
            seen.add(key(t))
            item = [t, tr, read]
            if e or g: item.append(e)
            if g: item.append(g)
            v.append(item)
        ls.append({"id": f"{uid}l{j + 1}", "kind": "vocab", "title": l["title"], "subtitle": " · ".join(x[0] for x in v[:3]) + " …", "intro": l["intro"], "v": v})
    if len(u["lessons"]) != 5: errs.append(f"{u['title']}: {len(u['lessons'])} ders")
    new_units.append({"id": uid, "level": "yuksek", "title": u["title"], "subtitle": f"{u['sub']} · {len(ls)} ders", "lessons": ls})
if errs: print("HATALAR:\n" + "\n".join(errs))
if dups: print("ZATEN VAR:", ", ".join(dups))
print(f"{len(units)} ünite, {sum(len(u['lessons']) for u in new_units)} ders, {sum(len(l['v']) for u in new_units for l in u['lessons'])} kelime; toplam farklı: {len(seen)}")
if not dry and not errs and not dups:
    d["units"] = base + new_units
    dst.write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8")
    print("yazıldı")
