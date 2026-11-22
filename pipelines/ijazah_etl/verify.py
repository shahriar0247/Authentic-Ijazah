"""Post-ETL data-quality report — run: uv run python -m ijazah_etl.verify"""
from __future__ import annotations

import os
import psycopg

DB = os.environ.get("DATABASE_URL",
                    "postgresql://ijazah:ijazah@localhost:5433/ijazah")

CHECKS = [
    ("hadiths w/ search_text",
     "SELECT count(*) FROM hadith_occurrences WHERE search_text IS NOT NULL"),
    ("hadiths w/ embedding",
     "SELECT count(*) FROM hadith_occurrences WHERE embedding IS NOT NULL"),
    ("hadiths w/ routes",
     "SELECT count(DISTINCT hadith_id) FROM isnad_routes"),
    ("hadiths w/ en translation",
     "SELECT count(DISTINCT hadith_id) FROM hadith_translations WHERE lang='en'"),
    ("hadiths w/ narrator annotations",
     "SELECT count(DISTINCT hadith_id) FROM hadith_annotations WHERE kind='narrator'"),
    ("hadiths w/ quran annotations",
     "SELECT count(DISTINCT hadith_id) FROM hadith_annotations WHERE kind='quran'"),
    ("stub persons",
     "SELECT count(*) FROM persons WHERE is_stub"),
    ("companion persons",
     "SELECT count(*) FROM persons WHERE is_companion"),
    ("critic persons",
     "SELECT count(*) FROM persons WHERE is_critic"),
    ("persons w/ death AH",
     "SELECT count(*) FROM persons WHERE death_ah_min IS NOT NULL"),
    ("transmission edges",
     "SELECT count(*) FROM person_relationships WHERE predicate='narrated_from'"),
    ("studied_under edges",
     "SELECT count(*) FROM person_relationships WHERE predicate='studied_under'"),
    ("person_matches",
     "SELECT count(*) FROM person_matches"),
    ("places w/ coords",
     "SELECT count(*) FROM places WHERE lat IS NOT NULL"),
    ("person_place_events",
     "SELECT count(*) FROM person_place_events"),
    ("meaning groups w/ emb",
     "SELECT count(*) FROM meaning_groups WHERE embedding IS NOT NULL"),
    ("works",
     "SELECT count(*) FROM works"),
    ("topics",
     "SELECT count(*) FROM topics"),
    ("assessments",
     "SELECT count(*) FROM assessments"),
]

ORPHANS = [
    ("isnad_mentions.person_id",
     """SELECT count(*) FROM isnad_mentions m
        LEFT JOIN persons p ON p.id = m.person_id
        WHERE m.person_id IS NOT NULL AND p.id IS NULL"""),
    ("hadith_annotations.person_id",
     """SELECT count(*) FROM hadith_annotations a
        LEFT JOIN persons p ON p.id = a.person_id
        WHERE a.person_id IS NOT NULL AND p.id IS NULL"""),
    ("isnad_routes.hadith_id",
     """SELECT count(*) FROM isnad_routes r
        LEFT JOIN hadith_occurrences h ON h.id = r.hadith_id
        WHERE h.id IS NULL"""),
    ("person_relationships.subject",
     """SELECT count(*) FROM person_relationships r
        LEFT JOIN persons p ON p.id = r.subject_id WHERE p.id IS NULL"""),
]


def main() -> None:
    with psycopg.connect(DB) as conn, conn.cursor() as cur:
        print("=== coverage ===")
        for label, q in CHECKS:
            print(f"{label:35s} {cur.execute(q).fetchone()[0]:>12,}")
        print("\n=== orphans (should all be 0 — FK-enforced) ===")
        for label, q in ORPHANS:
            print(f"{label:35s} {cur.execute(q).fetchone()[0]:>12,}")

        print("\n=== spot checks ===")
        r = cur.execute(
            """SELECT h.id, w.title_ar, h.hadith_no, left(h.text_ar, 80)
               FROM hadith_occurrences h JOIN works w ON w.id = h.work_id
               WHERE w.title_ar LIKE '%بخاري%' ORDER BY h.id LIMIT 3""").fetchall()
        for row in r:
            print(" ", row[0], row[1][:30], "#" + str(row[2]), row[3][:60] + "…")
        top = cur.execute(
            """SELECT p.display_name_ar, count(*) c FROM person_relationships r
               JOIN persons p ON p.id = r.subject_id
               WHERE r.predicate='narrated_from'
               GROUP BY 1 ORDER BY c DESC LIMIT 8""").fetchall()
        print("\nmost prolific narrators (edges out):")
        for name, c in top:
            print(f"  {name[:40]:45s} {c:>6,}")


if __name__ == "__main__":
    main()
