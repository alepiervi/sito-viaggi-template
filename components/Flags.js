'use client';

/**
 * SVG flag icons - always visible on every browser/OS.
 */

export function FlagIT({ className = '', size = 18 }) {
  const h = size;
  const w = Math.round(size * 1.5);
  return (
    <svg viewBox="0 0 3 2" width={w} height={h} className={`inline-block rounded-sm shadow-sm ${className}`} aria-label="Italiano">
      <rect width="1" height="2" x="0" fill="#009246" />
      <rect width="1" height="2" x="1" fill="#fff" />
      <rect width="1" height="2" x="2" fill="#ce2b37" />
    </svg>
  );
}

export function FlagEN({ className = '', size = 18 }) {
  const h = size;
  const w = Math.round(size * 1.5);
  return (
    <svg viewBox="0 0 60 30" width={w} height={h} className={`inline-block rounded-sm shadow-sm ${className}`} aria-label="English">
      <clipPath id="uk-clip">
        <path d="M0,0 L60,30 M60,0 L0,30" />
      </clipPath>
      <rect width="60" height="30" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4" />
      <path d="M30,0 V30 M0,15 H60" stroke="#fff" strokeWidth="10" />
      <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
}

export function FlagFR({ className = '', size = 18 }) {
  const h = size; const w = Math.round(size * 1.5);
  return (
    <svg viewBox="0 0 3 2" width={w} height={h} className={`inline-block rounded-sm shadow-sm ${className}`} aria-label="Français">
      <rect width="1" height="2" x="0" fill="#0055A4" />
      <rect width="1" height="2" x="1" fill="#fff" />
      <rect width="1" height="2" x="2" fill="#EF4135" />
    </svg>
  );
}

export function FlagES({ className = '', size = 18 }) {
  const h = size; const w = Math.round(size * 1.5);
  return (
    <svg viewBox="0 0 3 2" width={w} height={h} className={`inline-block rounded-sm shadow-sm ${className}`} aria-label="Español">
      <rect width="3" height="2" fill="#AA151B" />
      <rect width="3" height="1" y="0.5" fill="#F1BF00" />
    </svg>
  );
}

export function FlagDE({ className = '', size = 18 }) {
  const h = size; const w = Math.round(size * 1.5);
  return (
    <svg viewBox="0 0 3 2" width={w} height={h} className={`inline-block rounded-sm shadow-sm ${className}`} aria-label="Deutsch">
      <rect width="3" height="2/3" y="0" fill="#000" />
      <rect width="3" height="2/3" y="0.667" fill="#DD0000" />
      <rect width="3" height="2/3" y="1.334" fill="#FFCE00" />
    </svg>
  );
}

export function Flag({ code, ...props }) {
  switch (code) {
    case 'it': return <FlagIT {...props} />;
    case 'en': return <FlagEN {...props} />;
    case 'fr': return <FlagFR {...props} />;
    case 'es': return <FlagES {...props} />;
    case 'de': return <FlagDE {...props} />;
    default: return <FlagIT {...props} />;
  }
}
