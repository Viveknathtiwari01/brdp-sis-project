import { z } from "zod";
import { CollegeCode } from "@/lib/college-config";

export const studentRegistrationSchema = z.object({
    // Personal Details
    registrationNo: z.string().min(2, "Registration number is required"),
    rollNo: z.string().min(1, "Roll No is required"),
    firstName: z.string().min(2, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    fatherName: z.string().min(2, "Father's name is required"),
    motherName: z.string().min(2, "Mother's name is required"),
    dateOfBirth: z.coerce.date({ error: "Date of birth is required" }),
    gender: z.enum(["Male", "Female", "Other"]),
    phone: z.string().min(10, "Valid phone number required"),
    address: z.string().min(5, "Address is required"),
    city: z.string().min(2, "City is required"),
    state: z.string().min(2, "State is required"),
    pincode: z.string().regex(/^\d{6}$/, "Invalid pincode"),
    profileImage: z.string().optional(),
    collegeCode: z.enum(["BRDP", "RAK"]).default("BRDP"),

    // Educational Details
    tenthBoard: z.string().min(2, "10th board is required"),
    tenthYear: z.coerce
        .number({ error: "10th year is required" })
        .int("10th year must be a valid year")
        .min(2000, "10th year must be between 2000 and 2030")
        .max(2030, "10th year must be between 2000 and 2030"),
    tenthPercentage: z.coerce
        .number({ error: "10th percentage is required" })
        .min(0, "10th percentage must be between 0 and 100")
        .max(100, "10th percentage must be between 0 and 100"),
    twelfthBoard: z.string().min(2, "12th board is required"),
    twelfthYear: z.coerce
        .number({ error: "12th year is required" })
        .int("12th year must be a valid year")
        .min(2000, "12th year must be between 2000 and 2030")
        .max(2030, "12th year must be between 2000 and 2030"),
    twelfthPercentage: z.coerce
        .number({ error: "12th percentage is required" })
        .min(0, "12th percentage must be between 0 and 100")
        .max(100, "12th percentage must be between 0 and 100"),
    twelfthStream: z.string().min(2, "Stream is required"),

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
