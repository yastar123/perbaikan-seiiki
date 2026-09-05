import React, { useState, useEffect, useId } from 'react';
import {
  Paperclip,
  Download,
  Eye,
  X,
  FileText,
  File,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Trash2,
  UploadCloud,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react';

export interface ParsedReportMedia {
  id: string;
  name: string;
  type: string;
  size?: number;
  sizeFormatted: string;
  url?: string;
  isImage: boolean;
  isPdf: boolean;
  isDoc: boolean;
  uploadedAt?: string;
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return 'Ukuran tidak diketahui';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function parseReportMedia(raw: string, index = 0): ParsedReportMedia {
  const defaultId = `media-${index}-${Date.now()}`;

  // 1. Check if raw string is JSON format
  if (typeof raw === 'string' && raw.trim().startsWith('{') && raw.trim().endsWith('}')) {
    try {
      const obj = JSON.parse(raw);
      const name = obj.name || `Lampiran_${index + 1}`;
      const type = (obj.type || '').toLowerCase();
      const url = obj.url || obj.data;
      const isImg = type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg|avif)$/i.test(name);
      const isPdf = type === 'application/pdf' || /\.pdf$/i.test(name);
      const isDoc = /\.(doc|docx|xls|xlsx|txt|ppt|pptx)$/i.test(name);

      return {
        id: obj.id || defaultId,
        name,
        type: type || (isImg ? 'image/jpeg' : isPdf ? 'application/pdf' : 'application/octet-stream'),
        size: obj.size,
        sizeFormatted: obj.size ? formatFileSize(obj.size) : 'File',
        url,
        isImage: isImg,
        isPdf,
        isDoc,
        uploadedAt: obj.uploadedAt,
      };
    } catch {
      // ignore json parse error, fall through
    }
  }

  // 2. Check if raw string is a Data URL
  if (typeof raw === 'string' && raw.startsWith('data:')) {
    const mimeMatch = raw.match(/^data:([^;]+);/);
    const mime = mimeMatch ? mimeMatch[1] : '';
    const isImg = mime.startsWith('image/');
    const isPdf = mime === 'application/pdf';
    const ext = isImg ? (mime.split('/')[1] || 'jpg') : isPdf ? 'pdf' : 'bin';
    const name = `Foto_Laporan_${index + 1}.${ext}`;

    return {
      id: defaultId,
      name,
      type: mime || (isImg ? 'image/jpeg' : 'application/octet-stream'),
      sizeFormatted: 'Data Gambar',
      url: raw,
      isImage: isImg,
      isPdf,
      isDoc: false,
    };
  }

  // 3. Check if raw string is a normal URL (HTTP / HTTPS / path)
  if (typeof raw === 'string' && (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/'))) {
    const filename = raw.split('/').pop()?.split('?')[0] || `Lampiran_${index + 1}`;
    const isImg = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(filename);
    const isPdf = /\.pdf$/i.test(filename);
    const isDoc = /\.(doc|docx|xls|xlsx|txt)$/i.test(filename);

    return {
      id: defaultId,
      name: filename,
      type: isImg ? 'image/jpeg' : isPdf ? 'application/pdf' : 'application/octet-stream',
      sizeFormatted: 'File URL',
      url: raw,
      isImage: isImg,
      isPdf,
      isDoc,
    };
  }

  // 4. Legacy string format e.g. "foto-mcb.jpg · 240 KB"
  const parts = String(raw || '').split('·').map((s) => s.trim());
  const name = parts[0] || `Lampiran_${index + 1}`;
  const sizeText = parts[1] || 'Tersimpan';
  const isImg = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(name) || /foto|gambar|img|pic/i.test(name);
  const isPdf = /\.pdf$/i.test(name);
  const isDoc = /\.(doc|docx|xls|xlsx|txt)$/i.test(name);

  return {
    id: defaultId,
    name,
    type: isImg ? 'image/jpeg' : isPdf ? 'application/pdf' : 'application/octet-stream',
    sizeFormatted: sizeText,
    url: undefined, // no data in legacy placeholder
    isImage: isImg,
    isPdf,
    isDoc,
  };
}

export function downloadMediaItem(item: ParsedReportMedia) {
  if (!item.url) {
    // Generate an informational text file if legacy data has no binary payload
    const infoText = `INFORMASI BERKAS LAPANGAN SEIIKI LISTRIK\n` +
      `============================================\n` +
      `Nama Berkas : ${item.name}\n` +
      `Tipe        : ${item.type}\n` +
      `Keterangan  : Berkas ini tercatat pada riwayat penugasan sebelum sinkronisasi biner penuh diaktifkan.\n` +
      `Waktu Unduh : ${new Date().toLocaleString('id-ID')}\n`;
    
    const blob = new Blob([infoText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Catatan-${item.name.replace(/\.[^/.]+$/, '')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  const link = document.createElement('a');
  link.href = item.url;
  link.download = item.name || `lampiran-${Date.now()}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadAllMediaItems(items: ParsedReportMedia[]) {
  items.forEach((item, i) => {
    setTimeout(() => {
      downloadMediaItem(item);
    }, i * 350);
  });
}

/**
 * Fullscreen Interactive Lightbox for Live Preview of photos / PDFs
 */
export function MediaLightboxModal({
  items,
  initialIndex = 0,
  onClose,
}: {
  items: ParsedReportMedia[];
  initialIndex?: number;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const currentItem = items[currentIndex] || items[0];

  useEffect(() => {
    setZoom(1);
    setRotation(0);
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        if (currentIndex < items.length - 1) setCurrentIndex((prev) => prev + 1);
      } else if (e.key === 'ArrowLeft') {
        if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, items.length, onClose]);

  if (!currentItem) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-md text-white animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid="lightbox-modal"
    >
      {/* Top Header Bar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4 sm:px-6 bg-black/40">
        <div className="flex items-center gap-3 min-w-0">
          <span className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-xs text-white/80 shrink-0">
            {currentIndex + 1} / {items.length}
          </span>
          <div className="min-w-0">
            <h4 className="truncate text-sm font-semibold text-white">{currentItem.name}</h4>
            <p className="text-[11px] text-white/60">{currentItem.sizeFormatted}</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {currentItem.isImage && (
            <>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Perkecil (-)"
                data-testid="button-lightbox-zoom-out"
              >
                <ZoomOut size={16} />
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="hidden sm:inline-flex h-8 px-2 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-xs font-mono text-white transition-colors"
                title="Reset Zoom"
                data-testid="button-lightbox-zoom-reset"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Perbesar (+)"
                data-testid="button-lightbox-zoom-in"
              >
                <ZoomIn size={16} />
              </button>
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Putar 90 Derajat"
                data-testid="button-lightbox-rotate"
              >
                <RotateCw size={16} />
              </button>
            </>
          )}

          {/* Download Button */}
          <button
            type="button"
            onClick={() => downloadMediaItem(currentItem)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm ml-1"
            title="Download Berkas"
            data-testid="button-lightbox-download"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Unduh</span>
          </button>

          {currentItem.url && (
            <a
              href={currentItem.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Buka di Tab Baru"
              data-testid="button-lightbox-open-tab"
            >
              <ExternalLink size={15} />
            </a>
          )}

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-200 transition-colors ml-2"
            title="Tutup (Esc)"
            data-testid="button-lightbox-close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Preview Stage */}
      <div className="relative flex-1 overflow-hidden flex items-center justify-center p-4">
        {/* Previous Navigation Button */}
        {items.length > 1 && currentIndex > 0 && (
          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => prev - 1)}
            className="absolute left-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 hover:bg-black/90 text-white transition-all shadow-lg border border-white/20 hover:scale-105"
            title="Foto Sebelumnya"
            data-testid="button-lightbox-prev"
          >
            <ChevronLeft size={22} />
          </button>
        )}

        {/* Next Navigation Button */}
        {items.length > 1 && currentIndex < items.length - 1 && (
          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => prev + 1)}
            className="absolute right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 hover:bg-black/90 text-white transition-all shadow-lg border border-white/20 hover:scale-105"
            title="Foto Selanjutnya"
            data-testid="button-lightbox-next"
          >
            <ChevronRight size={22} />
          </button>
        )}

        {/* Image Display */}
        {currentItem.isImage ? (
          currentItem.url ? (
            <div
              className="max-h-full max-w-full flex items-center justify-center transition-transform duration-150 ease-out select-none"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
              }}
            >
              <img
                src={currentItem.url}
                alt={currentItem.name}
                className="max-h-[82vh] max-w-[92vw] object-contain rounded-md shadow-2xl"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 rounded-2xl bg-white/5 border border-white/10 max-w-md">
              <ImageIcon size={48} className="text-white/40 mb-3" />
              <h4 className="text-base font-semibold text-white">{currentItem.name}</h4>
              <p className="mt-1 text-xs text-white/60 leading-relaxed">
                Foto ini diunggah dengan format nama berkas lama. Data biner belum tersimpan di server.
              </p>
              <button
                type="button"
                onClick={() => downloadMediaItem(currentItem)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
              >
                <Download size={14} /> Unduh Informasi Berkas
              </button>
            </div>
          )
        ) : currentItem.isPdf ? (
          currentItem.url ? (
            <div className="w-full h-full max-w-4xl max-h-[82vh] rounded-xl overflow-hidden bg-card border border-white/20 shadow-2xl flex flex-col">
              <div className="bg-muted/80 p-2.5 flex items-center justify-between border-b border-border text-foreground">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <FileText size={15} className="text-red-500" /> {currentItem.name}
                </span>
                <button
                  type="button"
                  onClick={() => downloadMediaItem(currentItem)}
                  className="inline-flex items-center gap-1 rounded bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground hover:bg-primary/90"
                >
                  <Download size={12} /> Unduh PDF
                </button>
              </div>
              <iframe
                src={currentItem.url}
                title={currentItem.name}
                className="w-full flex-1 border-0 bg-white"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 rounded-2xl bg-white/5 border border-white/10 max-w-md">
              <FileText size={48} className="text-red-400 mb-3" />
              <h4 className="text-base font-semibold text-white">{currentItem.name}</h4>
              <p className="mt-1 text-xs text-white/60">Dokumen PDF (Pratinjau langsung tidak tersedia untuk format lama).</p>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-8 rounded-2xl bg-white/5 border border-white/10 max-w-md">
            <File size={48} className="text-amber-400 mb-3" />
            <h4 className="text-base font-semibold text-white">{currentItem.name}</h4>
            <p className="mt-1 text-xs text-white/60">{currentItem.sizeFormatted}</p>
            <button
              type="button"
              onClick={() => downloadMediaItem(currentItem)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Download size={14} /> Unduh Berkas Ini
            </button>
          </div>
        )}
      </div>

      {/* Bottom Thumbnail Strip */}
      {items.length > 1 && (
        <div className="flex h-16 shrink-0 items-center justify-center gap-2 border-t border-white/10 px-4 bg-black/60 overflow-x-auto">
          {items.map((it, idx) => (
            <button
              key={it.id || idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                idx === currentIndex
                  ? 'border-primary scale-105 shadow-md shadow-primary/30'
                  : 'border-white/20 opacity-60 hover:opacity-100'
              }`}
            >
              {it.isImage && it.url ? (
                <img src={it.url} alt={it.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-white/10">
                  {it.isPdf ? <FileText size={16} className="text-red-400" /> : <File size={16} />}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Media Gallery Grid used in Admin Reports, Assignment Details, & Worker History
 */
export function ReportMediaGrid({
  mediaStrings,
  title = 'Lampiran Dokumentasi Foto & Berkas',
  showDownloadAll = true,
}: {
  mediaStrings?: string[] | null;
  title?: string;
  showDownloadAll?: boolean;
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!mediaStrings || mediaStrings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 p-4 text-center">
        <p className="text-xs text-muted-foreground italic">
          Tidak ada lampiran foto atau berkas pada laporan ini.
        </p>
      </div>
    );
  }

  const items = mediaStrings.map((raw, i) => parseReportMedia(raw, i));
  const hasDownloadable = items.some((it) => it.url);

  return (
    <div className="space-y-3" data-testid="report-media-grid">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Paperclip size={15} className="text-accent shrink-0" />
          <span className="text-xs font-bold text-foreground">
            {title} ({items.length})
          </span>
        </div>

        {showDownloadAll && items.length > 1 && (
          <button
            type="button"
            onClick={() => downloadAllMediaItems(items)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-accent/10 hover:text-accent transition-colors shadow-sm"
            data-testid="button-download-all-media"
          >
            <Download size={13} className="text-accent" /> Unduh Semua ({items.length} Berkas)
          </button>
        )}
      </div>

      {/* Grid of items */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {items.map((item, idx) => (
          <div
            key={item.id || idx}
            className="group relative flex flex-col rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs hover:shadow-md hover:border-accent/40 transition-all"
            data-testid={`media-card-${idx}`}
          >
            {/* Visual Thumbnail Area */}
            <div
              className="relative aspect-4/3 w-full bg-muted/40 cursor-pointer overflow-hidden flex items-center justify-center"
              onClick={() => setLightboxIndex(idx)}
            >
              {item.isImage && item.url ? (
                <img
                  src={item.url}
                  alt={item.name}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              ) : item.isPdf ? (
                <div className="flex flex-col items-center justify-center p-3 text-red-500">
                  <FileText size={32} />
                  <span className="mt-1 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Dokumen PDF
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-3 text-muted-foreground">
                  <File size={32} />
                  <span className="mt-1 font-mono text-[10px] font-bold uppercase tracking-wider">
                    {item.name.split('.').pop() || 'Berkas'}
                  </span>
                </div>
              )}

              {/* Hover overlay with eye icon */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                  <Eye size={12} /> Live Preview
                </span>
              </div>

              {/* Corner badge for index */}
              <span className="absolute top-1.5 left-1.5 rounded-md bg-black/60 backdrop-blur-xs px-1.5 py-0.5 font-mono text-[9px] font-bold text-white">
                #{idx + 1}
              </span>
            </div>

            {/* Bottom info & download bar */}
            <div className="p-2 flex items-center justify-between gap-1 border-t border-border/60 bg-muted/20">
              <div className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-foreground" title={item.name}>
                  {item.name}
                </span>
                <span className="block text-[10px] font-mono text-muted-foreground">
                  {item.sizeFormatted}
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setLightboxIndex(idx)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent/15 hover:text-accent transition-colors"
                  title="Pratinjau / Live Preview"
                  data-testid={`button-preview-media-${idx}`}
                >
                  <Eye size={14} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadMediaItem(item);
                  }}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-accent hover:bg-accent hover:text-white transition-colors"
                  title="Unduh File"
                  data-testid={`button-download-media-${idx}`}
                >
                  <Download size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {lightboxIndex !== null && (
        <MediaLightboxModal
          items={items}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}

/**
 * Worker Media Uploader Component:
 * Allows workers to drag-and-drop or select photos / files,
 * converts them to Data URLs, and shows instant live preview cards before submission.
 */
export function WorkerMediaUploader({
  value = [],
  onChange,
}: {
  value: string[];
  onChange: (items: string[]) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewLightboxIndex, setPreviewLightboxIndex] = useState<number | null>(null);
  const inputId = useId();

  const parsedItems = value.map((v, i) => parseReportMedia(v, i));

  const processFiles = async (files: File[]) => {
    if (!files || files.length === 0) return;

    const readPromises = files.map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const mediaObj = {
            id: `upload-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            type: file.type || 'image/jpeg',
            size: file.size,
            url: dataUrl,
            uploadedAt: new Date().toISOString(),
          };
          resolve(JSON.stringify(mediaObj));
        };
        reader.onerror = () => {
          resolve(
            JSON.stringify({
              name: file.name,
              type: file.type || 'application/octet-stream',
              size: file.size,
            })
          );
        };
        reader.readAsDataURL(file);
      });
    });

    const newStrings = await Promise.all(readPromises);
    onChange([...value, ...newStrings]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    void processFiles(files);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    void processFiles(files);
  };

  const handleRemove = (indexToRemove: number) => {
    onChange(value.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="space-y-3" data-testid="worker-media-uploader">
      {/* Drag and drop upload zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-accent bg-accent/10 scale-[1.01]'
            : 'border-border/80 bg-muted/20 hover:border-accent/50 hover:bg-muted/40'
        }`}
        onClick={() => {
          document.getElementById(inputId)?.click();
        }}
      >
        <input
          id={inputId}
          type="file"
          multiple
          accept="image/*,application/pdf,.doc,.docx"
          onChange={handleInputChange}
          className="hidden"
          data-testid="input-worker-file"
        />

        <div className="grid size-12 place-items-center rounded-full bg-accent/15 text-accent mb-2.5">
          <UploadCloud size={24} />
        </div>

        <strong className="text-xs sm:text-sm font-semibold text-foreground">
          Pilih atau Seret Foto / Dokumen ke Sini
        </strong>
        <p className="mt-1 text-xs text-muted-foreground max-w-sm">
          Ambil foto bukti pekerjaan, MCB, panel listrik, atau unggah dokumen pendukung (JPG, PNG, PDF).
        </p>

        <span className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-accent shadow-xs">
          <Paperclip size={13} /> Telusuri Berkas
        </span>
      </div>

      {/* Live Previews of selected files */}
      {parsedItems.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-500" /> {parsedItems.length} berkas siap dikirim
            </span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-red-500 hover:underline text-[11px]"
              data-testid="button-clear-all-uploads"
            >
              Hapus Semua
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {parsedItems.map((item, idx) => (
              <div
                key={item.id || idx}
                className="group relative rounded-xl border border-border bg-card overflow-hidden shadow-xs flex flex-col"
              >
                {/* Visual Thumbnail */}
                <div
                  className="relative aspect-4/3 w-full bg-muted/40 cursor-pointer overflow-hidden flex items-center justify-center"
                  onClick={() => setPreviewLightboxIndex(idx)}
                >
                  {item.isImage && item.url ? (
                    <img src={item.url} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground p-2 text-center">
                      {item.isPdf ? <FileText size={24} className="text-red-500" /> : <File size={24} />}
                      <span className="text-[9px] font-mono mt-1 font-bold">
                        {item.name.split('.').pop()?.toUpperCase() || 'FILE'}
                      </span>
                    </div>
                  )}

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(idx);
                    }}
                    className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-500/80 text-white hover:bg-red-600 transition-colors shadow-xs"
                    title="Hapus berkas ini"
                    data-testid={`button-remove-upload-${idx}`}
                  >
                    <X size={12} />
                  </button>

                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <span className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white font-bold flex items-center gap-1">
                      <Eye size={10} /> Preview
                    </span>
                  </div>
                </div>

                <div className="p-2 text-[11px] bg-card">
                  <span className="block truncate font-semibold text-foreground" title={item.name}>
                    {item.name}
                  </span>
                  <span className="block text-[10px] text-muted-foreground font-mono">
                    {item.sizeFormatted}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox for previewing before sending */}
      {previewLightboxIndex !== null && (
        <MediaLightboxModal
          items={parsedItems}
          initialIndex={previewLightboxIndex}
          onClose={() => setPreviewLightboxIndex(null)}
        />
      )}
    </div>
  );
}
