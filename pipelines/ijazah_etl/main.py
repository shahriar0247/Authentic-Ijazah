"""Authentic Ijazah — canonical corpus ETL.

Stages (idempotent — each truncates+reloads its own domain):
  sources        register provenance rows
  kg             lift hadith-kg.db (works, rawis+alems→persons, hadiths,
                 annotations, isnad routes/mentions, aqwal, meaning_groups,
                 embeddings, topics)
  muslimscholars ms CSV → persons + names + studied_under edges + places
  hawramani      hawramani CSV → persons (bios) + person_matches
  links          zenodo narrator_links → person_matches (hw↔ms)
  translations   hadith-json → hadith_translations (verified Arabic join)
  finalize       ANALYZE + stats into meta

ID namespaces (source PKs preserved where unique):
  hadith-kg rawi      ->  rawi.id        (1..49,844)
  hadith-kg alem      ->  1_000_000+id
  muslimscholars      ->  2_000_000+ms_id
  hawramani           ->  3_000_000+rownum
"""

from __future__ import annotations

import argparse
import json
import os
import sqlite3
import struct
import sys
import time
from pathlib import Path

import psycopg
from psycopg import sql as psql

from .normalize import normalize, normalize_rank, signature

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "raw"
KG_DB = RAW / "hadith-kg.db"
ER_DIR = RAW / "narrator_er" / "zenodo"
HJ_DIR = RAW / "hadith-json" / "db" / "by_book"

DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgresql://ijazah:ijazah@localhost:5433/ijazah"
)

NS_ALEM = 1_000_000
NS_MS = 2_000_000
NS_HW = 3_000_000

SOURCES = [
    ("hadith-kg", "الجامع Hadith Knowledge Graph (emadjumaah)", "dataset",
     "CC-BY-4.0", "https://huggingface.co/datasets/emadjumaah/hadith-kg",
     "Al-Jami' KG — attribute: github.com/qataruts/hadith"),
    ("muslimscholars", "Muslim Scholars Database (Arees Institute)", "dataset",
     "scrape — attribute", "https://muslimscholars.info",
     "muslimscholars.info — link back to scholar pages"),
    ("hawramani", "Hadith Transmitters Encyclopedia (Hawramani)", "dataset",
     "scrape — attribute", "https://hadithtransmitters.hawramani.com",
     "Ikram Hawramani — narrator encyclopedia"),
    ("zenodo-er", "Wirahman narrator entity-resolution corpus", "dataset",
     "open", "https://doi.org/10.5281/zenodo.21019693",
     "Linked biographical & transmission-graph data"),
    ("hadith-json", "AhmedBaset/hadith-json (sunnah.com dump)", "dataset",
     "open", "https://github.com/AhmedBaset/hadith-json",
     "English translations scraped from sunnah.com"),
]

# hadith-json filename -> substring(s) to locate the hadith-kg work title
COLLECTION_TITLES = {
    "bukhari": ["صحيح البخاري"],
    "muslim": ["صحيح مسلم"],
    "abudawud": ["سنن أبي داود", "سنن أبى داود"],
    "tirmidhi": ["جامع الترمذي", "الجامع الصحيح للترمذي"],
    "nasai": ["سنن النسائي", "السنن الكبرى للنسائي", "السنن الصغرى للنسائي"],
    "ibnmajah": ["سنن ابن ماجه"],
    "muwatta": ["الموطأ", "موطأ مالك"],
    "ahmad": ["مسند أحمد"],
    "darimi": ["سنن الدارمي", "مسند الدارمي"],
    "riyad_assalihin": ["رياض الصالحين"],
    "aladab_almufrad": ["الأدب المفرد"],
    "shamail_muhammadiyah": ["الشمائل المحمدية", "شمائل الترمذي"],
    "bulugh_almaram": ["بلوغ المرام"],
    "mishkat_almasabih": ["مشكاة المصابيح", "المصابيح"],
    "nawawi40": ["الأربعون النووية"],
    "qudsi40": ["الأربعون القدسية", "الحديث القدسي"],
}

# curated coords for the most common muslimscholars places (name-key match)
CITY_COORDS: dict[str, tuple[float, float]] = {
    "makkah": (21.4225, 39.8262), "mecca": (21.4225, 39.8262),
    "medina": (24.4709, 39.6118), "madina": (24.4709, 39.6118),
    "baghdad": (33.3152, 44.3661), "kufa": (32.0287, 44.4008),
    "basra": (30.5085, 47.7804), "damascus": (33.5138, 36.2765),
    "cairo": (30.0444, 31.2357), "jerusalem": (31.7665, 35.2254),
    "wasit": (32.1963, 46.3024), "rayy": (35.5993, 51.4353),
    "nishapur": (36.2133, 58.7958), "merv": (37.6627, 62.1925),
    "bukhara": (39.7681, 64.4556), "samarkand": (39.6542, 66.9597),
    "herat": (34.3529, 62.2040), "alexandria": (31.2001, 29.9187),
    "antioch": (36.2021, 36.1604), "harran": (36.8640, 39.0310),
    "qom": (34.6399, 50.8759), "isfahan": (32.6539, 51.6660),
    "homs": (34.7324, 36.7137), "aleppo": (36.2025, 37.1342),
    "mosul": (36.3566, 43.1640), "cordoba": (37.8882, -4.7794),
    "tarsus": (36.9178, 34.8949), "sanaa": (15.3547, 44.2066),
    "taif": (21.2703, 40.4158), "najaf": (31.9970, 44.3140),
    "samarra": (34.1938, 43.8752), "balkh": (36.7566, 66.8972),
    "ghazni": (33.5488, 68.4168), "delhi": (28.7041, 77.1025),
    "egypt": (30.0444, 31.2357), "sham": (33.5138, 36.2765),
    "andalusia": (37.8882, -4.7794), "khorasan": (36.3, 59.6),
    "hijaz": (23.8859, 39.0), "yemen": (15.5527, 48.5164),
    "iraq": (33.2232, 43.6793), "tahert": (35.37, 1.32),
    "qayrawan": (35.6781, 10.0963), "tunis": (36.8065, 10.1815),
    "marw": (37.6627, 62.1925), "jordan": (31.24, 36.51),
    "uk": (55.0, -2.0),
}


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def copy_rows(cur, table: str, cols: list[str], rows, batch: int = 50_000) -> int:
    """Stream rows into `table` via COPY FROM STDIN. `rows` is any iterable."""
    stmt = psql.SQL("COPY {} ({}) FROM STDIN").format(
        psql.Identifier(table),
        psql.SQL(", ").join(map(psql.Identifier, cols)),
    )
    n = 0
    with cur.copy(stmt) as cp:
        buf = []
        for r in rows:
            buf.append(r)
            if len(buf) >= batch:
                for rr in buf:
                    cp.write_row(rr)
                n += len(buf)
                buf.clear()
                log(f"    {table}: {n:,}+")
        for rr in buf:
            cp.write_row(rr)
        n += len(buf)
    return n


def stage_sources(cur) -> None:
    cur.execute("DELETE FROM sources")
    for slug, name, kind, lic, url, attr in SOURCES:
        cur.execute(
            """INSERT INTO sources (slug,name,kind,license,url,attribution)
               VALUES (%s,%s,%s,%s,%s,%s) ON CONFLICT (slug) DO UPDATE
               SET name=EXCLUDED.name""",
            (slug, name, kind, lic, url, attr),
        )
    log(f"sources: {len(SOURCES)}")


def src_id(cur, slug: str) -> int:
    return cur.execute("SELECT id FROM sources WHERE slug=%s", (slug,)).fetchone()[0]


def stage_kg(cur) -> None:
    log("stage kg: reading sqlite…")
    kg = sqlite3.connect(KG_DB)
    kg.row_factory = sqlite3.Row
    sid = src_id(cur, "hadith-kg")

    for t in [
        "hadith_annotations", "isnad_mentions", "isnad_routes",
        "hadith_occurrences", "topic_meanings", "topics", "assessments",
        "meaning_groups", "works", "person_names",
    ]:
        cur.execute(f"TRUNCATE {t} CASCADE")
    cur.execute("DELETE FROM persons WHERE id < %s OR (id >= %s AND id < %s)",
                (NS_ALEM, NS_ALEM, NS_MS))
    cur.execute("DELETE FROM hadith_translations WHERE source_id=%s", (sid,))
    cur.execute("DELETE FROM external_identifiers WHERE provider LIKE 'hkg%'")

    # --- works
    n = copy_rows(cur, "works",
        ["id", "title_ar", "author_name_ar", "collection_slug", "category",
         "city", "dar", "tabaa", "hadith_count", "source_id"],
        ((r["id"], r["name"], r["author_name"], str(r["tasnif_no"]),
          r["tasnif"], r["city"], r["dar"], r["tabaa"], r["hadith_qty"], sid)
         for r in kg.execute("SELECT * FROM books")))
    log(f"works: {n:,}")

    # --- rawis -> persons
    rawi_name: dict[int, str] = {}

    def rawi_rows():
        for r in kg.execute("SELECT * FROM rawis"):
            rawi_name[r["id"]] = r["name"]
            flags = {"is_bukhari": bool(r["is_bukhari"]),
                     "is_muslim": bool(r["is_muslim"]),
                     "has_tadlis": bool(r["has_tadlis"]),
                     "has_ikhtilat": bool(r["has_ikhtilat"]),
                     "riwaya_qty": r["riwaya_qty"],
                     "profession": r["profession"], "nasab": r["nasab"],
                     "iqama": r["iqama"], "death_place": r["death_place"],
                     "age_raw": r["age_raw"],
                     "birth_year_raw": r["birth_year_raw"],
                     "death_year_raw": r["death_year_raw"], "rank_no": r["rank_no"]}
            yield (r["id"], r["name"], None, None, r["nasab"], r["nickname"],
                   r["tabaka"], r["tabaka"], None, None, r["death_year"], r["death_year"],
                   r["rank"], normalize_rank(r["rank"]), None, None,
                   r["tabaka"] == 1, False, bool(r["is_stub"]), json.dumps(flags),
                   None, None, normalize(r["name"]))
    n = copy_rows(cur, "persons",
        ["id", "display_name_ar", "display_name_en", "kunya", "nisba", "laqab",
         "tabaqa", "generation_ord", "birth_ah_min", "birth_ah_max",
         "death_ah_min", "death_ah_max", "rank_ar", "rank_norm", "madhhab_fiqh",
         "aqidah_school", "is_companion", "is_critic", "is_stub", "flags",
         "bio_ar", "bio_en", "search_text"],
        rawi_rows())
    log(f"persons(rawis): {n:,}")

    # --- alems -> persons (is_critic), ids +1M
    def alem_rows():
        for r in kg.execute("SELECT * FROM alems"):
            flags = {"rank_no": r["rank_no"], "aqwal_qty": r["aqwal_qty"],
                     "notes": r["notes"], "shuhra": r["shuhra"]}
            yield (NS_ALEM + r["id"], r["name"], None, None, None, r["laqab"],
                   str(r["tabaka"]), r["tabaka"], None, None,
                   r["death_year"], r["death_year"],
                   r["rank"], normalize_rank(r["rank"]), None, None,
                   False, True, False, json.dumps(flags),
                   None, None, normalize(r["name"]))
    n = copy_rows(cur, "persons",
        ["id", "display_name_ar", "display_name_en", "kunya", "nisba", "laqab",
         "tabaqa", "generation_ord", "birth_ah_min", "birth_ah_max",
         "death_ah_min", "death_ah_max", "rank_ar", "rank_norm", "madhhab_fiqh",
         "aqidah_school", "is_companion", "is_critic", "is_stub", "flags",
         "bio_ar", "bio_en", "search_text"],
        alem_rows())
    log(f"persons(alems): {n:,}")

    # --- orphan mentions: rawi_ids referenced in hadith_rawis/sanad_rawis
    # that have no row in `rawis` -> stub persons (mention != person)
    orphans = {r[0] for r in kg.execute(
        "SELECT rawi_id FROM hadith_rawis UNION SELECT rawi_id FROM sanad_rawis")
        if r[0] is not None} - set(rawi_name)
    if orphans:
        n = copy_rows(cur, "persons",
            ["id", "display_name_ar", "is_stub", "flags"],
            ((oid, f"راوٍ #{oid}", True,
              json.dumps({"orphan_mention": True}))
             for oid in sorted(orphans)))
        log(f"persons(orphan stubs): {n:,}")

    # --- person_names (nicknames as variants)
    n = copy_rows(cur, "person_names",
        ["person_id", "kind", "value"],
        ((r["id"], "variant", r["nickname"])
         for r in kg.execute("SELECT id, nickname FROM rawis WHERE nickname IS NOT NULL AND nickname <> ''")))
    log(f"person_names(rawi nick): {n:,}")

    # --- meaning_groups (+ tarafs merged, embeddings decoded)
    taraf = {r["group_id"]: r for r in kg.execute("SELECT * FROM tarafs")}
    emb: dict[int, list[float]] = {}
    for r in kg.execute("SELECT group_id, vector FROM group_embedding"):
        b = r["vector"]
        if b and len(b) == 768 * 4:
            emb[r["group_id"]] = list(struct.unpack("<768f", b))

    def mg_rows():
        for r in kg.execute("SELECT * FROM meaning_groups"):
            g = taraf.get(r["id"])
            vec = emb.get(r["id"])
            yield (r["id"], (g["nass"][:1024] if g and g["nass"] else None),
                   g["matn"] if g else None, None,
                   g["nass"] if g else None, g["matn"] if g else None,
                   r["matn_no"], bool(r["is_qudsi"]),
                   r["sahaba_qty"], r["repeat_qty"],
                   f"[{','.join(f'{x:.6f}' for x in vec)}]" if vec else None)
    n = copy_rows(cur, "meaning_groups",
        ["id", "title_ar", "summary_ar", "summary_en", "taraf_nass",
         "taraf_hukm", "matn_no", "is_qudsi", "sahaba_qty", "repeat_qty",
         "embedding"],
        mg_rows())
    log(f"meaning_groups: {n:,} ({len(emb):,} embeddings)")

    # --- hadiths
    n = copy_rows(cur, "hadith_occurrences",
        ["id", "work_id", "hadith_no", "in_book_ref", "text_ar",
         "matn_start", "matn_end", "type", "meaning_group_id", "hukm",
         "search_text"],
        ((r["id"], r["book_id"], str(r["no_inbook"]), r["takhrij"],
          r["nass"], r["matn_start"], r["matn_end"], r["type"],
          r["group_id"], r["matn"],
          normalize(r["nass"]))
         for r in kg.execute("SELECT * FROM hadiths")))
    log(f"hadith_occurrences: {n:,}")

    # --- annotations: narrator mentions + quran quotes
    n1 = copy_rows(cur, "hadith_annotations",
        ["hadith_id", "kind", "start", "end", "person_id"],
        ((r["hadith_id"], "narrator", r["start"], r["end"], r["rawi_id"])
         for r in kg.execute("SELECT * FROM hadith_rawis")))
    n2 = copy_rows(cur, "hadith_annotations",
        ["hadith_id", "kind", "start", "end", "person_id"],
        ((r["hadith_id"], "quran", r["start"], r["end"], None)
         for r in kg.execute("SELECT * FROM hadith_ayas")))
    log(f"hadith_annotations: {n1 + n2:,}")

    # --- isnad routes + mentions
    n = copy_rows(cur, "isnad_routes",
        ["id", "hadith_id", "length", "max_rank", "hukm", "source_id"],
        ((r["id"], r["hadith_id"], r["length"], r["max_rank"], r["hukum"], sid)
         for r in kg.execute("SELECT * FROM sanads")))
    log(f"isnad_routes: {n:,}")

    n = copy_rows(cur, "isnad_mentions",
        ["route_id", "pos", "mention_text", "person_id", "identification_status"],
        ((r["sanad_id"], r["pos"], rawi_name.get(r["rawi_id"], "?"),
          r["rawi_id"], "verified")
         for r in kg.execute("SELECT * FROM sanad_rawis")))
    log(f"isnad_mentions: {n:,}")

    # --- assessments (aqwal)
    n = copy_rows(cur, "assessments",
        ["id", "critic_person_id", "target_person_id", "text_ar", "source_id"],
        ((r["id"], NS_ALEM + r["alem_id"], r["rawi_id"], r["qawl"], sid)
         for r in kg.execute("SELECT * FROM aqwal")))
    log(f"assessments: {n:,}")

    # --- topics (+ topic_meanings from group_id links)
    n = copy_rows(cur, "topics",
        ["id", "parent_id", "title_ar", "level", "lft", "rgt"],
        ((r["id"], r["parent_id"], r["name"], r["level"], r["lft"], r["rgt"])
         for r in kg.execute("SELECT * FROM topics")))
    log(f"topics: {n:,}")
    n = copy_rows(cur, "topic_meanings",
        ["topic_id", "meaning_group_id"],
        ((r["id"], r["group_id"])
         for r in kg.execute("SELECT * FROM topics WHERE group_id IS NOT NULL")))
    log(f"topic_meanings: {n:,}")

    # --- external ids
    n1 = copy_rows(cur, "external_identifiers",
        ["entity_kind", "entity_id", "provider", "external_id"],
        (( "person", r["id"], "hkg-rawi", str(r["id"]))
         for r in kg.execute("SELECT id FROM rawis")))
    n2 = copy_rows(cur, "external_identifiers",
        ["entity_kind", "entity_id", "provider", "external_id"],
        (("person", NS_ALEM + r["id"], "hkg-alem", str(r["id"]))
         for r in kg.execute("SELECT id FROM alems")))
    log(f"external_identifiers(hkg): {n1 + n2:,}")
    kg.close()


def _parse_ids(cell) -> list[int]:
    if not cell:
        return []
    try:
        v = json.loads(cell)
        return [int(x) for x in v] if isinstance(v, list) else []
    except Exception:
        return [int(x) for x in re_ids.findall(cell)]


import re
re_ids = re.compile(r"\d+")


def stage_muslimscholars(cur) -> None:
    import csv

    sid = src_id(cur, "muslimscholars")
    cur.execute("DELETE FROM persons WHERE id >= %s AND id < %s", (NS_MS, NS_HW))
    cur.execute("DELETE FROM external_identifiers WHERE provider='muslimscholars'")
    cur.execute("""DELETE FROM person_relationships
                   WHERE provenance->>'src'='muslimscholars'""")
    cur.execute("DELETE FROM person_place_events WHERE passage_id IS NULL AND person_id >= %s AND person_id < %s",
                (NS_MS, NS_HW))

    rows = list(csv.DictReader(open(ER_DIR / "muslimscholars_scholars.csv",
                                    encoding="utf-8")))
    log(f"muslimscholars rows: {len(rows):,}")

    def gen_ord(label: str | None) -> int | None:
        if not label:
            return None
        l = label.lower()
        if "comp" in l or "companion" in l:
            return 0
        if "succ" in l or "taba' tabi" in l:
            return 2
        if "tabi" in l or "follower" in l:
            return 1
        return None

    def persons_gen():
        for r in rows:
            ms = int(r["id"])
            flags = {"scholar_type": r["scholar_type"], "areas": r["areas"],
                     "death_cause": r["death_cause"], "grade": r["grade"],
                     "birth_approx": r["birth_approx"],
                     "death_approx": r["death_approx"]}
            by = int(float(r["birth_year_h"])) if r["birth_year_h"] else None
            dy = int(float(r["death_year_h"])) if r["death_year_h"] else None
            name_ar = (r["name_ar"] or "").strip() or None
            name_en = (r["name_en"] or "").strip() or None
            search = " ".join(filter(None, [normalize(name_ar),
                                            normalize(name_en),
                                            normalize(r["full_name_en"])]))
            yield (NS_MS + ms, name_ar or name_en or f"ms:{ms}", name_en,
                   r["kunya"] or None, None, None,
                   r["generation_label"], gen_ord(r["generation_label"]),
                   by, by, dy, dy,
                   r["grade"], None, None, None,
                   gen_ord(r["generation_label"]) == 0, False, False,
                   json.dumps(flags), None, None, search)
    n = copy_rows(cur, "persons",
        ["id", "display_name_ar", "display_name_en", "kunya", "nisba", "laqab",
         "tabaqa", "generation_ord", "birth_ah_min", "birth_ah_max",
         "death_ah_min", "death_ah_max", "rank_ar", "rank_norm", "madhhab_fiqh",
         "aqidah_school", "is_companion", "is_critic", "is_stub", "flags",
         "bio_ar", "bio_en", "search_text"], persons_gen())
    log(f"persons(ms): {n:,}")

    # names
    def names_gen():
        for r in rows:
            ms = NS_MS + int(r["id"])
            if r["name_ar"]:
                yield (ms, "ar", r["name_ar"].strip())
            if r["name_en"]:
                yield (ms, "en", r["name_en"].strip())
            if r["full_name_en"]:
                yield (ms, "translit", r["full_name_en"].strip())
    n = copy_rows(cur, "person_names", ["person_id", "kind", "value"], names_gen())
    log(f"person_names(ms): {n:,}")

    # studied_under edges (ms namespace)
    def rel_gen():
        for r in rows:
            sid_ms = NS_MS + int(r["id"])
            for t in _parse_ids(r["teacher_ids"]):
                yield (sid_ms, "studied_under", NS_MS + t, 1, "documented",
                       None, json.dumps({"src": "muslimscholars"}))
            for s in _parse_ids(r["student_ids"]):
                yield (NS_MS + s, "studied_under", sid_ms, 1, "documented",
                       None, json.dumps({"src": "muslimscholars"}))
    n = copy_rows(cur, "person_relationships",
        ["subject_id", "predicate", "object_id", "weight", "status",
         "passage_id", "provenance"],
        rel_gen())
    log(f"person_relationships(ms): {n:,}")

    # places + events
    place_ids: dict[str, int] = {}
    for row in cur.execute("SELECT id, lower(name_en), name_ar FROM places"):
        place_ids[row[1]] = row[0]
        place_ids[normalize(row[2])] = row[0]

    def get_place(name: str) -> int | None:
        key = normalize(name)
        if not key:
            return None
        if key in place_ids:
            return place_ids[key]
        coords = CITY_COORDS.get(key)
        cur.execute(
            "INSERT INTO places (name_ar, name_en, lat, lng, precision, source_id)"
            " VALUES (%s,%s,%s,%s,%s,%s) RETURNING id",
            (name.strip(), name.strip(),
             coords[0] if coords else None, coords[1] if coords else None,
             "exact" if coords else "unknown", sid))
        pid = cur.fetchone()[0]
        place_ids[key] = pid
        return pid

    def events_gen():
        for r in rows:
            pid = NS_MS + int(r["id"])
            by = int(float(r["birth_year_h"])) if r["birth_year_h"] else None
            dy = int(float(r["death_year_h"])) if r["death_year_h"] else None
            if r["birth_place"]:
                p = get_place(r["birth_place"])
                if p:
                    yield (pid, p, "born", by, by, None)
            if r["death_place"]:
                p = get_place(r["death_place"])
                if p:
                    yield (pid, p, "died", dy, dy, None)
            for stay in (r["places_of_stay"] or "").split("/"):
                p = get_place(stay) if stay.strip() else None
                if p:
                    yield (pid, p, "resided", None, None, None)
    n = copy_rows(cur, "person_place_events",
        ["person_id", "place_id", "kind", "ah_min", "ah_max", "passage_id"],
        events_gen())
    log(f"person_place_events(ms): {n:,}")

    # external ids
    n = copy_rows(cur, "external_identifiers",
        ["entity_kind", "entity_id", "provider", "external_id"],
        (("person", NS_MS + int(r["id"]), "muslimscholars", r["id"]) for r in rows))
    log(f"external_identifiers(ms): {n:,}")


def stage_hawramani(cur) -> None:
    import csv

    sid = src_id(cur, "hawramani")
    cur.execute("DELETE FROM persons WHERE id >= %s", (NS_HW,))
    cur.execute("DELETE FROM external_identifiers WHERE provider='hawramani'")

    rows = list(csv.DictReader(open(ER_DIR / "hawramani_narrators.csv",
                                    encoding="utf-8")))
    log(f"hawramani rows: {len(rows):,}")

    def gen():
        for i, r in enumerate(rows, 1):
            by = int(float(r["birth_year_ah"])) if r["birth_year_ah"] else None
            dy = int(float(r["death_year_ah"])) if r["death_year_ah"] else None
            try:
                grades = json.loads(r["grades"]) if r["grades"] else []
            except Exception:
                grades = []
            flags = {"grades": grades, "sources": r["source_book_ids"],
                     "entry_count": r["entry_count"]}
            yield (NS_HW + i, r["name_ar"], None, None, None, None, None, None,
                   by, by, dy, dy, None, None, None, None,
                   False, False, False, json.dumps(flags),
                   r["text_ar"][:60000] if r["text_ar"] else None,
                   None, normalize(r["name_ar"]))
    n = copy_rows(cur, "persons",
        ["id", "display_name_ar", "display_name_en", "kunya", "nisba", "laqab",
         "tabaqa", "generation_ord", "birth_ah_min", "birth_ah_max",
         "death_ah_min", "death_ah_max", "rank_ar", "rank_norm", "madhhab_fiqh",
         "aqidah_school", "is_companion", "is_critic", "is_stub", "flags",
         "bio_ar", "bio_en", "search_text"], gen())
    log(f"persons(hw): {n:,}")

    n = copy_rows(cur, "external_identifiers",
        ["entity_kind", "entity_id", "provider", "external_id"],
        (("person", NS_HW + i, "hawramani", r["url"])
         for i, r in enumerate(rows, 1)))
    log(f"external_identifiers(hw): {n:,}")

    # hawramani url -> person id lookup for links stage
    cur.execute("DROP TABLE IF EXISTS _hw_map")
    cur.execute("DROP TABLE IF EXISTS _hw_map_keep")
    cur.execute(
        "CREATE TEMP TABLE _hw_map (url text PRIMARY KEY, person_id bigint)")
    n = copy_rows(cur, "_hw_map", ["url", "person_id"],
        ((r["url"], NS_HW + i) for i, r in enumerate(rows, 1)))
    cur.execute("CREATE TEMP TABLE IF NOT EXISTS _hw_map_keep AS TABLE _hw_map")
    log(f"_hw_map: {n:,}")


def stage_links(cur) -> None:
    """person_matches: exact-normalized-name links across sources + zenodo hw↔ms."""
    import csv

    zsid = src_id(cur, "zenodo-er")
    cur.execute("DELETE FROM person_matches")

    # normalized name -> person ids (name-level exact match, unique only)
    name_map: dict[str, list[int]] = {}
    for pid, name in cur.execute(
            "SELECT id, display_name_ar FROM persons WHERE display_name_ar IS NOT NULL"):
        key = normalize(name)
        if len(key) >= 6:
            name_map.setdefault(key, []).append(pid)

    def match_gen():
        seen: set[tuple[int, int]] = set()
        for key, ids in name_map.items():
            if len(ids) < 2 or len(ids) > 3:
                continue
            for i in range(len(ids)):
                for j in range(i + 1, len(ids)):
                    a, b = sorted((ids[i], ids[j]))
                    if (a, b) in seen:
                        continue
                    seen.add((a, b))
                    yield (a, b, "exact_name", "high" if len(ids) == 2 else "medium",
                           "in_review", zsid)
    n = copy_rows(cur, "person_matches",
        ["person_a", "person_b", "method", "confidence", "status", "source_id"],
        match_gen())
    log(f"person_matches(name): {n:,}")

    # zenodo narrator_links: hw_url -> hw person; ms_id -> ms person
    hw_map = {u: p for u, p in cur.execute("SELECT url, person_id FROM _hw_map_keep")}
    ms_map = {eid: pid for pid, eid in cur.execute(
        "SELECT entity_id, external_id FROM external_identifiers WHERE provider='muslimscholars'")}

    def zen_gen():
        for r in csv.DictReader(open(ER_DIR / "narrator_links.csv", encoding="utf-8")):
            hw = hw_map.get(r["hw_url"])
            ms = ms_map.get(int(float(r["ms_id"])) if r["ms_id"] else None)
            if hw and ms and hw != ms:
                a, b = sorted((hw, ms))
                yield (a, b, "linked_corpus",
                       r["confidence"].lower() or "medium", "in_review", zsid)
    n = copy_rows(cur, "person_matches",
        ["person_a", "person_b", "method", "confidence", "status", "source_id"],
        zen_gen())
    log(f"person_matches(zenodo): {n:,}")


def stage_translations(cur) -> None:
    sid = src_id(cur, "hadith-json")
    cur.execute("DELETE FROM hadith_translations WHERE source_id=%s", (sid,))

    # work slug map
    works = {r[0]: r[1] for r in cur.execute("SELECT id, title_ar FROM works")}
    slug_work: dict[str, int] = {}
    for slug, pats in COLLECTION_TITLES.items():
        for wid, title in works.items():
            if any(p in title for p in pats):
                slug_work[slug] = wid
                break
    log(f"collection map: {len(slug_work)}/{len(COLLECTION_TITLES)} matched")

    total = matched = 0
    for json_path in HJ_DIR.rglob("*.json"):
        slug = json_path.stem
        wid = slug_work.get(slug)
        if not wid:
            continue
        data = json.load(open(json_path, encoding="utf-8"))
        items = data.get("hadiths", []) if isinstance(data, dict) else data
        # local index: no_inbook -> (id, normalized text)
        occ = {str(r[0]): (r[1], r[2]) for r in cur.execute(
            "SELECT hadith_no, id, text_ar FROM hadith_occurrences WHERE work_id=%s",
            (wid,))}

        def rows():
            nonlocal matched, total
            for h in items:
                en = h.get("english", {})
                if not en.get("text"):
                    continue
                total += 1
                rec = occ.get(str(h.get("idInBook")))
                if not rec:
                    continue
                oid, arabic = rec
                # verify: normalized arabic must share a substantial prefix
                if signature(arabic)[:60] != signature(h.get("arabic", ""))[:60]:
                    continue
                matched += 1
                yield (oid, "en", en.get("narrator"), en["text"], sid, "published")
        n = copy_rows(cur, "hadith_translations",
            ["hadith_id", "lang", "narrator", "text", "source_id", "status"], rows())
        log(f"  {slug}: {n:,} translations")
    log(f"translations: {matched:,}/{total:,} verified joins")


def stage_finalize(cur) -> None:
    cur.execute("ANALYZE")
    stats = {}
    for t in ["persons", "works", "hadith_occurrences", "hadith_translations",
              "hadith_annotations", "isnad_routes", "isnad_mentions",
              "assessments", "meaning_groups", "topics", "person_relationships",
              "person_matches", "places", "person_place_events",
              "external_identifiers"]:
        stats[t] = cur.execute(f"SELECT count(*) FROM {t}").fetchone()[0]
        log(f"  {t}: {stats[t]:,}")
    cur.execute(
        "INSERT INTO meta (key, value) VALUES ('etl_stats', %s)"
        " ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value",
        (json.dumps(stats),))
    cur.execute(
        "INSERT INTO meta (key, value) VALUES ('etl_finished_at', %s)"
        " ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value",
        (json.dumps(time.strftime("%Y-%m-%dT%H:%M:%S")),))


STAGES = {
    "sources": stage_sources,
    "kg": stage_kg,
    "muslimscholars": stage_muslimscholars,
    "hawramani": stage_hawramani,
    "links": stage_links,
    "translations": stage_translations,
    "finalize": stage_finalize,
}
ORDER = ["sources", "kg", "muslimscholars", "hawramani", "links",
         "translations", "finalize"]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("stages", nargs="*", default=ORDER,
                    help="stages to run (default: all)")
    args = ap.parse_args()
    stages = args.stages or ORDER

    t0 = time.time()
    with psycopg.connect(DATABASE_URL, autocommit=False) as conn:
        with conn.cursor() as cur:
            for s in stages:
                log(f"=== stage: {s} ===")
                STAGES[s](cur)
                conn.commit()
    log(f"done in {time.time() - t0:.0f}s")


if __name__ == "__main__":
    sys.exit(main())
