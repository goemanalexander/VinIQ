'use client';

import { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Loader2, X } from 'lucide-react';

interface ImageUploaderProps {
  label: string;
  helperText?: string;
  analyseLabel?: string;
  onAnalyse: (imageBase64: string, mediaType: 'image/jpeg'|'image/png'|'image/webp'|'image/gif') => void | Promise<void>;
}

export default function ImageUploader({
  label,
  helperText,
  analyseLabel = 'Analyse',
  onAnalyse,
}: ImageUploaderProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset so same file can be re-picked
    e.target.value = '';
  }

  async function handleAnalyse() {
    if (!preview) return;
    setLoading(true);
    // Extract base64 from the data URL
    const comma = preview.indexOf(',');
    const base64 = comma >= 0 ? preview.slice(comma + 1) : preview;
    // Detect media type from data URL header
    const header = preview.slice(0, comma);
    let mediaType: 'image/jpeg'|'image/png'|'image/webp'|'image/gif' = 'image/jpeg';
    if (header.includes('image/png')) mediaType = 'image/png';
    else if (header.includes('image/webp')) mediaType = 'image/webp';
    else if (header.includes('image/gif')) mediaType = 'image/gif';
    await onAnalyse(base64, mediaType);
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Hidden inputs */}
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
        className="hidden"
        onChange={handleInputChange}
      />

      {/* Preview or placeholder */}
      {preview ? (
        <div className="relative overflow-hidden rounded-2xl border border-gold-500/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Preview" className="w-full object-cover max-h-72" />
          <button
            onClick={() => setPreview(null)}
            className="absolute right-3 top-3 rounded-full bg-navy-900/80 p-1.5 text-cream-300"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gold-500/20 bg-navy-800/40 text-center">
          <ImageIcon size={32} className="text-gold-400/40" />
          <div>
            <p className="text-sm font-medium text-cream-200">{label}</p>
            {helperText && <p className="mt-0.5 text-xs text-cream-300/50">{helperText}</p>}
          </div>
        </div>
      )}

      {/* Two-button photo picker */}
      {!preview && (
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
            Choose Photo
          </button>
        </div>
      )}

      {/* Analyse button — only shown after photo is picked */}
      {preview && (
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
            analyseLabel
          )}
        </button>
      )}

      {/* Change photo option */}
      {preview && !loading && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => cameraRef.current?.click()}
            className="flex items-center justify-center gap-1.5 rounded-full border border-navy-600 py-2 text-xs text-cream-300/50 transition-colors active:bg-navy-700"
          >
            <Camera size={13} />
            Retake
          </button>
          <button
            onClick={() => libraryRef.current?.click()}
            className="flex items-center justify-center gap-1.5 rounded-full border border-navy-600 py-2 text-xs text-cream-300/50 transition-colors active:bg-navy-700"
          >
            <ImageIcon size={13} />
            Choose other
          </button>
        </div>
      )}
    </div>
  );
}
