CREATE TABLE "guide_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(60) NOT NULL,
	"topic" varchar(20) NOT NULL,
	"section" varchar(20) DEFAULT 'none' NOT NULL,
	"faq_ar" varchar(200) DEFAULT '' NOT NULL,
	"faq_en" varchar(200) DEFAULT '' NOT NULL,
	"answer_ar" text NOT NULL,
	"answer_en" text NOT NULL,
	"keywords" text DEFAULT '' NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guide_entries_slug_unique" UNIQUE("slug"),
	CONSTRAINT "guide_entries_answer_len" CHECK (char_length("guide_entries"."answer_ar") between 1 and 2000 and char_length("guide_entries"."answer_en") between 1 and 2000)
);
--> statement-breakpoint
CREATE TABLE "support_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" varchar(10) NOT NULL,
	"value" varchar(320) NOT NULL,
	"label_ar" varchar(80) DEFAULT '' NOT NULL,
	"label_en" varchar(80) DEFAULT '' NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "support_contacts_kind" CHECK ("support_contacts"."kind" in ('whatsapp','email'))
);
