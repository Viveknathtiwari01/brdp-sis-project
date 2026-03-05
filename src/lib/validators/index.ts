export { loginSchema, createUserSchema, updatePermissionsSchema } from "./auth";
export type { LoginInput, CreateUserInput, UpdatePermissionsInput } from "./auth";
export { courseSchema, sessionSchema, feeStructureSchema, bulkFeeStructureSchema } from "./academic";
export type { CourseInput, SessionInput, FeeStructureInput, BulkFeeStructureInput } from "./academic";
export { studentRegistrationSchema } from "./student";
export type { StudentRegistrationInput } from "./student";
export { paymentSchema } from "./payment";
export type { PaymentInput } from "./payment";
