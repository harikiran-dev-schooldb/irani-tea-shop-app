CREATE TABLE "daily_closings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_date" date NOT NULL,
	"opening_cash" integer DEFAULT 0 NOT NULL,
	"expected_cash" integer NOT NULL,
	"actual_cash" integer NOT NULL,
	"difference" integer NOT NULL,
	"closed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"menu_item_id" uuid,
	"name" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "stock_qty" integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "low_stock_threshold" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_closings_business_date_idx" ON "daily_closings" USING btree ("business_date");--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id");