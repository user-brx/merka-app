// All icons follow Lucide style: viewBox 0 0 24 24, fill=none, stroke=currentColor,
// strokeWidth=2, strokeLinecap=round, strokeLinejoin=round

const SVG_PROPS = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

// --- Core actions ---

export const CopyIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} {...SVG_PROPS}>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

export const EditIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} {...SVG_PROPS}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

export const LogoutIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} {...SVG_PROPS}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

export const XIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} {...SVG_PROPS}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const SearchIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} {...SVG_PROPS}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export const ExternalLinkIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} {...SVG_PROPS}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

// --- User / Social ---

export const ProfileIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} {...SVG_PROPS}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export const UsersIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} {...SVG_PROPS}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const UserPlusIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} {...SVG_PROPS}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="19" y1="8" x2="19" y2="14" />
    <line x1="22" y1="11" x2="16" y2="11" />
  </svg>
);

export const UserMinusIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} {...SVG_PROPS}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="22" y1="11" x2="16" y2="11" />
  </svg>
);

// --- Reactions / Payments ---

export const HeartIcon = ({ size = 16, filled = false }: { size?: number; filled?: boolean }) => (
  <svg
    width={size}
    height={size}
    {...SVG_PROPS}
    fill={filled ? "currentColor" : "none"}
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

export const ZapIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} {...SVG_PROPS}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

export const ServerIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} {...SVG_PROPS}>
    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
    <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
    <line x1="6" y1="6" x2="6.01" y2="6" />
    <line x1="6" y1="18" x2="6.01" y2="18" />
  </svg>
);

// --- Navigation / UI ---

export const ChatHistoryIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} {...SVG_PROPS}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" />
  </svg>
);

export const ChevronUpIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} {...SVG_PROPS}>
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

export const ChevronDownIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} {...SVG_PROPS}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// --- Info / Security ---

export const GlobeIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} {...SVG_PROPS}>
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

export const InfoIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} {...SVG_PROPS}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

export const LockIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} {...SVG_PROPS}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export const HelpCircleIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} {...SVG_PROPS}>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const BitcoinIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} {...SVG_PROPS}>
    <path d="M9 8h5a2 2 0 0 1 0 4H9V8z" />
    <path d="M9 12h5.5a2 2 0 0 1 0 4H9v-4z" />
    <line x1="9" y1="8" x2="9" y2="16" />
    <line x1="11" y1="6" x2="11" y2="8" />
    <line x1="13" y1="6" x2="13" y2="8" />
    <line x1="11" y1="16" x2="11" y2="18" />
    <line x1="13" y1="16" x2="13" y2="18" />
  </svg>
);

export const DonateIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} {...SVG_PROPS}>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

export const PlusIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} {...SVG_PROPS}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
