// Minimal stroke icon set (24x24) for the app shell — no icon-library dependency.
type IconProps = { className?: string };

const base = 'h-5 w-5';

function Svg({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      className={className ?? base}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export const Icons = {
  dashboard: (p: IconProps) => (
    <Svg className={p.className}>
      <path d="M3 12l9-9 9 9" />
      <path d="M5 10v10h14V10" />
    </Svg>
  ),
  resorts: (p: IconProps) => (
    <Svg className={p.className}>
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 21v-6h6v6" />
    </Svg>
  ),
  bookings: (p: IconProps) => (
    <Svg className={p.className}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </Svg>
  ),
  agencies: (p: IconProps) => (
    <Svg className={p.className}>
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M9 8h1M14 8h1M9 12h1M14 12h1M9 16h6" />
    </Svg>
  ),
  agents: (p: IconProps) => (
    <Svg className={p.className}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="10" cy="7" r="4" />
      <path d="M21 21v-2a4 4 0 0 0-3-3.87" />
    </Svg>
  ),
  finance: (p: IconProps) => (
    <Svg className={p.className}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M2 10h20M6 15h4" />
    </Svg>
  ),
  reports: (p: IconProps) => (
    <Svg className={p.className}>
      <path d="M3 3v18h18" />
      <path d="M7 15l4-4 3 3 5-6" />
    </Svg>
  ),
  settings: (p: IconProps) => (
    <Svg className={p.className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 15a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 12 4.6a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 .7 2.9 2 2 0 1 1 0 4Z" />
    </Svg>
  ),
  search: (p: IconProps) => (
    <Svg className={p.className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </Svg>
  ),
  menu: (p: IconProps) => (
    <Svg className={p.className}>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </Svg>
  ),
  chevronLeft: (p: IconProps) => (
    <Svg className={p.className}>
      <path d="m15 18-6-6 6-6" />
    </Svg>
  ),
  chevronDown: (p: IconProps) => (
    <Svg className={p.className}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  ),
  bell: (p: IconProps) => (
    <Svg className={p.className}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </Svg>
  ),
  pricing: (p: IconProps) => (
    <Svg className={p.className}>
      <path d="M20.6 13.4 12 22l-9-9V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" />
      <circle cx="7.5" cy="7.5" r="1" />
    </Svg>
  ),
  shield: (p: IconProps) => (
    <Svg className={p.className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </Svg>
  ),
  sync: (p: IconProps) => (
    <Svg className={p.className}>
      <path d="M21 12a9 9 0 0 1-15.7 6M3 12a9 9 0 0 1 15.7-6" />
      <path d="M21 4v5h-5M3 20v-5h5" />
    </Svg>
  ),
  integrations: (p: IconProps) => (
    <Svg className={p.className}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </Svg>
  ),
  activity: (p: IconProps) => (
    <Svg className={p.className}>
      <path d="M3 12h4l3 8 4-16 3 8h4" />
    </Svg>
  ),
  lock: (p: IconProps) => (
    <Svg className={p.className}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Svg>
  ),
  support: (p: IconProps) => (
    <Svg className={p.className}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="m5 5 4.5 4.5M14.5 14.5 19 19M19 5l-4.5 4.5M9.5 14.5 5 19" />
    </Svg>
  ),
  logout: (p: IconProps) => (
    <Svg className={p.className}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </Svg>
  ),
};

export type IconName = keyof typeof Icons;
