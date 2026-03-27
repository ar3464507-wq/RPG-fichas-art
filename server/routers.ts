import { COOKIE_NAME } from "@shared/const";
import { nanoid } from "nanoid";
import z from "zod";
import {
  createCampaign,
  createShare,
  deleteCampaign,
  deleteCharacter,
  deleteItem,
  deleteResource,
  deleteShare,
  deleteSkill,
  deleteAttribute,
  duplicateCharacter,
  getCampaignByInviteToken,
  getCampaignByUid,
  getCampaignMembers,
  getCampaignsByUser,
  getCharacterByUid,
  getCharactersByCampaign,
  getCharactersByOwner,
  getItems,
  getResources,
  getShareByToken,
  getSharesByCharacter,
  getSkills,
  getAttributes,
  getUserByOpenId,
  joinCampaign,
  updateCampaign,
  updateCharacter,
  updateUserPreferences,
  upsertAttribute,
  upsertItem,
  upsertResource,
  upsertSkill,
  createCharacter,
} from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";
import { getDb } from "./db";
import { campaigns } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// ─── Upload helper ────────────────────────────────────────────────────────────
function randomSuffix() {
  return nanoid(8);
}

// ─── App Router ───────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── User Preferences ─────────────────────────────────────────────────────
  user: router({
    updatePreferences: protectedProcedure
      .input(
        z.object({
          globalTheme: z.string().optional(),
          globalWallpaper: z.string().nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await updateUserPreferences(ctx.user.id, input);
        return { success: true };
      }),

    getPreferences: protectedProcedure.query(async ({ ctx }) => {
      const user = await getUserByOpenId(ctx.user.openId);
      return {
        globalTheme: user?.globalTheme ?? "classic",
        globalWallpaper: user?.globalWallpaper ?? null,
      };
    }),
  }),

  // ─── Characters ───────────────────────────────────────────────────────────
  character: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getCharactersByOwner(ctx.user.id);
    }),

    get: publicProcedure
      .input(z.object({ uid: z.string() }))
      .query(async ({ input }) => {
        return getCharacterByUid(input.uid);
      }),

    getWithData: publicProcedure
      .input(z.object({ uid: z.string(), shareToken: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        const char = await getCharacterByUid(input.uid);
        if (!char) return null;

        // Check access
        let canEdit = false;
        if (ctx.user && ctx.user.id === char.ownerId) {
          canEdit = true;
        } else if (ctx.user && char.campaignId) {
          // Check if user is the campaign owner
          const db = await getDb();
          if (db) {
            const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, char.campaignId)).limit(1);
            if (campaign && campaign.ownerId === ctx.user.id) {
              canEdit = true;
            }
          }
        } else if (input.shareToken) {
          const share = await getShareByToken(input.shareToken);
          if (share && share.characterId === char.id) {
            canEdit = share.permission === "edit";
          }
        }

        const [attributes, resources, skills, items] = await Promise.all([
          getAttributes(char.id),
          getResources(char.id),
          getSkills(char.id),
          getItems(char.id),
        ]);

        return { char, attributes, resources, skills, items, canEdit };
      }),

    create: protectedProcedure
      .input(z.object({ name: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const uid = `character-${nanoid(8)}`;
        await createCharacter({ uid, ownerId: ctx.user.id, name: input.name });
        const char = await getCharacterByUid(uid);
        if (!char) throw new Error("Failed to create character");

        // Create default attributes
        const defaults = [
          { label: "Força", value: 10 },
          { label: "Destreza", value: 10 },
          { label: "Constituição", value: 10 },
          { label: "Inteligência", value: 10 },
          { label: "Sabedoria", value: 10 },
          { label: "Carisma", value: 10 },
        ];
        for (let i = 0; i < defaults.length; i++) {
          await upsertAttribute({ characterId: char.id, ...defaults[i], sortOrder: i });
        }

        // Create default resources
        const defaultResources = [
          { label: "Vida", current: 20, max: 20, color: "#ef4444" },
          { label: "Sanidade", current: 10, max: 10, color: "#8b5cf6" },
          { label: "Energia", current: 15, max: 15, color: "#3b82f6" },
        ];
        for (let i = 0; i < defaultResources.length; i++) {
          await upsertResource({ characterId: char.id, ...defaultResources[i], sortOrder: i });
        }

        return { uid };
      }),

    update: protectedProcedure
      .input(
        z.object({
          uid: z.string(),
          name: z.string().optional(),
          playerName: z.string().optional(),
          imageUrl: z.string().nullable().optional(),
          wallpaperUrl: z.string().nullable().optional(),
          wallpaperOpacity: z.number().optional(),
          theme: z.string().optional(),
          rpgSystem: z.string().optional(),
          basicInfo: z.record(z.string(), z.object({ label: z.string(), value: z.string() })).optional(),
          levelLabel: z.string().optional(),
          levelValue: z.string().optional(),
          classLabel: z.string().optional(),
          classValue: z.string().optional(),
          originLabel: z.string().optional(),
          originValue: z.string().optional(),
          loreLabel: z.string().optional(),
          loreContent: z.string().optional(),
          loreVisible: z.boolean().optional(),
          isPrivate: z.boolean().optional(),
          campaignId: z.number().nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { uid, ...data } = input;
        const char = await getCharacterByUid(uid);
        if (!char || char.ownerId !== ctx.user.id) throw new Error("Not authorized");
        await updateCharacter(uid, data as Parameters<typeof updateCharacter>[1]);
        return { success: true };
      }),

    updateShared: publicProcedure
      .input(
        z.object({
          uid: z.string(),
          shareToken: z.string(),
          loreContent: z.string().optional(),
          levelValue: z.string().optional(),
          classValue: z.string().optional(),
          originValue: z.string().optional(),
          basicInfo: z.record(z.string(), z.object({ label: z.string(), value: z.string() })).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const share = await getShareByToken(input.shareToken);
        if (!share || share.permission !== "edit") throw new Error("Not authorized");
        const char = await getCharacterByUid(input.uid);
        if (!char || char.id !== share.characterId) throw new Error("Not authorized");
        const { uid, shareToken: _st, ...data } = input;
        await updateCharacter(uid, data as Parameters<typeof updateCharacter>[1]);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ uid: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await deleteCharacter(input.uid, ctx.user.id);
        return { success: true };
      }),

    duplicate: protectedProcedure
      .input(z.object({ uid: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const newUid = `character-${nanoid(8)}`;
        await duplicateCharacter(input.uid, newUid, ctx.user.id);
        return { uid: newUid };
      }),

    uploadImage: protectedProcedure
      .input(
        z.object({
          uid: z.string(),
          base64: z.string(),
          mimeType: z.string(),
          field: z.enum(["imageUrl", "wallpaperUrl"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const char = await getCharacterByUid(input.uid);
        if (!char || char.ownerId !== ctx.user.id) throw new Error("Not authorized");
        const buffer = Buffer.from(input.base64, "base64");
        const ext = input.mimeType.split("/")[1] ?? "jpg";
        const key = `characters/${input.uid}/${input.field}-${randomSuffix()}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        await updateCharacter(input.uid, { [input.field]: url });
        return { url };
      }),
  }),

  // ─── Attributes ───────────────────────────────────────────────────────────
  attribute: router({
    list: publicProcedure
      .input(z.object({ characterId: z.number() }))
      .query(async ({ input }) => getAttributes(input.characterId)),

    upsert: publicProcedure
      .input(
        z.object({
          id: z.number().optional(),
          characterId: z.number(),
          label: z.string(),
          value: z.number(),
          sortOrder: z.number().optional(),
          shareToken: z.string().optional(),
          ownerId: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Auth check
        if (!input.shareToken && (!ctx.user || ctx.user.id !== input.ownerId)) {
          throw new Error("Not authorized");
        }
        if (input.shareToken) {
          const share = await getShareByToken(input.shareToken);
          if (!share || share.permission !== "edit") throw new Error("Not authorized");
        }
        await upsertAttribute(input);
        return { success: true };
      }),

    delete: publicProcedure
      .input(
        z.object({
          id: z.number(),
          shareToken: z.string().optional(),
          ownerId: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!input.shareToken && (!ctx.user || ctx.user.id !== input.ownerId)) {
          throw new Error("Not authorized");
        }
        await deleteAttribute(input.id);
        return { success: true };
      }),
  }),

  // ─── Resources ────────────────────────────────────────────────────────────
  resource: router({
    list: publicProcedure
      .input(z.object({ characterId: z.number() }))
      .query(async ({ input }) => getResources(input.characterId)),

    upsert: publicProcedure
      .input(
        z.object({
          id: z.number().optional(),
          characterId: z.number(),
          label: z.string(),
          current: z.number(),
          max: z.number(),
          color: z.string().optional(),
          sortOrder: z.number().optional(),
          shareToken: z.string().optional(),
          ownerId: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!input.shareToken && (!ctx.user || ctx.user.id !== input.ownerId)) {
          throw new Error("Not authorized");
        }
        if (input.shareToken) {
          const share = await getShareByToken(input.shareToken);
          if (!share || share.permission !== "edit") throw new Error("Not authorized");
        }
        await upsertResource(input);
        return { success: true };
      }),

    delete: publicProcedure
      .input(
        z.object({
          id: z.number(),
          shareToken: z.string().optional(),
          ownerId: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!input.shareToken && (!ctx.user || ctx.user.id !== input.ownerId)) {
          throw new Error("Not authorized");
        }
        await deleteResource(input.id);
        return { success: true };
      }),
  }),

  // ─── Skills ───────────────────────────────────────────────────────────────
  skill: router({
    list: publicProcedure
      .input(z.object({ characterId: z.number() }))
      .query(async ({ input }) => getSkills(input.characterId)),

    upsert: publicProcedure
      .input(
        z.object({
          id: z.number().optional(),
          characterId: z.number(),
          category: z.string().default("Geral"),
          name: z.string(),
          value: z.number().default(0),
          description: z.string().optional(),
          sortOrder: z.number().optional(),
          shareToken: z.string().optional(),
          ownerId: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!input.shareToken && (!ctx.user || ctx.user.id !== input.ownerId)) {
          throw new Error("Not authorized");
        }
        if (input.shareToken) {
          const share = await getShareByToken(input.shareToken);
          if (!share || share.permission !== "edit") throw new Error("Not authorized");
        }
        await upsertSkill(input);
        return { success: true };
      }),

    delete: publicProcedure
      .input(
        z.object({
          id: z.number(),
          shareToken: z.string().optional(),
          ownerId: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!input.shareToken && (!ctx.user || ctx.user.id !== input.ownerId)) {
          throw new Error("Not authorized");
        }
        await deleteSkill(input.id);
        return { success: true };
      }),
  }),

  // ─── Items ────────────────────────────────────────────────────────────────
  item: router({
    list: publicProcedure
      .input(z.object({ characterId: z.number() }))
      .query(async ({ input }) => getItems(input.characterId)),

    upsert: publicProcedure
      .input(
        z.object({
          id: z.number().optional(),
          characterId: z.number(),
          name: z.string(),
          description: z.string().optional(),
          quantity: z.number().optional(),
          sortOrder: z.number().optional(),
          shareToken: z.string().optional(),
          ownerId: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!input.shareToken && (!ctx.user || ctx.user.id !== input.ownerId)) {
          throw new Error("Not authorized");
        }
        if (input.shareToken) {
          const share = await getShareByToken(input.shareToken);
          if (!share || share.permission !== "edit") throw new Error("Not authorized");
        }
        await upsertItem(input);
        return { success: true };
      }),

    delete: publicProcedure
      .input(
        z.object({
          id: z.number(),
          shareToken: z.string().optional(),
          ownerId: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!input.shareToken && (!ctx.user || ctx.user.id !== input.ownerId)) {
          throw new Error("Not authorized");
        }
        await deleteItem(input.id);
        return { success: true };
      }),
  }),

  // ─── Shares ───────────────────────────────────────────────────────────────
  share: router({
    create: protectedProcedure
      .input(
        z.object({
          characterUid: z.string(),
          permission: z.enum(["view", "edit"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const char = await getCharacterByUid(input.characterUid);
        if (!char || char.ownerId !== ctx.user.id) throw new Error("Not authorized");
        const shareToken = nanoid(16);
        await createShare({ characterId: char.id, shareToken, permission: input.permission });
        return { shareToken };
      }),

    list: protectedProcedure
      .input(z.object({ characterUid: z.string() }))
      .query(async ({ ctx, input }) => {
        const char = await getCharacterByUid(input.characterUid);
        if (!char || char.ownerId !== ctx.user.id) return [];
        return getSharesByCharacter(char.id);
      }),

    delete: protectedProcedure
      .input(z.object({ shareId: z.number(), characterUid: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const char = await getCharacterByUid(input.characterUid);
        if (!char || char.ownerId !== ctx.user.id) throw new Error("Not authorized");
        await deleteShare(input.shareId);
        return { success: true };
      }),

    validate: publicProcedure
      .input(z.object({ shareToken: z.string() }))
      .query(async ({ input }) => {
        const share = await getShareByToken(input.shareToken);
        if (!share) return null;
        return { permission: share.permission, characterId: share.characterId };
      }),
  }),

  // ─── Campaigns ────────────────────────────────────────────────────────────
  campaign: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getCampaignsByUser(ctx.user.id);
    }),

    get: publicProcedure
      .input(z.object({ uid: z.string() }))
      .query(async ({ input }) => {
        const campaign = await getCampaignByUid(input.uid);
        if (!campaign) return null;
        const chars = await getCharactersByCampaign(campaign.id);
        const members = await getCampaignMembers(campaign.id);
        return { campaign, characters: chars, members };
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const uid = `campaign-${nanoid(7)}`;
        const inviteToken = nanoid(16);
        await createCampaign({
          uid,
          ownerId: ctx.user.id,
          name: input.name,
          description: input.description,
          inviteToken,
        });
        return { uid };
      }),

    update: protectedProcedure
      .input(
        z.object({
          uid: z.string(),
          name: z.string().optional(),
          description: z.string().optional(),
          imageUrl: z.string().nullable().optional(),
          theme: z.string().optional(),
          wallpaper: z.string().nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { uid, ...data } = input;
        const campaign = await getCampaignByUid(uid);
        if (!campaign || campaign.ownerId !== ctx.user.id) throw new Error("Not authorized");
        await updateCampaign(uid, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ uid: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await deleteCampaign(input.uid, ctx.user.id);
        return { success: true };
      }),

    join: protectedProcedure
      .input(z.object({ inviteToken: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const campaign = await getCampaignByInviteToken(input.inviteToken);
        if (!campaign) throw new Error("Campanha não encontrada");
        await joinCampaign(campaign.id, ctx.user.id);
        return { uid: campaign.uid };
      }),

    uploadImage: protectedProcedure
      .input(
        z.object({
          uid: z.string(),
          base64: z.string(),
          mimeType: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const campaign = await getCampaignByUid(input.uid);
        if (!campaign || campaign.ownerId !== ctx.user.id) throw new Error("Not authorized");
        const buffer = Buffer.from(input.base64, "base64");
        const ext = input.mimeType.split("/")[1] ?? "jpg";
        const key = `campaigns/${input.uid}/image-${randomSuffix()}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        await updateCampaign(input.uid, { imageUrl: url });
        return { url };
      }),
  }),
});

export type AppRouter = typeof appRouter;
