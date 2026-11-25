import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgSequence,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const orderStatus = pgEnum("order_status", [
  "preparing",
  "ready",
  "completed",
]);
export const transactionType = pgEnum("transaction_type", ["sale", "expense"]);
export const orderNumberSequence = pgSequence("order_number_seq", {
  startWith: 101,
});

export const menuItems = pgTable(
  "menu_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    price: integer("price").notNull(),
    isAvailable: boolean("is_available").notNull().default(true),
    stockQty: integer("stock_qty").notNull().default(50),
    lowStockThreshold: integer("low_stock_threshold").notNull().default(10),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("menu_items_category_idx").on(table.category)],
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderNo: integer("order_no")
      .notNull()
      .unique()
      .default(sql`nextval('order_number_seq')`),
    customer: text("customer").notNull().default("Walk-in"),
    itemCount: integer("item_count").notNull(),
    total: integer("total").notNull(),
    status: orderStatus("status").notNull().default("preparing"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("orders_created_at_idx").on(table.createdAt)],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    menuItemId: uuid("menu_item_id").references(() => menuItems.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: integer("unit_price").notNull(),
  },
  (table) => [index("order_items_order_id_idx").on(table.orderId)],
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: transactionType("type").notNull(),
    category: text("category").notNull(),
    amount: integer("amount").notNull(),
    note: text("note").notNull().default(""),
    paymentMode: text("payment_mode").notNull().default("cash"),
    orderId: uuid("order_id").references(() => orders.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("transactions_created_at_idx").on(table.createdAt),
    index("transactions_type_idx").on(table.type),
    index("transactions_payment_mode_idx").on(table.paymentMode),
  ],
);

export const dailyClosings = pgTable(
  "daily_closings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessDate: date("business_date").notNull(),
    openingCash: integer("opening_cash").notNull().default(0),
    expectedCash: integer("expected_cash").notNull(),
    actualCash: integer("actual_cash").notNull(),
    difference: integer("difference").notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("daily_closings_business_date_idx").on(table.businessDate),
  ],
);

/**
 * Ingredient quantities are stored in small base units: ml, g or pieces.
 * Unit costs use paise per base unit to avoid floating-point cost drift.
 */
export const ingredients = pgTable(
  "ingredients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    unit: text("unit").notNull(),
    stockQty: integer("stock_qty").notNull().default(0),
    reorderAt: integer("reorder_at").notNull().default(0),
    unitCostPaise: integer("unit_cost_paise").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("ingredients_name_unique").on(table.name)],
);

export const recipeIngredients = pgTable(
  "recipe_ingredients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    menuItemId: uuid("menu_item_id").notNull().references(() => menuItems.id, { onDelete: "cascade" }),
    ingredientId: uuid("ingredient_id").notNull().references(() => ingredients.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
  },
  (table) => [
    uniqueIndex("recipe_ingredients_item_ingredient_unique").on(table.menuItemId, table.ingredientId),
  ],
);

export const ingredientPurchases = pgTable(
  "ingredient_purchases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ingredientId: uuid("ingredient_id").notNull().references(() => ingredients.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    totalCostPaise: integer("total_cost_paise").notNull(),
    supplier: text("supplier").notNull().default(""),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("ingredient_purchases_created_at_idx").on(table.createdAt)],
);

export const ingredientMovements = pgTable(
  "ingredient_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ingredientId: uuid("ingredient_id").notNull().references(() => ingredients.id, { onDelete: "restrict" }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }),
    quantityChange: integer("quantity_change").notNull(),
    unitCostPaise: integer("unit_cost_paise").notNull(),
    reason: text("reason").notNull(),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ingredient_movements_ingredient_idx").on(table.ingredientId),
    index("ingredient_movements_order_idx").on(table.orderId),
    index("ingredient_movements_created_at_idx").on(table.createdAt),
  ],
);

export type OnlineLine = { id: string; name: string; quantity: number; unitPrice: number };
export const onlineOrders = pgTable("online_orders", {
  id: uuid("id").primaryKey(),
  customer: text("customer").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull().default(""),
  fulfillment: text("fulfillment").notNull(),
  status: text("status").notNull().default("pending"),
  lines: jsonb("lines").$type<OnlineLine[]>().notNull(),
  subtotal: integer("subtotal").notNull(),
  deliveryFee: integer("delivery_fee").notNull().default(0),
  total: integer("total").notNull(),
  posOrderId: uuid("pos_order_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("online_orders_created_idx").on(table.createdAt),
  uniqueIndex("online_orders_active_phone_idx").on(table.phone).where(sql`status in ('pending','accepted','preparing','ready','out_for_delivery')`),
]);

export const onlineRateLimits = pgTable("online_rate_limits", {
  key: text("key").primaryKey(),
  bucket: integer("bucket").notNull(),
  hits: integer("hits").notNull().default(1),
});
