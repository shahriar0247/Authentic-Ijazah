# Ssanad — أسانيد
### A Hadith & Scholars Knowledge-Graph Platform — Research & Implementation Plan

> **Vision:** An interactive, bilingual web platform where every hadith,
> narrator, scholar, isnad chain, and scholarly position is a linked, explorable
> entity — isnad DAGs, teacher→student networks, transmission maps, timelines,
> and aqidah/fiqh positions — with a Salafi scholarly orientation and
> citation-first presentation.

> **Decisions locked (user):**
> 1. **Data backbone = Hybrid** — hadith-kg.db as core; Riwayat + Ifta Sunnah
>    corpora used to cross-validate and extend chains/narrator coverage.
> 2. **Storage = multi-store, whatever the job needs** — PostgreSQL canonical
>    (no SQLite-first); graph engine added when whole-graph analytics warrant.
> 3. **Language = coverage-driven** — Arabic where Arabic exists (matn, rijal,
>    jarh); English where English exists (translations, muslimscholars bios);
>    UI bilingual, never blocking a record for a missing locale.
> 4. **Scope = the full vision** — all explorer surfaces built; phases below
>    order delivery, not scope.

---

## 0. Delivery status (updated 2026-03)

**Live & verified** (ETL `verify` green, 23-check API smoke green, prod build clean):

- Canonical PG17 schema: 28+ tables, 8 migrations, zero FK orphans
- Corpus: 715,790 hadiths · 577K isnad routes · 4.4M mentions · 178,159 persons
- Enrichment: Sahih-narrator flags (1,735/1,961), tadlis (83), ikhtilat (161),
  exact AH years, 47,760 place events (74 gazetteered)
- Graph: 700K transmission edges (kg adjacency + sanadset), 162K identity
  matches, leveled-BFS shortest paths, merged-DAGs w/ madār detection
- Search: tsvector FTS (0.5s) + pg_trgm fallback; 592,745 int8 embeddings
  on HNSW — related-hadiths ~50ms; meaning-group semantic clustering
- English: 20,980 verified joins via text-signature + LCP matching
- Editorial: 10 attributed aqidah/fiqh positions with cited excerpts
- UI: ar/en localized, isnad DAGs (React Flow+ELK), clickable narrator
  spans, dossiers w/ badges, PathFinder, map, timeline, books/topics/positions

**Not yet wired / pending:**
- Riwayat (925K hadith) + Ifta Sunnah corpora — not yet downloaded/merged
- remaining ~19K hadith-json items (edition differences — no safe join)
- narrator entity dedup within hadith-kg (same person, multiple rawi rows)
- PostGIS spatial indexes (places use lat/lng columns; image lacks lib)
- production deploy (requires plan + approval)

---

## 1. Research Findings — Data Source Inventory

### 1.1 Tier 1: Foundational datasets (download once, CC-licensed)

| Source | Contents | License | Role |
|---|---|---|---|
| **الجامع — Hadith KG** (`huggingface.co/datasets/emadjumaah/hadith-kg`, code: `github.com/qataruts/hadith`) | 715,790 hadith · 425 collections · **577,024 linked isnad chains** (4.4M narrator links) · 49,819 narrator bios (tabaqa, grading, tadlis/ikhtilat flags, dates, places) · **127,863 jarh-wa-ta'dil statements** by 1,015 critics · 20,745 meaning-groups + 768-dim embeddings · 54,862-node subject tree · char-offset markup (narrators, matn, Quran quotes) | **CC-BY-4.0** | **Primary backbone.** Two SQLite DBs (1.6 GB + 2.9 GB). |
| **MuslimScholars.info** scrape (Kaggle `fahd09/hadith-narrators`, islamicarchives.org mirror) | ~25K scholars: Arabic+English names, teachers/students as IDs, birth/death dates & places, grades (Ibn Hajar's Taqrib), madhhab, coords | public scrape; attribute | **English names + teacher/student graph + geodata.** |
| **Zenodo narrator-link corpus** (`10.5281/zenodo.21019693`, Wirahman 2026) | `sanad_links` (Sanadset→Hawramani, 94.6K), `narrator_links` (Hawramani→MuslimScholars, 95.5K), enriched 185K-node/814K-edge transmission graph (Parquet) | open | **Entity resolution glue** between the big corpora. |
| **Riwayat corpus** (`zenodo.23630500`) | 924,787 hadith (Sunni+Shi'i) · 5.68M chain mentions · 193K narrators · matn boundaries | open | Secondary coverage + cross-validation. |
| **Sanadset 650K** (Mendeley `5xth87zwb5`) | 650,986 hadith · 926 books · extracted narrator lists | CC-BY | Backup corpus. |
| **Ifta Sunnah** (Kaggle `jehadoumer/*`) | 276,347 hadith from Saudi Ifta' Sunnah platform · 20,957 narrator profiles · isnad-linked graph variant | attribute platform | Salafi-graded reference corpus. |

### 1.2 Tier 2: Translations & gradings

| Source | Contents | License |
|---|---|---|
| **fawazahmed0/hadith-api** | 17+ collections × 15+ languages (en/ur/bn/tr/id/fr/ru/es/tl/ml…), grades, CDN JSON | Unlicense |
| **open-hadith-data / hadith-json / sunnah dumps** | ~47K hadith Arabic+English, isnad/matn separated, grades (al-Albani, Darussalam) | open |
| **Sunnah.com official API** | Verified subset, request key via GitHub issue | gated — request |
| **Dorar Hadith API** | Arabic search → text, rawi, muhaddith, source, grade, sharh + similar-hadith links | gated — request |

### 1.3 Tier 3: Aqidah / fiqh / sect positions (the "Salafi layer")

| Source | Use |
|---|---|
| **Dorar الموسوعة العقدية + الفقهية APIs** | vetted aqidah & fiqh articles (Saudi fiqh academy methodology) — token-gated |
| **IslamQA datasets** (HF: 67K multilingual, 19K English) | Salafi fatwa corpus; CC-BY-NC — fine for non-commercial da'wah site |
| **Alifta open data + Kunuz dev APIs** | Saudi Ifta' official data, HadeethEnc/QuranEnc APIs |
| **Shamela/OpenITI corpus** (HF `AuthenticIlm/Shamela4_Full_DB`, 8,589 books) | Tahdhib al-Kamal, Siyar, Mizan, Tahawiyya shuruh, Ibn Taymiyya works — full text for dossier excerpts |
| **Wikidata + MuslimScholars `mazhab` field** | madhhab/aqidah affiliation of post-classical scholars |
| **Editorial layer (ours)** | per-scholar position cards: Hanbali / Athari / Ash'ari / Maturidi attributions with sourced references |

### 1.4 Tier 4: Supporting infra

- **Quran Foundation APIs** (`apis.quran.foundation`, OAuth2) — resolve Quran quotes inside hadith text to verses/tafsir. *(This is what "QAF" refers to.)*
- **Usul.ai** — UX reference for AI research over Shamela+OpenITI (15K texts).
- **Maktabati/shamela-vectors** (HF) — 11.5M pre-embedded chunks (e5-base) → RAG over Shamela.
- **Visualization precedents:** Al-Jami' isnad-DAG + madār detection · Hawramani **HadithGraph** (isnad diagrams + HadithRank) · MuslimScholars chain trees/timelines/maps · Muhaddithat network graphs.

---

## 2. Domain Model

```
                        ┌─────────────┐
                        │   PLACES    │  name_ar/en, coords, region
                        └──────┬──────┘
                               │ born/died/resided
┌──────────┐  teaches   ┌──────┴──────┐  authored  ┌──────────┐
│ SCHOLARS │◄──────────►│  SCHOLARS   │───────────►│  BOOKS   │
│ (rawis + │  edge:     │ (expanded:  │            │(425+     │
│  alims + │  weight=   │  muftis,    │            │collections│
│  critics)│  #chains   │  madhhab    │            └────┬─────┘
└────┬─────┘  sources   │  imams…)    │                 │contains
     │                  └──────┬──────┘                 ▼
     │narrates (pos, verb)     │has positions      ┌─────────┐
     ▼                         ▼                   │ CHAPTERS│
┌──────────┐            ┌─────────────┐            └────┬────┘
│  SANADS  │            │  POSITIONS  │  aqidah/fiqh    │
│ (isnad   │            │ (editorial, │  stance + refs  ▼
│  links)  │            │  cited)     │            ┌──────────┐
└────┬─────┘            └─────────────┘            │ HADITHS  │
     │ belongs-to                                  │ text_ar, │
     ▼                                             │ matn     │
┌──────────┐    variants-of     ┌──────────────┐   │ offsets, │
│MEANING   │◄───────────────────│   HADITHS    │   │ grades[] │
│ GROUPS   │                    └──────┬───────┘   └────┬─────┘
│ (taraf)  │                           │                │
└────┬─────┘                           │graded-by       │quoted-in
     │clustered-under                   ▼                ▼
     ▼                            ┌──────────┐    ┌──────────┐
┌──────────┐                      │ GRADINGS │    │ JARH /   │
│  TOPICS  │ 54,862-node tree     │ (per     │    │ TA'DIL   │
└──────────┘                      │ scholar) │    │ statements│
                                  └──────────┘    └──────────┘
```

**Key entities**

- `scholars` — unified narrator/critic/scholar record. IDs: internal + `muslimscholars_id`, `hawramani_id`, `hadithkg_rawi_id`, `wikidata_qid`. Fields: `name_ar`, `name_en`, name variants[], `kunya`, `nisba`, `laqab`, `tabaqa` (Companions→…), `birth_ah/ce`, `death_ah/ce`, `rank` (thiqa/saduq/da'if/…), `tadlis`, `ikhtilat`, `madhhab_fiqh`, `aqidah_school`, places, bio.
- `transmission_edges` — student→teacher, `weight` = chain co-occurrence, source flags.
- `hadiths` — plain Arabic text + offset tables (narrator mentions, matn, Quran quotes), collection/book/chapter/number, `type` (marfu'/mawquf/qudsi), meaning-group link, translations[].
- `sanads` + `sanad_links` — ordered narrator IDs per chain, transmission verb (حدثنا/أخبرنا/عن/سمعت…), per-chain hukm.
- `gradings` — (hadith, scholar, grade, source) — al-Albani, Ibn Baz, Darussalam, Shu'ayb al-Arna'ut…
- `aqwal` — jarh/ta'dil statements (narrator, critic, text, source book+page).
- `meaning_groups` / `tarafs` — one "hadith meaning" across all its narrations.
- `topics` — 54,862-node nested-set tree.
- `positions` — **our editorial layer**: (scholar, domain, topic, stance, evidence_refs[]). This is where Athari/Ash'ari/Maturidi/Hanbali etc. attributions live, each backed by citations.
- `places`, `books`, `collections`, `commentaries` (shuruh: Fath al-Bari, etc. — links to Shamela text).

---

## 3. Architecture

```
                ┌─────────────────────────── DATA PLANE (offline ETL) ───┐
                │                                                        │
   hadith-kg.db │  muslimscholars CSV   zenodo parquet   translations    │
        └───────┼──────────┬────────────────┬───────────────┬─────────────┘
                │          ▼                ▼               ▼
                │   ┌────────────────────────────────────────────────┐
                │   │  pipelines/  (Python · uv · polars)            │
                │   │  ingest → normalize → entity-resolve → load    │
                │   └───────────────────────┬────────────────────────┘
                │                           ▼
                │                ┌────────────────────┐
                │                │  PostgreSQL 16+    │  canonical store
                │                │  + pg_trgm + FTS   │  recursive CTEs for
                │                │  + pgvector        │  chains · vectors
                └───────────────►│  (Neon/self-host)  │
                                 └─────────┬──────────┘
                ┌───────────────────────────┼─────────── APP PLANE ───┐
                │                           ▼                        │
                │   ┌─────────────────────────────────────────────┐   │
                │   │ Next.js 16 (App Router, RSC) + React 19     │   │
                │   │ TS strict · Tailwind v4 · shadcn · next-intl│   │
                │   │                                             │   │
                │   │  Route handlers (read API)                  │   │
                │   │   ├─ /api/scholar/[id]  dossier + network   │   │
                │   │   ├─ /api/hadith/[id]   text + chains       │   │
                │   │   ├─ /api/isnad/[group] DAG JSON            │   │
                │   │   ├─ /api/search        FTS + semantic      │   │
                │   │   └─ /api/map | /api/timeline               │   │
                │   └─────────────────────────────────────────────┘   │
                │                                                     │
                │   Client viz layer (islands):                       │
                │   ├─ Cytoscape.js / Cosmograph → isnad DAG,        │
                │   │   teacher-student graphs (WebGL at scale)       │
                │   ├─ React Flow → curated small chains, lineage     │
                │   ├─ MapLibre GL → transmission maps                │
                │   ├─ D3/vis-timeline → tabaqa timelines             │
                └─────────────────────────────────────────────────────┘
```

### Why this shape

- **Multi-store by job (decision):** PostgreSQL = canonical relational+FTS+vectors. Bounded traversals (isnad ≤15 hops, teacher/student neighborhoods) via recursive CTEs. When we ship whole-graph features (185K-node path analytics, centrality dashboards), we add a graph engine — **Apache AGE extension on the same Postgres** is the cheapest path (Cypher queries, same data, no second datastore); Neo4j only if AGE falls short. SQLite files (hadith-kg.db etc.) remain the ETL interchange format, never the serving store.
- **SQLite artifacts → Postgres ETL:** hadith-kg.db already *is* the canonical KG; the pipeline lifts it + entity-resolves muslimscholars/hawramani IDs (Zenodo link tables do 90% of this) + cross-validates chains against Riwayat/Ifta (decision: hybrid backbone — diffs flagged, both provenances stored).
- **Coverage-driven i18n (decision):** every display field is a `(ar, en)` pair rendered with graceful fallback — Arabic where Arabic exists, English where English exists; UI chrome fully bilingual via `next-intl` under a `[locale]` root segment with RTL.

---

## 4. Tech Stack (decisions)

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16 + React 19** (App Router) | user's stack; RSC streams big dossier pages; static+ISR for 50K scholar pages |
| Language | **TypeScript strict** everywhere; **Python (uv)** for ETL only | repo defaults |
| DB | **PostgreSQL** (`pg_trgm`, `unaccent`, `pgvector`) | chains via recursive CTE; Arabic FTS; vectors without extra service |
| ORM | **Drizzle** (typed SQL, great for graph CTEs) | raw SQL matters here more than CRUD ergonomics |
| Graph viz | **Cytoscape.js** (+ fcose/cola layouts) for chains; **Cosmograph** (WebGL) for >10K-node overviews; **React Flow** for small curated DAGs | each tool at its scale |
| Maps | **MapLibre GL + react-map-gl** | open, self-hostable tiles |
| Search | Phase 1: Postgres FTS w/ Arabic normalization. Phase 2: **Typesense** (typo-tolerant, Arabic-aware) + pgvector semantic | diacritics-insensitive search is non-negotiable |
| UI | Tailwind v4 + shadcn + **Amiri/IBM Plex Sans Arabic + Inter** | Amiri = the de-facto Quranic/hadith face |
| i18n | **next-intl** (`/[locale]/…`), ar-first | — |
| AI (later) | Gemini embeddings (768-dim, matches existing vectors) + RAG chat over meaning-groups | corpus already ships compatible vectors |
| Package mgr | **pnpm** | repo default |
| Hosting | Vercel + Neon (or one VPS + Postgres) | — |

---

## 5. Feature Map — "many doors into one graph"

1. **Hadith page** — text with *clickable narrator names* (offset markup), all transmission routes, per-chain grade, translations, similar hadith (mutaba'at), sharh links, Quran-verse cross-refs.
2. **شجرة الإسناد (Isnad DAG)** — all routes of a meaning merged into a weighted DAG; edge width = route count; automatic **madār** detection; companion filter; color = narrator grade (thiqa green → matruk red, always color+label).
3. **Scholar dossier** — identity card (kunya/nisba/tabaqa/dates), jarh-wa-ta'dil quotes by critic, **interactive teacher↑/student↓ graph**, places timeline, narrated hadith, positions tab.
4. **Scholar network explorer** — force graph of transmission; filters: century AH, region, tabaqa, grade; "who connected X to Y" path-finder (degrees of separation through isnads).
5. **Transmission map** — MapLibre: narrators as places, animated flow of a hadith's routes across cities (Kufa→Basra→Baghdad…); geographic era slider.
6. **Timeline view** — tabaqa-aligned vertical timeline; compare two scholars' lifespans; "contemporaries of X".
7. **Aqidah/Madhhab explorer** — topic tree (Tawhid, Sifat, Iman, Qadar…) → per-school position cards (Athari/Hanbali vs Ash'ari vs Maturidi) → each card cites primary refs + links scholars holding it; scholar pages show their school badges.
8. **Search** — omnibox: matn fragment (diacritics-insensitive), narrator name (ar+en), topic; semantic "search by meaning"; graded filters.
9. **AI assistant (Phase 4)** — RAG chat over meaning-groups + Shamela vectors, numbered citations to real hadith pages. "QAF-style" but closed-corpus, citation-strict — the anti-hallucination posture.
10. **Curated journeys** — e.g. "hadith Jibril: all 6 routes", "golden chains" (السلاسل الذهبية), "women narrators".

---

## 6. Multilingual Strategy (coverage-driven — decision)

- **Arabic = source of truth.** All primary content (matn, rijal, jarh) is Arabic — non-negotiable for authenticity.
- **English via data, not machine translation:** fawazahmed0/open-hadith-data give human translations; muslimscholars gives English names/bios. Records ship whatever coverage exists — UI never gates on a missing locale (falls back gracefully, shows "العربية" where no English exists and vice versa).
- Roadmap: Urdu (large existing translation data) → then id/tr/fr.

## 7. Phases (full vision confirmed — all features in scope)

| Phase | Deliverable |
|---|---|
| **0 — Scaffold+ETL** | Next.js app, Postgres, ETL: hadith-kg + muslimscholars + translations → unified schema; Riwayat/Ifta cross-validation reports |
| **1 — Core reading** | Hadith pages w/ clickable isnads, scholar dossiers, omnibox search |
| **2 — Graph layer** | Isnad DAG viz + madār, teacher/student networks, path-finder |
| **3 — Space & time** | Transmission map, timelines, tabaqa browser |
| **4 — Positions & AI** | Aqidah/madhhab layer, semantic search, cited RAG chat, commentaries |
| **5 — Polish** | Urdu, curation/admin tooling, PWA/offline DB |

Phases 2–3 can ship in parallel once Phase 1's data plane is stable — they read the same schema.

## 8. Risks & Notes

- **Licensing:** hadith-kg CC-BY-4.0 (attribute!). muslimscholars scrape — attribute + link back; IslamQA CC-BY-NC → keep site non-commercial. Dorar/sunnah.com need formal requests (plan covers applying).
- **Entity resolution risk:** Zenodo links are confidence-tiered — we only auto-merge HIGH tier; MEDIUM shown as "possible match".
- **Content sensitivity (Salafi orientation):** positions layer is *ours* — curated with references, not scraped opinions. Aqidah attributions must cite primary works (Sharh al-Tahawiyya etc.).
- **Data volume:** ~5-8 GB effective; Postgres fine, but isn't Vercel-serveable as SQLite blobs → DB must live on Neon/VPS.
- **Option B exists:** `qataruts/hadith` itself is a working open-source Arabic-first app — we could fork/extend it, but it has no English layer, no positions, no maps, vanilla-JS UI. Building our own Next.js front on its *dataset* gives the differentiated product the user described.
