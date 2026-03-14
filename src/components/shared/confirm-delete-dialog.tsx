"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function ConfirmDeleteDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmText = "Delete",
    cancelText = "Cancel",
    confirming,
    onConfirm,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    confirming: boolean;
    onConfirm: () => void | Promise<void>;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700/60">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={confirming}>
                        {cancelText}
                    </Button>
                    <Button variant="destructive" onClick={onConfirm} isLoading={confirming}>
                        {confirmText}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
