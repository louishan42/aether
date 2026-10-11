import { useId } from "react";

export function Logo() {
  const uid = useId().replace(/:/g, "");
  return (
    <div className="flex items-center gap-2.5">
      <svg className="logo-mark h-9 w-9 md:h-[42px] md:w-[42px]" width="42" height="42" viewBox="0 0 48 48" aria-label="Ae">
        <defs>
          <linearGradient id={`ae-tile-${uid}`} x1="6" y1="0" x2="44" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#faf8ff" />
            <stop offset="42%" stopColor="#ddd6fe" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <linearGradient id={`ae-ink-${uid}`} x1="12" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3b0764" />
            <stop offset="100%" stopColor="#5b21b6" />
          </linearGradient>
        </defs>

        <rect x="1.25" y="1.25" width="45.5" height="45.5" rx="15" fill={`url(#ae-tile-${uid})`} />
        <rect x="2.6" y="2.6" width="42.8" height="42.8" rx="13.4" fill="none" stroke="#ffffff" strokeOpacity="0.62" strokeWidth="1.15" />
        <path d="M9 15c8-8 24-8 31 2" fill="none" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="5" strokeLinecap="round" />

        <ellipse className="logo-orbit" cx="31.5" cy="26" rx="11.2" ry="11.2" fill="none" stroke="#6d28d9" strokeOpacity="0.22" strokeWidth="1.35" />

        <path
          fill={`url(#ae-ink-${uid})`}
          fillRule="evenodd"
          d="M7.2 36.3 17.1 9.9h3.9L31 36.3h-4.15l-1.9-5.2H13.25l-1.9 5.2H7.2Zm6.95-8.25h8.7L19.05 16.4 14.15 28.05Z"
        />
        <path
          fill="none"
          stroke={`url(#ae-ink-${uid})`}
          strokeWidth="3.2"
          strokeLinecap="round"
          d="M25.1 26.2h16.05M39.85 22.15a7.4 7.4 0 1 0-.9 8.7"
        />
        <path d="M19.05 9.15 20.55 12.45 19.05 11.55 17.55 12.45Z" fill="#ffffff" />
      </svg>
      <span className="logo-word">Aether</span>
    </div>
  );
}
