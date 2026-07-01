'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileSpreadsheet, Download, Check, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import { importFromFile, CSV_TEMPLATE_EXAMPLE } from '@/lib/import';
import { getCellar, saveCellar } from '@/lib/storage';
import type { CellarWine } from '@/lib/types';

type ImportMode = 'replace' | 'merge';

export default function CellarImportPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<CellarWine[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [mode, setMode] = useState<ImportMode>('merge');
  const [imported, setImported] = useState(false);

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE_EXAMPLE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'viniq-cellar-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setLoading(true);
    setErrors([]);
    setPreview(null);

    try {
      const result = await importFromFile(file);
      if (result.errors.length > 0) {
        setErrors(result.errors);
      } else if (result.wines.length === 0) {
        setErrors(['No valid wines found in the file. Check the format and try again.']);
      } else {
        setPreview(result.wines);
      }
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Unknown error']);
    } finally {
      setLoading(false);
    }
  }

  function handleConfirm() {
    if (!preview) return;

    if (mode === 'replace') {
      saveCellar(preview);
    } else {
      // Merge — append, dedup by producer+wineName+vintage
      const existing = getCellar();
      const existingKeys = new Set(existing.map((w) => `${w.producer}|${w.wineName}|${w.vintage}`));
      const newWines = preview.filter(
        (w) => !existingKeys.has(`${w.producer}|${w.wineName}|${w.vintage}`)
      );
      saveCellar([...existing, ...newWines]);
    }

    setImported(true);
    setTimeout(() => router.push('/cellar'), 1200);
  }

  return (
    <>
      <PageHeader backHref="/cellar" title="Import Cellar" />
      <div className="px-5 pb-8 pt-4">

        {/* Instructions */}
        <Card edge className="mb-6 space-y-3">
          <p className="font-display text-sm text-cream-200">How to import your cellar</p>
          <ol className="space-y-2 text-sm text-cream-300/75">
            <li>
              <span className="mr-2 font-medium text-gold-400">1.</span>
              Download the CSV template and fill it in with your bottles.
            </li>
            <li>
              <span className="mr-2 font-medium text-gold-400">2.</span>
              Upload the completed file — CSV or Excel (.xlsx) both work.
            </li>
            <li>
              <span className="mr-2 font-medium text-gold-400">3.</span>
              Review the preview and confirm the import.
            </li>
          </ol>
          <p className="text-xs text-cream-300/40">
            VinIQ will estimate drinking windows and decanting advice based on the wine style.
          </p>
        </Card>

        {/* Template download */}
        <button
          onClick={downloadTemplate}
          className="mb-5 flex w-full items-center justify-center gap-2 rounded-full border border-gold-500/40 py-3 text-sm font-medium text-gold-400 transition-colors active:bg-gold-500/10"
        >
          <Download size={16} />
          Download CSV Template
        </button>

        {/* File upload */}
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={handleFile}
        />

        {!preview && !imported && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={loading}
            className="mb-5 flex w-full items-center justify-center gap-2 rounded-full bg-gold-500 py-3.5 text-sm font-semibold text-navy-950 transition-colors active:bg-gold-400 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Parsing file…
              </>
            ) : (
              <>
                <FileSpreadsheet size={16} />
                Upload CSV or Excel
              </>
            )}
          </button>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <Card className="mb-5 border-burgundy-600/40">
            {errors.map((e, i) => (
              <div key={i} className="flex gap-2 text-sm text-burgundy-300">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <p>{e}</p>
              </div>
            ))}
            <button
              onClick={() => fileRef.current?.click()}
              className="mt-3 text-xs text-gold-400 underline"
            >
              Try a different file
            </button>
          </Card>
        )}

        {/* Preview */}
        {preview && !imported && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-cream-200">
                Found <strong className="text-gold-300">{preview.length}</strong> wine
                {preview.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={() => setPreview(null)}
                className="flex items-center gap-1 text-xs text-cream-300/50"
              >
                <Trash2 size={12} />
                Cancel
              </button>
            </div>

            {/* Import mode */}
            <Card className="mb-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gold-400/80">
                Import mode
              </p>
              <div className="space-y-2">
                {(['merge', 'replace'] as ImportMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors ${
                      mode === m ? 'bg-gold-500/10' : 'hover:bg-cream-100/[0.03]'
                    }`}
                  >
                    <div
                      className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 ${
                        mode === m ? 'border-gold-400 bg-gold-400' : 'border-navy-500'
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium text-cream-100">
                        {m === 'merge' ? 'Merge' : 'Replace'}
                      </p>
                      <p className="text-xs text-cream-300/50">
                        {m === 'merge'
                          ? 'Add imported wines to your existing cellar (skips duplicates)'
                          : 'Replace all current cellar contents with this import'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            {/* Wine preview list */}
            <Card className="mb-5 divide-y divide-gold-500/10 p-1">
              {preview.slice(0, 10).map((wine, i) => (
                <div key={i} className="flex items-start gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-cream-100">
                      {wine.producer} — {wine.wineName}
                    </p>
                    <p className="text-xs text-cream-300/50">
                      {wine.vintage} · ×{wine.quantity}
                      {wine.purchasePrice > 0 ? ` · €${wine.purchasePrice}` : ''}
                    </p>
                  </div>
                </div>
              ))}
              {preview.length > 10 && (
                <div className="px-3 py-2 text-xs text-cream-300/40">
                  …and {preview.length - 10} more
                </div>
              )}
            </Card>

            <button
              onClick={handleConfirm}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-gold-500 py-3.5 text-sm font-semibold text-navy-950 active:bg-gold-400"
            >
              <Check size={16} />
              Confirm Import — {preview.length} wine{preview.length !== 1 ? 's' : ''}
            </button>
          </>
        )}

        {/* Success */}
        {imported && (
          <Card className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="text-4xl">🍾</span>
            <p className="font-display text-lg text-cream-100">Cellar imported!</p>
            <p className="text-sm text-cream-300/60">Returning to your cellar…</p>
          </Card>
        )}
      </div>
    </>
  );
}
