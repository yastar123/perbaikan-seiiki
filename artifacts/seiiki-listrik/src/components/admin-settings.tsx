import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  MessageCircle,
  Banknote,
  Zap,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Pencil,
  ExternalLink,
  Search,
  RefreshCw,
  CheckCircle2,
  X,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  PhoneCall,
  Check,
  Info,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

const rupiah = (n = 0) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n);

export interface BookingConfig {
  id?: number;
  stepNumber: string;
  title: string;
  subtitle: string;
  visitFee: number;
  visitFeeNote: string;
  buttonText: string;
  adminWhatsapp: string;
  namePlaceholder: string;
  phonePlaceholder: string;
  phoneHint: string;
  addressPlaceholder: string;
  gpsButtonText: string;
  gpsHint: string;
  notesPlaceholder: string;
  notesHint: string;
  enableGps: number;
  enableNotes: number;
  updatedAt?: string;
}

export interface NidiSloTariff {
  id: number;
  sortOrder: number;
  powerVa: number;
  powerLabel: string;
  sloFee: number;
  nidiFee: number;
  totalFee: number;
  notes: string | null;
  isActive: number;
  createdAt?: string;
}

export function AdminSettings() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'kunjungan' | 'nidi_slo'>('whatsapp');
  const [searchTariff, setSearchTariff] = useState('');
  const [filterActiveOnly, setFilterActiveOnly] = useState(false);

  // Notifications
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [tariffModalOpen, setTariffModalOpen] = useState(false);
  const [editingTariff, setEditingTariff] = useState<NidiSloTariff | null>(null);
  const [deletingTariff, setDeletingTariff] = useState<NidiSloTariff | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Local form states
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [visitFee, setVisitFee] = useState<number>(25000);
  const [visitFeeNote, setVisitFeeNote] = useState('');

  // Fetch Booking Config
  const { data: config, isLoading: isConfigLoading, refetch: refetchConfig } = useQuery<BookingConfig>({
    queryKey: ['booking-config'],
    queryFn: async () => {
      const res = await fetch(`${basePath}/api/booking-config`);
      if (!res.ok) throw new Error('Gagal memuat konfigurasi');
      return res.json();
    },
  });

  // Sync config data to local inputs
  React.useEffect(() => {
    if (config) {
      setWhatsappNumber(config.adminWhatsapp || '6281112345678');
      setVisitFee(config.visitFee ?? 25000);
      setVisitFeeNote(config.visitFeeNote || 'dibayar di muka');
    }
  }, [config]);

  // Fetch NIDI & SLO Tariffs
  const { data: tariffs = [], isLoading: isTariffsLoading, refetch: refetchTariffs } = useQuery<NidiSloTariff[]>({
    queryKey: ['nidi-slo-tariffs'],
    queryFn: async () => {
      const res = await fetch(`${basePath}/api/nidi-slo-tariffs`);
      if (!res.ok) throw new Error('Gagal memuat tarif NIDI & SLO');
      return res.json();
    },
  });

  // Mutation: Update Booking Config (used for WhatsApp & Visit Fee)
  const updateConfigMutation = useMutation({
    mutationFn: async (payload: Partial<BookingConfig>) => {
      const res = await fetch(`${basePath}/api/booking-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Gagal menyimpan pengaturan');
      return res.json();
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['booking-config'], updated);
      setFeedback({ type: 'success', message: 'Pengaturan berhasil diperbarui dan disimpan!' });
      setTimeout(() => setFeedback(null), 4000);
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err?.message || 'Terjadi kesalahan saat menyimpan pengaturan' });
    },
  });

  // Mutation: Create Tariff
  const createTariffMutation = useMutation({
    mutationFn: async (data: Partial<NidiSloTariff>) => {
      const res = await fetch(`${basePath}/api/nidi-slo-tariffs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Gagal menambah tarif');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nidi-slo-tariffs'] });
      setTariffModalOpen(false);
      setEditingTariff(null);
      setFeedback({ type: 'success', message: 'Tarif golongan daya baru berhasil ditambahkan!' });
      setTimeout(() => setFeedback(null), 4000);
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err?.message || 'Gagal menambah tarif' });
    },
  });

  // Mutation: Update Tariff
  const updateTariffMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<NidiSloTariff> }) => {
      const res = await fetch(`${basePath}/api/nidi-slo-tariffs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Gagal memperbarui tarif');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nidi-slo-tariffs'] });
      setTariffModalOpen(false);
      setEditingTariff(null);
      setFeedback({ type: 'success', message: 'Tarif golongan daya berhasil diperbarui!' });
      setTimeout(() => setFeedback(null), 4000);
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err?.message || 'Gagal memperbarui tarif' });
    },
  });

  // Mutation: Delete Tariff
  const deleteTariffMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${basePath}/api/nidi-slo-tariffs/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Gagal menghapus tarif');
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nidi-slo-tariffs'] });
      setDeletingTariff(null);
      setFeedback({ type: 'success', message: 'Tarif golongan daya berhasil dihapus!' });
      setTimeout(() => setFeedback(null), 4000);
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err?.message || 'Gagal menghapus tarif' });
    },
  });

  // Mutation: Reset / Seed Official 24 Tariffs
  const resetTariffsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${basePath}/api/nidi-slo-tariffs/reset-defaults`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Gagal memuat ulang seeder tarif NIDI & SLO');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nidi-slo-tariffs'] });
      setResetConfirmOpen(false);
      setFeedback({
        type: 'success',
        message: 'Tabel 24 Rekap Harga SLO & Supervisi NIDI berhasil dimuat ulang sesuai data seeder resmi!',
      });
      setTimeout(() => setFeedback(null), 5000);
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err?.message || 'Gagal mereset data seeder' });
    },
  });

  // Format and sanitize WhatsApp input
  const handleSaveWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    let clean = whatsappNumber.replace(/\D/g, '');
    if (clean.startsWith('0')) {
      clean = '62' + clean.slice(1);
    } else if (!clean.startsWith('62') && clean.length > 0) {
      clean = '62' + clean;
    }
    updateConfigMutation.mutate({ adminWhatsapp: clean });
  };

  // Save visit fee
  const handleSaveVisitFee = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfigMutation.mutate({
      visitFee: Number(visitFee) || 0,
      visitFeeNote: visitFeeNote.trim(),
    });
  };

  // Filtered tariffs
  const filteredTariffs = useMemo(() => {
    return tariffs.filter((t) => {
      const matchSearch =
        t.powerLabel.toLowerCase().includes(searchTariff.toLowerCase()) ||
        String(t.powerVa).includes(searchTariff) ||
        (t.notes && t.notes.toLowerCase().includes(searchTariff.toLowerCase()));
      const matchActive = !filterActiveOnly || t.isActive === 1;
      return matchSearch && matchActive;
    });
  }, [tariffs, searchTariff, filterActiveOnly]);

  const testWaUrl = useMemo(() => {
    let clean = whatsappNumber.replace(/\D/g, '');
    if (clean.startsWith('0')) clean = '62' + clean.slice(1);
    else if (!clean.startsWith('62') && clean.length > 0) clean = '62' + clean;
    return `https://wa.me/${clean}?text=${encodeURIComponent('Halo Admin SEIIKI, ini pesan tes pengaturan.')}`;
  }, [whatsappNumber]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="eyebrow flex items-center gap-1.5 text-xs font-semibold text-accent uppercase tracking-wider">
            <Settings size={14} /> Konfigurasi Operasional & Finansial
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1">Pengaturan Sistem</h1>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Pusat kendali nomor kontak WhatsApp Admin resmi, penetapan biaya kunjungan teknisi (visit fee), serta pengelolaan rekapitulasi tarif 24 golongan daya NIDI &amp; SLO.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void refetchConfig();
              void refetchTariffs();
            }}
            className="btn btn-outline !px-3 !py-2 text-xs font-bold gap-1.5"
            data-testid="button-refresh-settings"
          >
            <RefreshCw size={14} className={isConfigLoading || isTariffsLoading ? 'animate-spin' : ''} />
            <span>Segarkan Data</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-medium rise-in ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-300'
          }`}
          role="status"
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('whatsapp')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'whatsapp'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
          data-testid="tab-settings-whatsapp"
        >
          <MessageCircle size={15} />
          <span>Nomor WhatsApp Admin</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('kunjungan')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'kunjungan'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
          data-testid="tab-settings-kunjungan"
        >
          <Banknote size={15} />
          <span>Harga Kunjungan (Visit Fee)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('nidi_slo')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'nidi_slo'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
          data-testid="tab-settings-nidi-slo"
        >
          <Zap size={15} />
          <span>Harga SLO &amp; NIDI (24 Golongan Daya)</span>
          <span className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-[10px]">
            {tariffs.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: WHATSAPP ADMIN */}
      {/* ========================================================================= */}
      {activeTab === 'whatsapp' && (
        <div className="space-y-6 rise-in">
          <div className="panel p-6 space-y-6">
            <div className="border-b border-border pb-4">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <MessageCircle className="text-emerald-500" size={20} />
                Pengaturan Nomor WhatsApp Admin Resmi
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Nomor ini digunakan sebagai saluran pusat komunikasi pelanggan, konfirmasi janji temu teknisi, serta tautan bantuan otomatis di formulir pengajuan.
              </p>
            </div>

            <form onSubmit={handleSaveWhatsApp} className="max-w-xl space-y-5">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  Nomor WhatsApp Admin (Format Internasional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                    <PhoneCall size={16} />
                  </div>
                  <input
                    type="text"
                    required
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="Contoh: 6281112345678"
                    className="w-full pl-10"
                    data-testid="input-settings-whatsapp"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                  Format disarankan menggunakan kode negara <strong>62</strong> (tanpa tanda + atau spasi). Jika Anda mengetik <code>08...</code>, sistem akan otomatis menyesuaikannya menjadi <code>628...</code> saat disimpan.
                </p>
              </div>

              {/* Status Preview Card */}
              <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Pratinjau Saluran Chat</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Siap Digunakan
                  </span>
                </div>
                <div className="text-xs text-muted-foreground flex flex-col gap-1">
                  <span>
                    Nomor aktif tersimpan: <strong className="font-mono text-foreground">{config?.adminWhatsapp || '-'}</strong>
                  </span>
                  <span>
                    Tautan tujuan: <span className="font-mono text-[11px] break-all text-accent">{testWaUrl}</span>
                  </span>
                </div>
                <div className="pt-2">
                  <a
                    href={testWaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline !px-3 !py-1.5 text-xs font-bold gap-1.5 inline-flex"
                    data-testid="button-test-whatsapp-link"
                  >
                    <ExternalLink size={13} /> Uji Buka Chat WhatsApp
                  </a>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={updateConfigMutation.isPending}
                  className="btn btn-primary !px-5 !py-2.5 text-xs font-bold gap-2"
                  data-testid="button-save-whatsapp"
                >
                  <Save size={15} />
                  <span>{updateConfigMutation.isPending ? 'Menyimpan...' : 'Simpan Nomor WhatsApp'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: HARGA KUNJUNGAN (VISIT FEE) */}
      {/* ========================================================================= */}
      {activeTab === 'kunjungan' && (
        <div className="space-y-6 rise-in">
          <div className="panel p-6 space-y-6">
            <div className="border-b border-border pb-4">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Banknote className="text-primary" size={20} />
                Pengaturan Biaya Kunjungan (Visit Fee)
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Atur nominal tarif komitmen awal yang dikenakan kepada pelanggan sebelum teknisi dijadwalkan berangkat ke lokasi.
              </p>
            </div>

            <form onSubmit={handleSaveVisitFee} className="max-w-xl space-y-5">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  Nominal Biaya Kunjungan (Rp)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none font-bold text-xs text-muted-foreground">
                    Rp
                  </div>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1000"
                    value={visitFee}
                    onChange={(e) => setVisitFee(Number(e.target.value))}
                    placeholder="Contoh: 25000"
                    className="w-full pl-11 font-mono text-sm font-bold"
                    data-testid="input-settings-visit-fee"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Terformat: <strong className="text-foreground">{rupiah(visitFee)}</strong>
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  Keterangan Singkat Biaya Kunjungan
                </label>
                <input
                  type="text"
                  value={visitFeeNote}
                  onChange={(e) => setVisitFeeNote(e.target.value)}
                  placeholder="Contoh: dibayar di muka"
                  className="w-full text-xs"
                  data-testid="input-settings-visit-fee-note"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Keterangan ini muncul tepat di bawah label nominal biaya kunjungan pada formulir pelanggan.
                </p>
              </div>

              {/* Simulation Box */}
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-primary" /> Simulasi Tampilan di Formulir Pemesanan
                </span>
                <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Biaya Kunjungan Awal</span>
                    <strong className="text-sm font-bold text-primary font-mono">{rupiah(visitFee)}</strong>
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                    {visitFeeNote || 'dibayar di muka'}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Nominal ini secara otomatis menjadi acuan pembuatan invoice pembayaran QRIS / Paywuz untuk kunjungan inspeksi teknisi.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={updateConfigMutation.isPending}
                  className="btn btn-primary !px-5 !py-2.5 text-xs font-bold gap-2"
                  data-testid="button-save-visit-fee"
                >
                  <Save size={15} />
                  <span>{updateConfigMutation.isPending ? 'Menyimpan...' : 'Simpan Biaya Kunjungan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TARIF NIDI & SLO (24 GOLONGAN DAYA) */}
      {/* ========================================================================= */}
      {activeTab === 'nidi_slo' && (
        <div className="space-y-6 rise-in">
          {/* Section Overview Panel */}
          <div className="panel p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <FileSpreadsheet className="text-amber-500" size={20} />
                  Rekap Harga SLO dan Supervisi NIDI Tegangan Rendah (TR)
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Daftar 24 golongan daya TR lengkap (450 VA s/d 197.000 VA) beserta rincian Biaya SLO, Biaya Supervisi NIDI, dan Total Biaya.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setResetConfirmOpen(true)}
                  className="btn btn-outline !px-3 !py-2 text-xs font-bold gap-1.5 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                  data-testid="button-reset-tariffs-seeder"
                >
                  <RotateCcw size={14} /> Muat Ulang Seeder Resmi (24 Daya)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingTariff(null);
                    setTariffModalOpen(true);
                  }}
                  className="btn btn-primary !px-3 !py-2 text-xs font-bold gap-1.5"
                  data-testid="button-add-tariff"
                >
                  <Plus size={14} /> Tambah Golongan Daya
                </button>
              </div>
            </div>

            {/* Quick Search & Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="relative flex-1 max-w-sm">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Cari daya (contoh: 1300, 2200, 5500...)"
                  value={searchTariff}
                  onChange={(e) => setSearchTariff(e.target.value)}
                  className="w-full pl-9 text-xs"
                  data-testid="input-search-tariff"
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filterActiveOnly}
                    onChange={(e) => setFilterActiveOnly(e.target.checked)}
                    className="rounded border-border"
                  />
                  <span>Hanya tampilkan yang aktif</span>
                </label>

                <span className="text-xs text-muted-foreground">
                  Menampilkan <strong>{filteredTariffs.length}</strong> dari {tariffs.length} golongan daya
                </span>
              </div>
            </div>

            {/* Table */}
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '45px' }}>No</th>
                    <th>Daya Listrik (VA)</th>
                    <th>Biaya SLO (Rp)</th>
                    <th>Biaya Supervisi NIDI (Rp)</th>
                    <th>Total Biaya (Rp)</th>
                    <th>Rumus &amp; Catatan</th>
                    <th style={{ width: '90px' }}>Status</th>
                    <th className="text-right" style={{ width: '100px' }}>
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTariffs.map((t, idx) => (
                    <tr key={t.id} data-testid={`row-tariff-${t.id}`}>
                      <td className="text-xs font-mono text-muted-foreground">
                        {t.sortOrder || idx + 1}
                      </td>
                      <td>
                        <div className="flex flex-col">
                          <strong className="text-xs font-bold text-foreground">
                            {t.powerLabel}
                          </strong>
                          <span className="text-[11px] font-mono text-muted-foreground">
                            {t.powerVa.toLocaleString('id-ID')} VA
                          </span>
                        </div>
                      </td>
                      <td className="font-mono text-xs font-semibold text-foreground">
                        {rupiah(t.sloFee)}
                      </td>
                      <td className="font-mono text-xs font-semibold text-foreground">
                        {rupiah(t.nidiFee)}
                      </td>
                      <td className="font-mono text-xs font-bold text-primary">
                        {rupiah(t.totalFee)}
                      </td>
                      <td className="text-[11px] text-muted-foreground max-w-xs">
                        {t.notes || '-'}
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() =>
                            updateTariffMutation.mutate({
                              id: t.id,
                              data: { isActive: t.isActive === 1 ? 0 : 1 },
                            })
                          }
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            t.isActive === 1
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : 'bg-muted text-muted-foreground'
                          }`}
                          data-testid={`toggle-tariff-active-${t.id}`}
                        >
                          {t.isActive === 1 ? 'Aktif' : 'Nonaktif'}
                        </button>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            className="icon-button"
                            onClick={() => {
                              setEditingTariff(t);
                              setTariffModalOpen(true);
                            }}
                            title="Edit Tarif"
                            data-testid={`button-edit-tariff-${t.id}`}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className="icon-button icon-danger"
                            onClick={() => setDeletingTariff(t)}
                            title="Hapus Tarif"
                            data-testid={`button-delete-tariff-${t.id}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredTariffs.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-xs text-muted-foreground">
                        Tidak ada golongan daya yang cocok dengan pencarian &ldquo;{searchTariff}&rdquo;.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Formula & Rule Footnote */}
            <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-2 text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground flex items-center gap-1.5 font-bold">
                <Info size={14} className="text-primary" /> Catatan Ketentuan Penetapan Tarif SLO &amp; NIDI:
              </strong>
              <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px]">
                <li><strong>Biaya SLO (No. 1–4):</strong> Tarif tetap per golongan daya (450 VA: Rp40.000, 900 VA: Rp60.000, 1.300 VA: Rp120.000, 2.200 VA: Rp135.000).</li>
                <li><strong>Biaya SLO (No. 5–24):</strong> Daya (VA) × tarif SLO per VA (Rp35 / Rp30 / Rp25 / Rp20 sesuai golongan daya).</li>
                <li><strong>Biaya Supervisi NIDI:</strong> Daya (VA) × tarif supervisi per VA (Rp100 / Rp75 / Rp60 sesuai golongan daya).</li>
                <li><strong>Total Biaya:</strong> Biaya SLO + Biaya Supervisi NIDI.</li>
                <li><strong>Baris No. 19 (82.500 VA):</strong> Disesuaikan dengan batas bawah golongan tarif SLO agar konsisten dengan data Supervisi NIDI (82.000 VA) yang menghasilkan Rp4.950.000.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT / CREATE TARIFF */}
      {/* ========================================================================= */}
      {tariffModalOpen && (
        <TariffEditModal
          tariff={editingTariff}
          onClose={() => {
            setTariffModalOpen(false);
            setEditingTariff(null);
          }}
          onSave={(data) => {
            if (editingTariff) {
              updateTariffMutation.mutate({ id: editingTariff.id, data });
            } else {
              createTariffMutation.mutate(data);
            }
          }}
          isSubmitting={createTariffMutation.isPending || updateTariffMutation.isPending}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIRM RESET SEEDER */}
      {/* ========================================================================= */}
      {resetConfirmOpen && (
        <div className="modal-backdrop">
          <div className="modal max-w-md space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-amber-500/10 text-amber-600">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Muat Ulang Seeder Resmi 24 Tarif?</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Tindakan ini akan mengembalikan seluruh daftar tarif NIDI &amp; SLO ke 24 golongan daya resmi (450 VA s/d 197.000 VA) sesuai tabel standar pemerintah. Perubahan kustom yang Anda buat sebelumnya akan diperbarui.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setResetConfirmOpen(false)}
                className="btn btn-outline text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={resetTariffsMutation.isPending}
                onClick={() => resetTariffsMutation.mutate()}
                className="btn btn-primary text-xs font-bold gap-1.5"
                data-testid="button-confirm-reset-seeder"
              >
                <Check size={14} />
                <span>{resetTariffsMutation.isPending ? 'Mereset...' : 'Ya, Muat Ulang 24 Tarif'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIRM DELETE TARIFF */}
      {/* ========================================================================= */}
      {deletingTariff && (
        <div className="modal-backdrop">
          <div className="modal max-w-md space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-red-500/10 text-red-600">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Hapus Golongan Daya?</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Apakah Anda yakin ingin menghapus tarif daya <strong>{deletingTariff.powerLabel}</strong> ({deletingTariff.powerVa.toLocaleString('id-ID')} VA) dari tabel rekap harga?
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setDeletingTariff(null)}
                className="btn btn-outline text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleteTariffMutation.isPending}
                onClick={() => deleteTariffMutation.mutate(deletingTariff.id)}
                className="btn btn-primary !bg-red-600 hover:!bg-red-700 text-xs font-bold gap-1.5"
                data-testid="button-confirm-delete-tariff"
              >
                <Trash2 size={14} />
                <span>{deleteTariffMutation.isPending ? 'Menghapus...' : 'Hapus Tarif'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TariffEditModal({
  tariff,
  onClose,
  onSave,
  isSubmitting,
}: {
  tariff: NidiSloTariff | null;
  onClose: () => void;
  onSave: (data: Partial<NidiSloTariff>) => void;
  isSubmitting: boolean;
}) {
  const [sortOrder, setSortOrder] = useState<number>(tariff?.sortOrder ?? 1);
  const [powerVa, setPowerVa] = useState<string>(tariff?.powerVa ? String(tariff.powerVa) : '');
  const [powerLabel, setPowerLabel] = useState<string>(tariff?.powerLabel || '');
  const [sloFee, setSloFee] = useState<string>(tariff?.sloFee !== undefined ? String(tariff.sloFee) : '');
  const [nidiFee, setNidiFee] = useState<string>(tariff?.nidiFee !== undefined ? String(tariff.nidiFee) : '');
  const [notes, setNotes] = useState<string>(tariff?.notes || '');
  const [isActive, setIsActive] = useState<number>(tariff?.isActive ?? 1);

  const totalFeeCalc = (Number(sloFee) || 0) + (Number(nidiFee) || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!powerVa || !powerLabel) return;
    onSave({
      sortOrder: Number(sortOrder),
      powerVa: Number(powerVa),
      powerLabel: powerLabel.trim(),
      sloFee: Number(sloFee) || 0,
      nidiFee: Number(nidiFee) || 0,
      totalFee: totalFeeCalc,
      notes: notes.trim() || undefined,
      isActive,
    });
  };

  return (
    <div className="modal-backdrop">
      <form className="modal max-w-lg space-y-4" onSubmit={handleSubmit}>
        <div className="flex items-start justify-between border-b border-border pb-3">
          <div>
            <div className="eyebrow text-xs font-bold text-accent uppercase">
              {tariff ? 'Edit Tarif Golongan Daya' : 'Tambah Golongan Daya'}
            </div>
            <h3 className="text-base font-bold text-foreground">
              {tariff ? `Tarif Daya ${tariff.powerLabel}` : 'Golongan Daya Baru'}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Atur besaran Biaya SLO, Biaya Supervisi NIDI, dan status keaktifan.
            </p>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            data-testid="button-close-tariff-dialog"
          >
            <X size={17} />
          </button>
        </div>

        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">Nomor Urut</label>
              <input
                type="number"
                required
                min="1"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                placeholder="1, 2, 3..."
                className="w-full text-xs"
                data-testid="input-modal-sort-order"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1">Daya Listrik (VA)</label>
              <input
                type="number"
                required
                min="1"
                value={powerVa}
                onChange={(e) => {
                  setPowerVa(e.target.value);
                  if (!powerLabel || powerLabel.endsWith('VA')) {
                    const val = Number(e.target.value);
                    if (val) setPowerLabel(`${val.toLocaleString('id-ID')} VA`);
                  }
                }}
                placeholder="Contoh: 1300"
                className="w-full text-xs"
                data-testid="input-modal-power-va"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-foreground block mb-1">Label Tampilan Daya</label>
            <input
              type="text"
              required
              value={powerLabel}
              onChange={(e) => setPowerLabel(e.target.value)}
              placeholder="Contoh: 1.300 VA"
              className="w-full text-xs"
              data-testid="input-modal-power-label"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">Biaya SLO (Rp)</label>
              <input
                type="number"
                required
                min="0"
                value={sloFee}
                onChange={(e) => setSloFee(e.target.value)}
                placeholder="Contoh: 120000"
                className="w-full text-xs font-mono"
                data-testid="input-modal-slo-fee"
              />
              <span className="text-[10px] text-muted-foreground block mt-1">
                {rupiah(Number(sloFee) || 0)}
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1">Biaya Supervisi NIDI (Rp)</label>
              <input
                type="number"
                required
                min="0"
                value={nidiFee}
                onChange={(e) => setNidiFee(e.target.value)}
                placeholder="Contoh: 130000"
                className="w-full text-xs font-mono"
                data-testid="input-modal-nidi-fee"
              />
              <span className="text-[10px] text-muted-foreground block mt-1">
                {rupiah(Number(nidiFee) || 0)}
              </span>
            </div>
          </div>

          {/* Automatic Total Calculation Box */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-muted-foreground block font-medium">
                Total Biaya SLO + NIDI (Otomatis)
              </span>
              <strong className="text-sm font-bold text-primary font-mono">
                {rupiah(totalFeeCalc)}
              </strong>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">
              = {rupiah(Number(sloFee) || 0)} + {rupiah(Number(nidiFee) || 0)}
            </span>
          </div>

          <div>
            <label className="text-xs font-bold text-foreground block mb-1">Rumus / Catatan Tambahan</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: SLO: 3.500 VA × Rp35/VA | NIDI: 3.500 VA × Rp100/VA"
              className="w-full text-xs"
              data-testid="input-modal-tariff-notes"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-3">
            <div>
              <strong className="text-xs text-foreground block">Status Keaktifan Tarif</strong>
              <span className="text-[11px] text-muted-foreground">
                Tampilkan golongan daya ini pada tabel rekap harga pelanggan
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(isActive === 1 ? 0 : 1)}
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                isActive === 1 ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
              }`}
              data-testid="toggle-modal-is-active"
            >
              {isActive === 1 ? 'Aktif' : 'Nonaktif'}
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-outline text-xs"
            data-testid="button-cancel-tariff-modal"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary text-xs font-bold gap-1.5"
            data-testid="button-save-tariff-modal"
          >
            <Check size={14} />
            <span>{isSubmitting ? 'Menyimpan...' : tariff ? 'Simpan Perubahan' : 'Tambahkan'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
