import { useState, useEffect, useMemo } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { Link, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import * as XLSX from 'xlsx';
import {
  Activity, AlertTriangle, ArrowRight, BadgeCheck, Banknote, BarChart3, Bell, Boxes, BriefcaseBusiness,
  CalendarDays, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck, Clock3, Download, ExternalLink, Eye, FileEdit, FileText,
  Globe, Headphones, HelpCircle, History, Info, Layers, LayoutDashboard, LocateFixed, LogIn, LogOut, MapPin, Maximize2, Menu,
  MessageCircle, PackageCheck, Paperclip, Pause, Pencil, Play, Plus, Radio, ReceiptText, RefreshCw, RotateCcw,
  Save, Search, Send, Settings, Settings2, ShieldCheck, Sliders, SlidersHorizontal, Smartphone, Sparkles,
  Tag, ToggleLeft, ToggleRight, Trash2, UserRound, UsersRound, Wrench, X, Zap
} from 'lucide-react';
import {
  getGetDashboardSummaryQueryKey, getListEquipmentRequestsQueryKey, getListServiceRequestsQueryKey,
  getListTransactionsQueryKey, getListUsersQueryKey, getListWorkersQueryKey,
  useCreateEquipmentRequest, useCreateFieldReport, useCreateServiceRequest, useCreateUser,
  useCreateVisitPayment, useDeleteServiceRequest, useDeleteUser, useGetDashboardSummary,
  useHealthCheck, useListEquipmentRequests, useListServiceRequests, useListTransactions,
  useListUsers, useListWorkers, useUpdateEquipmentRequest, useUpdateServiceRequest, useUpdateUser,
  type DashboardSummary, type EquipmentRequest, type FieldReport, type ServiceRequest, type Transaction,
  type User, type Worker
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { HierarchicalLocationSelector, type HierarchicalLocationValue } from '@/components/location-selector';
import { AdminLocations } from '@/components/admin-locations';
import { AdminCms, useLandingCms, renderCmsIcon } from '@/components/admin-cms';
import { AdminSettings } from '@/components/admin-settings';
import { PaywuzPayment } from '@/components/paywuz-payment';
import { ReportMediaGrid, WorkerMediaUploader } from '@/components/report-media-viewer';
import { NidiSloPricingModal, DEFAULT_OFFICIAL_NIDI_SLO_TARIFFS } from '@/components/nidi-slo-pricing-modal';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
type UserRole = 'admin' | 'worker';
type AuthSession = { id?: number; role: UserRole; email: string; name: string; phone?: string; specialty?: string };
const AUTH_SESSION_KEY = 'seiiki-auth-session';

function getAuthSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = JSON.parse(window.localStorage.getItem(AUTH_SESSION_KEY) || 'null') as AuthSession | null;
    return value && (value.role === 'admin' || value.role === 'worker') ? value : null;
  } catch {
    return null;
  }
}
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

export interface BookingService {
  id: number;
  name: string;
  category: string;
  description: string | null;
  estimatedPrice: number | null;
  estimatedDuration: string | null;
  icon: string | null;
  isActive: number;
  sortOrder: number;
  createdAt?: string;
}

const DEFAULT_BOOKING_CONFIG: BookingConfig = {
  stepNumber: '01',
  title: 'Ajukan kunjungan',
  subtitle: 'Isi detail singkat, kami lanjutkan lewat WhatsApp.',
  visitFee: 25000,
  visitFeeNote: 'dibayar di muka',
  buttonText: 'Lanjut ke pembayaran',
  adminWhatsapp: '6281112345678',
  namePlaceholder: 'Contoh: Sinta Rahma',
  phonePlaceholder: '08xx xxxx xxxx',
  phoneHint: 'Gunakan nomor yang aktif menerima pesan',
  addressPlaceholder: 'Alamat lengkap, patokan, dan lantai bila ada',
  gpsButtonText: 'Ambil lokasi GPS',
  gpsHint: 'Bagikan lokasi agar teknisi menemukan alamat dengan tepat',
  notesPlaceholder: 'Keluhan, waktu yang diinginkan...',
  notesHint: 'Opsional',
  enableGps: 1,
  enableNotes: 1,
};

const DEFAULT_BOOKING_SERVICES: BookingService[] = [
  {
    id: 1,
    name: 'Perbaikan listrik rumah',
    category: 'Perbaikan',
    description: 'Penanganan korsleting, MCB trip / sering jeglek, kabel panas, dan stop kontak mati.',
    estimatedPrice: null,
    estimatedDuration: '1 - 2 Jam',
    icon: 'Wrench',
    isActive: 1,
    sortOrder: 1,
  },
  {
    id: 2,
    name: 'Instalasi titik listrik',
    category: 'Pemasangan',
    description: 'Penambahan stop kontak baru, saklar lampu, kabel rapi, dan jalur peralatan elektronik.',
    estimatedPrice: null,
    estimatedDuration: '1 - 3 Jam',
    icon: 'Plus',
    isActive: 1,
    sortOrder: 2,
  },
  {
    id: 3,
    name: 'Pemeriksaan instalasi',
    category: 'Pemeriksaan',
    description: 'Audit menyeluruh kelaikan instalasi listrik, kebocoran arus grounding, dan beban trafo/MCB.',
    estimatedPrice: null,
    estimatedDuration: '2 - 3 Jam',
    icon: 'ShieldCheck',
    isActive: 1,
    sortOrder: 3,
  },
  {
    id: 4,
    name: 'Perbaikan panel / MCB',
    category: 'Panel & Daya',
    description: 'Penggantian MCB rusak, upgrade pembagian grup sirkuit panel, dan instalasi ELCB/RCCB anti-setrum.',
    estimatedPrice: null,
    estimatedDuration: '1 - 2 Jam',
    icon: 'Activity',
    isActive: 1,
    sortOrder: 4,
  },
];

function useGetBookingConfig() {
  return useQuery<BookingConfig>({
    queryKey: ['booking-config'],
    queryFn: async () => {
      const res = await fetch(`${basePath}/api/booking-config`);
      if (!res.ok) throw new Error('Gagal memuat konfigurasi form booking');
      return res.json();
    },
  });
}

function useUpdateBookingConfig() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<BookingConfig>) => {
      const res = await fetch(`${basePath}/api/booking-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Gagal memperbarui konfigurasi');
      return res.json();
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['booking-config'] });
    },
  });
}

function useListBookingServices() {
  return useQuery<BookingService[]>({
    queryKey: ['booking-services'],
    queryFn: async () => {
      const res = await fetch(`${basePath}/api/booking-services`);
      if (!res.ok) throw new Error('Gagal memuat daftar layanan');
      return res.json();
    },
  });
}

function useCreateBookingService() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<BookingService>) => {
      const res = await fetch(`${basePath}/api/booking-services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Gagal menambahkan layanan');
      return res.json();
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['booking-services'] });
    },
  });
}

function useUpdateBookingService() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<BookingService> }) => {
      const res = await fetch(`${basePath}/api/booking-services/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Gagal memperbarui layanan');
      return res.json();
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['booking-services'] });
    },
  });
}

function useDeleteBookingService() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${basePath}/api/booking-services/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Gagal menghapus layanan');
      return true;
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['booking-services'] });
    },
  });
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

function useListNidiSloTariffs(activeOnly?: boolean) {
  return useQuery<NidiSloTariff[]>({
    queryKey: ['nidi-slo-tariffs', activeOnly],
    queryFn: async () => {
      const url = `${basePath}/api/seiiki/nidi-slo-tariffs${activeOnly ? '?activeOnly=true' : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Gagal memuat tarif NIDI & SLO');
      return res.json();
    },
  });
}

function useCreateNidiSloTariff() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<NidiSloTariff>) => {
      const res = await fetch(`${basePath}/api/seiiki/nidi-slo-tariffs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Gagal menambahkan tarif');
      return res.json();
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['nidi-slo-tariffs'] });
    },
  });
}

function useUpdateNidiSloTariff() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<NidiSloTariff> }) => {
      const res = await fetch(`${basePath}/api/seiiki/nidi-slo-tariffs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Gagal memperbarui tarif');
      return res.json();
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['nidi-slo-tariffs'] });
    },
  });
}

function useDeleteNidiSloTariff() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${basePath}/api/seiiki/nidi-slo-tariffs/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Gagal menghapus tarif');
      return true;
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['nidi-slo-tariffs'] });
    },
  });
}

function useResetNidiSloTariffs() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${basePath}/api/nidi-slo-tariffs/reset-defaults`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Gagal mereset tarif NIDI & SLO');
      return res.json();
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['nidi-slo-tariffs'] });
    },
  });
}

function useDeleteTransaction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${basePath}/api/transactions/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Gagal menghapus transaksi');
      }
      return res.json();
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
      client.invalidateQueries({ queryKey: ['transactions'] });
      client.invalidateQueries({ queryKey: getListServiceRequestsQueryKey() });
      client.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    },
  });
}

export interface FieldReportItem {
  id: number;
  requestId: number;
  notes: string;
  media: string[];
  createdAt: string;
  requestCode?: string | null;
  customerName?: string | null;
  whatsapp?: string | null;
  serviceType?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  assignedWorkerId?: number | null;
  assignedWorkerName?: string | null;
  requestStatus?: string | null;
  repairCost?: number | null;
}

function useListFieldReports() {
  return useQuery<FieldReportItem[]>({
    queryKey: ['field-reports'],
    queryFn: async () => {
      const res = await fetch(`${basePath}/api/field-reports`);
      if (!res.ok) throw new Error('Gagal memuat laporan penugasan');
      return res.json();
    },
  });
}

const SERVICE_ICON_MAP: Record<string, React.ElementType> = {
  Wrench,
  Zap,
  Activity,
  ShieldCheck,
  Plus,
  Sparkles,
  AlertTriangle,
  Boxes,
  FileText,
  Settings2,
};

function getServiceIcon(iconName?: string | null): React.ElementType {
  if (!iconName) return Wrench;
  return SERVICE_ICON_MAP[iconName] || Wrench;
}

const rupiah = (n = 0) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
const date = (value: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
const time = (value: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));

function formatWhatsAppUrl(whatsapp?: string | null, customerName?: string, code?: string, serviceType?: string): string {
  if (!whatsapp) return '#';
  let clean = whatsapp.replace(/\D/g, '');
  if (clean.startsWith('0')) {
    clean = '62' + clean.slice(1);
  } else if (!clean.startsWith('62') && clean.length > 0) {
    clean = '62' + clean;
  }
  const greeting = customerName
    ? `Halo ${customerName}, kami dari tim SEIIKI terkait permintaan layanan listrik ${serviceType ? `(${serviceType})` : ''} dengan kode ${code || ''}.`
    : 'Halo, kami dari tim SEIIKI.';
  return `https://wa.me/${clean}?text=${encodeURIComponent(greeting.trim())}`;
}

const statusLabel: Record<string, string> = { waiting_payment: 'Menunggu pembayaran', paid: 'Siap ditugaskan', assigned: 'Ditugaskan', on_site: 'Di lokasi', waiting_approval: 'Menunggu persetujuan', in_progress: 'Dikerjakan', completed: 'Selesai', cancelled: 'Dibatalkan', unpaid: 'Belum dibayar', pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak', active: 'Aktif', inactive: 'Nonaktif' };
const statusTone = (status: string) => status === 'completed' || status === 'approved' || status === 'paid' || status === 'active' ? 'good' : status === 'cancelled' || status === 'rejected' || status === 'inactive' ? 'bad' : status === 'assigned' || status === 'on_site' || status === 'in_progress' || status === 'urgent' ? 'warm' : 'neutral';

function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide badge-${tone}`} data-testid="status-badge">{children}</span>;
}
function Logo({ inverse = false }: { inverse?: boolean }) {
  return <Link href="/" className={`brand-logo-link ${inverse ? 'text-sidebar-foreground' : 'text-foreground'}`} data-testid="link-logo">
    <span className={`brand-logo-frame ${inverse ? 'brand-logo-frame-inverse' : ''}`}><img className="brand-logo" src={`${basePath}/brand-logo.png`} alt="SEIIKI — Solusi Energi Kelistrikan Indonesia" /></span>
  </Link>;
}
function LoginPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login gagal. Periksa kembali email dan kata sandi Anda.');
        setLoading(false);
        return;
      }

      window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(data.user));
      setLocation(data.user.role === 'admin' ? '/admin' : '/worker');
    } catch (err) {
      setError('Gagal menghubungi server. Silakan periksa koneksi Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page app-noise min-h-[100dvh]">
      <header className="auth-header">
        <Logo />
        <Link href="/" className="btn btn-outline !px-3 !py-2 text-xs" data-testid="link-back-home">
          Kembali ke beranda
        </Link>
      </header>
      <main className="auth-content">
        <section className="auth-intro rise-in">
          <div className="eyebrow">
            <span className="status-dot bg-accent" /> Akses Ruang Kerja SEIIKI
          </div>
          <h1>
            Masuk ke<br />
            <em>ruang kerja tim.</em>
          </h1>
          <p>Portal internal pengelolaan permintaan servis listrik, penugasan teknisi, dan transaksi operasional.</p>
          <div className="auth-note">
            <ShieldCheck size={17} />
            <span>
              <strong>Autentikasi Terverifikasi</strong>
              <small>Akses terproteksi menggunakan kredensial terdaftar.</small>
            </span>
          </div>
        </section>
        <section className="auth-card panel rise-in delay-1">
          <div className="panel-head">
            <div>
              <div className="eyebrow">Autentikasi</div>
              <h3>Selamat datang</h3>
              <p className="text-xs text-muted-foreground">Masukkan email dan kata sandi untuk masuk ke dashboard.</p>
            </div>
            <LogIn size={19} className="text-accent" />
          </div>
          <form onSubmit={signIn} className="space-y-4">
            <Field label="Email">
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError('');
                }}
                placeholder="nama@domain.com"
                data-testid="input-login-email"
              />
            </Field>
            <Field label="Kata sandi">
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError('');
                }}
                placeholder="Masukkan kata sandi"
                data-testid="input-login-password"
              />
            </Field>
            {error && (
              <div className="notice notice-error" role="alert">
                <X size={15} /> {error}
              </div>
            )}
            <Button type="submit" className="w-full justify-center" disabled={loading} data-testid="button-login">
              {loading ? (
                <>
                  <RefreshCw size={15} className="animate-spin" /> Memproses...
                </>
              ) : (
                <>
                  Masuk ke dashboard <ArrowRight size={16} />
                </>
              )}
            </Button>
          </form>
        </section>
      </main>
    </div>
  );
}

function AuthGate({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const session = getAuthSession();
  useEffect(() => {
    if (!session || session.role !== role) setLocation('/login');
  }, [role, session?.role, setLocation]);
  if (!session || session.role !== role) return <div className="min-h-[100dvh] bg-background" />;
  return <>{children}</>;
}
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <label className="block space-y-1.5"><span className="text-xs font-bold text-foreground/75">{label}</span>{children}{hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}</label>;
}
function Button({ children, kind = 'primary', className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: 'primary' | 'soft' | 'outline' | 'danger' }) {
  return <button className={`btn btn-${kind} ${className}`} {...props}>{children}</button>;
}
function Status({ value }: { value: string }) { return <Badge tone={statusTone(value)}><span className="status-dot bg-current" />{statusLabel[value] || value}</Badge>; }
function Empty({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return <div className="empty-state"><span className="empty-icon"><ClipboardCheck size={22} /></span><strong>{title}</strong><p>{body}</p>{action}</div>;
}
function LoadingRows() { return <div className="space-y-2">{[1, 2, 3].map((i) => <div className="skeleton-row" key={i} />)}</div>; }
function ErrorNotice({ retry }: { retry: () => void }) { return <div className="notice notice-error"><RefreshCw size={16} /> Data belum dapat dimuat. <button onClick={retry} className="underline font-bold" data-testid="button-retry">Coba lagi</button></div>; }

function ConfirmModal({
  title,
  message,
  confirmText = 'Hapus',
  kind = 'danger',
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmText?: string;
  kind?: 'danger' | 'primary';
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500 shrink-0" />
            <h3 className="text-base font-bold text-foreground">{title}</h3>
          </div>
          <button type="button" className="icon-button" onClick={onClose} data-testid="button-close-confirm">
            <X size={16} />
          </button>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" kind="outline" onClick={onClose} data-testid="button-cancel-confirm">
            Batal
          </Button>
          <Button
            type="button"
            kind={kind === 'danger' ? 'danger' : 'primary'}
            onClick={() => {
              onConfirm();
              onClose();
            }}
            data-testid="button-confirm-action"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}

const adminNav = [
  { href: '/admin', label: 'Ringkasan operasi', icon: LayoutDashboard },
  { href: '/admin/requests', label: 'Permintaan kunjungan', icon: ClipboardCheck },
  { href: '/admin/assignment-history', label: 'Riwayat Penugasan', icon: History },
  { href: '/admin/reports', label: 'Laporan Penugasan', icon: FileText },
  { href: '/admin/settings', label: 'Pengaturan', icon: Settings },
  { href: '/admin/cms', label: 'CMS Halaman Utama', icon: Globe },
  { href: '/admin/booking-component', label: 'Form Pengajuan (01)', icon: SlidersHorizontal },
  { href: '/admin/locations', label: 'Kelola Wilayah', icon: MapPin },
  { href: '/admin/transactions', label: 'Transaksi', icon: ReceiptText },
  { href: '/admin/equipment', label: 'Peralatan pekerja', icon: Boxes },
  { href: '/admin/users', label: 'Pengguna dashboard', icon: UsersRound },
];
const workerNav = [
  { href: '/worker', label: 'Kunjungan saya', icon: BriefcaseBusiness },
  { href: '/worker/reports', label: 'Laporan lapangan', icon: FileText },
  { href: '/worker/equipment', label: 'Peralatan', icon: PackageCheck },
];

function AppShell({ children, role = 'admin' }: { children: React.ReactNode; role?: 'admin' | 'worker' }) {
  const [menu, setMenu] = useState(false);
  const [location, setLocation] = useLocation();
  const nav = role === 'admin' ? adminNav : workerNav;
  const session = getAuthSession();
  const displayName = session?.name || (role === 'admin' ? 'Admin SEIIKI' : 'Teknisi lapangan');
  const initials = displayName.split(/\s+/).map((value) => value[0]).join('').slice(0, 2).toUpperCase();

  const requestsQuery = useListServiceRequests();
  const requestsCount = requestsQuery.data ? requestsQuery.data.length : 0;

  useEffect(() => {
    if (!menu) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [menu]);
  const logout = () => {
    window.localStorage.removeItem(AUTH_SESSION_KEY);
    setLocation('/login');
  };
  return <div className="app-noise min-h-[100dvh] bg-background w-full">
    <aside className={`sidebar ${menu ? 'sidebar-open' : ''}`}>
      <div className="flex items-center justify-between">
        <Logo inverse />
        <button className="sidebar-close" aria-label="Tutup menu navigasi" onClick={() => setMenu(false)} data-testid="button-close-menu">
          <X size={18} />
        </button>
      </div>
      <div className="mt-8 px-3 text-[10px] font-extrabold uppercase tracking-[.18em] text-sidebar-foreground/40">{role === 'admin' ? 'Ruang kendali' : 'Ruang pekerja'}</div>
      <nav className="mt-3 space-y-1">{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMenu(false)} className={`side-link ${location === href ? 'side-link-active' : ''}`} data-testid={`link-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon size={17} /><span>{label}</span>{href === '/admin/requests' && requestsCount > 0 && <span className="ml-auto grid min-w-5 h-5 px-1.5 place-items-center rounded-full bg-primary text-[10px] font-extrabold text-primary-foreground">{requestsCount}</span>}</Link>)}</nav>
      <div className="sidebar-bottom">
        <button type="button" onClick={logout} className="side-link w-full text-sidebar-foreground/55" data-testid="button-logout"><LogOut size={17} /><span>Keluar</span></button>
      </div>
    </aside>
    {menu && <button type="button" className="sidebar-overlay" aria-label="Tutup menu navigasi" onClick={() => setMenu(false)} data-testid="button-overlay-close-menu" />}
    <main className="w-full min-h-[100dvh] flex flex-col">
      <header className="topbar">
        <div className="flex items-center gap-3.5">
          <button className="menu-trigger" aria-label={menu ? 'Tutup menu' : 'Buka menu'} aria-expanded={menu} onClick={() => setMenu(!menu)} data-testid="button-open-menu">
            <Menu size={18} />
            <span className="text-xs font-bold">Menu</span>
          </button>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="hidden sm:inline">{role === 'admin' ? 'Operasional / ' : 'Lapangan / '}</span>
            <strong className="text-foreground">{pageName(location)}</strong>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button className="icon-button" aria-label="Notifikasi" data-testid="button-notifications"><Bell size={17} /><i /></button>
          <span className="hidden h-5 w-px bg-border sm:block" />
          <div className="flex items-center gap-2.5">
            <span className="avatar">{initials}</span>
            <div className="hidden leading-tight sm:block">
              <strong className="block text-xs">{displayName}</strong>
              <span className="text-[10px] text-muted-foreground">{role === 'admin' ? 'Administrator' : 'Teknisi lapangan'}</span>
            </div>
            <ChevronDown size={14} className="text-muted-foreground" />
          </div>
        </div>
      </header>
      <div className="page-wrap flex-1 w-full">{children}</div>
    </main>
  </div>;
}
function pageName(location: string) {
  return location === '/admin'
    ? 'Ringkasan operasi'
    : location.includes('assignment-history')
    ? 'Riwayat Penugasan'
    : location.includes('booking')
    ? 'Form Pengajuan (01)'
    : location.includes('requests')
    ? 'Permintaan kunjungan'
    : location.includes('transactions')
    ? 'Transaksi'
    : location.includes('equipment')
    ? 'Peralatan'
    : location.includes('users')
    ? 'Pengguna dashboard'
    : location === '/worker'
    ? 'Kunjungan saya'
    : location.includes('reports')
    ? 'Laporan lapangan'
    : 'Peralatan';
}
function PageIntro({ eyebrow, title, body, action }: { eyebrow: string; title: string; body: string; action?: React.ReactNode }) {
  return <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end rise-in"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{body}</p></div>{action}</div>;
}
function Stat({ label, value, note, icon: Icon, accent = 'yellow' }: { label: string; value: string; note: string; icon: React.ElementType; accent?: string }) {
  return <div className="stat-card rise-in"><div className={`stat-icon stat-${accent}`}><Icon size={17} /></div><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong><span className="stat-note">{note}</span></div>;
}
function RequestTable({ requests, onAssign, onManage, onDelete, compact = false }: { requests: ServiceRequest[]; onAssign?: (r: ServiceRequest) => void; onManage?: (r: ServiceRequest) => void; onDelete?: (r: ServiceRequest) => void; compact?: boolean }) {
  if (!requests.length) return <Empty title="Belum ada permintaan" body="Permintaan baru akan muncul di sini setelah pelanggan mengisi form." />;

  if (compact) {
    return (
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Nama</th>
              <th>Jenis Layanan</th>
              <th className="text-right">Nominal</th>
            </tr>
          </thead>
          <tbody>
            {requests.slice(0, 5).map((r) => {
              const nominal = (r.totalAmount || r.visitFee || 25000) + (r.repairCost || 0);
              return (
                <tr key={r.id} data-testid={`row-request-${r.id}`}>
                  <td>
                    <strong className="block text-sm font-semibold text-foreground">{r.customerName}</strong>
                    <span className="block text-[11px] font-mono text-muted-foreground">{r.code}</span>
                  </td>
                  <td>
                    <span className="text-xs font-medium text-foreground">{r.serviceType}</span>
                  </td>
                  <td className="text-right">
                    <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {rupiah(nominal)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Kode / Pelanggan</th>
            <th>WhatsApp</th>
            <th>Layanan & Alamat (GPS)</th>
            <th>Status</th>
            <th>Biaya Layanan (Lapangan)</th>
            <th>Kunjungan</th>
            <th>Teknisi</th>
            <th className="text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => {
            const hasCoords = typeof r.latitude === 'number' && typeof r.longitude === 'number';
            const mapsUrl = hasCoords
              ? `https://www.google.com/maps?q=${r.latitude},${r.longitude}`
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.address)}`;
            const waUrl = formatWhatsAppUrl(r.whatsapp, r.customerName, r.code, r.serviceType);

            return (
              <tr key={r.id} data-testid={`row-request-${r.id}`}>
                <td>
                  <strong className="block font-mono text-xs text-primary">{r.code}</strong>
                  <span className="mt-1 block text-sm font-semibold text-foreground">{r.customerName}</span>
                  <span className="block text-[11px] text-muted-foreground">{time(r.createdAt)}</span>
                </td>
                <td>
                  <div className="space-y-1">
                    <span className="block font-mono text-xs font-semibold text-foreground">{r.whatsapp || '-'}</span>
                    {r.whatsapp ? (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                        title={`Kirim WhatsApp ke ${r.customerName}`}
                        data-testid={`link-whatsapp-${r.id}`}
                      >
                        <MessageCircle size={12} /> Chat WA
                      </a>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Tidak ada nomor</span>
                    )}
                  </div>
                </td>
                <td>
                  <span className="block max-w-[220px] truncate text-xs font-bold text-foreground">{r.serviceType}</span>
                  <a
                    className="mt-1 inline-flex max-w-[240px] items-center gap-1.5 rounded-lg border border-border/80 bg-muted/40 px-2 py-1 text-xs text-foreground transition-all hover:border-accent hover:bg-accent/10 hover:text-accent group"
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    title={hasCoords ? `Buka titik GPS (${r.latitude}, ${r.longitude}) di Google Maps` : `Cari alamat "${r.address}" di Google Maps`}
                    data-testid={`link-maps-${r.id}`}
                  >
                    <MapPin size={13} className="shrink-0 text-red-500" />
                    <span className="truncate text-[11px] font-medium">{r.address}</span>
                    <ExternalLink size={11} className="shrink-0 text-muted-foreground group-hover:text-accent ml-auto" />
                  </a>
                  {hasCoords && (
                    <span className="mt-1 flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                      <LocateFixed size={11} className="text-emerald-500" /> GPS: {r.latitude?.toFixed(4)}, {r.longitude?.toFixed(4)}
                    </span>
                  )}
                </td>
                <td>
                  <Status value={r.status} />
                </td>
                <td>
                  {typeof r.repairCost === 'number' && r.repairCost > 0 ? (
                    <button
                      type="button"
                      onClick={() => onManage && onManage(r)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all"
                      title="Biaya layanan lapangan (diinput Admin). Klik untuk ubah."
                      data-testid={`button-cost-${r.id}`}
                    >
                      <span>{rupiah(r.repairCost)}</span>
                      <Pencil size={11} className="opacity-70" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onManage && onManage(r)}
                      className="inline-flex items-center gap-1 rounded-lg border border-dashed border-border px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:border-accent hover:text-accent transition-colors"
                      title="Klik untuk input biaya layanan setelah pengecekan di lokasi"
                      data-testid={`button-input-cost-${r.id}`}
                    >
                      <Plus size={12} /> Input Biaya Lapangan
                    </button>
                  )}
                </td>
                <td>
                  <Status value={r.paymentStatus || 'unpaid'} />
                </td>
                <td>
                  {r.assignedWorkerName ? (
                    <span className="flex items-center gap-2 text-xs font-semibold">
                      <span className="avatar avatar-sm">{r.assignedWorkerName.split(' ').map((v) => v[0]).join('').slice(0, 2)}</span>
                      {r.assignedWorkerName}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Belum ditugaskan</span>
                  )}
                </td>
                <td>
                  <div className="flex justify-end gap-1.5">
                    {onManage && (
                      <Button kind="soft" className="!px-2.5 !py-1.5 text-[11px]" onClick={() => onManage(r)} data-testid={`button-manage-request-${r.id}`}>
                        <Settings2 size={13} /> Kelola
                      </Button>
                    )}
                    {onAssign && (
                      <Button kind="outline" className="!px-2.5 !py-1.5 text-[11px]" onClick={() => onAssign(r)} data-testid={`button-assign-${r.id}`}>
                        {r.assignedWorkerId ? 'Ubah' : 'Tugaskan'}
                      </Button>
                    )}
                    {onDelete && (
                      <button className="icon-button icon-danger" onClick={() => onDelete(r)} data-testid={`button-delete-request-${r.id}`}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const CUSTOMER_GALLERY_IMAGES = [
  {
    id: 1,
    src: `${basePath}/galeri-1.jpeg`,
    badge: '01',
    category: 'Panel & Distribusi',
    title: 'Pemasangan & Pengkabelan Panel Listrik',
    desc: 'Pengkabelan rapi dan tertata sesuai standar teknis keselamatan ketenagalistrikan (PUIL).',
  },
  {
    id: 2,
    src: `${basePath}/galeri-2.jpeg`,
    badge: '02',
    category: 'Proteksi Sirkit',
    title: 'Penyetelan & Penggantian MCB Utama',
    desc: 'Pemasangan sakelar pemutus otomatis berkualitas tinggi guna mencegah beban lebih dan lonjakan arus.',
  },
  {
    id: 3,
    src: `${basePath}/galeri-3.jpeg`,
    badge: '03',
    category: 'Titik Beban',
    title: 'Pemeriksaan Titik Daya & Stop Kontak',
    desc: 'Pengecekan kontinuitas, proteksi arus bocor, dan pembumian instalasi rumah tinggal.',
  },
  {
    id: 4,
    src: `${basePath}/galeri-4.jpeg`,
    badge: '04',
    category: 'Pengukuran & Uji',
    title: 'Inspeksi Kelaikan & Pengukuran Beban',
    desc: 'Pengujian tegangan voltase serta evaluasi pembagian beban daya MCB yang seimbang.',
  },
  {
    id: 5,
    src: `${basePath}/galeri-5.jpeg`,
    badge: '05',
    category: 'Pasang Baru',
    title: 'Penarikan Jalur Kabel Instalasi Baru',
    desc: 'Pemasangan pipa pelindung conduit dan kabel tembaga murni untuk instalasi gedung & hunian.',
  },
  {
    id: 6,
    src: `${basePath}/galeri-6.jpeg`,
    badge: '06',
    category: 'Perapihan Jalur',
    title: 'Perapihan Jalur Distribusi Listrik',
    desc: 'Penyambungan kabel tahan panas dan penataan ulang jalur kabel untuk mencegah korsleting.',
  },
  {
    id: 7,
    src: `${basePath}/galeri-7.jpeg`,
    badge: '07',
    category: 'Keselamatan',
    title: 'Pengujian Sistem Pembumian (Grounding)',
    desc: 'Pengecekan nilai resistansi elektroda pembumian demi proteksi terhadap petir dan lonjakan.',
  },
  {
    id: 8,
    src: `${basePath}/galeri-8.jpeg`,
    badge: '08',
    category: 'Pemeliharaan',
    title: 'Rekondisi Terminal & Sambungan Beban',
    desc: 'Pengencangan klem konektor yang kendor guna menghilangkan titik panas percikan api.',
  },
  {
    id: 9,
    src: `${basePath}/galeri-9.jpeg`,
    badge: '09',
    category: 'Sertifikasi NIDI & SLO',
    title: 'Pemeriksaan Standar Teknis NIDI & SLO',
    desc: 'Verifikasi kesesuaian gambar instalasi dan spesifikasi material sebelum sertifikasi resmi terbit.',
  },
  {
    id: 10,
    src: `${basePath}/galeri-10.jpeg`,
    badge: '10',
    category: 'Kesiapan Operasi',
    title: 'Verifikasi Akhir & Kesiapan Operasi',
    desc: 'Pemeriksaan menyeluruh kesiapan laik operasi instalasi bersama pelanggan sebelum serah terima.',
  },
];

interface ActivityGalleryCarouselProps {
  onSelectPhoto: (index: number) => void;
  galleryCms?: CmsGallery;
}

function ActivityGalleryCarousel({ onSelectPhoto, galleryCms }: ActivityGalleryCarouselProps) {
  const [isPaused, setIsPaused] = useState(false);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = document.getElementById('gallery-scroll-viewport');
    if (el) {
      const scrollAmount = 340;
      el.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const eyebrow = galleryCms?.eyebrow || 'Dokumentasi Kegiatan Nyata';
  const tagText = galleryCms?.tagText || '10 Foto Lapangan';
  const title = galleryCms?.title || 'Galeri Kegiatan & Pekerjaan Teknisi';
  const description = galleryCms?.description || 'Dokumentasi pekerjaan langsung dari lokasi kunjungan pelanggan — dari instalasi panel, perbaikan jalur, hingga uji kelaikan operasi.';
  const items = galleryCms?.items && galleryCms.items.length > 0 ? galleryCms.items : CUSTOMER_GALLERY_IMAGES;

  // Double items for seamless infinite marquee illusion
  const loopedItems = [...items, ...items];

  return (
    <section
      id="galeri"
      className="relative my-8 overflow-hidden rounded-3xl border border-border/80 bg-card/60 p-5 sm:p-7 shadow-xs backdrop-blur-xs"
      data-testid="section-activity-gallery"
    >
      {/* Background soft ambient glow */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-3/4 rounded-full bg-primary/10 blur-3xl" />

      {/* Header bar */}
      <div className="relative z-10 mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="eyebrow flex items-center gap-2">
            <span className="status-dot bg-accent" />
            <span>{eyebrow}</span>
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
              {tagText}
            </span>
          </div>
          <h2 className="mt-1 text-lg sm:text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="mt-1 max-w-xl text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>

        {/* Action Controls: Pause/Play & Prev/Next */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setIsPaused((prev) => !prev)}
            className="btn btn-outline !py-1.5 !px-3 text-xs flex items-center gap-1.5"
            title={isPaused ? 'Jalankan rotasi otomatis' : 'Jeda rotasi otomatis'}
            data-testid="button-gallery-toggle-pause"
          >
            {isPaused ? <Play size={13} className="text-emerald-600 dark:text-emerald-400" /> : <Pause size={13} />}
            <span className="hidden xs:inline">{isPaused ? 'Lanjut Putar' : 'Jeda'}</span>
          </button>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleScroll('left')}
              className="icon-button !size-8"
              aria-label="Geser ke kiri"
              data-testid="button-gallery-scroll-left"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => handleScroll('right')}
              className="icon-button !size-8"
              aria-label="Geser ke kanan"
              data-testid="button-gallery-scroll-right"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Infinity Carousel Container */}
      <div className="relative -mx-5 sm:-mx-7 px-5 sm:px-7">
        {/* Soft edge blur masks */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 z-20 w-8 sm:w-16 bg-gradient-to-r from-background via-background/60 to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 z-20 w-8 sm:w-16 bg-gradient-to-l from-background via-background/60 to-transparent" />

        {/* Horizontal scrollable track with infinite marquee */}
        <div
          id="gallery-scroll-viewport"
          className="overflow-x-auto no-scrollbar py-2"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className={`gallery-marquee-track ${isPaused ? 'is-paused' : ''}`}>
            {loopedItems.map((item, idx) => {
              const originalIndex = idx % items.length;
              return (
                <div
                  key={`${item.id}-${idx}`}
                  onClick={() => onSelectPhoto(originalIndex)}
                  className="gallery-card-hover group relative w-[250px] sm:w-[290px] shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-border bg-card shadow-xs mr-4 flex flex-col select-none"
                  data-testid={`gallery-carousel-item-${originalIndex}`}
                >
                  {/* Photo container */}
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
                    <img
                      src={item.src}
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />

                    {/* Top badging */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
                      <span className="rounded-md bg-black/65 px-2 py-0.5 font-mono text-[10px] font-bold text-white backdrop-blur-xs shadow-xs">
                        #{item.badge}
                      </span>
                      <span className="rounded-md bg-primary/90 px-2 py-0.5 text-[10px] font-bold text-primary-foreground backdrop-blur-xs shadow-xs">
                        {item.category}
                      </span>
                    </div>

                    {/* Bottom overlay with hover preview hint */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3 z-10">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-white/20 backdrop-blur-sm rounded-lg px-2.5 py-1.5 w-fit">
                        <Eye size={13} /> Perbesar Foto
                      </span>
                    </div>
                  </div>

                  {/* Caption & Title */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between bg-card">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                        {item.title}
                      </h4>
                      <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Dokumentasi Lapangan</span>
                      <span className="font-semibold text-primary group-hover:underline flex items-center gap-0.5">
                        Lihat <ChevronRight size={11} />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Arahkan kursor atau sentuh foto untuk menghentikan putaran otomatis
        </span>
        <span className="hidden sm:inline font-mono text-[10px]">
          Tekan tombol panah untuk menggeser
        </span>
      </div>
    </section>
  );
}


function CustomerHome() {
  const create = useCreateServiceRequest();
  const pay = useCreateVisitPayment();
  const configQuery = useGetBookingConfig();
  const servicesQuery = useListBookingServices();
  const nidiTariffsQuery = useListNidiSloTariffs(true);
  const cmsQuery = useLandingCms();

  const config = configQuery.data || DEFAULT_BOOKING_CONFIG;
  const allServices = servicesQuery.data || DEFAULT_BOOKING_SERVICES;
  const activeServices = allServices.filter((s) => s.isActive === 1);
  const tariffs = nidiTariffsQuery.data || [];
  const cms = cmsQuery.data;

  const [submitted, setSubmitted] = useState<ServiceRequest | null>(null);
  const [paid, setPaid] = useState(false);
  const [form, setForm] = useState({
    customerName: '',
    whatsapp: '',
    address: '',
    serviceType: activeServices[0]?.name || 'Perbaikan Listrik Rumah',
    notes: '',
  });
  const [selectedTariffId, setSelectedTariffId] = useState<number | null>(null);
  const [showNidiPricingModal, setShowNidiPricingModal] = useState(false);
  const [tariffSearch, setTariffSearch] = useState('');
  const [activeGalleryIndex, setActiveGalleryIndex] = useState<number | null>(null);

  const isNidiSlo = useMemo(() => {
    const s = (form.serviceType || '').toLowerCase();
    return s.includes('nidi') || s.includes('slo');
  }, [form.serviceType]);

  const activeTariffList = useMemo(() => {
    return tariffs.length > 0 ? tariffs : DEFAULT_OFFICIAL_NIDI_SLO_TARIFFS;
  }, [tariffs]);

  const selectedTariff = useMemo(() => {
    if (!activeTariffList.length) return null;
    if (selectedTariffId) {
      const found = activeTariffList.find((t) => t.id === selectedTariffId);
      if (found) return found;
    }
    return activeTariffList[0];
  }, [activeTariffList, selectedTariffId]);

  const filteredTariffs = useMemo(() => {
    if (!tariffSearch.trim()) return activeTariffList;
    const q = tariffSearch.toLowerCase().replace(/\./g, '');
    return activeTariffList.filter((t) => {
      const vaStr = String(t.powerVa);
      const labelStr = t.powerLabel.toLowerCase();
      const notesStr = (t.notes || '').toLowerCase();
      return vaStr.includes(q) || labelStr.includes(q) || notesStr.includes(q);
    });
  }, [activeTariffList, tariffSearch]);

  const [hierarchicalLocation, setHierarchicalLocation] = useState<HierarchicalLocationValue>({
    provinceId: null,
    provinceName: '',
    regencyId: null,
    regencyType: null,
    regencyName: '',
    districtId: null,
    districtName: '',
    villageId: null,
    villageType: null,
    villageName: '',
    detail: '',
    fullAddress: '',
  });
  const [locationError, setLocationError] = useState('');

  useEffect(() => {
    if (activeServices.length > 0 && (!form.serviceType || !activeServices.some((s) => s.name === form.serviceType))) {
      setForm((f) => ({ ...f, serviceType: activeServices[0].name }));
    }
  }, [activeServices, form.serviceType]);

  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geoState, setGeoState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [method, setMethod] = useState<'qris' | 'bank_transfer' | 'e_wallet'>('qris');
  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const createRequest = (location: { latitude: number; longitude: number }) => {
    const finalAddress = form.address || hierarchicalLocation.fullAddress;
    if (!finalAddress || finalAddress.trim().length < 4) {
      setLocationError('Silakan lengkapi pemilihan lokasi wilayah (Provinsi hingga Desa/Kelurahan).');
      return;
    }

    const payload: any = {
      ...form,
      address: finalAddress,
      province: hierarchicalLocation.provinceName || undefined,
      regency: (hierarchicalLocation.regencyType ? (hierarchicalLocation.regencyType === 'kabupaten' ? 'Kabupaten ' : 'Kota ') : '') + hierarchicalLocation.regencyName,
      district: hierarchicalLocation.districtName ? `Kecamatan ${hierarchicalLocation.districtName}` : undefined,
      village: (hierarchicalLocation.villageType ? (hierarchicalLocation.villageType === 'desa' ? 'Desa ' : 'Kelurahan ') : '') + hierarchicalLocation.villageName,
      ...location,
    };

    if (isNidiSlo && selectedTariff) {
      payload.powerVa = selectedTariff.powerVa;
      payload.sloFee = selectedTariff.sloFee;
      payload.nidiFee = selectedTariff.nidiFee;
      payload.totalAmount = selectedTariff.totalFee;
      payload.visitFee = 0;
    }

    create.mutate(
      { data: payload },
      { onSuccess: (request) => setSubmitted(request) },
    );
  };

  const locate = (afterLocate = false) => {
    if (!navigator.geolocation) { setGeoState('error'); return; }
    setGeoState('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        setCoords(location);
        setGeoState('ready');
        if (afterLocate) createRequest(location);
      },
      () => setGeoState('error'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hierarchicalLocation.villageId && (!form.address || form.address.trim().length < 4)) {
      setLocationError('Silakan lengkapi pemilihan lokasi hingga tingkat Desa / Kelurahan.');
      return;
    }
    setLocationError('');
    if (coords) createRequest(coords);
    else if (config.enableGps) locate(true);
    else createRequest({ latitude: -6.2088, longitude: 106.8456 });
  };

  const geoLabel = geoState === 'loading'
    ? 'Mencari lokasi…'
    : geoState === 'ready'
    ? 'Lokasi GPS tersimpan'
    : geoState === 'error'
    ? 'Lokasi belum tersedia — coba lagi'
    : (config.gpsButtonText || 'Ambil lokasi GPS');

  const cleanAdminWa = (config.adminWhatsapp || '6281112345678').replace(/\D/g, '');

  return (
    <div className="customer-page app-noise min-h-[100dvh]">
      <header className="customer-nav">
        <Logo />
        <div className="hidden items-center gap-7 text-xs font-bold text-muted-foreground md:flex">
          {cms?.navbar?.links && cms.navbar.links.length > 0 ? (
            cms.navbar.links.map((link) => (
              <a key={link.id} href={link.href} data-testid={`link-customer-${link.id}`}>
                {link.label}
              </a>
            ))
          ) : (
            <>
              <a href="#alur" data-testid="link-customer-flow">Cara kerja</a>
              <a href="#galeri" data-testid="link-customer-gallery">Galeri kerja</a>
              <a href="#aman" data-testid="link-customer-safety">Jaminan kami</a>
            </>
          )}
          {cms?.navbar?.showAction !== false && (
            <Link
              href={cms?.navbar?.actionHref || '/admin'}
              className="text-foreground"
              data-testid="link-customer-dashboard"
            >
              {cms?.navbar?.actionText || 'Akses tim'} <ArrowRight size={13} className="ml-1 inline" />
            </Link>
          )}
        </div>
        {cms?.navbar?.showAction !== false && (
          <Link
            href={cms?.navbar?.actionHref || '/admin'}
            className="btn btn-outline !px-3 !py-2 text-xs md:hidden"
            data-testid="link-mobile-dashboard"
          >
            {cms?.navbar?.actionText || 'Akses tim'}
          </Link>
        )}
      </header>

      {cms?.flow?.enabled !== false && (
        <section id="alur" className="customer-flow">
          <div className="eyebrow">
            <span className="status-dot bg-accent" /> {cms?.flow?.eyebrow || 'Alur SEIIKI'}
          </div>
          <h2>
            {cms?.flow?.titleLine1 || 'JASA KETENAGALISTRIKAN'}<br />
            <em>{cms?.flow?.titleLine2Accent || 'LAMPUNG'}</em>
          </h2>
          <div className="flow-grid">
            {cms?.flow?.steps && cms.flow.steps.length > 0 ? (
              cms.flow.steps.map((s) => (
                <div className="flow-item" key={s.id || s.stepNumber}>
                  <span>{s.stepNumber}</span>
                  <strong>{s.title}</strong>
                  <p>{s.description}</p>
                </div>
              ))
            ) : (
              [
                ['01', config.title || 'Ajukan Kunjungan', 'Pilih keluhan listrik & bagikan titik lokasi Anda.'],
                ['02', 'Bayar Kunjungan', `${rupiah(config.visitFee || 25000)} untuk kedatangan & inspeksi teknisi.`],
                ['03', 'Pengecekan Lapangan', 'Biaya layanan dihitung teknisi di lokasi & diinput resmi oleh Admin.'],
              ].map(([n, t, b]) => (
                <div className="flow-item" key={n}>
                  <span>{n}</span>
                  <strong>{t}</strong>
                  <p>{b}</p>
                </div>
              ))
            )}
          </div>

          {/* Location Coverage Disclaimer Component */}
          {cms?.disclaimer?.enabled !== false && (
            <div className="mt-8 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 md:p-6 shadow-sm">
              <div className="flex items-start gap-3.5">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-destructive text-destructive-foreground shadow-sm">
                  <AlertTriangle size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-destructive">
                      {cms?.disclaimer?.eyebrow || 'Disclaimer Jangkauan Layanan'}
                    </span>
                    <span className="rounded-md bg-destructive/15 px-2 py-0.5 text-[10px] font-bold text-destructive">
                      {cms?.disclaimer?.tagText || 'Penting'}
                    </span>
                  </div>
                  <h4 className="mt-1 text-sm font-bold text-foreground md:text-base">
                    {cms?.disclaimer?.title || 'Wilayah di Luar Pilihan Input Tidak Akan Dilayani'}
                  </h4>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground md:text-sm">
                    {cms?.disclaimer?.description || 'Teknisi SEIIKI hanya dapat melayani kunjungan pada wilayah administratif yang terdaftar dan dapat dipilih secara lengkap bertahap pada formulir:'}
                  </p>

                  {/* Step Hierarchy Preview */}
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {(cms?.disclaimer?.steps || [
                      { step: 'Langkah 1/4', title: 'Provinsi', example: 'Contoh: Lampung' },
                      { step: 'Langkah 2/4', title: 'Kabupaten / Kota', example: 'Contoh: Bandar Lampung' },
                      { step: 'Langkah 3/4', title: 'Kecamatan', example: 'Contoh: Langkapura' },
                      { step: 'Langkah 4/4', title: 'Kelurahan / Desa', example: 'Pilih yang terdaftar' },
                    ]).map((s, idx) => (
                      <div key={idx} className="rounded-xl border border-border/80 bg-background/90 p-2.5">
                        <div className="text-[10px] font-mono text-muted-foreground uppercase">{s.step}</div>
                        <div className="text-xs font-bold text-foreground mt-0.5">{s.title}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{s.example}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex items-start gap-2 rounded-lg bg-destructive/10 p-2.5 text-xs font-medium text-destructive">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                    <span>
                      <strong>Perhatian:</strong> {cms?.disclaimer?.noticeText || 'Apabila lokasi/wilayah tempat tinggal Anda tidak tersedia atau tidak ada dalam opsi pilihan (Langkah 1 s/d 4), mohon maaf pesanan kunjungan TIDAK AKAN DILAYANI.'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      <section className="customer-hero">
        {cms?.hero?.enabled !== false && (
          <div className="hero-copy rise-in">
            <div className="eyebrow">
              <span className="status-dot bg-accent" /> {cms?.hero?.eyebrow || 'Layanan listrik yang datang siap kerja'}
            </div>
            <h1>
              {cms?.hero?.titleLine1 || 'Masalah listrik,'}<br />
              <em>{cms?.hero?.titleLine2Accent || 'kami urus.'}</em>
            </h1>
            <p>
              {cms?.hero?.description ||
                'Teknisi terverifikasi datang ke lokasi Anda dengan alur yang jelas, biaya kunjungan pasti, dan admin yang selalu bisa dihubungi.'}
            </p>
            <div className="hero-proof">
              {cms?.hero?.badges && cms.hero.badges.length > 0 ? (
                cms.hero.badges.map((badge) => (
                  <span key={badge.id || badge.text}>
                    {renderCmsIcon(badge.icon, 17)} {badge.text}
                  </span>
                ))
              ) : (
                <>
                  <span><ShieldCheck size={17} /> Teknisi terverifikasi</span>
                  <span><Clock3 size={17} /> Respon di hari yang sama</span>
                </>
              )}
            </div>
          </div>
        )}

        <div className="request-card rise-in delay-1">
          <div className="card-kicker">
            <span className="step-number">{config.stepNumber || '01'}</span>
            <div>
              <strong>{config.title || 'Ajukan kunjungan'}</strong>
              <p>{config.subtitle || 'Isi detail singkat, kami lanjutkan lewat WhatsApp.'}</p>
            </div>
          </div>

          {!submitted ? (
            <form onSubmit={submit} className="space-y-4">
              <Field
                label="Kebutuhan layanan"
                hint={isNidiSlo ? "Layanan NIDI & SLO mencakup sertifikasi lengkap dengan biaya resmi berdasarkan daya listrik." : "Biaya perbaikan ditentukan setelah teknisi memeriksa langsung di lokasi & diinput oleh Admin."}
              >
                <select
                  value={form.serviceType}
                  onChange={(e) => {
                    const nextType = e.target.value;
                    set('serviceType', nextType);
                    const isNidi = nextType.toLowerCase().includes('nidi') || nextType.toLowerCase().includes('slo');
                    if (isNidi) {
                      setShowNidiPricingModal(true);
                    }
                  }}
                  data-testid="select-service-type"
                >
                  {activeServices.length > 0 ? (
                    activeServices.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Perbaikan Listrik Rumah">Perbaikan Listrik Rumah</option>
                      <option value="Pasang Baru">Pasang Baru</option>
                      <option value="NIDI dan SLO">NIDI dan SLO</option>
                    </>
                  )}
                </select>
              </Field>

              {/* NIDI & SLO Pricing Selection Card & Modal Trigger */}
              {isNidiSlo && (
                <div className="space-y-3 rounded-2xl border-2 border-primary/40 bg-card p-4 shadow-sm" data-testid="container-nidi-slo-selection">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex size-6 items-center justify-center rounded-lg bg-[#1e4e79] text-white text-xs font-black">⚡</span>
                        <h4 className="text-sm font-bold text-foreground">Tarif Biaya SLO & Supervisi NIDI (TR)</h4>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Tegangan Rendah — Biaya resmi bersertifikat berdasarkan kapasitas daya listrik Anda.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowNidiPricingModal(true)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1e4e79] hover:bg-[#14395b] text-white px-3.5 py-2 text-xs font-bold transition-all shadow-sm shrink-0"
                      data-testid="button-open-nidi-pricing-modal"
                    >
                      <Eye size={14} />
                      <span>Buka Tabel Daftar Harga</span>
                    </button>
                  </div>

                  {/* Selected Breakdown Card */}
                  {selectedTariff && (
                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <CheckCircle2 size={15} className="text-emerald-500" />
                          Paket Terpilih: <strong>{selectedTariff.powerLabel} ({selectedTariff.powerVa.toLocaleString('id-ID')} VA)</strong>
                        </span>
                        <span className="text-sm font-mono font-black text-[#b82e2e] dark:text-rose-400">
                          {rupiah(selectedTariff.totalFee)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground border-t border-primary/15 pt-2 font-mono">
                        <div>Biaya SLO: <strong className="text-foreground">{rupiah(selectedTariff.sloFee)}</strong></div>
                        <div>Supervisi NIDI: <strong className="text-foreground">{rupiah(selectedTariff.nidiFee)}</strong></div>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[11px]">
                        <span className="text-muted-foreground italic">
                          * Pembayaran NIDI & SLO dibayar penuh sesuai paket daya via Paywuz.
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowNidiPricingModal(true)}
                          className="font-bold text-[#1e4e79] dark:text-blue-400 hover:underline shrink-0 ml-2"
                        >
                          Ubah Daya &raquo;
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Field label="Nama lengkap">
                <input
                  required
                  minLength={2}
                  value={form.customerName}
                  onChange={(e) => set('customerName', e.target.value)}
                  placeholder={config.namePlaceholder || 'Contoh: Sinta Rahma'}
                  data-testid="input-customer-name"
                />
              </Field>

              <Field label="Nomor WhatsApp" hint={config.phoneHint || 'Gunakan nomor yang aktif menerima pesan'}>
                <input
                  required
                  minLength={8}
                  value={form.whatsapp}
                  onChange={(e) => set('whatsapp', e.target.value)}
                  placeholder={config.phonePlaceholder || '08xx xxxx xxxx'}
                  data-testid="input-customer-whatsapp"
                />
              </Field>

              <div className="space-y-1">
                <HierarchicalLocationSelector
                  value={hierarchicalLocation}
                  onChange={(val) => {
                    setHierarchicalLocation(val);
                    set('address', val.fullAddress);
                    if (val.villageId) setLocationError('');
                  }}
                />
                {locationError && (
                  <p className="text-xs font-semibold text-destructive mt-1 flex items-center gap-1">
                    <AlertTriangle size={13} /> {locationError}
                  </p>
                )}
              </div>

              {config.enableGps === 1 && (
                <Field label="Titik lokasi GPS" hint={config.gpsHint || 'Bagikan lokasi agar teknisi menemukan alamat dengan tepat'}>
                  <div className="location-control">
                    <Button
                      type="button"
                      kind={geoState === 'ready' ? 'soft' : 'outline'}
                      onClick={() => locate()}
                      disabled={geoState === 'loading'}
                      data-testid="button-get-location"
                    >
                      <LocateFixed size={15} /> {geoLabel}
                    </Button>
                    {coords && (
                      <a
                        href={`https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="location-coordinates"
                        data-testid="link-location-map"
                      >
                        {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
                      </a>
                    )}
                  </div>
                </Field>
              )}

              {geoState === 'error' && config.enableGps === 1 && (
                <div className="notice notice-error">
                  <MapPin size={15} /> Izinkan akses lokasi di browser untuk mengirim permintaan.
                </div>
              )}

              <Button
                type="submit"
                className="w-full justify-center"
                disabled={create.isPending || geoState === 'loading' || (isNidiSlo && !selectedTariff)}
                data-testid="button-submit-request"
              >
                {create.isPending ? 'Mengirim permintaan...' : (
                  <>{isNidiSlo && selectedTariff ? `Lanjut Bayar (${rupiah(selectedTariff.totalFee)})` : (config.buttonText || 'Lanjut ke pembayaran')} <ArrowRight size={16} /></>
                )}
              </Button>

              <div className="rounded-xl border border-border/80 bg-muted/30 p-2.5 text-center text-xs text-muted-foreground">
                {isNidiSlo && selectedTariff ? (
                  <>
                    <p>
                      Total Biaya NIDI & SLO: <strong className="font-mono text-foreground">{rupiah(selectedTariff.totalFee)}</strong> (Langsung Lunas).
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Sudah termasuk Sertifikat Laik Operasi (SLO) dan Nomor Identitas Instalasi (NIDI).
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      Biaya Kunjungan: <strong className="font-mono text-foreground">{rupiah(config.visitFee || 25000)}</strong> ({config.visitFeeNote || 'dibayar di muka'}).
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Biaya perbaikan/layanan ditentukan setelah teknisi cek di lokasi dan diinput resmi oleh Admin.
                    </p>
                  </>
                )}
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="success-panel">
                <BadgeCheck size={25} />
                <div>
                  <strong>Permintaan tercatat</strong>
                  <p>Kode Anda <b>{submitted.code}</b>. Selesaikan pembayaran untuk mengunci pesanan layanan Anda.</p>
                </div>
              </div>

              {!paid ? (
                <PaywuzPayment
                  requestId={submitted.id}
                  requestCode={submitted.code}
                  customerName={submitted.customerName}
                  amount={submitted.totalAmount || submitted.visitFee || config.visitFee || 25000}
                  adminWhatsapp={cleanAdminWa}
                  onPaymentSuccess={() => {
                    setPaid(true);
                    queryClient.invalidateQueries({ queryKey: getListServiceRequestsQueryKey() });
                    queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
                    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
                  }}
                  onCancel={() => {
                    setSubmitted(null);
                    setPaid(false);
                    setCoords(null);
                    setGeoState('idle');
                  }}
                />
              ) : (
                <div className="space-y-3">
                  <div className="success-panel">
                    <Check size={25} />
                    <div>
                      <strong>Pembayaran Berhasil Terverifikasi!</strong>
                      <p>Sistem Paywuz telah mengonfirmasi pembayaran Anda. Admin SEIIKI akan segera menghubungi Anda melalui WhatsApp.</p>
                    </div>
                  </div>
                  <a
                    className="btn btn-whatsapp w-full justify-center"
                    href={`https://wa.me/${cleanAdminWa}?text=${encodeURIComponent(
                      submitted.totalAmount && submitted.powerVa
                        ? `Halo Admin SEIIKI, saya sudah membayar lunas layanan ${submitted.serviceType} (Daya ${submitted.powerVa.toLocaleString('id-ID')} VA - ${rupiah(submitted.totalAmount)}) via Paywuz dengan kode ${submitted.code}. Mohon segera diproses.`
                        : `Halo Admin SEIIKI, saya sudah membayar biaya kunjungan via Paywuz dengan kode ${submitted.code}. Mohon jadwalkan teknisi.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    data-testid="link-whatsapp-admin"
                  >
                    <MessageCircle size={16} /> Lanjut ke WhatsApp admin
                  </a>
                </div>
              )}

              <button
                onClick={() => {
                  setSubmitted(null);
                  setPaid(false);
                  setCoords(null);
                  setGeoState('idle');
                }}
                className="w-full text-center text-xs font-bold text-muted-foreground underline"
                data-testid="button-new-request"
              >
                Buat permintaan lain
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Galeri Kegiatan Infinity Carousel: Tepat di bawah section "Masalah listrik, kami urus." */}
      {cms?.gallery?.enabled !== false && (
        <ActivityGalleryCarousel
          galleryCms={cms?.gallery}
          onSelectPhoto={(idx) => setActiveGalleryIndex(idx)}
        />
      )}

      {cms?.assurance?.enabled !== false && (
        <section id="aman" className="customer-assurance">
          <div>
            <div className="eyebrow">{cms?.assurance?.eyebrow || 'Yang bisa Anda pegang'}</div>
            <h2>{cms?.assurance?.title || 'Tenang, ada tim di balik setiap kunjungan.'}</h2>
          </div>
          <div className="assurance-list">
            {cms?.assurance?.items && cms.assurance.items.length > 0 ? (
              cms.assurance.items.map((item) => (
                <div key={item.id || item.title}>
                  {renderCmsIcon(item.icon, 20)}
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.description}</small>
                  </span>
                </div>
              ))
            ) : (
              <>
                <div>
                  <ShieldCheck size={20} />
                  <span>
                    <strong>Teknisi terarah</strong>
                    <small>Penugasan disesuaikan dengan kebutuhan layanan.</small>
                  </span>
                </div>
                <div>
                  <MessageCircle size={20} />
                  <span>
                    <strong>Admin mudah dihubungi</strong>
                    <small>Setelah bayar, percakapan berlanjut di WhatsApp.</small>
                  </span>
                </div>
                <div>
                  <ReceiptText size={20} />
                  <span>
                    <strong>Biaya Transparan & Pasti</strong>
                    <small>Hanya biaya kunjungan di awal. Biaya perbaikan dihitung di lokasi & diinput Admin.</small>
                  </span>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      <footer className="customer-footer">
        <Logo />
        <span>{cms?.footer?.copyrightText || '© 2024 SEIIKI · PT Solusi Energi Kelistrikan Indonesia'}</span>
        {cms?.footer?.links &&
          cms.footer.links.filter((f) => !f.label.toLowerCase().includes('hubungi admin whatsapp')).length > 0 && (
          <div className="flex items-center gap-4 flex-wrap justify-center text-xs">
            {cms.footer.links
              .filter((f) => !f.label.toLowerCase().includes('hubungi admin whatsapp'))
              .map((fLink) => (
                <a
                  key={fLink.id}
                  href={fLink.href}
                  target={fLink.href.startsWith('http') ? '_blank' : undefined}
                  rel="noreferrer"
                  className="text-muted-foreground hover:text-foreground underline"
                >
                  {fLink.label}
                </a>
              ))}
          </div>
        )}
        <span className="font-mono text-[10px] uppercase tracking-widest">
          {cms?.footer?.tagline || 'clear work · safe homes'}
        </span>
      </footer>

      {showNidiPricingModal && (
        <NidiSloPricingModal
          open={showNidiPricingModal}
          onClose={() => setShowNidiPricingModal(false)}
          tariffs={activeTariffList}
          selectedTariffId={selectedTariff?.id ?? activeTariffList[0]?.id}
          onSelectTariff={(t) => {
            setSelectedTariffId(t.id);
            setShowNidiPricingModal(false);
          }}
        />
      )}

      {activeGalleryIndex !== null && (() => {
        const galleryItems = cms?.gallery?.items && cms.gallery.items.length > 0 ? cms.gallery.items : CUSTOMER_GALLERY_IMAGES;
        const currentItem = galleryItems[activeGalleryIndex] || galleryItems[0];
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-5 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={() => setActiveGalleryIndex(null)}
            data-testid="modal-gallery-lightbox"
          >
            <div
              className="relative max-h-[92vh] max-w-3xl w-full rounded-2xl bg-card border border-border overflow-hidden shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/30">
                <div className="min-w-0 pr-2">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-primary font-bold">
                    Dokumentasi Lapangan {activeGalleryIndex + 1} / {galleryItems.length}
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-foreground truncate mt-0.5">
                    {currentItem.title}
                  </h3>
                </div>
                <button
                  type="button"
                  className="icon-button !size-8 shrink-0"
                  onClick={() => setActiveGalleryIndex(null)}
                  aria-label="Tutup"
                >
                  ✕
                </button>
              </div>

              <div className="relative flex-1 bg-black/95 flex items-center justify-center min-h-[280px] max-h-[65vh] overflow-hidden p-2 select-none">
                <img
                  src={currentItem.src}
                  alt={currentItem.title}
                  className="max-h-[62vh] max-w-full object-contain rounded-lg"
                />

                {activeGalleryIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveGalleryIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 hover:bg-black/80 text-white size-9 flex items-center justify-center text-sm shadow-md transition-all"
                    aria-label="Foto sebelumnya"
                  >
                    ◀
                  </button>
                )}
                {activeGalleryIndex < galleryItems.length - 1 && (
                  <button
                    type="button"
                    onClick={() => setActiveGalleryIndex((prev) => (prev !== null && prev < galleryItems.length - 1 ? prev + 1 : prev))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 hover:bg-black/80 text-white size-9 flex items-center justify-center text-sm shadow-md transition-all"
                    aria-label="Foto berikutnya"
                  >
                    ▶
                  </button>
                )}
              </div>

              <div className="border-t border-border p-3 sm:p-4 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {currentItem.desc}
                </p>
                <div className="flex items-center justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveGalleryIndex(null)}
                    className="btn btn-outline !py-1.5 !px-3 text-xs"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function AdminHome() {
  const summaryQuery = useGetDashboardSummary();
  const requestQuery = useListServiceRequests();
  if (summaryQuery.isLoading || requestQuery.isLoading) {
    return <AppShell><LoadingRows /></AppShell>;
  }
  if (summaryQuery.isError || !summaryQuery.data) {
    return <AppShell><ErrorNotice retry={() => { void summaryQuery.refetch(); void requestQuery.refetch(); }} /></AppShell>;
  }
  const summary = summaryQuery.data;
  const requests = requestQuery.data ?? [];

  const countTotal = requests.length;
  const countAssigned = requests.filter((r) => r.status === 'assigned').length;
  const countCompleted = requests.filter((r) => r.status === 'completed').length;
  const countCancelled = requests.filter((r) => r.status === 'cancelled').length;

  const session = getAuthSession();
  const adminName = session?.name || 'Administrator';
  const currentDateStr = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <AppShell>
      <PageIntro
        eyebrow={currentDateStr}
        title="Ringkasan operasi"
        body={`Selamat datang, ${adminName}. Ini keadaan tim dan kunjungan terkini.`}
        action={
          <Button
            kind="soft"
            onClick={() => {
              void summaryQuery.refetch();
              void requestQuery.refetch();
            }}
            data-testid="button-refresh-summary"
          >
            <RefreshCw size={15} /> Segarkan
          </Button>
        }
      />
      <div className="stat-grid">
        <Stat label="Total permintaan" value={String(countTotal)} note="sepanjang bulan ini" icon={ClipboardCheck} />
        <Stat label="Ditugaskan" value={String(countAssigned)} note="menunggu teknisi" icon={Clock3} accent="blue" />
        <Stat label="Selesai" value={String(countCompleted)} note="kunjungan selesai" icon={BadgeCheck} accent="green" />
        <Stat label="Dibatalkan" value={String(countCancelled)} note="permintaan dibatalkan" icon={AlertTriangle} accent="orange" />
      </div>
      <div className="two-col mt-6">
        <section className="panel rise-in delay-1">
          <div className="panel-head">
            <div>
              <div className="eyebrow">Perlu perhatian</div>
              <h3>Permintaan terbaru</h3>
            </div>
            <Link href="/admin/requests" className="text-xs font-bold text-accent" data-testid="link-all-requests">
              Lihat semua <ArrowRight size={13} className="ml-1 inline" />
            </Link>
          </div>
          {requestQuery.isLoading ? (
            <LoadingRows />
          ) : requestQuery.isError ? (
            <ErrorNotice retry={requestQuery.refetch} />
          ) : (
            <RequestTable requests={requests} compact />
          )}
        </section>
        <section className="panel rise-in delay-2">
          <div className="panel-head">
            <div>
              <div className="eyebrow">Aktivitas terkini</div>
              <h3>Tim bergerak</h3>
            </div>
            <Activity size={18} className="text-muted-foreground" />
          </div>
          <div className="activity-list">
            {summary.recentActivity.map((a, i) => (
              <div className="activity-item" key={`${a.label}-${i}`}>
                <span className={`activity-mark mark-${i}`}>
                  <Check size={13} />
                </span>
                <span>
                  <strong>{a.label}</strong>
                  <small>{a.detail}</small>
                </span>
                <time>{a.time}</time>
              </div>
            ))}
          </div>
          <div className="revenue-strip">
            <div>
              <span>Pendapatan kunjungan</span>
              <strong>{rupiah(summary.visitRevenue)}</strong>
            </div>
            <div>
              <span>Pendapatan perbaikan</span>
              <strong>{rupiah(summary.repairRevenue)}</strong>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function AssignDialog({ request, workers, onClose, onSave }: { request: ServiceRequest; workers: Worker[]; onClose: () => void; onSave: (workerId: number) => void }) {
  const [worker, setWorker] = useState(String(request.assignedWorkerId || workers[0]?.id || ''));
  return <div className="modal-backdrop"><div className="modal"><div className="flex items-start justify-between"><div><div className="eyebrow">Penugasan · {request.code}</div><h3>Pilih teknisi</h3><p className="mt-1 text-xs text-muted-foreground">{request.customerName} · {request.serviceType}</p></div><button className="icon-button" onClick={onClose} data-testid="button-close-assign"><X size={17} /></button></div><div className="mt-6 space-y-3">{workers.map((w) => <button key={w.id} onClick={() => setWorker(String(w.id))} className={`worker-option ${worker === String(w.id) ? 'worker-selected' : ''}`} data-testid={`button-worker-${w.id}`}><span className="avatar">{w.name.split(' ').map((v) => v[0]).join('').slice(0, 2)}</span><span className="text-left"><strong>{w.name}</strong><small>{w.specialty} · {w.status === 'available' ? 'Tersedia' : 'Sedang bertugas'}</small></span><span className="ml-auto">{worker === String(w.id) && <Check size={17} className="text-primary" />}</span></button>)}</div><div className="mt-7 flex justify-end gap-2"><Button kind="outline" onClick={onClose} data-testid="button-cancel-assign">Batal</Button><Button onClick={() => onSave(Number(worker))} data-testid="button-save-assign"><Check size={15} /> Simpan penugasan</Button></div></div></div>;
}

function ManageRequestDialog({ request, onClose, onSave }: { request: ServiceRequest; onClose: () => void; onSave: (data: { status: ServiceRequest['status']; repairCost: number | null }) => void }) {
  const [status, setStatus] = useState<ServiceRequest['status']>(
    request.status === 'completed' || request.status === 'cancelled' || request.status === 'assigned'
      ? request.status
      : 'assigned'
  );
  const [repairCost, setRepairCost] = useState(request.repairCost ? String(request.repairCost) : '');

  const hasCoords = typeof request.latitude === 'number' && typeof request.longitude === 'number';
  const mapsUrl = hasCoords
    ? `https://www.google.com/maps?q=${request.latitude},${request.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(request.address)}`;
  const waUrl = formatWhatsAppUrl(request.whatsapp, request.customerName, request.code, request.serviceType);

  return (
    <div className="modal-backdrop">
      <form
        className="modal"
        onSubmit={(event) => {
          event.preventDefault();
          onSave({ status, repairCost: repairCost ? Number(repairCost) : null });
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="eyebrow">Detail Pekerjaan · {request.code}</div>
            <h3>Kelola Status & Biaya Perbaikan</h3>
            <p className="mt-1 text-xs text-muted-foreground">{request.customerName} · {request.serviceType}</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} data-testid="button-close-manage">
            <X size={17} />
          </button>
        </div>

        <div className="request-detail">
          <div>
            <span>Pelanggan</span>
            <strong>{request.customerName}</strong>
          </div>
          <div>
            <span>WhatsApp</span>
            {request.whatsapp ? (
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                <MessageCircle size={13} /> {request.whatsapp}
              </a>
            ) : (
              <span className="text-xs text-muted-foreground">-</span>
            )}
          </div>
          <div>
            <span>Lokasi (Google Maps)</span>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs font-bold text-accent hover:underline"
            >
              <MapPin size={13} className="text-red-500" /> Buka Titik GPS <ExternalLink size={11} />
            </a>
          </div>
          <div>
            <span>Alamat Lengkap</span>
            <span className="text-xs text-muted-foreground leading-relaxed">{request.address}</span>
          </div>
          <div>
            <span>Catatan Keluhan</span>
            <strong>{request.notes || 'Tidak ada catatan tambahan'}</strong>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <Field label="Status Pekerjaan / Permintaan" hint="Pilih status operasional terkini:">
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as ServiceRequest['status'])}
              data-testid="select-request-status"
            >
              <option value="assigned">Ditugaskan (Teknisi Dalam Proses)</option>
              <option value="completed">Selesai (Pekerjaan Lapangan Rampung)</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
          </Field>

          <Field
            label="Biaya Layanan / Perbaikan Lapangan (Rp)"
            hint="Diinput langsung oleh Admin berdasarkan hasil pemeriksaan/pekerjaan teknisi di lokasi. (Biaya kunjungan Rp 25.000 sudah terpisah)."
          >
            <input
              type="number"
              min="0"
              step="1000"
              value={repairCost}
              onChange={(event) => setRepairCost(event.target.value)}
              placeholder="Contoh: 350000 (biaya perbaikan di lokasi)"
              data-testid="input-repair-cost"
            />
          </Field>
        </div>

        <div className="mt-7 flex justify-end gap-2">
          <Button type="button" kind="outline" onClick={onClose} data-testid="button-cancel-manage">
            Batal
          </Button>
          <Button type="submit" data-testid="button-save-manage">
            <Check size={15} /> Simpan Perubahan
          </Button>
        </div>
      </form>
    </div>
  );
}

function AdminRequests() {
  const client = useQueryClient();
  const query = useListServiceRequests();
  const workersQuery = useListWorkers();
  const update = useUpdateServiceRequest();
  const remove = useDeleteServiceRequest();
  const [filter, setFilter] = useState<'all' | 'assigned' | 'completed' | 'cancelled'>('all');
  const [selected, setSelected] = useState<ServiceRequest | null>(null);
  const [managed, setManaged] = useState<ServiceRequest | null>(null);
  const [search, setSearch] = useState('');
  const [deletingRequest, setDeletingRequest] = useState<ServiceRequest | null>(null);
  const requests = query.data ?? [];
  const workers = workersQuery.data ?? [];

  // Filter based on the 3 statuses (Ditugaskan, Selesai, Dibatalkan) or All
  const shown = requests.filter((request) => {
    const matchFilter = filter === 'all' || request.status === filter;
    const matchSearch = `${request.code} ${request.customerName} ${request.whatsapp} ${request.address} ${request.serviceType}`
      .toLowerCase()
      .includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const countAssigned = requests.filter((r) => r.status === 'assigned').length;
  const countCompleted = requests.filter((r) => r.status === 'completed').length;
  const countCancelled = requests.filter((r) => r.status === 'cancelled').length;

  const assign = (workerId: number) => {
    if (!selected) return;
    update.mutate(
      { id: selected.id, data: { assignedWorkerId: workerId, status: 'assigned' } },
      {
        onSuccess: () => {
          setSelected(null);
          client.invalidateQueries({ queryKey: getListServiceRequestsQueryKey() });
        },
      }
    );
  };

  const manage = (data: { status: ServiceRequest['status']; repairCost: number | null }) => {
    if (!managed) return;
    update.mutate(
      { id: managed.id, data },
      {
        onSuccess: () => {
          setManaged(null);
          client.invalidateQueries({ queryKey: getListServiceRequestsQueryKey() });
          client.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
          client.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        },
      }
    );
  };

  const deleteRequest = (r: ServiceRequest) => {
    setDeletingRequest(r);
  };

  return (
    <AppShell>
      <PageIntro
        eyebrow="Kendali kunjungan"
        title="Permintaan kunjungan"
        body="Kelola perbaikan dengan 3 status utama (Ditugaskan, Selesai, Dibatalkan), hubungi pelanggan lewat WhatsApp, dan navigasi langsung ke titik GPS lokasi."
        action={
          <Button onClick={() => query.refetch()} kind="soft" data-testid="button-refresh-requests">
            <RefreshCw size={15} /> Segarkan data
          </Button>
        }
      />

      <div className="filter-bar">
        <div className="filter-tabs">
          {[
            ['all', `Semua (${requests.length})`],
            ['assigned', `Ditugaskan (${countAssigned})`],
            ['completed', `Selesai (${countCompleted})`],
            ['cancelled', `Dibatalkan (${countCancelled})`],
          ].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilter(v as typeof filter)}
              className={filter === v ? 'filter-active' : ''}
              data-testid={`button-filter-${v}`}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="search-field">
          <Search size={15} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari kode, nama pelanggan, WhatsApp, atau alamat..."
            data-testid="input-search-requests"
          />
        </div>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>{shown.length} permintaan</h3>
            <p className="text-xs text-muted-foreground">
              {filter === 'all'
                ? 'Menampilkan semua riwayat permintaan'
                : `Filter status: ${statusLabel[filter] || filter}`}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="status-dot bg-emerald-500" /> API tersambung
          </div>
        </div>
        {query.isLoading ? (
          <LoadingRows />
        ) : query.isError && !query.data ? (
          <ErrorNotice retry={query.refetch} />
        ) : (
          <RequestTable requests={shown} onAssign={setSelected} onManage={setManaged} onDelete={deleteRequest} />
        )}
      </section>

      {selected && (
        <AssignDialog
          request={selected}
          workers={workers}
          onClose={() => setSelected(null)}
          onSave={assign}
        />
      )}

      {managed && (
        <ManageRequestDialog
          request={managed}
          onClose={() => setManaged(null)}
          onSave={manage}
        />
      )}

      {deletingRequest && (
        <ConfirmModal
          title={`Hapus Permintaan ${deletingRequest.code}`}
          message={`Apakah Anda yakin ingin menghapus permintaan kunjungan untuk "${deletingRequest.customerName}"? Data yang dihapus tidak dapat dipulihkan.`}
          confirmText="Hapus Permintaan"
          onConfirm={() => {
            remove.mutate(
              { id: deletingRequest.id },
              { onSuccess: () => client.invalidateQueries({ queryKey: getListServiceRequestsQueryKey() }) }
            );
          }}
          onClose={() => setDeletingRequest(null)}
        />
      )}
    </AppShell>
  );
}

function AdminTransactions() {
  const client = useQueryClient();
  const [period, setPeriod] = useState<'all' | 'week' | 'month' | 'custom'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'cancelled'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'visit_fee' | 'repair_fee' | 'nidi_slo_fee'>('all');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [deletingTransaction, setDeletingTransaction] = useState<any | null>(null);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState<string | null>(null);

  const deleteTransaction = useDeleteTransaction();

  const handleConfirmDeleteTransaction = async () => {
    if (!deletingTransaction) return;
    try {
      await deleteTransaction.mutateAsync(deletingTransaction.id);
      setDeleteSuccessMsg(`Transaksi ${deletingTransaction.requestCode} (${deletingTransaction.customerName}) berhasil dihapus.`);
      setDeletingTransaction(null);
      setTimeout(() => setDeleteSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus transaksi');
    }
  };

  const query = useListTransactions({
    period,
    from: period === 'custom' && from ? from : undefined,
    to: period === 'custom' && to ? to : undefined,
  });
  const requestsQuery = useListServiceRequests();

  const apiTransactions = query.data ?? [];
  const requests = requestsQuery.data ?? [];

  // Helper to test if a date fits into the selected period
  const isWithinPeriod = (dateStr: string | Date) => {
    if (period === 'all') return true;
    const d = new Date(dateStr).getTime();
    const now = Date.now();
    if (period === 'week') return d >= now - 7 * 86400000;
    if (period === 'month') return d >= now - 30 * 86400000;
    if (period === 'custom') {
      if (from && d < new Date(from).getTime()) return false;
      if (to && d > new Date(to).setHours(23, 59, 59, 999)) return false;
      return true;
    }
    return true;
  };

  // Synchronize and unify all transactions from transactionsTable and service requests
  const allRows = useMemo(() => {
    const list = [...apiTransactions];
    const existingKeys = new Set(list.map((t) => `${t.requestId}-${t.type}`));

    requests.forEach((r) => {
      const isSlo = (r.serviceType || '').toLowerCase().includes('slo') || (r.serviceType || '').toLowerCase().includes('nidi');

      // 1. NIDI & SLO transaction
      if (isSlo && isWithinPeriod(r.createdAt)) {
        const key = `${r.id}-nidi_slo_fee`;
        if (!existingKeys.has(key)) {
          const amount = r.totalAmount || 0;
          list.push({
            id: 88000 + r.id,
            requestId: r.id,
            requestCode: r.code,
            customerName: r.customerName,
            type: 'nidi_slo_fee' as any,
            amount: amount,
            status: r.status === 'completed' || r.status === 'in_progress' ? ('paid' as const) : r.status === 'cancelled' ? ('cancelled' as const) : ('pending' as const),
            createdAt: r.createdAt,
            powerVa: r.powerVa,
          } as any);
          existingKeys.add(key);
        }
      }

      // 2. Repair fee transaction
      if (typeof r.repairCost === 'number' && r.repairCost > 0 && isWithinPeriod(r.createdAt)) {
        const key = `${r.id}-repair_fee`;
        if (!existingKeys.has(key)) {
          list.push({
            id: 99000 + r.id,
            requestId: r.id,
            requestCode: r.code,
            customerName: r.customerName,
            type: 'repair_fee' as const,
            amount: r.repairCost,
            status: r.status === 'completed' ? ('paid' as const) : r.status === 'cancelled' ? ('cancelled' as const) : ('pending' as const),
            createdAt: r.createdAt,
          });
          existingKeys.add(key);
        }
      }
    });

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [apiTransactions, requests, period, from, to]);

  // Segmentations by status
  const paidRows = useMemo(
    () => allRows.filter((r) => r.status === 'paid' || (r as any).paywuzStatus === 'success'),
    [allRows]
  );
  const pendingRows = useMemo(
    () =>
      allRows.filter(
        (r) => r.status === 'pending' || r.status === 'waiting_payment' || r.status === 'unpaid'
      ),
    [allRows]
  );
  const cancelledRows = useMemo(
    () =>
      allRows.filter(
        (r) =>
          r.status === 'cancelled' ||
          r.status === 'failed' ||
          r.status === 'expired' ||
          r.status === 'rejected'
      ),
    [allRows]
  );

  // Segmentations by type
  const repairRows = useMemo(() => allRows.filter((r) => r.type === 'repair_fee'), [allRows]);
  const visitRows = useMemo(() => allRows.filter((r) => r.type === 'visit_fee'), [allRows]);
  const nidiSloRows = useMemo(() => allRows.filter((r) => (r.type as string) === 'nidi_slo_fee'), [allRows]);

  // Financial calculations
  const totalPaid = useMemo(
    () => paidRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
    [paidRows]
  );
  const totalRepairFees = useMemo(
    () => repairRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
    [repairRows]
  );
  const totalVisitFees = useMemo(
    () => visitRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
    [visitRows]
  );
  const totalNidiSloFees = useMemo(
    () => nidiSloRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
    [nidiSloRows]
  );

  // Filtered rows for table view
  const filteredRows = useMemo(() => {
    return allRows.filter((r) => {
      if (statusFilter !== 'all') {
        if (statusFilter === 'paid' && !(r.status === 'paid' || (r as any).paywuzStatus === 'success')) return false;
        if (
          statusFilter === 'pending' &&
          !(r.status === 'pending' || r.status === 'waiting_payment' || r.status === 'unpaid')
        )
          return false;
        if (
          statusFilter === 'cancelled' &&
          !(
            r.status === 'cancelled' ||
            r.status === 'failed' ||
            r.status === 'expired' ||
            r.status === 'rejected'
          )
        )
          return false;
      }
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const match = `${r.requestCode} ${r.customerName} ${(r as any).paymentMethod || ''} ${r.type}`.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [allRows, statusFilter, typeFilter, search]);

  const handleExportExcel = (exportAll = true) => {
    const listToExport = exportAll ? allRows : filteredRows;
    const dataToExport = listToExport.map((t, index) => {
      const anyT = t as any;
      const statusText =
        t.status === 'paid' || anyT.paywuzStatus === 'success'
          ? 'Berhasil (Lunas)'
          : t.status === 'cancelled' || t.status === 'failed' || t.status === 'expired'
          ? 'Dibatalkan'
          : 'Menunggu Pembayaran';
      const typeText =
        t.type === 'nidi_slo_fee'
          ? 'NIDI & SLO'
          : t.type === 'visit_fee'
          ? 'Biaya Kunjungan'
          : 'Biaya Perbaikan';
      return {
        No: index + 1,
        'Kode Permintaan': t.requestCode,
        'Nama Pelanggan': t.customerName,
        'Jenis Transaksi': typeText,
        'Metode Pembayaran': anyT.paymentMethod || (t.type === 'repair_fee' ? 'Admin / Kas' : 'QRIS / Paywuz'),
        'Nominal Biaya (Rp)': t.amount,
        'Status Pembayaran': statusText,
        'Tanggal & Waktu': new Date(t.createdAt).toLocaleString('id-ID', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 18 },
      { wch: 24 },
      { wch: 20 },
      { wch: 22 },
      { wch: 20 },
      { wch: 22 },
      { wch: 24 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Transaksi');

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Laporan_Transaksi_Seiiki_${dateStr}.xlsx`);
  };

  return (
    <AppShell>
      <PageIntro
        eyebrow="Keuangan operasional"
        title="Transaksi"
        body="Pantau status transaksi (berhasil, menunggu, dibatalkan) serta rekonsiliasi penerimaan biaya kunjungan, perbaikan, dan NIDI/SLO secara akurat dan konsisten."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => handleExportExcel(true)}
              kind="primary"
              data-testid="button-export-excel-transactions"
            >
              <Download size={15} /> Ekspor Excel ({allRows.length})
            </Button>
            <Button
              onClick={() => {
                void query.refetch();
                void requestsQuery.refetch();
              }}
              kind="soft"
              data-testid="button-refresh-transactions"
            >
              <RefreshCw size={15} /> Segarkan data
            </Button>
          </div>
        }
      />

      {/* Row 1: Status & Volume Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <Stat
          label="Total Transaksi"
          value={String(allRows.length)}
          note="semua transaksi"
          icon={ReceiptText}
          accent="blue"
        />
        <Stat
          label="Berhasil / Lunas"
          value={String(paidRows.length)}
          note="pembayaran terverifikasi"
          icon={CheckCircle2}
          accent="green"
        />
        <Stat
          label="Menunggu"
          value={String(pendingRows.length)}
          note="menunggu pembayaran / QRIS"
          icon={Clock3}
          accent="yellow"
        />
        <Stat
          label="Dibatalkan"
          value={String(cancelledRows.length)}
          note="dibatalkan / kadaluarsa"
          icon={AlertTriangle}
          accent="orange"
        />
      </div>

      {/* Row 2: Financial Metrics Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Stat
          label="Sudah Dibayar"
          value={rupiah(totalPaid)}
          note="penerimaan tercatat"
          icon={Banknote}
          accent="green"
        />
        <Stat
          label="Biaya Perbaikan"
          value={rupiah(totalRepairFees)}
          note="total di-input admin"
          icon={Wrench}
          accent="yellow"
        />
        <Stat
          label="Biaya Kunjungan"
          value={rupiah(totalVisitFees)}
          note="pembayaran awal"
          icon={MapPin}
          accent="blue"
        />
        <Stat
          label="Biaya NIDI & SLO"
          value={rupiah(totalNidiSloFees)}
          note="paket daya TR"
          icon={Zap}
          accent="purple"
        />
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent font-black text-sm">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">Payment Gateway: Paywuz Merchant</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                <CheckCircle2 size={11} /> Terhubung (Live)
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Mendukung QRIS Instan, Virtual Account Bank (BCA, BNI, BRI, Mandiri), dan e-Wallet terverifikasi otomatis via Paywuz v1.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://paywuz.id/"
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline text-xs !py-1.5 !px-3 gap-1.5"
          >
            <span>Dashboard Paywuz</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      <section className="panel mt-6">
        <div className="panel-head flex-wrap gap-3">
          <div>
            <h3>Riwayat Transaksi</h3>
            <p className="text-xs text-muted-foreground">Filter periode, status, dan jenis transaksi secara akurat.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="filter-tabs">
              {(['all', 'week', 'month', 'custom'] as const).map((p) => (
                <button
                  key={p}
                  className={period === p ? 'filter-active' : ''}
                  onClick={() => {
                    setPeriod(p);
                    client.invalidateQueries({ queryKey: getListTransactionsQueryKey({ period: p }) });
                  }}
                  data-testid={`button-period-${p}`}
                >
                  {p === 'all' ? 'Semua' : p === 'week' ? '7 hari' : p === 'month' ? 'Bulan ini' : 'Custom'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {period === 'custom' && (
          <div className="date-filter mb-4">
            <Field label="Dari">
              <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} data-testid="input-transaction-from" />
            </Field>
            <Field label="Sampai">
              <input type="date" value={to} onChange={(event) => setTo(event.target.value)} data-testid="input-transaction-to" />
            </Field>
          </div>
        )}

        {/* Filter Bar: Status Filters, Type Filters, and Search */}
        <div className="filter-bar border-t border-border/40 pt-4 flex-wrap gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="filter-tabs">
              {[
                ['all', `Semua Status (${allRows.length})`],
                ['paid', `Berhasil (${paidRows.length})`],
                ['pending', `Menunggu (${pendingRows.length})`],
                ['cancelled', `Dibatalkan (${cancelledRows.length})`],
              ].map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setStatusFilter(v as typeof statusFilter)}
                  className={statusFilter === v ? 'filter-active' : ''}
                  data-testid={`button-filter-status-${v}`}
                >
                  {l}
                </button>
              ))}
            </div>

            <div className="filter-tabs">
              {[
                ['all', `Semua Jenis (${allRows.length})`],
                ['repair_fee', `Biaya Perbaikan (${repairRows.length})`],
                ['visit_fee', `Biaya Kunjungan (${visitRows.length})`],
                ['nidi_slo_fee', `NIDI & SLO (${nidiSloRows.length})`],
              ].map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setTypeFilter(v as typeof typeFilter)}
                  className={typeFilter === v ? 'filter-active' : ''}
                  data-testid={`button-filter-type-${v}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <div className="search-field">
              <Search size={15} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari kode atau nama pelanggan..."
                data-testid="input-search-transactions"
              />
            </div>

            <Button
              kind="outline"
              className="!py-2 !px-3 text-xs shrink-0"
              onClick={() => handleExportExcel(false)}
              data-testid="button-export-filtered-excel"
            >
              <Download size={13} /> Ekspor Hasil Filter ({filteredRows.length})
            </Button>
          </div>
        </div>

        {deleteSuccessMsg && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300">
            <span className="flex items-center gap-2">
              <CheckCircle2 size={16} />
              {deleteSuccessMsg}
            </span>
            <button onClick={() => setDeleteSuccessMsg(null)} className="font-bold text-xs">✕</button>
          </div>
        )}

        {query.isLoading ? (
          <LoadingRows />
        ) : !filteredRows.length ? (
          <Empty title="Tidak ada transaksi" body="Belum ada transaksi yang sesuai dengan filter." />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Kode / Pelanggan</th>
                  <th>Jenis Transaksi</th>
                  <th>Metode / Gateway</th>
                  <th>Nominal Biaya (Rp)</th>
                  <th>Status Pembayaran</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((t) => {
                  const anyT = t as any;
                  const payMethod = anyT.paymentMethod || (t.type === 'repair_fee' ? 'Admin / Kas' : 'QRIS / Paywuz');
                  const isPaid = t.status === 'paid' || anyT.paywuzStatus === 'success';
                  const isCancelled =
                    t.status === 'cancelled' ||
                    t.status === 'failed' ||
                    t.status === 'expired' ||
                    t.status === 'rejected';

                  const isNidi = t.type === 'nidi_slo_fee' || anyT.type === 'nidi_slo_fee';

                  return (
                    <tr key={t.id} data-testid={`row-transaction-${t.id}`}>
                      <td className="text-xs text-muted-foreground">{time(t.createdAt)}</td>
                      <td>
                        <strong className="block text-xs font-mono text-primary">{t.requestCode}</strong>
                        <span className="text-xs font-semibold text-foreground">{t.customerName}</span>
                        {anyT.powerVa && (
                          <span className="block text-[10px] text-muted-foreground font-mono">
                            Daya: {Number(anyT.powerVa).toLocaleString('id-ID')} VA
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${
                            isNidi
                              ? 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20'
                              : t.type === 'repair_fee'
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                              : 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20'
                          }`}
                        >
                          {isNidi ? <Zap size={13} /> : t.type === 'visit_fee' ? <MapPin size={13} /> : <Wrench size={13} />}
                          {isNidi ? 'NIDI & SLO' : t.type === 'visit_fee' ? 'Biaya Kunjungan' : 'Biaya Perbaikan'}
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-foreground">
                            {anyT.orderId ? (
                              <span className="rounded bg-accent/15 px-1 py-0.5 text-[9px] text-accent font-bold">
                                PAYWUZ
                              </span>
                            ) : null}
                            <span>{payMethod}</span>
                          </span>
                          {anyT.orderId && (
                            <span className="font-mono text-[10px] text-muted-foreground" title={anyT.orderId}>
                              #{anyT.orderId.slice(-8)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="font-mono text-xs font-bold text-foreground">{rupiah(t.amount)}</td>
                      <td>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide ${
                            isPaid
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                              : isCancelled
                              ? 'bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30'
                              : 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isPaid ? 'bg-emerald-500' : isCancelled ? 'bg-red-500' : 'bg-amber-500'
                            }`}
                          />
                          {isPaid ? 'Berhasil' : isCancelled ? 'Dibatalkan' : 'Menunggu'}
                        </span>
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          className="icon-button icon-danger !size-7.5"
                          onClick={() => setDeletingTransaction(t)}
                          title="Hapus Transaksi"
                          data-testid={`button-delete-transaction-${t.id}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {deletingTransaction && (
        <ConfirmModal
          title={`Hapus Transaksi ${deletingTransaction.requestCode}`}
          message={`Apakah Anda yakin ingin menghapus transaksi ${deletingTransaction.requestCode} (${deletingTransaction.customerName}) senilai ${rupiah(deletingTransaction.amount)}? Tindakan ini akan menghapus riwayat transaksi secara permanen.`}
          confirmText="Hapus Transaksi"
          kind="danger"
          onConfirm={handleConfirmDeleteTransaction}
          onClose={() => setDeletingTransaction(null)}
        />
      )}
    </AppShell>
  );
}

function AdminEquipment() {
  const client = useQueryClient();
  const query = useListEquipmentRequests();
  const update = useUpdateEquipmentRequest();
  const rows = query.data || [];
  const review = (id: number, status: 'approved' | 'rejected') => update.mutate({ id, data: { status } }, { onSuccess: () => client.invalidateQueries({ queryKey: getListEquipmentRequestsQueryKey() }) });
  return <AppShell><PageIntro eyebrow="Kesiapan tim" title="Peralatan pekerja" body="Tinjau kebutuhan alat sebelum teknisi berangkat ke lapangan." /><section className="panel"><div className="panel-head"><div><h3>Permintaan alat</h3><p className="text-xs text-muted-foreground">{rows.filter((r) => r.status === 'pending').length} perlu ditinjau</p></div><Boxes size={18} className="text-muted-foreground" /></div><div className="equipment-list">{rows.map((r) => <div className="equipment-row" key={r.id} data-testid={`row-equipment-${r.id}`}><span className={`equipment-symbol ${r.urgency === 'urgent' ? 'symbol-urgent' : ''}`}><Wrench size={17} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong>{r.item}</strong>{r.urgency === 'urgent' && <Badge tone="warm">Mendesak</Badge>}</div><p>{r.workerName} · {r.quantity} unit · diajukan {date(r.createdAt)}</p></div><div className="flex items-center gap-2">{r.status === 'pending' ? <><Button kind="soft" className="!px-2.5 !py-1.5 text-[11px]" onClick={() => review(r.id, 'approved')} data-testid={`button-approve-equipment-${r.id}`}><Check size={13} /> Setujui</Button><button className="icon-button icon-danger" onClick={() => review(r.id, 'rejected')} data-testid={`button-reject-equipment-${r.id}`}><X size={14} /></button></> : <Status value={r.status} />}</div></div>)}</div></section></AppShell>;
}

function AdminUsers() {
  const client = useQueryClient();
  const query = useListUsers();
  const create = useCreateUser();
  const update = useUpdateUser();
  const remove = useDeleteUser();
  const [editing, setEditing] = useState<User | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const rows = query.data || [];
  return (
    <AppShell>
      <PageIntro eyebrow="Akses internal" title="Pengguna dashboard" body="Kelola akun pengguna, email, dan kata sandi untuk login ke sistem." action={<Button onClick={() => { setEditing(null); setOpen(true); }} data-testid="button-add-user"><Plus size={16} /> Buat Akun Baru</Button>} />
      <section className="panel">
        <div className="panel-head"><div><h3>{rows.length} pengguna terdaftar</h3><p className="text-xs text-muted-foreground">Akun yang dapat login ke dashboard SEIIKI.</p></div><UsersRound size={18} className="text-muted-foreground" /></div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Username</th><th>Email (Login)</th><th>Peran</th><th>Status</th><th className="text-right">Aksi</th></tr></thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} data-testid={`row-user-${u.id}`}>
                  <td><span className="flex items-center gap-2.5"><span className="avatar">{u.name.split(' ').map((v) => v[0]).join('').slice(0, 2)}</span><strong className="text-xs">{u.name}</strong></span></td>
                  <td className="text-xs font-mono text-muted-foreground">{u.email || '-'}</td>
                  <td><Badge tone={u.role === 'admin' ? 'warm' : 'neutral'}>{u.role === 'admin' ? 'Admin' : 'Pekerja'}</Badge></td>
                  <td><Status value={u.status} /></td>
                  <td>
                    <div className="flex justify-end gap-1.5">
                      <button className="icon-button" onClick={() => { setEditing(u); setOpen(true); }} data-testid={`button-edit-user-${u.id}`}><Pencil size={14} /></button>
                      <button className="icon-button icon-danger" onClick={() => setDeleting(u)} data-testid={`button-delete-user-${u.id}`}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {open && (
        <UserDialog
          user={editing}
          onClose={() => setOpen(false)}
          onSave={(data) => {
            if (editing) update.mutate({ id: editing.id, data }, { onSuccess: () => { setOpen(false); client.invalidateQueries({ queryKey: getListUsersQueryKey() }); } });
            else create.mutate({ data }, { onSuccess: () => { setOpen(false); client.invalidateQueries({ queryKey: getListUsersQueryKey() }); } });
          }}
        />
      )}
      {deleting && (
        <ConfirmModal
          title={`Hapus Pengguna "${deleting.name}"`}
          message={`Apakah Anda yakin ingin menghapus akun pengguna "${deleting.name}"? Akses login dan data riwayat pengguna ini akan dihentikan.`}
          confirmText="Hapus Pengguna"
          onConfirm={() => {
            remove.mutate({ id: deleting.id }, { onSuccess: () => client.invalidateQueries({ queryKey: getListUsersQueryKey() }) });
          }}
          onClose={() => setDeleting(null)}
        />
      )}
    </AppShell>
  );
}
function UserDialog({ user, onClose, onSave }: { user: User | null; onClose: () => void; onSave: (data: any) => void }) {
  const [username, setUsername] = useState(user?.name || '');
  const [email, setEmail] = useState((user as any)?.email || '');
  const [password, setPassword] = useState((user as any)?.password || '');
  const [status, setStatus] = useState<'active' | 'inactive'>(user?.status || 'active');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      onSave({
        name: username.trim(),
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim() || undefined,
        status,
      });
    } else {
      onSave({
        name: username.trim(),
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        role: 'worker',
        status: 'active',
      });
    }
  };

  return (
    <div className="modal-backdrop">
      <form className="modal max-w-md" onSubmit={handleSubmit}>
        <div className="flex items-start justify-between">
          <div>
            <div className="eyebrow">{user ? 'Edit akun pengguna' : 'Buat Akun Baru'}</div>
            <h3>{user ? 'Perbarui akses' : 'Tambah pengguna'}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {user
                ? 'Kelola username, email, dan kata sandi pengguna.'
                : 'Isi username, email, dan password untuk membuat akun login baru.'}
            </p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} data-testid="button-close-user">
            <X size={17} />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <Field label="Username" hint="Nama tampilan pengguna">
            <input
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Contoh: teknisi_budi"
              data-testid="input-user-username"
            />
          </Field>

          <Field label="Email" hint="Email untuk login ke dashboard">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@domain.com"
              data-testid="input-user-email"
            />
          </Field>

          <Field label="Password" hint={user ? "Kosongkan jika tidak ingin mengubah password" : "Password untuk login ke dashboard"}>
            <input
              type="password"
              required={!user}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={user ? "•••••••• (tidak diubah)" : "Masukkan password login"}
              data-testid="input-user-password"
            />
          </Field>

          {user && (
            <Field label="Status Akun">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
                data-testid="select-user-status"
              >
                <option value="active">Aktif (Dapat Login)</option>
                <option value="inactive">Nonaktif (Akses Ditutup)</option>
              </select>
            </Field>
          )}
        </div>

        <div className="mt-7 flex justify-end gap-2">
          <Button type="button" kind="outline" onClick={onClose} data-testid="button-cancel-user">
            Batal
          </Button>
          <Button type="submit" data-testid="button-save-user">
            <Check size={15} /> {user ? 'Simpan perubahan' : 'Buat akun'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function AdminBookingComponent() {
  const [tab, setTab] = useState<'layanan' | 'formulir' | 'preview' | 'tarif_nidi_slo'>('layanan');
  const [search, setSearch] = useState('');
  const [tariffSearch, setTariffSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<BookingService | null>(null);
  const [deletingService, setDeletingService] = useState<BookingService | null>(null);
  const [tariffModalOpen, setTariffModalOpen] = useState(false);
  const [editingTariff, setEditingTariff] = useState<NidiSloTariff | null>(null);
  const [deletingTariff, setDeletingTariff] = useState<NidiSloTariff | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetTariffsConfirmOpen, setResetTariffsConfirmOpen] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Queries & Mutations
  const configQuery = useGetBookingConfig();
  const servicesQuery = useListBookingServices();
  const tariffsQuery = useListNidiSloTariffs();
  const updateConfig = useUpdateBookingConfig();
  const createService = useCreateBookingService();
  const updateService = useUpdateBookingService();
  const deleteService = useDeleteBookingService();
  const createTariff = useCreateNidiSloTariff();
  const updateTariff = useUpdateNidiSloTariff();
  const deleteTariff = useDeleteNidiSloTariff();
  const resetTariffs = useResetNidiSloTariffs();

  const config = configQuery.data || DEFAULT_BOOKING_CONFIG;
  const services = servicesQuery.data || DEFAULT_BOOKING_SERVICES;
  const tariffs = tariffsQuery.data || [];

  // Local Form state for Tab 2
  const [configForm, setConfigForm] = useState<BookingConfig>(config);

  useEffect(() => {
    if (configQuery.data) {
      setConfigForm(configQuery.data);
    }
  }, [configQuery.data]);

  const updateConfigFormField = (key: keyof BookingConfig, value: any) => {
    setConfigForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig.mutate(configForm, {
      onSuccess: () => {
        setSaveSuccessMsg('Pengaturan formulir berhasil disimpan dan diterapkan!');
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      },
    });
  };

  const handleResetConfig = () => {
    setResetConfirmOpen(true);
  };

  const executeResetConfig = () => {
    setConfigForm(DEFAULT_BOOKING_CONFIG);
    updateConfig.mutate(DEFAULT_BOOKING_CONFIG, {
      onSuccess: () => {
        setSaveSuccessMsg('Konfigurasi formulir berhasil direset ke nilai default.');
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      },
    });
  };

  const handleToggleServiceActive = (service: BookingService) => {
    const nextStatus = service.isActive === 1 ? 0 : 1;
    updateService.mutate({
      id: service.id,
      data: { isActive: nextStatus },
    });
  };

  const handleDeleteService = (service: BookingService) => {
    setDeletingService(service);
  };

  const executeDeleteService = () => {
    if (!deletingService) return;
    deleteService.mutate(deletingService.id, {
      onSuccess: () => {
        setSaveSuccessMsg(`Layanan "${deletingService.name}" berhasil dihapus.`);
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      },
    });
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    services.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return ['Semua', ...Array.from(set)];
  }, [services]);

  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(search.toLowerCase())) ||
        (s.category && s.category.toLowerCase().includes(search.toLowerCase()));
      const matchCategory = selectedCategory === 'Semua' || s.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [services, search, selectedCategory]);

  return (
    <AppShell>
      <PageIntro
        eyebrow="Pengaturan Alur Pelanggan"
        title="Komponen Form Kunjungan (01)"
        body="Kelola teks, pilihan jenis layanan listrik (CRUD), tarif biaya kunjungan, dan opsi formulir yang tampil di beranda pelanggan."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/"
              target="_blank"
              className="btn btn-outline !px-3 !py-2 text-xs"
              data-testid="button-view-customer-page"
            >
              <ExternalLink size={14} /> Lihat di Beranda
            </Link>
            <Button
              kind="soft"
              onClick={() => {
                void configQuery.refetch();
                void servicesQuery.refetch();
              }}
              data-testid="button-refresh-booking-data"
            >
              <RefreshCw size={14} /> Segarkan
            </Button>
          </div>
        }
      />

      {saveSuccessMsg && (
        <div className="notice notice-info mb-6 rise-in flex items-center justify-between" role="status">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button onClick={() => setSaveSuccessMsg(null)} className="text-muted-foreground hover:text-foreground">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="admin-booking-tabs mb-6 flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setTab('layanan')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            tab === 'layanan'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
          data-testid="tab-booking-services"
        >
          <Wrench size={15} />
          <span>Pilihan Kebutuhan Layanan ({services.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('formulir')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            tab === 'formulir'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
          data-testid="tab-booking-form-settings"
        >
          <Sliders size={15} />
          <span>Teks & Opsi Formulir</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('preview')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            tab === 'preview'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
          data-testid="tab-booking-live-preview"
        >
          <Eye size={15} />
          <span>Live Preview Pelanggan</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('tarif_nidi_slo')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            tab === 'tarif_nidi_slo'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
          data-testid="tab-booking-nidi-slo-tariffs"
        >
          <Zap size={15} />
          <span>Tarif NIDI & SLO ({tariffs.length})</span>
        </button>
      </div>

      {/* TAB 1: CRUD LAYANAN */}
      {tab === 'layanan' && (
        <section className="space-y-6 rise-in">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              <div className="search-field">
                <Search size={15} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama layanan, deskripsi, atau kategori..."
                  data-testid="input-search-services"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                      selectedCategory === cat
                        ? 'bg-accent text-accent-foreground shadow-sm'
                        : 'bg-muted/70 text-muted-foreground hover:bg-muted'
                    }`}
                    data-testid={`filter-category-${cat}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={() => {
                setEditingService(null);
                setServiceModalOpen(true);
              }}
              className="!px-3.5 !py-2 text-xs whitespace-nowrap"
              data-testid="button-add-booking-service"
            >
              <Plus size={15} /> Tambah Layanan Baru
            </Button>
          </div>

          {servicesQuery.isLoading ? (
            <LoadingRows />
          ) : filteredServices.length === 0 ? (
            <Empty
              title="Tidak ada layanan ditemukan"
              body="Coba ubah kata kunci pencarian atau tambahkan jenis layanan listrik baru."
              action={
                <Button
                  kind="soft"
                  onClick={() => {
                    setSearch('');
                    setSelectedCategory('Semua');
                  }}
                >
                  Reset Filter
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredServices.map((service) => {
                const IconComponent = getServiceIcon(service.icon);
                return (
                  <div
                    key={service.id}
                    className={`booking-service-card relative flex flex-col justify-between rounded-2xl border p-5 transition-all ${
                      service.isActive === 1
                        ? 'border-border bg-card shadow-sm hover:border-accent/40'
                        : 'border-border/60 bg-card/60 opacity-70'
                    }`}
                    data-testid={`card-service-${service.id}`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
                            <IconComponent size={20} />
                          </div>
                          <div>
                            <span className="badge-neutral inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              {service.category || 'Umum'}
                            </span>
                            <h4 className="mt-0.5 text-sm font-bold text-foreground">{service.name}</h4>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleServiceActive(service)}
                          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-bold"
                          title={service.isActive === 1 ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'}
                          data-testid={`button-toggle-active-${service.id}`}
                        >
                          {service.isActive === 1 ? (
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                              <ToggleRight size={18} /> Aktif
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <ToggleLeft size={18} /> Nonaktif
                            </span>
                          )}
                        </button>
                      </div>

                      <p className="mt-3 text-xs leading-5 text-muted-foreground">
                        {service.description || 'Tidak ada deskripsi rinci.'}
                      </p>
                    </div>

                    <div className="mt-5 border-t border-border/60 pt-3">
                      <div className="flex items-center justify-between pt-1">
                        <span className="font-mono text-[10px] text-muted-foreground">
                          Urutan #{service.sortOrder}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingService(service);
                              setServiceModalOpen(true);
                            }}
                            className="btn btn-soft !px-2.5 !py-1 text-xs"
                            data-testid={`button-edit-service-${service.id}`}
                          >
                            <Pencil size={12} /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteService(service)}
                            className="icon-button icon-danger !size-7"
                            data-testid={`button-delete-service-${service.id}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: PENGATURAN TEKS & OPSI FORMULIR */}
      {tab === 'formulir' && (
        <section className="space-y-6 rise-in">
          <form onSubmit={handleSaveConfig} className="space-y-6">
            {/* Bagian A: Judul & Subjudul */}
            <div className="panel p-6">
              <div className="panel-head mb-4">
                <div>
                  <div className="eyebrow">Bagian 1</div>
                  <h3 className="text-base font-bold">Judul & Kicker Komponen</h3>
                  <p className="text-xs text-muted-foreground">
                    Menentukan penomoran langkah, judul kartu, dan deskripsi singkat di bagian atas form.
                  </p>
                </div>
                <Tag size={18} className="text-muted-foreground" />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field label="Nomor Langkah" hint="Contoh: 01">
                  <input
                    required
                    value={configForm.stepNumber}
                    onChange={(e) => updateConfigFormField('stepNumber', e.target.value)}
                    placeholder="01"
                    data-testid="input-config-step-number"
                  />
                </Field>

                <div className="md:col-span-2">
                  <Field label="Judul Komponen" hint="Teks utama formulir">
                    <input
                      required
                      value={configForm.title}
                      onChange={(e) => updateConfigFormField('title', e.target.value)}
                      placeholder="Ajukan kunjungan"
                      data-testid="input-config-title"
                    />
                  </Field>
                </div>

                <div className="md:col-span-3">
                  <Field label="Subjudul / Deskripsi Singkat" hint="Penjelasan ringkas alur setelah submit">
                    <input
                      required
                      value={configForm.subtitle}
                      onChange={(e) => updateConfigFormField('subtitle', e.target.value)}
                      placeholder="Isi detail singkat, kami lanjutkan lewat WhatsApp."
                      data-testid="input-config-subtitle"
                    />
                  </Field>
                </div>
              </div>
            </div>

            {/* Bagian B: Tarif & Pembayaran */}
            <div className="panel p-6">
              <div className="panel-head mb-4">
                <div>
                  <div className="eyebrow">Bagian 2</div>
                  <h3 className="text-base font-bold">Tarif Biaya Kunjungan & Tombol Submit</h3>
                  <p className="text-xs text-muted-foreground">
                    Tarif kedatangan teknisi dan label tombol aksi utama.
                  </p>
                </div>
                <Banknote size={18} className="text-muted-foreground" />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field label="Nominal Biaya Kunjungan (Rp)" hint="Biaya sebelum perbaikan">
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    required
                    value={configForm.visitFee}
                    onChange={(e) => updateConfigFormField('visitFee', Number(e.target.value))}
                    placeholder="25000"
                    data-testid="input-config-visit-fee"
                  />
                </Field>

                <Field label="Catatan Biaya Kunjungan" hint="Contoh: dibayar di muka">
                  <input
                    required
                    value={configForm.visitFeeNote}
                    onChange={(e) => updateConfigFormField('visitFeeNote', e.target.value)}
                    placeholder="dibayar di muka"
                    data-testid="input-config-visit-fee-note"
                  />
                </Field>

                <Field label="Teks Tombol Submit" hint="Contoh: Lanjut ke pembayaran">
                  <input
                    required
                    value={configForm.buttonText}
                    onChange={(e) => updateConfigFormField('buttonText', e.target.value)}
                    placeholder="Lanjut ke pembayaran"
                    data-testid="input-config-button-text"
                  />
                </Field>
              </div>
            </div>

            {/* Bagian C: Kontak WhatsApp Admin */}
            <div className="panel p-6">
              <div className="panel-head mb-4">
                <div>
                  <div className="eyebrow">Bagian 3</div>
                  <h3 className="text-base font-bold">Nomor WhatsApp Admin</h3>
                  <p className="text-xs text-muted-foreground">
                    Tujuan chat setelah pelanggan menyelesaikan pembayaran kunjungan.
                  </p>
                </div>
                <MessageCircle size={18} className="text-muted-foreground" />
              </div>

              <Field label="Nomor WhatsApp Admin (Kode Negara 62)" hint="Gunakan format internasional tanpa tanda +, contoh: 6281112345678">
                <input
                  required
                  value={configForm.adminWhatsapp}
                  onChange={(e) => updateConfigFormField('adminWhatsapp', e.target.value)}
                  placeholder="6281112345678"
                  data-testid="input-config-admin-whatsapp"
                />
              </Field>
            </div>

            {/* Bagian D: Placeholders & Petunjuk Input Form */}
            <div className="panel p-6">
              <div className="panel-head mb-4">
                <div>
                  <div className="eyebrow">Bagian 4</div>
                  <h3 className="text-base font-bold">Placeholder & Petunjuk Input Pelanggan</h3>
                  <p className="text-xs text-muted-foreground">
                    Kustomisasi teks panduan di setiap kolom isian form.
                  </p>
                </div>
                <FileEdit size={18} className="text-muted-foreground" />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Placeholder Nama Lengkap">
                  <input
                    value={configForm.namePlaceholder}
                    onChange={(e) => updateConfigFormField('namePlaceholder', e.target.value)}
                    placeholder="Contoh: Sinta Rahma"
                    data-testid="input-config-name-placeholder"
                  />
                </Field>

                <Field label="Placeholder Nomor WhatsApp">
                  <input
                    value={configForm.phonePlaceholder}
                    onChange={(e) => updateConfigFormField('phonePlaceholder', e.target.value)}
                    placeholder="08xx xxxx xxxx"
                    data-testid="input-config-phone-placeholder"
                  />
                </Field>

                <div className="md:col-span-2">
                  <Field label="Petunjuk (Hint) Nomor WhatsApp">
                    <input
                      value={configForm.phoneHint}
                      onChange={(e) => updateConfigFormField('phoneHint', e.target.value)}
                      placeholder="Gunakan nomor yang aktif menerima pesan"
                      data-testid="input-config-phone-hint"
                    />
                  </Field>
                </div>

                <div className="md:col-span-2">
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 text-xs">
                    <strong className="flex items-center gap-1.5 font-bold text-foreground mb-1">
                      <MapPin size={14} className="text-primary" /> Pemilih Wilayah Lokasi Berjenjang Aktif
                    </strong>
                    <p className="text-muted-foreground leading-relaxed">
                      Input alamat lama telah digantikan menjadi pilihan hierarki: Provinsi › Kabupaten/Kota › Kecamatan › Desa/Kelurahan. Anda dapat menambah, mengubah, atau menghapus daftar wilayah pada menu <strong>Kelola Wilayah</strong>.
                    </p>
                    <div className="mt-2.5">
                      <Link href="/admin/locations" className="btn btn-outline !px-3 !py-1 text-xs inline-flex items-center gap-1">
                        Buka Menu Kelola Wilayah <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                </div>

                <Field label="Teks Tombol GPS">
                  <input
                    value={configForm.gpsButtonText}
                    onChange={(e) => updateConfigFormField('gpsButtonText', e.target.value)}
                    placeholder="Ambil lokasi GPS"
                    data-testid="input-config-gps-btn"
                  />
                </Field>

                <Field label="Petunjuk (Hint) Titik GPS">
                  <input
                    value={configForm.gpsHint}
                    onChange={(e) => updateConfigFormField('gpsHint', e.target.value)}
                    placeholder="Bagikan lokasi agar teknisi menemukan alamat dengan tepat"
                    data-testid="input-config-gps-hint"
                  />
                </Field>

                {/* Toggles */}
                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3.5">
                  <div>
                    <strong className="text-xs">Aktifkan Pengambilan Lokasi GPS</strong>
                    <span className="block text-[11px] text-muted-foreground">
                      Tampilkan tombol penanda GPS browser di form
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateConfigFormField('enableGps', configForm.enableGps === 1 ? 0 : 1)}
                    className="text-primary"
                    data-testid="toggle-enable-gps"
                  >
                    {configForm.enableGps === 1 ? <ToggleRight size={24} /> : <ToggleLeft size={24} className="text-muted-foreground" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Submit & Reset Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <Button
                type="button"
                kind="outline"
                onClick={handleResetConfig}
                data-testid="button-reset-config"
              >
                <RotateCcw size={14} /> Reset ke Nilai Default
              </Button>

              <Button
                type="submit"
                disabled={updateConfig.isPending}
                data-testid="button-save-config"
              >
                <Save size={15} /> {updateConfig.isPending ? 'Menyimpan...' : 'Simpan Pengaturan Formulir'}
              </Button>
            </div>
          </form>
        </section>
      )}

      {/* TAB 3: LIVE PREVIEW */}
      {tab === 'preview' && (
        <section className="space-y-4 rise-in">
          <div className="notice notice-info flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} />
              <span>
                <strong>Mode Simulasi Tampilan:</strong> Preview ini mencerminkan teks & pilihan layanan aktif secara real-time seperti yang dilihat oleh pelanggan di beranda.
              </span>
            </div>
          </div>

          <div className="mx-auto max-w-xl rounded-3xl border border-border bg-card p-6 shadow-xl md:p-8">
            <div className="card-kicker mb-6">
              <span className="step-number">{configForm.stepNumber || '01'}</span>
              <div>
                <strong className="text-base">{configForm.title || 'Ajukan kunjungan'}</strong>
                <p className="text-xs text-muted-foreground">{configForm.subtitle || 'Isi detail singkat, kami lanjutkan lewat WhatsApp.'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <Field label="Nama lengkap">
                <input
                  disabled
                  placeholder={configForm.namePlaceholder || 'Contoh: Sinta Rahma'}
                  className="opacity-90"
                />
              </Field>

              <Field label="Nomor WhatsApp" hint={configForm.phoneHint || 'Gunakan nomor yang aktif menerima pesan'}>
                <input
                  disabled
                  placeholder={configForm.phonePlaceholder || '08xx xxxx xxxx'}
                  className="opacity-90"
                />
              </Field>

              <div className="space-y-1 opacity-90">
                <HierarchicalLocationSelector disabled onChange={() => {}} />
              </div>

              {configForm.enableGps === 1 && (
                <Field label="Titik lokasi GPS" hint={configForm.gpsHint || 'Bagikan lokasi agar teknisi menemukan alamat dengan tepat'}>
                  <div className="location-control">
                    <Button type="button" kind="outline" disabled>
                      <LocateFixed size={15} /> {configForm.gpsButtonText || 'Ambil lokasi GPS'}
                    </Button>
                  </div>
                </Field>
              )}

              <Field label="Kebutuhan layanan">
                <select defaultValue={services.filter((s) => s.isActive === 1)[0]?.name}>
                  {services
                    .filter((s) => s.isActive === 1)
                    .map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </Field>

              <Button type="button" className="w-full justify-center" disabled>
                {configForm.buttonText || 'Lanjut ke pembayaran'} <ArrowRight size={16} />
              </Button>

              <p className="text-center text-[11px] text-muted-foreground">
                Biaya kunjungan <strong className="text-foreground">{rupiah(configForm.visitFee || 25000)}</strong> · {configForm.visitFeeNote || 'dibayar di muka'}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* TAB 4: TARIF NIDI & SLO */}
      {tab === 'tarif_nidi_slo' && (
        <section className="space-y-6 rise-in">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex size-6 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-black">⚡</span>
                <h3 className="text-base font-bold">Rekap Harga SLO & Supervisi NIDI Tegangan Rendah (TR)</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Daftar 24 golongan daya listrik, biaya SLO resmi, supervisi NIDI, dan total tarif paket pelanggan.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="search-field !mt-0">
                <Search size={14} />
                <input
                  type="text"
                  value={tariffSearch}
                  onChange={(e) => setTariffSearch(e.target.value)}
                  placeholder="Cari daya (VA) / keterangan..."
                  className="!text-xs !py-1.5"
                  data-testid="input-search-admin-tariffs"
                />
              </div>

              <Button
                variant="outline"
                onClick={() => setResetTariffsConfirmOpen(true)}
                className="!px-3.5 !py-2 text-xs whitespace-nowrap text-amber-600 dark:text-amber-400"
                data-testid="button-reset-tariffs-seeder-tab"
              >
                <RotateCcw size={14} /> Muat Ulang Seeder (24 Daya)
              </Button>

              <Button
                onClick={() => {
                  setEditingTariff(null);
                  setTariffModalOpen(true);
                }}
                className="!px-3.5 !py-2 text-xs whitespace-nowrap"
                data-testid="button-add-tariff"
              >
                <Plus size={15} /> Tambah Golongan Daya
              </Button>
            </div>
          </div>

          {tariffsQuery.isLoading ? (
            <LoadingRows />
          ) : (
            <div className="table-scroll rounded-2xl border border-border bg-card">
              <table>
                <thead>
                  <tr>
                    <th className="w-12 text-center">No.</th>
                    <th>Golongan Daya (VA)</th>
                    <th>Biaya SLO (Rp)</th>
                    <th>Biaya Supervisi NIDI (Rp)</th>
                    <th>Total Biaya (Rp)</th>
                    <th>Rumus / Keterangan</th>
                    <th>Status</th>
                    <th className="text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {tariffs
                    .filter((t) => {
                      if (!tariffSearch.trim()) return true;
                      const q = tariffSearch.toLowerCase();
                      return (
                        t.powerLabel.toLowerCase().includes(q) ||
                        String(t.powerVa).includes(q) ||
                        (t.notes && t.notes.toLowerCase().includes(q))
                      );
                    })
                    .map((t, idx) => (
                      <tr key={t.id} data-testid={`row-admin-tariff-${t.id}`}>
                        <td className="text-center font-mono text-xs text-muted-foreground">
                          {t.sortOrder || idx + 1}
                        </td>
                        <td>
                          <span className="font-bold text-foreground text-xs">{t.powerLabel}</span>
                          <span className="block text-[11px] font-mono text-muted-foreground">
                            {t.powerVa.toLocaleString('id-ID')} VA
                          </span>
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
                              updateTariff.mutate({
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
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* TARIFF MODAL DIALOG */}
      {tariffModalOpen && (
        <TariffDialog
          tariff={editingTariff}
          onClose={() => {
            setTariffModalOpen(false);
            setEditingTariff(null);
          }}
          onSave={(data) => {
            if (editingTariff) {
              updateTariff.mutate(
                { id: editingTariff.id, data },
                {
                  onSuccess: () => {
                    setTariffModalOpen(false);
                    setEditingTariff(null);
                    setSaveSuccessMsg(`Tarif daya "${data.powerLabel || editingTariff.powerLabel}" berhasil diperbarui.`);
                    setTimeout(() => setSaveSuccessMsg(null), 4000);
                  },
                }
              );
            } else {
              createTariff.mutate(data, {
                onSuccess: () => {
                  setTariffModalOpen(false);
                  setEditingTariff(null);
                  setSaveSuccessMsg(`Tarif daya baru berhasil ditambahkan.`);
                  setTimeout(() => setSaveSuccessMsg(null), 4000);
                },
              });
            }
          }}
        />
      )}

      {/* SERVICE MODAL DIALOG */}
      {serviceModalOpen && (
        <ServiceDialog
          service={editingService}
          onClose={() => {
            setServiceModalOpen(false);
            setEditingService(null);
          }}
          onSave={(data) => {
            if (editingService) {
              updateService.mutate(
                { id: editingService.id, data },
                {
                  onSuccess: () => {
                    setServiceModalOpen(false);
                    setEditingService(null);
                    setSaveSuccessMsg(`Layanan "${data.name}" berhasil diperbarui.`);
                    setTimeout(() => setSaveSuccessMsg(null), 4000);
                  },
                }
              );
            } else {
              createService.mutate(data, {
                onSuccess: () => {
                  setServiceModalOpen(false);
                  setEditingService(null);
                  setSaveSuccessMsg(`Layanan baru "${data.name}" berhasil ditambahkan.`);
                  setTimeout(() => setSaveSuccessMsg(null), 4000);
                },
              });
            }
          }}
        />
      )}

      {resetConfirmOpen && (
        <ConfirmModal
          title="Reset Konfigurasi Formulir"
          message="Apakah Anda yakin ingin mengembalikan semua teks, judul, dan opsi formulir pemesanan ke nilai standar bawaan sistem?"
          confirmText="Reset ke Bawaan"
          kind="danger"
          onConfirm={executeResetConfig}
          onClose={() => setResetConfirmOpen(false)}
        />
      )}

      {deletingService && (
        <ConfirmModal
          title={`Hapus Layanan "${deletingService.name}"`}
          message={`Apakah Anda yakin ingin menghapus layanan "${deletingService.name}" dari daftar formulir pengajuan?`}
          confirmText="Hapus Layanan"
          kind="danger"
          onConfirm={executeDeleteService}
          onClose={() => setDeletingService(null)}
        />
      )}

      {deletingTariff && (
        <ConfirmModal
          title={`Hapus Golongan Daya "${deletingTariff.powerLabel}"`}
          message={`Apakah Anda yakin ingin menghapus tarif daya "${deletingTariff.powerLabel}" (${deletingTariff.powerVa.toLocaleString('id-ID')} VA) dari daftar rekap harga NIDI & SLO?`}
          confirmText="Hapus Tarif"
          kind="danger"
          onConfirm={() => {
            deleteTariff.mutate(deletingTariff.id, {
              onSuccess: () => {
                setDeletingTariff(null);
                setSaveSuccessMsg(`Tarif "${deletingTariff.powerLabel}" berhasil dihapus.`);
                setTimeout(() => setSaveSuccessMsg(null), 4000);
              },
            });
          }}
          onClose={() => setDeletingTariff(null)}
        />
      )}

      {resetTariffsConfirmOpen && (
        <ConfirmModal
          title="Muat Ulang Seeder Resmi 24 Tarif?"
          message="Apakah Anda yakin ingin memuat ulang 24 golongan daya resmi NIDI & SLO sesuai standar pemerintah? Perubahan manual sebelumnya akan diperbarui dengan data baku seeder."
          confirmText="Muat Ulang 24 Tarif"
          kind="danger"
          onConfirm={() => {
            resetTariffs.mutate(undefined, {
              onSuccess: () => {
                setResetTariffsConfirmOpen(false);
                setSaveSuccessMsg('24 Golongan daya resmi NIDI & SLO berhasil dimuat ulang!');
                setTimeout(() => setSaveSuccessMsg(null), 4000);
              },
            });
          }}
          onClose={() => setResetTariffsConfirmOpen(false)}
        />
      )}
    </AppShell>
  );
}

function TariffDialog({
  tariff,
  onClose,
  onSave,
}: {
  tariff: NidiSloTariff | null;
  onClose: () => void;
  onSave: (data: Partial<NidiSloTariff>) => void;
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
      <form className="modal max-w-lg" onSubmit={handleSubmit}>
        <div className="flex items-start justify-between">
          <div>
            <div className="eyebrow">{tariff ? 'Edit Tarif Golongan Daya' : 'Tambah Golongan Daya'}</div>
            <h3 className="text-base font-bold">
              {tariff ? `Tarif Daya ${tariff.powerLabel}` : 'Golongan Daya Baru'}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Kelola besaran biaya SLO dan Supervisi NIDI untuk golongan daya ini.
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

        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nomor Urut (Sort)" hint="Contoh: 1, 2, 3...">
              <input
                type="number"
                required
                min="1"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                data-testid="input-tariff-sort-order"
              />
            </Field>

            <Field label="Daya Listrik (VA)" hint="Angka saja (Contoh: 1300)">
              <input
                type="number"
                required
                min="1"
                value={powerVa}
                onChange={(e) => {
                  setPowerVa(e.target.value);
                  if (!powerLabel || powerLabel.endsWith('VA')) {
                    const num = Number(e.target.value);
                    if (num) setPowerLabel(`${num.toLocaleString('id-ID')} VA`);
                  }
                }}
                placeholder="1300"
                data-testid="input-tariff-power-va"
              />
            </Field>
          </div>

          <Field label="Label Tampilan Daya" hint="Contoh: 1.300 VA">
            <input
              type="text"
              required
              value={powerLabel}
              onChange={(e) => setPowerLabel(e.target.value)}
              placeholder="1.300 VA"
              data-testid="input-tariff-power-label"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Biaya SLO (Rp)" hint="Nominal SLO">
              <input
                type="number"
                required
                min="0"
                step="500"
                value={sloFee}
                onChange={(e) => setSloFee(e.target.value)}
                placeholder="120000"
                data-testid="input-tariff-slo-fee"
              />
            </Field>

            <Field label="Biaya Supervisi NIDI (Rp)" hint="Nominal Supervisi NIDI">
              <input
                type="number"
                required
                min="0"
                step="500"
                value={nidiFee}
                onChange={(e) => setNidiFee(e.target.value)}
                placeholder="130000"
                data-testid="input-tariff-nidi-fee"
              />
            </Field>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-center justify-between text-xs">
            <span className="font-bold text-foreground">Total Biaya Pelanggan:</span>
            <span className="font-mono text-sm font-black text-primary">
              {rupiah(totalFeeCalc)}
            </span>
          </div>

          <Field label="Rumus / Catatan Penjelasan" hint="Opsional (contoh: SLO Rp35/VA, NIDI Rp100/VA)">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Tarif tetap TR 1.300 VA"
              data-testid="input-tariff-notes"
            />
          </Field>

          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3">
            <span className="text-xs font-medium">Status Tampil di Form Pelanggan</span>
            <button
              type="button"
              onClick={() => setIsActive(isActive === 1 ? 0 : 1)}
              className="text-primary"
              data-testid="toggle-tariff-status"
            >
              {isActive === 1 ? <ToggleRight size={24} /> : <ToggleLeft size={24} className="text-muted-foreground" />}
            </button>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-4">
          <Button type="button" kind="outline" onClick={onClose} data-testid="button-cancel-tariff">
            Batal
          </Button>
          <Button type="submit" data-testid="button-save-tariff">
            <Save size={14} /> Simpan Tarif
          </Button>
        </div>
      </form>
    </div>
  );
}

function ServiceDialog({
  service,
  onClose,
  onSave,
}: {
  service: BookingService | null;
  onClose: () => void;
  onSave: (data: Partial<BookingService>) => void;
}) {
  const [name, setName] = useState(service?.name || '');
  const [category, setCategory] = useState(service?.category || 'Perbaikan');
  const [description, setDescription] = useState(service?.description || '');
  const [estimatedPrice, setEstimatedPrice] = useState(
    service?.estimatedPrice ? String(service.estimatedPrice) : ''
  );
  const [estimatedDuration, setEstimatedDuration] = useState(
    service?.estimatedDuration || '1 - 2 Jam'
  );
  const [icon, setIcon] = useState(service?.icon || 'Wrench');
  const [isActive, setIsActive] = useState<number>(service?.isActive ?? 1);
  const [sortOrder, setSortOrder] = useState<number>(service?.sortOrder ?? 1);

  const availableIcons = [
    { name: 'Wrench', label: 'Kunci / Perbaikan', Icon: Wrench },
    { name: 'Zap', label: 'Listrik / Petir', Icon: Zap },
    { name: 'Activity', label: 'Panel / Aktivitas', Icon: Activity },
    { name: 'ShieldCheck', label: 'Pemeriksaan / Audit', Icon: ShieldCheck },
    { name: 'Plus', label: 'Penambahan / Titik', Icon: Plus },
    { name: 'Sparkles', label: 'Khusus / Upgrade', Icon: Sparkles },
    { name: 'AlertTriangle', label: 'Darurat / Bahaya', Icon: AlertTriangle },
    { name: 'Boxes', label: 'Peralatan / Komponen', Icon: Boxes },
    { name: 'Settings2', label: 'Setting / Kalibrasi', Icon: Settings2 },
  ];

  const categorySuggestions = ['Perbaikan', 'Pemasangan', 'Pemeriksaan', 'Panel & Daya', 'Darurat', 'Lainnya'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: name.trim(),
      category: category.trim(),
      description: description.trim() || null,
      estimatedPrice: estimatedPrice ? Number(estimatedPrice) : null,
      estimatedDuration: estimatedDuration.trim() || null,
      icon,
      isActive,
      sortOrder: Number(sortOrder) || 1,
    });
  };

  return (
    <div className="modal-backdrop">
      <form className="modal max-h-[90vh] overflow-y-auto" onSubmit={handleSubmit}>
        <div className="flex items-start justify-between">
          <div>
            <div className="eyebrow">{service ? 'Edit Layanan' : 'Layanan Baru'}</div>
            <h3 className="text-base font-bold">
              {service ? 'Perbarui Detail Layanan' : 'Tambah Jenis Layanan Listrik'}
            </h3>
            <p className="text-xs text-muted-foreground">
              Layanan ini akan langsung muncul pada pilihan dropdown formulir pelanggan.
            </p>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            data-testid="button-close-service-modal"
          >
            <X size={17} />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <Field label="Nama Layanan" hint="Nama yang tampil pada pilihan formulir pelanggan">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Perbaikan stop kontak & saklar"
              data-testid="input-service-name"
            />
          </Field>

          <Field label="Kategori Layanan">
            <div className="space-y-2">
              <input
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Contoh: Perbaikan"
                data-testid="input-service-category"
              />
              <div className="flex flex-wrap gap-1">
                {categorySuggestions.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    + {cat}
                  </button>
                ))}
              </div>
            </div>
          </Field>

          <Field label="Deskripsi Ringkas Layanan" hint="Jelaskan cakupan perbaikan atau instalasi ini">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Mengatasi stop kontak longgar, kabel hangus, atau penambahan titik saklar baru."
              className="min-h-[80px]"
              data-testid="input-service-description"
            />
          </Field>

          <Field label="Pilih Ikon Layanan">
            <div className="grid grid-cols-3 gap-2">
              {availableIcons.map(({ name: iconKey, label: iconLabel, Icon: AvailableIcon }) => (
                <button
                  key={iconKey}
                  type="button"
                  onClick={() => setIcon(iconKey)}
                  className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition-all ${
                    icon === iconKey
                      ? 'border-accent bg-accent/15 text-accent shadow-sm'
                      : 'border-border bg-card/60 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <AvailableIcon size={18} />
                  <span className="text-[10px] font-semibold leading-tight">{iconLabel}</span>
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Urutan Tampilan">
              <input
                type="number"
                min="1"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                data-testid="input-service-sort-order"
              />
            </Field>

            <Field label="Status Aktif">
              <select
                value={isActive}
                onChange={(e) => setIsActive(Number(e.target.value))}
                data-testid="select-service-status"
              >
                <option value={1}>Aktif (Tampil di Form)</option>
                <option value={0}>Nonaktif (Disembunyikan)</option>
              </select>
            </Field>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
          <Button
            type="button"
            kind="outline"
            onClick={onClose}
            data-testid="button-cancel-service-dialog"
          >
            Batal
          </Button>
          <Button type="submit" data-testid="button-save-service-dialog">
            <Check size={15} /> Simpan Layanan
          </Button>
        </div>
      </form>
    </div>
  );
}

function WorkerHome() {
  const client = useQueryClient();
  const requestsQuery = useListServiceRequests();
  const workersQuery = useListWorkers();
  const update = useUpdateServiceRequest();

  const workers = workersQuery.data ?? [];
  const session = getAuthSession();
  const matchedWorker = workers.find((w) => w.name.toLowerCase() === session?.name?.toLowerCase());
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);

  const currentWorker = workers.find((w) => w.id === (selectedWorkerId ?? matchedWorker?.id ?? workers[0]?.id)) ?? workers[0];
  const activeWorkerId = currentWorker?.id ?? 1;

  const requests = (requestsQuery.data ?? []).filter((r) => r.assignedWorkerId === activeWorkerId);
  const report = requests.find((r) => r.status === 'on_site');
  const activeCount = requests.filter((r) => !['completed', 'cancelled'].includes(r.status)).length;

  const currentDateStr = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const hour = new Date().getHours();
  const timeGreeting = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam';
  const workerName = currentWorker?.name || session?.name || 'Teknisi';

  const startVisit = (id: number) =>
    update.mutate(
      { id, data: { status: 'on_site' } },
      {
        onSuccess: () => {
          client.invalidateQueries({ queryKey: getListServiceRequestsQueryKey() });
          client.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        },
      }
    );

  return (
    <AppShell role="worker">
      <PageIntro
        eyebrow={currentDateStr}
        title="Kunjungan Saya"
        body={`${timeGreeting}, ${workerName}. Berikut tugas yang perlu Anda siapkan hari ini.`}
        action={
          <div className="flex items-center gap-2">
            {workers.length > 1 && (
              <select
                className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground font-medium shadow-sm outline-none focus:border-accent"
                value={activeWorkerId}
                onChange={(e) => setSelectedWorkerId(Number(e.target.value))}
                data-testid="select-active-worker"
              >
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    Teknisi: {w.name} ({w.specialty})
                  </option>
                ))}
              </select>
            )}
            <Button kind="soft" onClick={() => requestsQuery.refetch()} data-testid="button-refresh-worker">
              <RefreshCw size={15} /> Segarkan
            </Button>
          </div>
        }
      />

      <div className="worker-banner">
        <div>
          <div className="eyebrow text-primary font-bold">Tugas Aktif Teknisi</div>
          <h2>{activeCount} Kunjungan Perlu Perhatian</h2>
          <p>Pastikan detail lokasi dan catatan pelanggan sudah terbaca sebelum berangkat.</p>
        </div>
        <div className="worker-banner-icon">
          <NavigationIcon />
        </div>
      </div>

      <div className="section-label">
        <span>Daftar kunjungan {currentWorker ? `(${currentWorker.name})` : ''}</span>
        <Badge tone="neutral">{requests.length} tugas</Badge>
      </div>

      <div className="visit-list">
        {requests.length === 0 ? (
          <div className="panel text-center py-10 text-muted-foreground text-sm">
            Tidak ada tugas kunjungan yang ditugaskan untuk {currentWorker?.name || 'teknisi ini'}.
          </div>
        ) : (
          requests.map((r) => (
            <div className="visit-card" key={r.id} data-testid={`card-visit-${r.id}`}>
              <div className="visit-time">
                <span>{r.status === 'completed' ? 'Selesai' : 'Hari ini'}</span>
                <strong>
                  {r.status === 'on_site'
                    ? 'Sedang dikerjakan'
                    : r.status === 'waiting_approval'
                    ? 'Menunggu cek admin'
                    : '08.30 — 10.00'}
                </strong>
              </div>
              <div className="visit-main">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono text-[10px] font-bold text-accent">{r.code}</span>
                    <h3>{r.serviceType}</h3>
                  </div>
                  <Status value={r.status} />
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin size={13} /> {r.address}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  <UserRound size={13} className="mr-1 inline" /> {r.customerName} · {r.whatsapp}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {r.status === 'assigned' && (
                    <Button
                      className="!px-3 !py-2 text-xs"
                      onClick={() => startVisit(r.id)}
                      disabled={update.isPending}
                      data-testid={`button-start-visit-${r.id}`}
                    >
                      <MapPin size={14} /> Mulai kunjungan
                    </Button>
                  )}
                  {r.status === 'on_site' && (
                    <Link
                      href={`/worker/reports?request=${r.id}`}
                      className="btn btn-primary !px-3 !py-2 text-xs"
                      data-testid={`link-report-${r.id}`}
                    >
                      <FileText size={14} /> Buat laporan
                    </Link>
                  )}
                  <a
                    href={`https://www.google.com/maps?q=${r.latitude},${r.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline !px-3 !py-2 text-xs"
                    data-testid={`link-worker-map-${r.id}`}
                  >
                    <MapPin size={14} /> Buka lokasi
                  </a>
                  <a
                    href={`https://wa.me/${r.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline !px-3 !py-2 text-xs"
                    data-testid={`link-worker-whatsapp-${r.id}`}
                  >
                    <MessageCircle size={14} /> WhatsApp pelanggan
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {report && (
        <div className="notice notice-info mt-6">
          <Sparkles size={16} />
          <span>
            <strong>Laporan dibutuhkan</strong> Kunjungan {report.code} sedang berlangsung. Catat hasil sebelum meninggalkan lokasi.
          </span>
        </div>
      )}
    </AppShell>
  );
}

function NavigationIcon() {
  return (
    <div className="relative inline-flex items-center justify-center size-10 shrink-0">
      <MapPin size={38} strokeWidth={1.5} className="text-foreground" />
      <span className="absolute top-[11px] left-1/2 -translate-x-1/2 size-2.5 rounded-full bg-primary shadow-sm" />
    </div>
  );
}

function ReportDetailModal({ report, onClose }: { report: FieldReportItem; onClose: () => void }) {
  const hasCoords = typeof report.latitude === 'number' && typeof report.longitude === 'number';
  const mapsUrl = hasCoords
    ? `https://www.google.com/maps?q=${report.latitude},${report.longitude}`
    : report.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(report.address)}`
    : '#';
  const waUrl = formatWhatsAppUrl(report.whatsapp, report.customerName || undefined, report.requestCode || undefined, report.serviceType || undefined);

  return (
    <div className="modal-backdrop">
      <div className="modal max-h-[90vh] overflow-y-auto max-w-2xl">
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div>
            <div className="eyebrow text-accent">Laporan Lapangan · {report.requestCode || `ID #${report.id}`}</div>
            <h3 className="text-lg font-bold">Detail Laporan Penugasan</h3>
            <p className="text-xs text-muted-foreground">
              Dikirim pada {time(report.createdAt)} oleh{' '}
              <strong className="text-foreground">{report.assignedWorkerName || 'Pekerja Lapangan'}</strong>
            </p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} data-testid="button-close-report-modal">
            <X size={17} />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {/* Metadata Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/80 bg-muted/30 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pelanggan</span>
              <strong className="block text-sm font-semibold text-foreground mt-0.5">{report.customerName || '-'}</strong>
              {report.whatsapp && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                  data-testid="link-modal-whatsapp"
                >
                  <MessageCircle size={13} /> {report.whatsapp}
                </a>
              )}
            </div>

            <div className="rounded-xl border border-border/80 bg-muted/30 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Teknisi Bertugas</span>
              <strong className="block text-sm font-semibold text-foreground mt-0.5">{report.assignedWorkerName || 'Pekerja Lapangan'}</strong>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <BriefcaseBusiness size={12} /> Status: <Status value={report.requestStatus || 'in_progress'} />
              </div>
            </div>
          </div>

          {/* Service & Location */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-accent">{report.serviceType || 'Perbaikan Listrik'}</span>
              {report.repairCost ? (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Biaya Perbaikan: {rupiah(report.repairCost)}
                </span>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">{report.address}</p>
            {report.address && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent/10 hover:text-accent transition-colors mt-1"
                data-testid="link-modal-maps"
              >
                <MapPin size={13} className="text-red-500" /> Buka Lokasi GPS Google Maps <ExternalLink size={11} />
              </a>
            )}
          </div>

          {/* Report Notes */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <FileText size={14} className="text-primary" /> Catatan Hasil Inspeksi & Pekerjaan
            </h4>
            <div className="rounded-xl border border-border bg-muted/20 p-4 text-xs font-normal leading-relaxed text-foreground whitespace-pre-wrap">
              {report.notes}
            </div>
          </div>

          {/* Media Attachments with Live Preview & Direct Download */}
          <ReportMediaGrid
            mediaStrings={report.media}
            title="Lampiran Dokumentasi Foto & Berkas Pekerja"
          />
        </div>

        <div className="mt-6 flex justify-end border-t border-border pt-4">
          <Button type="button" kind="outline" onClick={onClose} data-testid="button-close-report-modal-footer">
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
}

function AdminReports() {
  const reportsQuery = useListFieldReports();
  const [filter, setFilter] = useState<'all' | 'media'>('all');
  const [search, setSearch] = useState('');
  const [selectedReport, setSelectedReport] = useState<FieldReportItem | null>(null);

  const reports = reportsQuery.data ?? [];

  const shown = reports.filter((r) => {
    const matchSearch = `${r.requestCode || ''} ${r.customerName || ''} ${r.assignedWorkerName || ''} ${r.notes || ''} ${r.serviceType || ''}`
      .toLowerCase()
      .includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === 'media') return r.media && r.media.length > 0;
    return true;
  });

  const mediaCount = reports.filter((r) => r.media && r.media.length > 0).length;
  const uniqueWorkers = new Set(reports.map((r) => r.assignedWorkerName).filter(Boolean)).size;

  return (
    <AppShell>
      <PageIntro
        eyebrow="Laporan Lapangan"
        title="Laporan Penugasan"
        body="Pantau hasil pekerjaan, rincian inspeksi, dan dokumentasi foto/video yang dikirim oleh pekerja dari lokasi kunjungan pelanggan."
        action={
          <Button onClick={() => reportsQuery.refetch()} kind="soft" data-testid="button-refresh-reports">
            <RefreshCw size={15} /> Segarkan data
          </Button>
        }
      />

      {/* Metrics Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <span className="text-xs font-medium text-muted-foreground">Total Laporan Masuk</span>
          <div className="mt-1 flex items-baseline gap-2">
            <strong className="text-2xl font-bold">{reports.length}</strong>
            <span className="text-xs text-muted-foreground">laporan</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <span className="text-xs font-medium text-muted-foreground">Laporan Berlampiran Foto/Media</span>
          <div className="mt-1 flex items-baseline gap-2">
            <strong className="text-2xl font-bold text-accent">{mediaCount}</strong>
            <span className="text-xs text-muted-foreground">dokumentasi</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <span className="text-xs font-medium text-muted-foreground">Teknisi Aktif Melapor</span>
          <div className="mt-1 flex items-baseline gap-2">
            <strong className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{uniqueWorkers}</strong>
            <span className="text-xs text-muted-foreground">pekerja</span>
          </div>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-tabs">
          {[
            ['all', `Semua (${reports.length})`],
            ['media', `Ada Media Foto (${mediaCount})`],
          ].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilter(v as typeof filter)}
              className={filter === v ? 'filter-active' : ''}
              data-testid={`button-filter-report-${v}`}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="search-field">
          <Search size={15} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari teknisi, kode request, nama pelanggan, atau catatan..."
            data-testid="input-search-reports"
          />
        </div>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>{shown.length} laporan ditemukan</h3>
            <p className="text-xs text-muted-foreground">Daftar laporan lapangan urut dari yang terbaru</p>
          </div>
          <FileText size={18} className="text-muted-foreground" />
        </div>

        {reportsQuery.isLoading ? (
          <LoadingRows />
        ) : reportsQuery.isError ? (
          <ErrorNotice retry={reportsQuery.refetch} />
        ) : !shown.length ? (
          <Empty
            title="Belum ada laporan penugasan"
            body="Laporan yang dikirim oleh pekerja melalui aplikasi lapangan akan ditampilkan di sini."
          />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Waktu Laporan</th>
                  <th>Kode / Pelanggan</th>
                  <th>Pekerja Lapangan</th>
                  <th>Layanan & Lokasi (GPS)</th>
                  <th>Catatan Inspeksi</th>
                  <th>Lampiran</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((report) => {
                  const hasCoords = typeof report.latitude === 'number' && typeof report.longitude === 'number';
                  const mapsUrl = hasCoords
                    ? `https://www.google.com/maps?q=${report.latitude},${report.longitude}`
                    : report.address
                    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(report.address)}`
                    : '#';
                  const waUrl = formatWhatsAppUrl(report.whatsapp, report.customerName || undefined, report.requestCode || undefined, report.serviceType || undefined);

                  return (
                    <tr key={report.id} data-testid={`row-report-${report.id}`}>
                      <td>
                        <span className="block text-xs font-semibold text-foreground">{date(report.createdAt)}</span>
                        <span className="block text-[11px] text-muted-foreground">{time(report.createdAt)}</span>
                      </td>
                      <td>
                        <strong className="block font-mono text-xs text-primary">{report.requestCode || `ID #${report.requestId}`}</strong>
                        <span className="mt-0.5 block text-sm font-semibold text-foreground">{report.customerName || '-'}</span>
                        {report.whatsapp && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                            data-testid={`link-wa-report-${report.id}`}
                          >
                            <MessageCircle size={11} /> {report.whatsapp}
                          </a>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="avatar avatar-sm bg-accent/20 text-accent font-bold">
                            {(report.assignedWorkerName || 'Pekerja').split(' ').map((v) => v[0]).join('').slice(0, 2)}
                          </span>
                          <span className="text-xs font-semibold text-foreground">
                            {report.assignedWorkerName || 'Pekerja Lapangan'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="block max-w-[200px] truncate text-xs font-bold text-foreground">
                          {report.serviceType || '-'}
                        </span>
                        {report.address && (
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex max-w-[220px] items-center gap-1 text-[11px] text-muted-foreground hover:text-accent group"
                            data-testid={`link-maps-report-${report.id}`}
                          >
                            <MapPin size={11} className="shrink-0 text-red-500" />
                            <span className="truncate">{report.address}</span>
                          </a>
                        )}
                      </td>
                      <td>
                        <p className="max-w-[260px] line-clamp-2 text-xs text-foreground/90 leading-relaxed font-normal">
                          {report.notes}
                        </p>
                      </td>
                      <td>
                        {report.media && report.media.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-0.5 text-[11px] font-bold text-accent w-fit">
                              <Paperclip size={11} /> {report.media.length} berkas
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedReport(report)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline w-fit text-left"
                              data-testid={`button-preview-report-table-${report.id}`}
                            >
                              <Eye size={11} /> Live Preview & Unduh
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Tidak ada</span>
                        )}
                      </td>
                      <td className="text-right">
                        <Button
                          kind="soft"
                          className="!px-2.5 !py-1.5 text-[11px]"
                          onClick={() => setSelectedReport(report)}
                          data-testid={`button-view-report-${report.id}`}
                        >
                          <Eye size={13} /> Lihat Detail
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedReport && (
        <ReportDetailModal report={selectedReport} onClose={() => setSelectedReport(null)} />
      )}
    </AppShell>
  );
}

function AssignmentDetailModal({
  request,
  worker,
  report,
  onClose,
}: {
  request: ServiceRequest;
  worker?: Worker;
  report?: FieldReportItem;
  onClose: () => void;
}) {
  const workerName = request.assignedWorkerName || worker?.name || 'Belum Ditugaskan';
  const hasCoords = typeof request.latitude === 'number' && typeof request.longitude === 'number';
  const mapsUrl = hasCoords
    ? `https://www.google.com/maps?q=${request.latitude},${request.longitude}`
    : request.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(request.address)}`
    : '#';
  const waUrl = formatWhatsAppUrl(request.whatsapp, request.customerName, request.code, request.serviceType);

  return (
    <div className="modal-backdrop">
      <div className="modal max-w-2xl">
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div>
            <div className="eyebrow font-mono">Kode Penugasan · {request.code}</div>
            <h3 className="text-lg font-bold">Detail Riwayat Penugasan</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Dibuat pada {time(request.createdAt)}</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} data-testid="button-close-assignment-detail">
            <X size={17} />
          </button>
        </div>

        <div className="mt-5 space-y-5 max-h-[75vh] overflow-y-auto pr-1">
          {/* Header Status & Worker Badge */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <span className="avatar bg-primary/15 text-primary font-bold text-sm">
                {workerName.split(' ').map((v) => v[0]).join('').slice(0, 2)}
              </span>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Teknisi Penanggung Jawab
                </span>
                <strong className="text-sm font-bold text-foreground">{workerName}</strong>
                {worker?.phone && <span className="block text-xs text-muted-foreground">{worker.phone}</span>}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Status Saat Ini
              </span>
              <Status value={request.status} />
            </div>
          </div>

          {/* Customer & Location */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-3.5 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <UserRound size={12} className="text-primary" /> Informasi Pelanggan
              </span>
              <p className="text-sm font-bold text-foreground">{request.customerName}</p>
              {request.whatsapp && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  <MessageCircle size={13} /> {request.whatsapp}
                </a>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-3.5 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Wrench size={12} className="text-accent" /> Layanan Yang Diminta
              </span>
              <p className="text-sm font-bold text-foreground">{request.serviceType}</p>
              <p className="text-xs text-muted-foreground">Biaya Kunjungan: {rupiah(25000)}</p>
            </div>
          </div>

          {/* Address & GPS */}
          <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <MapPin size={12} className="text-red-500" /> Alamat Lokasi Kunjungan
            </span>
            <p className="text-xs text-foreground leading-relaxed">{request.address}</p>
            {request.address && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent/10 hover:text-accent transition-colors"
              >
                <MapPin size={13} className="text-red-500" /> Buka Titik GPS Google Maps <ExternalLink size={11} />
              </a>
            )}
          </div>

          {/* Inspection Report from Worker if available */}
          {report ? (
            <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <FileText size={15} className="text-primary" /> Laporan Inspeksi Pekerja
                </span>
                <span className="text-[11px] text-muted-foreground">{time(report.createdAt)}</span>
              </div>
              <div className="rounded-xl border border-border/80 bg-card p-3 text-xs text-foreground/90 leading-relaxed font-normal whitespace-pre-wrap">
                {report.notes}
              </div>
              {report.media && report.media.length > 0 && (
                <div className="pt-2">
                  <ReportMediaGrid
                    mediaStrings={report.media}
                    title="Dokumentasi Foto / Media Hasil Pekerjaan"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/80 p-4 text-center">
              <p className="text-xs text-muted-foreground italic">
                Belum ada laporan inspeksi tertulis yang diunggah oleh pekerja untuk penugasan ini.
              </p>
            </div>
          )}

          {/* Financial summary */}
          <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Total Ringkasan Biaya
              </span>
              <span className="text-xs text-muted-foreground">Kunjungan + Biaya Perbaikan</span>
            </div>
            <strong className="text-base font-bold text-foreground font-mono">
              {rupiah(25000 + (request.repairCost || 0))}
            </strong>
          </div>
        </div>

        <div className="mt-6 flex justify-end border-t border-border pt-4">
          <Button type="button" kind="outline" onClick={onClose} data-testid="button-close-assignment-detail-footer">
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
}

function AdminAssignmentHistory() {
  const requestsQuery = useListServiceRequests();
  const workersQuery = useListWorkers();
  const reportsQuery = useListFieldReports();

  const [workerFilter, setWorkerFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState<ServiceRequest | null>(null);

  const requests = requestsQuery.data ?? [];
  const workers = workersQuery.data ?? [];
  const reports = reportsQuery.data ?? [];

  // Map of worker IDs to Worker object for easy lookup
  const workerMap = useMemo(() => {
    const map = new Map<number, Worker>();
    workers.forEach((w) => map.set(w.id, w));
    return map;
  }, [workers]);

  // Map of requestId to FieldReport for quick inspection report preview
  const reportMap = useMemo(() => {
    const map = new Map<number, FieldReportItem>();
    reports.forEach((rep) => map.set(rep.requestId, rep));
    return map;
  }, [reports]);

  // Filter requests that have been assigned or processed
  const assignedRequests = useMemo(() => {
    return requests.filter((r) => r.assignedWorkerId || r.assignedWorkerName || r.status !== 'waiting_payment');
  }, [requests]);

  // Stats
  const countTotal = assignedRequests.length;
  const countCompleted = assignedRequests.filter((r) => r.status === 'completed').length;
  const countOnSite = assignedRequests.filter((r) => r.status === 'on_site').length;
  const countCancelled = assignedRequests.filter((r) => r.status === 'cancelled').length;

  // Filtering
  const shown = useMemo(() => {
    return assignedRequests.filter((r) => {
      // Worker filter
      if (workerFilter !== 'all') {
        const selectedWorkerId = Number(workerFilter);
        if (r.assignedWorkerId !== selectedWorkerId && r.assignedWorkerName !== workerFilter) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'on_site') {
          if (r.status !== 'on_site') return false;
        } else if (r.status !== statusFilter) {
          return false;
        }
      }

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const workerName = r.assignedWorkerName || workerMap.get(r.assignedWorkerId || 0)?.name || '';
        const match = `${r.code} ${r.customerName} ${workerName} ${r.serviceType} ${r.address} ${r.whatsapp}`
          .toLowerCase()
          .includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [assignedRequests, workerFilter, statusFilter, search, workerMap]);

  return (
    <AppShell>
      <PageIntro
        eyebrow="Operasional & Evaluasi Tim"
        title="Riwayat Penugasan"
        body="Pantau histori penugasan pekerja: berapa banyak tugas selesai, penugasan yang dibatalkan, serta kunjungan pekerja ke lokasi pelanggan."
        action={
          <Button
            onClick={() => {
              void requestsQuery.refetch();
              void workersQuery.refetch();
              void reportsQuery.refetch();
            }}
            kind="soft"
            data-testid="button-refresh-assignment-history"
          >
            <RefreshCw size={15} /> Segarkan data
          </Button>
        }
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <span className="text-xs font-medium text-muted-foreground">Total Penugasan</span>
          <div className="mt-1 flex items-baseline gap-2">
            <strong className="text-2xl font-bold">{countTotal}</strong>
            <span className="text-xs text-muted-foreground">penugasan</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <span className="text-xs font-medium text-muted-foreground">Selesai Dikerjakan</span>
          <div className="mt-1 flex items-baseline gap-2">
            <strong className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{countCompleted}</strong>
            <span className="text-xs text-muted-foreground">kunjungan selesai</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <span className="text-xs font-medium text-muted-foreground">Di Lokasi / Kunjungan</span>
          <div className="mt-1 flex items-baseline gap-2">
            <strong className="text-2xl font-bold text-blue-600 dark:text-blue-400">{countOnSite}</strong>
            <span className="text-xs text-muted-foreground">sedang bertugas</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <span className="text-xs font-medium text-muted-foreground">Dibatalkan</span>
          <div className="mt-1 flex items-baseline gap-2">
            <strong className="text-2xl font-bold text-amber-600 dark:text-amber-400">{countCancelled}</strong>
            <span className="text-xs text-muted-foreground">batal</span>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="filter-bar flex-wrap gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Pills */}
          <div className="filter-tabs">
            {[
              ['all', `Semua (${assignedRequests.length})`],
              ['completed', `Selesai (${countCompleted})`],
              ['on_site', `Di Lokasi / Kunjungan (${countOnSite})`],
              ['cancelled', `Dibatalkan (${countCancelled})`],
            ].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setStatusFilter(v)}
                className={statusFilter === v ? 'filter-active' : ''}
                data-testid={`button-filter-status-${v}`}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Worker Dropdown Filter */}
          <div className="flex items-center gap-1.5 pl-2">
            <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">Pekerja:</span>
            <select
              value={workerFilter}
              onChange={(e) => setWorkerFilter(e.target.value)}
              className="h-9 min-w-[150px] rounded-xl border border-border bg-card px-3 text-xs font-semibold"
              data-testid="select-filter-worker"
            >
              <option value="all">Semua Pekerja ({workers.length})</option>
              {workers.map((w) => (
                <option key={w.id} value={String(w.id)}>
                  {w.name} ({w.specialty || 'Teknisi'})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="search-field">
          <Search size={15} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama pekerja, kode, pelanggan, atau lokasi..."
            data-testid="input-search-assignment-history"
          />
        </div>
      </div>

      {/* Table Panel */}
      <section className="panel mt-6">
        <div className="panel-head">
          <div>
            <h3>{shown.length} Riwayat Penugasan</h3>
            <p className="text-xs text-muted-foreground">
              {workerFilter !== 'all'
                ? `Filter Pekerja: ${workers.find((w) => String(w.id) === workerFilter)?.name || workerFilter}`
                : 'Menampilkan riwayat penugasan pekerja di lokasi pelanggan'}
            </p>
          </div>
          <BriefcaseBusiness size={18} className="text-muted-foreground" />
        </div>

        {requestsQuery.isLoading || workersQuery.isLoading ? (
          <LoadingRows />
        ) : !shown.length ? (
          <Empty
            title="Tidak ada riwayat penugasan"
            body="Tidak ada data penugasan yang sesuai dengan kriteria filter atau pencarian Anda."
          />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Waktu / Kode</th>
                  <th>Pekerja / Teknisi</th>
                  <th>Pelanggan & WhatsApp</th>
                  <th>Layanan & Lokasi GPS</th>
                  <th>Status Penugasan</th>
                  <th>Biaya / Kunjungan</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((req) => {
                  const workerObj = workerMap.get(req.assignedWorkerId || 0);
                  const workerName = req.assignedWorkerName || workerObj?.name || 'Belum Ditugaskan';
                  const workerSpecialty = workerObj?.specialty || 'Teknisi Lapangan';
                  const report = reportMap.get(req.id);

                  const hasCoords = typeof req.latitude === 'number' && typeof req.longitude === 'number';
                  const mapsUrl = hasCoords
                    ? `https://www.google.com/maps?q=${req.latitude},${req.longitude}`
                    : req.address
                    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(req.address)}`
                    : '#';
                  const waUrl = formatWhatsAppUrl(req.whatsapp, req.customerName, req.code, req.serviceType);

                  return (
                    <tr key={req.id} data-testid={`row-assignment-${req.id}`}>
                      <td>
                        <strong className="block font-mono text-xs text-primary">{req.code}</strong>
                        <span className="block text-[11px] text-muted-foreground">{time(req.createdAt)}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="avatar avatar-sm bg-primary/15 text-primary font-bold">
                            {workerName.split(' ').map((v) => v[0]).join('').slice(0, 2)}
                          </span>
                          <div>
                            <strong className="block text-xs font-bold text-foreground">{workerName}</strong>
                            <span className="text-[10px] text-muted-foreground">{workerSpecialty}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <strong className="block text-xs font-bold text-foreground">{req.customerName}</strong>
                        {req.whatsapp && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                            data-testid={`link-wa-assignment-${req.id}`}
                          >
                            <MessageCircle size={11} /> {req.whatsapp}
                          </a>
                        )}
                      </td>
                      <td>
                        <span className="block max-w-[200px] truncate text-xs font-bold text-foreground">
                          {req.serviceType}
                        </span>
                        {req.address && (
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-0.5 inline-flex max-w-[200px] items-center gap-1 text-[11px] text-muted-foreground hover:text-accent"
                            data-testid={`link-maps-assignment-${req.id}`}
                          >
                            <MapPin size={11} className="shrink-0 text-red-500" />
                            <span className="truncate">{req.address}</span>
                          </a>
                        )}
                      </td>
                      <td>
                        <Status value={req.status} />
                      </td>
                      <td>
                        {req.status === 'completed' && req.repairCost ? (
                          <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {rupiah(req.repairCost)}
                          </span>
                        ) : req.status === 'on_site' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                            <MapPin size={11} /> Kunjungan Lokasi
                          </span>
                        ) : req.status === 'cancelled' ? (
                          <span className="text-[11px] font-semibold text-muted-foreground italic">Dibatalkan</span>
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground">{rupiah(25000)} (Kunjungan)</span>
                        )}
                        {report && report.media && report.media.length > 0 && (
                          <span className="mt-1 flex items-center gap-1 text-[10px] font-bold text-accent">
                            <Paperclip size={10} /> {report.media.length} foto laporan
                          </span>
                        )}
                      </td>
                      <td className="text-right">
                        <Button
                          kind="soft"
                          className="!px-2.5 !py-1.5 text-[11px]"
                          onClick={() => setSelectedAssignment(req)}
                          data-testid={`button-view-assignment-${req.id}`}
                        >
                          <Eye size={13} /> Detail
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Assignment Detail Modal */}
      {selectedAssignment && (
        <AssignmentDetailModal
          request={selectedAssignment}
          worker={workerMap.get(selectedAssignment.assignedWorkerId || 0)}
          report={reportMap.get(selectedAssignment.id)}
          onClose={() => setSelectedAssignment(null)}
        />
      )}
    </AppShell>
  );
}

function WorkerReports() {
  const client = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const queryParamRequestId = Number(params.get('request')) || 0;
  const requestsQuery = useListServiceRequests();
  const reportsQuery = useListFieldReports();
  const workersQuery = useListWorkers();
  const create = useCreateFieldReport();

  const workers = workersQuery.data ?? [];
  const allServiceRequests = requestsQuery.data ?? [];
  const targetFromParam = queryParamRequestId ? allServiceRequests.find((r) => r.id === queryParamRequestId) : undefined;

  const session = getAuthSession();
  const matchedWorker = workers.find((w) => w.name.toLowerCase() === session?.name?.toLowerCase());
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);
  const activeWorkerId = selectedWorkerId ?? targetFromParam?.assignedWorkerId ?? matchedWorker?.id ?? workers[0]?.id ?? 1;

  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [requestId, setRequestId] = useState(queryParamRequestId);
  const [notes, setNotes] = useState('');
  const [media, setMedia] = useState<string[]>([]);
  const [selectedReport, setSelectedReport] = useState<FieldReportItem | null>(null);

  const requests = useMemo(() => {
    return allServiceRequests.filter((r) => {
      if (queryParamRequestId && r.id === queryParamRequestId) return true;
      return (
        r.assignedWorkerId === activeWorkerId &&
        ['on_site', 'assigned', 'waiting_approval', 'in_progress'].includes(r.status)
      );
    });
  }, [allServiceRequests, activeWorkerId, queryParamRequestId]);

  const allReports = reportsQuery.data ?? [];
  const myReports = allReports.filter((r) => r.assignedWorkerId === activeWorkerId || !r.assignedWorkerId);

  useEffect(() => {
    if (queryParamRequestId && requests.some((r) => r.id === queryParamRequestId)) {
      setRequestId(queryParamRequestId);
    } else if (requests.length > 0 && (!requestId || !requests.some((r) => r.id === requestId))) {
      setRequestId(requests[0].id);
    }
  }, [requests, requestId, queryParamRequestId]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestId) return;
    create.mutate(
      { id: requestId, data: { notes, media } },
      {
        onSuccess: () => {
          setNotes('');
          setMedia([]);
          client.invalidateQueries({ queryKey: getListServiceRequestsQueryKey() });
          client.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          client.invalidateQueries({ queryKey: ['field-reports'] });
          setActiveTab('history');
        },
      }
    );
  };

  return (
    <AppShell role="worker">
      <PageIntro
        eyebrow="Bukti Pekerjaan"
        title="Laporan Lapangan"
        body="Kirim laporan hasil perbaikan di lokasi dan lihat riwayat laporan yang sudah Anda selesaikan."
        action={
          workers.length > 1 ? (
            <select
              className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground font-medium shadow-sm outline-none focus:border-accent"
              value={activeWorkerId}
              onChange={(e) => setSelectedWorkerId(Number(e.target.value))}
              data-testid="select-report-worker"
            >
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  Teknisi: {w.name}
                </option>
              ))}
            </select>
          ) : undefined
        }
      />

      <div className="filter-bar mb-6">
        <div className="filter-tabs">
          <button
            onClick={() => setActiveTab('create')}
            className={activeTab === 'create' ? 'filter-active' : ''}
            data-testid="tab-create-report"
          >
            <FileText size={14} className="inline mr-1" /> Buat Laporan Baru
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={activeTab === 'history' ? 'filter-active' : ''}
            data-testid="tab-history-report"
          >
            <Clock3 size={14} className="inline mr-1" /> Riwayat Laporan ({myReports.length})
          </button>
        </div>
      </div>

      {activeTab === 'create' && (
        <div className="report-layout">
          <form className="panel report-form" onSubmit={submit}>
            <div className="panel-head">
              <div>
                <h3>Laporan Baru</h3>
                <p className="text-xs text-muted-foreground">Satu laporan untuk satu permintaan yang sedang dikerjakan.</p>
              </div>
              <FileText size={18} className="text-muted-foreground" />
            </div>
            <div className="space-y-5">
              <Field label="Permintaan Pekerjaan">
                {requests.length > 0 ? (
                  <select
                    value={requestId}
                    onChange={(e) => setRequestId(Number(e.target.value))}
                    data-testid="select-report-request"
                  >
                    {requests.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.code} · {r.customerName} ({r.serviceType})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-700 dark:text-amber-300">
                    Tidak ada kunjungan berstatus "Di lokasi" yang membutuhkan laporan saat ini. Anda dapat melihat riwayat laporan yang sudah dibuat pada tab <strong>"Riwayat Laporan"</strong>.
                  </div>
                )}
              </Field>

              <Field label="Catatan Pekerjaan" hint="Jelaskan temuan, tindakan, dan rekomendasi selanjutnya.">
                <textarea
                  required
                  minLength={8}
                  className="min-h-[170px]"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Pemeriksaan MCB selesai. Ditemukan koneksi longgar pada jalur AC..."
                  data-testid="input-report-notes"
                />
              </Field>

              <Field
                label="Foto & Dokumen Hasil Pekerjaan"
                hint="Unggah foto MCB, instalasi listrik, atau berkas pendukung (JPG, PNG, PDF). Admin dapat mempratinjau (live preview) dan mengunduh berkas ini langsung dari dashboard."
              >
                <WorkerMediaUploader value={media} onChange={setMedia} />
              </Field>
            </div>

            <Button
              type="submit"
              className="mt-7 w-full justify-center"
              disabled={create.isPending || requests.length === 0}
              data-testid="button-submit-report"
            >
              {create.isPending ? 'Menyimpan laporan...' : <><Send size={15} /> Simpan Laporan</>}
            </Button>
          </form>

          <div className="panel report-side">
            <div className="eyebrow">Checklist Sebelum Kirim</div>
            <h3>Detail Yang Membantu Tim</h3>
            {['Kondisi awal dan temuan', 'Tindakan yang sudah dilakukan', 'Material atau biaya tambahan', 'Rekomendasi untuk pelanggan'].map((item) => (
              <div className="check-row" key={item}>
                <span><Check size={13} /></span>
                {item}
              </div>
            ))}
            <div className="report-tip">
              <ShieldCheck size={18} />
              <span>Foto yang jelas membantu admin membuat keputusan persetujuan biaya lebih cepat.</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <section className="panel space-y-4">
          <div className="panel-head">
            <div>
              <h3>Daftar Laporan Pekerjaan</h3>
              <p className="text-xs text-muted-foreground">Semua laporan penugasan yang telah dikerjakan dan dikirimkan.</p>
            </div>
            <FileText size={18} className="text-muted-foreground" />
          </div>

          {reportsQuery.isLoading ? (
            <LoadingRows />
          ) : !myReports.length ? (
            <Empty
              title="Belum ada riwayat laporan"
              body="Laporan yang Anda kirim setelah menyelesaikan kunjungan akan tersimpan di sini."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {myReports.map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-sm hover:border-accent transition-colors"
                  data-testid={`card-my-report-${r.id}`}
                >
                  <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-3">
                    <div>
                      <span className="font-mono text-xs font-bold text-accent">{r.requestCode || `Req #${r.requestId}`}</span>
                      <h4 className="text-sm font-bold text-foreground mt-0.5">{r.customerName || 'Pelanggan'}</h4>
                      <span className="text-[11px] text-muted-foreground">{time(r.createdAt)}</span>
                    </div>
                    <Status value={r.requestStatus || 'completed'} />
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="font-semibold text-foreground">{r.serviceType}</p>
                    {r.address && <p className="flex items-center gap-1 truncate"><MapPin size={12} className="text-red-500" /> {r.address}</p>}
                  </div>

                  <div className="rounded-xl bg-muted/40 p-3 text-xs text-foreground/90 leading-relaxed font-normal">
                    <strong className="block text-[10px] uppercase text-muted-foreground mb-1">Catatan Hasil Inspeksi:</strong>
                    <p className="line-clamp-3">{r.notes}</p>
                  </div>

                  {r.media && r.media.length > 0 && (
                    <div className="pt-2">
                      <ReportMediaGrid
                        mediaStrings={r.media}
                        title="Lampiran Media"
                        showDownloadAll={false}
                      />
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <Button
                      kind="soft"
                      className="!px-2.5 !py-1 text-[11px]"
                      onClick={() => setSelectedReport(r)}
                      data-testid={`button-view-my-report-${r.id}`}
                    >
                      <Eye size={12} /> Lihat Detail
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {selectedReport && (
        <ReportDetailModal report={selectedReport} onClose={() => setSelectedReport(null)} />
      )}
    </AppShell>
  );
}

function WorkerEquipment() {
  const client = useQueryClient();
  const query = useListEquipmentRequests();
  const workersQuery = useListWorkers();
  const create = useCreateEquipmentRequest();

  const workers = workersQuery.data ?? [];
  const session = getAuthSession();
  const matchedWorker = workers.find((w) => w.name.toLowerCase() === session?.name?.toLowerCase());
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);
  const activeWorkerId = selectedWorkerId ?? matchedWorker?.id ?? workers[0]?.id ?? 1;

  const [form, setForm] = useState({ item: '', quantity: '1', urgency: 'normal' as 'normal' | 'urgent' });
  const rows = (query.data || []).filter((r) => r.workerId === activeWorkerId || !r.workerId);

  return (
    <AppShell role="worker">
      <PageIntro
        eyebrow="Kesiapan lapangan"
        title="Peralatan"
        body="Minta alat yang Anda perlukan sebelum pekerjaan dimulai."
        action={
          workers.length > 1 ? (
            <select
              className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground font-medium shadow-sm outline-none focus:border-accent"
              value={activeWorkerId}
              onChange={(e) => setSelectedWorkerId(Number(e.target.value))}
              data-testid="select-equipment-worker"
            >
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  Teknisi: {w.name}
                </option>
              ))}
            </select>
          ) : undefined
        }
      />
      <div className="report-layout">
        <form
          className="panel"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate(
              { data: { workerId: activeWorkerId, item: form.item, quantity: Number(form.quantity), urgency: form.urgency } },
              {
                onSuccess: () => {
                  setForm({ item: '', quantity: '1', urgency: 'normal' });
                  client.invalidateQueries({ queryKey: getListEquipmentRequestsQueryKey() });
                },
              }
            );
          }}
        >
          <div className="panel-head">
            <div>
              <h3>Ajukan peralatan</h3>
              <p className="text-xs text-muted-foreground">Admin akan meninjau permintaan Anda.</p>
            </div>
            <Plus size={18} className="text-muted-foreground" />
          </div>
          <div className="space-y-4">
            <Field label="Nama peralatan">
              <input
                required
                value={form.item}
                onChange={(e) => setForm({ ...form, item: e.target.value })}
                placeholder="Contoh: Tespen digital"
                data-testid="input-equipment-item"
              />
            </Field>
            <Field label="Jumlah">
              <input
                required
                min="1"
                type="number"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                data-testid="input-equipment-quantity"
              />
            </Field>
            <Field label="Urgensi">
              <select
                value={form.urgency}
                onChange={(e) => setForm({ ...form, urgency: e.target.value as typeof form.urgency })}
                data-testid="select-equipment-urgency"
              >
                <option value="normal">Normal</option>
                <option value="urgent">Mendesak</option>
              </select>
            </Field>
          </div>
          <Button type="submit" className="mt-7 w-full justify-center" disabled={create.isPending} data-testid="button-submit-equipment">
            <Send size={15} /> Kirim permintaan
          </Button>
        </form>
        <div className="panel">
          <div className="panel-head">
            <div>
              <h3>Riwayat saya</h3>
              <p className="text-xs text-muted-foreground">Status permintaan peralatan.</p>
            </div>
            <PackageCheck size={18} className="text-muted-foreground" />
          </div>
          {rows.length ? (
            <div className="equipment-list">
              {rows.map((r) => (
                <div className="equipment-row !px-0" key={r.id}>
                  <span className="equipment-symbol">
                    <Wrench size={16} />
                  </span>
                  <div className="flex-1">
                    <strong className="text-sm">{r.item}</strong>
                    <p>
                      {r.quantity} unit · {date(r.createdAt)}
                    </p>
                  </div>
                  <Status value={r.status} />
                </div>
              ))}
            </div>
          ) : (
            <Empty title="Belum ada pengajuan" body="Riwayat permintaan Anda akan muncul di sini." />
          )}
        </div>
      </div>
    </AppShell>
  );
}

function NotFound() { return <div className="grid min-h-[100dvh] place-items-center bg-background p-6 text-center"><div><Logo /><h1 className="mt-10">Halaman tidak ditemukan</h1><p className="mt-2 text-sm text-muted-foreground">Rute ini belum tersedia di ruang kerja SEIIKI.</p><Link href="/" className="btn btn-primary mt-6 inline-flex" data-testid="link-not-found-home">Kembali ke beranda</Link></div></div>; }

function AdminHomeRoute() { return <AuthGate role="admin"><AdminHome /></AuthGate>; }
function AdminRequestsRoute() { return <AuthGate role="admin"><AdminRequests /></AuthGate>; }
function AdminAssignmentHistoryRoute() { return <AuthGate role="admin"><AdminAssignmentHistory /></AuthGate>; }
function AdminReportsRoute() { return <AuthGate role="admin"><AdminReports /></AuthGate>; }
function AdminSettingsRoute() { return <AuthGate role="admin"><AppShell><AdminSettings /></AppShell></AuthGate>; }
function AdminCmsRoute() { return <AuthGate role="admin"><AppShell><AdminCms /></AppShell></AuthGate>; }
function AdminBookingComponentRoute() { return <AuthGate role="admin"><AdminBookingComponent /></AuthGate>; }
function AdminTransactionsRoute() { return <AuthGate role="admin"><AdminTransactions /></AuthGate>; }
function AdminEquipmentRoute() { return <AuthGate role="admin"><AdminEquipment /></AuthGate>; }
function AdminLocationsRoute() { return <AuthGate role="admin"><AppShell><AdminLocations /></AppShell></AuthGate>; }
function AdminUsersRoute() { return <AuthGate role="admin"><AdminUsers /></AuthGate>; }
function WorkerHomeRoute() { return <AuthGate role="worker"><WorkerHome /></AuthGate>; }
function WorkerEquipmentRoute() { return <AuthGate role="worker"><WorkerEquipment /></AuthGate>; }
function WorkerReportsRoute() { return <AuthGate role="worker"><WorkerReports /></AuthGate>; }
function AppRoutes() {
  return (
    <ErrorBoundary resetKey={window.location.pathname}>
      <Switch>
        <Route path="/" component={CustomerHome} />
        <Route path="/login" component={LoginPage} />
        <Route path="/admin" component={AdminHomeRoute} />
        <Route path="/admin/requests" component={AdminRequestsRoute} />
        <Route path="/admin/assignment-history" component={AdminAssignmentHistoryRoute} />
        <Route path="/admin/reports" component={AdminReportsRoute} />
        <Route path="/admin/settings" component={AdminSettingsRoute} />
        <Route path="/admin/cms" component={AdminCmsRoute} />
        <Route path="/admin/booking-component" component={AdminBookingComponentRoute} />
        <Route path="/admin/locations" component={AdminLocationsRoute} />
        <Route path="/admin/transactions" component={AdminTransactionsRoute} />
        <Route path="/admin/equipment" component={AdminEquipmentRoute} />
        <Route path="/admin/users" component={AdminUsersRoute} />
        <Route path="/worker" component={WorkerHomeRoute} />
        <Route path="/worker/equipment" component={WorkerEquipmentRoute} />
        <Route path="/worker/reports" component={WorkerReportsRoute} />
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}

function App() {
  return <WouterRouter base={basePath}><QueryClientProvider client={queryClient}><TooltipProvider><AppRoutes /><Toaster /></TooltipProvider></QueryClientProvider></WouterRouter>;
}
export default App;