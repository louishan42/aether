"use client";

export function Logo() {
  function goHome(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    window.location.assign("/");
  }

  return (
    <a href="/" className="logo-link" aria-label="Aether home" onClick={goHome}>
      <svg className="logo-mark h-9 w-9 md:h-[40px] md:w-[40px]" width="40" height="40" viewBox="0 0 40 40" aria-hidden>
        <rect className="tile" x="1.2" y="1.2" width="37.6" height="37.6" rx="10" fill="#ece8e1" stroke="#2f2a26" strokeWidth="1.3" />
        <path
          className="ink-stroke"
          d="M12.5 27.2V18.4c0-4.15 3.35-7.5 7.5-7.5s7.5 3.35 7.5 7.5v8.8"
          fill="none"
          stroke="#2f2a26"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path className="ink-stroke" d="M12.5 27.2h15" fill="none" stroke="#2f2a26" strokeWidth="1.7" strokeLinecap="round" />
        <circle className="ink-fill" cx="20" cy="19.2" r="2.15" fill="#2f2a26" />
      </svg>
      <span className="logo-word">Aether</span>
    </a>
  );
}
