import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
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
