import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Globe, Save, RotateCcw, Plus, Trash2, Pencil, ExternalLink,
  ShieldCheck, Clock3, MessageCircle, ReceiptText, Wrench, Zap, CheckCircle2,
  Sparkles, Headphones, Award, MapPin, CalendarDays, HelpCircle, AlertTriangle,
  Flame, HardHat, Hammer, Eye, Compass, ThumbsUp, HeartHandshake, PhoneCall,
  ChevronUp, ChevronDown, Check, X, ArrowRight, Layout, Sliders, Menu, Footprints
} from 'lucide-react';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

export interface CmsNavbarLink {
  id: string;
  label: string;
  href: string;
}

export interface CmsNavbar {
  brandName: string;
  brandTagline: string;
  logoText: string;
  links: CmsNavbarLink[];
  actionText: string;
  actionHref: string;
  showAction: boolean;
}

export interface CmsHeroBadge {
  id: string;
  icon: string;
  text: string;
}

export interface CmsHero {
  enabled: boolean;
  eyebrow: string;
  titleLine1: string;
  titleLine2Accent: string;
  description: string;
  badges: CmsHeroBadge[];
}

export interface CmsFlowStep {
  id: string;
  stepNumber: string;
  title: string;
  description: string;
}

export interface CmsFlow {
  enabled: boolean;
  eyebrow: string;
  titleLine1: string;
  titleLine2Accent: string;
  steps: CmsFlowStep[];
}

export interface CmsAssuranceItem {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface CmsAssurance {
  enabled: boolean;
  eyebrow: string;
  title: string;
  items: CmsAssuranceItem[];
}

export interface CmsFooterLink {
  id: string;
  label: string;
  href: string;
}

export interface CmsFooter {
  copyrightText: string;
  tagline: string;
  links: CmsFooterLink[];
  whatsappContact: string;
}

export interface CmsLandingContent {
  id?: number;
  navbar: CmsNavbar;
  flow: CmsFlow;
  hero: CmsHero;
  assurance: CmsAssurance;
  footer: CmsFooter;
  updatedAt?: string;
}

export const CMS_ICONS_MAP: Record<string, React.ElementType> = {
  ShieldCheck,
  Clock3,
  MessageCircle,
  ReceiptText,
  Wrench,
  Zap,
  CheckCircle2,
  Sparkles,
  Headphones,
  Award,
  MapPin,
  CalendarDays,
  HelpCircle,
  AlertTriangle,
  Flame,
  HardHat,
  Hammer,
  Eye,
  Compass,
  ThumbsUp,
  HeartHandshake,
  PhoneCall,
};

export const AVAILABLE_ICON_NAMES = Object.keys(CMS_ICONS_MAP);

export function renderCmsIcon(name: string, size = 18, className = '') {
  const IconComponent = CMS_ICONS_MAP[name] || ShieldCheck;
  return <IconComponent size={size} className={className} />;
}

export function useLandingCms() {
  return useQuery<CmsLandingContent>({
    queryKey: ['landing-cms'],
    queryFn: async () => {
      const res = await fetch(`${basePath}/api/cms`);
      if (!res.ok) throw new Error('Gagal mengambil data CMS');
      return res.json();
    },
    staleTime: 60 * 1000,
  });
}

export function AdminCms() {
  const queryClient = useQueryClient();
  const { data: serverData, isLoading, isError, refetch } = useLandingCms();

  const [activeTab, setActiveTab] = useState<'navbar' | 'flow' | 'hero' | 'assurance' | 'footer' | 'preview'>('navbar');
  const [formData, setFormData] = useState<CmsLandingContent | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [navLinkModal, setNavLinkModal] = useState<{ mode: 'add' | 'edit'; link?: CmsNavbarLink; index?: number } | null>(null);
  const [flowStepModal, setFlowStepModal] = useState<{ mode: 'add' | 'edit'; step?: CmsFlowStep; index?: number } | null>(null);
  const [heroBadgeModal, setHeroBadgeModal] = useState<{ mode: 'add' | 'edit'; badge?: CmsHeroBadge; index?: number } | null>(null);
  const [assuranceItemModal, setAssuranceItemModal] = useState<{ mode: 'add' | 'edit'; item?: CmsAssuranceItem; index?: number } | null>(null);
  const [footerLinkModal, setFooterLinkModal] = useState<{ mode: 'add' | 'edit'; link?: CmsFooterLink; index?: number } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Sync server data to form state
  useEffect(() => {
    if (serverData && !isDirty) {
      setFormData(JSON.parse(JSON.stringify(serverData)));
    }
  }, [serverData, isDirty]);

  // Mutations
  const updateMutation = useMutation({
    mutationFn: async (payload: Partial<CmsLandingContent>) => {
      const res = await fetch(`${basePath}/api/cms`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Gagal menyimpan perubahan CMS');
      return res.json();
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(['landing-cms'], saved);
      setFormData(JSON.parse(JSON.stringify(saved)));
      setIsDirty(false);
      setFeedback({ type: 'success', message: 'Perubahan CMS berhasil disimpan ke halaman utama!' });
      setTimeout(() => setFeedback(null), 4000);
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err?.message || 'Terjadi kesalahan saat menyimpan CMS' });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${basePath}/api/cms/reset`, { method: 'POST' });
      if (!res.ok) throw new Error('Gagal mereset CMS');
      return res.json();
    },
    onSuccess: (resetData) => {
      queryClient.setQueryData(['landing-cms'], resetData);
      setFormData(JSON.parse(JSON.stringify(resetData)));
      setIsDirty(false);
      setShowResetConfirm(false);
      setFeedback({ type: 'success', message: 'Pengaturan CMS telah dikembalikan ke standar awal!' });
      setTimeout(() => setFeedback(null), 4000);
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err?.message || 'Terjadi kesalahan saat mereset CMS' });
    },
  });

  if (isLoading && !formData) {
    return (
      <div className="space-y-4 p-6">
        <div className="skeleton-row h-10 w-48" />
        <div className="skeleton-row h-64 w-full" />
      </div>
    );
  }

  if (isError && !formData) {
    return (
      <div className="notice notice-error m-6">
        <AlertTriangle size={18} /> Gagal memuat data CMS.{' '}
        <button onClick={() => refetch()} className="font-bold underline ml-2">
          Coba lagi
        </button>
      </div>
    );
  }

  if (!formData) return null;

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const updateSection = <K extends keyof CmsLandingContent>(section: K, val: Partial<CmsLandingContent[K]>) => {
    setFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [section]: {
          ...(prev[section] as any),
          ...val,
        },
      };
    });
    setIsDirty(true);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end rise-in">
        <div>
          <div className="eyebrow flex items-center gap-1.5">
            <Globe size={13} className="text-accent" /> Manajemen Konten Publik
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">CMS Halaman Utama</h1>
          <p className="mt-1.5 max-w-2xl text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Kelola teks, urutan alur kerja, tautan navigasi, poin keunggulan, hingga footer pada halaman publik secara langsung dan instan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`${basePath}/`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline !px-3.5 !py-2 text-xs font-semibold gap-1.5"
            title="Buka halaman utama publik"
          >
            <ExternalLink size={14} /> Lihat Publik
          </a>
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            disabled={resetMutation.isPending || updateMutation.isPending}
            className="btn btn-outline !px-3.5 !py-2 text-xs font-semibold text-muted-foreground hover:text-destructive gap-1.5"
            title="Kembalikan semua teks ke bawaan awal"
          >
            <RotateCcw size={14} /> Reset Awal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={updateMutation.isPending || !isDirty}
            className={`btn btn-primary !px-4 !py-2 text-xs font-bold gap-1.5 shadow-sm ${
              isDirty ? 'animate-pulse' : ''
            }`}
          >
            <Save size={15} /> {updateMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>

      {/* Dirty & Status Alerts */}
      {feedback && (
        <div className={`notice ${feedback.type === 'success' ? 'notice-success' : 'notice-error'} rise-in`}>
          {feedback.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {isDirty && !feedback && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-600 dark:text-amber-400 flex items-center justify-between">
          <span className="flex items-center gap-2 font-medium">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
            Ada perubahan yang belum disimpan ke database. Klik &ldquo;Simpan Perubahan&rdquo; untuk menerapkannya.
          </span>
          <button onClick={handleSave} className="underline font-bold hover:text-amber-700">
            Simpan Sekarang
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-border overflow-x-auto no-scrollbar gap-1 text-xs font-semibold">
        {[
          { id: 'navbar', label: '1. Navbar & Menu', icon: Menu },
          { id: 'flow', label: '2. Alur SEIIKI', icon: Footprints },
          { id: 'hero', label: '3. Hero & Layanan', icon: Sparkles },
          { id: 'assurance', label: '4. Jaminan Kami', icon: ShieldCheck },
          { id: 'footer', label: '5. Footer & Kontak', icon: Layout },
          { id: 'preview', label: 'Pratinjau Langsung', icon: Eye },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-primary text-foreground font-bold bg-muted/40'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/20'
              }`}
            >
              <Icon size={15} className={isActive ? 'text-primary' : ''} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: NAVBAR & MENU */}
      {activeTab === 'navbar' && (
        <div className="space-y-6 rise-in">
          <div className="panel p-5 space-y-5">
            <div className="border-b border-border pb-3">
              <h3 className="text-base font-bold">Pengaturan Brand & Logo Navbar</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Nama brand dan slogan yang tampil di bagian atas situs.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Nama Brand</label>
                <input
                  type="text"
                  value={formData.navbar.brandName || ''}
                  onChange={(e) => updateSection('navbar', { brandName: e.target.value })}
                  placeholder="Contoh: SEIIKI"
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Teks Logo / Teks Mark</label>
                <input
                  type="text"
                  value={formData.navbar.logoText || ''}
                  onChange={(e) => updateSection('navbar', { logoText: e.target.value })}
                  placeholder="SEIIKI"
                  className="w-full"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-bold text-foreground block mb-1">Slogan Brand</label>
                <input
                  type="text"
                  value={formData.navbar.brandTagline || ''}
                  onChange={(e) => updateSection('navbar', { brandTagline: e.target.value })}
                  placeholder="Solusi Energi Kelistrikan Indonesia"
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Nav Links CRUD */}
          <div className="panel p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold">Daftar Menu Navigasi</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Tautan menu yang muncul di navigasi desktop.</p>
              </div>
              <button
                type="button"
                onClick={() => setNavLinkModal({ mode: 'add' })}
                className="btn btn-outline !px-3 !py-1.5 text-xs font-bold gap-1.5"
              >
                <Plus size={14} /> Tambah Menu
              </button>
            </div>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>No</th>
                    <th>Label Menu</th>
                    <th>Target URL / Hash Anchor</th>
                    <th className="text-right" style={{ width: '130px' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.navbar.links.map((link, idx) => (
                    <tr key={link.id || idx}>
                      <td className="text-xs text-muted-foreground">{idx + 1}</td>
                      <td>
                        <strong className="text-xs font-bold">{link.label}</strong>
                      </td>
                      <td className="text-xs font-mono text-muted-foreground">{link.href}</td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => {
                              const newLinks = [...formData.navbar.links];
                              const temp = newLinks[idx];
                              newLinks[idx] = newLinks[idx - 1];
                              newLinks[idx - 1] = temp;
                              updateSection('navbar', { links: newLinks });
                            }}
                            className="icon-button"
                            title="Geser ke atas"
                          >
                            <ChevronUp size={13} />
                          </button>
                          <button
                            type="button"
                            disabled={idx === formData.navbar.links.length - 1}
                            onClick={() => {
                              const newLinks = [...formData.navbar.links];
                              const temp = newLinks[idx];
                              newLinks[idx] = newLinks[idx + 1];
                              newLinks[idx + 1] = temp;
                              updateSection('navbar', { links: newLinks });
                            }}
                            className="icon-button"
                            title="Geser ke bawah"
                          >
                            <ChevronDown size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setNavLinkModal({ mode: 'edit', link, index: idx })}
                            className="icon-button"
                            title="Edit menu"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const newLinks = formData.navbar.links.filter((_, i) => i !== idx);
                              updateSection('navbar', { links: newLinks });
                            }}
                            className="icon-button icon-danger"
                            title="Hapus menu"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {formData.navbar.links.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-xs text-muted-foreground">
                        Belum ada tautan menu di navigasi. Klik &ldquo;Tambah Menu&rdquo; untuk menambahkan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Button */}
          <div className="panel p-5 space-y-4">
            <div className="border-b border-border pb-3">
              <h3 className="text-base font-bold">Tombol Aksi Kanan (Action Button)</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Tombol pintasan cepat di sebelah kanan navbar (misalnya akses dashboard).</p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="showAction"
                checked={formData.navbar.showAction !== false}
                onChange={(e) => updateSection('navbar', { showAction: e.target.checked })}
                className="rounded border-border"
              />
              <label htmlFor="showAction" className="text-xs font-bold text-foreground cursor-pointer">
                Tampilkan Tombol Aksi di Navbar
              </label>
            </div>

            {formData.navbar.showAction !== false && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Teks Tombol</label>
                  <input
                    type="text"
                    value={formData.navbar.actionText || ''}
                    onChange={(e) => updateSection('navbar', { actionText: e.target.value })}
                    placeholder="Contoh: Akses tim"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Target Halaman / URL</label>
                  <input
                    type="text"
                    value={formData.navbar.actionHref || ''}
                    onChange={(e) => updateSection('navbar', { actionHref: e.target.value })}
                    placeholder="Contoh: /admin atau /login"
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ALUR SEIIKI (FLOW) */}
      {activeTab === 'flow' && (
        <div className="space-y-6 rise-in">
          <div className="panel p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold">Status Seksi Alur SEIIKI</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Aktifkan atau sembunyikan seksi alur kerja langkah-langkah di halaman publik.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.flow.enabled !== false}
                  onChange={(e) => updateSection('flow', { enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Teks Eyebrow (Label Kecil)</label>
                <input
                  type="text"
                  value={formData.flow.eyebrow || ''}
                  onChange={(e) => updateSection('flow', { eyebrow: e.target.value })}
                  placeholder="Alur SEIIKI"
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Judul Utama (Baris 1)</label>
                <input
                  type="text"
                  value={formData.flow.titleLine1 || ''}
                  onChange={(e) => updateSection('flow', { titleLine1: e.target.value })}
                  placeholder="Rapi sejak"
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Kata Aksen (Baris 2 Warna Aksen)</label>
                <input
                  type="text"
                  value={formData.flow.titleLine2Accent || ''}
                  onChange={(e) => updateSection('flow', { titleLine2Accent: e.target.value })}
                  placeholder="pesan pertama."
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Steps CRUD */}
          <div className="panel p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold">Daftar Langkah Alur (Step Cards)</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Langkah-langkah berurutan yang ditampilkan dalam kotak alur kerja.</p>
              </div>
              <button
                type="button"
                onClick={() => setFlowStepModal({ mode: 'add' })}
                className="btn btn-outline !px-3 !py-1.5 text-xs font-bold gap-1.5"
              >
                <Plus size={14} /> Tambah Langkah
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {formData.flow.steps.map((step, idx) => (
                <div key={step.id || idx} className="rounded-xl border border-border bg-card p-4 space-y-3 relative group">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-accent bg-accent/10 px-2 py-0.5 rounded">
                      {step.stepNumber}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => {
                          const newSteps = [...formData.flow.steps];
                          const temp = newSteps[idx];
                          newSteps[idx] = newSteps[idx - 1];
                          newSteps[idx - 1] = temp;
                          updateSection('flow', { steps: newSteps });
                        }}
                        className="icon-button !h-7 !w-7"
                        title="Geser ke kiri/atas"
                      >
                        <ChevronUp size={13} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === formData.flow.steps.length - 1}
                        onClick={() => {
                          const newSteps = [...formData.flow.steps];
                          const temp = newSteps[idx];
                          newSteps[idx] = newSteps[idx + 1];
                          newSteps[idx + 1] = temp;
                          updateSection('flow', { steps: newSteps });
                        }}
                        className="icon-button !h-7 !w-7"
                        title="Geser ke kanan/bawah"
                      >
                        <ChevronDown size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setFlowStepModal({ mode: 'edit', step, index: idx })}
                        className="icon-button !h-7 !w-7"
                        title="Edit langkah"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const newSteps = formData.flow.steps.filter((_, i) => i !== idx);
                          updateSection('flow', { steps: newSteps });
                        }}
                        className="icon-button icon-danger !h-7 !w-7"
                        title="Hapus langkah"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-foreground">{step.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
              {formData.flow.steps.length === 0 && (
                <div className="md:col-span-3 text-center py-8 text-xs text-muted-foreground">
                  Belum ada langkah yang dimasukkan. Klik &ldquo;Tambah Langkah&rdquo; untuk memulai.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: HERO & LAYANAN */}
      {activeTab === 'hero' && (
        <div className="space-y-6 rise-in">
          <div className="panel p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold">Status Seksi Hero</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Tampilan utama judul besar di samping formulir pemesanan kunjungan.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.hero.enabled !== false}
                  onChange={(e) => updateSection('hero', { enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Teks Eyebrow</label>
                <input
                  type="text"
                  value={formData.hero.eyebrow || ''}
                  onChange={(e) => updateSection('hero', { eyebrow: e.target.value })}
                  placeholder="Layanan listrik yang datang siap kerja"
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Judul Utama (Baris 1)</label>
                <input
                  type="text"
                  value={formData.hero.titleLine1 || ''}
                  onChange={(e) => updateSection('hero', { titleLine1: e.target.value })}
                  placeholder="Masalah listrik,"
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Kata Aksen (Baris 2 Warna Aksen)</label>
                <input
                  type="text"
                  value={formData.hero.titleLine2Accent || ''}
                  onChange={(e) => updateSection('hero', { titleLine2Accent: e.target.value })}
                  placeholder="kami urus."
                  className="w-full"
                />
              </div>
              <div className="md:col-span-3">
                <label className="text-xs font-bold text-foreground block mb-1">Paragraf Deskripsi</label>
                <textarea
                  rows={3}
                  value={formData.hero.description || ''}
                  onChange={(e) => updateSection('hero', { description: e.target.value })}
                  placeholder="Teknisi terverifikasi datang ke lokasi Anda dengan alur yang jelas..."
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Proof Badges CRUD */}
          <div className="panel p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold">Poin Kepercayaan (Proof Badges)</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Ikon dan teks kecil di bawah deskripsi hero (misal: Teknisi terverifikasi, Respon hari yang sama).</p>
              </div>
              <button
                type="button"
                onClick={() => setHeroBadgeModal({ mode: 'add' })}
                className="btn btn-outline !px-3 !py-1.5 text-xs font-bold gap-1.5"
              >
                <Plus size={14} /> Tambah Badge
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {formData.hero.badges.map((badge, idx) => (
                <div key={badge.id || idx} className="flex items-center justify-between gap-2 p-3 rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <span className="text-primary flex-shrink-0">{renderCmsIcon(badge.icon, 17)}</span>
                    <span className="text-xs font-semibold truncate">{badge.text}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setHeroBadgeModal({ mode: 'edit', badge, index: idx })}
                      className="icon-button !h-7 !w-7"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const newBadges = formData.hero.badges.filter((_, i) => i !== idx);
                        updateSection('hero', { badges: newBadges });
                      }}
                      className="icon-button icon-danger !h-7 !w-7"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
              {formData.hero.badges.length === 0 && (
                <div className="col-span-full text-center py-6 text-xs text-muted-foreground">
                  Belum ada badge kepercayaan. Klik &ldquo;Tambah Badge&rdquo; untuk menambahkan.
                </div>
              )}
            </div>

            {/* Quick Link to Form Config */}
            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span>Ingin mengubah biaya kunjungan, placeholder formulir, atau opsi layanan?</span>
              <a
                href={`${basePath}/admin/booking-component`}
                className="btn btn-outline !px-3 !py-1 text-xs font-bold gap-1 text-foreground"
              >
                <Sliders size={13} /> Pengaturan Form Pengajuan (01)
              </a>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: JAMINAN (ASSURANCE) */}
      {activeTab === 'assurance' && (
        <div className="space-y-6 rise-in">
          <div className="panel p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold">Status Seksi Jaminan</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Seksi &ldquo;Yang bisa Anda pegang&rdquo; di bagian bawah halaman.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.assurance.enabled !== false}
                  onChange={(e) => updateSection('assurance', { enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Teks Eyebrow</label>
                <input
                  type="text"
                  value={formData.assurance.eyebrow || ''}
                  onChange={(e) => updateSection('assurance', { eyebrow: e.target.value })}
                  placeholder="Yang bisa Anda pegang"
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Judul Utama Seksi</label>
                <input
                  type="text"
                  value={formData.assurance.title || ''}
                  onChange={(e) => updateSection('assurance', { title: e.target.value })}
                  placeholder="Tenang, ada tim di balik setiap kunjungan."
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Assurance Items CRUD */}
          <div className="panel p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold">Daftar Poin Jaminan</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Poin kepastian layanan dengan ikon, judul, dan penjelasan ringkas.</p>
              </div>
              <button
                type="button"
                onClick={() => setAssuranceItemModal({ mode: 'add' })}
                className="btn btn-outline !px-3 !py-1.5 text-xs font-bold gap-1.5"
              >
                <Plus size={14} /> Tambah Poin Jaminan
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {formData.assurance.items.map((item, idx) => (
                <div key={item.id || idx} className="rounded-xl border border-border bg-card p-4 space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      {renderCmsIcon(item.icon, 20)}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setAssuranceItemModal({ mode: 'edit', item, index: idx })}
                        className="icon-button !h-7 !w-7"
                        title="Edit poin"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const newItems = formData.assurance.items.filter((_, i) => i !== idx);
                          updateSection('assurance', { items: newItems });
                        }}
                        className="icon-button icon-danger !h-7 !w-7"
                        title="Hapus poin"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-foreground">{item.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
              {formData.assurance.items.length === 0 && (
                <div className="md:col-span-3 text-center py-8 text-xs text-muted-foreground">
                  Belum ada poin jaminan. Klik &ldquo;Tambah Poin Jaminan&rdquo; untuk menambahkan.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: FOOTER & KONTAK */}
      {activeTab === 'footer' && (
        <div className="space-y-6 rise-in">
          <div className="panel p-5 space-y-4">
            <div className="border-b border-border pb-3">
              <h3 className="text-base font-bold">Informasi Footer & Kontak</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Teks hak cipta, slogan bawah, dan nomor WhatsApp resmi.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Teks Hak Cipta (Copyright)</label>
                <input
                  type="text"
                  value={formData.footer.copyrightText || ''}
                  onChange={(e) => updateSection('footer', { copyrightText: e.target.value })}
                  placeholder="© 2024 SEIIKI · PT Solusi Energi Kelistrikan Indonesia"
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Tagline Monospace Bawah</label>
                <input
                  type="text"
                  value={formData.footer.tagline || ''}
                  onChange={(e) => updateSection('footer', { tagline: e.target.value })}
                  placeholder="clear work · safe homes"
                  className="w-full"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-bold text-foreground block mb-1">Nomor Kontak WhatsApp Resmi</label>
                <input
                  type="text"
                  value={formData.footer.whatsappContact || ''}
                  onChange={(e) => updateSection('footer', { whatsappContact: e.target.value })}
                  placeholder="Contoh: 6281112345678"
                  className="w-full"
                />
                <p className="text-[11px] text-muted-foreground mt-1">Gunakan format internasional tanpa spasi atau tanda tambah (misal: 6281112345678).</p>
              </div>
            </div>
          </div>

          {/* Footer Links CRUD */}
          <div className="panel p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold">Tautan Tambahan Footer</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Tautan pelengkap di footer (seperti WhatsApp bantuan atau info legal).</p>
              </div>
              <button
                type="button"
                onClick={() => setFooterLinkModal({ mode: 'add' })}
                className="btn btn-outline !px-3 !py-1.5 text-xs font-bold gap-1.5"
              >
                <Plus size={14} /> Tambah Link Footer
              </button>
            </div>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>No</th>
                    <th>Label Tautan</th>
                    <th>URL Tujuan</th>
                    <th className="text-right" style={{ width: '90px' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.footer.links.map((link, idx) => (
                    <tr key={link.id || idx}>
                      <td className="text-xs text-muted-foreground">{idx + 1}</td>
                      <td>
                        <strong className="text-xs font-bold">{link.label}</strong>
                      </td>
                      <td className="text-xs font-mono text-muted-foreground">{link.href}</td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setFooterLinkModal({ mode: 'edit', link, index: idx })}
                            className="icon-button"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const newLinks = formData.footer.links.filter((_, i) => i !== idx);
                              updateSection('footer', { links: newLinks });
                            }}
                            className="icon-button icon-danger"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {formData.footer.links.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-xs text-muted-foreground">
                        Belum ada tautan footer tambahan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: PRATINJAU LANGSUNG */}
      {activeTab === 'preview' && (
        <div className="space-y-6 rise-in">
          <div className="panel p-6 space-y-6 bg-muted/10">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold">Simulasi Pratinjau Halaman Publik</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Tampilan langsung komponen berdasarkan pengaturan di CMS saat ini.</p>
              </div>
              <a
                href={`${basePath}/`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline !px-3 !py-1 text-xs font-bold gap-1"
              >
                <ExternalLink size={13} /> Buka Halaman Sebenarnya
              </a>
            </div>

            {/* Simulated Public Container */}
            <div className="rounded-2xl border border-border bg-background p-6 shadow-sm space-y-12">
              {/* Simulated Navbar */}
              <div className="flex items-center justify-between pb-4 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-extrabold tracking-tight">{formData.navbar.brandName}</span>
                </div>
                <div className="flex items-center gap-5 text-xs font-bold text-muted-foreground">
                  {formData.navbar.links.map((link) => (
                    <span key={link.id} className="hover:text-foreground cursor-pointer">
                      {link.label}
                    </span>
                  ))}
                </div>
                {formData.navbar.showAction !== false && (
                  <span className="btn btn-outline !px-3 !py-1 text-xs font-semibold pointer-events-none">
                    {formData.navbar.actionText}
                  </span>
                )}
              </div>

              {/* Simulated Flow */}
              {formData.flow.enabled !== false && (
                <div className="space-y-4 pt-2">
                  <div className="eyebrow flex items-center gap-1.5">
                    <span className="status-dot bg-accent" /> {formData.flow.eyebrow}
                  </div>
                  <h2 className="text-2xl font-extrabold tracking-tight">
                    {formData.flow.titleLine1} <br />
                    <em className="text-accent not-italic">{formData.flow.titleLine2Accent}</em>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {formData.flow.steps.map((s) => (
                      <div key={s.id} className="rounded-xl border border-border/80 bg-card p-4 space-y-1">
                        <span className="font-mono text-xs font-bold text-muted-foreground">{s.stepNumber}</span>
                        <h4 className="text-xs font-bold text-foreground">{s.title}</h4>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{s.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Simulated Hero */}
              {formData.hero.enabled !== false && (
                <div className="space-y-4 pt-4 border-t border-border/60">
                  <div className="eyebrow flex items-center gap-1.5">
                    <span className="status-dot bg-accent" /> {formData.hero.eyebrow}
                  </div>
                  <h1 className="text-3xl font-extrabold tracking-tight">
                    {formData.hero.titleLine1} <br />
                    <em className="text-accent not-italic">{formData.hero.titleLine2Accent}</em>
                  </h1>
                  <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
                    {formData.hero.description}
                  </p>
                  <div className="flex flex-wrap gap-4 pt-1">
                    {formData.hero.badges.map((b) => (
                      <span key={b.id} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                        {renderCmsIcon(b.icon, 15, 'text-accent')} {b.text}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Simulated Assurance */}
              {formData.assurance.enabled !== false && (
                <div className="space-y-4 pt-4 border-t border-border/60">
                  <div className="eyebrow">{formData.assurance.eyebrow}</div>
                  <h3 className="text-xl font-bold tracking-tight">{formData.assurance.title}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {formData.assurance.items.map((item) => (
                      <div key={item.id} className="flex gap-3 p-3 rounded-lg border border-border/60 bg-card">
                        <div className="text-primary flex-shrink-0">{renderCmsIcon(item.icon, 18)}</div>
                        <div>
                          <strong className="text-xs block">{item.title}</strong>
                          <span className="text-[11px] text-muted-foreground">{item.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Simulated Footer */}
              <div className="pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
                <span className="font-mono font-bold text-foreground">{formData.navbar.brandName}</span>
                <span>{formData.footer.copyrightText}</span>
                <span className="font-mono text-[10px] uppercase tracking-widest">{formData.footer.tagline}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NAV LINK */}
      {navLinkModal && (
        <div className="modal-backdrop">
          <form
            className="modal"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const label = (form.elements.namedItem('label') as HTMLInputElement).value.trim();
              const href = (form.elements.namedItem('href') as HTMLInputElement).value.trim();
              if (!label || !href) return;

              const newLinks = [...formData.navbar.links];
              if (navLinkModal.mode === 'edit' && navLinkModal.index !== undefined) {
                newLinks[navLinkModal.index] = { ...newLinks[navLinkModal.index], label, href };
              } else {
                newLinks.push({ id: `link-${Date.now()}`, label, href });
              }
              updateSection('navbar', { links: newLinks });
              setNavLinkModal(null);
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="eyebrow">{navLinkModal.mode === 'edit' ? 'Edit Tautan' : 'Tautan Baru'}</div>
                <h3 className="text-base font-bold">Menu Navigasi</h3>
              </div>
              <button type="button" className="icon-button" onClick={() => setNavLinkModal(null)}>
                <X size={17} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-bold block mb-1">Label Menu</label>
                <input
                  name="label"
                  required
                  defaultValue={navLinkModal.link?.label || ''}
                  placeholder="Contoh: Cara kerja"
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">Target URL / Hash</label>
                <input
                  name="href"
                  required
                  defaultValue={navLinkModal.link?.href || ''}
                  placeholder="Contoh: #alur atau #aman atau /kontak"
                  className="w-full font-mono text-xs"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="btn btn-outline text-xs" onClick={() => setNavLinkModal(null)}>
                Batal
              </button>
              <button type="submit" className="btn btn-primary text-xs font-bold">
                <Check size={14} /> Simpan Tautan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: FLOW STEP */}
      {flowStepModal && (
        <div className="modal-backdrop">
          <form
            className="modal"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const stepNumber = (form.elements.namedItem('stepNumber') as HTMLInputElement).value.trim();
              const title = (form.elements.namedItem('title') as HTMLInputElement).value.trim();
              const description = (form.elements.namedItem('description') as HTMLTextAreaElement).value.trim();
              if (!stepNumber || !title) return;

              const newSteps = [...formData.flow.steps];
              if (flowStepModal.mode === 'edit' && flowStepModal.index !== undefined) {
                newSteps[flowStepModal.index] = { ...newSteps[flowStepModal.index], stepNumber, title, description };
              } else {
                newSteps.push({ id: `step-${Date.now()}`, stepNumber, title, description });
              }
              updateSection('flow', { steps: newSteps });
              setFlowStepModal(null);
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="eyebrow">{flowStepModal.mode === 'edit' ? 'Edit Langkah' : 'Langkah Baru'}</div>
                <h3 className="text-base font-bold">Langkah Alur SEIIKI</h3>
              </div>
              <button type="button" className="icon-button" onClick={() => setFlowStepModal(null)}>
                <X size={17} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-bold block mb-1">Nomor Langkah (2 Digit)</label>
                <input
                  name="stepNumber"
                  required
                  defaultValue={flowStepModal.step?.stepNumber || `0${formData.flow.steps.length + 1}`}
                  placeholder="01"
                  className="w-full font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">Judul Langkah</label>
                <input
                  name="title"
                  required
                  defaultValue={flowStepModal.step?.title || ''}
                  placeholder="Contoh: Ajukan atau Bayar kunjungan"
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">Deskripsi Ringkas</label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={flowStepModal.step?.description || ''}
                  placeholder="Ceritakan kebutuhan listrik dan lokasi Anda."
                  className="w-full"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="btn btn-outline text-xs" onClick={() => setFlowStepModal(null)}>
                Batal
              </button>
              <button type="submit" className="btn btn-primary text-xs font-bold">
                <Check size={14} /> Simpan Langkah
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: HERO BADGE */}
      {heroBadgeModal && (
        <div className="modal-backdrop">
          <form
            className="modal"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const icon = (form.elements.namedItem('icon') as HTMLSelectElement).value;
              const text = (form.elements.namedItem('text') as HTMLInputElement).value.trim();
              if (!text) return;

              const newBadges = [...formData.hero.badges];
              if (heroBadgeModal.mode === 'edit' && heroBadgeModal.index !== undefined) {
                newBadges[heroBadgeModal.index] = { ...newBadges[heroBadgeModal.index], icon, text };
              } else {
                newBadges.push({ id: `badge-${Date.now()}`, icon, text });
              }
              updateSection('hero', { badges: newBadges });
              setHeroBadgeModal(null);
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="eyebrow">{heroBadgeModal.mode === 'edit' ? 'Edit Poin' : 'Poin Baru'}</div>
                <h3 className="text-base font-bold">Badge Kepercayaan Hero</h3>
              </div>
              <button type="button" className="icon-button" onClick={() => setHeroBadgeModal(null)}>
                <X size={17} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-bold block mb-1">Pilihan Ikon</label>
                <select name="icon" defaultValue={heroBadgeModal.badge?.icon || 'ShieldCheck'} className="w-full">
                  {AVAILABLE_ICON_NAMES.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">Teks Badge</label>
                <input
                  name="text"
                  required
                  defaultValue={heroBadgeModal.badge?.text || ''}
                  placeholder="Contoh: Teknisi terverifikasi"
                  className="w-full"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="btn btn-outline text-xs" onClick={() => setHeroBadgeModal(null)}>
                Batal
              </button>
              <button type="submit" className="btn btn-primary text-xs font-bold">
                <Check size={14} /> Simpan Badge
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: ASSURANCE ITEM */}
      {assuranceItemModal && (
        <div className="modal-backdrop">
          <form
            className="modal"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const icon = (form.elements.namedItem('icon') as HTMLSelectElement).value;
              const title = (form.elements.namedItem('title') as HTMLInputElement).value.trim();
              const description = (form.elements.namedItem('description') as HTMLTextAreaElement).value.trim();
              if (!title) return;

              const newItems = [...formData.assurance.items];
              if (assuranceItemModal.mode === 'edit' && assuranceItemModal.index !== undefined) {
                newItems[assuranceItemModal.index] = { ...newItems[assuranceItemModal.index], icon, title, description };
              } else {
                newItems.push({ id: `item-${Date.now()}`, icon, title, description });
              }
              updateSection('assurance', { items: newItems });
              setAssuranceItemModal(null);
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="eyebrow">{assuranceItemModal.mode === 'edit' ? 'Edit Poin' : 'Poin Baru'}</div>
                <h3 className="text-base font-bold">Poin Jaminan Layanan</h3>
              </div>
              <button type="button" className="icon-button" onClick={() => setAssuranceItemModal(null)}>
                <X size={17} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-bold block mb-1">Pilihan Ikon</label>
                <select name="icon" defaultValue={assuranceItemModal.item?.icon || 'ShieldCheck'} className="w-full">
                  {AVAILABLE_ICON_NAMES.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">Judul Jaminan</label>
                <input
                  name="title"
                  required
                  defaultValue={assuranceItemModal.item?.title || ''}
                  placeholder="Contoh: Biaya transparan"
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">Penjelasan Singkat</label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={assuranceItemModal.item?.description || ''}
                  placeholder="Biaya kunjungan dipisahkan dari estimasi perbaikan..."
                  className="w-full"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="btn btn-outline text-xs" onClick={() => setAssuranceItemModal(null)}>
                Batal
              </button>
              <button type="submit" className="btn btn-primary text-xs font-bold">
                <Check size={14} /> Simpan Jaminan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: FOOTER LINK */}
      {footerLinkModal && (
        <div className="modal-backdrop">
          <form
            className="modal"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const label = (form.elements.namedItem('label') as HTMLInputElement).value.trim();
              const href = (form.elements.namedItem('href') as HTMLInputElement).value.trim();
              if (!label || !href) return;

              const newLinks = [...formData.footer.links];
              if (footerLinkModal.mode === 'edit' && footerLinkModal.index !== undefined) {
                newLinks[footerLinkModal.index] = { ...newLinks[footerLinkModal.index], label, href };
              } else {
                newLinks.push({ id: `flink-${Date.now()}`, label, href });
              }
              updateSection('footer', { links: newLinks });
              setFooterLinkModal(null);
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="eyebrow">{footerLinkModal.mode === 'edit' ? 'Edit Link' : 'Link Baru'}</div>
                <h3 className="text-base font-bold">Tautan Footer</h3>
              </div>
              <button type="button" className="icon-button" onClick={() => setFooterLinkModal(null)}>
                <X size={17} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-bold block mb-1">Label Tautan</label>
                <input
                  name="label"
                  required
                  defaultValue={footerLinkModal.link?.label || ''}
                  placeholder="Contoh: Hubungi Admin WhatsApp"
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">URL / Tautan Tujuan</label>
                <input
                  name="href"
                  required
                  defaultValue={footerLinkModal.link?.href || ''}
                  placeholder="Contoh: https://wa.me/6281112345678 atau /login"
                  className="w-full font-mono text-xs"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="btn btn-outline text-xs" onClick={() => setFooterLinkModal(null)}>
                Batal
              </button>
              <button type="submit" className="btn btn-primary text-xs font-bold">
                <Check size={14} /> Simpan Tautan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: RESET CONFIRMATION */}
      {showResetConfirm && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="flex items-start justify-between">
              <div>
                <div className="eyebrow text-destructive">Konfirmasi Reset</div>
                <h3 className="text-base font-bold">Kembalikan ke Teks Standar Awal?</h3>
              </div>
              <button type="button" className="icon-button" onClick={() => setShowResetConfirm(false)}>
                <X size={17} />
              </button>
            </div>

            <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
              Tindakan ini akan mengembalikan semua teks, navbar, langkah alur, hero, jaminan, dan footer ke konfigurasi bawaan SEIIKI.
              Perubahan kustom yang belum disimpan maupun yang telah tersimpan akan ditimpa.
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="btn btn-outline text-xs" onClick={() => setShowResetConfirm(false)}>
                Batal
              </button>
              <button
                type="button"
                onClick={() => resetMutation.mutate()}
                disabled={resetMutation.isPending}
                className="btn btn-primary !bg-destructive text-destructive-foreground text-xs font-bold"
              >
                {resetMutation.isPending ? 'Mereset...' : 'Ya, Kembalikan ke Standar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
