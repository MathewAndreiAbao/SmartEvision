import {
    LayoutDashboard,
    CloudUpload,
    Archive,
    Briefcase,
    ShieldCheck,
    Map,
    TrendingUp,
    Settings,
    QrCode,
    type Icon,
} from "lucide-svelte";
import { showQRScanner } from "$lib/stores/ui";

export interface NavItem {
    href: string;
    label: string;
    icon: typeof Icon;
    roles: string[];
    mobileNav?: boolean;
    onClick?: (e: Event) => void;
    priority?: number; // 1-5: higher = show first
    navKey?: string; // For quick guide targeting
}

// Single source of truth for role-based navigation.
// Consumed by both the mobile bottom nav (Sidebar.svelte) and the
// desktop top nav (DesktopNav.svelte) so the two never drift apart.
export const navItems: NavItem[] = [
    // ========== SHARED ACROSS ALL ROLES ==========
    {
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        mobileNav: true,
        priority: 1,
        navKey: "dashboard",
        roles: ["Teacher", "School Head", "Master Teacher", "District Supervisor"],
    },

    // ========== TEACHER (4 tabs) ==========
    {
        href: "/dashboard/upload",
        label: "Upload",
        icon: CloudUpload,
        mobileNav: true,
        priority: 2,
        navKey: "upload",
        roles: ["Teacher"],
    },
    {
        href: "/dashboard/archive",
        label: "My Files",
        icon: Archive,
        mobileNav: true,
        priority: 3,
        navKey: "archive",
        roles: ["Teacher"],
    },
    {
        href: "/dashboard/settings",
        label: "Settings",
        icon: Settings,
        mobileNav: true,
        priority: 4,
        roles: ["Teacher"],
    },

    // ========== MASTER TEACHER (5 tabs) ==========
    {
        href: "/dashboard/upload",
        label: "Upload",
        icon: CloudUpload,
        mobileNav: true,
        priority: 2,
        navKey: "upload",
        roles: ["Master Teacher"],
    },
    {
        href: "/dashboard/monitoring/school",
        label: "School",
        icon: ShieldCheck,
        mobileNav: true,
        priority: 3,
        navKey: "school",
        roles: ["Master Teacher"],
    },
    {
        href: "/dashboard/archive",
        label: "Documents",
        icon: Archive,
        mobileNav: true,
        priority: 4,
        navKey: "documents",
        roles: ["Master Teacher"],
    },
    {
        href: "/dashboard/settings",
        label: "Settings",
        icon: Settings,
        mobileNav: true,
        priority: 5,
        roles: ["Master Teacher"],
    },

    // ========== SCHOOL HEAD (5 tabs) ==========
    {
        href: "/dashboard/upload",
        label: "Upload",
        icon: CloudUpload,
        mobileNav: true,
        priority: 2,
        navKey: "upload",
        roles: ["School Head"],
    },
    {
        href: "/dashboard/monitoring/school",
        label: "Staff",
        icon: Briefcase,
        mobileNav: true,
        priority: 3,
        navKey: "staff",
        roles: ["School Head"],
    },
    {
        href: "/dashboard/archive",
        label: "Submissions",
        icon: Archive,
        mobileNav: true,
        priority: 4,
        navKey: "submissions",
        roles: ["School Head"],
    },
    {
        href: "/dashboard/settings",
        label: "Settings",
        icon: Settings,
        mobileNav: true,
        priority: 5,
        roles: ["School Head"],
    },

    // ========== DISTRICT SUPERVISOR (5 tabs) ==========
    {
        href: "/dashboard/monitoring/district",
        label: "Schools",
        icon: Map,
        mobileNav: true,
        priority: 2,
        navKey: "schools",
        roles: ["District Supervisor"],
    },
    {
        href: "/dashboard/archive",
        label: "Submissions",
        icon: Archive,
        mobileNav: true,
        priority: 3,
        navKey: "submissions",
        roles: ["District Supervisor"],
    },
    {
        href: "/dashboard/analytics",
        label: "Alerts",
        icon: TrendingUp,
        mobileNav: true,
        priority: 4,
        navKey: "alerts",
        roles: ["District Supervisor"],
    },
    {
        href: "/dashboard/settings",
        label: "Settings",
        icon: Settings,
        mobileNav: true,
        priority: 5,
        roles: ["District Supervisor"],
    },

    // ========== OPTIONAL TOOLS ==========
    {
        href: "#scan",
        label: "Scan",
        icon: QrCode,
        mobileNav: false, // Don't show in tab bar
        priority: 99,
        roles: ["Teacher", "School Head", "Master Teacher", "District Supervisor"],
        onClick: (e: Event) => {
            e.preventDefault();
            showQRScanner.set(true);
        },
    },
];

export function getNavItemsForRole(role: string | undefined | null): NavItem[] {
    const currentRole = role?.toLowerCase() || "";
    return navItems
        .filter((item) => item.roles.some((r) => currentRole.includes(r.toLowerCase().trim())))
        .sort((a, b) => (a.priority || 99) - (b.priority || 99));
}
