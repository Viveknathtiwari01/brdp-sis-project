import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: "default" | "success" | "warning" | "danger" | "outline";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
                {
                    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300": variant === "default",
                    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300": variant === "success",
                    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300": variant === "warning",
                    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300": variant === "danger",
                    "border border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-300": variant === "outline",
                },
                className
            )}
            {...props}
        />
    );
}

export { Badge };
