#!/usr/bin/env python3
"""Refresh Oche Live data from public PDC pages.

Conservative first version: reads PDC news/results pages, extracts explicit result lines,
and merges only recognized matches into data/pdc-live.json. It never guesses a result.
"""
from __future__ import annotations
import json, re, urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "pdc-live.json"

# Official PDC pages can be added here as tournaments progress. The updater is deliberately
# source-driven: if PDC has not published a result, the existing match remains unchanged.
SOURCES = [
    "https://www.pdc.tv/news/",
]
UA = "TheOcheLive/1.0 (+https://camdenguay12.github.io/darts-dashboard/)"
RESULT_RE = re.compile(r"([A-Z][A-Za-zÀ-ÖØ-öø-ÿ .’'\-]+?)\s+(\d+)\s*[-–]\s*(\d+)\s+([A-Z][A-Za-zÀ-ÖØ-öø-ÿ .’'\-]+)")

def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html"})
    with urllib.request.urlopen(req, timeout=25) as r:
        return r.read().decode("utf-8", "replace")

def textify(html: str) -> str:
    html = re.sub(r"<script\b[^>]*>.*?</script>", " ", html, flags=re.I|re.S)
    html = re.sub(r"<style\b[^>]*>.*?</style>", " ", html, flags=re.I|re.S)
    html = re.sub(r"<[^>]+>", " ", html)
    return re.sub(r"\s+", " ", html).replace("&amp;", "&")

def load():
    if OUT.exists():
        return json.loads(OUT.read_text(encoding="utf-8"))
    return {"updatedAt": None, "source": "PDC", "matches": []}

def key(a,b):
    return tuple(sorted((a.strip().lower(), b.strip().lower())))

data = load()
known = {key(m["player1"],m["player2"]): m for m in data.get("matches", [])}
seen_sources=[]
for url in SOURCES:
    try:
        page=textify(fetch(url)); seen_sources.append(url)
    except Exception as e:
        print(f"WARN {url}: {e}"); continue
    for p1,s1,s2,p2 in RESULT_RE.findall(page):
        k=key(p1,p2)
        if k not in known: continue
        m=known[k]
        if m["player1"].strip().lower()==p1.strip().lower(): m["score1"],m["score2"]=int(s1),int(s2)
        else: m["score1"],m["score2"]=int(s2),int(s1)
        m["status"]="final"; m["verifiedBy"]="PDC"

data["updatedAt"]=datetime.now(timezone.utc).isoformat()
data["source"]="PDC"
data["checkedSources"]=seen_sources
OUT.parent.mkdir(parents=True,exist_ok=True)
OUT.write_text(json.dumps(data,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
print(f"Wrote {OUT} with {len(data.get('matches',[]))} tracked matches")
