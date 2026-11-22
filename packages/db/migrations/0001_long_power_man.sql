ALTER TABLE "meaning_groups" ADD COLUMN "taraf_nass" text;--> statement-breakpoint
ALTER TABLE "meaning_groups" ADD COLUMN "taraf_hukm" varchar(128);--> statement-breakpoint
ALTER TABLE "meaning_groups" ADD COLUMN "matn_no" integer;--> statement-breakpoint
ALTER TABLE "meaning_groups" ADD COLUMN "is_qudsi" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "meaning_groups" ADD COLUMN "sahaba_qty" integer;--> statement-breakpoint
ALTER TABLE "meaning_groups" ADD COLUMN "repeat_qty" integer;