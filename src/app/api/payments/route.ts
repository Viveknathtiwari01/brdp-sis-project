import { withPermission, apiResponse, apiError } from "@/lib/auth/middleware";
import { PaymentService } from "@/lib/services/payment.service";
import { paymentSchema } from "@/lib/validators/payment";

// GET /api/payments
export const GET = withPermission("payment:view")(async (req, user) => {
    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        const studentId = searchParams.get("studentId") || undefined;
        const feeLedgerId = searchParams.get("feeLedgerId") || undefined;
        const startDate = searchParams.get("startDate") || undefined;
        const endDate = searchParams.get("endDate") || undefined;

        const result = await PaymentService.getAll({
            page,
            limit,
            studentId,
            feeLedgerId,
            startDate,
            endDate,
        });

        return apiResponse(result);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch payments";
        return apiError(message, 500);
    }
});

// POST /api/payments
export const POST = withPermission("payment:create")(async (req, user) => {
    try {
        const body = await req.json();
        const validated = paymentSchema.parse(body);
        const result = await PaymentService.processPayment(validated, user.userId);
        return apiResponse(result, 201);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Payment failed";
        return apiError(message, 400);
    }
});
