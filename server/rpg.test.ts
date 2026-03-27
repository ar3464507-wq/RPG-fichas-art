import { describe, expect, it, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the DB module
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
  getCharactersByOwner: vi.fn().mockResolvedValue([]),
  getCharacterByUid: vi.fn().mockResolvedValue(null),
  createCharacter: vi.fn().mockResolvedValue({ id: 1, uid: "test-uid", ownerId: 1, name: "Test", createdAt: new Date(), updatedAt: new Date() }),
  updateCharacter: vi.fn().mockResolvedValue(undefined),
  deleteCharacter: vi.fn().mockResolvedValue(undefined),
  getCharacterData: vi.fn().mockResolvedValue({ attributes: [], resources: [], skills: [], items: [] }),
  getShareByToken: vi.fn().mockResolvedValue(null),
  createShare: vi.fn().mockResolvedValue({ shareToken: "abc123", permission: "view" }),
  getCampaignsByUser: vi.fn().mockResolvedValue([]),
  getCampaignByUid: vi.fn().mockResolvedValue(null),
  createCampaign: vi.fn().mockResolvedValue({ id: 1, uid: "camp-uid", name: "Test Campaign", ownerId: 1, inviteToken: "invite123", createdAt: new Date(), updatedAt: new Date() }),
  deleteCampaign: vi.fn().mockResolvedValue(undefined),
  getCampaignByInviteToken: vi.fn().mockResolvedValue(null),
  addCharacterToCampaign: vi.fn().mockResolvedValue(undefined),
  getCampaignCharacters: vi.fn().mockResolvedValue([]),
  getUserPreferences: vi.fn().mockResolvedValue(null),
  upsertUserPreferences: vi.fn().mockResolvedValue(undefined),
  duplicateCharacter: vi.fn().mockResolvedValue({ id: 2, uid: "dup-uid", ownerId: 1, name: "Test Copy", createdAt: new Date(), updatedAt: new Date() }),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://cdn.example.com/image.png", key: "test-key" }),
}));

function makeCtx(userId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: "test-open-id",
      name: "Test User",
      email: "test@example.com",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("auth.me", () => {
  it("returns the current user when authenticated", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.id).toBe(1);
    expect(result?.name).toBe("Test User");
  });

  it("returns null when unauthenticated", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

describe("character.list", () => {
  it("returns empty array when user has no characters", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.character.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });
});

describe("campaign.list", () => {
  it("returns empty array when user has no campaigns", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.campaign.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
  });
});
