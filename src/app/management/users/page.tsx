"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { UserListItem, UserDetail, UserStats } from "@/lib/types";
import { ManagementMetricCard, ManagementPageHero, ManagementSectionCard } from "@/components/management/page-chrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
    Users, UserCheck, UserX, ShieldCheck, TrendingUp, Search,
    Mail, Lock, Ban, CheckCircle, Phone, MapPin, Package,
    IndianRupee, Eye, X, Send, KeyRound, ShieldOff, Shield, Pencil, Save,
} from "lucide-react";

const STATUS_FILTERS = [
    { value: "all", label: "All Users" },
    { value: "active", label: "Active" },
    { value: "blocked", label: "Blocked" },
    { value: "verified", label: "Verified" },
    { value: "unverified", label: "Unverified" },
];

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency", currency: "INR", minimumFractionDigits: 0,
    }).format(amount);
}

function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
    });
}

function formatPhone(phone: string | null) {
    if (!phone) return "—";
    return phone;
}

// ─── User Detail Dialog ───

function UserDetailDialog({
    userId, open, onClose, onUserUpdated,
}: {
    userId: string | null;
    open: boolean;
    onClose: () => void;
    onUserUpdated: () => void;
}) {
    const [user, setUser] = useState<UserDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeAction, setActiveAction] = useState<"view" | "edit" | "password" | "email">("view");
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Edit form
    const [editForm, setEditForm] = useState<Partial<UserDetail>>({});

    // Password form
    const [newPassword, setNewPassword] = useState("");

    // Email form
    const [emailSubject, setEmailSubject] = useState("");
    const [emailBody, setEmailBody] = useState("");

    useEffect(() => {
        if (userId && open) {
            loadUser(userId);
            setActiveAction("view");
            setMessage(null);
        }
    }, [userId, open]);

    async function loadUser(id: string) {
        setLoading(true);
        try {
            const data = await api.getUserDetail(id);
            setUser(data);
            setEditForm({
                full_name: data.full_name,
                email: data.email,
                phone_number: data.phone_number,
                address_line1: data.address_line1,
                address_line2: data.address_line2,
                city: data.city,
                state: data.state,
                postal_code: data.postal_code,
                country: data.country,
            });
        } catch {
            setMessage({ type: "error", text: "Failed to load user details" });
        } finally {
            setLoading(false);
        }
    }

    async function handleSaveEdit() {
        if (!userId) return;
        setSaving(true);
        setMessage(null);
        try {
            await api.updateUser(userId, editForm);
            setMessage({ type: "success", text: "User updated successfully" });
            await loadUser(userId);
            onUserUpdated();
            setTimeout(() => setActiveAction("view"), 800);
        } catch {
            setMessage({ type: "error", text: "Failed to update user" });
        } finally {
            setSaving(false);
        }
    }

    async function handleSetPassword() {
        if (!userId || newPassword.length < 6) {
            setMessage({ type: "error", text: "Password must be at least 6 characters" });
            return;
        }
        setSaving(true);
        setMessage(null);
        try {
            await api.setUserPassword(userId, newPassword);
            setMessage({ type: "success", text: "Password updated" });
            setNewPassword("");
            setTimeout(() => setActiveAction("view"), 800);
        } catch {
            setMessage({ type: "error", text: "Failed to set password" });
        } finally {
            setSaving(false);
        }
    }

    async function handleBlockToggle() {
        if (!userId || !user) return;
        setSaving(true);
        setMessage(null);
        try {
            const shouldBlock = user.is_active;
            await api.blockUser(userId, shouldBlock);
            setMessage({ type: "success", text: shouldBlock ? "User blocked" : "User unblocked" });
            await loadUser(userId);
            onUserUpdated();
        } catch {
            setMessage({ type: "error", text: "Failed to update user status" });
        } finally {
            setSaving(false);
        }
    }

    async function handleSendEmail() {
        if (!userId || !emailSubject.trim() || !emailBody.trim()) {
            setMessage({ type: "error", text: "Subject and message are required" });
            return;
        }
        setSaving(true);
        setMessage(null);
        try {
            await api.sendUserEmail(userId, emailSubject, emailBody);
            setMessage({ type: "success", text: "Email sent successfully" });
            setEmailSubject("");
            setEmailBody("");
            setTimeout(() => setActiveAction("view"), 800);
        } catch {
            setMessage({ type: "error", text: "Failed to send email" });
        } finally {
            setSaving(false);
        }
    }

    const actionTabs = [
        { key: "view" as const, label: "Profile", icon: Eye },
        { key: "edit" as const, label: "Edit", icon: Pencil },
        { key: "password" as const, label: "Password", icon: KeyRound },
        { key: "email" as const, label: "Email", icon: Mail },
    ];

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-[1.6rem] border-[#0b1d15]/10 bg-[#f4f1ea] p-0">
                <DialogHeader className="border-b border-[#0b1d15]/8 px-6 pb-4 pt-6">
                    <DialogTitle className="text-xl text-[#0b1d15]">
                        {loading ? "Loading..." : user?.full_name || user?.email || "User Details"}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-[#0b1d15]/55">
                        Manage profile, credentials, and communication
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="space-y-4 p-6">
                        <Skeleton className="h-8 w-48 rounded-xl" />
                        <Skeleton className="h-32 w-full rounded-2xl" />
                    </div>
                ) : user ? (
                    <div className="space-y-5 p-6">
                        {/* Status badges */}
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className={user.is_active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}>
                                {user.is_active ? "Active" : "Blocked"}
                            </Badge>
                            <Badge variant="outline" className={user.is_verified ? "border-blue-200 bg-blue-50 text-blue-700" : "border-yellow-200 bg-yellow-50 text-yellow-700"}>
                                {user.is_verified ? "Verified" : "Unverified"}
                            </Badge>
                            {user.is_onboarding_completed && (
                                <Badge variant="outline" className="border-purple-200 bg-purple-50 text-purple-700">
                                    Onboarded
                                </Badge>
                            )}
                        </div>

                        {/* Quick stats */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-2xl border border-[#0b1d15]/8 bg-white/80 p-4">
                                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#0b1d15]/50">
                                    <Package className="h-3.5 w-3.5" /> Orders
                                </div>
                                <div className="mt-1 text-2xl font-semibold text-[#0b1d15]">{user.orders_count}</div>
                            </div>
                            <div className="rounded-2xl border border-[#0b1d15]/8 bg-white/80 p-4">
                                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#0b1d15]/50">
                                    <IndianRupee className="h-3.5 w-3.5" /> Spent
                                </div>
                                <div className="mt-1 text-2xl font-semibold text-[#0b1d15]">{formatCurrency(user.total_spent)}</div>
                            </div>
                        </div>

                        {/* Action tabs */}
                        <div className="flex gap-1.5 rounded-2xl border border-[#0b1d15]/8 bg-white/60 p-1.5">
                            {actionTabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeAction === tab.key;
                                return (
                                    <button
                                        key={tab.key}
                                        onClick={() => { setActiveAction(tab.key); setMessage(null); }}
                                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${isActive
                                            ? "bg-[#0b1d15] text-[#f4f1ea] shadow-md"
                                            : "text-[#0b1d15]/60 hover:bg-[#0b1d15]/5 hover:text-[#0b1d15]"
                                            }`}
                                    >
                                        <Icon className="h-3.5 w-3.5" />
                                        <span className="hidden sm:inline">{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Message banner */}
                        {message && (
                            <div className={`rounded-xl px-4 py-3 text-sm font-medium ${message.type === "success"
                                ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border border-red-200 bg-red-50 text-red-700"
                                }`}>
                                {message.text}
                            </div>
                        )}

                        {/* View tab */}
                        {activeAction === "view" && (
                            <div className="space-y-4 rounded-2xl border border-[#0b1d15]/8 bg-white/80 p-5">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <InfoRow label="Full Name" value={user.full_name} />
                                    <InfoRow label="Email" value={user.email} />
                                    <InfoRow label="Phone" value={user.phone_number} />
                                    <InfoRow label="Joined" value={formatDate(user.created_at)} />
                                </div>
                                {(user.address_line1 || user.city) && (
                                    <>
                                        <div className="border-t border-[#0b1d15]/8 pt-4">
                                            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#0b1d15]/50">
                                                <MapPin className="h-3.5 w-3.5" /> Address
                                            </div>
                                            <div className="text-sm text-[#0b1d15]/80 leading-relaxed">
                                                {[user.address_line1, user.address_line2, user.city, user.state, user.postal_code, user.country].filter(Boolean).join(", ")}
                                            </div>
                                        </div>
                                    </>
                                )}
                                <div className="flex gap-2 border-t border-[#0b1d15]/8 pt-4">
                                    <Button
                                        variant="outline"
                                        className={`gap-2 rounded-xl text-sm ${user.is_active
                                            ? "border-red-200 text-red-600 hover:bg-red-50"
                                            : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                                            }`}
                                        onClick={handleBlockToggle}
                                        disabled={saving}
                                    >
                                        {user.is_active ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                                        {user.is_active ? "Block User" : "Unblock User"}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Edit tab */}
                        {activeAction === "edit" && (
                            <div className="space-y-4 rounded-2xl border border-[#0b1d15]/8 bg-white/80 p-5">
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <EditField label="Full Name" value={editForm.full_name || ""} onChange={(v) => setEditForm({ ...editForm, full_name: v })} />
                                    <EditField label="Email" value={editForm.email || ""} onChange={(v) => setEditForm({ ...editForm, email: v })} type="email" />
                                    <EditField label="Phone" value={editForm.phone_number || ""} onChange={(v) => setEditForm({ ...editForm, phone_number: v })} />
                                    <EditField label="Address Line 1" value={editForm.address_line1 || ""} onChange={(v) => setEditForm({ ...editForm, address_line1: v })} />
                                    <EditField label="Address Line 2" value={editForm.address_line2 || ""} onChange={(v) => setEditForm({ ...editForm, address_line2: v })} />
                                    <EditField label="City" value={editForm.city || ""} onChange={(v) => setEditForm({ ...editForm, city: v })} />
                                    <EditField label="State" value={editForm.state || ""} onChange={(v) => setEditForm({ ...editForm, state: v })} />
                                    <EditField label="Postal Code" value={editForm.postal_code || ""} onChange={(v) => setEditForm({ ...editForm, postal_code: v })} />
                                    <EditField label="Country" value={editForm.country || ""} onChange={(v) => setEditForm({ ...editForm, country: v })} />
                                </div>
                                <Button
                                    className="gap-2 rounded-xl bg-[#0b1d15] text-[#f4f1ea] hover:bg-[#0b1d15]/90"
                                    onClick={handleSaveEdit}
                                    disabled={saving}
                                >
                                    <Save className="h-4 w-4" />
                                    {saving ? "Saving..." : "Save Changes"}
                                </Button>
                            </div>
                        )}

                        {/* Password tab */}
                        {activeAction === "password" && (
                            <div className="space-y-4 rounded-2xl border border-[#0b1d15]/8 bg-white/80 p-5">
                                <p className="text-sm text-[#0b1d15]/60">Set a new password for this user. They will be able to log in with this password immediately.</p>
                                <Input
                                    type="password"
                                    placeholder="New password (min 6 characters)"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="rounded-xl border-[#0b1d15]/15 bg-[#f4f1ea] py-3"
                                />
                                <Button
                                    className="gap-2 rounded-xl bg-[#0b1d15] text-[#f4f1ea] hover:bg-[#0b1d15]/90"
                                    onClick={handleSetPassword}
                                    disabled={saving || newPassword.length < 6}
                                >
                                    <Lock className="h-4 w-4" />
                                    {saving ? "Setting..." : "Set Password"}
                                </Button>
                            </div>
                        )}

                        {/* Email tab */}
                        {activeAction === "email" && (
                            <div className="space-y-4 rounded-2xl border border-[#0b1d15]/8 bg-white/80 p-5">
                                <p className="text-sm text-[#0b1d15]/60">Send a custom email to <strong>{user.full_name || user.email}</strong> using the Captain Insecticide branded template.</p>
                                <Input
                                    placeholder="Subject"
                                    value={emailSubject}
                                    onChange={(e) => setEmailSubject(e.target.value)}
                                    className="rounded-xl border-[#0b1d15]/15 bg-[#f4f1ea] py-3"
                                />
                                <Textarea
                                    placeholder="Write your message..."
                                    value={emailBody}
                                    onChange={(e) => setEmailBody(e.target.value)}
                                    rows={5}
                                    className="rounded-xl border-[#0b1d15]/15 bg-[#f4f1ea]"
                                />
                                <Button
                                    className="gap-2 rounded-xl bg-[#0b1d15] text-[#f4f1ea] hover:bg-[#0b1d15]/90"
                                    onClick={handleSendEmail}
                                    disabled={saving || !emailSubject.trim() || !emailBody.trim()}
                                >
                                    <Send className="h-4 w-4" />
                                    {saving ? "Sending..." : "Send Email"}
                                </Button>
                            </div>
                        )}
                    </div>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
    return (
        <div>
            <div className="text-xs font-medium uppercase tracking-wider text-[#0b1d15]/50">{label}</div>
            <div className="mt-0.5 text-sm font-medium text-[#0b1d15]">{value || "—"}</div>
        </div>
    );
}

function EditField({ label, value, onChange, type = "text" }: {
    label: string; value: string; onChange: (v: string) => void; type?: string;
}) {
    return (
        <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-[#0b1d15]/50">{label}</label>
            <Input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="rounded-xl border-[#0b1d15]/15 bg-[#f4f1ea] py-2.5"
            />
        </div>
    );
}

// ─── Main Page ───

export default function UsersPage() {
    const [users, setUsers] = useState<UserListItem[]>([]);
    const [stats, setStats] = useState<UserStats | null>(null);
    const [activeFilter, setActiveFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        try {
            const status = activeFilter === "all" ? undefined : activeFilter;
            const data = await api.getUsers(search || undefined, status);
            setUsers(data);
        } catch (error) {
            console.error("Failed to load users:", error);
        } finally {
            setLoading(false);
        }
    }, [activeFilter, search]);

    const loadStats = useCallback(async () => {
        try {
            const data = await api.getUserStats();
            setStats(data);
        } catch (error) {
            console.error("Failed to load stats:", error);
        }
    }, []);

    useEffect(() => {
        loadUsers();
        loadStats();
    }, [loadUsers, loadStats]);

    function openUser(userId: string) {
        setSelectedUserId(userId);
        setDialogOpen(true);
    }

    return (
        <div className="space-y-6">
            <ManagementPageHero
                eyebrow="Users"
                title="Customer accounts"
                description="View customer profiles, manage credentials, block accounts, and communicate directly via email."
            >
                {stats ? (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <ManagementMetricCard
                            label="Total customers"
                            value={stats.total_users}
                            meta="All registered accounts"
                            icon={Users}
                            tint="blue"
                        />
                        <ManagementMetricCard
                            label="Active users"
                            value={stats.active_users}
                            meta="Currently unblocked"
                            icon={UserCheck}
                            tint="emerald"
                        />
                        <ManagementMetricCard
                            label="Verified"
                            value={stats.verified_users}
                            meta="Email confirmed"
                            icon={ShieldCheck}
                            tint="amber"
                        />
                        <ManagementMetricCard
                            label="New this month"
                            value={stats.new_users_this_month}
                            meta="Joined recently"
                            icon={TrendingUp}
                            tint="terracotta"
                        />
                    </div>
                ) : null}
            </ManagementPageHero>

            <ManagementSectionCard
                title="Customer directory"
                description="Search, filter, and open any customer to view full profile or take actions."
                action={
                    <div className="rounded-full border border-[#0b1d15]/10 bg-[#f4f1ea] px-3 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-[#0b1d15]/55">
                        {loading ? "Refreshing" : `${users.length} visible`}
                    </div>
                }
            >
                <div className="space-y-5">
                    {/* Search bar */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0b1d15]/40" />
                        <Input
                            placeholder="Search by name, email, or phone..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="rounded-2xl border-[#0b1d15]/12 bg-[#f4f1ea] py-3 pl-11 pr-4 shadow-none transition-all focus:bg-white"
                        />
                    </div>

                    {/* Filters — mobile: pill wrap; desktop: tab strip */}
                    <div className="md:hidden">
                        <div className="flex flex-wrap gap-2">
                            {STATUS_FILTERS.map((filter) => {
                                const isActive = activeFilter === filter.value;
                                return (
                                    <button
                                        key={filter.value}
                                        onClick={() => setActiveFilter(filter.value)}
                                        className={`rounded-full px-3.5 py-2 text-[13px] font-semibold transition-all ${isActive
                                            ? "bg-[#0b1d15] text-[#f4f1ea] shadow-md"
                                            : "border border-[#0b1d15]/20 bg-white text-[#0b1d15]/80 shadow-sm active:bg-[#0b1d15]/8"
                                            }`}
                                    >
                                        {filter.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="hidden md:block">
                        <div className="flex gap-1.5 rounded-2xl border border-[#0b1d15]/8 bg-[#f4f1ea] p-1.5">
                            {STATUS_FILTERS.map((filter) => {
                                const isActive = activeFilter === filter.value;
                                return (
                                    <button
                                        key={filter.value}
                                        onClick={() => setActiveFilter(filter.value)}
                                        className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${isActive
                                            ? "bg-[#0b1d15] text-[#f4f1ea] shadow-md"
                                            : "text-[#0b1d15]/65 hover:bg-white/60 hover:text-[#0b1d15]"
                                            }`}
                                    >
                                        {filter.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* User list */}
                    <div className="space-y-3">
                        {loading ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                            ))
                        ) : users.length === 0 ? (
                            <Card className="border-dashed border-[#0b1d15]/15 bg-[#f8f4ec] p-10 text-center">
                                <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                                    <div className="rounded-2xl bg-[#0b1d15]/6 p-3 text-[#0b1d15]">
                                        <Users className="h-5 w-5" />
                                    </div>
                                    <div className="text-lg font-medium text-[#0b1d15]">No users found</div>
                                    <div className="text-sm text-[#0b1d15]/58">Try adjusting your search or filter criteria.</div>
                                </div>
                            </Card>
                        ) : (
                            users.map((user) => (
                                <button
                                    key={user.id}
                                    onClick={() => openUser(user.id)}
                                    className="block w-full text-left"
                                >
                                    <Card className="group overflow-hidden rounded-[1.4rem] border-[#0b1d15]/10 bg-white/90 p-0 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#0b1d15]/18 hover:shadow-[0_18px_50px_rgba(11,29,21,0.08)]">
                                        <div className="flex items-center gap-4 p-4 sm:p-5">
                                            {/* Avatar */}
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0b1d15] text-base font-semibold text-[#f4f1ea]">
                                                {(user.full_name || user.email).charAt(0).toUpperCase()}
                                            </div>

                                            {/* Info */}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="truncate text-base font-semibold text-[#0b1d15]">
                                                        {user.full_name || "Unnamed"}
                                                    </span>
                                                    <Badge variant="outline" className={user.is_active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}>
                                                        {user.is_active ? "Active" : "Blocked"}
                                                    </Badge>
                                                    {user.is_verified && (
                                                        <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                                                            Verified
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#0b1d15]/55">
                                                    <span className="flex items-center gap-1">
                                                        <Mail className="h-3.5 w-3.5" />
                                                        <span className="truncate">{user.email}</span>
                                                    </span>
                                                    {user.phone_number && (
                                                        <span className="flex items-center gap-1">
                                                            <Phone className="h-3.5 w-3.5" />
                                                            {user.phone_number}
                                                        </span>
                                                    )}
                                                    {user.city && (
                                                        <span className="flex items-center gap-1">
                                                            <MapPin className="h-3.5 w-3.5" />
                                                            {user.city}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Right stats */}
                                            <div className="hidden shrink-0 text-right sm:block">
                                                <div className="text-lg font-semibold text-[#0b1d15]">{user.orders_count}</div>
                                                <div className="text-xs text-[#0b1d15]/50">orders</div>
                                                <div className="mt-1 text-sm font-medium text-emerald-600">{formatCurrency(user.total_spent)}</div>
                                            </div>
                                        </div>
                                    </Card>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </ManagementSectionCard>

            <UserDetailDialog
                userId={selectedUserId}
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onUserUpdated={() => { loadUsers(); loadStats(); }}
            />
        </div>
    );
}
