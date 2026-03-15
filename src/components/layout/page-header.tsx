"use client";

import React from "react";

export function PageHeader({
    title,
    description,
    icon,
    actions,
}: {
    title: string;
    description?: string;
    icon?: React.ReactNode;
    actions?: React.ReactNode;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-5 sm:px-6 sm:py-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/40">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                    <h1 className="flex items-center gap-2 text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                        {icon}
                        <span className="truncate">{title}</span>
                    </h1>
                    {description ? (
                        <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">{description}</p>
                    ) : null}
                </div>
                {actions ? <div className="shrink-0">{actions}</div> : null}
            </div>
        </div>
    );
}
