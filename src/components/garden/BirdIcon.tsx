export function BirdIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 22"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* Forked tail — two strokes on the left */}
      <path
        d="M4 13.5 L0.8 10.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M4 15.5 L0.8 18.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Body */}
      <path d="M4 14.5 Q3.5 10.5 7.5 10.5 Q12 10.5 12.5 14 Q12.5 18 8.5 18.5 Q5 18.5 4 16.5 Z" />

      {/* Head */}
      <circle cx="13.8" cy="9" r="3.2" />

      {/* Wing accent line */}
      <path
        d="M5.5 14 Q8 12 11.5 13"
        fill="none"
        stroke="white"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.22"
      />

      {/* Beak — small triangle pointing right */}
      <path d="M16.8 8.8 L20 7.8 L19.4 9.8 Z" />

      {/* Envelope held in beak */}
      <rect x="20" y="5.8" width="4" height="3.2" rx="0.5" />
      {/* Envelope flap fold */}
      <path
        d="M20.2 6.1 L22 7.5 L23.8 6.1"
        fill="none"
        stroke="white"
        strokeWidth="0.65"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
      />

      {/* Eye — white ring + dark pupil */}
      <circle cx="14.6" cy="8.1" r="1.35" fill="white" />
      <circle cx="14.9" cy="8.3" r="0.52" fill="#1a1a0e" />
    </svg>
  );
}
