import {
  Compass,
  Heart,
  History,
  Library,
  Link2,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  /** Shorter label for the mobile bottom bar. */
  shortLabel?: string;
  icon: LucideIcon;
};

/**
 * Single source of truth for primary navigation.
 *
 * Navigation is rendered in exactly one place per breakpoint:
 * - desktop (lg+): the sidebar rail
 * - mobile: the bottom bar
 *
 * The header and footer intentionally render no navigation links, so nothing
 * is duplicated on screen.
 */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Khám phá", icon: Compass },
  { href: "/watch", label: "Xem nhanh", shortLabel: "Xem", icon: Link2 },
];

export const LIBRARY_NAV: NavItem[] = [
  { href: "/favorites", label: "Yêu thích", shortLabel: "Thích", icon: Heart },
  { href: "/history", label: "Lịch sử", shortLabel: "Lịch sử", icon: History },
  { href: "/collections", label: "Bộ sưu tập", shortLabel: "Bộ sưu tập", icon: Library },
];

export const ACCOUNT_NAV: NavItem[] = [
  { href: "/account", label: "Tài khoản", shortLabel: "Tài khoản", icon: Settings },
];

/** Items shown in the mobile bottom bar (kept to five for tap-target comfort). */
export const MOBILE_NAV: NavItem[] = [
  PRIMARY_NAV[0],
  PRIMARY_NAV[1],
  LIBRARY_NAV[0],
  LIBRARY_NAV[1],
  ACCOUNT_NAV[0],
];
