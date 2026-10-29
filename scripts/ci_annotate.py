#!/usr/bin/env python3
"""Turns the important lines of a build log into GitHub annotations.

Usage: ci_annotate.py <log> <error|warning> <title> [regex]
Annotations are readable through the API even when raw logs are not.
"""
import re
import sys

path, level, title = sys.argv[1], sys.argv[2], sys.argv[3]
pattern = re.compile(sys.argv[4] if len(sys.argv) > 4 else r"error|Error|ERROR|FAILED|What went wrong|Caused by|Could not|e: ")

try:
    lines = open(path, encoding="utf-8", errors="replace").read().splitlines()
except FileNotFoundError:
    sys.exit(0)

picked: list[str] = []
seen = set()
for i, line in enumerate(lines):
    if pattern.search(line):
        for l in lines[i : i + 3]:
            l = l.strip()[:400]
            if l and l not in seen:
                seen.add(l)
                picked.append(l)
if not picked:
    picked = [l.strip()[:400] for l in lines[-60:] if l.strip()]

esc = lambda s: s.replace("%", "%25").replace("\r", "").replace("\n", "%0A")
chunk, chunks = [], []
for l in picked[:240]:
    chunk.append(l)
    if sum(len(x) for x in chunk) > 3500:
        chunks.append(chunk)
        chunk = []
if chunk:
    chunks.append(chunk)
for n, c in enumerate(chunks[:9], 1):
    print(f"::{level} title={title} ({n})::{esc(chr(10).join(c))}")
