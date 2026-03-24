export type NavItem = {
  label: string;
  href: string;
  match: string;
  description: string;
  badge?: string;
};

export const primaryNavItems: NavItem[] = [
  {
    label: "Import",
    href: "/import",
    match: "/import",
    description: "Create sources and kick off parsing.",
  },
  {
    label: "Review Queue",
    href: "/review",
    match: "/review",
    description: "Inspect parse jobs that need human review.",
  },
  {
    label: "Question Bank",
    href: "/questions",
    match: "/questions",
    description: "Browse the canonical study surface.",
  },
  {
    label: "Interview Notes",
    href: "/interviews",
    match: "/interviews",
    description: "Review source-oriented interview context.",
  },
  {
    label: "AI Review",
    href: "/qa",
    match: "/qa",
    description: "Ask grounded questions against local knowledge.",
  },
  {
    label: "Resume / Projects",
    href: "/resume",
    match: "/resume",
    description: "Deep dive into extracted resume projects.",
  },
];
