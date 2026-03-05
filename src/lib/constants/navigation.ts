import {
    LayoutDashboard,
    Users,
    GraduationCap,
    BookOpen,
    Calendar,
    IndianRupee,
    Receipt,
    Settings,
    Shield,
    Settings2,
    type LucideIcon,
} from "lucide-react";
import { PERMISSIONS } from "./permissions";

export interface NavItem {
    title: string;
    href: string;
    icon: LucideIcon;
    permission?: string;
    children?: NavItem[];
}

export const SIDEBAR_ITEMS: NavItem[] = [
    {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        permission: PERMISSIONS.DASHBOARD_VIEW,
    },
    {
        title: "Students",
        href: "/students",
        icon: GraduationCap,
        permission: PERMISSIONS.STUDENT_VIEW,
    },
    {
        title: "Courses",
        href: "/courses",
        icon: BookOpen,
        permission: PERMISSIONS.COURSE_VIEW,
    },
    {
        title: "Sessions",
        href: "/sessions",
        icon: Calendar,
        permission: PERMISSIONS.SESSION_VIEW,
    },
    {
        title: "Fee Management",
        href: "/fees",
        icon: IndianRupee,
        permission: PERMISSIONS.FEE_LEDGER_VIEW,
    },
    {
        title: "Payments",
        href: "/payments",
        icon: Receipt,
        permission: PERMISSIONS.PAYMENT_VIEW,
    },
    {
        title: "Users",
        href: "/users",
        icon: Users,
        permission: PERMISSIONS.USER_VIEW,
    },
    {
        title: "Fee Structure",
        href: "/fee-structure",
        icon: Settings2,
        permission: PERMISSIONS.COURSE_VIEW,
    },
    {
        title: "Settings",
        href: "/settings",
        icon: Settings,
    },
];

export const ADMIN_SIDEBAR_ITEMS: NavItem[] = [
    {
        title: "Permissions",
        href: "/settings",
        icon: Shield,
    },
];
