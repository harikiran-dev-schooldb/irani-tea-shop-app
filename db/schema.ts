import { sql } from "drizzle-orm";
import { boolean, index, integer, pgEnum, pgSequence, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const orderStatus = pgEnum("order_status", ["preparing", "ready", "completed"]);
export const transactionType = pgEnum("transaction_type", ["sale", "expense"]);
export const orderNumberSequence = pgSequence("order_number_seq", { startWith: 101 });

export const menuItems = pgTable("menu_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  price: integer("price").notNull(),
  isAvailable: boolean("is_available").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("menu_items_category_idx").on(table.category)]);

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNo: integer("order_no").notNull().unique().default(sql`nextval('order_number_seq')`),
  customer: text("customer").notNull().default("Walk-in"),
  itemCount: integer("item_count").notNull(),
  total: integer("total").notNull(),
  status: orderStatus("status").notNull().default("preparing"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("orders_created_at_idx").on(table.createdAt)]);

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: transactionType("type").notNull(),
  category: text("category").notNull(),
  amount: integer("amount").notNull(),
  note: text("note").notNull().default(""),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("transactions_created_at_idx").on(table.createdAt),
  index("transactions_type_idx").on(table.type),
]);
