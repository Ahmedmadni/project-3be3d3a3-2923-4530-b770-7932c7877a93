import { Home, Stethoscope, Cross, BookOpen, UserRound } from "lucide-react";

export const navItems = [
  { to: "/", label: "الرئيسية", icon: Home },
  { to: "/symptom-checker", label: "فحص الأعراض", icon: Stethoscope },
  { to: "/first-aid", label: "الإسعافات", icon: Cross },
  { to: "/library", label: "المكتبة", icon: BookOpen },
  { to: "/account", label: "حسابي", icon: UserRound },
] as const;
