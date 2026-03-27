import { and, eq, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  Campaign,
  CampaignMember,
  Character,
  CharacterAttribute,
  CharacterItem,
  CharacterResource,
  CharacterShare,
  CharacterSkill,
  InsertUser,
  campaignMembers,
  campaigns,
  characterAttributes,
  characterItems,
  characterResources,
  characterShares,
  characterSkills,
  characters,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;

  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function updateUserPreferences(
  userId: number,
  prefs: { globalTheme?: string; globalWallpaper?: string | null }
) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(prefs).where(eq(users.id, userId));
}

// ─── Characters ───────────────────────────────────────────────────────────────
export async function getCharactersByOwner(ownerId: number): Promise<Character[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(characters).where(eq(characters.ownerId, ownerId));
}

export async function getCharacterByUid(uid: string): Promise<Character | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(characters).where(eq(characters.uid, uid)).limit(1);
  return result[0];
}

export async function createCharacter(data: {
  uid: string;
  ownerId: number;
  name?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(characters).values({
    uid: data.uid,
    ownerId: data.ownerId,
    name: data.name ?? "Novo Personagem",
  });
}

export async function updateCharacter(
  uid: string,
  data: Partial<Omit<Character, "id" | "uid" | "ownerId" | "createdAt">>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(characters).set(data).where(eq(characters.uid, uid));
}

export async function deleteCharacter(uid: string, ownerId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(characters)
    .where(and(eq(characters.uid, uid), eq(characters.ownerId, ownerId)));
}

export async function duplicateCharacter(
  sourceUid: string,
  newUid: string,
  ownerId: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const [source] = await db
    .select()
    .from(characters)
    .where(eq(characters.uid, sourceUid))
    .limit(1);
  if (!source) return;

  const { id: _id, uid: _uid, createdAt: _ca, updatedAt: _ua, ...rest } = source;
  await db.insert(characters).values({ ...rest, uid: newUid, ownerId, name: `${source.name} (cópia)` });

  const sourceId = source.id;
  const [newChar] = await db
    .select()
    .from(characters)
    .where(eq(characters.uid, newUid))
    .limit(1);
  if (!newChar) return;
  const newId = newChar.id;

  const attrs = await db
    .select()
    .from(characterAttributes)
    .where(eq(characterAttributes.characterId, sourceId));
  for (const a of attrs) {
    const { id: _id, characterId: _cid, ...rest } = a;
    await db.insert(characterAttributes).values({ ...rest, characterId: newId });
  }

  const resources = await db
    .select()
    .from(characterResources)
    .where(eq(characterResources.characterId, sourceId));
  for (const r of resources) {
    const { id: _id, characterId: _cid, ...rest } = r;
    await db.insert(characterResources).values({ ...rest, characterId: newId });
  }

  const skills = await db
    .select()
    .from(characterSkills)
    .where(eq(characterSkills.characterId, sourceId));
  for (const s of skills) {
    const { id: _id, characterId: _cid, ...rest } = s;
    await db.insert(characterSkills).values({ ...rest, characterId: newId });
  }

  const items = await db
    .select()
    .from(characterItems)
    .where(eq(characterItems.characterId, sourceId));
  for (const item of items) {
    const { id: _id, characterId: _cid, ...rest } = item;
    await db.insert(characterItems).values({ ...rest, characterId: newId });
  }
}

// ─── Attributes ───────────────────────────────────────────────────────────────
export async function getAttributes(characterId: number): Promise<CharacterAttribute[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(characterAttributes)
    .where(eq(characterAttributes.characterId, characterId));
}

export async function upsertAttribute(data: {
  id?: number;
  characterId: number;
  label: string;
  value: number;
  sortOrder?: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  if (data.id) {
    await db
      .update(characterAttributes)
      .set({ label: data.label, value: data.value, sortOrder: data.sortOrder ?? 0 })
      .where(eq(characterAttributes.id, data.id));
  } else {
    await db.insert(characterAttributes).values({
      characterId: data.characterId,
      label: data.label,
      value: data.value,
      sortOrder: data.sortOrder ?? 0,
    });
  }
}

export async function deleteAttribute(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(characterAttributes).where(eq(characterAttributes.id, id));
}

// ─── Resources ────────────────────────────────────────────────────────────────
export async function getResources(characterId: number): Promise<CharacterResource[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(characterResources)
    .where(eq(characterResources.characterId, characterId));
}

export async function upsertResource(data: {
  id?: number;
  characterId: number;
  label: string;
  current: number;
  max: number;
  color?: string;
  sortOrder?: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  if (data.id) {
    await db
      .update(characterResources)
      .set({
        label: data.label,
        current: data.current,
        max: data.max,
        color: data.color ?? "#ef4444",
        sortOrder: data.sortOrder ?? 0,
      })
      .where(eq(characterResources.id, data.id));
  } else {
    await db.insert(characterResources).values({
      characterId: data.characterId,
      label: data.label,
      current: data.current,
      max: data.max,
      color: data.color ?? "#ef4444",
      sortOrder: data.sortOrder ?? 0,
    });
  }
}

export async function deleteResource(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(characterResources).where(eq(characterResources.id, id));
}

// ─── Skills ───────────────────────────────────────────────────────────────────
export async function getSkills(characterId: number): Promise<CharacterSkill[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(characterSkills).where(eq(characterSkills.characterId, characterId));
}

export async function upsertSkill(data: {
  id?: number;
  characterId: number;
  name: string;
  description?: string;
  sortOrder?: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  if (data.id) {
    await db
      .update(characterSkills)
      .set({ name: data.name, description: data.description, sortOrder: data.sortOrder ?? 0 })
      .where(eq(characterSkills.id, data.id));
  } else {
    await db.insert(characterSkills).values({
      characterId: data.characterId,
      name: data.name,
      description: data.description,
      sortOrder: data.sortOrder ?? 0,
    });
  }
}

export async function deleteSkill(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(characterSkills).where(eq(characterSkills.id, id));
}

// ─── Items ────────────────────────────────────────────────────────────────────
export async function getItems(characterId: number): Promise<CharacterItem[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(characterItems).where(eq(characterItems.characterId, characterId));
}

export async function upsertItem(data: {
  id?: number;
  characterId: number;
  name: string;
  description?: string;
  quantity?: number;
  sortOrder?: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  if (data.id) {
    await db
      .update(characterItems)
      .set({
        name: data.name,
        description: data.description,
        quantity: data.quantity ?? 1,
        sortOrder: data.sortOrder ?? 0,
      })
      .where(eq(characterItems.id, data.id));
  } else {
    await db.insert(characterItems).values({
      characterId: data.characterId,
      name: data.name,
      description: data.description,
      quantity: data.quantity ?? 1,
      sortOrder: data.sortOrder ?? 0,
    });
  }
}

export async function deleteItem(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(characterItems).where(eq(characterItems.id, id));
}

// ─── Shares ───────────────────────────────────────────────────────────────────
export async function createShare(data: {
  characterId: number;
  shareToken: string;
  permission: "view" | "edit";
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(characterShares).values(data);
}

export async function getShareByToken(token: string): Promise<CharacterShare | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(characterShares)
    .where(eq(characterShares.shareToken, token))
    .limit(1);
  return result[0];
}

export async function getSharesByCharacter(characterId: number): Promise<CharacterShare[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(characterShares)
    .where(eq(characterShares.characterId, characterId));
}

export async function deleteShare(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(characterShares).where(eq(characterShares.id, id));
}

// ─── Campaigns ────────────────────────────────────────────────────────────────
export async function getCampaignsByUser(userId: number): Promise<Campaign[]> {
  const db = await getDb();
  if (!db) return [];
  const memberRows = await db
    .select()
    .from(campaignMembers)
    .where(eq(campaignMembers.userId, userId));
  if (!memberRows.length) return [];
  const ids = memberRows.map((m) => m.campaignId);
  return db
    .select()
    .from(campaigns)
    .where(or(...ids.map((id) => eq(campaigns.id, id))));
}

export async function getCampaignByUid(uid: string): Promise<Campaign | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(campaigns).where(eq(campaigns.uid, uid)).limit(1);
  return result[0];
}

export async function getCampaignByInviteToken(token: string): Promise<Campaign | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.inviteToken, token))
    .limit(1);
  return result[0];
}

export async function createCampaign(data: {
  uid: string;
  ownerId: number;
  name: string;
  description?: string;
  inviteToken: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  await db.insert(campaigns).values(data);
  
  // Retrieve the inserted campaign by uid to get the actual id
  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.uid, data.uid)).limit(1);
  if (!campaign) throw new Error("Failed to create campaign");
  
  await db.insert(campaignMembers).values({
    campaignId: campaign.id,
    userId: data.ownerId,
    role: "owner",
  });
  return campaign.id;
}

export async function updateCampaign(
  uid: string,
  data: Partial<Omit<Campaign, "id" | "uid" | "ownerId" | "createdAt">>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(campaigns).set(data).where(eq(campaigns.uid, uid));
}

export async function deleteCampaign(uid: string, ownerId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const [camp] = await db.select().from(campaigns).where(eq(campaigns.uid, uid)).limit(1);
  if (!camp || camp.ownerId !== ownerId) return;
  await db.delete(campaignMembers).where(eq(campaignMembers.campaignId, camp.id));
  await db.delete(campaigns).where(eq(campaigns.id, camp.id));
}

export async function joinCampaign(campaignId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await db
    .select()
    .from(campaignMembers)
    .where(
      and(eq(campaignMembers.campaignId, campaignId), eq(campaignMembers.userId, userId))
    )
    .limit(1);
  if (existing.length) return;
  await db.insert(campaignMembers).values({ campaignId, userId, role: "member" });
}

export async function getCampaignMembers(campaignId: number): Promise<CampaignMember[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(campaignMembers)
    .where(eq(campaignMembers.campaignId, campaignId));
}

export async function getCharactersByCampaign(campaignId: number): Promise<Character[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(characters).where(eq(characters.campaignId, campaignId));
}
