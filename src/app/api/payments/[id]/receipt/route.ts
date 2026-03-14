import { NextResponse } from "next/server";
import { withPermission, apiError } from "@/lib/auth/middleware";
import { PaymentService } from "@/lib/services/payment.service";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";

function formatDate(date: Date) {
    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
}

function formatDateCompact(date: Date) {
    return date
        .toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        })
        .replaceAll("/", "-");
}

function formatTime(date: Date) {
    return date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

function sanitizeFileName(value: string) {
    return value
        .trim()
        .replaceAll(/[^a-zA-Z0-9._-]+/g, "-")
        .replaceAll(/-+/g, "-")
        .replaceAll(/^-|-$/g, "");
}

// GET /api/payments/:id/receipt
export const GET = withPermission("payment:view")(async (req, user, context) => {
    try {
        if (user.role !== "SYSTEM_ADMIN" && user.role !== "ADMIN") {
            return apiError("Forbidden. Insufficient role.", 403);
        }

        const params = await context?.params;
        const paymentId = params?.id;
        if (!paymentId) return apiError("Payment ID is required", 400);

        const payment = await PaymentService.getById(paymentId);

        const paidAt = new Date(payment.paidAt);
        const dueDate = new Date(payment.feeLedger.dueDate);

        const instituteName = "Sri Bhupram Dharmeshwar Prasad Mahavidyalaya";
        const instituteAddress = [
            "Village Mohiuddinpur Sahroi, Post: Sitapur,",
            "Block: Ailiya, District: Sitapur, Uttar Pradesh - 261001",
        ];

        const studentName = `${payment.student.firstName} ${payment.student.lastName}`;
        const courseName = payment.student.course?.name || "";
        const sessionName = payment.student.session?.name || "";

        const totalAmount = Number(payment.feeLedger.totalAmount) || 0;
        const paidAmount = Number(payment.amount) || 0;
        const remaining = Math.max(0, totalAmount - Number(payment.feeLedger.paidAmount));

        const doc = new jsPDF({ unit: "pt", format: "a4" });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const outerMargin = 28;
        const contentPaddingX = 22;
        const contentLeft = outerMargin + contentPaddingX;
        const contentRight = outerMargin + contentPaddingX;
        const contentWidth = pageWidth - contentLeft - contentRight;

        const colors = {
            darkBlue: [0, 32, 96] as [number, number, number],
            blue: [30, 58, 138] as [number, number, number],
            slate900: [15, 23, 42] as [number, number, number],
            slate600: [71, 85, 105] as [number, number, number],
            border: [148, 163, 184] as [number, number, number],
            grid: [203, 213, 225] as [number, number, number],
            headFill: [241, 245, 249] as [number, number, number],
        };

        doc.setDrawColor(...colors.border);
        doc.setLineWidth(1);
        doc.rect(outerMargin, outerMargin, pageWidth - outerMargin * 2, pageHeight - outerMargin * 2);

        const headerY = outerMargin + 24;
        const qrUrl = "http://brdpdcsitapur.com/admissions/apply/";
        const qrSize = 74;
        const qrX = pageWidth - contentRight - qrSize;

        const qrDataUrl = await QRCode.toDataURL(qrUrl, {
            errorCorrectionLevel: "M",
            margin: 0,
            width: 256,
            color: { dark: "#002060", light: "#ffffff" },
        });

        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(...colors.darkBlue);
        doc.text("Digital Fee Receipt", pageWidth / 2, headerY, { align: "center" });

        doc.setFontSize(13.5);
        doc.text(instituteName, pageWidth / 2, headerY + 22, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10.5);
        doc.setTextColor(...colors.blue);
        instituteAddress.forEach((line, i) => {
            doc.text(line, pageWidth / 2, headerY + 40 + i * 14, { align: "center" });
        });

        doc.setDrawColor(...colors.grid);
        doc.setLineWidth(1);
        const headerDividerY = headerY + 40 + instituteAddress.length * 14 + 10;
        doc.line(contentLeft, headerDividerY, pageWidth - contentRight, headerDividerY);

        const sectionTitle = (title: string, y: number) => {
            doc.setFillColor(239, 246, 255);
            doc.setDrawColor(...colors.grid);
            doc.setLineWidth(0.8);
            doc.rect(contentLeft, y - 14, contentWidth, 20, "FD");
            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.setTextColor(...colors.slate900);
            doc.text(title, contentLeft + 8, y);
        };

        const firstSectionY = headerDividerY + 30;
        sectionTitle("Student & Receipt Details", firstSectionY);

        autoTable(doc, {
            startY: firstSectionY + 10,
            theme: "grid",
            styles: {
                font: "helvetica",
                fontSize: 11,
                textColor: colors.slate900,
                cellPadding: 7,
                lineColor: colors.grid,
                lineWidth: 0.8,
            },
            tableLineColor: colors.grid,
            tableLineWidth: 0.8,
            body: [
                ["Receipt No:", payment.receiptNumber, "Date:", formatDate(paidAt)],
                ["Student:", studentName, "Reg. No:", payment.student.registrationNo],
                ["Course:", courseName, "Session:", sessionName || "-"],
                ["Semester:", String(payment.feeLedger.semester), "Mode:", payment.paymentMode],
            ],
            columnStyles: {
                0: { cellWidth: contentWidth * 0.18, fontStyle: "bold" },
                1: { cellWidth: contentWidth * 0.32 },
                2: { cellWidth: contentWidth * 0.18, fontStyle: "bold" },
                3: { cellWidth: contentWidth * 0.32 },
            },
            didParseCell: (data) => {
                const isModeValue = data.section === "body" && data.row.index === 3 && data.column.index === 3;
                if (isModeValue) {
                    data.cell.styles.textColor = [22, 101, 52];
                    data.cell.styles.fillColor = [220, 252, 231];
                    data.cell.styles.fontStyle = "bold";
                }
            },
            margin: { left: contentLeft, right: contentRight },
        });

        const afterDetailsY = (doc as any).lastAutoTable.finalY + 32;
        sectionTitle("Fee Breakdown", afterDetailsY);

        autoTable(doc, {
            startY: afterDetailsY + 10,
            theme: "grid",
            styles: {
                font: "helvetica",
                fontSize: 11,
                textColor: colors.slate900,
                cellPadding: 7,
                lineColor: colors.grid,
                lineWidth: 0.8,
            },
            headStyles: { fillColor: colors.headFill, textColor: colors.slate900, fontStyle: "bold" },
            tableLineColor: colors.grid,
            tableLineWidth: 0.8,
            head: [["S.No", "Particulars", "Amount (Rs.)"]],
            body: [
                ["1", `Semester Fee (Sem ${payment.feeLedger.semester})`, `Rs. ${totalAmount.toFixed(0)}`],
                ["2", `Paid Now (${payment.paymentMode}${payment.transactionId ? ` - ${payment.transactionId}` : ""})`, `Rs. ${paidAmount.toFixed(0)}`],
                ["", "Total Fee Payable", `Rs. ${totalAmount.toFixed(0)}`],
            ],
            columnStyles: {
                0: { cellWidth: contentWidth * 0.10 },
                1: { cellWidth: contentWidth * 0.60 },
                2: { cellWidth: contentWidth * 0.30, halign: "right" },
            },
            didParseCell: (data) => {
                if (data.section === "body" && data.row.index === 2) {
                    data.cell.styles.fontStyle = "bold";
                    data.cell.styles.fillColor = [248, 250, 252];
                }
            },
            margin: { left: contentLeft, right: contentRight },
        });

        const afterBreakdownY = (doc as any).lastAutoTable.finalY + 32;
        sectionTitle("Payment Summary", afterBreakdownY);

        autoTable(doc, {
            startY: afterBreakdownY + 10,
            theme: "grid",
            styles: {
                font: "helvetica",
                fontSize: 11,
                textColor: colors.slate900,
                cellPadding: 7,
                lineColor: colors.grid,
                lineWidth: 0.8,
            },
            headStyles: { fillColor: colors.headFill, textColor: colors.slate900, fontStyle: "bold" },
            tableLineColor: colors.grid,
            tableLineWidth: 0.8,
            head: [["Installment", "Date", "Mode", "Amount (Rs.)"]],
            body: [
                [
                    "Installment-1",
                    `${formatDateCompact(paidAt)} ${formatTime(paidAt)}`,
                    payment.paymentMode,
                    `Rs. ${paidAmount.toFixed(0)}`,
                ],
                ["Grand Total Paid", `Rs. ${paidAmount.toFixed(0)}`, "Remaining Balance", `Rs. ${remaining.toFixed(0)}`],
            ],
            columnStyles: {
                0: { cellWidth: contentWidth * 0.28 },
                1: { cellWidth: contentWidth * 0.24 },
                2: { cellWidth: contentWidth * 0.28 },
                3: { cellWidth: contentWidth * 0.20, halign: "right" },
            },
            didParseCell: (data) => {
                if (data.section === "body" && data.row.index === 1) {
                    data.cell.styles.fontStyle = "bold";
                    data.cell.styles.fillColor = [248, 250, 252];
                }
            },
            margin: { left: contentLeft, right: contentRight },
        });

        const afterSummaryY = (doc as any).lastAutoTable.finalY + 26;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...colors.slate900);
        doc.text("Authorized Signature", contentLeft, afterSummaryY);
        doc.text("Fee Clerk", contentLeft, afterSummaryY + 14);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(185, 28, 28);
        doc.text(`Due Date: ${formatDate(dueDate)}`, pageWidth - contentRight, afterSummaryY + 8, { align: "right" });

        const footerGap = 14;
        const footerY = pageHeight - outerMargin - qrSize - 24;
        doc.addImage(qrDataUrl, "PNG", qrX, footerY, qrSize, qrSize);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(...colors.slate600);
        // doc.text("Scan to Apply", qrX + qrSize / 2, footerY + qrSize + 12, { align: "center" });

        const noteY = Math.min(afterSummaryY + 28, footerY - footerGap - 52);
        doc.setDrawColor(...colors.grid);
        doc.setFillColor(241, 245, 249);
        doc.rect(contentLeft, noteY, contentWidth, 52, "FD");
        doc.setFont("helvetica", "normal");
        doc.setTextColor(51, 65, 85);
        doc.setFontSize(10);
        doc.text(
            "Note: This is a computer-generated receipt and does not require a physical seal unless requested.",
            contentLeft + 10,
            noteY + 22
        );

        const pdfArrayBuffer = doc.output("arraybuffer");
        const pdfBuffer = Buffer.from(pdfArrayBuffer);

        const studentStart = sanitizeFileName(payment.student.firstName || "student");
        const fileName = sanitizeFileName(`${studentStart}_${payment.receiptNumber}-${formatDateCompact(paidAt)}.pdf`);

        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename=\"${fileName}\"`,
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to generate receipt";
        return apiError(message, 500);
    }
});
