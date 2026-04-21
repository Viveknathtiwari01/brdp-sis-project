import { z } from "zod";
import { CollegeCode } from "@/lib/college-config";

export const studentRegistrationSchema = z.object({
    // Personal Details
    rollNo: z.string().min(1, "Roll No is required"),
    fullName: z.string().min(2, "Full name is required"),
    email: z.string().email("Invalid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    fatherName: z.string().min(2, "Father's name is required"),

    address: z.string().min(5, "Address is required"),
    collegeCode: z.enum(["BRDP", "RAK"]).default("BRDP"),

    // Academic Details
    courseId: z.string().min(1, "Course is required"),
    currentSemester: z.coerce
        .number({ error: "Semester is required" })
        .int("Semester must be a whole number")
        .min(1, "Semester must be at least 1"),
    sessionId: z.string().min(1, "Session is required"),

    // Initial Payment
    initialPayment: z.coerce
        .number({ error: "Initial payment must be a number" })
        .min(0, "Initial payment cannot be negative")
        .optional()
        .default(0),
    paymentMode: z.enum(["CASH", "UPI"]).optional(),
    transactionId: z.string().optional(),
});

export type StudentRegistrationInput = z.infer<typeof studentRegistrationSchema>;
