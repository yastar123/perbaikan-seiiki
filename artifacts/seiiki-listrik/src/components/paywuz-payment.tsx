import React, { useState, useEffect, useMemo, useRef } from 'react';
import QRCode from 'qrcode';
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Download,
  ExternalLink,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Store,
  WalletCards,
  X
} from 'lucide-react';

export interface PaywuzPaymentMethod {
  code: string;
  name: string;
  type: string;
  fee: {
    flatIdr: number;
    percentBps: number;
    totalIdr: number;
  };
  limits: {
    minIdr: number;
    maxIdr: number;
  };
}

export interface ActivePaywuzTransaction {
  id: string;
  orderId: string;
  amount: number;
  totalPayment: number;
  paymentMethod: string;
  paymentNumber: string | null;
  paymentUrl: string;
  status: string;
  expiresAt: string | null;
  customerName?: string;
  requestCode?: string;
}

interface PaywuzPaymentProps {
  requestId: number;
  requestCode: string;
  customerName: string;
  amount: number;
  adminWhatsapp?: string;
  onPaymentSuccess: () => void;
  onCancel?: () => void;
}

const rupiah = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);

export function PaywuzPayment({
  requestId,
  requestCode,
  customerName,
  amount,
  adminWhatsapp = '6281112345678',
  onPaymentSuccess,
  onCancel,
}: PaywuzPaymentProps) {
  const [methods, setMethods] = useState<PaywuzPaymentMethod[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<string>('QRIS');
  const [creating, setCreating] = useState(false);
  const [activeTx, setActiveTx] = useState<ActivePaywuzTransaction | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch available payment methods from Paywuz
  useEffect(() => {
    let mounted = true;
    async function fetchMethods() {
      try {
        setLoadingMethods(true);
        const res = await fetch('/api/paywuz/payment-methods');
        const json = await res.json();
        if (mounted && json.data && Array.isArray(json.data)) {
          setMethods(json.data);
          // Default to QRIS if available
          const hasQris = json.data.some((m: PaywuzPaymentMethod) => m.code === 'QRIS');
          if (hasQris) setSelectedMethod('QRIS');
          else if (json.data.length > 0) setSelectedMethod(json.data[0].code);
        }
      } catch (err: any) {
        if (mounted) setErrorMsg('Gagal memuat metode pembayaran Paywuz.');
      } finally {
        if (mounted) setLoadingMethods(false);
      }
    }
    fetchMethods();
    return () => {
      mounted = false;
    };
  }, []);

  // 2. Generate QR code image when paymentNumber is available for QRIS
  useEffect(() => {
    if (activeTx?.paymentNumber && activeTx.paymentMethod === 'QRIS') {
      QRCode.toDataURL(activeTx.paymentNumber, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch(() => setQrDataUrl(''));
    } else {
      setQrDataUrl('');
    }
  }, [activeTx]);

  // 3. Expiry Countdown Timer
  useEffect(() => {
    if (!activeTx?.expiresAt) return;

    const expiryTime = new Date(activeTx.expiresAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = expiryTime - now;

      if (diff <= 0) {
        setTimeLeft('Kedaluwarsa');
        return;
      }

      const minutes = Math.floor(diff / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeTx?.expiresAt]);

  // 4. Auto Polling for Transaction Status
  useEffect(() => {
    if (!activeTx || activeTx.status === 'success' || activeTx.status === 'paid') {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/paywuz/status/${encodeURIComponent(activeTx.orderId)}`);
        const json = await res.json();
        if (json.isPaid) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setActiveTx((prev) => (prev ? { ...prev, status: 'success' } : null));
          onPaymentSuccess();
        }
      } catch {}
    };

    pollingRef.current = setInterval(checkStatus, 4000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [activeTx, onPaymentSuccess]);

  // Handle Manual Status Check
  const handleManualCheck = async () => {
    if (!activeTx) return;
    setChecking(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/paywuz/status/${encodeURIComponent(activeTx.orderId)}`);
      const json = await res.json();
      if (json.isPaid) {
        setActiveTx((prev) => (prev ? { ...prev, status: 'success' } : null));
        onPaymentSuccess();
      } else {
        setErrorMsg('Pembayaran belum terdeteksi. Silakan selesaikan pembayaran dan cek kembali.');
        setTimeout(() => setErrorMsg(null), 4000);
      }
    } catch (err: any) {
      setErrorMsg('Gagal memeriksa status pembayaran.');
    } finally {
      setChecking(false);
    }
  };

  // Handle Create Transaction
  const handleStartPayment = async () => {
    setCreating(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/paywuz/create-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          paymentMethod: selectedMethod,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || json.error || 'Gagal memulai transaksi Paywuz');
      }

      setActiveTx(json.data);
      if (json.data.status === 'success' || json.data.status === 'paid') {
        onPaymentSuccess();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat memproses Paywuz');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2500);
  };

  // Group methods
  const { qrisMethod, vaMethods, retailMethods } = useMemo(() => {
    const qris = methods.find((m) => m.type === 'qris' || m.code === 'QRIS');
    const vas = methods.filter((m) => m.type === 'virtual_account' || m.type === 'meta' || m.code.endsWith('VA'));
    const retails = methods.filter((m) => m.type === 'retail');
    return { qrisMethod: qris, vaMethods: vas, retailMethods: retails };
  }, [methods]);

  // Selected method object & fee estimate
  const currentMethodObj = useMemo(
    () => methods.find((m) => m.code === selectedMethod),
    [methods, selectedMethod]
  );

  const estimatedFee = useMemo(() => {
    if (!currentMethodObj) return 290;
    const flat = currentMethodObj.fee?.flatIdr || 0;
    const bps = currentMethodObj.fee?.percentBps || 0;
    return flat + Math.ceil((amount * bps) / 10000);
  }, [currentMethodObj, amount]);

  const estimatedTotal = amount + estimatedFee;

  // VIEW 1: Active Pending Payment
  if (activeTx) {
    const isQris = activeTx.paymentMethod === 'QRIS';
    const isVa =
      activeTx.paymentMethod.endsWith('VA') ||
      activeTx.paymentMethod === 'VA' ||
      activeTx.paymentMethod.startsWith('VA_');

    return (
      <div className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5 text-card-foreground shadow-sm transition-all" data-testid="paywuz-active-container">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/15 text-accent font-black text-xs">
              ⚡
            </span>
            <div>
              <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
                <span>Pembayaran via Paywuz</span>
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 text-emerald-600 px-1.5 py-0.2 text-[9px] font-bold">
                  Resmi
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground font-mono">
                Order #{activeTx.orderId}
              </div>
            </div>
          </div>

          {timeLeft && (
            <div className="flex items-center gap-1 text-[11px] font-mono font-semibold bg-amber-500/10 text-amber-600 px-2 py-1 rounded-md">
              <Clock size={12} /> {timeLeft}
            </div>
          )}
        </div>

        {/* Total Payment Highlight */}
        <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
          <div>
            <span className="block text-[11px] text-muted-foreground">Total Tagihan</span>
            <span className="text-lg font-extrabold tracking-tight text-foreground font-mono">
              {rupiah(activeTx.totalPayment || estimatedTotal)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleCopy(String(activeTx.totalPayment || estimatedTotal), 'nominal')}
            className="flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
            title="Salin nominal pas"
          >
            {copied === 'nominal' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            <span>{copied === 'nominal' ? 'Disalin' : 'Salin'}</span>
          </button>
        </div>

        {/* QRIS Display */}
        {isQris && (
          <div className="flex flex-col items-center justify-center py-2 space-y-3">
            <div className="relative rounded-2xl border-2 border-dashed border-border bg-white p-3 shadow-inner">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QRIS Paywuz Code"
                  className="h-56 w-56 sm:h-64 sm:w-64 object-contain rounded-lg"
                  data-testid="paywuz-qris-image"
                />
              ) : (
                <div className="h-56 w-56 flex flex-col items-center justify-center text-center p-4">
                  <RefreshCw className="animate-spin text-muted-foreground mb-2" size={24} />
                  <span className="text-xs text-muted-foreground">Menyiapkan QRIS Paywuz...</span>
                </div>
              )}
            </div>

            <div className="text-center space-y-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-foreground">
                <QrCode size={13} className="text-accent" /> Scan dengan BCA, Livin, GoPay, OVO, Dana, ShopeePay
              </span>
              <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                Tangkapan layar atau scan langsung. Status akan otomatis terverifikasi tanpa upload bukti transfer.
              </p>
            </div>

            {qrDataUrl && (
              <a
                href={qrDataUrl}
                download={`QRIS-SEIIKI-${requestCode}.png`}
                className="btn btn-outline text-xs !py-1.5 !px-3 gap-1.5"
                data-testid="button-download-qr"
              >
                <Download size={13} /> Unduh Gambar QRIS
              </a>
            )}
          </div>
        )}

        {/* Virtual Account Display */}
        {isVa && (
          <div className="space-y-3 py-1">
            <div className="rounded-lg border border-border bg-background p-3 space-y-2">
              <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                <span>Metode: {activeTx.paymentMethod}</span>
                <span className="font-mono text-[10px] text-emerald-600 font-bold uppercase">Virtual Account</span>
              </div>

              {activeTx.paymentNumber ? (
                <div className="flex items-center justify-between bg-muted/60 p-2.5 rounded-md">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Nomor Virtual Account</span>
                    <span className="text-base sm:text-lg font-black tracking-wider text-foreground font-mono">
                      {activeTx.paymentNumber}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(activeTx.paymentNumber!, 'va')}
                    className="btn btn-outline text-xs !py-1 !px-2.5 gap-1"
                    data-testid="button-copy-va"
                  >
                    {copied === 'va' ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    <span>{copied === 'va' ? 'Tersalin' : 'Salin'}</span>
                  </button>
                </div>
              ) : (
                <div className="bg-amber-500/10 text-amber-700 p-2.5 rounded-md text-xs">
                  Silakan buka halaman pembayaran Paywuz di bawah untuk memilih bank tujuan Anda.
                </div>
              )}
            </div>

            <div className="text-[11px] text-muted-foreground space-y-1 bg-muted/30 p-2.5 rounded-md">
              <strong className="block text-foreground text-xs font-bold">Panduan Pembayaran:</strong>
              <p>1. Buka Mobile Banking atau ATM bank Anda.</p>
              <p>2. Pilih menu Transfer Virtual Account / Bayar Tagihan.</p>
              <p>3. Masukkan nomor VA dan pastikan nama tertera adalah SEIIKI / Paywuz.</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleManualCheck}
            disabled={checking}
            className="btn btn-primary w-full justify-center !py-2.5 text-xs font-bold gap-2"
            data-testid="button-check-payment-status"
          >
            <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
            {checking ? 'Memverifikasi...' : 'Saya Sudah Membayar — Cek Status'}
          </button>

          {activeTx.paymentUrl && (
            <a
              href={activeTx.paymentUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline w-full justify-center !py-2 text-xs font-bold gap-1.5 text-muted-foreground hover:text-foreground"
              data-testid="link-paywuz-checkout"
            >
              <span>Buka Halaman Checkout Paywuz</span>
              <ExternalLink size={13} />
            </a>
          )}

          {errorMsg && (
            <div className="rounded-md bg-destructive/10 p-2.5 text-xs text-destructive flex items-center gap-1.5">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 text-[11px] text-muted-foreground">
            <button
              type="button"
              onClick={() => {
                setActiveTx(null);
                if (pollingRef.current) clearInterval(pollingRef.current);
              }}
              className="hover:underline hover:text-foreground font-semibold"
              data-testid="button-change-payment-method"
            >
              ← Ganti Metode Lain
            </button>

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="hover:underline text-destructive/80 font-semibold"
              >
                Batalkan
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // VIEW 2: Selection of Payment Methods
  return (
    <div className="space-y-4" data-testid="paywuz-selection-container">
      <div className="payment-line">
        <span>
          <span className="block text-xs font-bold text-foreground">Biaya Kunjungan Teknisi</span>
          <span className="text-[11px] text-muted-foreground">
            Pemesanan #{requestCode} · {customerName}
          </span>
        </span>
        <strong className="text-base font-extrabold">{rupiah(amount)}</strong>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
          <span>Pilih Pembayaran via Paywuz</span>
          <span className="inline-flex items-center gap-1 font-normal text-[11px] text-accent">
            <ShieldCheck size={13} /> Aman & Terverifikasi
          </span>
        </div>

        {loadingMethods ? (
          <div className="flex items-center justify-center p-6 text-xs text-muted-foreground gap-2">
            <RefreshCw className="animate-spin" size={16} /> Memuat metode pembayaran...
          </div>
        ) : (
          <div className="space-y-2.5">
            {/* 1. QRIS Primary Option */}
            {qrisMethod && (
              <button
                type="button"
                onClick={() => setSelectedMethod(qrisMethod.code)}
                className={`w-full text-left rounded-xl border p-3 transition-all flex items-start justify-between ${
                  selectedMethod === qrisMethod.code
                    ? 'border-accent bg-accent/5 ring-1 ring-accent'
                    : 'border-border bg-card hover:bg-muted/40'
                }`}
                data-testid="paywuz-method-QRIS"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
                    <QrCode size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-xs font-bold text-foreground">QRIS (Semua Pembayaran)</strong>
                      <span className="rounded-full bg-accent/15 text-accent px-1.5 py-0.5 text-[9px] font-bold">
                        Instan
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      BCA, Mandiri, BRImo, GoPay, OVO, Dana, ShopeePay, LinkAja.
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block text-xs font-extrabold font-mono text-foreground">
                    {rupiah(amount + (qrisMethod.fee?.totalIdr || 290))}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Termasuk biaya QR</span>
                </div>
              </button>
            )}

            {/* 2. Virtual Account Options */}
            {vaMethods.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                  <Building2 size={14} />
                  <span>Transfer Virtual Account (Bank)</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {vaMethods.map((va) => {
                    const isSelected = selectedMethod === va.code;
                    const label = va.code === 'VA' ? 'Pilih Bank (Paywuz)' : va.name.replace(' Virtual Account', ' VA');
                    return (
                      <button
                        type="button"
                        key={va.code}
                        onClick={() => setSelectedMethod(va.code)}
                        className={`rounded-lg border p-2 text-left text-xs transition-all ${
                          isSelected
                            ? 'border-accent bg-accent/10 font-bold text-accent'
                            : 'border-border bg-background hover:bg-muted/40 text-foreground font-medium'
                        }`}
                        data-testid={`paywuz-method-${va.code}`}
                      >
                        <div className="truncate">{label}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                          +{rupiah(va.fee?.flatIdr || 3400)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Retail Options if any */}
            {retailMethods.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                  <Store size={14} />
                  <span>Gerai Retail (Alfamart / Indomaret)</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {retailMethods.map((rt) => (
                    <button
                      type="button"
                      key={rt.code}
                      onClick={() => setSelectedMethod(rt.code)}
                      className={`rounded-lg border p-2 text-left text-xs transition-all ${
                        selectedMethod === rt.code
                          ? 'border-accent bg-accent/10 font-bold text-accent'
                          : 'border-border bg-background hover:bg-muted/40 text-foreground'
                      }`}
                      data-testid={`paywuz-method-${rt.code}`}
                    >
                      <div className="font-semibold truncate">{rt.name}</div>
                      <div className="text-[10px] text-muted-foreground">+{rupiah(rt.fee?.flatIdr || 3000)}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Breakdown Notice */}
      <div className="rounded-lg bg-muted/40 p-2.5 text-[11px] text-muted-foreground space-y-1">
        <div className="flex justify-between">
          <span>Biaya Kunjungan:</span>
          <span>{rupiah(amount)}</span>
        </div>
        <div className="flex justify-between">
          <span>Biaya Layanan Gateway:</span>
          <span>{rupiah(estimatedFee)}</span>
        </div>
        <div className="flex justify-between border-t border-border/60 pt-1 font-bold text-foreground">
          <span>Total Pembayaran:</span>
          <span className="font-mono text-accent">{rupiah(estimatedTotal)}</span>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-md bg-destructive/10 p-2.5 text-xs text-destructive flex items-center gap-1.5">
          <AlertCircle size={14} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Primary Pay Button */}
      <button
        type="button"
        className="btn btn-primary w-full justify-center !py-3 text-xs font-bold gap-2"
        onClick={handleStartPayment}
        disabled={creating || loadingMethods}
        data-testid="button-pay-with-paywuz"
      >
        {creating ? (
          <>
            <RefreshCw size={14} className="animate-spin" />
            <span>Menghubungkan ke Paywuz...</span>
          </>
        ) : (
          <>
            <span>Bayar {rupiah(estimatedTotal)} via Paywuz</span>
            <ArrowRight size={15} />
          </>
        )}
      </button>

      <div className="text-center">
        <span className="text-[10px] text-muted-foreground">
          Didukung oleh <strong className="text-foreground">Paywuz Merchant Gateway</strong> · Terenkripsi SSL 256-bit
        </span>
      </div>
    </div>
  );
}
