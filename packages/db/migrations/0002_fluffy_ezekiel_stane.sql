CREATE TABLE "person_matches" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"person_a" bigint NOT NULL,
	"person_b" bigint NOT NULL,
	"method" varchar(64) NOT NULL,
	"confidence" varchar(16) NOT NULL,
	"status" "claim_status" DEFAULT 'draft' NOT NULL,
	"source_id" bigint
);
--> statement-breakpoint
ALTER TABLE "person_matches" ADD CONSTRAINT "person_matches_person_a_persons_id_fk" FOREIGN KEY ("person_a") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_matches" ADD CONSTRAINT "person_matches_person_b_persons_id_fk" FOREIGN KEY ("person_b") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_matches" ADD CONSTRAINT "person_matches_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "person_matches_uniq" ON "person_matches" USING btree ("person_a","person_b","method");--> statement-breakpoint
CREATE INDEX "person_matches_a_idx" ON "person_matches" USING btree ("person_a");--> statement-breakpoint
CREATE INDEX "person_matches_b_idx" ON "person_matches" USING btree ("person_b");