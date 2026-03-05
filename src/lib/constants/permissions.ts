export const PERMISSIONS = {
    // Student Module
    STUDENT_VIEW: "student:view",
    STUDENT_CREATE: "student:create",
    STUDENT_EDIT: "student:edit",
    STUDENT_DELETE: "student:delete",

    // Course Module
    COURSE_VIEW: "course:view",
    COURSE_CREATE: "course:create",
    COURSE_EDIT: "course:edit",
    COURSE_DELETE: "course:delete",

    // Session Module
    SESSION_VIEW: "session:view",
    SESSION_CREATE: "session:create",
    SESSION_EDIT: "session:edit",
    SESSION_DELETE: "session:delete",

    // Fee Structure Module
    FEE_STRUCTURE_VIEW: "fee_structure:view",
    FEE_STRUCTURE_CREATE: "fee_structure:create",
    FEE_STRUCTURE_EDIT: "fee_structure:edit",
    FEE_STRUCTURE_DELETE: "fee_structure:delete",

    // Fee Ledger Module
    FEE_LEDGER_VIEW: "fee_ledger:view",
    FEE_LEDGER_EDIT: "fee_ledger:edit",

    // Payment Module
    PAYMENT_VIEW: "payment:view",
    PAYMENT_CREATE: "payment:create",
    PAYMENT_RECEIPT: "payment:receipt",

    // User Management
    USER_VIEW: "user:view",
    USER_CREATE: "user:create",
    USER_EDIT: "user:edit",
    USER_DELETE: "user:delete",

    // Dashboard
    DASHBOARD_VIEW: "dashboard:view",

    // Audit Log
    AUDIT_VIEW: "audit:view",
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_MODULES = [
    {
        module: "Dashboard",
        permissions: [PERMISSIONS.DASHBOARD_VIEW],
    },
    {
        module: "Students",
        permissions: [
            PERMISSIONS.STUDENT_VIEW,
            PERMISSIONS.STUDENT_CREATE,
            PERMISSIONS.STUDENT_EDIT,
            PERMISSIONS.STUDENT_DELETE,
        ],
    },
    {
        module: "Courses",
        permissions: [
            PERMISSIONS.COURSE_VIEW,
            PERMISSIONS.COURSE_CREATE,
            PERMISSIONS.COURSE_EDIT,
            PERMISSIONS.COURSE_DELETE,
        ],
    },
    {
        module: "Sessions",
        permissions: [
            PERMISSIONS.SESSION_VIEW,
            PERMISSIONS.SESSION_CREATE,
            PERMISSIONS.SESSION_EDIT,
            PERMISSIONS.SESSION_DELETE,
        ],
    },
    {
        module: "Fee Structure",
        permissions: [
            PERMISSIONS.FEE_STRUCTURE_VIEW,
            PERMISSIONS.FEE_STRUCTURE_CREATE,
            PERMISSIONS.FEE_STRUCTURE_EDIT,
            PERMISSIONS.FEE_STRUCTURE_DELETE,
        ],
    },
    {
        module: "Fee Ledger",
        permissions: [
            PERMISSIONS.FEE_LEDGER_VIEW,
            PERMISSIONS.FEE_LEDGER_EDIT,
        ],
    },
    {
        module: "Payments",
        permissions: [
            PERMISSIONS.PAYMENT_VIEW,
            PERMISSIONS.PAYMENT_CREATE,
            PERMISSIONS.PAYMENT_RECEIPT,
        ],
    },
    {
        module: "Users",
        permissions: [
            PERMISSIONS.USER_VIEW,
            PERMISSIONS.USER_CREATE,
            PERMISSIONS.USER_EDIT,
            PERMISSIONS.USER_DELETE,
        ],
    },
    {
        module: "Audit Log",
        permissions: [PERMISSIONS.AUDIT_VIEW],
    },
];

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);
