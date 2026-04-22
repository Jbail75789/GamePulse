import { pgTable, text, serial, integer, boolean, timestamp, real, varchar, json, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isPro: boolean("is_pro").default(false),
  pulseCharges: integer("pulse_charges").default(3),
  lastChargeRefill: timestamp("last_charge_refill").defaultNow(),
  email: text("email"),
});

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  status: text("status", { enum: ["active", "completed", "backlog", "wishlist"] }).notNull().default("backlog"),
  coverUrl: text("cover_url").notNull(),
  playtime: real("playtime").default(0),
  platform: text("platform").default("PC"),
  vibe: text("vibe", { enum: ["Chill", "Epic", "Gritty", "Quick Fix", "Competitive"] }),
  progress: integer("progress").default(0),
  targetHours: integer("target_hours").default(40),
  infiniteMode: boolean("infinite_mode").default(false),
});

// Declared so drizzle-kit doesn't try to drop the connect-pg-simple session table
export const sessions = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
}, (table) => ({
  expireIdx: index("IDX_session_expire").on(table.expire),
}));

export const promoCodes = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  usedBy: integer("used_by"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertGameSchema = createInsertSchema(games).omit({ 
  id: true, 
  userId: true 
}).extend({
  playtime: z.number().transform(v => Math.max(0, v ?? 0)).optional().default(0),
  targetHours: z.number().int().nullable().optional(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Game = typeof games.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;
