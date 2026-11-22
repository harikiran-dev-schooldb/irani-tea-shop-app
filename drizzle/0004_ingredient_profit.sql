CREATE TABLE "ingredients" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "unit" text NOT NULL,
  "stock_qty" integer DEFAULT 0 NOT NULL,
  "reorder_at" integer DEFAULT 0 NOT NULL,
  "unit_cost_paise" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "ingredients_name_unique" ON "ingredients" USING btree ("name");
--> statement-breakpoint
CREATE TABLE "recipe_ingredients" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "menu_item_id" uuid NOT NULL,
  "ingredient_id" uuid NOT NULL,
  "quantity" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "recipe_ingredients_item_ingredient_unique" ON "recipe_ingredients" USING btree ("menu_item_id", "ingredient_id");
--> statement-breakpoint
CREATE TABLE "ingredient_purchases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ingredient_id" uuid NOT NULL,
  "quantity" integer NOT NULL,
  "total_cost_paise" integer NOT NULL,
  "supplier" text DEFAULT '' NOT NULL,
  "note" text DEFAULT '' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ingredient_purchases" ADD CONSTRAINT "ingredient_purchases_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "ingredient_purchases_created_at_idx" ON "ingredient_purchases" USING btree ("created_at");
--> statement-breakpoint
CREATE TABLE "ingredient_movements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ingredient_id" uuid NOT NULL,
  "order_id" uuid,
  "quantity_change" integer NOT NULL,
  "unit_cost_paise" integer NOT NULL,
  "reason" text NOT NULL,
  "note" text DEFAULT '' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ingredient_movements" ADD CONSTRAINT "ingredient_movements_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ingredient_movements" ADD CONSTRAINT "ingredient_movements_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "ingredient_movements_ingredient_idx" ON "ingredient_movements" USING btree ("ingredient_id");
--> statement-breakpoint
CREATE INDEX "ingredient_movements_order_idx" ON "ingredient_movements" USING btree ("order_id");
--> statement-breakpoint
CREATE INDEX "ingredient_movements_created_at_idx" ON "ingredient_movements" USING btree ("created_at");
--> statement-breakpoint
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_stock_nonnegative" CHECK ("stock_qty" >= 0);
--> statement-breakpoint
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_cost_nonnegative" CHECK ("unit_cost_paise" >= 0);
--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_quantity_positive" CHECK ("quantity" > 0);
--> statement-breakpoint
ALTER TABLE "ingredient_purchases" ADD CONSTRAINT "purchase_quantity_positive" CHECK ("quantity" > 0);
