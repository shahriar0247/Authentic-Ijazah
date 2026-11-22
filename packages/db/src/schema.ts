import {
  pgTable,
  pgEnum,
  bigserial,
  bigint,
  integer,
  smallint,
  text,
  varchar,
  boolean,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
  primaryKey,
  customType,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ---------- custom types ----------

/** pgvector — 768-dim (matches the hadith-kg meaning-group embeddings, Gemini). */
const vector = customType<{ data: number[]; driverData: string }>({
  dataType(config) {
    return `vector(${config?.dimensions ?? 768})`;
  },
  toDriver(v: number[]) {
    return `[${v.join(",")}]`;
  },
  fromDriver(v: string) {
    return v
      .replace(/^\[|\]$/g, "")
      .split(",")
      .map(Number);
  },
});

// ---------- enums ----------

export const sourceKindEnum = pgEnum("source_kind", [
  "dataset",
  "api",
  "book",
  "editorial",
  "derived",
]);

export const entityKindEnum = pgEnum("entity_kind", [
  "person",
  "hadith",
  "work",
  "place",
  "meaning_group",
  "route",
  "passage",
]);

export const relationshipKindEnum = pgEnum("relationship_kind", [
  "studied_under",
  "narrated_from",
  "contemporary_of",
  "related_to",
  "influenced",
]);

export const evidenceStatusEnum = pgEnum("evidence_status", [
  "documented",
  "inferred",
  "disputed",
  "unverified",
]);

export const claimStatusEnum = pgEnum("claim_status", [
  "draft",
  "in_review",
  "published",
  "rejected",
]);

export const annotationKindEnum = pgEnum("annotation_kind", [
  "narrator",
  "matn",
  "quran",
  "mention",
]);

export const identificationStatusEnum = pgEnum("identification_status", [
  "verified",
  "candidate",
  "unresolved",
]);

export const verdictClassEnum = pgEnum("verdict_class", [
  "tadil", // accreditation (توثيق)
  "jarh", // discreditation (جرح)
  "neutral",
  "mixed",
]);

export const placePrecisionEnum = pgEnum("place_precision", [
  "exact",
  "approx",
  "region",
  "unknown",
]);

export const placeEventKindEnum = pgEnum("place_event_kind", [
  "born",
  "resided",
  "studied",
  "taught",
  "traveled",
  "died",
]);

export const positionDomainEnum = pgEnum("position_domain", [
  "aqidah",
  "fiqh",
  "methodology",
  "riwaya",
]);

export const stanceEnum = pgEnum("stance", [
  "affirms",
  "rejects",
  "qualified",
  "disputed",
  "unknown",
]);

// ---------- sources & provenance ----------

export const sources = pgTable("sources", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 256 }).notNull(),
  kind: sourceKindEnum("kind").notNull(),
  license: varchar("license", { length: 128 }),
  url: text("url"),
  attribution: text("attribution"),
  persistAllowed: boolean("persist_allowed").notNull().default(true),
  importedAt: timestamp("imported_at", { withTimezone: true }).defaultNow(),
});

export const sourcePassages = pgTable(
  "source_passages",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    workId: bigint("work_id", { mode: "number" }),
    sourceId: bigint("source_id", { mode: "number" }).references(() => sources.id),
    locator: varchar("locator", { length: 256 }),
    textAr: text("text_ar"),
    textEn: text("text_en"),
    checksum: varchar("checksum", { length: 64 }),
  },
  (t) => [index("passages_work_idx").on(t.workId)],
);

export const externalIdentifiers = pgTable(
  "external_identifiers",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    entityKind: entityKindEnum("entity_kind").notNull(),
    entityId: bigint("entity_id", { mode: "number" }).notNull(),
    provider: varchar("provider", { length: 64 }).notNull(),
    externalId: varchar("external_id", { length: 512 }).notNull(),
    confidence: varchar("confidence", { length: 16 }),
  },
  (t) => [
    index("ext_ids_entity_idx").on(t.entityKind, t.entityId),
    uniqueIndex("ext_ids_provider_uniq").on(t.provider, t.externalId, t.entityKind),
  ],
);

// ---------- persons (scholars / narrators / critics) ----------

export const persons = pgTable(
  "persons",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    displayNameAr: varchar("display_name_ar", { length: 512 }).notNull(),
    displayNameEn: varchar("display_name_en", { length: 512 }),
    kunya: varchar("kunya", { length: 256 }),
    nisba: varchar("nisba", { length: 256 }),
    laqab: varchar("laqab", { length: 256 }),
    tabaqa: varchar("tabaqa", { length: 128 }), // Companions / Followers / 3rd Century AH…
    generationOrd: smallint("generation_ord"), // 0 sahaba, 1 tabi'i, …
    birthAhMin: smallint("birth_ah_min"),
    birthAhMax: smallint("birth_ah_max"),
    deathAhMin: smallint("death_ah_min"),
    deathAhMax: smallint("death_ah_max"),
    rankAr: varchar("rank_ar", { length: 256 }), // ثقة ثبت، صدوق، ضعيف…
    rankNorm: varchar("rank_norm", { length: 32 }), // thiqa|saduq|daif|…
    madhhabFiqh: varchar("madhhab_fiqh", { length: 64 }),
    aqidahSchool: varchar("aqidah_school", { length: 64 }),
    isCompanion: boolean("is_companion").notNull().default(false),
    isCritic: boolean("is_critic").notNull().default(false),
    isStub: boolean("is_stub").notNull().default(false),
    flags: jsonb("flags").$type<Record<string, boolean>>().default({}),
    bioAr: text("bio_ar"),
    bioEn: text("bio_en"),
    searchText: text("search_text"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("persons_search_trgm").using("gin", t.searchText.op("gin_trgm_ops")),
    index("persons_name_ar_trgm").using("gin", t.displayNameAr.op("gin_trgm_ops")),
    index("persons_name_en_trgm").using("gin", t.displayNameEn.op("gin_trgm_ops")),
    index("persons_death_idx").on(t.deathAhMin),
    index("persons_tabaqa_idx").on(t.tabaqa),
  ],
);

export const personNames = pgTable(
  "person_names",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    personId: bigint("person_id", { mode: "number" })
      .notNull()
      .references(() => persons.id),
    kind: varchar("kind", { length: 16 }).notNull(), // ar|en|variant|translit|kunya
    value: varchar("value", { length: 512 }).notNull(),
  },
  (t) => [
    index("person_names_person_idx").on(t.personId),
    index("person_names_value_trgm").using("gin", t.value.op("gin_trgm_ops")),
  ],
);

/** Cross-source "same historical person" links — confidence-tiered, never silently merged. */
export const personMatches = pgTable(
  "person_matches",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    personA: bigint("person_a", { mode: "number" })
      .notNull()
      .references(() => persons.id),
    personB: bigint("person_b", { mode: "number" })
      .notNull()
      .references(() => persons.id),
    method: varchar("method", { length: 64 }).notNull(), // exact_name|linked_corpus|teacher_overlap…
    confidence: varchar("confidence", { length: 16 }).notNull(), // high|medium|low
    status: claimStatusEnum("status").notNull().default("draft"),
    sourceId: bigint("source_id", { mode: "number" }).references(() => sources.id),
  },
  (t) => [
    uniqueIndex("person_matches_uniq").on(t.personA, t.personB, t.method),
    index("person_matches_a_idx").on(t.personA),
    index("person_matches_b_idx").on(t.personB),
  ],
);

export const personRelationships = pgTable(
  "person_relationships",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    subjectId: bigint("subject_id", { mode: "number" })
      .notNull()
      .references(() => persons.id),
    predicate: relationshipKindEnum("predicate").notNull(),
    objectId: bigint("object_id", { mode: "number" })
      .notNull()
      .references(() => persons.id),
    weight: integer("weight").notNull().default(1), // #chain co-occurrences
    status: evidenceStatusEnum("status").notNull().default("documented"),
    passageId: bigint("passage_id", { mode: "number" }).references(() => sourcePassages.id),
    provenance: jsonb("provenance").$type<Record<string, unknown>>().default({}),
  },
  (t) => [
    index("rels_subject_idx").on(t.subjectId, t.predicate),
    index("rels_object_idx").on(t.objectId, t.predicate),
    uniqueIndex("rels_uniq").on(t.subjectId, t.predicate, t.objectId),
  ],
);

// ---------- works (books / collections) ----------

export const works = pgTable(
  "works",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    titleAr: varchar("title_ar", { length: 512 }).notNull(),
    titleEn: varchar("title_en", { length: 512 }),
    authorPersonId: bigint("author_person_id", { mode: "number" }).references(
      () => persons.id,
    ),
    authorNameAr: varchar("author_name_ar", { length: 512 }),
    collectionSlug: varchar("collection_slug", { length: 128 }),
    category: varchar("category", { length: 128 }),
    city: varchar("city", { length: 256 }), // edition city (دار النشر)
    dar: varchar("dar", { length: 512 }), // publisher
    tabaa: varchar("tabaa", { length: 128 }), // edition no.
    era: varchar("era", { length: 128 }),
    hadithCount: integer("hadith_count"),
    sourceId: bigint("source_id", { mode: "number" }).references(() => sources.id),
  },
  (t) => [index("works_title_idx").on(t.titleAr)],
);

export const editions = pgTable("editions", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  workId: bigint("work_id", { mode: "number" })
    .notNull()
    .references(() => works.id),
  label: varchar("label", { length: 256 }).notNull(),
  note: text("note"),
});

// ---------- hadith ----------

export const meaningGroups = pgTable("meaning_groups", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  titleAr: varchar("title_ar", { length: 1024 }),
  summaryAr: text("summary_ar"),
  summaryEn: text("summary_en"),
  tarafNass: text("taraf_nass"), // the distinctive wording of this meaning family
  tarafHukm: text("taraf_hukm"),
  matnNo: integer("matn_no"),
  isQudsi: boolean("is_qudsi").notNull().default(false),
  sahabaQty: integer("sahaba_qty"),
  repeatQty: integer("repeat_qty"),
  searchText: text("search_text"),
  embedding: vector("embedding", { dimensions: 768 }),
});

export const hadithOccurrences = pgTable(
  "hadith_occurrences",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    workId: bigint("work_id", { mode: "number" })
      .notNull()
      .references(() => works.id),
    bookNo: integer("book_no"),
    chapterNo: integer("chapter_no"),
    hadithNo: varchar("hadith_no", { length: 64 }),
    inBookRef: varchar("in_book_ref", { length: 256 }),
    textAr: text("text_ar").notNull(),
    matnStart: integer("matn_start"),
    matnEnd: integer("matn_end"),
    type: varchar("type", { length: 32 }), // marfu|mawquf|maqtu|qudsi|…
    meaningGroupId: bigint("meaning_group_id", { mode: "number" }).references(
      () => meaningGroups.id,
    ),
    hukm: text("hukm"),
    searchText: text("search_text"),
    embedding: vector("embedding", { dimensions: 768 }),
  },
  (t) => [
    index("hadith_work_idx").on(t.workId, t.hadithNo),
    index("hadith_group_idx").on(t.meaningGroupId),
    index("hadith_search_trgm").using("gin", t.searchText.op("gin_trgm_ops")),
  ],
);

export const hadithTranslations = pgTable(
  "hadith_translations",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    hadithId: bigint("hadith_id", { mode: "number" })
      .notNull()
      .references(() => hadithOccurrences.id),
    lang: varchar("lang", { length: 8 }).notNull(),
    narrator: text("narrator"),
    text: text("text").notNull(),
    sourceId: bigint("source_id", { mode: "number" }).references(() => sources.id),
    status: varchar("status", { length: 32 }).default("published"),
  },
  (t) => [
    index("hadith_tr_hadith_idx").on(t.hadithId),
    index("hadith_tr_text_trgm").using("gin", t.text.op("gin_trgm_ops")),
  ],
);

export const hadithAnnotations = pgTable(
  "hadith_annotations",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    hadithId: bigint("hadith_id", { mode: "number" })
      .notNull()
      .references(() => hadithOccurrences.id),
    kind: annotationKindEnum("kind").notNull(),
    start: integer("start").notNull(),
    end: integer("end").notNull(),
    personId: bigint("person_id", { mode: "number" }).references(() => persons.id),
  },
  (t) => [index("hadith_ann_idx").on(t.hadithId, t.start)],
);

// ---------- isnad ----------

export const isnadRoutes = pgTable(
  "isnad_routes",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    hadithId: bigint("hadith_id", { mode: "number" })
      .notNull()
      .references(() => hadithOccurrences.id),
    length: smallint("length"),
    maxRank: smallint("max_rank"),
    hukm: text("hukm"),
    sourceId: bigint("source_id", { mode: "number" }).references(() => sources.id),
  },
  (t) => [index("routes_hadith_idx").on(t.hadithId)],
);

export const isnadMentions = pgTable(
  "isnad_mentions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    routeId: bigint("route_id", { mode: "number" })
      .notNull()
      .references(() => isnadRoutes.id),
    pos: smallint("pos").notNull(), // 0 = collector; ascends to companion
    mentionText: varchar("mention_text", { length: 512 }).notNull(),
    verb: varchar("verb", { length: 64 }), // حدثنا / أخبرنا / عن / سمعت…
    personId: bigint("person_id", { mode: "number" }).references(() => persons.id),
    identificationStatus: identificationStatusEnum("identification_status")
      .notNull()
      .default("verified"),
  },
  (t) => [
    index("mentions_route_idx").on(t.routeId, t.pos),
    index("mentions_person_idx").on(t.personId),
  ],
);

// ---------- assessments (jarh wa ta'dil) & gradings ----------

export const assessments = pgTable(
  "assessments",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    criticPersonId: bigint("critic_person_id", { mode: "number" })
      .notNull()
      .references(() => persons.id),
    targetPersonId: bigint("target_person_id", { mode: "number" })
      .notNull()
      .references(() => persons.id),
    textAr: text("text_ar").notNull(),
    verdictClass: verdictClassEnum("verdict_class"),
    passageId: bigint("passage_id", { mode: "number" }).references(() => sourcePassages.id),
    sourceId: bigint("source_id", { mode: "number" }).references(() => sources.id),
  },
  (t) => [
    index("assess_target_idx").on(t.targetPersonId),
    index("assess_critic_idx").on(t.criticPersonId),
  ],
);

export const gradings = pgTable(
  "gradings",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    hadithId: bigint("hadith_id", { mode: "number" }).references(() => hadithOccurrences.id),
    routeId: bigint("route_id", { mode: "number" }).references(() => isnadRoutes.id),
    graderPersonId: bigint("grader_person_id", { mode: "number" }).references(() => persons.id),
    sourceId: bigint("source_id", { mode: "number" }).references(() => sources.id),
    gradeAr: varchar("grade_ar", { length: 256 }),
    gradeEn: varchar("grade_en", { length: 256 }),
    gradeClass: varchar("grade_class", { length: 32 }), // sahih|hasan|daif|mawdu|…
  },
  (t) => [index("gradings_hadith_idx").on(t.hadithId)],
);

// ---------- topics ----------

export const topics = pgTable(
  "topics",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    parentId: bigint("parent_id", { mode: "number" }),
    titleAr: varchar("title_ar", { length: 512 }).notNull(),
    titleEn: varchar("title_en", { length: 512 }),
    level: smallint("level"),
    lft: integer("lft"),
    rgt: integer("rgt"),
  },
  (t) => [index("topics_parent_idx").on(t.parentId), index("topics_lft_idx").on(t.lft, t.rgt)],
);

export const topicMeanings = pgTable(
  "topic_meanings",
  {
    topicId: bigint("topic_id", { mode: "number" })
      .notNull()
      .references(() => topics.id),
    meaningGroupId: bigint("meaning_group_id", { mode: "number" })
      .notNull()
      .references(() => meaningGroups.id),
  },
  (t) => [
    primaryKey({ columns: [t.topicId, t.meaningGroupId] }),
    index("topic_meanings_group_idx").on(t.meaningGroupId),
  ],
);

// ---------- geography ----------

export const places = pgTable(
  "places",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    nameAr: varchar("name_ar", { length: 256 }),
    nameEn: varchar("name_en", { length: 256 }),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    precision: placePrecisionEnum("precision").notNull().default("unknown"),
    sourceId: bigint("source_id", { mode: "number" }).references(() => sources.id),
  },
  (t) => [index("places_name_trgm").using("gin", t.nameAr.op("gin_trgm_ops"))],
);

export const personPlaceEvents = pgTable(
  "person_place_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    personId: bigint("person_id", { mode: "number" })
      .notNull()
      .references(() => persons.id),
    placeId: bigint("place_id", { mode: "number" })
      .notNull()
      .references(() => places.id),
    kind: placeEventKindEnum("kind").notNull(),
    ahMin: smallint("ah_min"),
    ahMax: smallint("ah_max"),
    passageId: bigint("passage_id", { mode: "number" }).references(() => sourcePassages.id),
  },
  (t) => [
    index("ppe_person_idx").on(t.personId),
    index("ppe_place_idx").on(t.placeId),
    index("ppe_period_idx").on(t.ahMin, t.ahMax),
  ],
);

// ---------- positions (aqidah/fiqh — editorial) ----------

export const positions = pgTable(
  "positions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    domain: positionDomainEnum("domain").notNull(),
    topicId: bigint("topic_id", { mode: "number" }).references(() => topics.id),
    propositionAr: text("proposition_ar").notNull(),
    propositionEn: text("proposition_en"),
  },
  (t) => [index("positions_topic_idx").on(t.topicId)],
);

export const positionAttributions = pgTable(
  "position_attributions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    positionId: bigint("position_id", { mode: "number" })
      .notNull()
      .references(() => positions.id),
    personId: bigint("person_id", { mode: "number" })
      .notNull()
      .references(() => persons.id),
    stance: stanceEnum("stance").notNull().default("unknown"),
    qualifierAr: text("qualifier_ar"),
    qualifierEn: text("qualifier_en"),
    reviewedBy: varchar("reviewed_by", { length: 128 }),
    status: claimStatusEnum("status").notNull().default("draft"),
  },
  (t) => [
    index("pos_attr_position_idx").on(t.positionId),
    index("pos_attr_person_idx").on(t.personId),
  ],
);

export const positionEvidence = pgTable("position_evidence", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  attributionId: bigint("attribution_id", { mode: "number" })
    .notNull()
    .references(() => positionAttributions.id),
  passageId: bigint("passage_id", { mode: "number" }).references(() => sourcePassages.id),
  excerptAr: text("excerpt_ar"),
  excerptEn: text("excerpt_en"),
});

// ---------- claims (governance / review workflow) ----------

export const claims = pgTable(
  "claims",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    entityKind: entityKindEnum("entity_kind").notNull(),
    entityId: bigint("entity_id", { mode: "number" }).notNull(),
    predicate: varchar("predicate", { length: 128 }).notNull(),
    objectKind: entityKindEnum("object_kind"),
    objectId: bigint("object_id", { mode: "number" }),
    status: claimStatusEnum("status").notNull().default("draft"),
    provenance: jsonb("provenance").$type<Record<string, unknown>>().default({}),
    createdBy: varchar("created_by", { length: 128 }),
    reviewedBy: varchar("reviewed_by", { length: 128 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("claims_entity_idx").on(t.entityKind, t.entityId)],
);

// ---------- ETL bookkeeping ----------

export const importRuns = pgTable("import_runs", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  sourceId: bigint("source_id", { mode: "number" }).references(() => sources.id),
  version: varchar("version", { length: 128 }),
  checksum: varchar("checksum", { length: 64 }),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  stats: jsonb("stats").$type<Record<string, number>>().default({}),
});

export const meta = pgTable("meta", {
  key: varchar("key", { length: 128 }).primaryKey(),
  value: jsonb("value"),
});
