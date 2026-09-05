import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, Check, Zap, ArrowRight, Info, CheckCircle2 } from 'lucide-react';

export interface NidiSloTariff {
  id: number;
  sortOrder: number;
  powerVa: number;
  powerLabel: string;
  sloFee: number;
  nidiFee: number;
  totalFee: number;
  notes?: string | null;
  isActive?: number;
}

// 14 Standard official tiers matching the price list image
export const DEFAULT_OFFICIAL_NIDI_SLO_TARIFFS: NidiSloTariff[] = [
  { id: 1, sortOrder: 1, powerVa: 450, powerLabel: '450', sloFee: 40000, nidiFee: 45000, totalFee: 85000, notes: 'Tarif tetap TR 450 VA', isActive: 1 },
  { id: 2, sortOrder: 2, powerVa: 900, powerLabel: '900', sloFee: 60000, nidiFee: 90000, totalFee: 150000, notes: 'Tarif tetap TR 900 VA', isActive: 1 },
  { id: 3, sortOrder: 3, powerVa: 1300, powerLabel: '1.300', sloFee: 120000, nidiFee: 130000, totalFee: 250000, notes: 'Tarif tetap TR 1.300 VA', isActive: 1 },
  { id: 4, sortOrder: 4, powerVa: 2200, powerLabel: '2.200', sloFee: 135000, nidiFee: 220000, totalFee: 355000, notes: 'Tarif tetap TR 2.200 VA', isActive: 1 },
  { id: 5, sortOrder: 5, powerVa: 3500, powerLabel: '3.500', sloFee: 122500, nidiFee: 350000, totalFee: 472500, notes: 'SLO: 3.500 VA × Rp35/VA | NIDI: 3.500 VA × Rp100/VA', isActive: 1 },
  { id: 6, sortOrder: 6, powerVa: 4400, powerLabel: '4.400', sloFee: 154000, nidiFee: 440000, totalFee: 594000, notes: 'SLO: 4.400 VA × Rp35/VA | NIDI: 4.400 VA × Rp100/VA', isActive: 1 },
  { id: 7, sortOrder: 7, powerVa: 5500, powerLabel: '5.500', sloFee: 192500, nidiFee: 550000, totalFee: 742500, notes: 'SLO: 5.500 VA × Rp35/VA | NIDI: 5.500 VA × Rp100/VA', isActive: 1 },
  { id: 8, sortOrder: 8, powerVa: 6600, powerLabel: '6.600', sloFee: 231000, nidiFee: 660000, totalFee: 891000, notes: 'SLO: 6.600 VA × Rp35/VA | NIDI: 6.600 VA × Rp100/VA', isActive: 1 },
  { id: 9, sortOrder: 9, powerVa: 7700, powerLabel: '7.700', sloFee: 269500, nidiFee: 770000, totalFee: 1039500, notes: 'SLO: 7.700 VA × Rp35/VA | NIDI: 7.700 VA × Rp100/VA', isActive: 1 },
  { id: 10, sortOrder: 10, powerVa: 10600, powerLabel: '10.600', sloFee: 318000, nidiFee: 1060000, totalFee: 1378000, notes: 'SLO: 10.600 VA × Rp30/VA | NIDI: 10.600 VA × Rp100/VA', isActive: 1 },
  { id: 11, sortOrder: 11, powerVa: 11000, powerLabel: '11.000', sloFee: 330000, nidiFee: 1100000, totalFee: 1430000, notes: 'SLO: 11.000 VA × Rp30/VA | NIDI: 11.000 VA × Rp100/VA', isActive: 1 },
  { id: 12, sortOrder: 12, powerVa: 13200, powerLabel: '13.200', sloFee: 396000, nidiFee: 1320000, totalFee: 1716000, notes: 'SLO: 13.200 VA × Rp30/VA | NIDI: 13.200 VA × Rp100/VA', isActive: 1 },
  { id: 13, sortOrder: 13, powerVa: 16500, powerLabel: '16.500', sloFee: 495000, nidiFee: 1650000, totalFee: 2145000, notes: 'SLO: 16.500 VA × Rp30/VA | NIDI: 16.500 VA × Rp100/VA', isActive: 1 },
  { id: 14, sortOrder: 14, powerVa: 23000, powerLabel: '23.000', sloFee: 690000, nidiFee: 2300000, totalFee: 2990000, notes: 'SLO: 23.000 VA × Rp30/VA | NIDI: 23.000 VA × Rp100/VA', isActive: 1 },
];

function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
}

function formatNumber(num: number): string {
  return num.toLocaleString('id-ID');
}

interface NidiSloPricingModalProps {
  open: boolean;
  onClose: () => void;
  tariffs?: NidiSloTariff[];
  selectedTariffId?: number | null;
  onSelectTariff: (tariff: NidiSloTariff) => void;
}

export function NidiSloPricingModal({
  open,
  onClose,
  tariffs,
  selectedTariffId,
  onSelectTariff,
}: NidiSloPricingModalProps) {
  const [search, setSearch] = useState('');

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  const activeTariffList = useMemo(() => {
    if (tariffs && tariffs.length > 0) {
      return tariffs;
    }
    return DEFAULT_OFFICIAL_NIDI_SLO_TARIFFS;
  }, [tariffs]);

  const filteredTariffs = useMemo(() => {
    if (!search.trim()) return activeTariffList;
    const q = search.toLowerCase().replace(/\./g, '').trim();
    return activeTariffList.filter((t) => {
      const vaStr = String(t.powerVa);
      const labelStr = t.powerLabel.toLowerCase().replace(/\./g, '');
      const notes = (t.notes || '').toLowerCase();
      return vaStr.includes(q) || labelStr.includes(q) || notes.includes(q);
    });
  }, [activeTariffList, search]);

  const selectedTariff = useMemo(() => {
    if (!selectedTariffId) return activeTariffList[0] || null;
    return activeTariffList.find((t) => t.id === selectedTariffId) || activeTariffList[0] || null;
  }, [activeTariffList, selectedTariffId]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-black/75 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="nidi-slo-modal-title"
    >
      <div
        className="relative w-full max-w-5xl rounded-2xl bg-card border border-border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-card-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Banner */}
        <div className="bg-[#1e4e79] text-white px-5 py-4 sm:px-6 sm:py-5 flex items-start justify-between gap-4 border-b border-[#163c5e]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-6 items-center justify-center rounded-lg bg-amber-400 text-slate-950 font-black text-xs">
                ⚡
              </span>
              <h2 id="nidi-slo-modal-title" className="text-base sm:text-lg md:text-xl font-extrabold tracking-tight text-white !text-white" style={{ color: '#ffffff' }}>
                Daftar Tarif Biaya SLO & Supervisi NIDI (Tegangan Rendah)
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-blue-100/95 leading-relaxed max-w-3xl" style={{ color: '#e2edfa' }}>
              Daftar tarif resmi sertifikasi Sertifikat Laik Operasi (SLO) dan supervisi Nomor Identitas Instalasi (NIDI) untuk instalasi listrik tegangan rendah. Klik baris atau tombol <strong>Pilih</strong> untuk memilih daya Anda.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/10 hover:bg-white/20 p-2 text-white transition-colors shrink-0"
            aria-label="Tutup popup daftar tarif"
            data-testid="button-close-nidi-pricing-modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter & Quick Info Bar */}
        <div className="px-5 py-3 sm:px-6 bg-muted/40 border-b border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info size={14} className="text-[#1e4e79] dark:text-blue-400 shrink-0" />
            <span>Pilih daya (VA) yang sesuai dengan kapasitas meteran / MCB listrik Anda.</span>
          </div>

          <div className="relative w-full sm:w-64 shrink-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari daya, cth: 900, 1.300..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#1e4e79]"
              data-testid="input-search-nidi-modal"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Pricing Matrix Table */}
        <div className="flex-1 overflow-x-auto overflow-y-auto p-3 sm:p-6">
          <div className="rounded-xl border border-[#c2d4e5] dark:border-border overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse min-w-[620px] nidi-modal-table">
              <thead>
                <tr className="bg-[#1e4e79] text-white !text-white text-xs sm:text-sm font-bold tracking-wide">
                  <th className="py-3 px-3 text-center border-r border-[#306494] w-12 sm:w-14 text-white !text-white font-bold" style={{ color: '#ffffff' }}>
                    No.
                  </th>
                  <th className="py-3 px-4 text-center border-r border-[#306494] text-white !text-white font-bold" style={{ color: '#ffffff' }}>
                    Daya (VA)
                  </th>
                  <th className="py-3 px-4 text-right border-r border-[#306494] text-white !text-white font-bold" style={{ color: '#ffffff' }}>
                    Biaya SLO (Rp)
                  </th>
                  <th className="py-3 px-4 text-right border-r border-[#306494] text-white !text-white font-bold" style={{ color: '#ffffff' }}>
                    Biaya Supervisi NIDI (Rp)
                  </th>
                  <th className="py-3 px-4 text-right border-r border-[#306494] text-white !text-white font-bold" style={{ color: '#ffffff' }}>
                    Total (Rp)
                  </th>
                  <th className="py-3 px-3 text-center w-28 text-white !text-white font-bold" style={{ color: '#ffffff' }}>
                    Pilih Daya
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTariffs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                      Tidak ada tarif yang cocok dengan pencarian "{search}".
                    </td>
                  </tr>
                ) : (
                  filteredTariffs.map((t, index) => {
                    const isSelected = selectedTariff?.id === t.id;
                    const isOdd = index % 2 === 1;

                    return (
                      <tr
                        key={t.id}
                        onClick={() => onSelectTariff(t)}
                        className={`cursor-pointer transition-colors border-b border-[#cddce9] dark:border-border/60 ${
                          isSelected
                            ? 'bg-amber-100/60 dark:bg-amber-950/40 ring-2 ring-inset ring-amber-500 font-medium'
                            : isOdd
                            ? 'bg-[#f0f5fa] dark:bg-[#152535]/70 hover:bg-[#dfeaf4] dark:hover:bg-[#1c3247]'
                            : 'bg-white dark:bg-card hover:bg-[#eaf1f8] dark:hover:bg-[#1a2d40]'
                        }`}
                        data-testid={`row-nidi-tariff-${t.id}`}
                      >
                        {/* No. */}
                        <td className="py-2.5 px-3 text-center text-xs font-semibold text-muted-foreground border-r border-[#d4e2ed] dark:border-border/60">
                          {t.sortOrder || index + 1}
                        </td>

                        {/* Daya (VA) */}
                        <td className="py-2.5 px-4 text-center font-bold text-sm text-foreground border-r border-[#d4e2ed] dark:border-border/60">
                          {formatNumber(t.powerVa)}
                        </td>

                        {/* Biaya SLO (Rp) */}
                        <td className="py-2.5 px-4 text-right font-mono text-xs sm:text-sm text-foreground border-r border-[#d4e2ed] dark:border-border/60">
                          {formatNumber(t.sloFee)}
                        </td>

                        {/* Biaya Supervisi NIDI (Rp) */}
                        <td className="py-2.5 px-4 text-right font-mono text-xs sm:text-sm text-foreground border-r border-[#d4e2ed] dark:border-border/60">
                          {formatNumber(t.nidiFee)}
                        </td>

                        {/* Total (Rp) - Bold Crimson Font matching the screenshot */}
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-sm sm:text-base text-[#b82e2e] dark:text-rose-400 border-r border-[#d4e2ed] dark:border-border/60">
                          {formatNumber(t.totalFee)}
                        </td>

                        {/* Action / Select Button */}
                        <td className="py-2.5 px-3 text-center">
                          {isSelected ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs">
                              <Check size={13} /> Terpilih
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectTariff(t);
                              }}
                              className="rounded-md bg-[#1e4e79] hover:bg-[#14395b] px-3 py-1 text-[11px] font-bold text-white transition-colors shadow-xs"
                              data-testid={`btn-select-tariff-${t.id}`}
                            >
                              Pilih
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Bottom Sticky Summary & Action Bar */}
        <div className="bg-card border-t border-border px-5 py-3 sm:px-6 sm:py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {selectedTariff ? (
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 grid place-items-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div className="text-xs sm:text-sm leading-tight">
                <span className="text-muted-foreground block text-[11px]">Daya Listrik Terpilih:</span>
                <span className="font-bold text-foreground text-sm sm:text-base">
                  {selectedTariff.powerLabel} ({formatNumber(selectedTariff.powerVa)} VA)
                </span>
                <span className="mx-2 text-muted-foreground hidden sm:inline">|</span>
                <span className="font-mono font-black text-[#b82e2e] dark:text-rose-400 text-sm sm:text-base block sm:inline">
                  Total: {formatRupiah(selectedTariff.totalFee)}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              Silakan pilih salah satu baris daya di tabel di atas.
            </div>
          )}

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-xs font-semibold text-foreground transition-colors"
              data-testid="button-cancel-nidi-modal"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-[#1e4e79] hover:bg-[#163e63] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              data-testid="button-apply-nidi-tariff"
            >
              <span>Gunakan Daya Ini</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
