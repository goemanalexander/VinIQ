'use client';

import { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Loader2, X, Plus } from 'lucide-react';
import ScanLoadingOverlay from './ScanLoadingOverlay';

const MAX_IMAGES = 6;

interface MultiImageUploaderProps {
  analyseLabel?: string;
  /** Receives the raw data URLs; the caller optimises and uploads them. */
  onAnalyse: (dataUrls: string[]) => void | Promise<void>;
}

/**
 * Multi-select image picker for batch scans: 1–6 images, per-image preview
 * and removal, single Analyse action. Reuses the existing loading overlay.
 */
export default function MultiImageUploader({ analyseLabel = 'Analyse', onAnalyse }: MultiImageUploaderProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const room = MAX_IMAGES - previews.length;
    const selected = [...files].slice(0, room);
    for (const file of selected) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        if (url) setPreviews((p) => (p.length < MAX_IMAGES ? [...p, url] : p));
      };
      reader.readAsDataURL(file);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    addFiles(e.target.files);
    e.target.value = '';
  }

  function removeAt(index: number) {
    setPreviews((p) => p.filter((_, i) => i !== index));
  }

  async function handleAnalyse() {
    if (previews.length === 0 || loading) return;
    setLoading(true);
    try {
      await onAnalyse(previews);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {loading && previews[0] && <ScanLoadingOverlay preview={previews[0]} />}

      {/* Hidden inputs — library input allows multi-select */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleInputChange}
      />
      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleInputChange}
      />

      {/* Preview grid */}
      {previews.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {previews.map((url, i) => (
            <div key={i} className="relative overflow-hidden rounded-xl border border-gold-500/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Page ${i + 1}`} className="h-28 w-full object-cover" />
              <span className="absolute bottom-1 left-1 rounded-full bg-navy-950/80 px-2 py-0.5 text-[10px] text-cream-200">
                Page {i + 1}
              </span>
              <button
                onClick={() => removeAt(i)}
                disabled={loading}
                className="absolute right-1 top-1 rounded-full bg-navy-900/85 p-1 text-cream-300"
                aria-label={`Remove page ${i + 1}`}
              >
                <X size={13} />
              </button>
            </div>
          ))}
          {previews.length < MAX_IMAGES && !loading && (
            <button
              onClick={() => libraryRef.current?.click()}
              className="flex h-28 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gold-500/20 text-gold-400/60"
            >
              <Plus size={18} />
              <span className="text-[10px]">Add page</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gold-500/20 bg-navy-800/40 text-center">
          <ImageIcon size={32} className="text-gold-400/40" />
          <div>
            <p className="text-sm font-medium text-cream-200">Photos of the promotion</p>
            <p className="mt-0.5 text-xs text-cream-300/50">Up to {MAX_IMAGES} pages in one go</p>
          </div>
        </div>
      )}

      {/* Pickers */}
      {previews.length === 0 && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => cameraRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-full border border-gold-500/30 py-3 text-sm font-medium text-gold-300 transition-colors active:bg-gold-500/10"
          >
            <Camera size={17} />
            Take Photo
          </button>
          <button
            onClick={() => libraryRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-full border border-gold-500/30 py-3 text-sm font-medium text-gold-300 transition-colors active:bg-gold-500/10"
          >
            <ImageIcon size={17} />
            Choose Photos
          </button>
        </div>
      )}

      {/* Analyse */}
      {previews.length > 0 && (
        <button
          onClick={handleAnalyse}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-full bg-gold-500 py-3.5 text-sm font-semibold text-navy-950 transition-colors active:bg-gold-400 disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Analysing…
            </>
          ) : (
            `${analyseLabel} (${previews.length} page${previews.length !== 1 ? 's' : ''})`
          )}
        </button>
      )}

      {previews.length > 0 && !loading && (
        <button
          onClick={() => cameraRef.current?.click()}
          className="flex items-center justify-center gap-1.5 rounded-full border border-navy-600 py-2 text-xs text-cream-300/50 transition-colors active:bg-navy-700"
        >
          <Camera size={13} />
          Add a photo with the camera
        </button>
      )}
    </div>
  );
}
