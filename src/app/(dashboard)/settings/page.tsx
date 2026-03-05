"use client";

import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useApi } from "@/hooks/use-api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import { useTheme } from "next-themes";
import {
    User,
    Lock,
    Palette,
    Building2,
    Shield,
    Bell,
    Sun,
    Moon,
    Monitor,
    Mail,
    Phone,
    MapPin,
    Save,
    Eye,
    EyeOff,
    CheckCircle2,
    AlertCircle,
} from "lucide-react";

type SettingsTab = "profile" | "security" | "appearance" | "institution" | "notifications";

const TABS: { id: SettingsTab; label: string; icon: React.ElementType; adminOnly?: boolean }[] = [
    { id: "profile", label: "Profile", icon: User },
    { id: "security", label: "Security", icon: Lock },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "institution", label: "Institution", icon: Building2, adminOnly: true },
    { id: "notifications", label: "Notifications", icon: Bell },
];

export default function SettingsPage() {
    const { user } = useAuth();
    const { apiFetch } = useApi();
    const { theme, setTheme } = useTheme();
    const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

    const isAdmin = user?.role === "SYSTEM_ADMIN" || user?.role === "ADMIN";

    const filteredTabs = TABS.filter((tab) => !tab.adminOnly || isAdmin);

    return (
        <DashboardShell>
            <div className="space-y-6 animate-fade-in">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Manage your account preferences and system configuration
                    </p>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Sidebar Tabs */}
                    <div className="lg:w-64 shrink-0">
                        <Card className="shadow-sm">
                            <CardContent className="p-2">
                                <nav className="space-y-1">
                                    {filteredTabs.map((tab) => {
                                        const Icon = tab.icon;
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id)}
                                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === tab.id
                                                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 shadow-sm"
                                                    : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50"
                                                    }`}
                                            >
                                                <Icon className="h-4 w-4" />
                                                {tab.label}
                                            </button>
                                        );
                                    })}
                                </nav>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        {activeTab === "profile" && <ProfileSettings user={user} apiFetch={apiFetch} />}
                        {activeTab === "security" && <SecuritySettings apiFetch={apiFetch} />}
                        {activeTab === "appearance" && <AppearanceSettings theme={theme} setTheme={setTheme} />}
                        {activeTab === "institution" && <InstitutionSettings />}
                        {activeTab === "notifications" && <NotificationSettings />}
                    </div>
                </div>
            </div>
        </DashboardShell>
    );
}

/* ─────────────────────────────────────────────── */
/* PROFILE SETTINGS                                 */
/* ─────────────────────────────────────────────── */
function ProfileSettings({ user, apiFetch }: { user: any; apiFetch: any }) {
    const [name, setName] = useState(user?.name || "");
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error("Name is required");
            return;
        }
        setSaving(true);
        try {
            const res = await apiFetch("/api/auth/me", {
                method: "PUT",
                body: JSON.stringify({ name }),
            });
            if (res.success) {
                toast.success("Profile updated successfully");
            } else {
                toast.error(res.message || "Update failed");
            }
        } catch {
            toast.error("Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* User Summary Card */}
            <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                <CardContent className="p-6">
                    <div className="flex items-center gap-6">
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 shadow-sm text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                            {user?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white truncate">{user?.name}</h2>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 border-none">
                                    {user?.role?.replace("_", " ")}
                                </Badge>
                                <span className="text-sm text-slate-600 dark:text-slate-400">{user?.email}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Edit Profile */}
            <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <User className="h-4 w-4 text-indigo-500" />
                        Personal Information
                    </CardTitle>
                    <CardDescription>Update your personal details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Full Name</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Your full name"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Email Address</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    value={user?.email || ""}
                                    disabled
                                    className="pl-10 opacity-60 cursor-not-allowed"
                                />
                            </div>
                            <p className="text-xs text-slate-400">Email cannot be changed</p>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Role</Label>
                            <div className="relative">
                                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    value={user?.role?.replace("_", " ") || ""}
                                    disabled
                                    className="pl-10 opacity-60 cursor-not-allowed"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Account Status</Label>
                            <div className="flex items-center gap-2 h-10 px-3 rounded-lg border border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-800/50">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Active</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button onClick={handleSave} isLoading={saving} className="gap-2">
                            <Save className="h-4 w-4" />
                            Save Changes
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

/* ─────────────────────────────────────────────── */
/* SECURITY SETTINGS                                */
/* ─────────────────────────────────────────────── */
function SecuritySettings({ apiFetch }: { apiFetch: any }) {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [saving, setSaving] = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);

    const passwordStrength = React.useMemo(() => {
        if (!newPassword) return { level: 0, label: "", color: "" };
        let score = 0;
        if (newPassword.length >= 8) score++;
        if (/[A-Z]/.test(newPassword)) score++;
        if (/[a-z]/.test(newPassword)) score++;
        if (/[0-9]/.test(newPassword)) score++;
        if (/[^A-Za-z0-9]/.test(newPassword)) score++;

        if (score <= 2) return { level: score, label: "Weak", color: "bg-red-500" };
        if (score <= 3) return { level: score, label: "Fair", color: "bg-yellow-500" };
        if (score <= 4) return { level: score, label: "Good", color: "bg-blue-500" };
        return { level: score, label: "Strong", color: "bg-emerald-500" };
    }, [newPassword]);

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            toast.error("All fields are required");
            return;
        }
        if (newPassword.length < 8) {
            toast.error("Password must be at least 8 characters");
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error("New passwords do not match");
            return;
        }

        setSaving(true);
        try {
            const res = await apiFetch("/api/auth/change-password", {
                method: "POST",
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            if (res.success) {
                toast.success("Password changed successfully");
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
            } else {
                toast.error(res.message || "Failed to change password");
            }
        } catch {
            toast.error("Failed to change password");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Lock className="h-4 w-4 text-indigo-500" />
                        Change Password
                    </CardTitle>
                    <CardDescription>Ensure your account stays secure by using a strong password</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="max-w-md space-y-4">
                        <div className="space-y-1.5">
                            <Label required>Current Password</Label>
                            <div className="relative">
                                <Input
                                    type={showCurrent ? "text" : "password"}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    placeholder="Enter current password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrent(!showCurrent)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label required>New Password</Label>
                            <div className="relative">
                                <Input
                                    type={showNew ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNew(!showNew)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {newPassword && (
                                <div className="space-y-1.5 mt-2">
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map((i) => (
                                            <div
                                                key={i}
                                                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= passwordStrength.level
                                                    ? passwordStrength.color
                                                    : "bg-slate-200 dark:bg-slate-700"
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                    <p className={`text-xs font-medium ${passwordStrength.level <= 2 ? "text-red-500" :
                                        passwordStrength.level <= 3 ? "text-yellow-500" :
                                            passwordStrength.level <= 4 ? "text-blue-500" : "text-emerald-500"
                                        }`}>
                                        {passwordStrength.label}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label required>Confirm New Password</Label>
                            <Input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                            />
                            {confirmPassword && newPassword !== confirmPassword && (
                                <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                                    <AlertCircle className="h-3 w-3" /> Passwords do not match
                                </p>
                            )}
                            {confirmPassword && newPassword === confirmPassword && confirmPassword.length > 0 && (
                                <p className="text-xs text-emerald-500 flex items-center gap-1 mt-1">
                                    <CheckCircle2 className="h-3 w-3" /> Passwords match
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button onClick={handleChangePassword} isLoading={saving} className="gap-2">
                            <Lock className="h-4 w-4" />
                            Update Password
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Security Info */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Shield className="h-4 w-4 text-indigo-500" />
                        Security Overview
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30">
                            <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Account Protected</p>
                                <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">
                                    Your account is secured with password authentication
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30">
                            <Lock className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Session Active</p>
                                <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-0.5">
                                    JWT tokens with automatic refresh
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

/* ─────────────────────────────────────────────── */
/* APPEARANCE SETTINGS                              */
/* ─────────────────────────────────────────────── */
function AppearanceSettings({ theme, setTheme }: { theme: string | undefined; setTheme: (t: string) => void }) {
    const themes = [
        {
            id: "light",
            label: "Light",
            icon: Sun,
            description: "Clean and bright interface",
            preview: "bg-white border-slate-200",
            previewAccent: "bg-slate-100",
        },
        {
            id: "dark",
            label: "Dark",
            icon: Moon,
            description: "Easy on the eyes in low light",
            preview: "bg-slate-900 border-slate-700",
            previewAccent: "bg-slate-800",
        },
        {
            id: "system",
            label: "System",
            icon: Monitor,
            description: "Follows your device settings",
            preview: "bg-gradient-to-r from-white to-slate-900 border-slate-300",
            previewAccent: "bg-gradient-to-r from-slate-100 to-slate-800",
        },
    ];

    return (
        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-slate-900 dark:text-white">
                    <Palette className="h-4 w-4 text-indigo-600" />
                    Theme Preferences
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">Choose how the application looks to you</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                    {themes.map((t) => {
                        const Icon = t.icon;
                        const isActive = theme === t.id;
                        return (
                            <button
                                key={t.id}
                                onClick={() => setTheme(t.id)}
                                className={`relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all duration-200 ${isActive
                                    ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 shadow-sm"
                                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                    }`}
                            >
                                {isActive && (
                                    <div className="absolute top-3 right-3">
                                        <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                                    </div>
                                )}
                                {/* Theme Preview Area */}
                                <div className={`w-full h-12 rounded-lg border ${t.preview} overflow-hidden p-1.5`}>
                                    <div className={`w-full h-1.5 rounded-full ${t.previewAccent} mb-1`} />
                                    <div className={`w-2/3 h-1.5 rounded-full ${t.previewAccent}`} />
                                </div>
                                <div className={`flex h-9 w-9 items-center justify-center rounded-full ${isActive
                                    ? "bg-white dark:bg-slate-800"
                                    : "bg-slate-100 dark:bg-slate-800"
                                    }`}>
                                    <Icon className={`h-4 w-4 ${isActive ? "text-indigo-600" : "text-slate-500"
                                        }`} />
                                </div>
                                <div className="text-center">
                                    <p className={`text-sm font-semibold ${isActive ? "text-indigo-900 dark:text-indigo-100" : "text-slate-700 dark:text-slate-300"
                                        }`}>
                                        {t.label}
                                    </p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{t.description}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}

/* ─────────────────────────────────────────────── */
/* INSTITUTION SETTINGS                             */
/* ─────────────────────────────────────────────── */
function InstitutionSettings() {
    const [institutionName, setInstitutionName] = useState("Bhupram Dharmeshwar Prasad Mahavidyalaya");
    const [address, setAddress] = useState("JJ9P+RWM, Sahroikalika Bux, Uttar Pradesh 261001 (+91-9005561001)");
    const [phone, setPhone] = useState("+91 9651621717");
    const [email, setEmail] = useState("info@brdpdcsitapur.com");
    const [saving, setSaving] = useState(false);

    const handleSave = () => {
        setSaving(true);
        setTimeout(() => {
            toast.success("Institution settings saved");
            setSaving(false);
        }, 800);
    };

    return (
        <div className="space-y-6">
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-indigo-500" />
                        Institution Details
                    </CardTitle>
                    <CardDescription>Manage your institution&apos;s basic information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5 md:col-span-2">
                            <Label>Institution Name</Label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    value={institutionName}
                                    onChange={(e) => setInstitutionName(e.target.value)}
                                    className="pl-10"
                                    placeholder="Your institution name"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Contact Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-10"
                                    placeholder="admin@example.com"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Contact Phone</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="pl-10"
                                    placeholder="+91 XXXXXXXXXX"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                            <Label>Address</Label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <Input
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    className="pl-10"
                                    placeholder="Full address"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button onClick={handleSave} isLoading={saving} className="gap-2">
                            <Save className="h-4 w-4" />
                            Save Institution Info
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Receipt Config */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base">Receipt Configuration</CardTitle>
                    <CardDescription>Customize how payment receipts are generated</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Receipt Prefix</p>
                            <p className="text-xs text-slate-500 mt-1">Current: <span className="font-mono text-indigo-600 dark:text-indigo-400">RCP</span></p>
                        </div>
                        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Registration Prefix</p>
                            <p className="text-xs text-slate-500 mt-1">Format: <span className="font-mono text-indigo-600 dark:text-indigo-400">COURSE/YEAR/XXXX</span></p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

/* ─────────────────────────────────────────────── */
/* NOTIFICATION SETTINGS                            */
/* ─────────────────────────────────────────────── */
function NotificationSettings() {
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [paymentAlerts, setPaymentAlerts] = useState(true);
    const [dueDateReminders, setDueDateReminders] = useState(true);
    const [loginAlerts, setLoginAlerts] = useState(false);

    const toggles = [
        {
            label: "Email Notifications",
            description: "Receive important updates via email",
            value: emailNotifications,
            onChange: setEmailNotifications,
            icon: Mail,
        },
        {
            label: "Payment Alerts",
            description: "Get notified when a payment is recorded",
            value: paymentAlerts,
            onChange: setPaymentAlerts,
            icon: CheckCircle2,
        },
        {
            label: "Due Date Reminders",
            description: "Reminders for upcoming fee due dates",
            value: dueDateReminders,
            onChange: setDueDateReminders,
            icon: Bell,
        },
        {
            label: "Login Alerts",
            description: "Alert when your account is accessed from a new device",
            value: loginAlerts,
            onChange: setLoginAlerts,
            icon: Shield,
        },
    ];

    return (
        <Card className="shadow-sm">
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <Bell className="h-4 w-4 text-indigo-500" />
                    Notification Preferences
                </CardTitle>
                <CardDescription>Control which notifications you receive</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {toggles.map((toggle) => {
                        const Icon = toggle.icon;
                        return (
                            <div key={toggle.label} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 mt-0.5">
                                        <Icon className="h-4 w-4 text-slate-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{toggle.label}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{toggle.description}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => toggle.onChange(!toggle.value)}
                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${toggle.value ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-600"
                                        }`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-300 ease-in-out ${toggle.value ? "translate-x-5" : "translate-x-0"
                                            }`}
                                    />
                                </button>
                            </div>
                        );
                    })}
                </div>

                <div className="flex justify-end pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                    <Button
                        onClick={() => toast.success("Notification preferences saved")}
                        className="gap-2"
                    >
                        <Save className="h-4 w-4" />
                        Save Preferences
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
