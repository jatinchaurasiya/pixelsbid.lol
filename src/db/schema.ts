import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  date,
  boolean,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Better Auth core tables
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// App tables
export const canvasConfig = pgTable("canvas_config", {
  id: integer("id").primaryKey().default(1),
  width: integer("width").notNull().default(1000),
  height: integer("height").notNull().default(1000),
  unitPriceCents: integer("unit_price_cents").notNull().default(100),
  pricingMode: text("pricing_mode").notNull().default("squared"),
  leaseDays: integer("lease_days").notNull().default(30),
  minSize: integer("min_size").notNull().default(1),
  maxSize: integer("max_size").notNull().default(50),
});

export const pixelBlocks = pgTable("pixel_blocks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  x: integer("x").notNull(),
  y: integer("y").notNull(),
  size: integer("size").notNull(),
  ownerId: text("owner_id").references(() => user.id),
  status: text("status").notNull().default("reserved"),
  imageUrl: text("image_url"),
  targetUrl: text("target_url"),
  title: text("title"),
  category: text("category"),
  clicks: integer("clicks").notNull().default(0),
  impressions: integer("impressions").notNull().default(0),
  priceCents: integer("price_cents").notNull(),
  reservedAt: timestamp("reserved_at", { withTimezone: true }).defaultNow(),
  reservationExpiresAt: timestamp("reservation_expires_at", { withTimezone: true }),
  rentedAt: timestamp("rented_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  blockId: uuid("block_id").references(() => pixelBlocks.id),
  userId: text("user_id").references(() => user.id),
  dodoPaymentId: text("dodo_payment_id").unique(),
  amountCents: integer("amount_cents").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
});

export const moderationQueue = pgTable("moderation_queue", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  blockId: uuid("block_id").references(() => pixelBlocks.id),
  autoFlagReason: text("auto_flag_reason"),
  status: text("status").notNull().default("pending"),
  reviewedBy: text("reviewed_by").references(() => user.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const siteStats = pgTable("site_stats", {
  date: date("date").primaryKey(),
  visitors: integer("visitors").default(0),
  blocksSold: integer("blocks_sold").default(0),
  revenueCents: integer("revenue_cents").default(0),
});
