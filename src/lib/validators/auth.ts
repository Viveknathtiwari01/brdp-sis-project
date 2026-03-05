import { z } from "zod";

export const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

export const createUserSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Must contain at least one uppercase letter")
        .regex(/[a-z]/, "Must contain at least one lowercase letter")
        .regex(/[0-9]/, "Must contain at least one number"),
    name: z.string().min(2, "Name must be at least 2 characters"),
    role: z.enum(["ADMIN", "STUDENT"]),
});

export const updatePermissionsSchema = z.object({
    userId: z.string().min(1, "User ID is required"),
    permissionIds: z.array(z.string()),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdatePermissionsInput = z.infer<typeof updatePermissionsSchema>;
