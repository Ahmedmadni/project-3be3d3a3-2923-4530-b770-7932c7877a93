import { Home, Stethoscope, Cross, BookOpen, UserRound, Activity } from "lucide-react";
import type { TKey } from "@/i18n";

export const navItems = [
  { to: "/", labelKey: "nav.home" as TKey, icon: Home },
  { to: "/symptom-checker", labelKey: "nav.checker" as TKey, icon: Stethoscope },
  { to: "/first-aid", labelKey: "nav.firstAid" as TKey, icon: Cross },
  { to: "/library", labelKey: "nav.library" as TKey, icon: BookOpen },
  { to: "/measurements", labelKey: "nav.measurements" as TKey, icon: Activity },
  { to: "/account", labelKey: "nav.account" as TKey, icon: UserRound },
] as const;

/**
 * Mobile keeps the primary actions intentionally small.
 * The health library remains a primary home-page entry and desktop nav item.
 */
export const mobileNavItems = navItems.filter((item) => item.to !== "/library");
