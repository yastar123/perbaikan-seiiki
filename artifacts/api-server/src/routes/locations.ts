import { Router, type IRouter } from "express";
import { asc, eq, inArray } from "drizzle-orm";
import {
  db,
  provincesTable,
  regenciesTable,
  districtsTable,
  villagesTable,
} from "@workspace/db";

const router: IRouter = Router();

// Seed initial default locations if empty
export async function seedDefaultLocations(): Promise<void> {
  try {
    const existing = await db.select().from(provincesTable).limit(1);
    if (existing.length > 0) return;

    // 1. Jawa Barat
    const [jabar] = await db
      .insert(provincesTable)
      .values({ name: "Jawa Barat" })
      .returning();

    // 1a. Kab Bogor
    const [kabBogor] = await db
      .insert(regenciesTable)
      .values({ provinceId: jabar.id, type: "kabupaten", name: "Bogor" })
      .returning();
    const [kecCibinong] = await db
      .insert(districtsTable)
      .values({ regencyId: kabBogor.id, name: "Cibinong" })
      .returning();
    await db.insert(villagesTable).values([
      { districtId: kecCibinong.id, type: "desa", name: "Sukamaju" },
      { districtId: kecCibinong.id, type: "desa", name: "Pabuaran" },
      { districtId: kecCibinong.id, type: "desa", name: "Cirimekar" },
    ]);
    const [kecBojong] = await db
      .insert(districtsTable)
      .values({ regencyId: kabBogor.id, name: "Bojong Gede" })
      .returning();
    await db.insert(villagesTable).values([
      { districtId: kecBojong.id, type: "desa", name: "Bojonggede" },
      { districtId: kecBojong.id, type: "desa", name: "Kedung Waringin" },
      { districtId: kecBojong.id, type: "desa", name: "Ragajaya" },
    ]);

    // 1b. Kota Depok
    const [kotaDepok] = await db
      .insert(regenciesTable)
      .values({ provinceId: jabar.id, type: "kota", name: "Depok" })
      .returning();
    const [kecPanmas] = await db
      .insert(districtsTable)
      .values({ regencyId: kotaDepok.id, name: "Pancoran Mas" })
      .returning();
    await db.insert(villagesTable).values([
      { districtId: kecPanmas.id, type: "kelurahan", name: "Depok" },
      { districtId: kecPanmas.id, type: "kelurahan", name: "Pancoran Mas" },
      { districtId: kecPanmas.id, type: "kelurahan", name: "Mampang" },
    ]);
    const [kecSukmajaya] = await db
      .insert(districtsTable)
      .values({ regencyId: kotaDepok.id, name: "Sukmajaya" })
      .returning();
    await db.insert(villagesTable).values([
      { districtId: kecSukmajaya.id, type: "kelurahan", name: "Sukmajaya" },
      { districtId: kecSukmajaya.id, type: "kelurahan", name: "Abadijaya" },
      { districtId: kecSukmajaya.id, type: "kelurahan", name: "Mekarjaya" },
    ]);

    // 1c. Kota Bandung
    const [kotaBandung] = await db
      .insert(regenciesTable)
      .values({ provinceId: jabar.id, type: "kota", name: "Bandung" })
      .returning();
    const [kecCoblong] = await db
      .insert(districtsTable)
      .values({ regencyId: kotaBandung.id, name: "Coblong" })
      .returning();
    await db.insert(villagesTable).values([
      { districtId: kecCoblong.id, type: "kelurahan", name: "Dago" },
      { districtId: kecCoblong.id, type: "kelurahan", name: "Sadang Serang" },
      { districtId: kecCoblong.id, type: "kelurahan", name: "Sekeloa" },
    ]);

    // 1d. Kab Bandung
    const [kabBandung] = await db
      .insert(regenciesTable)
      .values({ provinceId: jabar.id, type: "kabupaten", name: "Bandung" })
      .returning();
    const [kecSoreang] = await db
      .insert(districtsTable)
      .values({ regencyId: kabBandung.id, name: "Soreang" })
      .returning();
    await db.insert(villagesTable).values([
      { districtId: kecSoreang.id, type: "desa", name: "Panyirapan" },
      { districtId: kecSoreang.id, type: "desa", name: "Sadu" },
      { districtId: kecSoreang.id, type: "desa", name: "Sekarwangi" },
    ]);

    // 2. DKI Jakarta
    const [dki] = await db
      .insert(provincesTable)
      .values({ name: "DKI Jakarta" })
      .returning();
    const [jaksel] = await db
      .insert(regenciesTable)
      .values({ provinceId: dki.id, type: "kota", name: "Jakarta Selatan" })
      .returning();
    const [kecKebayoran] = await db
      .insert(districtsTable)
      .values({ regencyId: jaksel.id, name: "Kebayoran Baru" })
      .returning();
    await db.insert(villagesTable).values([
      { districtId: kecKebayoran.id, type: "kelurahan", name: "Senayan" },
      { districtId: kecKebayoran.id, type: "kelurahan", name: "Gandaria Utara" },
      { districtId: kecKebayoran.id, type: "kelurahan", name: "Melawai" },
    ]);
    const [kecTebet] = await db
      .insert(districtsTable)
      .values({ regencyId: jaksel.id, name: "Tebet" })
      .returning();
    await db.insert(villagesTable).values([
      { districtId: kecTebet.id, type: "kelurahan", name: "Tebet Barat" },
      { districtId: kecTebet.id, type: "kelurahan", name: "Tebet Timur" },
      { districtId: kecTebet.id, type: "kelurahan", name: "Menteng Dalam" },
    ]);

    const [jakpus] = await db
      .insert(regenciesTable)
      .values({ provinceId: dki.id, type: "kota", name: "Jakarta Pusat" })
      .returning();
    const [kecMenteng] = await db
      .insert(districtsTable)
      .values({ regencyId: jakpus.id, name: "Menteng" })
      .returning();
    await db.insert(villagesTable).values([
      { districtId: kecMenteng.id, type: "kelurahan", name: "Menteng" },
      { districtId: kecMenteng.id, type: "kelurahan", name: "Pegangsaan" },
      { districtId: kecMenteng.id, type: "kelurahan", name: "Cikini" },
    ]);

    const [seribu] = await db
      .insert(regenciesTable)
      .values({ provinceId: dki.id, type: "kabupaten", name: "Kepulauan Seribu" })
      .returning();
    const [kecSeribuSelatan] = await db
      .insert(districtsTable)
      .values({ regencyId: seribu.id, name: "Kepulauan Seribu Selatan" })
      .returning();
    await db.insert(villagesTable).values([
      { districtId: kecSeribuSelatan.id, type: "desa", name: "Pulau Tidung" },
      { districtId: kecSeribuSelatan.id, type: "desa", name: "Pulau Pari" },
    ]);

    // 3. Banten
    const [banten] = await db
      .insert(provincesTable)
      .values({ name: "Banten" })
      .returning();
    const [tangsel] = await db
      .insert(regenciesTable)
      .values({ provinceId: banten.id, type: "kota", name: "Tangerang Selatan" })
      .returning();
    const [kecSerpong] = await db
      .insert(districtsTable)
      .values({ regencyId: tangsel.id, name: "Serpong" })
      .returning();
    await db.insert(villagesTable).values([
      { districtId: kecSerpong.id, type: "kelurahan", name: "Lengkong Gudang" },
      { districtId: kecSerpong.id, type: "kelurahan", name: "Rawabuntu" },
      { districtId: kecSerpong.id, type: "kelurahan", name: "Ciater" },
    ]);
    const [kabTangerang] = await db
      .insert(regenciesTable)
      .values({ provinceId: banten.id, type: "kabupaten", name: "Tangerang" })
      .returning();
    const [kecKelapaDua] = await db
      .insert(districtsTable)
      .values({ regencyId: kabTangerang.id, name: "Kelapa Dua" })
      .returning();
    await db.insert(villagesTable).values([
      { districtId: kecKelapaDua.id, type: "desa", name: "Curug Sangereng" },
      { districtId: kecKelapaDua.id, type: "desa", name: "Bencongan" },
    ]);

    // 4. Jawa Timur
    const [jatim] = await db
      .insert(provincesTable)
      .values({ name: "Jawa Timur" })
      .returning();
    const [surabaya] = await db
      .insert(regenciesTable)
      .values({ provinceId: jatim.id, type: "kota", name: "Surabaya" })
      .returning();
    const [kecGubeng] = await db
      .insert(districtsTable)
      .values({ regencyId: surabaya.id, name: "Gubeng" })
      .returning();
    await db.insert(villagesTable).values([
      { districtId: kecGubeng.id, type: "kelurahan", name: "Airlangga" },
      { districtId: kecGubeng.id, type: "kelurahan", name: "Baratajaya" },
    ]);
    const [kabMalang] = await db
      .insert(regenciesTable)
      .values({ provinceId: jatim.id, type: "kabupaten", name: "Malang" })
      .returning();
    const [kecKepanjen] = await db
      .insert(districtsTable)
      .values({ regencyId: kabMalang.id, name: "Kepanjen" })
      .returning();
    await db.insert(villagesTable).values([
      { districtId: kecKepanjen.id, type: "desa", name: "Ardirejo" },
      { districtId: kecKepanjen.id, type: "desa", name: "Cepokomulyo" },
    ]);
    // 5. Lampung
    const [lampung] = await db
      .insert(provincesTable)
      .values({ name: "Lampung" })
      .returning();
    const [bdl] = await db
      .insert(regenciesTable)
      .values({ provinceId: lampung.id, type: "kota", name: "Bandar Lampung" })
      .returning();
    const [kecLangkapura] = await db
      .insert(districtsTable)
      .values({ regencyId: bdl.id, name: "Langkapura" })
      .returning();
    await db.insert(villagesTable).values([
      { districtId: kecLangkapura.id, type: "kelurahan", name: "Langkapura" },
      { districtId: kecLangkapura.id, type: "kelurahan", name: "Bilabong Jaya" },
      { districtId: kecLangkapura.id, type: "kelurahan", name: "Gunung Terang" },
      { districtId: kecLangkapura.id, type: "kelurahan", name: "Langkapura Baru" },
    ]);
    const [kecKedaton] = await db
      .insert(districtsTable)
      .values({ regencyId: bdl.id, name: "Kedaton" })
      .returning();
    await db.insert(villagesTable).values([
      { districtId: kecKedaton.id, type: "kelurahan", name: "Kedaton" },
      { districtId: kecKedaton.id, type: "kelurahan", name: "Sukamenanti" },
      { districtId: kecKedaton.id, type: "kelurahan", name: "Surabaya" },
    ]);
    const [kabLamsel] = await db
      .insert(regenciesTable)
      .values({ provinceId: lampung.id, type: "kabupaten", name: "Lampung Selatan" })
      .returning();
    const [kecNatar] = await db
      .insert(districtsTable)
      .values({ regencyId: kabLamsel.id, name: "Natar" })
      .returning();
    await db.insert(villagesTable).values([
      { districtId: kecNatar.id, type: "desa", name: "Natar" },
      { districtId: kecNatar.id, type: "desa", name: "Hajimena" },
      { districtId: kecNatar.id, type: "desa", name: "Merak Batin" },
    ]);
  } catch (err) {
    console.error("[Locations] Seed error:", err);
  }
}

// -------------------------------------------------------------
// Tree endpoint: returns full hierarchical structure
// -------------------------------------------------------------
router.get("/locations/tree", async (_req, res): Promise<void> => {
  try {
    await seedDefaultLocations();

    const provinces = await db.select().from(provincesTable).orderBy(asc(provincesTable.name));
    const regencies = await db.select().from(regenciesTable).orderBy(asc(regenciesTable.type), asc(regenciesTable.name));
    const districts = await db.select().from(districtsTable).orderBy(asc(districtsTable.name));
    const villages = await db.select().from(villagesTable).orderBy(asc(villagesTable.type), asc(villagesTable.name));

    const villageMap = new Map<number, any[]>();
    for (const v of villages) {
      if (!villageMap.has(v.districtId)) villageMap.set(v.districtId, []);
      villageMap.get(v.districtId)!.push(v);
    }

    const districtMap = new Map<number, any[]>();
    for (const d of districts) {
      if (!districtMap.has(d.regencyId)) districtMap.set(d.regencyId, []);
      districtMap.get(d.regencyId)!.push({
        ...d,
        villages: villageMap.get(d.id) || [],
      });
    }

    const regencyMap = new Map<number, any[]>();
    for (const r of regencies) {
      if (!regencyMap.has(r.provinceId)) regencyMap.set(r.provinceId, []);
      regencyMap.get(r.provinceId)!.push({
        ...r,
        districts: districtMap.get(r.id) || [],
      });
    }

    const tree = provinces.map((p: any) => ({
      ...p,
      regencies: regencyMap.get(p.id) || [],
    }));

    res.json(tree);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch locations tree" });
  }
});

// -------------------------------------------------------------
// PROVINCES CRUD
// -------------------------------------------------------------
router.get("/locations/provinces", async (_req, res): Promise<void> => {
  await seedDefaultLocations();
  const provinces = await db.select().from(provincesTable).orderBy(asc(provincesTable.name));
  res.json(provinces);
});

router.post("/locations/provinces", async (req, res): Promise<void> => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    res.status(400).json({ error: "Nama provinsi wajib diisi" });
    return;
  }
  const [created] = await db
    .insert(provincesTable)
    .values({ name: name.trim() })
    .returning();
  res.status(201).json(created);
});

router.put("/locations/provinces/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { name } = req.body;
  if (!id || !name || !name.trim()) {
    res.status(400).json({ error: "Data provinsi tidak valid" });
    return;
  }
  const [updated] = await db
    .update(provincesTable)
    .set({ name: name.trim() })
    .where(eq(provincesTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Provinsi tidak ditemukan" });
    return;
  }
  res.json(updated);
});

router.delete("/locations/provinces/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) {
    res.status(400).json({ error: "ID provinsi tidak valid" });
    return;
  }
  // Cascading delete
  const regencies = await db.select({ id: regenciesTable.id }).from(regenciesTable).where(eq(regenciesTable.provinceId, id));
  const regencyIds = regencies.map((r: any) => r.id);
  if (regencyIds.length > 0) {
    const districts = await db.select({ id: districtsTable.id }).from(districtsTable).where(inArray(districtsTable.regencyId, regencyIds));
    const districtIds = districts.map((d: any) => d.id);
    if (districtIds.length > 0) {
      await db.delete(villagesTable).where(inArray(villagesTable.districtId, districtIds));
      await db.delete(districtsTable).where(inArray(districtsTable.id, districtIds));
    }
    await db.delete(regenciesTable).where(inArray(regenciesTable.id, regencyIds));
  }
  const [deleted] = await db.delete(provincesTable).where(eq(provincesTable.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Provinsi tidak ditemukan" });
    return;
  }
  res.sendStatus(204);
});

// -------------------------------------------------------------
// REGENCIES (KABUPATEN & KOTA) CRUD
// -------------------------------------------------------------
router.get("/locations/regencies", async (req, res): Promise<void> => {
  const provinceId = req.query.provinceId ? Number(req.query.provinceId) : undefined;
  let query = db.select().from(regenciesTable);
  if (provinceId) {
    query = query.where(eq(regenciesTable.provinceId, provinceId));
  }
  const regencies = await query.orderBy(asc(regenciesTable.type), asc(regenciesTable.name));
  res.json(regencies);
});

router.post("/locations/regencies", async (req, res): Promise<void> => {
  const { provinceId, type, name } = req.body;
  if (!provinceId || !name || !name.trim()) {
    res.status(400).json({ error: "Provinsi dan nama kabupaten/kota wajib diisi" });
    return;
  }
  const cleanType = type === "kota" ? "kota" : "kabupaten";
  const [created] = await db
    .insert(regenciesTable)
    .values({
      provinceId: Number(provinceId),
      type: cleanType,
      name: name.trim(),
    })
    .returning();
  res.status(201).json(created);
});

router.put("/locations/regencies/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { provinceId, type, name } = req.body;
  if (!id || !name || !name.trim()) {
    res.status(400).json({ error: "Data kabupaten/kota tidak valid" });
    return;
  }
  const updateData: any = { name: name.trim() };
  if (provinceId) updateData.provinceId = Number(provinceId);
  if (type) updateData.type = type === "kota" ? "kota" : "kabupaten";

  const [updated] = await db
    .update(regenciesTable)
    .set(updateData)
    .where(eq(regenciesTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Kabupaten/kota tidak ditemukan" });
    return;
  }
  res.json(updated);
});

router.delete("/locations/regencies/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) {
    res.status(400).json({ error: "ID tidak valid" });
    return;
  }
  const districts = await db.select({ id: districtsTable.id }).from(districtsTable).where(eq(districtsTable.regencyId, id));
  const districtIds = districts.map((d: any) => d.id);
  if (districtIds.length > 0) {
    await db.delete(villagesTable).where(inArray(villagesTable.districtId, districtIds));
    await db.delete(districtsTable).where(inArray(districtsTable.id, districtIds));
  }
  const [deleted] = await db.delete(regenciesTable).where(eq(regenciesTable.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Kabupaten/kota tidak ditemukan" });
    return;
  }
  res.sendStatus(204);
});

// -------------------------------------------------------------
// DISTRICTS (KECAMATAN) CRUD
// -------------------------------------------------------------
router.get("/locations/districts", async (req, res): Promise<void> => {
  const regencyId = req.query.regencyId ? Number(req.query.regencyId) : undefined;
  let query = db.select().from(districtsTable);
  if (regencyId) {
    query = query.where(eq(districtsTable.regencyId, regencyId));
  }
  const districts = await query.orderBy(asc(districtsTable.name));
  res.json(districts);
});

router.post("/locations/districts", async (req, res): Promise<void> => {
  const { regencyId, name } = req.body;
  if (!regencyId || !name || !name.trim()) {
    res.status(400).json({ error: "Kabupaten/kota dan nama kecamatan wajib diisi" });
    return;
  }
  const [created] = await db
    .insert(districtsTable)
    .values({
      regencyId: Number(regencyId),
      name: name.trim(),
    })
    .returning();
  res.status(201).json(created);
});

router.put("/locations/districts/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { regencyId, name } = req.body;
  if (!id || !name || !name.trim()) {
    res.status(400).json({ error: "Data kecamatan tidak valid" });
    return;
  }
  const updateData: any = { name: name.trim() };
  if (regencyId) updateData.regencyId = Number(regencyId);

  const [updated] = await db
    .update(districtsTable)
    .set(updateData)
    .where(eq(districtsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Kecamatan tidak ditemukan" });
    return;
  }
  res.json(updated);
});

router.delete("/locations/districts/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) {
    res.status(400).json({ error: "ID tidak valid" });
    return;
  }
  await db.delete(villagesTable).where(eq(villagesTable.districtId, id));
  const [deleted] = await db.delete(districtsTable).where(eq(districtsTable.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Kecamatan tidak ditemukan" });
    return;
  }
  res.sendStatus(204);
});

// -------------------------------------------------------------
// VILLAGES (DESA & KELURAHAN) CRUD
// -------------------------------------------------------------
router.get("/locations/villages", async (req, res): Promise<void> => {
  const districtId = req.query.districtId ? Number(req.query.districtId) : undefined;
  let query = db.select().from(villagesTable);
  if (districtId) {
    query = query.where(eq(villagesTable.districtId, districtId));
  }
  const villages = await query.orderBy(asc(villagesTable.type), asc(villagesTable.name));
  res.json(villages);
});

router.post("/locations/villages", async (req, res): Promise<void> => {
  const { districtId, type, name } = req.body;
  if (!districtId || !name || !name.trim()) {
    res.status(400).json({ error: "Kecamatan dan nama desa/kelurahan wajib diisi" });
    return;
  }
  const cleanType = type === "kelurahan" ? "kelurahan" : "desa";
  const [created] = await db
    .insert(villagesTable)
    .values({
      districtId: Number(districtId),
      type: cleanType,
      name: name.trim(),
    })
    .returning();
  res.status(201).json(created);
});

router.put("/locations/villages/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { districtId, type, name } = req.body;
  if (!id || !name || !name.trim()) {
    res.status(400).json({ error: "Data desa/kelurahan tidak valid" });
    return;
  }
  const updateData: any = { name: name.trim() };
  if (districtId) updateData.districtId = Number(districtId);
  if (type) updateData.type = type === "kelurahan" ? "kelurahan" : "desa";

  const [updated] = await db
    .update(villagesTable)
    .set(updateData)
    .where(eq(villagesTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Desa/kelurahan tidak ditemukan" });
    return;
  }
  res.json(updated);
});

router.delete("/locations/villages/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) {
    res.status(400).json({ error: "ID tidak valid" });
    return;
  }
  const [deleted] = await db.delete(villagesTable).where(eq(villagesTable.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Desa/kelurahan tidak ditemukan" });
    return;
  }
  res.sendStatus(204);
});

export default router;
