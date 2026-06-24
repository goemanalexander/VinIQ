import type { StructureProfile } from '@/lib/types';

const AXES: Array<{ key: keyof StructureProfile; label: string; lowLabel: string; highLabel: string }> = [
  { key: 'body', label: 'Body', lowLabel: 'Light', highLabel: 'Full' },
  { key: 'acidity', label: 'Acidity', lowLabel: 'Soft', highLabel: 'Crisp' },
  { key: 'tannin', label: 'Tannin', lowLabel: 'Smooth', highLabel: 'Firm' },
  { key: 'sweetness', label: 'Sweetness', lowLabel: 'Dry', highLabel: 'Sweet' },
  { key: 'alcohol', label: 'Alcohol', lowLabel: 'Light', highLabel: 'Strong' },
];

export default function StructureBars({ profile }: { profile: StructureProfile }) {
  return (
    <div className="space-y-3">
      {AXES.map((axis) => (
        <div key={axis.key}>
          <div className="mb-1 flex items-center justify-between text-xs text-cream-300/70">
            <span className="font-medium text-cream-200">{axis.label}</span>
            <span>{profile[axis.key]}/10</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-navy-700/80">
            <div
              className="h-full rounded-full bg-gradient-to-r from-burgundy-600 to-gold-500"
              style={{ width: `${(profile[axis.key] / 10) * 100}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wide text-cream-300/40">
            <span>{axis.lowLabel}</span>
            <span>{axis.highLabel}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
