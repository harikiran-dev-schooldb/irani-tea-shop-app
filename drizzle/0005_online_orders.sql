CREATE TABLE "online_orders" (
  "id" uuid PRIMARY KEY NOT NULL,
  "customer" text NOT NULL,
  "phone" text NOT NULL,
  "address" text DEFAULT '' NOT NULL,
  "fulfillment" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "lines" jsonb NOT NULL,
  "subtotal" integer NOT NULL,
  "delivery_fee" integer DEFAULT 0 NOT NULL,
  "total" integer NOT NULL,
  "pos_order_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "online_orders_created_idx" ON "online_orders" USING btree ("created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "online_orders_active_phone_idx" ON "online_orders" USING btree ("phone") WHERE status in ('pending','accepted','preparing','ready','out_for_delivery');
