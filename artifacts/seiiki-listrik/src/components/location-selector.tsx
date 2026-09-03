import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, CheckCircle2, ChevronRight, CornerDownRight, Building2, Home } from 'lucide-react';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

export interface LocationTreeVillage {
  id: number;
  districtId: number;
  type: 'desa' | 'kelurahan';
  name: string;
}

export interface LocationTreeDistrict {
  id: number;
  regencyId: number;
  name: string;
  villages: LocationTreeVillage[];
}

export interface LocationTreeRegency {
  id: number;
  provinceId: number;
  type: 'kabupaten' | 'kota';
  name: string;
  districts: LocationTreeDistrict[];
}

export interface LocationTreeProvince {
  id: number;
  name: string;
  regencies: LocationTreeRegency[];
}

export interface HierarchicalLocationValue {
  provinceId: number | null;
  provinceName: string;
  regencyId: number | null;
  regencyType: 'kabupaten' | 'kota' | null;
  regencyName: string;
  districtId: number | null;
  districtName: string;
  villageId: number | null;
  villageType: 'desa' | 'kelurahan' | null;
  villageName: string;
  detail?: string;
  fullAddress: string;
}

interface HierarchicalLocationSelectorProps {
  value?: HierarchicalLocationValue;
  onChange: (val: HierarchicalLocationValue) => void;
  disabled?: boolean;
}

export function useLocationTree() {
  return useQuery<LocationTreeProvince[]>({
    queryKey: ['locations-tree'],
    queryFn: async () => {
      const res = await fetch(`${basePath}/api/locations/tree`);
      if (!res.ok) throw new Error('Gagal memuat data wilayah');
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 mins cache
  });
}

export function HierarchicalLocationSelector({
  value,
  onChange,
  disabled = false,
}: HierarchicalLocationSelectorProps) {
  const { data: tree = [], isLoading, error } = useLocationTree();

  const [provinceId, setProvinceId] = useState<number | ''>(value?.provinceId || '');
  const [regencyId, setRegencyId] = useState<number | ''>(value?.regencyId || '');
  const [districtId, setDistrictId] = useState<number | ''>(value?.districtId || '');
  const [villageId, setVillageId] = useState<number | ''>(value?.villageId || '');
  const [detail, setDetail] = useState<string>(value?.detail || '');

  // Keep internal state synced if value changes externally
  useEffect(() => {
    if (value) {
      if (value.provinceId !== undefined && value.provinceId !== provinceId) {
        setProvinceId(value.provinceId || '');
      }
      if (value.regencyId !== undefined && value.regencyId !== regencyId) {
        setRegencyId(value.regencyId || '');
      }
      if (value.districtId !== undefined && value.districtId !== districtId) {
        setDistrictId(value.districtId || '');
      }
      if (value.villageId !== undefined && value.villageId !== villageId) {
        setVillageId(value.villageId || '');
      }
      if (value.detail !== undefined && value.detail !== detail) {
        setDetail(value.detail || '');
      }
    }
  }, [value?.provinceId, value?.regencyId, value?.districtId, value?.villageId, value?.detail]);

  const selectedProvince = tree.find((p) => p.id === Number(provinceId));
  const regenciesList = selectedProvince?.regencies || [];
  const selectedRegency = regenciesList.find((r) => r.id === Number(regencyId));
  const districtsList = selectedRegency?.districts || [];
  const selectedDistrict = districtsList.find((d) => d.id === Number(districtId));
  const villagesList = selectedDistrict?.villages || [];
  const selectedVillage = villagesList.find((v) => v.id === Number(villageId));

  const formatAddress = (
    pName: string,
    rType: string,
    rName: string,
    dName: string,
    vType: string,
    vName: string,
    dtl: string,
  ) => {
    const parts: string[] = [];
    if (vName) {
      parts.push(`${vType === 'desa' ? 'Desa' : 'Kelurahan'} ${vName}`);
    }
    if (dName) {
      parts.push(`Kec. ${dName}`);
    }
    if (rName) {
      parts.push(`${rType === 'kabupaten' ? 'Kab.' : 'Kota'} ${rName}`);
    }
    if (pName) {
      parts.push(`Prov. ${pName}`);
    }
    const main = parts.join(', ');
    if (dtl && dtl.trim()) {
      return main ? `${main} (${dtl.trim()})` : dtl.trim();
    }
    return main;
  };

  const handleProvinceChange = (newProvId: string) => {
    const pid = newProvId ? Number(newProvId) : '';
    setProvinceId(pid);
    setRegencyId('');
    setDistrictId('');
    setVillageId('');

    const prov = tree.find((p) => p.id === Number(pid));
    const full = formatAddress(prov?.name || '', '', '', '', '', '', detail);
    onChange({
      provinceId: pid ? Number(pid) : null,
      provinceName: prov?.name || '',
      regencyId: null,
      regencyType: null,
      regencyName: '',
      districtId: null,
      districtName: '',
      villageId: null,
      villageType: null,
      villageName: '',
      detail,
      fullAddress: full,
    });
  };

  const handleRegencyChange = (newRegId: string) => {
    const rid = newRegId ? Number(newRegId) : '';
    setRegencyId(rid);
    setDistrictId('');
    setVillageId('');

    const reg = regenciesList.find((r) => r.id === Number(rid));
    const full = formatAddress(
      selectedProvince?.name || '',
      reg?.type || '',
      reg?.name || '',
      '',
      '',
      '',
      detail,
    );
    onChange({
      provinceId: Number(provinceId),
      provinceName: selectedProvince?.name || '',
      regencyId: rid ? Number(rid) : null,
      regencyType: reg?.type || null,
      regencyName: reg?.name || '',
      districtId: null,
      districtName: '',
      villageId: null,
      villageType: null,
      villageName: '',
      detail,
      fullAddress: full,
    });
  };

  const handleDistrictChange = (newDistId: string) => {
    const did = newDistId ? Number(newDistId) : '';
    setDistrictId(did);
    setVillageId('');

    const dist = districtsList.find((d) => d.id === Number(did));
    const full = formatAddress(
      selectedProvince?.name || '',
      selectedRegency?.type || '',
      selectedRegency?.name || '',
      dist?.name || '',
      '',
      '',
      detail,
    );
    onChange({
      provinceId: Number(provinceId),
      provinceName: selectedProvince?.name || '',
      regencyId: Number(regencyId),
      regencyType: selectedRegency?.type || null,
      regencyName: selectedRegency?.name || '',
      districtId: did ? Number(did) : null,
      districtName: dist?.name || '',
      villageId: null,
      villageType: null,
      villageName: '',
      detail,
      fullAddress: full,
    });
  };

  const handleVillageChange = (newVilId: string) => {
    const vid = newVilId ? Number(newVilId) : '';
    setVillageId(vid);

    const vil = villagesList.find((v) => v.id === Number(vid));
    const full = formatAddress(
      selectedProvince?.name || '',
      selectedRegency?.type || '',
      selectedRegency?.name || '',
      selectedDistrict?.name || '',
      vil?.type || (selectedRegency?.type === 'kabupaten' ? 'desa' : 'kelurahan'),
      vil?.name || '',
      detail,
    );
    onChange({
      provinceId: Number(provinceId),
      provinceName: selectedProvince?.name || '',
      regencyId: Number(regencyId),
      regencyType: selectedRegency?.type || null,
      regencyName: selectedRegency?.name || '',
      districtId: Number(districtId),
      districtName: selectedDistrict?.name || '',
      villageId: vid ? Number(vid) : null,
      villageType: vil?.type || (selectedRegency?.type === 'kabupaten' ? 'desa' : 'kelurahan'),
      villageName: vil?.name || '',
      detail,
      fullAddress: full,
    });
  };

  const handleDetailChange = (newDetail: string) => {
    setDetail(newDetail);
    const full = formatAddress(
      selectedProvince?.name || '',
      selectedRegency?.type || '',
      selectedRegency?.name || '',
      selectedDistrict?.name || '',
      selectedVillage?.type || (selectedRegency?.type === 'kabupaten' ? 'desa' : 'kelurahan'),
      selectedVillage?.name || '',
      newDetail,
    );
    onChange({
      provinceId: provinceId ? Number(provinceId) : null,
      provinceName: selectedProvince?.name || '',
      regencyId: regencyId ? Number(regencyId) : null,
      regencyType: selectedRegency?.type || null,
      regencyName: selectedRegency?.name || '',
      districtId: districtId ? Number(districtId) : null,
      districtName: selectedDistrict?.name || '',
      villageId: villageId ? Number(villageId) : null,
      villageType: selectedVillage?.type || (selectedRegency?.type === 'kabupaten' ? 'desa' : 'kelurahan'),
      villageName: selectedVillage?.name || '',
      detail: newDetail,
      fullAddress: full,
    });
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card/60 p-4 text-xs text-muted-foreground animate-pulse">
        Memuat data wilayah lokasi…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
        Gagal memuat data wilayah. Silakan segarkan halaman.
      </div>
    );
  }

  const isKabupaten = selectedRegency?.type === 'kabupaten';

  return (
    <div className="space-y-3.5" id="hierarchical-location-selector">
      {/* 1. LEVEL 1: PROVINSI */}
      <div className="space-y-1">
        <label className="flex items-center justify-between text-xs font-bold text-foreground/80">
          <span className="flex items-center gap-1.5">
            <MapPin size={13} className="text-primary" />
            Provinsi
          </span>
          <span className="text-[10px] font-normal text-muted-foreground">Langkah 1/4</span>
        </label>
        <select
          id="select-location-province"
          disabled={disabled}
          value={provinceId}
          onChange={(e) => handleProvinceChange(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm transition-all focus:border-primary focus:ring-1 focus:ring-primary"
        >
          <option value="">-- Pilih Provinsi --</option>
          {tree.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* 2. LEVEL 2: KABUPATEN / KOTA (MUNCUL JIKA PROVINSI DIPILIH) */}
      {Boolean(provinceId) && (
        <div className="space-y-1 transition-all duration-200 animate-in fade-in slide-in-from-top-1">
          <label className="flex items-center justify-between text-xs font-bold text-foreground/80">
            <span className="flex items-center gap-1.5">
              <CornerDownRight size={13} className="text-muted-foreground ml-1" />
              Kabupaten / Kota
            </span>
            <span className="text-[10px] font-normal text-muted-foreground">Langkah 2/4</span>
          </label>
          <select
            id="select-location-regency"
            disabled={disabled}
            value={regencyId}
            onChange={(e) => handleRegencyChange(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm transition-all focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="">-- Pilih Kabupaten atau Kota --</option>
            {regenciesList.map((r) => (
              <option key={r.id} value={r.id}>
                {r.type === 'kabupaten' ? 'Kabupaten' : 'Kota'} {r.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 3. LEVEL 3: KECAMATAN (MUNCUL JIKA KABUPATEN/KOTA DIPILIH) */}
      {Boolean(regencyId) && (
        <div className="space-y-1 transition-all duration-200 animate-in fade-in slide-in-from-top-1">
          <label className="flex items-center justify-between text-xs font-bold text-foreground/80">
            <span className="flex items-center gap-1.5">
              <CornerDownRight size={13} className="text-muted-foreground ml-2" />
              Kecamatan
            </span>
            <span className="text-[10px] font-normal text-muted-foreground">Langkah 3/4</span>
          </label>
          <select
            id="select-location-district"
            disabled={disabled}
            value={districtId}
            onChange={(e) => handleDistrictChange(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm transition-all focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="">-- Pilih Kecamatan --</option>
            {districtsList.map((d) => (
              <option key={d.id} value={d.id}>
                Kecamatan {d.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 4. LEVEL 4: DESA / KELURAHAN (MUNCUL JIKA KECAMATAN DIPILIH) */}
      {Boolean(districtId) && (
        <div className="space-y-1 transition-all duration-200 animate-in fade-in slide-in-from-top-1">
          <label className="flex items-center justify-between text-xs font-bold text-foreground/80">
            <span className="flex items-center gap-1.5">
              <CornerDownRight size={13} className="text-muted-foreground ml-3" />
              {isKabupaten ? (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <Home size={12} /> Desa
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400">
                  <Building2 size={12} /> Kelurahan
                </span>
              )}
            </span>
            <span className="text-[10px] font-normal text-muted-foreground">Langkah 4/4</span>
          </label>
          <select
            id="select-location-village"
            disabled={disabled}
            value={villageId}
            onChange={(e) => handleVillageChange(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm transition-all focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="">
              -- Pilih {isKabupaten ? 'Desa' : 'Kelurahan'} --
            </option>
            {villagesList.map((v) => (
              <option key={v.id} value={v.id}>
                {v.type === 'desa' ? 'Desa' : 'Kelurahan'} {v.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* HASIL SELEKSI & DETAIL TAMBAHAN (MUNCUL JIKA DESA/KELURAHAN DIPILIH) */}
      {Boolean(villageId) && selectedVillage && (
        <div className="space-y-2.5 pt-1 transition-all duration-200 animate-in fade-in">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-foreground">
            <div className="flex items-start gap-2">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <strong className="block text-emerald-800 dark:text-emerald-300">
                  Wilayah Lokasi Terpilih:
                </strong>
                <p className="mt-0.5 font-medium leading-relaxed">
                  {selectedVillage.type === 'desa' ? 'Desa' : 'Kelurahan'} {selectedVillage.name}
                  {' › '}Kec. {selectedDistrict?.name}
                  {' › '}{selectedRegency?.type === 'kabupaten' ? 'Kab.' : 'Kota'} {selectedRegency?.name}
                  {' › '}Prov. {selectedProvince?.name}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-foreground/80">
              Patokan / No. Rumah / Jalan (Opsional)
            </label>
            <input
              id="input-location-detail"
              disabled={disabled}
              value={detail}
              onChange={(e) => handleDetailChange(e.target.value)}
              placeholder="Contoh: RT 03/RW 02, Jl. Kenanga No. 12, seberang minimarket"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm transition-all focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      )}
    </div>
  );
}
