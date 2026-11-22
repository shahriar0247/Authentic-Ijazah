# Authentic Ijazah — الإجازة الموثوقة

An Arabic-first research platform for hadith sciences: isnad chains as merged
DAGs, narrator dossiers with jarh wa-taʿdil, teacher/student transmission
networks, transmission geography, timelines, and a source-cited aqidah/fiqh
positions layer.

## Corpus (current)

| layer | rows | source |
|---|---|---|
| hadith occurrences | 715,790 | Al-Jamiʿ hadith-kg (425 collections) |
| isnad routes | 577,024 | same — `sanads` |
| chain mentions | ~4.4M | same — `sanad_rawis` |
| narrator dossiers | ~51K hkg + 25K ms + ~135K hw | hkg `rawis`+`alems`, MuslimScholars, Hawramani |
| jarh wa-taʿdil | ~128K | hkg `aqwal` (1,015 critics) |
| meaning groups | 20,745 (+768-d vectors) | hkg `meaning_groups`+`group_embedding` |
| subject tree | ~55K | hkg `topics` |
| transmission edges | ~814K observed | Zenodo ER narrator_edges (Sanadset) |
| identity links | ~190K candidate pairs | Zenodo ER narrator/sanad links |
| translations | en/ar by verified join | AhmedBaset/hadith-json |

## Stack

- `apps/web` — Next.js 16 + React 19 + Tailwind v4 + next-intl (ar RTL / en),
  React Flow + ELK layered isnad DAGs, MapLibre map, AH timeline.
- `apps/api` — Fastify + postgres.js, raw SQL graph CTEs, pg_trgm Arabic search,
  pgvector similarity.
- `packages/db` — Drizzle schema (24 tables) + drizzle-kit migrations.
- `pipelines` — Python + uv + psycopg COPY ETL (idempotent stages).

## Canonical invariants

- **mention ≠ person** — text-level narrator mentions (`hadith_annotations`,
  `isnad_mentions`) are separate from resolved `persons`; orphan mentions get
  flagged stub persons, never silently merged.
- **narrated-from ≠ studied-under** — chain-derived edges are `observed`
  transmission; `documented` is reserved for biographical sources.
- **every claim has provenance** — `sources` registry, `external_identifiers`,
  `person_matches` (method/confidence/status), `position_*` editorial review.

## Run

```bash
pnpm install                              # hoisted nodeLinker (turbopack)
docker/podman compose up -d db            # pg17 + postgis + pgvector
pnpm --filter @ijazah/db generate && pnpm --filter @ijazah/db migrate

cd pipelines && uv sync
DATABASE_URL=postgres://ijazah:ijazah@localhost:5433/ijazah \
  uv run python -m ijazah_etl.main        # or pick stages: kg translations …

pnpm --filter @ijazah/api dev             # :8077
pnpm --filter @ijazah/web dev             # :3000  (ar/ + en/)
```

Data downloads are documented in `PLAN.md`; raw files live under `data/raw/`
(gitignored — ~5GB, do not commit).

## Data licensing

Each `sources` row carries license/attribution metadata. hkg is CC-BY-4.0;
muslimscholars/hawramani are scraped corpora used under attribution —
verify redistribution rights before publishing derived endpoints broadly.
