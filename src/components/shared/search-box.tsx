"use client";

import React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SearchBox({
    value,
    onChange,
    placeholder,
    className,
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    className?: string;
}) {
    return (
        <div className={className}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="pl-10 h-11 rounded-xl bg-white dark:bg-slate-900/30 border-slate-200 dark:border-slate-700 shadow-sm focus-visible:ring-2"
                />
            </div>
        </div>
    );
}
