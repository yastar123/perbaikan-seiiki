import { useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Redirect, Route, Switch, useLocation } from 'wouter';
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import {
  Activity, ArrowRight, BadgeCheck, Banknote, BarChart3, Bell, Boxes, BriefcaseBusiness,
  CalendarDays, Check, ChevronDown, ClipboardCheck, Clock3, FileText, Headphones,
  LayoutDashboard, LocateFixed, LogIn, MapPin, Menu, MessageCircle, PackageCheck, Paperclip,
  Pencil, Plus, Radio, ReceiptText, RefreshCw, Search, Send, Settings2, ShieldCheck,
  Smartphone, Sparkles, Tag, Trash2, UserRound, UsersRound, Wrench, X, Zap
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
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#eab308',
    colorForeground: '#17313a',
    colorMutedForeground: '#60737a',
    colorDanger: '#c2410c',
    colorBackground: '#fffdf8',
    colorInput: '#fffdf8',
    colorInputForeground: '#17313a',
    colorNeutral: '#d9d5ca',
    fontFamily: 'Manrope, ui-sans-serif, sans-serif',
    borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#fffdf8] rounded-2xl w-[440px] max-w-full overflow-hidden',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#17313a]',
    headerSubtitle: 'text-[#60737a]',
    socialButtonsBlockButtonText: 'text-[#17313a]',
    formFieldLabel: 'text-[#17313a]',
    footerActionLink: 'text-[#c2410c]',
    footerActionText: 'text-[#60737a]',
    dividerText: 'text-[#60737a]',
    formButtonPrimary: 'bg-[#eab308] text-[#17313a] hover:bg-[#facc15]',
    formFieldInput: 'border-[#d9d5ca] text-[#17313a]',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
  },
};
const rupiah = (n = 0) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
const date = (value: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
const time = (value: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));

const statusLabel: Record<string, string> = { waiting_payment: 'Menunggu pembayaran', paid: 'Siap ditugaskan', assigned: 'Ditugaskan', on_site: 'Di lokasi', waiting_approval: 'Menunggu persetujuan', in_progress: 'Dikerjakan', completed: 'Selesai', cancelled: 'Dibatalkan', unpaid: 'Belum dibayar', pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak', active: 'Aktif', inactive: 'Nonaktif' };
const statusTone = (status: string) => status === 'completed' || status === 'approved' || status === 'paid' || status === 'active' ? 'good' : status === 'cancelled' || status === 'rejected' || status === 'inactive' ? 'bad' : status === 'on_site' || status === 'in_progress' || status === 'urgent' ? 'warm' : 'neutral';

function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide badge-${tone}`} data-testid="status-badge">{children}</span>;
}
function Logo({ inverse = false }: { inverse?: boolean }) {
  return <Link href="/" className={`flex items-center gap-2.5 ${inverse ? 'text-sidebar-foreground' : 'text-foreground'}`} data-testid="link-logo">
    <span className={`grid size-9 place-items-center rounded-xl ${inverse ? 'bg-primary text-primary-foreground' : 'bg-foreground text-primary'}`}><Zap size={18} strokeWidth={2.5} /></span>
    <span><strong className="block text-[17px] font-extrabold tracking-[-.04em]">SEIIKI</strong><small className={`block text-[9px] font-bold uppercase tracking-[.18em] ${inverse ? 'text-sidebar-foreground/55' : 'text-muted-foreground'}`}>solusi energi</small></span>
  </Link>;
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
  const [location] = useLocation();
  const { user } = useUser();
  const nav = role === 'admin' ? adminNav : workerNav;
  const displayName = user?.fullName || user?.primaryEmailAddress?.emailAddress || (role === 'admin' ? 'Admin SEIIKI' : 'Pekerja lapangan');
  const initials = displayName.split(/\s+/).map((value) => value[0]).join('').slice(0, 2).toUpperCase();
  return <div className="app-noise min-h-[100dvh] bg-background">
    <aside className={`sidebar ${menu ? 'sidebar-open' : ''}`}>
      <div className="flex items-center justify-between"><Logo inverse /><button className="sidebar-close md:hidden" onClick={() => setMenu(false)} data-testid="button-close-menu"><X size={18} /></button></div>
      <div className="mt-10 px-3 text-[10px] font-extrabold uppercase tracking-[.18em] text-sidebar-foreground/40">{role === 'admin' ? 'Ruang kendali' : 'Ruang pekerja'}</div>
      <nav className="mt-3 space-y-1">{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMenu(false)} className={`side-link ${location === href ? 'side-link-active' : ''}`} data-testid={`link-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon size={17} /><span>{label}</span>{href === '/admin/requests' && <span className="ml-auto grid size-5 place-items-center rounded-full bg-primary text-[10px] font-extrabold text-primary-foreground">4</span>}</Link>)}</nav>
      <div className="sidebar-bottom">
        <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent/60 p-4"><div className="mb-2 flex items-center gap-2 text-primary"><Radio size={14} /><span className="text-[11px] font-bold uppercase tracking-widest">Tim aktif</span></div><p className="text-xs leading-5 text-sidebar-foreground/70">Semua layanan lapangan terpantau.</p><div className="mt-3 flex items-center gap-2 text-xs text-sidebar-foreground/50"><span className="status-dot bg-emerald-400" /> Sistem normal</div></div>
        <Link href="/login" className="side-link mt-3 text-sidebar-foreground/55" data-testid="link-switch-role"><LogIn size={17} /><span>Ganti akses demo</span></Link>
      </div>
    </aside>
    <main className="md:pl-[264px]">
       <header className="topbar"><button className="menu-trigger md:hidden" onClick={() => setMenu(true)} data-testid="button-open-menu"><Menu size={20} /></button><div className="hidden text-sm text-muted-foreground md:block">{role === 'admin' ? 'Operasional / ' : 'Lapangan / '}<strong className="text-foreground">{pageName(location)}</strong></div><div className="ml-auto flex items-center gap-3"><button className="icon-button" data-testid="button-notifications"><Bell size={17} /><i /></button><span className="hidden h-5 w-px bg-border sm:block" /><div className="flex items-center gap-2.5"><span className="avatar">{initials}</span><div className="hidden leading-tight sm:block"><strong className="block text-xs">{displayName}</strong><span className="text-[10px] text-muted-foreground">{role === 'admin' ? 'Administrator' : 'Teknisi lapangan'}</span></div><ChevronDown size={14} className="text-muted-foreground" /></div></div></header>
      <div className="page-wrap">{children}</div>
    </main>
  </div>;
}
function pageName(location: string) { return location === '/admin' ? 'Ringkasan operasi' : location.includes('requests') ? 'Permintaan kunjungan' : location.includes('transactions') ? 'Transaksi' : location.includes('equipment') ? 'Peralatan' : location.includes('users') ? 'Pengguna dashboard' : location === '/worker' ? 'Kunjungan saya' : location.includes('reports') ? 'Laporan lapangan' : 'Peralatan'; }
function PageIntro({ eyebrow, title, body, action }: { eyebrow: string; title: string; body: string; action?: React.ReactNode }) {
  return <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end rise-in"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{body}</p></div>{action}</div>;
}
function Stat({ label, value, note, icon: Icon, accent = 'yellow' }: { label: string; value: string; note: string; icon: React.ElementType; accent?: string }) {
  return <div className="stat-card rise-in"><div className={`stat-icon stat-${accent}`}><Icon size={17} /></div><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong><span className="stat-note">{note}</span></div>;
}
function RequestTable({ requests, onAssign, onManage, onDelete, compact = false }: { requests: ServiceRequest[]; onAssign?: (r: ServiceRequest) => void; onManage?: (r: ServiceRequest) => void; onDelete?: (r: ServiceRequest) => void; compact?: boolean }) {
  if (!requests.length) return <Empty title="Belum ada permintaan" body="Permintaan baru akan muncul di sini setelah pelanggan mengisi form." />;
  return <div className="table-scroll"><table><thead><tr><th>Kode / pelanggan</th><th>Layanan & alamat</th><th>Status</th><th>Pembayaran</th><th>Teknisi</th><th className="text-right">Aksi</th></tr></thead><tbody>{requests.slice(0, compact ? 4 : undefined).map((r) => <tr key={r.id} data-testid={`row-request-${r.id}`}><td><strong className="block text-xs">{r.code}</strong><span className="mt-1 block text-sm font-semibold">{r.customerName}</span><span className="block text-[11px] text-muted-foreground">{time(r.createdAt)}</span></td><td><span className="block max-w-[210px] truncate text-xs font-bold">{r.serviceType}</span><a className="mt-1 flex max-w-[220px] items-center gap-1 truncate text-[11px] text-muted-foreground hover:text-accent" href={`https://www.google.com/maps?q=${r.latitude},${r.longitude}`} target="_blank" rel="noreferrer"><MapPin size={11} />{r.address}</a></td><td><Status value={r.status} /></td><td><Status value={r.paymentStatus || 'unpaid'} /></td><td>{r.assignedWorkerName ? <span className="flex items-center gap-2 text-xs font-semibold"><span className="avatar avatar-sm">{r.assignedWorkerName.split(' ').map((v) => v[0]).join('').slice(0, 2)}</span>{r.assignedWorkerName}</span> : <span className="text-xs text-muted-foreground">Belum ditugaskan</span>}</td><td><div className="flex justify-end gap-1.5">{onManage && <Button kind="soft" className="!px-2.5 !py-1.5 text-[11px]" onClick={() => onManage(r)} data-testid={`button-manage-request-${r.id}`}><Settings2 size={13} /> Kelola</Button>}{onAssign && <Button kind="outline" className="!px-2.5 !py-1.5 text-[11px]" onClick={() => onAssign(r)} data-testid={`button-assign-${r.id}`}>{r.assignedWorkerId ? 'Ubah' : 'Tugaskan'}</Button>}{onDelete && <button className="icon-button icon-danger" onClick={() => onDelete(r)} data-testid={`button-delete-request-${r.id}`}><Trash2 size={14} /></button>}</div></td></tr>)}</tbody></table></div>;
}

function CustomerHome() {
  const create = useCreateServiceRequest();
  const pay = useCreateVisitPayment();
  const [submitted, setSubmitted] = useState<ServiceRequest | null>(null);
  const [paid, setPaid] = useState(false);
  const [form, setForm] = useState({ customerName: '', whatsapp: '', address: '', serviceType: 'Perbaikan listrik rumah', notes: '' });
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
    else locate(true);
  };
  const geoLabel = geoState === 'loading' ? 'Mencari lokasi…' : geoState === 'ready' ? 'Lokasi GPS tersimpan' : geoState === 'error' ? 'Lokasi belum tersedia — coba lagi' : 'Ambil lokasi GPS';
  return <div className="customer-page app-noise min-h-[100dvh]">
    <header className="customer-nav"><Logo /><div className="hidden items-center gap-7 text-xs font-bold text-muted-foreground md:flex"><a href="#alur" data-testid="link-customer-flow">Cara kerja</a><a href="#aman" data-testid="link-customer-safety">Jaminan kami</a><Link href="/login" className="text-foreground" data-testid="link-customer-login">Akses tim <ArrowRight size={13} className="ml-1 inline" /></Link></div><Link href="/login" className="btn btn-outline !px-3 !py-2 text-xs md:hidden" data-testid="link-mobile-login">Masuk</Link></header>
    <section className="customer-hero"><div className="hero-copy rise-in"><div className="eyebrow"><span className="status-dot bg-accent" /> Layanan listrik yang datang siap kerja</div><h1>Masalah listrik,<br /><em>kami urus.</em></h1><p>Teknisi terverifikasi datang ke lokasi Anda dengan alur yang jelas, biaya kunjungan pasti, dan admin yang selalu bisa dihubungi.</p><div className="hero-proof"><span><ShieldCheck size={17} /> Teknisi terverifikasi</span><span><Clock3 size={17} /> Respon di hari yang sama</span></div></div><div className="request-card rise-in delay-1"><div className="card-kicker"><span className="step-number">01</span><div><strong>Ajukan kunjungan</strong><p>Isi detail singkat, kami lanjutkan lewat WhatsApp.</p></div></div>{!submitted ? <form onSubmit={submit} className="space-y-4"><Field label="Nama lengkap"><input required minLength={2} value={form.customerName} onChange={(e) => set('customerName', e.target.value)} placeholder="Contoh: Sinta Rahma" data-testid="input-customer-name" /></Field><Field label="Nomor WhatsApp" hint="Gunakan nomor yang aktif menerima pesan"><input required minLength={8} value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="08xx xxxx xxxx" data-testid="input-customer-whatsapp" /></Field><Field label="Alamat lokasi"><textarea required minLength={4} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Alamat lengkap, patokan, dan lantai bila ada" data-testid="input-customer-address" /></Field><Field label="Titik lokasi GPS" hint="Bagikan lokasi agar teknisi menemukan alamat dengan tepat"><div className="location-control"><Button type="button" kind={geoState === 'ready' ? 'soft' : 'outline'} onClick={() => locate()} disabled={geoState === 'loading'} data-testid="button-get-location"><LocateFixed size={15} /> {geoLabel}</Button>{coords && <a href={`https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`} target="_blank" rel="noreferrer" className="location-coordinates" data-testid="link-location-map">{coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}</a>}</div></Field><Field label="Kebutuhan layanan"><select value={form.serviceType} onChange={(e) => set('serviceType', e.target.value)} data-testid="select-service-type"><option>Perbaikan listrik rumah</option><option>Instalasi titik listrik</option><option>Pemeriksaan instalasi</option><option>Perbaikan panel / MCB</option></select></Field><Field label="Catatan tambahan" hint="Opsional"><input value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Keluhan, waktu yang diinginkan..." data-testid="input-customer-notes" /></Field>{geoState === 'error' && <div className="notice notice-error"><MapPin size={15} /> Izinkan akses lokasi di browser untuk mengirim permintaan.</div>}<Button type="submit" className="w-full justify-center" disabled={create.isPending || geoState === 'loading'} data-testid="button-submit-request">{create.isPending ? 'Mengirim permintaan...' : <>Lanjut ke pembayaran <ArrowRight size={16} /></>}</Button><p className="text-center text-[11px] text-muted-foreground">Biaya kunjungan <strong className="text-foreground">Rp25.000</strong> · dibayar di muka</p></form> : <div className="space-y-4"><div className="success-panel"><BadgeCheck size={25} /><div><strong>Permintaan tercatat</strong><p>Kode Anda <b>{submitted.code}</b>. Selesaikan pembayaran untuk mengunci jadwal kunjungan.</p></div></div>{!paid ? <><div className="payment-line"><span><span className="block text-xs font-bold">Biaya kunjungan</span><span className="text-[11px] text-muted-foreground">Sekali bayar, belum termasuk perbaikan</span></span><strong>{rupiah(submitted.visitFee)}</strong></div><div className="method-grid">{[['qris', 'QRIS'], ['bank_transfer', 'Transfer bank'], ['e_wallet', 'E-wallet']].map(([v, label]) => <button type="button" key={v} onClick={() => setMethod(v as typeof method)} className={`method-option ${method === v ? 'method-selected' : ''}`} data-testid={`button-payment-${v}`}><span className="method-radio" />{label}</button>)}</div><Button className="w-full justify-center" onClick={() => pay.mutate({ requestId: submitted.id, data: { method } }, { onSuccess: () => setPaid(true) })} disabled={pay.isPending} data-testid="button-pay-visit">{pay.isPending ? 'Memproses pembayaran...' : <>Bayar {rupiah(submitted.visitFee)} <ArrowRight size={16} /></>}</Button></> : <div className="space-y-3"><div className="success-panel"><Check size={25} /><div><strong>Pembayaran berhasil</strong><p>Admin SEIIKI akan menghubungi Anda melalui WhatsApp.</p></div></div><a className="btn btn-whatsapp w-full justify-center" href="https://wa.me/6281112345678" target="_blank" rel="noreferrer" data-testid="link-whatsapp-admin"><MessageCircle size={16} /> Lanjut ke WhatsApp admin</a></div>}<button onClick={() => { setSubmitted(null); setPaid(false); setCoords(null); setGeoState('idle'); }} className="w-full text-center text-xs font-bold text-muted-foreground underline" data-testid="button-new-request">Buat permintaan lain</button></div>}</div></section>
    <section id="alur" className="customer-flow"><div className="eyebrow">Alur SEIIKI</div><h2>Rapi sejak pesan pertama.</h2><div className="flow-grid">{[['01', 'Ajukan', 'Ceritakan kebutuhan listrik dan lokasi Anda.'], ['02', 'Bayar kunjungan', 'Rp25.000 untuk biaya kedatangan teknisi.'], ['03', 'Kami datang', 'Admin dan teknisi meneruskan detail lewat WhatsApp.']].map(([n, t, b]) => <div className="flow-item" key={n}><span>{n}</span><strong>{t}</strong><p>{b}</p></div>)}</div></section>
    <section id="aman" className="customer-assurance"><div><div className="eyebrow">Yang bisa Anda pegang</div><h2>Tenang, ada tim di balik setiap kunjungan.</h2></div><div className="assurance-list"><div><ShieldCheck size={20} /><span><strong>Teknisi terarah</strong><small>Penugasan disesuaikan dengan kebutuhan layanan.</small></span></div><div><MessageCircle size={20} /><span><strong>Admin mudah dihubungi</strong><small>Setelah bayar, percakapan berlanjut di WhatsApp.</small></span></div><div><ReceiptText size={20} /><span><strong>Biaya transparan</strong><small>Biaya kunjungan dipisahkan dari estimasi perbaikan.</small></span></div></div></section>
    <footer className="customer-footer"><Logo /><span>© 2024 SEIIKI · PT Solusi Energi Kelistrikan Indonesia</span><span className="font-mono text-[10px] uppercase tracking-widest">clear work · safe homes</span></footer>
  </div>;
}

function Login() {
  const [, setLocation] = useLocation();
  const health = useHealthCheck();
  const [role, setRole] = useState<'admin' | 'worker'>('admin');
  return <div className="login-page app-noise"><div className="login-aside"><Logo inverse /><div className="mt-auto hidden max-w-sm md:block"><div className="eyebrow text-primary">SEIIKI operations hub</div><h1>Setiap kunjungan,<br /><em>terkendali.</em></h1><p>Ruang kerja untuk admin yang mengatur, dan teknisi yang menyelesaikan.</p><div className="mt-8 flex items-center gap-2 text-xs text-sidebar-foreground/60"><span className="status-dot bg-emerald-400" /> Sistem {health.isLoading ? 'memeriksa...' : 'siap digunakan'}</div></div><span className="mt-auto hidden text-[10px] uppercase tracking-[.18em] text-sidebar-foreground/35 md:block">PT Solusi Energi Kelistrikan Indonesia</span></div><div className="login-main"><Link href="/" className="mb-10 flex items-center gap-2 text-xs font-bold text-muted-foreground" data-testid="link-back-home"><ArrowRight size={14} className="rotate-180" /> Kembali ke halaman pelanggan</Link><div className="login-box rise-in"><div className="eyebrow">Demo akses</div><h2>Masuk ke ruang kerja</h2><p>Pilih peran untuk melihat alur kerja SEIIKI.</p><div className="role-picker">{(['admin', 'worker'] as const).map((r) => <button key={r} onClick={() => setRole(r)} className={role === r ? 'role-active' : ''} data-testid={`button-role-${r}`}><span className="role-icon">{r === 'admin' ? <LayoutDashboard size={18} /> : <Wrench size={18} />}</span><span><strong>{r === 'admin' ? 'Admin operasi' : 'Pekerja lapangan'}</strong><small>{r === 'admin' ? 'Atur kunjungan & tim' : 'Lihat tugas & laporan'}</small></span><span className="ml-auto text-primary">{role === r && <Check size={16} />}</span></button>)}</div><Field label="Nomor ponsel"><input placeholder="08xx xxxx xxxx" defaultValue={role === 'admin' ? '0812 0000 2323' : '0812 7740 9211'} data-testid="input-login-phone" /></Field><Button className="mt-5 w-full justify-center" onClick={() => setLocation(role === 'admin' ? '/admin' : '/worker')} data-testid="button-login">Masuk sebagai {role === 'admin' ? 'admin' : 'pekerja'} <ArrowRight size={16} /></Button><p className="mt-4 text-center text-[11px] text-muted-foreground">Mode demo · autentikasi akan terhubung di tahap berikutnya</p></div></div></div>;
}

function AdminHome() {
  const summaryQuery = useGetDashboardSummary();
  const requestQuery = useListServiceRequests();
  const summary = summaryQuery.data || demoSummary;
  const requests = requestQuery.data || demoRequests;
  return <AppShell><PageIntro eyebrow="Selasa, 18 Juni 2024" title="Ringkasan operasi" body="Selamat pagi, Ayu. Ini keadaan tim dan kunjungan hari ini." action={<Button kind="soft" onClick={() => summaryQuery.refetch()} data-testid="button-refresh-summary"><RefreshCw size={15} /> Segarkan</Button>} /><div className="stat-grid"><Stat label="Total permintaan" value={String(summary.totalRequests)} note="sepanjang bulan ini" icon={ClipboardCheck} /><Stat label="Perlu ditugaskan" value={String(summary.pendingAssignment)} note="menunggu teknisi" icon={Clock3} accent="orange" /><Stat label="Sedang di lokasi" value={String(summary.onSite)} note="kunjungan berlangsung" icon={MapPin} accent="blue" /><Stat label="Selesai" value={String(summary.completed)} note="bulan ini" icon={BadgeCheck} accent="green" /></div><div className="two-col mt-6"><section className="panel rise-in delay-1"><div className="panel-head"><div><div className="eyebrow">Perlu perhatian</div><h3>Permintaan terbaru</h3></div><Link href="/admin/requests" className="text-xs font-bold text-accent" data-testid="link-all-requests">Lihat semua <ArrowRight size={13} className="ml-1 inline" /></Link></div>{requestQuery.isLoading ? <LoadingRows /> : requestQuery.isError ? <ErrorNotice retry={requestQuery.refetch} /> : <RequestTable requests={requests} compact />}</section><section className="panel rise-in delay-2"><div className="panel-head"><div><div className="eyebrow">Aktivitas terkini</div><h3>Tim bergerak</h3></div><Activity size={18} className="text-muted-foreground" /></div><div className="activity-list">{summary.recentActivity.map((a, i) => <div className="activity-item" key={`${a.label}-${i}`}><span className={`activity-mark mark-${i}`}><Check size={13} /></span><span><strong>{a.label}</strong><small>{a.detail}</small></span><time>{a.time}</time></div>)}</div><div className="revenue-strip"><div><span>Pendapatan kunjungan</span><strong>{rupiah(summary.visitRevenue)}</strong></div><div><span>Pendapatan perbaikan</span><strong>{rupiah(summary.repairRevenue)}</strong></div></div></section></div></AppShell>;
}

function AssignDialog({ request, workers, onClose, onSave }: { request: ServiceRequest; workers: Worker[]; onClose: () => void; onSave: (workerId: number) => void }) {
  const [worker, setWorker] = useState(String(request.assignedWorkerId || workers[0]?.id || ''));
  return <div className="modal-backdrop"><div className="modal"><div className="flex items-start justify-between"><div><div className="eyebrow">Penugasan · {request.code}</div><h3>Pilih teknisi</h3><p className="mt-1 text-xs text-muted-foreground">{request.customerName} · {request.serviceType}</p></div><button className="icon-button" onClick={onClose} data-testid="button-close-assign"><X size={17} /></button></div><div className="mt-6 space-y-3">{workers.map((w) => <button key={w.id} onClick={() => setWorker(String(w.id))} className={`worker-option ${worker === String(w.id) ? 'worker-selected' : ''}`} data-testid={`button-worker-${w.id}`}><span className="avatar">{w.name.split(' ').map((v) => v[0]).join('').slice(0, 2)}</span><span className="text-left"><strong>{w.name}</strong><small>{w.specialty} · {w.status === 'available' ? 'Tersedia' : 'Sedang bertugas'}</small></span><span className="ml-auto">{worker === String(w.id) && <Check size={17} className="text-primary" />}</span></button>)}</div><div className="mt-7 flex justify-end gap-2"><Button kind="outline" onClick={onClose} data-testid="button-cancel-assign">Batal</Button><Button onClick={() => onSave(Number(worker))} data-testid="button-save-assign"><Check size={15} /> Simpan penugasan</Button></div></div></div>;
}

function ManageRequestDialog({ request, onClose, onSave }: { request: ServiceRequest; onClose: () => void; onSave: (data: { status: ServiceRequest['status']; repairCost: number | null }) => void }) {
  const [status, setStatus] = useState<ServiceRequest['status']>(request.status);
  const [repairCost, setRepairCost] = useState(request.repairCost ? String(request.repairCost) : '');
  return <div className="modal-backdrop"><form className="modal" onSubmit={(event) => { event.preventDefault(); onSave({ status, repairCost: repairCost ? Number(repairCost) : null }); }}><div className="flex items-start justify-between"><div><div className="eyebrow">Detail pekerjaan · {request.code}</div><h3>Kelola permintaan</h3><p className="mt-1 text-xs text-muted-foreground">{request.customerName} · {request.serviceType}</p></div><button type="button" className="icon-button" onClick={onClose} data-testid="button-close-manage"><X size={17} /></button></div><div className="request-detail"><div><span>Pelanggan</span><strong>{request.customerName}</strong></div><div><span>Lokasi</span><a href={`https://www.google.com/maps?q=${request.latitude},${request.longitude}`} target="_blank" rel="noreferrer"><MapPin size={13} /> Buka di Maps</a></div><div><span>Catatan</span><strong>{request.notes || 'Tidak ada catatan tambahan'}</strong></div></div><div className="mt-5 space-y-4"><Field label="Status pekerjaan"><select value={status} onChange={(event) => setStatus(event.target.value as ServiceRequest['status'])} data-testid="select-request-status"><option value="paid">Siap ditugaskan</option><option value="assigned">Ditugaskan</option><option value="on_site">Di lokasi</option><option value="waiting_approval">Menunggu persetujuan</option><option value="in_progress">Dikerjakan</option><option value="completed">Selesai</option><option value="cancelled">Tidak jadi / dibatalkan</option></select></Field><Field label="Biaya perbaikan" hint="Isi setelah teknisi melakukan pengecekan. Kosongkan jika pelanggan tidak jadi."><input type="number" min="0" step="1000" value={repairCost} onChange={(event) => setRepairCost(event.target.value)} placeholder="Contoh: 350000" data-testid="input-repair-cost" /></Field></div><div className="mt-7 flex justify-end gap-2"><Button type="button" kind="outline" onClick={onClose} data-testid="button-cancel-manage">Batal</Button><Button type="submit" data-testid="button-save-manage"><Check size={15} /> Simpan perubahan</Button></div></form></div>;
}

function AdminRequests() {
  const client = useQueryClient();
  const query = useListServiceRequests();
  const workersQuery = useListWorkers();
  const update = useUpdateServiceRequest();
  const remove = useDeleteServiceRequest();
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<ServiceRequest | null>(null);
  const [managed, setManaged] = useState<ServiceRequest | null>(null);
  const [search, setSearch] = useState('');
  const requests = query.data || demoRequests;
  const workers = workersQuery.data || demoWorkers;
  const shown = requests.filter((request) => (filter === 'all' || request.status === filter) && `${request.code} ${request.customerName} ${request.whatsapp}`.toLowerCase().includes(search.toLowerCase()));
  const assign = (workerId: number) => { if (!selected) return; update.mutate({ id: selected.id, data: { assignedWorkerId: workerId, status: 'assigned' } }, { onSuccess: () => { setSelected(null); client.invalidateQueries({ queryKey: getListServiceRequestsQueryKey() }); } }); };
  const manage = (data: { status: ServiceRequest['status']; repairCost: number | null }) => { if (!managed) return; update.mutate({ id: managed.id, data }, { onSuccess: () => { setManaged(null); client.invalidateQueries({ queryKey: getListServiceRequestsQueryKey() }); client.invalidateQueries({ queryKey: getListTransactionsQueryKey() }); client.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }); } }); };
  const deleteRequest = (r: ServiceRequest) => { if (window.confirm(`Hapus permintaan ${r.code}?`)) remove.mutate({ id: r.id }, { onSuccess: () => client.invalidateQueries({ queryKey: getListServiceRequestsQueryKey() }) }); };
  return <AppShell><PageIntro eyebrow="Kendali kunjungan" title="Permintaan kunjungan" body="Atur prioritas, pembayaran, teknisi, dan biaya perbaikan untuk setiap pelanggan." action={<Button onClick={() => query.refetch()} kind="soft" data-testid="button-refresh-requests"><RefreshCw size={15} /> Segarkan data</Button>} /><div className="filter-bar"><div className="filter-tabs">{[['all', 'Semua'], ['paid', 'Siap ditugaskan'], ['assigned', 'Ditugaskan'], ['on_site', 'Di lokasi'], ['waiting_approval', 'Perlu dicek'], ['completed', 'Selesai']].map(([v, l]) => <button key={v} onClick={() => setFilter(v)} className={filter === v ? 'filter-active' : ''} data-testid={`button-filter-${v}`}>{l}</button>)}</div><div className="search-field"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari kode, pelanggan, WhatsApp" data-testid="input-search-requests" /></div></div><section className="panel"><div className="panel-head"><div><h3>{shown.length} permintaan</h3><p className="text-xs text-muted-foreground">Diperbarui beberapa saat lalu</p></div><div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="status-dot bg-emerald-500" /> API tersambung</div></div>{query.isLoading ? <LoadingRows /> : query.isError && !query.data ? <ErrorNotice retry={query.refetch} /> : <RequestTable requests={shown} onAssign={setSelected} onManage={setManaged} onDelete={deleteRequest} />}</section>{selected && <AssignDialog request={selected} workers={workers} onClose={() => setSelected(null)} onSave={assign} />}{managed && <ManageRequestDialog request={managed} onClose={() => setManaged(null)} onSave={manage} />}</AppShell>;
}

function AdminTransactions() {
  const client = useQueryClient();
  const [period, setPeriod] = useState<'all' | 'week' | 'month' | 'custom'>('month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const query = useListTransactions({ period, from: period === 'custom' && from ? from : undefined, to: period === 'custom' && to ? to : undefined });
  const demo: Transaction[] = [{ id: 1, requestId: 41, requestCode: 'SK-240618-041', customerName: 'Rizky Adi', type: 'visit_fee', amount: 25000, status: 'paid', createdAt: '2024-06-18T08:42:00Z' }, { id: 2, requestId: 40, requestCode: 'SK-240617-040', customerName: 'Nadia Kurnia', type: 'repair_fee', amount: 375000, status: 'paid', createdAt: '2024-06-18T07:15:00Z' }, { id: 3, requestId: 39, requestCode: 'SK-240616-039', customerName: 'Bima Santoso', type: 'repair_fee', amount: 180000, status: 'pending', createdAt: '2024-06-17T16:30:00Z' }];
  const rows = query.data || demo;
  const total = rows.filter((r) => r.status === 'paid').reduce((s, r) => s + r.amount, 0);
  return <AppShell><PageIntro eyebrow="Keuangan operasional" title="Transaksi" body="Pantau biaya kunjungan dan pembayaran perbaikan dari satu tempat." /><div className="stat-grid stat-grid-3"><Stat label="Transaksi terpilih" value={String(rows.length)} note="periode berjalan" icon={ReceiptText} /><Stat label="Sudah dibayar" value={rupiah(total)} note="penerimaan tercatat" icon={Banknote} accent="green" /><Stat label="Perlu ditindaklanjuti" value={String(rows.filter((r) => r.status === 'pending').length)} note="status pending" icon={Clock3} accent="orange" /></div><section className="panel mt-6"><div className="panel-head flex-wrap"><div><h3>Riwayat transaksi</h3><p className="text-xs text-muted-foreground">Filter periode untuk laporan yang lebih spesifik.</p></div><div className="filter-tabs">{(['all', 'week', 'month', 'custom'] as const).map((p) => <button key={p} className={period === p ? 'filter-active' : ''} onClick={() => { setPeriod(p); client.invalidateQueries({ queryKey: getListTransactionsQueryKey({ period: p }) }); }} data-testid={`button-period-${p}`}>{p === 'all' ? 'Semua' : p === 'week' ? '7 hari' : p === 'month' ? 'Bulan ini' : 'Custom'}</button>)}</div></div>{period === 'custom' && <div className="date-filter"><Field label="Dari"><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} data-testid="input-transaction-from" /></Field><Field label="Sampai"><input type="date" value={to} onChange={(event) => setTo(event.target.value)} data-testid="input-transaction-to" /></Field></div>}{query.isLoading ? <LoadingRows /> : <div className="table-scroll"><table><thead><tr><th>Waktu</th><th>Kode / pelanggan</th><th>Jenis</th><th>Nominal</th><th>Status</th></tr></thead><tbody>{rows.map((t) => <tr key={t.id} data-testid={`row-transaction-${t.id}`}><td className="text-xs text-muted-foreground">{time(t.createdAt)}</td><td><strong className="block text-xs">{t.requestCode}</strong><span className="text-xs">{t.customerName}</span></td><td><span className="inline-flex items-center gap-2 text-xs font-semibold"><span className="grid size-7 place-items-center rounded-lg bg-secondary text-secondary-foreground">{t.type === 'visit_fee' ? <MapPin size={13} /> : <Wrench size={13} />}</span>{t.type === 'visit_fee' ? 'Biaya kunjungan' : 'Biaya perbaikan'}</span></td><td className="font-mono text-xs font-bold">{rupiah(t.amount)}</td><td><Status value={t.status} /></td></tr>)}</tbody></table></div>}</section></AppShell>;
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

function WorkerHome() {
  const client = useQueryClient();
  const requestsQuery = useListServiceRequests();
  const update = useUpdateServiceRequest();
  const requests = (requestsQuery.data || demoRequests).filter((r) => r.assignedWorkerId === 1);
  const report = requests.find((r) => r.status === 'on_site');
  const startVisit = (id: number) => update.mutate({ id, data: { status: 'on_site' } }, { onSuccess: () => { client.invalidateQueries({ queryKey: getListServiceRequestsQueryKey() }); client.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }); } });
  return <AppShell role="worker"><PageIntro eyebrow="Selasa, 18 Juni 2024" title="Kunjungan saya" body="Pagi, Arif. Berikut tugas yang perlu Anda siapkan hari ini." action={<Button kind="soft" onClick={() => requestsQuery.refetch()} data-testid="button-refresh-worker"><RefreshCw size={15} /> Segarkan</Button>} /><div className="worker-banner"><div><div className="eyebrow text-primary">Tugas aktif</div><h2>{requests.filter((r) => !['completed', 'cancelled'].includes(r.status)).length} kunjungan perlu perhatian</h2><p>Pastikan detail lokasi dan catatan pelanggan sudah terbaca sebelum berangkat.</p></div><div className="worker-banner-icon"><NavigationIcon /></div></div><div className="section-label"><span>Daftar kunjungan</span><Badge tone="neutral">{requests.length} tugas</Badge></div><div className="visit-list">{requests.map((r) => <div className="visit-card" key={r.id} data-testid={`card-visit-${r.id}`}><div className="visit-time"><span>{r.status === 'completed' ? 'Selesai' : 'Hari ini'}</span><strong>{r.status === 'on_site' ? 'Sedang dikerjakan' : r.status === 'waiting_approval' ? 'Menunggu cek admin' : '08.30 — 10.00'}</strong></div><div className="visit-main"><div className="flex items-start justify-between gap-3"><div><span className="font-mono text-[10px] font-bold text-accent">{r.code}</span><h3>{r.serviceType}</h3></div><Status value={r.status} /></div><p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin size={13} /> {r.address}</p><p className="mt-1 text-xs text-muted-foreground"><UserRound size={13} className="mr-1 inline" /> {r.customerName} · {r.whatsapp}</p><div className="mt-4 flex flex-wrap gap-2">{r.status === 'assigned' && <Button className="!px-3 !py-2 text-xs" onClick={() => startVisit(r.id)} disabled={update.isPending} data-testid={`button-start-visit-${r.id}`}><MapPin size={14} /> Mulai kunjungan</Button>}{r.status === 'on_site' && <Link href={`/worker/reports?request=${r.id}`} className="btn btn-primary !px-3 !py-2 text-xs" data-testid={`link-report-${r.id}`}><FileText size={14} /> Buat laporan</Link>}<a href={`https://www.google.com/maps?q=${r.latitude},${r.longitude}`} target="_blank" rel="noreferrer" className="btn btn-outline !px-3 !py-2 text-xs" data-testid={`link-worker-map-${r.id}`}><MapPin size={14} /> Buka lokasi</a><a href={`https://wa.me/${r.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="btn btn-outline !px-3 !py-2 text-xs" data-testid={`link-worker-whatsapp-${r.id}`}><MessageCircle size={14} /> WhatsApp pelanggan</a></div></div></div>)}</div>{report && <div className="notice notice-info mt-6"><Sparkles size={16} /><span><strong>Laporan dibutuhkan</strong> Kunjungan {report.code} sedang berlangsung. Catat hasil sebelum meninggalkan lokasi.</span></div>}</AppShell>;
}
function NavigationIcon() { return <div className="relative"><MapPin size={48} strokeWidth={1.3} /><span className="absolute inset-0 grid place-items-center text-primary"><span className="mt-[-8px] size-2 rounded-full bg-primary" /></span></div>; }

function WorkerReports() {
  const client = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const requestsQuery = useListServiceRequests();
  const create = useCreateFieldReport();
  const [requestId, setRequestId] = useState(Number(params.get('request')) || 40);
  const [notes, setNotes] = useState('');
  const [media, setMedia] = useState<string[]>([]);
  const requests = (requestsQuery.data || demoRequests).filter((r) => r.assignedWorkerId === 1 && r.status === 'on_site');
  const submit = (e: React.FormEvent) => { e.preventDefault(); create.mutate({ id: requestId, data: { notes, media } }, { onSuccess: () => { setNotes(''); setMedia([]); client.invalidateQueries({ queryKey: getListServiceRequestsQueryKey() }); client.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }); } }); };
  return <AppShell role="worker"><PageIntro eyebrow="Bukti pekerjaan" title="Laporan lapangan" body="Tutup kunjungan dengan catatan yang jelas untuk admin dan pelanggan." /><div className="report-layout"><form className="panel report-form" onSubmit={submit}><div className="panel-head"><div><h3>Laporan baru</h3><p className="text-xs text-muted-foreground">Satu laporan untuk satu permintaan.</p></div><FileText size={18} className="text-muted-foreground" /></div><div className="space-y-5"><Field label="Permintaan"><select value={requestId} onChange={(e) => setRequestId(Number(e.target.value))} data-testid="select-report-request">{requests.map((r) => <option key={r.id} value={r.id}>{r.code} · {r.customerName}</option>)}</select></Field><Field label="Catatan pekerjaan" hint="Jelaskan temuan, tindakan, dan rekomendasi selanjutnya."><textarea required minLength={8} className="min-h-[170px]" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Contoh: Pemeriksaan MCB selesai. Ditemukan koneksi longgar pada jalur AC..." data-testid="input-report-notes" /></Field><Field label="Media pendukung" hint="Tambahkan nama file atau metadata foto/video yang diambil di lokasi."><div className="upload-box"><input type="file" multiple accept="image/*,video/*" onChange={(e) => setMedia(Array.from(e.target.files || []).map((f) => `${f.name} · ${Math.round(f.size / 1024)} KB`))} data-testid="input-report-media" /><Paperclip size={19} /><strong>Pilih foto atau video</strong><span>File tidak dikirim sebelum Anda menekan simpan</span></div>{media.length > 0 && <div className="mt-3 space-y-2">{media.map((m) => <div className="media-chip" key={m}><Paperclip size={13} />{m}<button type="button" onClick={() => setMedia(media.filter((x) => x !== m))} data-testid={`button-remove-media-${m}`}><X size={13} /></button></div>)}</div>}</Field></div><Button type="submit" className="mt-7 w-full justify-center" disabled={create.isPending} data-testid="button-submit-report">{create.isPending ? 'Menyimpan laporan...' : <><Send size={15} /> Simpan laporan</>}</Button></form><div className="panel report-side"><div className="eyebrow">Checklist sebelum kirim</div><h3>Detail yang membantu tim</h3>{['Kondisi awal dan temuan', 'Tindakan yang sudah dilakukan', 'Material atau biaya tambahan', 'Rekomendasi untuk pelanggan'].map((item) => <div className="check-row" key={item}><span><Check size={13} /></span>{item}</div>)}<div className="report-tip"><ShieldCheck size={18} /><span>Foto yang jelas membantu admin membuat keputusan lebih cepat.</span></div></div></div></AppShell>;
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

function Router() {
  return <ErrorBoundary resetKey={window.location.pathname}><Switch><Route path="/" component={CustomerHome} /><Route path="/login" component={Login} /><Route path="/admin" component={AdminHome} /><Route path="/admin/requests" component={AdminRequests} /><Route path="/admin/transactions" component={AdminTransactions} /><Route path="/admin/equipment" component={AdminEquipment} /><Route path="/admin/users" component={AdminUsers} /><Route path="/worker" component={WorkerHome} /><Route path="/worker/equipment" component={WorkerEquipment} /><Route path="/worker/reports" component={WorkerReports} /><Route component={NotFound} /></Switch></ErrorBoundary>;
}
function App() { return <QueryClientProvider client={queryClient}><TooltipProvider><Router /><Toaster /></TooltipProvider></QueryClientProvider>; }
export default App;