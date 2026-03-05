"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validators/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";

export default function LoginPage() {
    const { login, isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Redirect if already authenticated
    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            router.push("/dashboard");
        }
    }, [isAuthenticated, isLoading, router]);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginInput>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginInput) => {
        setIsSubmitting(true);
        try {
            await login(data.email, data.password);
            toast.success("Identity verified. Welcome to SIS Dashboard.");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Verification failed. Check your credentials.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading || isAuthenticated) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0f1d2f]">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1e3a5f] border-t-transparent" />
                    <p className="text-sm font-medium text-slate-500 animate-pulse">Authenticating Security Clearance...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative flex min-h-screen items-center justify-center bg-[#f8fafc] dark:bg-[#0f1d2f]">
            {/* Background design accents */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20 dark:opacity-50">
                <div className="absolute top-0 right-0 h-[600px] w-[600px] rounded-full bg-[#1e3a5f]/15 blur-[120px]" />
                <div className="absolute bottom-0 left-0 h-[600px] w-[600px] rounded-full bg-indigo-500/10 blur-[120px]" />
            </div>

            <div className="relative z-10 w-full max-w-[480px] px-6 py-12">
                {/* Branding Hero - Perfect Horizontal Alignment */}
                <div className="mb-10 flex items-center justify-center">
                    <div className="flex items-center gap-6 group">
                        <div className="flex h-20 w-20 items-center justify-center rounded-[22px] bg-white p-2.5 shadow-[0_25px_50px_-12px_rgba(30,58,95,0.25)] dark:bg-slate-900 border border-slate-100 dark:border-slate-800 transition-transform duration-500 hover:scale-105">
                            <Image
                                src="/logo.png"
                                alt="College Logo"
                                width={64}
                                height={64}
                                className="object-contain"
                            />
                        </div>
                        <div className="h-14 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block shadow-sm" />
                        <div className="text-left flex flex-col justify-center">
                            <h1 className="text-xl sm:text-2xl font-black text-[#1e3a5f] dark:text-white leading-[1.2] tracking-tight">
                                Bhupram Dharmeshwar Prasad<br />
                                <span className="text-slate-500 dark:text-slate-400 font-extrabold uppercase text-[0.65em] tracking-[0.2em] mt-1 block">Mahavidyalaya Portal</span>
                            </h1>
                        </div>
                    </div>
                </div>

                {/* Secure Login Terminal */}
                <Card className="border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/98 backdrop-blur-2xl shadow-[0_40px_70px_-20px_rgba(0,0,0,0.18)] border-t-[5px] border-t-[#1e3a5f]">
                    <CardHeader className="pb-4 pt-10 text-center">
                        <CardTitle className="flex items-center justify-center gap-3 text-2xl font-black tracking-tight text-[#1e3a5f] dark:text-white">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 shadow-inner dark:bg-slate-800">
                                <ShieldCheck className="h-5 w-5 text-[#1e3a5f]" />
                            </div>
                            <span>Personnel Log-in</span>
                        </CardTitle>
                        <CardDescription className="font-semibold text-slate-500 pt-2">
                            Identification requested for BRDP SIS Authorized Access
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-10 pb-12 pt-8">
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">
                            {/* Email Entrance */}
                            <div className="space-y-2.5">
                                <div className="flex justify-between items-center">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-[#1e3a5f]/70 dark:text-slate-400" required>
                                        Personnel Username
                                    </Label>
                                </div>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400 group-focus-within:text-[#1e3a5f] transition-colors duration-300">
                                        <Mail className="h-4.5 w-4.5" />
                                    </div>
                                    <Input
                                        {...register("email")}
                                        type="email"
                                        placeholder="Enter your registered email"
                                        className="pl-12 h-14 border-slate-200 bg-slate-50/50 text-slate-900 font-semibold placeholder:text-slate-400 focus:ring-4 focus:ring-[#1e3a5f]/5 focus:border-[#1e3a5f] dark:border-slate-700 dark:bg-slate-800/50 dark:text-white transition-all rounded-xl"
                                        error={errors.email?.message}
                                    />
                                </div>
                            </div>

                            {/* Password Entrance */}
                            <div className="space-y-2.5">
                                <div className="flex justify-between items-center">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-[#1e3a5f]/70 dark:text-slate-400" required>
                                        Personnel Access Key
                                    </Label>
                                </div>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400 group-focus-within:text-[#1e3a5f] transition-colors duration-300">
                                        <Lock className="h-4.5 w-4.5" />
                                    </div>
                                    <Input
                                        {...register("password")}
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••••••"
                                        className="pl-12 pr-12 h-14 border-slate-200 bg-slate-50/50 text-slate-900 font-semibold placeholder:text-slate-400 focus:ring-4 focus:ring-[#1e3a5f]/5 focus:border-[#1e3a5f] dark:border-slate-700 dark:bg-slate-800/50 dark:text-white transition-all rounded-xl"
                                        error={errors.password?.message}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#1e3a5f] dark:hover:text-slate-200 transition-all duration-300"
                                        aria-label={showPassword ? "Hide access key" : "Show access key"}
                                    >
                                        {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Authentication Execution */}
                            <Button
                                type="submit"
                                className="w-full h-14 bg-[#1e3a5f] hover:bg-[#152d4a] text-white shadow-2xl shadow-[#1e3a5f]/25 font-black text-sm tracking-[0.2em] uppercase transition-all active:scale-[0.98] rounded-xl overflow-hidden relative group"
                                isLoading={isSubmitting}
                            >
                                <span className="relative z-10">
                                    {isSubmitting ? "Verifying clearance..." : "Establish Secure Session"}
                                </span>
                                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* System Authentication Footer */}
                <div className="mt-14 text-center space-y-5">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                        <span className="h-px w-8 bg-slate-200 dark:bg-slate-800" />
                        Official BRDP Portal
                        <span className="h-px w-8 bg-slate-200 dark:bg-slate-800" />
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-500 font-bold leading-relaxed max-w-xs mx-auto opacity-70">
                        Bhupram Dharmeshwar Prasad Mahavidyalaya SIS Secure Node. All unauthorized attempts are automatically recorded by system security protocols.
                    </p>
                </div>
            </div>
        </div>
    );
}
