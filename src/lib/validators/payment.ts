import { z } from "zod";

export const paymentSchema = z.object({
    studentId: z.string().min(1, "Student is required"),
    feeLedgerId: z.string().min(1, "Fee ledger entry is required"),
    amount: z.coerce.number().positive("Amount must be positive"),
    paymentMode: z.enum(["CASH", "UPI"]),
    transactionId: z.string().optional(),
    remarks: z.string().optional(),
});

export type PaymentInput = z.infer<typeof paymentSchema>;
