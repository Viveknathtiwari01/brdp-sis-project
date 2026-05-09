import { NextRequest, NextResponse } from "next/server";
import { withPermission, apiError } from "@/lib/auth/middleware";
import prisma from "@/lib/prisma/client";
import { PaymentService } from "@/lib/services/payment.service";
import { COLLEGE_CONFIG } from "@/lib/college-config";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";

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

        // Get college config based on student's college code
        const collegeCode = (payment.student as any)?.collegeCode || "BRDP";
        const college = COLLEGE_CONFIG[collegeCode as keyof typeof COLLEGE_CONFIG] || COLLEGE_CONFIG.BRDP;

        const instituteName = college.name;
        // Split address into lines if it's too long, or use as is
        const instituteAddress = college.address.split(", ").reduce((acc: string[], curr: string, i: number) => {
            if (i % 2 === 0) acc.push(curr);
            else acc[acc.length - 1] += ", " + curr;
            return acc;
        }, []);

        const studentName = payment.student.fullName;
        const courseName = payment.student.course?.name || "";
        const sessionName = payment.student.session?.name || "";

        const totalAmount = Number(payment.feeLedger.totalAmount) || 0;
        const paidAmount = Number(payment.amount) || 0;
        const remaining = Math.max(0, totalAmount - Number(payment.feeLedger.paidAmount));

        const doc = new jsPDF({ unit: "pt", format: [595.28, 1100] });
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
        // const qrUrl = "http://brdpdcsitapur.com/admissions/apply/";
        const qrUrl = "Fee Receipt - No Redirect";
        const qrSize = 74;
        const qrX = pageWidth - contentRight - qrSize;

        const logoPath = path.join(process.cwd(), "public", college.logoPath.replace(/^\//, ""));
        const logoBuffer = fs.existsSync(logoPath) ? fs.readFileSync(logoPath) : null;
        const logoDataUrl = logoBuffer
            ? `data:image/png;base64,${logoBuffer.toString("base64")}`
            : null;
        const logoSize = 56;
        const logoX = contentLeft;
        const logoY = headerY - 16;

        const headerLeft = contentLeft + (logoDataUrl ? logoSize + 14 : 0);
        const headerRight = pageWidth - contentRight;
        const headerCenterX = pageWidth / 2;

        const qrDataUrl = await QRCode.toDataURL(qrUrl, {
            errorCorrectionLevel: "M",
            margin: 0,
            width: 256,
            color: { dark: "#002060", light: "#ffffff" },
        });

        if (logoDataUrl) {
            doc.addImage(logoDataUrl, "PNG", logoX, logoY, logoSize, logoSize);
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(24);
        doc.setTextColor(...colors.darkBlue);
        // Split college name properly for two lines
        const nameParts = instituteName.split(" ");
        const firstLine = nameParts.slice(0, 4).join(" "); // First 4 words
        const secondLine = nameParts.slice(4).join(" "); // Remaining words
        
        doc.text(firstLine, headerCenterX, headerY + 4, { align: "center" });
        doc.text(secondLine, headerCenterX, headerY + 30, { align: "center" });

        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        doc.setTextColor(...colors.slate900);
        doc.text("Fee Receipt", headerCenterX, headerY + 56, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(15);
        doc.setTextColor(...colors.blue);
        instituteAddress.forEach((line, i) => {
            doc.text(line, headerCenterX, headerY + 80 + i * 16, { align: "center" });
        });

        doc.setDrawColor(...colors.grid);
        doc.setLineWidth(1);
        const headerDividerY = headerY + 80 + instituteAddress.length * 16 + 12;
        doc.line(contentLeft, headerDividerY, pageWidth - contentRight, headerDividerY);

        const sectionTitle = (title: string, y: number) => {
            doc.setFillColor(239, 246, 255);
            doc.setDrawColor(...colors.grid);
            doc.setLineWidth(0.8);
            doc.rect(contentLeft, y - 16, contentWidth, 24, "FD");
            doc.setFont("helvetica", "bold");
            doc.setFontSize(14);
            doc.setTextColor(...colors.slate900);
            doc.text(title, contentLeft + 8, y + 2);
        };

        const firstSectionY = headerDividerY + 30;
        sectionTitle("Student & Receipt Details", firstSectionY);

        autoTable(doc, {
            startY: firstSectionY + 10,
            theme: "grid",
            styles: {
                font: "helvetica",
                fontSize: 14,
                textColor: colors.slate900,
                cellPadding: 9,
                lineColor: colors.grid,
                lineWidth: 0.8,
            },
            tableLineColor: colors.grid,
            tableLineWidth: 0.8,
            body: [
                ["Receipt No:", payment.receiptNumber, "Date:", formatDate(paidAt)],
                ["Student:", studentName, "Roll No:", payment.student.rollNo],
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
                fontSize: 14,
                textColor: colors.slate900,
                cellPadding: 9,
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
                // ["", "Total Fee Payable", `Rs. ${totalAmount.toFixed(0)}`],
                ["", "Remaining Balance", `Rs. ${(totalAmount - paidAmount).toFixed(0)}`],
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

        const allLedgers = await prisma.feeLedger.findMany({
            where: { studentId: payment.studentId },
            select: { semester: true, totalAmount: true, paidAmount: true, dueDate: true },
        });

        const now = new Date();
        const dueLedgers = allLedgers
            .map((l) => ({
                ...l,
                paidAmount: Number(l.paidAmount),
                totalAmount: Number(l.totalAmount),
                remaining: Math.max(0, Number(l.totalAmount) - Number(l.paidAmount)),
                dueDateObj: new Date(l.dueDate),
            }))
            .filter((l) => l.remaining > 0 && l.paidAmount > 0)
            .sort((a, b) => a.semester - b.semester);

        const overallDueAmount = dueLedgers.reduce((sum, l) => sum + l.remaining, 0);

        const paymentSummaryRows = dueLedgers.map((l) => [
            `Sem ${l.semester}`,
            formatDateCompact(l.dueDateObj),
            "Due",
            `Rs. ${l.remaining.toFixed(0)}`,
        ]);

        if (paymentSummaryRows.length === 0) {
            paymentSummaryRows.push(["—", "—", "Overall Due Amount", "Rs. 0"]);
        } else {
            paymentSummaryRows.push(["", "", "Overall Due Amount", `Rs. ${overallDueAmount.toFixed(0)}`]);
        }

        sectionTitle("Payment Summary", afterBreakdownY);

        autoTable(doc, {
            startY: afterBreakdownY + 10,
            theme: "grid",
            styles: {
                font: "helvetica",
                fontSize: 14,
                textColor: colors.slate900,
                cellPadding: 9,
                lineColor: colors.grid,
                lineWidth: 0.8
            },
            headStyles: { fillColor: colors.headFill, textColor: colors.slate900, fontStyle: "bold" },
            tableLineColor: colors.grid,
            tableLineWidth: 0.8,
            head: [["Semester", "Due Date", "Status", "Amount (Rs.)"]],
            body: paymentSummaryRows,
            columnStyles: {
                0: { cellWidth: contentWidth * 0.28 },
                1: { cellWidth: contentWidth * 0.24 },
                2: { cellWidth: contentWidth * 0.28 },
                3: { cellWidth: contentWidth * 0.20, halign: "right" }
            },
            didParseCell: (data) => {
                if (data.section === "body" && data.row.index === paymentSummaryRows.length - 1) {
                    data.cell.styles.fontStyle = "bold";
                    data.cell.styles.fillColor = [248, 250, 252];
                }
            },
            margin: { left: contentLeft, right: contentRight }
        });

        const afterSummaryY = (doc as any).lastAutoTable.finalY + 40;
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(...colors.slate900);
        doc.text("Authorized Signature", contentLeft, afterSummaryY);
        doc.text("Fee Clerk", contentLeft, afterSummaryY + 20);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(185, 28, 28);
        doc.text(`Due Date: ${formatDate(dueDate)}`, pageWidth - contentRight, afterSummaryY + 10, { align: "right" });

        const noteText = "Note: This is a computer-generated receipt and does not require a physical seal unless requested.";
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        const splitNote = doc.splitTextToSize(noteText, contentWidth - 40);
        const noteHeight = splitNote.length * 18 + 24;
        const noteY = afterSummaryY + 55;
        
        doc.setDrawColor(...colors.grid);
        doc.setFillColor(241, 245, 249);
        doc.rect(contentLeft, noteY, contentWidth, noteHeight, "FD");
        doc.setTextColor(51, 65, 85);
        doc.text(splitNote, contentLeft + 10, noteY + 24);

        const footerY = Math.min(noteY + noteHeight + 40, pageHeight - outerMargin - qrSize - 35);
        doc.addImage(qrDataUrl, "PNG", qrX, footerY, qrSize, qrSize);

        const pdfArrayBuffer = doc.output("arraybuffer");
        const pdfBuffer = Buffer.from(pdfArrayBuffer);

        const studentFileName = sanitizeFileName(payment.student.fullName || "Student");
        const rollNo = sanitizeFileName(payment.student.rollNo || "NoRoll");
        const dateName = formatDateCompact(paidAt).replaceAll("-", "_");
        const fileName = sanitizeFileName(`${studentFileName}_${rollNo}_${dateName}.pdf`);

        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename=\"${fileName}\"`,
                "Cache-Control": "no-store"
            }
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to generate receipt";
        return apiError(message, 500);
    }
});
