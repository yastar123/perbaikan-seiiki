import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  landingCmsTable,
  DEFAULT_CMS_CONTENT,
  type CmsLandingContent,
  type CmsNavbar,
  type CmsFlow,
  type CmsHero,
  type CmsAssurance,
  type CmsFooter,
} from "@workspace/db";

const router: IRouter = Router();

async function getOrInitCms(): Promise<any> {
  const [existing] = await db.select().from(landingCmsTable).limit(1);
  if (existing) {
    let hasChanges = false;
    const updatedData: any = {};

    if (existing.flow?.titleLine1 === "Rapi sejak" && existing.flow?.titleLine2Accent === "pesan pertama.") {
      updatedData.flow = {
        ...existing.flow,
        titleLine1: "JASA KETENAGALISTRIKAN",
        titleLine2Accent: "LAMPUNG",
      };
      hasChanges = true;
    }

    // Ensure 'Hubungi Admin WhatsApp' is removed from footer links
    if (existing.footer?.links && Array.isArray(existing.footer.links)) {
      const filteredLinks = existing.footer.links.filter(
        (l: any) => !l.label?.toLowerCase().includes("hubungi admin whatsapp")
      );
      if (filteredLinks.length !== existing.footer.links.length) {
        updatedData.footer = {
          ...existing.footer,
          links: filteredLinks,
        };
        hasChanges = true;
      }
    }

    if (!existing.disclaimer) {
      updatedData.disclaimer = DEFAULT_CMS_CONTENT.disclaimer;
      hasChanges = true;
    }

    if (!existing.gallery) {
      updatedData.gallery = DEFAULT_CMS_CONTENT.gallery;
      hasChanges = true;
    }

    if (hasChanges) {
      const [updated] = await db
        .update(landingCmsTable)
        .set({ ...updatedData, updatedAt: new Date() })
        .where(eq(landingCmsTable.id, existing.id))
        .returning();
      return updated;
    }
    return existing;
  }
  const [created] = await db
    .insert(landingCmsTable)
    .values({
      navbar: DEFAULT_CMS_CONTENT.navbar,
      flow: DEFAULT_CMS_CONTENT.flow,
      hero: DEFAULT_CMS_CONTENT.hero,
      assurance: DEFAULT_CMS_CONTENT.assurance,
      footer: DEFAULT_CMS_CONTENT.footer,
      disclaimer: DEFAULT_CMS_CONTENT.disclaimer,
      gallery: DEFAULT_CMS_CONTENT.gallery,
    })
    .returning();
  return created;
}

// GET /api/cms - Fetch public CMS configuration
router.get("/cms", async (_req, res): Promise<void> => {
  try {
    const cms = await getOrInitCms();
    res.json(cms);
  } catch (err: any) {
    console.error("[CMS] Error getting CMS:", err);
    res.status(500).json({ error: err?.message || "Gagal mengambil data CMS" });
  }
});

// PUT /api/cms - Update entire or partial CMS configuration
router.put("/cms", async (req, res): Promise<void> => {
  try {
    const current = await getOrInitCms();
    const body = req.body || {};

    const updatedData: Partial<CmsLandingContent> = {};
    if (body.navbar !== undefined) updatedData.navbar = body.navbar;
    if (body.flow !== undefined) updatedData.flow = body.flow;
    if (body.hero !== undefined) updatedData.hero = body.hero;
    if (body.assurance !== undefined) updatedData.assurance = body.assurance;
    if (body.footer !== undefined) updatedData.footer = body.footer;
    if (body.disclaimer !== undefined) updatedData.disclaimer = body.disclaimer;
    if (body.gallery !== undefined) updatedData.gallery = body.gallery;

    const [updated] = await db
      .update(landingCmsTable)
      .set({
        ...updatedData,
        updatedAt: new Date(),
      })
      .where(eq(landingCmsTable.id, current.id))
      .returning();

    res.json(updated);
  } catch (err: any) {
    console.error("[CMS] Error updating CMS:", err);
    res.status(500).json({ error: err?.message || "Gagal memperbarui data CMS" });
  }
});

// POST /api/cms/reset - Reset CMS back to original defaults
router.post("/cms/reset", async (_req, res): Promise<void> => {
  try {
    const current = await getOrInitCms();
    const [updated] = await db
      .update(landingCmsTable)
      .set({
        navbar: DEFAULT_CMS_CONTENT.navbar,
        flow: DEFAULT_CMS_CONTENT.flow,
        hero: DEFAULT_CMS_CONTENT.hero,
        assurance: DEFAULT_CMS_CONTENT.assurance,
        footer: DEFAULT_CMS_CONTENT.footer,
        disclaimer: DEFAULT_CMS_CONTENT.disclaimer,
        gallery: DEFAULT_CMS_CONTENT.gallery,
        updatedAt: new Date(),
      })
      .where(eq(landingCmsTable.id, current.id))
      .returning();

    res.json(updated);
  } catch (err: any) {
    console.error("[CMS] Error resetting CMS:", err);
    res.status(500).json({ error: err?.message || "Gagal mereset data CMS" });
  }
});

export default router;
