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
NS_ORPHAN = 8_000_000  # orphan mention stubs: 8M + rawi_id (never collides)


def orphan_pid(rawi_id: int) -> int:
    return rawi_id if rawi_id < NS_MS else NS_ORPHAN + rawi_id

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
    ("hadith-app", "Al-Jami' app denormalized corpus (hadith-app.db)", "dataset",
     "CC-BY-4.0", "https://huggingface.co/datasets/emadjumaah/hadith-kg",
     "Enriched rawi metadata: exact AH years, Sahih flags, jarh flags"),
    ("editorial", "Authentic Ijazah editorial seed (aqidah/fiqh positions)",
     "editorial", "CC-BY-SA-4.0", "https://github.com/shahriar0247/Authentic-Ijazah",
     "Curated positions with attributed excerpts from primary works"),
]

# hadith-json filename -> substring(s) to locate the hadith-kg work title
COLLECTION_TITLES = {
    "bukhari": ["صحيح البخاري"],
    "muslim": ["صحيح مسلم"],
    "abudawud": ["سنن أبي داود", "سنن أبى داود"],
    "tirmidhi": ["جامع الترمذي", "الجامع الصحيح للترمذي", "الترمذي"],
    "nasai": ["السنن الكبرى للنسائي", "سنن النسائي"],
    "ibnmajah": ["سنن ابن ماجه", "ابن ماجه"],
    "malik": ["موطأ مالك رواية يحيى"],
    "ahmed": ["مسند أحمد"],
    "darimi": ["سنن الدارمي"],
    "riyad_assalihin": ["رياض الصالحين"],
    "aladab_almufrad": ["الأدب المفرد"],
    "shamail_muhammadiyah": ["الشمائل المحمدية", "شمائل الترمذي"],
    "bulugh_almaram": ["بلوغ المرام"],
    "mishkat_almasabih": ["مشكاة المصابيح", "المصابيح"],
    "nawawi40": ["الأربعون النووية", "أربعين"],
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
    for slug, name, kind, lic, url, attr in SOURCES:
        cur.execute(
            """INSERT INTO sources (slug,name,kind,license,url,attribution)
               VALUES (%s,%s,%s,%s,%s,%s) ON CONFLICT (slug) DO UPDATE
               SET name=EXCLUDED.name, kind=EXCLUDED.kind,
                   license=EXCLUDED.license, url=EXCLUDED.url,
                   attribution=EXCLUDED.attribution""",
            (slug, name, kind, lic, url, attr),
        )
    log(f"sources: {len(SOURCES)}")


def src_id(cur, slug: str) -> int:
    return cur.execute("SELECT id FROM sources WHERE slug=%s", (slug,)).fetchone()[0]


def purge_person_ns(cur, lo: int, hi: int) -> None:
    """Delete persons in [lo,hi) plus every row that references them."""
    for tbl, col in [
        ("person_names", "person_id"),
        ("person_relationships", "subject_id"),
        ("person_relationships", "object_id"),
        ("person_place_events", "person_id"),
        ("person_matches", "person_a"),
        ("person_matches", "person_b"),
        ("assessments", "critic_person_id"),
        ("assessments", "target_person_id"),
        ("position_attributions", "person_id"),
    ]:
        cur.execute(f"DELETE FROM {tbl} WHERE {col} >= %s AND {col} < %s",
                    (lo, hi))
    cur.execute("DELETE FROM external_identifiers WHERE entity_kind='person'"
                " AND entity_id >= %s AND entity_id < %s", (lo, hi))
    cur.execute("DELETE FROM persons WHERE id >= %s AND id < %s", (lo, hi))


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
    # dependents referencing persons < NS_MS (hkg + orphan stubs)
    cur.execute("""DELETE FROM person_relationships
                   WHERE subject_id < %s OR object_id < %s""", (NS_MS, NS_MS))
    cur.execute("""DELETE FROM person_matches
                   WHERE person_a < %s OR person_b < %s""", (NS_MS, NS_MS))
    cur.execute("DELETE FROM person_place_events WHERE person_id < %s", (NS_MS,))
    cur.execute("DELETE FROM position_attributions WHERE person_id < %s", (NS_MS,))
    cur.execute("DELETE FROM persons WHERE id < %s OR id >= %s",
                (NS_MS, NS_ORPHAN))
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
            ((orphan_pid(oid), f"راوٍ #{oid}", True,
              json.dumps({"orphan_mention": True, "rawi_id": oid}))
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
        ((r["hadith_id"], "narrator", r["start"], r["end"],
          orphan_pid(r["rawi_id"]) if r["rawi_id"] is not None else None)
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
          orphan_pid(r["rawi_id"]) if r["rawi_id"] is not None else None,
          "verified")
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
    purge_person_ns(cur, NS_MS, NS_HW)

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

    # studied_under edges (ms namespace) — only when both endpoints exist
    valid = {int(r["id"]) for r in rows}
    dropped = 0

    def rel_gen():
        nonlocal dropped
        seen: set[tuple[int, int]] = set()
        for r in rows:
            sid_ms = NS_MS + int(r["id"])
            for t in _parse_ids(r["teacher_ids"]):
                obj = NS_MS + t
                if t not in valid:
                    dropped += 1
                    continue
                if (sid_ms, obj) not in seen and obj != sid_ms:
                    seen.add((sid_ms, obj))
                    yield (sid_ms, "studied_under", obj, 1, "documented",
                           None, json.dumps({"src": "muslimscholars"}))
            for s in _parse_ids(r["student_ids"]):
                subj = NS_MS + s
                if s not in valid:
                    dropped += 1
                    continue
                if (subj, sid_ms) not in seen and subj != sid_ms:
                    seen.add((subj, sid_ms))
                    yield (subj, "studied_under", sid_ms, 1, "documented",
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
            "INSERT INTO places (name_en, lat, lng, precision, source_id)"
            " VALUES (%s,%s,%s,%s,%s) RETURNING id",
            (name.strip(),
             coords[0] if coords else None, coords[1] if coords else None,
             "exact" if coords else "unknown", sid))
        pid = cur.fetchone()[0]
        place_ids[key] = pid
        return pid

    # pass 1 — resolve every needed place BEFORE opening the COPY
    # (no cursor.execute inside a copy generator — it deadlocks)
    needed: set[str] = set()
    for r in rows:
        for v in (r["birth_place"], r["death_place"]):
            if v:
                needed.add(v)
        for stay in (r["places_of_stay"] or "").split("/"):
            if stay.strip():
                needed.add(stay)
    resolved = {name: get_place(name) for name in needed}
    log(f"ms places resolved: {len(resolved):,} "
        f"({sum(1 for p in resolved.values() if p)} found)")

    def events_gen():
        for r in rows:
            pid = NS_MS + int(r["id"])
            by = int(float(r["birth_year_h"])) if r["birth_year_h"] else None
            dy = int(float(r["death_year_h"])) if r["death_year_h"] else None
            if r["birth_place"]:
                p = resolved.get(r["birth_place"])
                if p:
                    yield (pid, p, "born", by, by, None)
            if r["death_place"]:
                p = resolved.get(r["death_place"])
                if p:
                    yield (pid, p, "died", dy, dy, None)
            for stay in (r["places_of_stay"] or "").split("/"):
                p = resolved.get(stay) if stay.strip() else None
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
    purge_person_ns(cur, NS_HW, NS_ORPHAN)

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
    hw_map = {u: p for p, u in cur.execute(
        "SELECT entity_id, external_id FROM external_identifiers"
        " WHERE provider='hawramani'")}
    ms_map = {str(eid): pid for pid, eid in cur.execute(
        "SELECT entity_id, external_id FROM external_identifiers WHERE provider='muslimscholars'")}

    def zen_gen():
        for r in csv.DictReader(open(ER_DIR / "narrator_links.csv", encoding="utf-8")):
            hw = hw_map.get(r["hw_url"])
            ms = ms_map.get(str(int(float(r["ms_id"]))) if r["ms_id"] else None)
            if hw and ms and hw != ms:
                a, b = sorted((hw, ms))
                yield (a, b, "linked_corpus",
                       r["confidence"].lower() or "medium", "in_review", zsid)
    n = copy_rows(cur, "person_matches",
        ["person_a", "person_b", "method", "confidence", "status", "source_id"],
        zen_gen())
    log(f"person_matches(zenodo): {n:,}")


def stage_sanadset(cur) -> None:
    """Zenodo ER: resolve Sanadset bare narrator names onto persons and emit
    transmission edges (narrated_from) + chain-context identity matches."""
    import csv

    sid = src_id(cur, "zenodo-er")
    cur.execute("""DELETE FROM person_relationships
                   WHERE provenance->>'src'='zenodo-er'""")
    cur.execute("""DELETE FROM person_matches
                   WHERE method IN ('sanadset_chain','sanadset_link')""")

    hw_map = {u: p for p, u in cur.execute(
        "SELECT entity_id, external_id FROM external_identifiers"
        " WHERE provider='hawramani'")}
    ms_map = {str(u): p for p, u in cur.execute(
        "SELECT entity_id, external_id FROM external_identifiers"
        " WHERE provider='muslimscholars'")}

    # --- bare name -> person (prefer direct hw/ms links, then chain_ms)
    bare2pid: dict[str, int] = {}
    chain_matches: dict[tuple[int, int], str] = {}
    for r in csv.DictReader(open(ER_DIR / "sanad_links.csv", encoding="utf-8")):
        pid = hw_map.get(r["hw_url"]) \
            or ms_map.get(str(int(float(r["ms_id"]))) if r["ms_id"] else None)
        chain_ms = (str(int(float(r["chain_ms_id"])))
                    if r["chain_ms_id"] else None)
        chain_pid = ms_map.get(chain_ms) if chain_ms else None
        if pid is None and chain_pid is not None:
            pid = chain_pid
        if pid:
            bare2pid[normalize(r["bare"])] = pid
        # hw <-> chain_ms identity pairs
        if hw_map.get(r["hw_url"]) and chain_pid and hw_map[r["hw_url"]] != chain_pid:
            a, b = sorted((hw_map[r["hw_url"]], chain_pid))
            chain_matches.setdefault(
                (a, b), (r["chain_confidence"] or "medium").lower())
    log(f"sanadset: {len(bare2pid):,} bare names resolved "
        f"(of {185_217:,}), {len(chain_matches):,} chain-context matches")

    n = copy_rows(cur, "person_matches",
        ["person_a", "person_b", "method", "confidence", "status", "source_id"],
        ((a, b, "sanadset_chain", conf, "in_review", sid)
         for (a, b), conf in chain_matches.items()))
    log(f"person_matches(sanadset_chain): {n:,}")

    # --- transmission edges
    edges: dict[tuple[int, int], int] = {}
    for r in csv.DictReader(open(ER_DIR / "narrator_edges.csv", encoding="utf-8")):
        stu = bare2pid.get(normalize(r["bare"]))
        tea = bare2pid.get(normalize(r["teacher"]))
        if not stu or not tea or stu == tea:
            continue
        key = (stu, tea)
        try:
            w = int(float(r["weight"] or 1))
        except ValueError:
            w = 1
        edges[key] = edges.get(key, 0) + w

    n = copy_rows(cur, "person_relationships",
        ["subject_id", "predicate", "object_id", "weight", "status",
         "provenance"],
        ((stu, "narrated_from", tea, w, "inferred",
          json.dumps({"src": "zenodo-er"}))
         for (stu, tea), w in edges.items()))
    log(f"person_relationships(sanadset): {n:,} resolved edges")


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
        # index occurrences by text signature: numbering schemes differ between
        # corpora (sunnah.com splits mu'allaq chains), so join on text itself.
        occ: dict[str, list[tuple[int, str]]] = {}
        for oid, text in cur.execute(
            "SELECT id, text_ar FROM hadith_occurrences WHERE work_id=%s", (wid,)):
            s = signature(text)
            occ.setdefault(s[:80], []).append((oid, s))

        def lcp_match(cands: list[tuple[int, str]], sig: str) -> int | None:
            best, bscore = None, 0
            for oid, s in cands:
                i = 0
                for a, b in zip(sig, s):
                    if a != b:
                        break
                    i += 1
                if i > bscore:
                    bscore, best = i, oid
            return best if bscore >= 120 or bscore >= len(sig) // 2 else None

        def rows():
            nonlocal matched, total
            for h in items:
                en = h.get("english", {})
                if not en.get("text"):
                    continue
                total += 1
                sig = signature(h.get("arabic", ""))
                cands = occ.get(sig[:80])
                if not cands:
                    continue
                oid = cands[0][0] if len(cands) == 1 else lcp_match(cands, sig)
                if not oid:
                    continue
                matched += 1
                yield (oid, "en", en.get("narrator"), en["text"], sid, "published")
        n = copy_rows(cur, "hadith_translations",
            ["hadith_id", "lang", "narrator", "text", "source_id", "status"], rows())
        log(f"  {slug}: {n:,} translations")
    log(f"translations: {matched:,}/{total:,} verified joins")


AR_CITY: dict[str, str] = {
    "مكه": "mecca", "المدينه": "medina", "بغداد": "baghdad",
    "الكوفه": "kufa", "البصره": "basra", "دمشق": "damascus",
    "مصر": "cairo", "القاهره": "cairo", "بيت المقدس": "jerusalem",
    "القدس": "jerusalem", "واسط": "wasit", "الري": "rayy",
    "نيسابور": "nishapur", "مرو": "merv", "بخارا": "bukhara",
    "سمرقند": "samarkand", "هراة": "herat", "الاسكندريه": "alexandria",
    "انطاكيه": "antioch", "حران": "harran", "قم": "qom",
    "اصطخر": None, "اصفهان": "isfahan", "حمص": "homs", "حلب": "aleppo",
    "الموصل": "mosul", "قرطبه": "cordoba", "طرسوس": "tarsus",
    "صنعاء": "sanaa", "الطائف": "taif", "النجف": "najaf",
    "سامراء": "samarra", "بلخ": "balkh", "غزه": "ghazni",
    "الشام": "sham", "خراسان": "khorasan", "الحجاز": "hijaz",
    "اليمن": "yemen", "العراق": "iraq", "الاندلس": "andalusia",
    "القيروان": "qayrawan", "تونس": "tunis", "جرجان": None,
    "همذان": None, "فارس": None, "شيراز": None, "تستر": None,
    "سجستان": None, "طبرستان": None, "الجزيره": "jordan",
}


def _place_for(cur, key: str, sid: int) -> int | None:
    """Find or create a place row for normalized (ar/en) key."""
    row = cur.execute(
        "SELECT id FROM places WHERE lower(name_en)=%s OR name_ar=%s LIMIT 1",
        (key, key)).fetchone()
    if row:
        return row[0]
    en = AR_CITY.get(key)
    coords = CITY_COORDS.get(en) if en else None
    cur.execute(
        "INSERT INTO places (name_ar, name_en, lat, lng, precision, source_id)"
        " VALUES (%s,%s,%s,%s,%s,%s) RETURNING id",
        (key if not key.isascii() else None,
         en if en else (key if key.isascii() else None),
         coords[0] if coords else None, coords[1] if coords else None,
         "exact" if coords else "unknown", sid))
    return cur.fetchone()[0]


def stage_kg_geo(cur) -> None:
    """Derive person_place_events from rawi flags (iqama, death_place) and
    critic free-text, using the curated gazetteer."""
    sid = src_id(cur, "hadith-kg")
    cur.execute("""DELETE FROM person_place_events
                   WHERE passage_id IS NULL AND person_id < %s""", (NS_MS,))
    cur.execute("DELETE FROM places WHERE source_id=%s", (sid,))

    rows = cur.execute(
        """SELECT id, flags->>'iqama' AS iqama, flags->>'death_place' AS dpl
           FROM persons WHERE id < %s AND flags ? 'iqama'""", (NS_MS,))
    rows = list(rows)

    # pass 1 — resolve all place names BEFORE the COPY (no cur.execute inside)
    needed = {normalize(v) for _, i, d in rows for v in (i, d) if v}
    needed = {k for k in needed if len(k) >= 3}
    resolved = {k: _place_for(cur, k, sid) for k in needed}
    log(f"kg_geo: {len(needed):,} place names, "
        f"{sum(1 for p in resolved.values() if p)} resolved")

    def events():
        for pid, iqama, dpl in rows:
            for kind, val in (("resided", iqama), ("died", dpl)):
                if not val:
                    continue
                p = resolved.get(normalize(val))
                if p:
                    yield (pid, p, kind, None, None, None)

    n = copy_rows(cur, "person_place_events",
                  ["person_id", "place_id", "kind", "ah_min", "ah_max",
                   "passage_id"], events())
    log(f"kg_geo: {n:,} events over {len(needed):,} places")


def stage_appdb(cur) -> None:
    """hadith-app.db -> enrich persons: exact birth/death AH, death-place
    events, Sahih narrator flags (isBukhari/isMuslim), jarh flags
    (hasTadlis/hasIkhtilat). Same corpus as hadith-kg — rawiId is 1:1."""
    f = RAW / "hadith-app.db"
    if not f.exists():
        log("hadith-app.db missing — skipped")
        return
    sid = src_id(cur, "hadith-app")
    adb = sqlite3.connect(f)
    adb.row_factory = sqlite3.Row

    cur.execute("DROP TABLE IF EXISTS _rawi_meta")
    cur.execute("""CREATE TEMP TABLE _rawi_meta (
                   id bigint PRIMARY KEY, birth int, death int,
                   death_place text, flags jsonb)""")

    def meta_rows():
        for r in adb.execute(
            """SELECT rawiId, birthYear, deathYear, deathPlace, ageRaw,
                      isBukhari, isMuslim, hasTadlis, hasIkhtilat
               FROM rawis"""):
            flags = {k: bool(r[k]) for k in
                     ("isBukhari", "isMuslim", "hasTadlis", "hasIkhtilat")
                     if r[k]}
            if r["ageRaw"]:
                flags["age"] = r["ageRaw"]
            yield (r["rawiId"], r["birthYear"], r["deathYear"],
                   r["deathPlace"], json.dumps(flags, ensure_ascii=False))
    copy_rows(cur, "_rawi_meta",
              ["id", "birth", "death", "death_place", "flags"], meta_rows())

    cur.execute("""UPDATE persons p SET
                     birth_ah_min = COALESCE(p.birth_ah_min, m.birth),
                     birth_ah_max = COALESCE(p.birth_ah_max, m.birth),
                     death_ah_min = COALESCE(p.death_ah_min, m.death),
                     death_ah_max = COALESCE(p.death_ah_max, m.death),
                     flags = COALESCE(p.flags,'{}'::jsonb) || m.flags
                   FROM _rawi_meta m WHERE p.id = m.id""")
    log(f"appdb: {cur.rowcount:,} persons enriched")

    # death places -> events (replaces kg_geo 'died' events for same people)
    cur.execute("""DELETE FROM person_place_events
                   WHERE kind='died' AND passage_id IS NULL
                     AND person_id < %s""", (NS_MS,))
    names = {r[0] for r in adb.execute(
        "SELECT DISTINCT deathPlace FROM rawis WHERE deathPlace IS NOT NULL"
        " AND deathPlace != ''")}
    names = {normalize(n) for n in names if len(normalize(n)) >= 3}
    resolved = {k: _place_for(cur, k, sid) for k in names}
    pid_place = [(r["rawiId"], resolved.get(normalize(r["deathPlace"])))
                 for r in adb.execute(
                     "SELECT rawiId, deathPlace FROM rawis"
                     " WHERE deathPlace IS NOT NULL AND deathPlace != ''")]
    n = copy_rows(cur, "person_place_events",
                  ["person_id", "place_id", "kind", "ah_min", "ah_max",
                   "passage_id"],
                  ((pid, p, "died", None, None, None)
                   for pid, p in pid_place if p))
    adb.close()
    log(f"appdb: {n:,} death-place events")


def stage_positions(cur) -> None:
    """Seed attributed aqidah/fiqh positions (editorial content).
    Each attribution links a person + stance + qualifier; excerpts are
    stored as source_passages for provenance and linked as evidence."""
    seed = Path(__file__).parent / "positions_seed.json"
    if not seed.exists():
        log("positions_seed.json missing — skipped")
        return
    sid = src_id(cur, "editorial")
    data = json.loads(seed.read_text(encoding="utf-8"))

    cur.execute("""DELETE FROM position_evidence e USING position_attributions a
                   JOIN positions p ON p.id = a.position_id
                   WHERE e.attribution_id = a.id""")
    cur.execute("DELETE FROM position_attributions")
    cur.execute("DELETE FROM positions")
    cur.execute("DELETE FROM source_passages WHERE source_id=%s", (sid,))

    np_ = na = ne = 0
    for pos in data:
        pid = cur.execute(
            "INSERT INTO positions (domain, proposition_ar, proposition_en)"
            " VALUES (%s,%s,%s) RETURNING id",
            (pos["domain"], pos["proposition_ar"],
             pos.get("proposition_en"))).fetchone()[0]
        np_ += 1
        for a in pos.get("attributions", []):
            aid = cur.execute(
                """INSERT INTO position_attributions
                     (position_id, person_id, stance, qualifier_ar, status)
                   VALUES (%s,%s,%s,%s,%s) RETURNING id""",
                (pid, a["person_id"], a.get("stance", "unknown"),
                 a.get("qualifier_ar"), a.get("status", "draft"))).fetchone()[0]
            na += 1
            if a.get("excerpt_ar") or a.get("excerpt_en"):
                pgid = cur.execute(
                    """INSERT INTO source_passages
                         (source_id, locator, text_ar)
                       VALUES (%s,%s,%s) RETURNING id""",
                    (sid, a.get("excerpt_source"), a.get("excerpt_ar")),
                ).fetchone()[0]
                cur.execute(
                    """INSERT INTO position_evidence
                         (attribution_id, passage_id, excerpt_ar, excerpt_en)
                       VALUES (%s,%s,%s,%s)""",
                    (aid, pgid, a.get("excerpt_ar"), a.get("excerpt_en")))
                ne += 1
    log(f"positions: {np_} positions, {na} attributions, {ne} evidence")


def stage_embeddings(cur) -> None:
    """matn-embedding.db -> hadith_occurrences.embedding.
    Vectors are 768 int8-quantized values; stored as float (cosine <=> is
    scale-invariant so dequantization isn't needed for distance)."""
    cur.execute("DROP TABLE IF EXISTS _hadith_emb")
    cur.execute("CREATE TEMP TABLE _hadith_emb (hid bigint PRIMARY KEY, v text)")
    total = 0
    for fname, tbl in (("matn-embedding.db", "matn_embedding"),
                       ("athar-embedding.db", "athar_embedding")):
        f = RAW / fname
        if not f.exists():
            log(f"{fname} missing — skipped")
            continue
        edb = sqlite3.connect(f)
        edb.row_factory = sqlite3.Row

        def rows():
            for r in edb.execute(f"SELECT hid, vec FROM {tbl}"):
                b = r["vec"]
                if not b or len(b) != 768:
                    continue
                q = struct.unpack("<768b", b)
                yield (r["hid"], "[" + ",".join(str(x) for x in q) + "]")
        n = copy_rows(cur, "_hadith_emb", ["hid", "v"], rows())
        total += n
        edb.close()
        log(f"  {tbl}: staged {n:,}")
    cur.execute("""UPDATE hadith_occurrences h SET embedding = e.v::vector
                   FROM _hadith_emb e
                   WHERE e.hid = h.id AND h.embedding IS NULL""")
    log(f"hadith embeddings: staged {total:,}, set {cur.rowcount:,}")


def stage_finalize(cur) -> None:
    # heuristic verdict classification of jarh wa-taʿdil wording (source text
    # remains authoritative; this is a search/filter aid only)
    cur.execute(r"""
        UPDATE assessments SET verdict_class =
          CASE
            WHEN text_ar ~ 'ليس بثقه|لا يحتج به|ضعيف|متروك|كذاب|كذب|واه|ساقط|منكر الحديث|متهم|مجهول|لا يعرف'
              THEN 'jarh'::verdict_class
            WHEN text_ar ~ 'ثقه|ثبت|حافظ|امام|متقن|عدل|مقبول|صدوق|لا باس به|لا اس به'
              THEN 'tadil'::verdict_class
            ELSE NULL
          END
        WHERE verdict_class IS NULL""")
    log(f"assessments classified: {cur.rowcount:,}")

    # normalized search_text for meaning groups (title = taraf nass)
    try:
        rows = cur.execute(
            "SELECT id, title_ar FROM meaning_groups"
            " WHERE search_text IS NULL AND title_ar IS NOT NULL").fetchall()
        for gid, title in rows:
            cur.execute("UPDATE meaning_groups SET search_text=%s WHERE id=%s",
                        (normalize(title), gid))
        log(f"meaning_groups.search_text: {len(rows):,}")
    except psycopg.errors.UndefinedColumn:
        log("meaning_groups.search_text column missing — run migration")
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
    "sanadset": stage_sanadset,
    "translations": stage_translations,
    "kg_geo": stage_kg_geo,
    "appdb": stage_appdb,
    "positions": stage_positions,
    "embeddings": stage_embeddings,
    "finalize": stage_finalize,
}
ORDER = ["sources", "kg", "muslimscholars", "hawramani", "links",
         "sanadset", "translations", "kg_geo", "appdb", "positions",
         "embeddings", "finalize"]


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
