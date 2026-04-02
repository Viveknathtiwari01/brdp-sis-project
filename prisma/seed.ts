import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PERMISSIONS = [
    // Dashboard
    { code: "dashboard:view", name: "View Dashboard", module: "Dashboard" },
    // Students
    { code: "student:view", name: "View Students", module: "Students" },
    { code: "student:create", name: "Create Students", module: "Students" },
    { code: "student:edit", name: "Edit Students", module: "Students" },
    { code: "student:delete", name: "Delete Students", module: "Students" },
    // Courses
    { code: "course:view", name: "View Courses", module: "Courses" },
    { code: "course:create", name: "Create Courses", module: "Courses" },
    { code: "course:edit", name: "Edit Courses", module: "Courses" },
    { code: "course:delete", name: "Delete Courses", module: "Courses" },
    // Sessions
    { code: "session:view", name: "View Sessions", module: "Sessions" },
    { code: "session:create", name: "Create Sessions", module: "Sessions" },
    { code: "session:edit", name: "Edit Sessions", module: "Sessions" },
    { code: "session:delete", name: "Delete Sessions", module: "Sessions" },
    // Fee Structure
    { code: "fee_structure:view", name: "View Fee Structure", module: "Fee Structure" },
    { code: "fee_structure:create", name: "Create Fee Structure", module: "Fee Structure" },
    { code: "fee_structure:edit", name: "Edit Fee Structure", module: "Fee Structure" },
    { code: "fee_structure:delete", name: "Delete Fee Structure", module: "Fee Structure" },
    // Fee Ledger
    { code: "fee_ledger:view", name: "View Fee Ledger", module: "Fee Ledger" },
    { code: "fee_ledger:edit", name: "Edit Fee Ledger", module: "Fee Ledger" },
    // Payments
    { code: "payment:view", name: "View Payments", module: "Payments" },
    { code: "payment:create", name: "Create Payments", module: "Payments" },
    { code: "payment:receipt", name: "Generate Receipts", module: "Payments" },
    // Users
    { code: "user:view", name: "View Users", module: "Users" },
    { code: "user:create", name: "Create Users", module: "Users" },
    { code: "user:edit", name: "Edit Users", module: "Users" },
    { code: "user:delete", name: "Delete Users", module: "Users" },
    // Audit
    { code: "audit:view", name: "View Audit Logs", module: "Audit" },
];

// Helper: findFirst or create (no transaction needed)
async function findOrCreate<T>(
    model: { findFirst: (args: any) => Promise<T | null>; create: (args: any) => Promise<T> },
    where: Record<string, unknown>,
    data: Record<string, unknown>
): Promise<T> {
    const existing = await model.findFirst({ where });
    if (existing) return existing;
    return model.create({ data: { ...where, ...data } });
}

async function main() {
    console.log("🌱 Starting seed...\n");

    // 1. Create permissions
    console.log("📋 Creating permissions...");
    for (const perm of PERMISSIONS) {
        await findOrCreate(
            prisma.permission as any,
            { code: perm.code },
            { name: perm.name, module: perm.module }
        );
    }
    console.log(`   ✅ ${PERMISSIONS.length} permissions created\n`);

    // 2. Create System Admin
    console.log("👑 Creating System Admin...");
    const systemAdminEmail = "ashutoshvermabrdp@gmail.com";
    const adminPassword = await bcrypt.hash("Ashutosh@2026Verma", 12);

    await prisma.user.updateMany({
        where: { role: "SYSTEM_ADMIN", email: { not: systemAdminEmail }, isDeleted: false },
        data: { role: "ADMIN" },
    });

    const systemAdmin = await prisma.user.upsert({
        where: { email: systemAdminEmail },
        update: {
            role: "SYSTEM_ADMIN",
            password: adminPassword,
            isActive: true,
            isDeleted: false,
        },
        create: {
            email: systemAdminEmail,
            password: adminPassword,
            name: "System Administrator",
            role: "SYSTEM_ADMIN",
            isActive: true,
        },
    });

    // 3. Create a sample course
    console.log("📚 Creating sample course...");
    const course = await findOrCreate(
        prisma.course as any,
        { code: "BA" },
        {
            name: "Bachelor of Arts",
            description: "Three-year undergraduate program in arts and humanities",
            duration: 3,
            totalSemesters: 6,
        }
    ) as any;

    // 4. Create a sample session
    console.log("📅 Creating sample session...");
    const existingSession = await prisma.session.findFirst({
        where: { name: "2026-2029" },
    });
    const session = existingSession ?? await prisma.session.create({
        data: {
            name: "2026-2029",
            startDate: new Date("2026-07-01"),
            endDate: new Date("2029-06-30"),
        },
    });

    // 5. Create fee structure for BA 2026-2029
    console.log("💰 Creating fee structure...");
    const feeStructures = [
        { semester: 1, totalAmount: 25000, dueDate: new Date("2026-08-15") },
        { semester: 2, totalAmount: 22000, dueDate: new Date("2027-01-15") },
        { semester: 3, totalAmount: 22000, dueDate: new Date("2027-07-15") },
        { semester: 4, totalAmount: 22000, dueDate: new Date("2026-01-15") },
        { semester: 5, totalAmount: 22000, dueDate: new Date("2026-07-15") },
        { semester: 6, totalAmount: 22000, dueDate: new Date("2027-01-15") },
    ];

    for (const fs of feeStructures) {
        const existing = await prisma.courseFeeStructure.findFirst({
            where: {
                courseId: course.id,
                sessionId: session.id,
                semester: fs.semester,
            },
        });
        if (!existing) {
            await prisma.courseFeeStructure.create({
                data: {
                    courseId: course.id,
                    sessionId: session.id,
                    semester: fs.semester,
                    totalAmount: fs.totalAmount,
                    dueDate: fs.dueDate,
                    description: `Semester ${fs.semester} Fee`,
                },
            });
        }
    }

    // 6. Create a sample student
    console.log("🎓 Creating sample student...");
    const studentPassword = await bcrypt.hash("Test@123", 12);
    const studentUser = await findOrCreate(
        prisma.user as any,
        { email: "Vivek@yopmail.com" },
        {
            password: studentPassword,
            name: "Raviraj Kumar Tiwari",
            role: "STUDENT",
        }
    ) as any;

    const existingStudent = await prisma.student.findFirst({
        where: { userId: studentUser.id },
    });

    if (!existingStudent) {
        const student = await prisma.student.create({
            data: {
                userId: studentUser.id,
                rollNo: "A-001",
                courseId: course.id,
                sessionId: session.id,
                firstName: "Raviraj Kumar",
                lastName: "Tiwari",
                fatherName: "Rajesh Kumar",
                motherName: "Sunita Devi",
                dateOfBirth: new Date("2003-05-15"),
                gender: "Male",
                phone: "6209464451",
                address: "123 Main Street",
                city: "Patna",
                state: "Bihar",
                pincode: "800001",
                tenthBoard: "CBSE",
                tenthYear: 2019,
                tenthPercentage: 85.5,
                twelfthBoard: "CBSE",
                twelfthYear: 2021,
                twelfthPercentage: 82.2,
                twelfthStream: "Science",
                registrationNo: "BA/2026/0001",
                currentSemester: 1,
            },
        });

        // Create fee ledger for this student
        for (const fs of feeStructures) {
            await prisma.feeLedger.create({
                data: {
                    studentId: student.id,
                    semester: fs.semester,
                    totalAmount: fs.totalAmount,
                    paidAmount: 0,
                    dueDate: fs.dueDate,
                    status: "PENDING",
                },
            });
        }
    } else {
        console.log(`   ⚡ Student already exists, skipped.\n`);
    }

    // 7. Create sample admins with permissions
    console.log("👤 Creating sample Admins...");
    const demoAdminPassword = await bcrypt.hash("Admin@123", 12);

    // Sublogin 1
    const demoAdmin1 = await findOrCreate(
        prisma.user as any,
        { email: "brdpdcsitapur@gmail.com" },
        {
            password: demoAdminPassword,
            name: "Sublogin 1",
            role: "ADMIN",
        }
    ) as any;

    // Grant all permissions to demo admin 1
    const allPermissions = await prisma.permission.findMany();
    for (const perm of allPermissions) {
        const existingPerm = await prisma.adminPermission.findFirst({
            where: {
                userId: demoAdmin1.id,
                permissionId: perm.id,
            },
        });
        if (!existingPerm) {
            await prisma.adminPermission.create({
                data: {
                    userId: demoAdmin1.id,
                    permissionId: perm.id,
                    grantedBy: systemAdmin.id,
                },
            });
        }
    }

    // Sublogin 2
    const demoAdmin2 = await findOrCreate(
        prisma.user as any,
        { email: "rakdm2017@gmail.com" },
        {
            password: demoAdminPassword,
            name: "Sublogin 2",
            role: "ADMIN",
        }
    ) as any;

    // Grant all permissions to demo admin 2
    for (const perm of allPermissions) {
        const existingPerm = await prisma.adminPermission.findFirst({
            where: {
                userId: demoAdmin2.id,
                permissionId: perm.id,
            },
        });
        if (!existingPerm) {
            await prisma.adminPermission.create({
                data: {
                    userId: demoAdmin2.id,
                    permissionId: perm.id,
                    grantedBy: systemAdmin.id,
                },
            });
        }
    }
    console.log("═══════════════════════════════════════════");
    console.log("🎉 Seed completed successfully!");
    console.log("═══════════════════════════════════════════");
    console.log("\n📌 Login Credentials:");
    console.log(`System Admin: ${systemAdmin.email} / Ashutosh@2026Verma`);
    console.log(`Sublogin 1 (Admin): ${demoAdmin1.email} / Admin@123`);
    console.log(`Sublogin 2 (Admin): ${demoAdmin2.email} / Admin@123`);
    console.log(`Student: ${studentUser.email} / Test@123`);
    console.log("");
}

main()
    .catch((e) => {
        console.error("❌ Seed failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
