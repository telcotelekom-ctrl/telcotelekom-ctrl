import { pgTable, serial, text, timestamp, integer, unique } from "drizzle-orm/pg-core";

export const channels = pgTable("channels", {
  id: serial().primaryKey(),
  name: text().notNull(),
  url: text().notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const plays = pgTable("plays", {
  id: serial().primaryKey(),
  url: text().notNull(),
  playedAt: timestamp("played_at").defaultNow().notNull(),
});

// ---- Warehouse ----
export const products = pgTable("products", {
  id: serial().primaryKey(),
  sku: text().notNull().unique(),
  name: text().notNull(),
  category: text().notNull().default(""),
  unit: text().notNull().default("pcs"),
  weightGrams: integer("weight_grams").notNull().default(0),
  priceCents: integer("price_cents").notNull().default(0),
  currency: text().notNull().default("EUR"),
  barcode: text(),
  reorderPoint: integer("reorder_point").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const stock = pgTable(
  "stock",
  {
    id: serial().primaryKey(),
    sku: text().notNull().references(() => products.sku, { onDelete: "cascade", onUpdate: "cascade" }),
    location: text().notNull().default("MAIN"),
    qty: integer().notNull().default(0),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [unique("stock_sku_location").on(t.sku, t.location)]
);

export const stockMoves = pgTable("stock_moves", {
  id: serial().primaryKey(),
  sku: text().notNull(),
  location: text().notNull(),
  delta: integer().notNull(),
  reason: text().notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
