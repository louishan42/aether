import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="logo-link" aria-label="Aether home">
      <svg className="logo-mark h-9 w-9 md:h-[40px] md:w-[40px]" width="40" height="40" viewBox="0 0 40 40" aria-hidden>
        <rect x="1" y="1" width="38" height="38" rx="8" fill="#ece8e1" stroke="#2f2a26" strokeWidth="1.25" />
        <text x="20" y="26.5" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="16" fontWeight="700" fill="#2f2a26">
          Ae
        </text>
      </svg>
      <span className="logo-word">Aether</span>
    </Link>
  );
}
