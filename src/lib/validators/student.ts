import { z } from "zod";

export const studentRegistrationSchema = z.object({
    // Personal Details
    firstName: z.string().min(2, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    fatherName: z.string().min(2, "Father's name is required"),
    motherName: z.string().min(2, "Mother's name is required"),
    dateOfBirth: z.coerce.date(),
    gender: z.enum(["Male", "Female", "Other"]),
    phone: z.string().min(10, "Valid phone number required"),
    address: z.string().min(5, "Address is required"),
    city: z.string().min(2, "City is required"),
    state: z.string().min(2, "State is required"),
    pincode: z.string().regex(/^\d{6}$/, "Invalid pincode"),

    // Educational Details
    tenthBoard: z.string().min(2, "10th board is required"),
    tenthYear: z.coerce.number().int().min(2000).max(2030),
    tenthPercentage: z.coerce.number().min(0).max(100),
    twelfthBoard: z.string().min(2, "12th board is required"),
    twelfthYear: z.coerce.number().int().min(2000).max(2030),
    twelfthPercentage: z.coerce.number().min(0).max(100),
    twelfthStream: z.string().min(2, "Stream is required"),

    // Academic Details
    courseId: z.string().min(1, "Course is required"),
    sessionId: z.string().min(1, "Session is required"),
    rollNo: z.string().optional(),

    // Initial Payment
    initialPayment: z.coerce.number().min(0).optional().default(0),
    paymentMode: z.enum(["CASH", "UPI"]).optional(),
    transactionId: z.string().optional(),
});

export type StudentRegistrationInput = z.infer<typeof studentRegistrationSchema>;
