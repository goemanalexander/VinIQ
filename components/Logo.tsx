interface LogoProps {
  size?: number;
  className?: string;
  /** Renders the ring + monogram only, no navy disc — for placing on an already-dark background */
  transparent?: boolean;
}

/**
 * VinIQ crest — a circular medallion with a serif "V" monogram, finial dot,
 * and an abstracted wine-glass stem/foot beneath. Gold on midnight navy.
 */
export default function Logo({ size = 32, className = '', transparent = false }: LogoProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="VinIQ"
    >
      <defs>
        <linearGradient id="viniq-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F0DDA8" />
          <stop offset="50%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#A6791F" />
        </linearGradient>
      </defs>

      {!transparent && <circle cx="100" cy="100" r="96" fill="#0B1422" />}
      <circle cx="100" cy="100" r="91" fill="none" stroke="url(#viniq-gold)" strokeWidth="3" />
      <circle cx="100" cy="100" r="80" fill="none" stroke="url(#viniq-gold)" strokeWidth="1" opacity="0.55" />

      {/* Apex finial dot */}
      <circle cx="100" cy="40" r="3.2" fill="url(#viniq-gold)" />

      {/* Monogram V — two tapered bars meeting at a point (chalice silhouette) */}
      <polygon points="62,50 76,50 103,140 96,140" fill="url(#viniq-gold)" />
      <polygon points="138,50 124,50 97,140 104,140" fill="url(#viniq-gold)" />

      {/* Serif terminals */}
      <rect x="56" y="47" width="22" height="4.5" rx="1.5" fill="url(#viniq-gold)" />
      <rect x="122" y="47" width="22" height="4.5" rx="1.5" fill="url(#viniq-gold)" />

      {/* Stem + foot — abstracted wine-glass base */}
      <line x1="100" y1="140" x2="100" y2="159" stroke="#D4AF37" strokeWidth="4.5" strokeLinecap="round" />
      <line x1="86" y1="161" x2="114" y2="161" stroke="#D4AF37" strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  );
}
