CREATE TYPE "public"."annotation_kind" AS ENUM('narrator', 'matn', 'quran', 'mention');--> statement-breakpoint
CREATE TYPE "public"."claim_status" AS ENUM('draft', 'in_review', 'published', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."entity_kind" AS ENUM('person', 'hadith', 'work', 'place', 'meaning_group', 'route', 'passage');--> statement-breakpoint
CREATE TYPE "public"."evidence_status" AS ENUM('documented', 'inferred', 'disputed', 'unverified');--> statement-breakpoint
CREATE TYPE "public"."identification_status" AS ENUM('verified', 'candidate', 'unresolved');--> statement-breakpoint
CREATE TYPE "public"."place_event_kind" AS ENUM('born', 'resided', 'studied', 'taught', 'traveled', 'died');--> statement-breakpoint
CREATE TYPE "public"."place_precision" AS ENUM('exact', 'approx', 'region', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."position_domain" AS ENUM('aqidah', 'fiqh', 'methodology', 'riwaya');--> statement-breakpoint
CREATE TYPE "public"."relationship_kind" AS ENUM('studied_under', 'narrated_from', 'contemporary_of', 'related_to', 'influenced');--> statement-breakpoint
CREATE TYPE "public"."source_kind" AS ENUM('dataset', 'api', 'book', 'editorial', 'derived');--> statement-breakpoint
CREATE TYPE "public"."stance" AS ENUM('affirms', 'rejects', 'qualified', 'disputed', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."verdict_class" AS ENUM('tadil', 'jarh', 'neutral', 'mixed');--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"critic_person_id" bigint NOT NULL,
	"target_person_id" bigint NOT NULL,
	"text_ar" text NOT NULL,
	"verdict_class" "verdict_class",
	"passage_id" bigint,
	"source_id" bigint
);
--> statement-breakpoint
CREATE TABLE "claims" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"entity_kind" "entity_kind" NOT NULL,
	"entity_id" bigint NOT NULL,
	"predicate" varchar(128) NOT NULL,
	"object_kind" "entity_kind",
	"object_id" bigint,
	"status" "claim_status" DEFAULT 'draft' NOT NULL,
	"provenance" jsonb DEFAULT '{}'::jsonb,
	"created_by" varchar(128),
	"reviewed_by" varchar(128),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "editions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"work_id" bigint NOT NULL,
	"label" varchar(256) NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "external_identifiers" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"entity_kind" "entity_kind" NOT NULL,
	"entity_id" bigint NOT NULL,
	"provider" varchar(64) NOT NULL,
	"external_id" varchar(128) NOT NULL,
	"confidence" varchar(16)
);
--> statement-breakpoint
CREATE TABLE "gradings" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"hadith_id" bigint,
	"route_id" bigint,
	"grader_person_id" bigint,
	"source_id" bigint,
	"grade_ar" varchar(256),
	"grade_en" varchar(256),
	"grade_class" varchar(32)
);
--> statement-breakpoint
CREATE TABLE "hadith_annotations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"hadith_id" bigint NOT NULL,
	"kind" "annotation_kind" NOT NULL,
	"start" integer NOT NULL,
	"end" integer NOT NULL,
	"person_id" bigint
);
--> statement-breakpoint
CREATE TABLE "hadith_occurrences" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"work_id" bigint NOT NULL,
	"book_no" integer,
	"chapter_no" integer,
	"hadith_no" varchar(64),
	"in_book_ref" varchar(256),
	"text_ar" text NOT NULL,
	"matn_start" integer,
	"matn_end" integer,
	"type" varchar(32),
	"meaning_group_id" bigint,
	"hukm" varchar(128),
	"search_text" text
);
--> statement-breakpoint
CREATE TABLE "hadith_translations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"hadith_id" bigint NOT NULL,
	"lang" varchar(8) NOT NULL,
	"narrator" text,
	"text" text NOT NULL,
	"source_id" bigint,
	"status" varchar(32) DEFAULT 'published'
);
--> statement-breakpoint
CREATE TABLE "import_runs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"source_id" bigint,
	"version" varchar(128),
	"checksum" varchar(64),
	"started_at" timestamp with time zone DEFAULT now(),
	"finished_at" timestamp with time zone,
	"stats" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "isnad_mentions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"route_id" bigint NOT NULL,
	"pos" smallint NOT NULL,
	"mention_text" varchar(512) NOT NULL,
	"verb" varchar(64),
	"person_id" bigint,
	"identification_status" "identification_status" DEFAULT 'verified' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "isnad_routes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"hadith_id" bigint NOT NULL,
	"length" smallint,
	"max_rank" smallint,
	"hukm" varchar(128),
	"source_id" bigint
);
--> statement-breakpoint
CREATE TABLE "meaning_groups" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"title_ar" varchar(1024),
	"summary_ar" text,
	"summary_en" text,
	"embedding" vector(768)
);
--> statement-breakpoint
CREATE TABLE "meta" (
	"key" varchar(128) PRIMARY KEY NOT NULL,
	"value" jsonb
);
--> statement-breakpoint
CREATE TABLE "person_names" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"person_id" bigint NOT NULL,
	"kind" varchar(16) NOT NULL,
	"value" varchar(512) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "person_place_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"person_id" bigint NOT NULL,
	"place_id" bigint NOT NULL,
	"kind" "place_event_kind" NOT NULL,
	"ah_min" smallint,
	"ah_max" smallint,
	"passage_id" bigint
);
--> statement-breakpoint
CREATE TABLE "person_relationships" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"subject_id" bigint NOT NULL,
	"predicate" "relationship_kind" NOT NULL,
	"object_id" bigint NOT NULL,
	"weight" integer DEFAULT 1 NOT NULL,
	"status" "evidence_status" DEFAULT 'documented' NOT NULL,
	"passage_id" bigint,
	"provenance" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "persons" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"display_name_ar" varchar(512) NOT NULL,
	"display_name_en" varchar(512),
	"kunya" varchar(256),
	"nisba" varchar(256),
	"laqab" varchar(256),
	"tabaqa" varchar(128),
	"generation_ord" smallint,
	"birth_ah_min" smallint,
	"birth_ah_max" smallint,
	"death_ah_min" smallint,
	"death_ah_max" smallint,
	"rank_ar" varchar(256),
	"rank_norm" varchar(32),
	"madhhab_fiqh" varchar(64),
	"aqidah_school" varchar(64),
	"is_companion" boolean DEFAULT false NOT NULL,
	"is_critic" boolean DEFAULT false NOT NULL,
	"is_stub" boolean DEFAULT false NOT NULL,
	"flags" jsonb DEFAULT '{}'::jsonb,
	"bio_ar" text,
	"bio_en" text,
	"search_text" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "places" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name_ar" varchar(256) NOT NULL,
	"name_en" varchar(256),
	"lat" double precision,
	"lng" double precision,
	"precision" "place_precision" DEFAULT 'unknown' NOT NULL,
	"source_id" bigint
);
--> statement-breakpoint
CREATE TABLE "position_attributions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"position_id" bigint NOT NULL,
	"person_id" bigint NOT NULL,
	"stance" "stance" DEFAULT 'unknown' NOT NULL,
	"qualifier_ar" text,
	"qualifier_en" text,
	"reviewed_by" varchar(128),
	"status" "claim_status" DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "position_evidence" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"attribution_id" bigint NOT NULL,
	"passage_id" bigint,
	"excerpt_ar" text,
	"excerpt_en" text
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"domain" "position_domain" NOT NULL,
	"topic_id" bigint,
	"proposition_ar" text NOT NULL,
	"proposition_en" text
);
--> statement-breakpoint
CREATE TABLE "source_passages" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"work_id" bigint,
	"source_id" bigint,
	"locator" varchar(256),
	"text_ar" text,
	"text_en" text,
	"checksum" varchar(64)
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"slug" varchar(64) NOT NULL,
	"name" varchar(256) NOT NULL,
	"kind" "source_kind" NOT NULL,
	"license" varchar(128),
	"url" text,
	"attribution" text,
	"persist_allowed" boolean DEFAULT true NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "sources_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "topic_meanings" (
	"topic_id" bigint NOT NULL,
	"meaning_group_id" bigint NOT NULL,
	CONSTRAINT "topic_meanings_topic_id_meaning_group_id_pk" PRIMARY KEY("topic_id","meaning_group_id")
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"parent_id" bigint,
	"title_ar" varchar(512) NOT NULL,
	"title_en" varchar(512),
	"level" smallint,
	"lft" integer,
	"rgt" integer
);
--> statement-breakpoint
CREATE TABLE "works" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"title_ar" varchar(512) NOT NULL,
	"title_en" varchar(512),
	"author_person_id" bigint,
	"author_name_ar" varchar(512),
	"collection_slug" varchar(128),
	"category" varchar(128),
	"era" varchar(128),
	"hadith_count" integer,
	"source_id" bigint
);
--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_critic_person_id_persons_id_fk" FOREIGN KEY ("critic_person_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_target_person_id_persons_id_fk" FOREIGN KEY ("target_person_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_passage_id_source_passages_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."source_passages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editions" ADD CONSTRAINT "editions_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gradings" ADD CONSTRAINT "gradings_hadith_id_hadith_occurrences_id_fk" FOREIGN KEY ("hadith_id") REFERENCES "public"."hadith_occurrences"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gradings" ADD CONSTRAINT "gradings_route_id_isnad_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."isnad_routes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gradings" ADD CONSTRAINT "gradings_grader_person_id_persons_id_fk" FOREIGN KEY ("grader_person_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gradings" ADD CONSTRAINT "gradings_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hadith_annotations" ADD CONSTRAINT "hadith_annotations_hadith_id_hadith_occurrences_id_fk" FOREIGN KEY ("hadith_id") REFERENCES "public"."hadith_occurrences"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hadith_annotations" ADD CONSTRAINT "hadith_annotations_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hadith_occurrences" ADD CONSTRAINT "hadith_occurrences_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hadith_occurrences" ADD CONSTRAINT "hadith_occurrences_meaning_group_id_meaning_groups_id_fk" FOREIGN KEY ("meaning_group_id") REFERENCES "public"."meaning_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hadith_translations" ADD CONSTRAINT "hadith_translations_hadith_id_hadith_occurrences_id_fk" FOREIGN KEY ("hadith_id") REFERENCES "public"."hadith_occurrences"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hadith_translations" ADD CONSTRAINT "hadith_translations_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_runs" ADD CONSTRAINT "import_runs_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "isnad_mentions" ADD CONSTRAINT "isnad_mentions_route_id_isnad_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."isnad_routes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "isnad_mentions" ADD CONSTRAINT "isnad_mentions_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "isnad_routes" ADD CONSTRAINT "isnad_routes_hadith_id_hadith_occurrences_id_fk" FOREIGN KEY ("hadith_id") REFERENCES "public"."hadith_occurrences"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "isnad_routes" ADD CONSTRAINT "isnad_routes_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_names" ADD CONSTRAINT "person_names_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_place_events" ADD CONSTRAINT "person_place_events_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_place_events" ADD CONSTRAINT "person_place_events_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_place_events" ADD CONSTRAINT "person_place_events_passage_id_source_passages_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."source_passages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_relationships" ADD CONSTRAINT "person_relationships_subject_id_persons_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_relationships" ADD CONSTRAINT "person_relationships_object_id_persons_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_relationships" ADD CONSTRAINT "person_relationships_passage_id_source_passages_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."source_passages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "position_attributions" ADD CONSTRAINT "position_attributions_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "position_attributions" ADD CONSTRAINT "position_attributions_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "position_evidence" ADD CONSTRAINT "position_evidence_attribution_id_position_attributions_id_fk" FOREIGN KEY ("attribution_id") REFERENCES "public"."position_attributions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "position_evidence" ADD CONSTRAINT "position_evidence_passage_id_source_passages_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."source_passages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_passages" ADD CONSTRAINT "source_passages_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_meanings" ADD CONSTRAINT "topic_meanings_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_meanings" ADD CONSTRAINT "topic_meanings_meaning_group_id_meaning_groups_id_fk" FOREIGN KEY ("meaning_group_id") REFERENCES "public"."meaning_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "works" ADD CONSTRAINT "works_author_person_id_persons_id_fk" FOREIGN KEY ("author_person_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "works" ADD CONSTRAINT "works_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assess_target_idx" ON "assessments" USING btree ("target_person_id");--> statement-breakpoint
CREATE INDEX "assess_critic_idx" ON "assessments" USING btree ("critic_person_id");--> statement-breakpoint
CREATE INDEX "claims_entity_idx" ON "claims" USING btree ("entity_kind","entity_id");--> statement-breakpoint
CREATE INDEX "ext_ids_entity_idx" ON "external_identifiers" USING btree ("entity_kind","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ext_ids_provider_uniq" ON "external_identifiers" USING btree ("provider","external_id","entity_kind");--> statement-breakpoint
CREATE INDEX "gradings_hadith_idx" ON "gradings" USING btree ("hadith_id");--> statement-breakpoint
CREATE INDEX "hadith_ann_idx" ON "hadith_annotations" USING btree ("hadith_id","start");--> statement-breakpoint
CREATE INDEX "hadith_work_idx" ON "hadith_occurrences" USING btree ("work_id","hadith_no");--> statement-breakpoint
CREATE INDEX "hadith_group_idx" ON "hadith_occurrences" USING btree ("meaning_group_id");--> statement-breakpoint
CREATE INDEX "hadith_search_trgm" ON "hadith_occurrences" USING gin ("search_text" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "hadith_tr_hadith_idx" ON "hadith_translations" USING btree ("hadith_id");--> statement-breakpoint
CREATE INDEX "hadith_tr_text_trgm" ON "hadith_translations" USING gin ("text" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "mentions_route_idx" ON "isnad_mentions" USING btree ("route_id","pos");--> statement-breakpoint
CREATE INDEX "mentions_person_idx" ON "isnad_mentions" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "routes_hadith_idx" ON "isnad_routes" USING btree ("hadith_id");--> statement-breakpoint
CREATE INDEX "person_names_person_idx" ON "person_names" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "person_names_value_trgm" ON "person_names" USING gin ("value" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "ppe_person_idx" ON "person_place_events" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "ppe_place_idx" ON "person_place_events" USING btree ("place_id");--> statement-breakpoint
CREATE INDEX "ppe_period_idx" ON "person_place_events" USING btree ("ah_min","ah_max");--> statement-breakpoint
CREATE INDEX "rels_subject_idx" ON "person_relationships" USING btree ("subject_id","predicate");--> statement-breakpoint
CREATE INDEX "rels_object_idx" ON "person_relationships" USING btree ("object_id","predicate");--> statement-breakpoint
CREATE UNIQUE INDEX "rels_uniq" ON "person_relationships" USING btree ("subject_id","predicate","object_id");--> statement-breakpoint
CREATE INDEX "persons_search_trgm" ON "persons" USING gin ("search_text" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "persons_name_ar_trgm" ON "persons" USING gin ("display_name_ar" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "persons_name_en_trgm" ON "persons" USING gin ("display_name_en" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "persons_death_idx" ON "persons" USING btree ("death_ah_min");--> statement-breakpoint
CREATE INDEX "persons_tabaqa_idx" ON "persons" USING btree ("tabaqa");--> statement-breakpoint
CREATE INDEX "places_name_trgm" ON "places" USING gin ("name_ar" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "pos_attr_position_idx" ON "position_attributions" USING btree ("position_id");--> statement-breakpoint
CREATE INDEX "pos_attr_person_idx" ON "position_attributions" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "positions_topic_idx" ON "positions" USING btree ("topic_id");--> statement-breakpoint
CREATE INDEX "passages_work_idx" ON "source_passages" USING btree ("work_id");--> statement-breakpoint
CREATE INDEX "topic_meanings_group_idx" ON "topic_meanings" USING btree ("meaning_group_id");--> statement-breakpoint
CREATE INDEX "topics_parent_idx" ON "topics" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "topics_lft_idx" ON "topics" USING btree ("lft","rgt");--> statement-breakpoint
CREATE INDEX "works_title_idx" ON "works" USING btree ("title_ar");