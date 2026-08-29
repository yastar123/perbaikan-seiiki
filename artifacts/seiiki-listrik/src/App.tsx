import { useState, useEffect, useMemo } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { Link, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import * as XLSX from 'xlsx';
import {
  Activity, AlertTriangle, ArrowRight, BadgeCheck, Banknote, BarChart3, Bell, Boxes, BriefcaseBusiness,
  CalendarDays, Check, CheckCircle2, ChevronDown, ClipboardCheck, Clock3, Download, ExternalLink, Eye, FileEdit, FileText,
  Headphones, HelpCircle, History, Info, Layers, LayoutDashboard, LocateFixed, LogIn, LogOut, MapPin, Menu,
  MessageCircle, PackageCheck, Paperclip, Pencil, Plus, Radio, ReceiptText, RefreshCw, RotateCcw,
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

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
type DemoRole = 'admin' | 'worker';
type DemoSession = { role: DemoRole; email: string; name: string };
const DEMO_SESSION_KEY = 'seiiki-demo-session';
const DEMO_ACCOUNTS: Record<DemoRole, DemoSession & { password: string; label: string; description: string }> = {
  admin: {
    role: 'admin',
    email: 'admin@seiiki.id',
    password: 'admin123',
    name: 'Ayu Pratami',
    label: 'Admin operasional',
    description: 'Kelola permintaan, transaksi, pengguna, dan tim lapangan.',
  },
  worker: {
    role: 'worker',
    email: 'pekerja@seiiki.id',
    password: 'pekerja123',
    name: 'Budi Santoso',
    label: 'Pekerja lapangan',
    description: 'Lihat kunjungan, kirim laporan, dan ajukan peralatan.',
  },
};
function getDemoSession(): DemoSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = JSON.parse(window.localStorage.getItem(DEMO_SESSION_KEY) || 'null') as DemoSession | null;
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
    estimatedPrice: 75000,
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
    estimatedPrice: 60000,
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
    estimatedPrice: 100000,
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
    estimatedPrice: 120000,
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
function DemoLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const fillDemo = (role: DemoRole) => {
    const account = DEMO_ACCOUNTS[role];
    setEmail(account.email);
    setPassword(account.password);
    setError('');
  };
  const signIn = (event: React.FormEvent) => {
    event.preventDefault();
    const account = Object.values(DEMO_ACCOUNTS).find((candidate) => candidate.email === email.trim().toLowerCase() && candidate.password === password);
    if (!account) {
      setError('Email atau kata sandi demo belum sesuai. Pilih salah satu akun di bawah.');
      return;
    }
    window.localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify({ role: account.role, email: account.email, name: account.name }));
    setLocation(account.role === 'admin' ? '/admin' : '/worker');
  };
  return <div className="auth-page app-noise min-h-[100dvh]">
    <header className="auth-header"><Logo /><Link href="/" className="btn btn-outline !px-3 !py-2 text-xs" data-testid="link-back-home">Kembali ke beranda</Link></header>
    <main className="auth-content">
      <section className="auth-intro rise-in">
        <div className="eyebrow"><span className="status-dot bg-accent" /> Akses ruang kerja SEIIKI</div>
        <h1>Masuk ke<br /><em>ruang tim.</em></h1>
        <p>Gunakan salah satu akun demo untuk melihat alur kerja admin atau pekerja lapangan.</p>
        <div className="auth-note"><ShieldCheck size={17} /><span><strong>Mode demo aman</strong><small>Data login hanya disimpan di browser ini.</small></span></div>
      </section>
      <section className="auth-card panel rise-in delay-1">
        <div className="panel-head"><div><div className="eyebrow">Login demo</div><h3>Selamat datang kembali</h3><p className="text-xs text-muted-foreground">Masukkan kredensial demo untuk melanjutkan.</p></div><LogIn size={19} className="text-accent" /></div>
        <form onSubmit={signIn} className="space-y-4">
          <Field label="Email"><input type="email" autoComplete="email" required value={email} onChange={(event) => { setEmail(event.target.value); setError(''); }} placeholder="nama@seiiki.id" data-testid="input-demo-email" /></Field>
          <Field label="Kata sandi"><input type="password" autoComplete="current-password" required value={password} onChange={(event) => { setPassword(event.target.value); setError(''); }} placeholder="Masukkan kata sandi" data-testid="input-demo-password" /></Field>
          {error && <div className="notice notice-error" role="alert"><X size={15} /> {error}</div>}
          <Button type="submit" className="w-full justify-center" data-testid="button-demo-login">Masuk ke dashboard <ArrowRight size={16} /></Button>
        </form>
        <div className="demo-divider"><span>atau pilih akun demo</span></div>
        <div className="demo-account-grid">{Object.values(DEMO_ACCOUNTS).map((account) => <button type="button" key={account.role} className="demo-account" onClick={() => fillDemo(account.role)} data-testid={`button-demo-${account.role}`}><span className={`demo-account-icon demo-account-${account.role}`}>{account.role === 'admin' ? <ShieldCheck size={17} /> : <Wrench size={17} />}</span><span className="text-left"><strong>{account.label}</strong><small>{account.email}</small><small>{account.description}</small></span><ArrowRight size={15} className="ml-auto text-muted-foreground" /></button>)}</div>
        <p className="auth-credentials">Admin: <strong>admin123</strong> · Pekerja: <strong>pekerja123</strong></p>
      </section>
    </main>
  </div>;
}
function AuthGate({ role, children }: { role: DemoRole; children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const session = getDemoSession();
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

const adminNav = [
  { href: '/admin', label: 'Ringkasan operasi', icon: LayoutDashboard },
  { href: '/admin/requests', label: 'Permintaan kunjungan', icon: ClipboardCheck },
  { href: '/admin/assignment-history', label: 'Riwayat Penugasan', icon: History },
  { href: '/admin/reports', label: 'Laporan Penugasan', icon: FileText },
  { href: '/admin/booking-component', label: 'Form Pengajuan (01)', icon: SlidersHorizontal },
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
  const session = getDemoSession();
  const displayName = session?.name || (role === 'admin' ? 'Admin SEIIKI' : 'Pekerja lapangan');
  const initials = displayName.split(/\s+/).map((value) => value[0]).join('').slice(0, 2).toUpperCase();
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
    window.localStorage.removeItem(DEMO_SESSION_KEY);
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
      <nav className="mt-3 space-y-1">{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMenu(false)} className={`side-link ${location === href ? 'side-link-active' : ''}`} data-testid={`link-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon size={17} /><span>{label}</span>{href === '/admin/requests' && <span className="ml-auto grid size-5 place-items-center rounded-full bg-primary text-[10px] font-extrabold text-primary-foreground">4</span>}</Link>)}</nav>
      <div className="sidebar-bottom">
        <button type="button" onClick={logout} className="side-link w-full text-sidebar-foreground/55" data-testid="button-demo-logout"><LogOut size={17} /><span>Keluar</span></button>
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
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Kode / Pelanggan</th>
            <th>WhatsApp</th>
            <th>Layanan & Alamat (GPS)</th>
            <th>Status</th>
            <th>Biaya Perbaikan (Rp)</th>
            <th>Pembayaran</th>
            <th>Teknisi</th>
            <th className="text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {requests.slice(0, compact ? 4 : undefined).map((r) => {
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
                      className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                      title="Klik untuk ubah biaya perbaikan"
                      data-testid={`button-cost-${r.id}`}
                    >
                      {rupiah(r.repairCost)}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onManage && onManage(r)}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary underline decoration-dashed"
                      title="Klik untuk isi biaya perbaikan"
                      data-testid={`button-input-cost-${r.id}`}
                    >
                      <Pencil size={11} /> Isi biaya
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

function CustomerHome() {
  const create = useCreateServiceRequest();
  const pay = useCreateVisitPayment();
  const configQuery = useGetBookingConfig();
  const servicesQuery = useListBookingServices();

  const config = configQuery.data || DEFAULT_BOOKING_CONFIG;
  const allServices = servicesQuery.data || DEFAULT_BOOKING_SERVICES;
  const activeServices = allServices.filter((s) => s.isActive === 1);

  const [submitted, setSubmitted] = useState<ServiceRequest | null>(null);
  const [paid, setPaid] = useState(false);
  const [form, setForm] = useState({
    customerName: '',
    whatsapp: '',
    address: '',
    serviceType: activeServices[0]?.name || 'Perbaikan listrik rumah',
    notes: '',
  });

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
    create.mutate({ data: { ...form, ...location } }, { onSuccess: (request) => setSubmitted(request) });
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
          <a href="#alur" data-testid="link-customer-flow">Cara kerja</a>
          <a href="#aman" data-testid="link-customer-safety">Jaminan kami</a>
          <Link href="/admin" className="text-foreground" data-testid="link-customer-dashboard">
            Akses tim <ArrowRight size={13} className="ml-1 inline" />
          </Link>
        </div>
        <Link href="/admin" className="btn btn-outline !px-3 !py-2 text-xs md:hidden" data-testid="link-mobile-dashboard">
          Akses tim
        </Link>
      </header>

      <section className="customer-hero">
        <div className="hero-copy rise-in">
          <div className="eyebrow">
            <span className="status-dot bg-accent" /> Layanan listrik yang datang siap kerja
          </div>
          <h1>Masalah listrik,<br /><em>kami urus.</em></h1>
          <p>Teknisi terverifikasi datang ke lokasi Anda dengan alur yang jelas, biaya kunjungan pasti, dan admin yang selalu bisa dihubungi.</p>
          <div className="hero-proof">
            <span><ShieldCheck size={17} /> Teknisi terverifikasi</span>
            <span><Clock3 size={17} /> Respon di hari yang sama</span>
          </div>
        </div>

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

              <Field label="Alamat lokasi">
                <textarea
                  required
                  minLength={4}
                  value={form.address}
                  onChange={(e) => set('address', e.target.value)}
                  placeholder={config.addressPlaceholder || 'Alamat lengkap, patokan, dan lantai bila ada'}
                  data-testid="input-customer-address"
                />
              </Field>

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

              <Field label="Kebutuhan layanan">
                <select
                  value={form.serviceType}
                  onChange={(e) => set('serviceType', e.target.value)}
                  data-testid="select-service-type"
                >
                  {activeServices.length > 0 ? (
                    activeServices.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))
                  ) : (
                    <option value="Perbaikan listrik umum">Perbaikan listrik umum</option>
                  )}
                </select>
              </Field>

              {geoState === 'error' && config.enableGps === 1 && (
                <div className="notice notice-error">
                  <MapPin size={15} /> Izinkan akses lokasi di browser untuk mengirim permintaan.
                </div>
              )}

              <Button
                type="submit"
                className="w-full justify-center"
                disabled={create.isPending || geoState === 'loading'}
                data-testid="button-submit-request"
              >
                {create.isPending ? 'Mengirim permintaan...' : (
                  <>{config.buttonText || 'Lanjut ke pembayaran'} <ArrowRight size={16} /></>
                )}
              </Button>

              <p className="text-center text-[11px] text-muted-foreground">
                Biaya kunjungan <strong className="text-foreground">{rupiah(config.visitFee || 25000)}</strong> · {config.visitFeeNote || 'dibayar di muka'}
              </p>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="success-panel">
                <BadgeCheck size={25} />
                <div>
                  <strong>Permintaan tercatat</strong>
                  <p>Kode Anda <b>{submitted.code}</b>. Selesaikan pembayaran untuk mengunci jadwal kunjungan.</p>
                </div>
              </div>

              {!paid ? (
                <>
                  <div className="payment-line">
                    <span>
                      <span className="block text-xs font-bold">Biaya kunjungan</span>
                      <span className="text-[11px] text-muted-foreground">Sekali bayar, belum termasuk perbaikan</span>
                    </span>
                    <strong>{rupiah(submitted.visitFee || config.visitFee || 25000)}</strong>
                  </div>

                  <div className="method-grid">
                    {[
                      ['qris', 'QRIS'],
                      ['bank_transfer', 'Transfer bank'],
                      ['e_wallet', 'E-wallet'],
                    ].map(([v, label]) => (
                      <button
                        type="button"
                        key={v}
                        onClick={() => setMethod(v as typeof method)}
                        className={`method-option ${method === v ? 'method-selected' : ''}`}
                        data-testid={`button-payment-${v}`}
                      >
                        <span className="method-radio" />
                        {label}
                      </button>
                    ))}
                  </div>

                  <Button
                    className="w-full justify-center"
                    onClick={() =>
                      pay.mutate(
                        { requestId: submitted.id, data: { method } },
                        { onSuccess: () => setPaid(true) }
                      )
                    }
                    disabled={pay.isPending}
                    data-testid="button-pay-visit"
                  >
                    {pay.isPending ? 'Memproses pembayaran...' : (
                      <>Bayar {rupiah(submitted.visitFee || config.visitFee || 25000)} <ArrowRight size={16} /></>
                    )}
                  </Button>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="success-panel">
                    <Check size={25} />
                    <div>
                      <strong>Pembayaran berhasil</strong>
                      <p>Admin SEIIKI akan menghubungi Anda melalui WhatsApp.</p>
                    </div>
                  </div>
                  <a
                    className="btn btn-whatsapp w-full justify-center"
                    href={`https://wa.me/${cleanAdminWa}?text=Halo%20Admin%20SEIIKI,%20saya%20sudah%20membayar%20biaya%20kunjungan%20dengan%20kode%20${submitted.code}.%20Mohon%20jadwalkan%20teknisi.`}
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

      <section id="alur" className="customer-flow">
        <div className="eyebrow">Alur SEIIKI</div>
        <h2>Rapi sejak pesan pertama.</h2>
        <div className="flow-grid">
          {[
            ['01', config.title || 'Ajukan', 'Ceritakan kebutuhan listrik dan lokasi Anda.'],
            ['02', 'Bayar kunjungan', `${rupiah(config.visitFee || 25000)} untuk biaya kedatangan teknisi.`],
            ['03', 'Kami datang', 'Admin dan teknisi meneruskan detail lewat WhatsApp.'],
          ].map(([n, t, b]) => (
            <div className="flow-item" key={n}>
              <span>{n}</span>
              <strong>{t}</strong>
              <p>{b}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="aman" className="customer-assurance">
        <div>
          <div className="eyebrow">Yang bisa Anda pegang</div>
          <h2>Tenang, ada tim di balik setiap kunjungan.</h2>
        </div>
        <div className="assurance-list">
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
              <strong>Biaya transparan</strong>
              <small>Biaya kunjungan dipisahkan dari estimasi perbaikan.</small>
            </span>
          </div>
        </div>
      </section>

      <footer className="customer-footer">
        <Logo />
        <span>© 2024 SEIIKI · PT Solusi Energi Kelistrikan Indonesia</span>
        <span className="font-mono text-[10px] uppercase tracking-widest">clear work · safe homes</span>
      </footer>
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

  return (
    <AppShell>
      <PageIntro
        eyebrow="Selasa, 18 Juni 2024"
        title="Ringkasan operasi"
        body="Selamat pagi, Ayu. Ini keadaan tim dan kunjungan hari ini."
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
          <Field label="Status Perbaikan" hint="Pilih salah satu dari 3 status operasional perbaikan:">
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as ServiceRequest['status'])}
              data-testid="select-request-status"
            >
              <option value="assigned">Ditugaskan</option>
              <option value="completed">Selesai</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
          </Field>

          <Field
            label="Biaya Perbaikan (Rp)"
            hint="Isi setelah teknisi selesai mengecek/mengerjakan. Kosongkan jika dibatalkan."
          >
            <input
              type="number"
              min="0"
              step="1000"
              value={repairCost}
              onChange={(event) => setRepairCost(event.target.value)}
              placeholder="Contoh: 350000"
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
    if (window.confirm(`Hapus permintaan ${r.code}?`))
      remove.mutate(
        { id: r.id },
        { onSuccess: () => client.invalidateQueries({ queryKey: getListServiceRequestsQueryKey() }) }
      );
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
    </AppShell>
  );
}

function AdminTransactions() {
  const client = useQueryClient();
  const [period, setPeriod] = useState<'all' | 'week' | 'month' | 'custom'>('month');
  const [typeFilter, setTypeFilter] = useState<'all' | 'visit_fee' | 'repair_fee'>('all');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const query = useListTransactions({
    period,
    from: period === 'custom' && from ? from : undefined,
    to: period === 'custom' && to ? to : undefined,
  });
  const requestsQuery = useListServiceRequests();

  const demo: Transaction[] = [
    { id: 1, requestId: 41, requestCode: 'SK-240618-041', customerName: 'Rizky Adi', type: 'visit_fee', amount: 25000, status: 'paid', createdAt: '2024-06-18T08:42:00Z' },
    { id: 2, requestId: 40, requestCode: 'SK-240617-040', customerName: 'Nadia Kurnia', type: 'repair_fee', amount: 375000, status: 'paid', createdAt: '2024-06-18T07:15:00Z' },
    { id: 3, requestId: 39, requestCode: 'SK-240616-039', customerName: 'Bima Santoso', type: 'repair_fee', amount: 180000, status: 'pending', createdAt: '2024-06-17T16:30:00Z' },
  ];

  const apiTransactions = query.data ?? [];
  const requests = requestsQuery.data ?? [];

  // Derived repair cost transactions from requests
  const requestRepairTransactions: Transaction[] = useMemo(() => {
    return requests
      .filter((r) => typeof r.repairCost === 'number' && r.repairCost > 0)
      .map((r) => ({
        id: 99000 + r.id,
        requestId: r.id,
        requestCode: r.code,
        customerName: r.customerName,
        type: 'repair_fee' as const,
        amount: r.repairCost!,
        status: r.status === 'completed' ? ('paid' as const) : ('pending' as const),
        createdAt: r.createdAt,
      }));
  }, [requests]);

  // Merge transactions without duplicating
  const allRows = useMemo(() => {
    const list = apiTransactions.length > 0 ? [...apiTransactions] : [...demo];
    const existingReqKeys = new Set(list.map((t) => `${t.requestId}-${t.type}`));

    requestRepairTransactions.forEach((t) => {
      if (!existingReqKeys.has(`${t.requestId}-${t.type}`)) {
        list.unshift(t);
      }
    });

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [apiTransactions, requestRepairTransactions, demo]);

  // Filter by transaction type & search
  const filteredRows = useMemo(() => {
    return allRows.filter((r) => {
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const match = `${r.requestCode} ${r.customerName}`.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [allRows, typeFilter, search]);

  const totalPaid = allRows.filter((r) => r.status === 'paid').reduce((s, r) => s + r.amount, 0);
  const totalRepairFees = allRows.filter((r) => r.type === 'repair_fee').reduce((s, r) => s + r.amount, 0);
  const totalVisitFees = allRows.filter((r) => r.type === 'visit_fee').reduce((s, r) => s + r.amount, 0);

  const handleExportExcel = (exportAll = true) => {
    const listToExport = exportAll ? allRows : filteredRows;
    const dataToExport = listToExport.map((t, index) => ({
      No: index + 1,
      'Kode Permintaan': t.requestCode,
      'Nama Pelanggan': t.customerName,
      'Jenis Transaksi': t.type === 'visit_fee' ? 'Biaya Kunjungan' : 'Biaya Perbaikan',
      'Nominal Biaya (Rp)': t.amount,
      'Status Pembayaran': t.status === 'paid' ? 'Sudah Dibayar' : 'Pending',
      'Tanggal & Waktu': new Date(t.createdAt).toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);

    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 18 },
      { wch: 24 },
      { wch: 20 },
      { wch: 20 },
      { wch: 18 },
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
        body="Pantau penerimaan biaya kunjungan dan seluruh biaya perbaikan yang di-input admin dalam satu tempat."
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Stat label="Total Transaksi" value={String(allRows.length)} note="semua transaksi" icon={ReceiptText} />
        <Stat label="Biaya Perbaikan" value={rupiah(totalRepairFees)} note="total di-input admin" icon={Wrench} accent="yellow" />
        <Stat label="Biaya Kunjungan" value={rupiah(totalVisitFees)} note="pembayaran awal" icon={MapPin} accent="yellow" />
        <Stat label="Sudah Dibayar" value={rupiah(totalPaid)} note="penerimaan tercatat" icon={Banknote} accent="green" />
      </div>

      <section className="panel mt-6">
        <div className="panel-head flex-wrap gap-3">
          <div>
            <h3>Riwayat Transaksi</h3>
            <p className="text-xs text-muted-foreground">Filter periode & jenis transaksi untuk tinjauan lebih spesifik.</p>
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
          <div className="date-filter">
            <Field label="Dari">
              <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} data-testid="input-transaction-from" />
            </Field>
            <Field label="Sampai">
              <input type="date" value={to} onChange={(event) => setTo(event.target.value)} data-testid="input-transaction-to" />
            </Field>
          </div>
        )}

        <div className="filter-bar border-t border-border/40 pt-4 flex-wrap gap-3">
          <div className="filter-tabs">
            {[
              ['all', `Semua Jenis (${allRows.length})`],
              ['repair_fee', `Biaya Perbaikan (${allRows.filter((r) => r.type === 'repair_fee').length})`],
              ['visit_fee', `Biaya Kunjungan (${allRows.filter((r) => r.type === 'visit_fee').length})`],
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
                  <th>Nominal Biaya (Rp)</th>
                  <th>Status Pembayaran</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((t) => (
                  <tr key={t.id} data-testid={`row-transaction-${t.id}`}>
                    <td className="text-xs text-muted-foreground">{time(t.createdAt)}</td>
                    <td>
                      <strong className="block text-xs font-mono text-primary">{t.requestCode}</strong>
                      <span className="text-xs font-semibold text-foreground">{t.customerName}</span>
                    </td>
                    <td>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${
                          t.type === 'repair_fee'
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                            : 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20'
                        }`}
                      >
                        {t.type === 'visit_fee' ? <MapPin size={13} /> : <Wrench size={13} />}
                        {t.type === 'visit_fee' ? 'Biaya Kunjungan' : 'Biaya Perbaikan'}
                      </span>
                    </td>
                    <td className="font-mono text-xs font-bold text-foreground">{rupiah(t.amount)}</td>
                    <td>
                      <Status value={t.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}

function AdminEquipment() {
  const client = useQueryClient();
  const query = useListEquipmentRequests();
  const update = useUpdateEquipmentRequest();
  const demo: EquipmentRequest[] = [{ id: 1, workerId: 1, workerName: 'Arif Setiawan', item: 'Multimeter digital', quantity: 1, urgency: 'urgent', status: 'pending', createdAt: '2024-06-18T07:31:00Z' }, { id: 2, workerId: 3, workerName: 'Dimas Nugraha', item: 'Kabel NYM 2x1.5', quantity: 2, urgency: 'normal', status: 'pending', createdAt: '2024-06-17T15:21:00Z' }, { id: 3, workerId: 2, workerName: 'Maya Pratiwi', item: 'Tang crimping', quantity: 1, urgency: 'normal', status: 'approved', createdAt: '2024-06-16T09:00:00Z' }];
  const rows = query.data || demo;
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
  const [open, setOpen] = useState(false);
  const demo: User[] = [{ id: 1, name: 'Ayu Sari', phone: '0812 0000 2323', role: 'admin', status: 'active' }, { id: 2, name: 'Arif Setiawan', phone: '0812 7740 9211', role: 'worker', status: 'active' }, { id: 3, name: 'Maya Pratiwi', phone: '0813 2041 6658', role: 'worker', status: 'active' }, { id: 4, name: 'Beni Hartono', phone: '0812 4400 9001', role: 'worker', status: 'inactive' }];
  const rows = query.data || demo;
  return <AppShell><PageIntro eyebrow="Akses internal" title="Pengguna dashboard" body="Kelola siapa yang dapat mengatur operasi dan mengirim laporan." action={<Button onClick={() => { setEditing(null); setOpen(true); }} data-testid="button-add-user"><Plus size={16} /> Tambah pengguna</Button>} /><section className="panel"><div className="panel-head"><div><h3>{rows.length} pengguna</h3><p className="text-xs text-muted-foreground">Admin dan pekerja yang terdaftar di SEIIKI.</p></div><UsersRound size={18} className="text-muted-foreground" /></div><div className="table-scroll"><table><thead><tr><th>Nama</th><th>Kontak</th><th>Peran</th><th>Status</th><th className="text-right">Aksi</th></tr></thead><tbody>{rows.map((u) => <tr key={u.id} data-testid={`row-user-${u.id}`}><td><span className="flex items-center gap-2.5"><span className="avatar">{u.name.split(' ').map((v) => v[0]).join('').slice(0, 2)}</span><strong className="text-xs">{u.name}</strong></span></td><td className="text-xs text-muted-foreground">{u.phone}</td><td><Badge tone={u.role === 'admin' ? 'warm' : 'neutral'}>{u.role === 'admin' ? 'Admin' : 'Pekerja'}</Badge></td><td><Status value={u.status} /></td><td><div className="flex justify-end gap-1.5"><button className="icon-button" onClick={() => { setEditing(u); setOpen(true); }} data-testid={`button-edit-user-${u.id}`}><Pencil size={14} /></button><button className="icon-button icon-danger" onClick={() => window.confirm(`Hapus ${u.name}?`) && remove.mutate({ id: u.id }, { onSuccess: () => client.invalidateQueries({ queryKey: getListUsersQueryKey() }) })} data-testid={`button-delete-user-${u.id}`}><Trash2 size={14} /></button></div></td></tr>)}</tbody></table></div></section>{open && <UserDialog user={editing} onClose={() => setOpen(false)} onSave={(data) => { if (editing) update.mutate({ id: editing.id, data }, { onSuccess: () => { setOpen(false); client.invalidateQueries({ queryKey: getListUsersQueryKey() }); } }); else create.mutate({ data }, { onSuccess: () => { setOpen(false); client.invalidateQueries({ queryKey: getListUsersQueryKey() }); } }); }} />}</AppShell>;
}
function UserDialog({ user, onClose, onSave }: { user: User | null; onClose: () => void; onSave: (data: any) => void }) {
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [role, setRole] = useState<'admin' | 'worker'>(user?.role || 'worker');
  const [status, setStatus] = useState<'active' | 'inactive'>(user?.status || 'active');
  return <div className="modal-backdrop"><form className="modal" onSubmit={(e) => { e.preventDefault(); onSave(user ? { name, phone, role, status } : { name, phone, role, specialty: role === 'worker' ? 'Teknisi umum' : undefined }); }}><div className="flex items-start justify-between"><div><div className="eyebrow">{user ? 'Edit pengguna' : 'Pengguna baru'}</div><h3>{user ? 'Perbarui akses' : 'Tambah pengguna'}</h3></div><button type="button" className="icon-button" onClick={onClose} data-testid="button-close-user"><X size={17} /></button></div><div className="mt-6 space-y-4"><Field label="Nama"><input required value={name} onChange={(e) => setName(e.target.value)} data-testid="input-user-name" /></Field><Field label="Nomor ponsel"><input required value={phone} onChange={(e) => setPhone(e.target.value)} data-testid="input-user-phone" /></Field><Field label="Peran"><select value={role} onChange={(e) => setRole(e.target.value as typeof role)} data-testid="select-user-role"><option value="worker">Pekerja</option><option value="admin">Admin</option></select></Field>{user && <Field label="Status"><select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} data-testid="select-user-status"><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select></Field>}</div><div className="mt-7 flex justify-end gap-2"><Button type="button" kind="outline" onClick={onClose} data-testid="button-cancel-user">Batal</Button><Button type="submit" data-testid="button-save-user"><Check size={15} /> Simpan pengguna</Button></div></form></div>;
}

function AdminBookingComponent() {
  const [tab, setTab] = useState<'layanan' | 'formulir' | 'preview'>('layanan');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<BookingService | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Queries & Mutations
  const configQuery = useGetBookingConfig();
  const servicesQuery = useListBookingServices();
  const updateConfig = useUpdateBookingConfig();
  const createService = useCreateBookingService();
  const updateService = useUpdateBookingService();
  const deleteService = useDeleteBookingService();

  const config = configQuery.data || DEFAULT_BOOKING_CONFIG;
  const services = servicesQuery.data || DEFAULT_BOOKING_SERVICES;

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
    if (window.confirm('Kembalikan semua teks dan opsi formulir ke nilai bawaan?')) {
      setConfigForm(DEFAULT_BOOKING_CONFIG);
      updateConfig.mutate(DEFAULT_BOOKING_CONFIG, {
        onSuccess: () => {
          setSaveSuccessMsg('Konfigurasi formulir berhasil direset ke nilai default.');
          setTimeout(() => setSaveSuccessMsg(null), 4000);
        },
      });
    }
  };

  const handleToggleServiceActive = (service: BookingService) => {
    const nextStatus = service.isActive === 1 ? 0 : 1;
    updateService.mutate({
      id: service.id,
      data: { isActive: nextStatus },
    });
  };

  const handleDeleteService = (service: BookingService) => {
    if (window.confirm(`Yakin ingin menghapus layanan "${service.name}"?`)) {
      deleteService.mutate(service.id, {
        onSuccess: () => {
          setSaveSuccessMsg(`Layanan "${service.name}" berhasil dihapus.`);
          setTimeout(() => setSaveSuccessMsg(null), 4000);
        },
      });
    }
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
                  <Field label="Placeholder Alamat Lengkap">
                    <input
                      value={configForm.addressPlaceholder}
                      onChange={(e) => updateConfigFormField('addressPlaceholder', e.target.value)}
                      placeholder="Alamat lengkap, patokan, dan lantai bila ada"
                      data-testid="input-config-address-placeholder"
                    />
                  </Field>
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

              <Field label="Alamat lokasi">
                <textarea
                  disabled
                  placeholder={configForm.addressPlaceholder || 'Alamat lengkap, patokan, dan lantai bila ada'}
                  className="opacity-90"
                />
              </Field>

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
    </AppShell>
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
  const update = useUpdateServiceRequest();
  const requests = (requestsQuery.data ?? []).filter((r) => r.assignedWorkerId === 1);
  const report = requests.find((r) => r.status === 'on_site');
  const activeCount = requests.filter((r) => !['completed', 'cancelled'].includes(r.status)).length;

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
        eyebrow="Selasa, 18 Juni 2024"
        title="Kunjungan Saya"
        body="Pagi, Arif. Berikut tugas yang perlu Anda siapkan hari ini."
        action={
          <Button kind="soft" onClick={() => requestsQuery.refetch()} data-testid="button-refresh-worker">
            <RefreshCw size={15} /> Segarkan
          </Button>
        }
      />

      <div className="worker-banner">
        <div>
          <div className="eyebrow text-primary font-bold">Tugas Aktif</div>
          <h2>{activeCount} Kunjungan Perlu Perhatian</h2>
          <p>Pastikan detail lokasi dan catatan pelanggan sudah terbaca sebelum berangkat.</p>
        </div>
        <div className="worker-banner-icon">
          <NavigationIcon />
        </div>
      </div>

      <div className="section-label">
        <span>Daftar kunjungan</span>
        <Badge tone="neutral">{requests.length} tugas</Badge>
      </div>

      <div className="visit-list">
        {requests.map((r) => (
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
        ))}
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

          {/* Media Attachments */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <Paperclip size={14} className="text-accent" /> Lampiran Dokumentasi Media ({report.media?.length || 0})
            </h4>
            {report.media && report.media.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {report.media.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-xl border border-border/80 bg-card p-2.5 text-xs shadow-sm"
                  >
                    <div className="grid size-7 place-items-center rounded-lg bg-accent/15 text-accent font-mono text-[10px] font-bold">
                      #{idx + 1}
                    </div>
                    <span className="font-mono text-xs truncate max-w-[220px]">{item}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Tidak ada lampiran foto/video pada laporan ini.</p>
            )}
          </div>
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
                          <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-bold text-accent">
                            <Paperclip size={12} /> {report.media.length} file
                          </span>
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
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold text-muted-foreground block">
                    Dokumentasi Foto / Media ({report.media.length}):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {report.media.map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-mono text-accent"
                      >
                        <Paperclip size={12} /> {item}
                      </span>
                    ))}
                  </div>
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
  const requestsQuery = useListServiceRequests();
  const reportsQuery = useListFieldReports();
  const create = useCreateFieldReport();

  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [requestId, setRequestId] = useState(Number(params.get('request')) || 40);
  const [notes, setNotes] = useState('');
  const [media, setMedia] = useState<string[]>([]);
  const [selectedReport, setSelectedReport] = useState<FieldReportItem | null>(null);

  const requests = (requestsQuery.data ?? []).filter((r) => r.assignedWorkerId === 1 && r.status === 'on_site');
  const allReports = reportsQuery.data ?? [];
  const myReports = allReports.filter((r) => r.assignedWorkerId === 1 || !r.assignedWorkerId);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
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
            <Clock3 size={14} className="inline mr-1" /> Riwayat Laporan Saya ({myReports.length})
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
                    Tidak ada kunjungan berstatus "Di lokasi" yang membutuhkan laporan saat ini. Anda dapat melihat riwayat laporan yang sudah dibuat pada tab <strong>"Riwayat Laporan Saya"</strong>.
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

              <Field label="Media Pendukung" hint="Tambahkan nama file atau foto/video bukti di lokasi.">
                <div className="upload-box">
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={(e) =>
                      setMedia(Array.from(e.target.files || []).map((f) => `${f.name} · ${Math.round(f.size / 1024)} KB`))
                    }
                    data-testid="input-report-media"
                  />
                  <Paperclip size={19} />
                  <strong>Pilih foto atau video</strong>
                  <span>File tidak dikirim sebelum Anda menekan simpan</span>
                </div>
                {media.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {media.map((m) => (
                      <div className="media-chip" key={m}>
                        <Paperclip size={13} />
                        {m}
                        <button
                          type="button"
                          onClick={() => setMedia(media.filter((x) => x !== m))}
                          data-testid={`button-remove-media-${m}`}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
              <h3>Daftar Laporan Pekerjaan Saya</h3>
              <p className="text-xs text-muted-foreground">Semua laporan penugasan yang telah Anda kerjakan dan kirimkan.</p>
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
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {r.media.map((m, i) => (
                        <span key={i} className="inline-flex items-center gap-1 rounded-md bg-accent/10 px-2 py-0.5 text-[10px] font-mono text-accent">
                          <Paperclip size={10} /> {m}
                        </span>
                      ))}
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
  const create = useCreateEquipmentRequest();
  const [form, setForm] = useState({ item: '', quantity: '1', urgency: 'normal' as 'normal' | 'urgent' });
  const rows = (query.data || []).filter((r) => r.workerId === 1);
  return <AppShell role="worker"><PageIntro eyebrow="Kesiapan lapangan" title="Peralatan" body="Minta alat yang Anda perlukan sebelum pekerjaan dimulai." /><div className="report-layout"><form className="panel" onSubmit={(e) => { e.preventDefault(); create.mutate({ data: { workerId: 1, item: form.item, quantity: Number(form.quantity), urgency: form.urgency } }, { onSuccess: () => { setForm({ item: '', quantity: '1', urgency: 'normal' }); client.invalidateQueries({ queryKey: getListEquipmentRequestsQueryKey() }); } }); }}><div className="panel-head"><div><h3>Ajukan peralatan</h3><p className="text-xs text-muted-foreground">Admin akan meninjau permintaan Anda.</p></div><Plus size={18} className="text-muted-foreground" /></div><div className="space-y-4"><Field label="Nama peralatan"><input required value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} placeholder="Contoh: Tespen digital" data-testid="input-equipment-item" /></Field><Field label="Jumlah"><input required min="1" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} data-testid="input-equipment-quantity" /></Field><Field label="Urgensi"><select value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value as typeof form.urgency })} data-testid="select-equipment-urgency"><option value="normal">Normal</option><option value="urgent">Mendesak</option></select></Field></div><Button type="submit" className="mt-7 w-full justify-center" disabled={create.isPending} data-testid="button-submit-equipment"><Send size={15} /> Kirim permintaan</Button></form><div className="panel"><div className="panel-head"><div><h3>Riwayat saya</h3><p className="text-xs text-muted-foreground">Status permintaan peralatan.</p></div><PackageCheck size={18} className="text-muted-foreground" /></div>{rows.length ? <div className="equipment-list">{rows.map((r) => <div className="equipment-row !px-0" key={r.id}><span className="equipment-symbol"><Wrench size={16} /></span><div className="flex-1"><strong className="text-sm">{r.item}</strong><p>{r.quantity} unit · {date(r.createdAt)}</p></div><Status value={r.status} /></div>)}</div> : <Empty title="Belum ada pengajuan" body="Riwayat permintaan Anda akan muncul di sini." />}</div></div></AppShell>;
}

function NotFound() { return <div className="grid min-h-[100dvh] place-items-center bg-background p-6 text-center"><div><Logo /><h1 className="mt-10">Halaman tidak ditemukan</h1><p className="mt-2 text-sm text-muted-foreground">Rute ini belum tersedia di ruang kerja SEIIKI.</p><Link href="/" className="btn btn-primary mt-6 inline-flex" data-testid="link-not-found-home">Kembali ke beranda</Link></div></div>; }

function AdminHomeRoute() { return <AuthGate role="admin"><AdminHome /></AuthGate>; }
function AdminRequestsRoute() { return <AuthGate role="admin"><AdminRequests /></AuthGate>; }
function AdminAssignmentHistoryRoute() { return <AuthGate role="admin"><AdminAssignmentHistory /></AuthGate>; }
function AdminReportsRoute() { return <AuthGate role="admin"><AdminReports /></AuthGate>; }
function AdminBookingComponentRoute() { return <AuthGate role="admin"><AdminBookingComponent /></AuthGate>; }
function AdminTransactionsRoute() { return <AuthGate role="admin"><AdminTransactions /></AuthGate>; }
function AdminEquipmentRoute() { return <AuthGate role="admin"><AdminEquipment /></AuthGate>; }
function AdminUsersRoute() { return <AuthGate role="admin"><AdminUsers /></AuthGate>; }
function WorkerHomeRoute() { return <AuthGate role="worker"><WorkerHome /></AuthGate>; }
function WorkerEquipmentRoute() { return <AuthGate role="worker"><WorkerEquipment /></AuthGate>; }
function WorkerReportsRoute() { return <AuthGate role="worker"><WorkerReports /></AuthGate>; }
function AppRoutes() {
  return (
    <ErrorBoundary resetKey={window.location.pathname}>
      <Switch>
        <Route path="/" component={CustomerHome} />
        <Route path="/login" component={DemoLogin} />
        <Route path="/admin" component={AdminHomeRoute} />
        <Route path="/admin/requests" component={AdminRequestsRoute} />
        <Route path="/admin/assignment-history" component={AdminAssignmentHistoryRoute} />
        <Route path="/admin/reports" component={AdminReportsRoute} />
        <Route path="/admin/booking-component" component={AdminBookingComponentRoute} />
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