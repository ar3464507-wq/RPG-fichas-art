import {
  boolean,
  float,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  globalTheme: varchar("globalTheme", { length: 32 }).default("classic"),
  globalWallpaper: text("globalWallpaper"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Campaigns ────────────────────────────────────────────────────────────────
export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  uid: varchar("uid", { length: 64 }).notNull().unique(), // campaign-xxxx
  ownerId: int("ownerId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: text("imageUrl"),
  theme: varchar("theme", { length: 32 }).default("classic"),
  wallpaper: text("wallpaper"),
  inviteToken: varchar("inviteToken", { length: 64 }).unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

// ─── Campaign Members ─────────────────────────────────────────────────────────
export const campaignMembers = mysqlTable("campaign_members", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "member"]).default("member").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

export type CampaignMember = typeof campaignMembers.$inferSelect;

// ─── Characters ───────────────────────────────────────────────────────────────
export const characters = mysqlTable("characters", {
  id: int("id").autoincrement().primaryKey(),
  uid: varchar("uid", { length: 64 }).notNull().unique(), // character-xxxx
  ownerId: int("ownerId").notNull(),
  campaignId: int("campaignId"),
  name: varchar("name", { length: 255 }).default("Novo Personagem"),
  playerName: varchar("playerName", { length: 255 }),
  imageUrl: text("imageUrl"),
  wallpaperUrl: text("wallpaperUrl"),
  wallpaperOpacity: float("wallpaperOpacity").default(0.3),
  theme: varchar("theme", { length: 32 }).default("classic"),
  rpgSystem: varchar("rpgSystem", { length: 128 }),
  // Basic info fields (stored as JSON for flexibility)
  basicInfo: json("basicInfo").$type<Record<string, { label: string; value: string }>>(),
  // Level field
  levelLabel: varchar("levelLabel", { length: 64 }).default("Nível"),
  levelValue: varchar("levelValue", { length: 64 }).default("1"),
  // Class & Origin
  classLabel: varchar("classLabel", { length: 64 }).default("Classe"),
  classValue: varchar("classValue", { length: 255 }),
  originLabel: varchar("originLabel", { length: 64 }).default("Origem"),
  originValue: varchar("originValue", { length: 255 }),
  // Lore
  loreLabel: varchar("loreLabel", { length: 64 }).default("História & Anotações"),
  loreContent: text("loreContent"),
  loreVisible: boolean("loreVisible").default(true),
  isPrivate: boolean("isPrivate").default(false), // Se true, só o dono e criador da campanha veem a ficha completa
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Character = typeof characters.$inferSelect;
export type InsertCharacter = typeof characters.$inferInsert;

// ─── Character Attributes ─────────────────────────────────────────────────────
export const characterAttributes = mysqlTable("character_attributes", {
  id: int("id").autoincrement().primaryKey(),
  characterId: int("characterId").notNull(),
  label: varchar("label", { length: 128 }).notNull(),
  value: int("value").default(0),
  sortOrder: int("sortOrder").default(0),
});

export type CharacterAttribute = typeof characterAttributes.$inferSelect;
export type InsertCharacterAttribute = typeof characterAttributes.$inferInsert;

// ─── Character Resources ──────────────────────────────────────────────────────
export const characterResources = mysqlTable("character_resources", {
  id: int("id").autoincrement().primaryKey(),
  characterId: int("characterId").notNull(),
  label: varchar("label", { length: 128 }).notNull(),
  current: int("current").default(0),
  max: int("max").default(100),
  color: varchar("color", { length: 32 }).default("#ef4444"),
  sortOrder: int("sortOrder").default(0),
});

export type CharacterResource = typeof characterResources.$inferSelect;
export type InsertCharacterResource = typeof characterResources.$inferInsert;

// ─── Character Skills ─────────────────────────────────────────────────────────
export const characterSkills = mysqlTable("character_skills", {
  id: int("id").autoincrement().primaryKey(),
  characterId: int("characterId").notNull(),
  category: varchar("category", { length: 255 }).default("Geral"),
  name: varchar("name", { length: 255 }).notNull(),
  value: int("value").default(0),
  description: text("description"),
  sortOrder: int("sortOrder").default(0),
});

export type CharacterSkill = typeof characterSkills.$inferSelect;
export type InsertCharacterSkill = typeof characterSkills.$inferInsert;

// ─── Character Items (Inventory) ──────────────────────────────────────────────
export const characterItems = mysqlTable("character_items", {
  id: int("id").autoincrement().primaryKey(),
  characterId: int("characterId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  quantity: int("quantity").default(1),
  sortOrder: int("sortOrder").default(0),
});

export type CharacterItem = typeof characterItems.$inferSelect;
export type InsertCharacterItem = typeof characterItems.$inferInsert;

// ─── Character Shares ─────────────────────────────────────────────────────────
export const characterShares = mysqlTable("character_shares", {
  id: int("id").autoincrement().primaryKey(),
  characterId: int("characterId").notNull(),
  shareToken: varchar("shareToken", { length: 64 }).notNull().unique(),
  permission: mysqlEnum("permission", ["view", "edit"]).default("view").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CharacterShare = typeof characterShares.$inferSelect;
