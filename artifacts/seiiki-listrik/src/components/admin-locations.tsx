import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MapPin, Plus, Trash2, Pencil, Search, RefreshCw, ChevronRight, ChevronDown,
  Building2, Home, FolderTree, Layers, Check, X, AlertTriangle, Filter
} from 'lucide-react';
import { useLocationTree, type LocationTreeProvince, type LocationTreeRegency, type LocationTreeDistrict, type LocationTreeVillage } from './location-selector';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

export function AdminLocations() {
  const queryClient = useQueryClient();
  const { data: tree = [], isLoading, isError, refetch } = useLocationTree();

  const [activeTab, setActiveTab] = useState<'tree' | 'province' | 'regency' | 'district' | 'village'>('tree');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtering for sub-tables
  const [filterProvinceId, setFilterProvinceId] = useState<string>('');
  const [filterRegencyId, setFilterRegencyId] = useState<string>('');
  const [filterDistrictId, setFilterDistrictId] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');

  // Modal states
  const [modalType, setModalType] = useState<'province' | 'regency' | 'district' | 'village' | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'province' | 'regency' | 'district' | 'village';
    id: number;
    name: string;
  } | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    id: 0,
    name: '',
    type: 'kabupaten' as 'kabupaten' | 'kota' | 'desa' | 'kelurahan',
    provinceId: 0,
    regencyId: 0,
    districtId: 0,
  });

  // Flat lists for tables
  const flatProvinces = useMemo(() => tree.map((p) => ({ id: p.id, name: p.name, count: p.regencies.length })), [tree]);

  const flatRegencies = useMemo(() => {
    const list: Array<{ id: number; provinceId: number; provinceName: string; type: 'kabupaten' | 'kota'; name: string; districtCount: number }> = [];
    for (const p of tree) {
      for (const r of p.regencies) {
        list.push({
          id: r.id,
          provinceId: p.id,
          provinceName: p.name,
          type: r.type,
          name: r.name,
          districtCount: r.districts.length,
        });
      }
    }
    return list;
  }, [tree]);

  const flatDistricts = useMemo(() => {
    const list: Array<{ id: number; regencyId: number; regencyName: string; regencyType: string; provinceName: string; name: string; villageCount: number }> = [];
    for (const p of tree) {
      for (const r of p.regencies) {
        for (const d of r.districts) {
          list.push({
            id: d.id,
            regencyId: r.id,
            regencyName: r.name,
            regencyType: r.type,
            provinceName: p.name,
            name: d.name,
            villageCount: d.villages.length,
          });
        }
      }
    }
    return list;
  }, [tree]);

  const flatVillages = useMemo(() => {
    const list: Array<{ id: number; districtId: number; districtName: string; regencyName: string; regencyType: string; provinceName: string; type: 'desa' | 'kelurahan'; name: string }> = [];
    for (const p of tree) {
      for (const r of p.regencies) {
        for (const d of r.districts) {
          for (const v of d.villages) {
            list.push({
              id: v.id,
              districtId: d.id,
              districtName: d.name,
              regencyName: r.name,
              regencyType: r.type,
              provinceName: p.name,
              type: v.type,
              name: v.name,
            });
          }
        }
      }
    }
    return list;
  }, [tree]);

  // Mutations
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['locations-tree'] });
  };

  const provinceMutation = useMutation({
    mutationFn: async ({ id, name, isEdit }: { id?: number; name: string; isEdit: boolean }) => {
      const url = isEdit ? `${basePath}/api/locations/provinces/${id}` : `${basePath}/api/locations/provinces`;
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error('Gagal memproses provinsi');
      return res.json();
    },
    onSuccess: () => {
      invalidateAll();
      closeModal();
    },
  });

  const regencyMutation = useMutation({
    mutationFn: async ({ id, provinceId, type, name, isEdit }: { id?: number; provinceId: number; type: string; name: string; isEdit: boolean }) => {
      const url = isEdit ? `${basePath}/api/locations/regencies/${id}` : `${basePath}/api/locations/regencies`;
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provinceId, type, name }),
      });
      if (!res.ok) throw new Error('Gagal memproses kabupaten/kota');
      return res.json();
    },
    onSuccess: () => {
      invalidateAll();
      closeModal();
    },
  });

  const districtMutation = useMutation({
    mutationFn: async ({ id, regencyId, name, isEdit }: { id?: number; regencyId: number; name: string; isEdit: boolean }) => {
      const url = isEdit ? `${basePath}/api/locations/districts/${id}` : `${basePath}/api/locations/districts`;
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regencyId, name }),
      });
      if (!res.ok) throw new Error('Gagal memproses kecamatan');
      return res.json();
    },
    onSuccess: () => {
      invalidateAll();
      closeModal();
    },
  });

  const villageMutation = useMutation({
    mutationFn: async ({ id, districtId, type, name, isEdit }: { id?: number; districtId: number; type: string; name: string; isEdit: boolean }) => {
      const url = isEdit ? `${basePath}/api/locations/villages/${id}` : `${basePath}/api/locations/villages`;
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ districtId, type, name }),
      });
      if (!res.ok) throw new Error('Gagal memproses desa/kelurahan');
      return res.json();
    },
    onSuccess: () => {
      invalidateAll();
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }: { type: 'province' | 'regency' | 'district' | 'village'; id: number }) => {
      const endpointMap = {
        province: 'provinces',
        regency: 'regencies',
        district: 'districts',
        village: 'villages',
      };
      const res = await fetch(`${basePath}/api/locations/${endpointMap[type]}/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Gagal menghapus data');
      return true;
    },
    onSuccess: () => {
      invalidateAll();
      setDeleteConfirm(null);
    },
  });

  const closeModal = () => {
    setModalType(null);
    setFormData({
      id: 0,
      name: '',
      type: 'kabupaten',
      provinceId: 0,
      regencyId: 0,
      districtId: 0,
    });
  };

  const openCreateModal = (
    type: 'province' | 'regency' | 'district' | 'village',
    preset?: { provinceId?: number; regencyId?: number; districtId?: number; defType?: 'kabupaten' | 'kota' | 'desa' | 'kelurahan' },
  ) => {
    setModalMode('create');
    setModalType(type);
    setFormData({
      id: 0,
      name: '',
      type: preset?.defType || (type === 'regency' ? 'kabupaten' : 'desa'),
      provinceId: preset?.provinceId || tree[0]?.id || 0,
      regencyId: preset?.regencyId || 0,
      districtId: preset?.districtId || 0,
    });
  };

  const openEditModal = (
    type: 'province' | 'regency' | 'district' | 'village',
    item: any,
  ) => {
    setModalMode('edit');
    setModalType(type);
    setFormData({
      id: item.id,
      name: item.name,
      type: item.type || (type === 'regency' ? 'kabupaten' : 'desa'),
      provinceId: item.provinceId || 0,
      regencyId: item.regencyId || 0,
      districtId: item.districtId || 0,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (modalType === 'province') {
      provinceMutation.mutate({
        id: formData.id,
        name: formData.name.trim(),
        isEdit: modalMode === 'edit',
      });
    } else if (modalType === 'regency') {
      regencyMutation.mutate({
        id: formData.id,
        provinceId: Number(formData.provinceId),
        type: formData.type as 'kabupaten' | 'kota',
        name: formData.name.trim(),
        isEdit: modalMode === 'edit',
      });
    } else if (modalType === 'district') {
      districtMutation.mutate({
        id: formData.id,
        regencyId: Number(formData.regencyId),
        name: formData.name.trim(),
        isEdit: modalMode === 'edit',
      });
    } else if (modalType === 'village') {
      villageMutation.mutate({
        id: formData.id,
        districtId: Number(formData.districtId),
        type: formData.type as 'desa' | 'kelurahan',
        name: formData.name.trim(),
        isEdit: modalMode === 'edit',
      });
    }
  };

  // Tree expanded state
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'prov-1': true,
  });

  const toggleNode = (key: string) => {
    setExpandedNodes((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6" id="admin-locations-manager">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <MapPin className="text-primary" size={22} />
            Kelola Wilayah & Lokasi
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Atur hierarki lokasi berjenjang (Provinsi › Kabupaten/Kota › Kecamatan › Desa/Kelurahan) untuk form pengajuan kunjungan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="btn btn-outline !px-3 !py-2 text-xs flex items-center gap-1.5"
            title="Segarkan Data"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Segarkan
          </button>
          <button
            onClick={() => openCreateModal('province')}
            className="btn btn-primary !px-3.5 !py-2 text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={15} /> Tambah Provinsi
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
            <Layers size={14} className="text-primary" /> Total Provinsi
          </span>
          <p className="mt-2 text-2xl font-black text-foreground">{flatProvinces.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
            <Building2 size={14} className="text-sky-600" /> Kab. & Kota
          </span>
          <p className="mt-2 text-2xl font-black text-foreground">{flatRegencies.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
            <MapPin size={14} className="text-amber-600" /> Kecamatan
          </span>
          <p className="mt-2 text-2xl font-black text-foreground">{flatDistricts.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
            <Home size={14} className="text-emerald-600" /> Desa & Kelurahan
          </span>
          <p className="mt-2 text-2xl font-black text-foreground">{flatVillages.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border overflow-x-auto gap-1">
        <button
          onClick={() => setActiveTab('tree')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'tree'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FolderTree size={14} /> Pohon Wilayah (Hierarki)
        </button>
        <button
          onClick={() => setActiveTab('province')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'province'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Layers size={14} /> Provinsi ({flatProvinces.length})
        </button>
        <button
          onClick={() => setActiveTab('regency')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'regency'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Building2 size={14} /> Kabupaten / Kota ({flatRegencies.length})
        </button>
        <button
          onClick={() => setActiveTab('district')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'district'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <MapPin size={14} /> Kecamatan ({flatDistricts.length})
        </button>
        <button
          onClick={() => setActiveTab('village')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'village'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Home size={14} /> Desa / Kelurahan ({flatVillages.length})
        </button>
      </div>

      {/* TAB 1: VISUAL HIERARCHY TREE */}
      {activeTab === 'tree' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/50 pb-4">
              <div>
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <FolderTree size={16} className="text-primary" />
                  Pohon Struktur Wilayah Berjenjang
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Klik panah untuk melihat turunan Kabupaten/Kota, Kecamatan, dan Desa/Kelurahan.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const all: Record<string, boolean> = {};
                    tree.forEach((p) => {
                      all[`prov-${p.id}`] = true;
                      p.regencies.forEach((r) => {
                        all[`reg-${r.id}`] = true;
                        r.districts.forEach((d) => {
                          all[`dist-${d.id}`] = true;
                        });
                      });
                    });
                    setExpandedNodes(all);
                  }}
                  className="btn btn-outline !px-2.5 !py-1 text-[11px]"
                >
                  Buka Semua
                </button>
                <button
                  onClick={() => setExpandedNodes({})}
                  className="btn btn-outline !px-2.5 !py-1 text-[11px]"
                >
                  Tutup Semua
                </button>
              </div>
            </div>

            {tree.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-xs">
                Belum ada data wilayah. Silakan klik "Tambah Provinsi" di atas.
              </div>
            ) : (
              <div className="space-y-3">
                {tree.map((prov) => {
                  const provKey = `prov-${prov.id}`;
                  const isProvOpen = Boolean(expandedNodes[provKey]);

                  return (
                    <div key={prov.id} className="rounded-xl border border-border/70 bg-background/50 overflow-hidden">
                      {/* PROVINCE NODE */}
                      <div className="flex items-center justify-between p-3 hover:bg-muted/40 transition-colors">
                        <div
                          className="flex items-center gap-2.5 cursor-pointer flex-1"
                          onClick={() => toggleNode(provKey)}
                        >
                          <button className="text-muted-foreground hover:text-foreground">
                            {isProvOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-primary/10 text-primary font-bold text-xs">
                            P
                          </span>
                          <span className="font-bold text-sm text-foreground">{prov.name}</span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                            {prov.regencies.length} Kab/Kota
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openCreateModal('regency', { provinceId: prov.id })}
                            className="btn btn-outline !px-2 !py-1 text-[11px] flex items-center gap-1"
                            title="Tambah Kabupaten/Kota di Provinsi ini"
                          >
                            <Plus size={12} /> Kab/Kota
                          </button>
                          <button
                            onClick={() => openEditModal('province', prov)}
                            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
                            title="Edit nama provinsi"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ type: 'province', id: prov.id, name: prov.name })}
                            className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg"
                            title="Hapus provinsi"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* REGENCIES LIST */}
                      {isProvOpen && (
                        <div className="pl-6 pr-3 pb-3 pt-1 space-y-2 border-t border-border/40 bg-muted/20">
                          {prov.regencies.length === 0 ? (
                            <div className="text-xs text-muted-foreground py-2 italic pl-4">
                              Belum ada Kabupaten / Kota. Klik "+ Kab/Kota" untuk menambahkan.
                            </div>
                          ) : (
                            prov.regencies.map((reg) => {
                              const regKey = `reg-${reg.id}`;
                              const isRegOpen = Boolean(expandedNodes[regKey]);

                              return (
                                <div key={reg.id} className="rounded-lg border border-border/60 bg-card overflow-hidden">
                                  {/* REGENCY NODE */}
                                  <div className="flex items-center justify-between p-2.5 hover:bg-muted/30 transition-colors">
                                    <div
                                      className="flex items-center gap-2 cursor-pointer flex-1"
                                      onClick={() => toggleNode(regKey)}
                                    >
                                      <button className="text-muted-foreground hover:text-foreground">
                                        {isRegOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                      </button>
                                      <span
                                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                          reg.type === 'kabupaten'
                                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                            : 'bg-sky-500/10 text-sky-700 dark:text-sky-400'
                                        }`}
                                      >
                                        {reg.type === 'kabupaten' ? 'Kabupaten' : 'Kota'}
                                      </span>
                                      <span className="font-semibold text-xs text-foreground">{reg.name}</span>
                                      <span className="text-[10px] text-muted-foreground">
                                        ({reg.districts.length} Kec)
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => openCreateModal('district', { regencyId: reg.id })}
                                        className="btn btn-outline !px-2 !py-0.5 text-[10px] flex items-center gap-1"
                                        title="Tambah Kecamatan"
                                      >
                                        <Plus size={11} /> Kec
                                      </button>
                                      <button
                                        onClick={() => openEditModal('regency', { ...reg, provinceId: prov.id })}
                                        className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-muted"
                                      >
                                        <Pencil size={12} />
                                      </button>
                                      <button
                                        onClick={() =>
                                          setDeleteConfirm({
                                            type: 'regency',
                                            id: reg.id,
                                            name: `${reg.type === 'kabupaten' ? 'Kabupaten' : 'Kota'} ${reg.name}`,
                                          })
                                        }
                                        className="p-1 text-destructive hover:bg-destructive/10 rounded"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </div>

                                  {/* DISTRICTS LIST */}
                                  {isRegOpen && (
                                    <div className="pl-6 pr-2.5 pb-2.5 pt-1 space-y-1.5 border-t border-border/30 bg-muted/10">
                                      {reg.districts.length === 0 ? (
                                        <div className="text-[11px] text-muted-foreground py-1 italic pl-3">
                                          Belum ada Kecamatan. Klik "+ Kec" untuk menambahkan.
                                        </div>
                                      ) : (
                                        reg.districts.map((dist) => {
                                          const distKey = `dist-${dist.id}`;
                                          const isDistOpen = Boolean(expandedNodes[distKey]);

                                          return (
                                            <div key={dist.id} className="rounded border border-border/40 bg-background/80 overflow-hidden">
                                              {/* DISTRICT NODE */}
                                              <div className="flex items-center justify-between p-2 hover:bg-muted/20">
                                                <div
                                                  className="flex items-center gap-1.5 cursor-pointer flex-1"
                                                  onClick={() => toggleNode(distKey)}
                                                >
                                                  <button className="text-muted-foreground hover:text-foreground">
                                                    {isDistOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                                                  </button>
                                                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                                    Kec.
                                                  </span>
                                                  <span className="font-medium text-xs text-foreground">{dist.name}</span>
                                                  <span className="text-[10px] text-muted-foreground">
                                                    ({dist.villages.length} {reg.type === 'kabupaten' ? 'Desa' : 'Kelurahan'})
                                                  </span>
                                                </div>

                                                <div className="flex items-center gap-1">
                                                  <button
                                                    onClick={() =>
                                                      openCreateModal('village', {
                                                        districtId: dist.id,
                                                        defType: reg.type === 'kabupaten' ? 'desa' : 'kelurahan',
                                                      })
                                                    }
                                                    className="btn btn-outline !px-1.5 !py-0.5 text-[10px] flex items-center gap-0.5"
                                                    title={`Tambah ${reg.type === 'kabupaten' ? 'Desa' : 'Kelurahan'}`}
                                                  >
                                                    <Plus size={10} /> {reg.type === 'kabupaten' ? 'Desa' : 'Kelurahan'}
                                                  </button>
                                                  <button
                                                    onClick={() => openEditModal('district', { ...dist, regencyId: reg.id })}
                                                    className="p-1 text-muted-foreground hover:text-foreground rounded"
                                                  >
                                                    <Pencil size={11} />
                                                  </button>
                                                  <button
                                                    onClick={() =>
                                                      setDeleteConfirm({
                                                        type: 'district',
                                                        id: dist.id,
                                                        name: `Kecamatan ${dist.name}`,
                                                      })
                                                    }
                                                    className="p-1 text-destructive hover:bg-destructive/10 rounded"
                                                  >
                                                    <Trash2 size={11} />
                                                  </button>
                                                </div>
                                              </div>

                                              {/* VILLAGES LIST */}
                                              {isDistOpen && (
                                                <div className="pl-6 pr-2 py-1.5 space-y-1 bg-card/60 border-t border-border/20">
                                                  {dist.villages.length === 0 ? (
                                                    <div className="text-[10px] text-muted-foreground italic pl-2">
                                                      Belum ada {reg.type === 'kabupaten' ? 'Desa' : 'Kelurahan'}.
                                                    </div>
                                                  ) : (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                                                      {dist.villages.map((vil) => (
                                                        <div
                                                          key={vil.id}
                                                          className="flex items-center justify-between px-2 py-1 rounded border border-border/40 bg-background text-[11px]"
                                                        >
                                                          <div className="flex items-center gap-1.5 truncate">
                                                            <span
                                                              className={`text-[9px] px-1 rounded ${
                                                                vil.type === 'desa'
                                                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                                                  : 'bg-sky-500/10 text-sky-700 dark:text-sky-400'
                                                              }`}
                                                            >
                                                              {vil.type === 'desa' ? 'Desa' : 'Kel.'}
                                                            </span>
                                                            <span className="font-medium text-foreground truncate">{vil.name}</span>
                                                          </div>
                                                          <div className="flex items-center gap-0.5 shrink-0 ml-1">
                                                            <button
                                                              onClick={() => openEditModal('village', { ...vil, districtId: dist.id })}
                                                              className="p-0.5 text-muted-foreground hover:text-foreground"
                                                            >
                                                              <Pencil size={10} />
                                                            </button>
                                                            <button
                                                              onClick={() =>
                                                                setDeleteConfirm({
                                                                  type: 'village',
                                                                  id: vil.id,
                                                                  name: `${vil.type === 'desa' ? 'Desa' : 'Kelurahan'} ${vil.name}`,
                                                                })
                                                              }
                                                              className="p-0.5 text-destructive hover:bg-destructive/10"
                                                            >
                                                              <Trash2 size={10} />
                                                            </button>
                                                          </div>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PROVINSI TABLE */}
      {activeTab === 'province' && (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">Daftar Provinsi</h2>
            <button
              onClick={() => openCreateModal('province')}
              className="btn btn-primary !px-3 !py-1.5 text-xs flex items-center gap-1"
            >
              <Plus size={14} /> Tambah Provinsi
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Nama Provinsi</th>
                  <th className="p-3">Jumlah Kab/Kota</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {flatProvinces.map((prov) => (
                  <tr key={prov.id} className="hover:bg-muted/40">
                    <td className="p-3 font-mono text-muted-foreground">{prov.id}</td>
                    <td className="p-3 font-bold text-foreground">{prov.name}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full bg-muted text-foreground font-medium">
                        {prov.count} Kab/Kota
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal('province', prov)}
                          className="btn btn-outline !px-2.5 !py-1 text-xs"
                        >
                          <Pencil size={12} className="mr-1 inline" /> Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ type: 'province', id: prov.id, name: prov.name })}
                          className="btn btn-danger !px-2.5 !py-1 text-xs"
                        >
                          <Trash2 size={12} className="mr-1 inline" /> Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: KABUPATEN / KOTA TABLE */}
      {activeTab === 'regency' && (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={filterProvinceId}
                onChange={(e) => setFilterProvinceId(e.target.value)}
                className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs"
              >
                <option value="">Semua Provinsi</option>
                {tree.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs"
              >
                <option value="all">Semua Tipe</option>
                <option value="kabupaten">Hanya Kabupaten</option>
                <option value="kota">Hanya Kota</option>
              </select>
            </div>

            <button
              onClick={() => openCreateModal('regency', { provinceId: Number(filterProvinceId) || tree[0]?.id })}
              className="btn btn-primary !px-3 !py-1.5 text-xs flex items-center gap-1"
            >
              <Plus size={14} /> Tambah Kab/Kota
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Tipe</th>
                  <th className="p-3">Nama Kabupaten / Kota</th>
                  <th className="p-3">Provinsi</th>
                  <th className="p-3">Jumlah Kecamatan</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {flatRegencies
                  .filter((r) => !filterProvinceId || r.provinceId === Number(filterProvinceId))
                  .filter((r) => filterType === 'all' || r.type === filterType)
                  .map((reg) => (
                    <tr key={reg.id} className="hover:bg-muted/40">
                      <td className="p-3 font-mono text-muted-foreground">{reg.id}</td>
                      <td className="p-3">
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                            reg.type === 'kabupaten'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                              : 'bg-sky-500/10 text-sky-700 dark:text-sky-400'
                          }`}
                        >
                          {reg.type === 'kabupaten' ? 'Kabupaten' : 'Kota'}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-foreground">{reg.name}</td>
                      <td className="p-3 text-muted-foreground">{reg.provinceName}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full bg-muted text-foreground font-medium">
                          {reg.districtCount} Kecamatan
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal('regency', reg)}
                            className="btn btn-outline !px-2.5 !py-1 text-xs"
                          >
                            <Pencil size={12} className="mr-1 inline" /> Edit
                          </button>
                          <button
                            onClick={() =>
                              setDeleteConfirm({
                                type: 'regency',
                                id: reg.id,
                                name: `${reg.type === 'kabupaten' ? 'Kabupaten' : 'Kota'} ${reg.name}`,
                              })
                            }
                            className="btn btn-danger !px-2.5 !py-1 text-xs"
                          >
                            <Trash2 size={12} className="mr-1 inline" /> Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: KECAMATAN TABLE */}
      {activeTab === 'district' && (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={filterProvinceId}
                onChange={(e) => {
                  setFilterProvinceId(e.target.value);
                  setFilterRegencyId('');
                }}
                className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs"
              >
                <option value="">Semua Provinsi</option>
                {tree.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <select
                value={filterRegencyId}
                onChange={(e) => setFilterRegencyId(e.target.value)}
                className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs"
              >
                <option value="">Semua Kab / Kota</option>
                {flatRegencies
                  .filter((r) => !filterProvinceId || r.provinceId === Number(filterProvinceId))
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.type === 'kabupaten' ? 'Kab.' : 'Kota'} {r.name}
                    </option>
                  ))}
              </select>
            </div>

            <button
              onClick={() => openCreateModal('district', { regencyId: Number(filterRegencyId) || flatRegencies[0]?.id })}
              className="btn btn-primary !px-3 !py-1.5 text-xs flex items-center gap-1"
            >
              <Plus size={14} /> Tambah Kecamatan
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Nama Kecamatan</th>
                  <th className="p-3">Kabupaten / Kota</th>
                  <th className="p-3">Provinsi</th>
                  <th className="p-3">Jumlah Desa/Kelurahan</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {flatDistricts
                  .filter((d) => !filterRegencyId || d.regencyId === Number(filterRegencyId))
                  .map((dist) => (
                    <tr key={dist.id} className="hover:bg-muted/40">
                      <td className="p-3 font-mono text-muted-foreground">{dist.id}</td>
                      <td className="p-3 font-bold text-foreground">Kecamatan {dist.name}</td>
                      <td className="p-3">
                        <span className="font-medium text-foreground">
                          {dist.regencyType === 'kabupaten' ? 'Kab.' : 'Kota'} {dist.regencyName}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">{dist.provinceName}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full bg-muted text-foreground font-medium">
                          {dist.villageCount}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal('district', dist)}
                            className="btn btn-outline !px-2.5 !py-1 text-xs"
                          >
                            <Pencil size={12} className="mr-1 inline" /> Edit
                          </button>
                          <button
                            onClick={() =>
                              setDeleteConfirm({
                                type: 'district',
                                id: dist.id,
                                name: `Kecamatan ${dist.name}`,
                              })
                            }
                            className="btn btn-danger !px-2.5 !py-1 text-xs"
                          >
                            <Trash2 size={12} className="mr-1 inline" /> Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: DESA / KELURAHAN TABLE */}
      {activeTab === 'village' && (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={filterProvinceId}
                onChange={(e) => {
                  setFilterProvinceId(e.target.value);
                  setFilterRegencyId('');
                  setFilterDistrictId('');
                }}
                className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs"
              >
                <option value="">Semua Provinsi</option>
                {tree.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <select
                value={filterRegencyId}
                onChange={(e) => {
                  setFilterRegencyId(e.target.value);
                  setFilterDistrictId('');
                }}
                className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs"
              >
                <option value="">Semua Kab / Kota</option>
                {flatRegencies
                  .filter((r) => !filterProvinceId || r.provinceId === Number(filterProvinceId))
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.type === 'kabupaten' ? 'Kab.' : 'Kota'} {r.name}
                    </option>
                  ))}
              </select>

              <select
                value={filterDistrictId}
                onChange={(e) => setFilterDistrictId(e.target.value)}
                className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs"
              >
                <option value="">Semua Kecamatan</option>
                {flatDistricts
                  .filter((d) => !filterRegencyId || d.regencyId === Number(filterRegencyId))
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      Kec. {d.name}
                    </option>
                  ))}
              </select>
            </div>

            <button
              onClick={() => openCreateModal('village', { districtId: Number(filterDistrictId) || flatDistricts[0]?.id })}
              className="btn btn-primary !px-3 !py-1.5 text-xs flex items-center gap-1"
            >
              <Plus size={14} /> Tambah Desa / Kelurahan
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Tipe</th>
                  <th className="p-3">Nama Desa / Kelurahan</th>
                  <th className="p-3">Kecamatan</th>
                  <th className="p-3">Kabupaten / Kota</th>
                  <th className="p-3">Provinsi</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {flatVillages
                  .filter((v) => !filterDistrictId || v.districtId === Number(filterDistrictId))
                  .map((vil) => (
                    <tr key={vil.id} className="hover:bg-muted/40">
                      <td className="p-3 font-mono text-muted-foreground">{vil.id}</td>
                      <td className="p-3">
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                            vil.type === 'desa'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                              : 'bg-sky-500/10 text-sky-700 dark:text-sky-400'
                          }`}
                        >
                          {vil.type === 'desa' ? 'Desa' : 'Kelurahan'}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-foreground">{vil.name}</td>
                      <td className="p-3 text-muted-foreground">Kec. {vil.districtName}</td>
                      <td className="p-3 text-muted-foreground">
                        {vil.regencyType === 'kabupaten' ? 'Kab.' : 'Kota'} {vil.regencyName}
                      </td>
                      <td className="p-3 text-muted-foreground">{vil.provinceName}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal('village', vil)}
                            className="btn btn-outline !px-2.5 !py-1 text-xs"
                          >
                            <Pencil size={12} className="mr-1 inline" /> Edit
                          </button>
                          <button
                            onClick={() =>
                              setDeleteConfirm({
                                type: 'village',
                                id: vil.id,
                                name: `${vil.type === 'desa' ? 'Desa' : 'Kelurahan'} ${vil.name}`,
                              })
                            }
                            className="btn btn-danger !px-2.5 !py-1 text-xs"
                          >
                            <Trash2 size={12} className="mr-1 inline" /> Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <MapPin size={16} className="text-primary" />
                {modalMode === 'create' ? 'Tambah ' : 'Edit '}
                {modalType === 'province' && 'Provinsi'}
                {modalType === 'regency' && 'Kabupaten / Kota'}
                {modalType === 'district' && 'Kecamatan'}
                {modalType === 'village' && 'Desa / Kelurahan'}
              </h3>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* PARENT SELECTORS */}
              {modalType === 'regency' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Provinsi</label>
                  <select
                    value={formData.provinceId}
                    onChange={(e) => setFormData((f) => ({ ...f, provinceId: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs"
                    required
                  >
                    {tree.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {modalType === 'regency' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Tipe Wilayah</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData((f) => ({ ...f, type: 'kabupaten' }))}
                      className={`p-2 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                        formData.type === 'kabupaten'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : 'border-border bg-background text-muted-foreground'
                      }`}
                    >
                      <Home size={14} /> Kabupaten
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData((f) => ({ ...f, type: 'kota' }))}
                      className={`p-2 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                        formData.type === 'kota'
                          ? 'border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-400'
                          : 'border-border bg-background text-muted-foreground'
                      }`}
                    >
                      <Building2 size={14} /> Kota
                    </button>
                  </div>
                </div>
              )}

              {modalType === 'district' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Kabupaten / Kota</label>
                  <select
                    value={formData.regencyId}
                    onChange={(e) => setFormData((f) => ({ ...f, regencyId: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs"
                    required
                  >
                    <option value="">-- Pilih Kabupaten / Kota --</option>
                    {flatRegencies.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.type === 'kabupaten' ? 'Kab.' : 'Kota'} {r.name} ({r.provinceName})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {modalType === 'village' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Kecamatan</label>
                  <select
                    value={formData.districtId}
                    onChange={(e) => setFormData((f) => ({ ...f, districtId: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs"
                    required
                  >
                    <option value="">-- Pilih Kecamatan --</option>
                    {flatDistricts.map((d) => (
                      <option key={d.id} value={d.id}>
                        Kec. {d.name} ({d.regencyType === 'kabupaten' ? 'Kab.' : 'Kota'} {d.regencyName})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {modalType === 'village' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Tipe Satuan Wilayah</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData((f) => ({ ...f, type: 'desa' }))}
                      className={`p-2 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                        formData.type === 'desa'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : 'border-border bg-background text-muted-foreground'
                      }`}
                    >
                      <Home size={14} /> Desa (Kabupaten)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData((f) => ({ ...f, type: 'kelurahan' }))}
                      className={`p-2 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                        formData.type === 'kelurahan'
                          ? 'border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-400'
                          : 'border-border bg-background text-muted-foreground'
                      }`}
                    >
                      <Building2 size={14} /> Kelurahan (Kota)
                    </button>
                  </div>
                </div>
              )}

              {/* NAME INPUT */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">
                  Nama {modalType === 'province' && 'Provinsi'}
                  {modalType === 'regency' && (formData.type === 'kabupaten' ? 'Kabupaten' : 'Kota')}
                  {modalType === 'district' && 'Kecamatan'}
                  {modalType === 'village' && (formData.type === 'desa' ? 'Desa' : 'Kelurahan')}
                </label>
                <input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                  placeholder={`Contoh: ${
                    modalType === 'province'
                      ? 'Jawa Barat'
                      : modalType === 'regency'
                      ? 'Bogor'
                      : modalType === 'district'
                      ? 'Cibinong'
                      : 'Sukamaju'
                  }`}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn btn-outline !px-3 !py-1.5 text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={
                    provinceMutation.isPending ||
                    regencyMutation.isPending ||
                    districtMutation.isPending ||
                    villageMutation.isPending
                  }
                  className="btn btn-primary !px-4 !py-1.5 text-xs font-bold"
                >
                  {modalMode === 'create' ? 'Simpan' : 'Perbarui'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-destructive/30 bg-card p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-destructive mb-3">
              <AlertTriangle size={24} />
              <h3 className="text-sm font-bold">Konfirmasi Hapus Wilayah</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Anda yakin ingin menghapus <strong>"{deleteConfirm.name}"</strong>?
              {deleteConfirm.type !== 'village' && (
                <span className="block mt-1 text-destructive font-medium">
                  Perhatian: Semua sub-wilayah di bawahnya juga akan ikut terhapus secara otomatis!
                </span>
              )}
            </p>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="btn btn-outline !px-3 !py-1.5 text-xs"
              >
                Batal
              </button>
              <button
                onClick={() => deleteMutation.mutate({ type: deleteConfirm.type, id: deleteConfirm.id })}
                disabled={deleteMutation.isPending}
                className="btn btn-danger !px-4 !py-1.5 text-xs font-bold"
              >
                {deleteMutation.isPending ? 'Menghapus…' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
