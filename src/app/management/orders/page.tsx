"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { ManagementMetricCard, ManagementPageHero, ManagementSectionCard } from "@/components/management/page-chrome";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateDDMMYYYY } from "@/lib/utils";
import { ArrowUpRight, CircleDollarSign, ClipboardList, Clock3, PackageCheck, Wallet } from "lucide-react";

interface Order {
    id: string;
    user_id: string;
    customer_name: string | null;
    status: string;
    payment_status: string;
    total_amount: number;
    amount_paid: number;
    remaining_amount: number;
    created_at: string;
}

interface OrderStats {
    pending_count: number;
    approved_count: number;
    partially_delivered_count: number;
    fully_delivered_count: number;
    rejected_count: number;
    total_revenue: number;
    outstanding_payments: number;
}

const STATUS_TABS = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "partially_delivered", label: "Partial" },
    { value: "fully_delivered", label: "Delivered" },
    { value: "rejected", label: "Rejected" },
    { value: "cancelled", label: "Cancelled" },
];

const STATUS_COLORS: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
    approved: "bg-blue-100 text-blue-700 border-blue-200",
    partially_delivered: "bg-orange-100 text-orange-700 border-orange-200",
    fully_delivered: "bg-emerald-100 text-emerald-700 border-emerald-200",
    rejected: "bg-red-100 text-red-700 border-red-200",
    cancelled: "bg-gray-100 text-gray-700 border-gray-200",
};

const PAYMENT_COLORS: Record<string, string> = {
    unpaid: "bg-red-100 text-red-700 border-red-200",
    partial: "bg-yellow-100 text-yellow-700 border-yellow-200",
    paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 0,
    }).format(amount);
}

function formatDate(dateString: string) {
    return formatDateDDMMYYYY(dateString);

}

function formatStatus(status: string) {
    return status
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [stats, setStats] = useState<OrderStats | null>(null);
    const [activeTab, setActiveTab] = useState("all");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadOrders();
        loadStats();
    }, [activeTab]);

    async function loadOrders() {
        setLoading(true);
        try {
            const status = activeTab === "all" ? undefined : activeTab;
            const data = await api.getOrders(status);
            setOrders(data);
        } catch (error) {
            console.error("Failed to load orders:", error);
        } finally {
            setLoading(false);
        }
    }

    async function loadStats() {
        try {
            const data = await api.getOrderStats();
            setStats(data);
        } catch (error) {
            console.error("Failed to load stats:", error);
        }
    }

    return (
        <div className="space-y-6">
            <ManagementPageHero
                eyebrow="Orders"
                title="Operational order desk"
                description="Approve new orders, keep delivery queues moving, and watch receivables without leaving the management surface."
            >
                {stats ? (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <ManagementMetricCard
                            label="Collected revenue"
                            value={formatCurrency(stats.total_revenue)}
                            meta="Confirmed payments recorded"
                            icon={CircleDollarSign}
                            tint="emerald"
                        />
                        <ManagementMetricCard
                            label="Outstanding due"
                            value={formatCurrency(stats.outstanding_payments)}
                            meta="Pending receivables across approved orders"
                            icon={Wallet}
                            tint="terracotta"
                        />
                        <ManagementMetricCard
                            label="Pending approvals"
                            value={stats.pending_count}
                            meta="Orders waiting for action"
                            icon={Clock3}
                            tint="amber"
                        />
                        <ManagementMetricCard
                            label="Delivered orders"
                            value={stats.fully_delivered_count}
                            meta="Completed dispatches"
                            icon={PackageCheck}
                            tint="blue"
                        />
                    </div>
                ) : null}
            </ManagementPageHero>

            <ManagementSectionCard
                title="Order pipeline"
                description="Filter by lifecycle stage and open any order to approve, reject, deliver, or record payment."
                action={
                    <div className="rounded-full border border-[#0b1d15]/10 bg-[#f4f1ea] px-3 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-[#0b1d15]/55">
                        {loading ? "Refreshing" : `${orders.length} visible`}
                    </div>
                }
            >
                <div className="space-y-6">
                    {/* Mobile: wrapped pill grid — all filters visible without scrolling */}
                    <div className="md:hidden">
                        <div className="flex flex-wrap gap-2">
                            {STATUS_TABS.map((tab) => {
                                const isActive = activeTab === tab.value;
                                const count = stats && tab.value !== "all"
                                    ? (stats[`${tab.value}_count` as keyof OrderStats] || 0)
                                    : null;
                                return (
                                    <button
                                        key={tab.value}
                                        onClick={() => setActiveTab(tab.value)}
                                        className={`rounded-full px-3.5 py-2 text-[13px] font-semibold transition-all ${
                                            isActive
                                                ? "bg-[#0b1d15] text-[#f4f1ea] shadow-md"
                                                : "bg-white text-[#0b1d15]/80 border border-[#0b1d15]/20 shadow-sm active:bg-[#0b1d15]/8"
                                        }`}
                                    >
                                        {tab.label}
                                        {count !== null && (
                                            <span className={`ml-1.5 text-xs font-bold ${isActive ? "text-[#f4f1ea]/80" : "text-[#0b1d15]/55"}`}>
                                                {String(count)}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Desktop: standard tab strip */}
                    <div className="hidden md:block">
                        <Tabs value={activeTab} onValueChange={setActiveTab}>
                            <TabsList className="h-auto rounded-2xl border border-[#0b1d15]/8 bg-[#f4f1ea] p-1.5">
                                {STATUS_TABS.map((tab) => (
                                    <TabsTrigger
                                        key={tab.value}
                                        value={tab.value}
                                        className="rounded-xl px-4 py-2.5 data-[state=active]:bg-[#0b1d15] data-[state=active]:text-[#f4f1ea] data-[state=active]:shadow-md"
                                    >
                                        {tab.label}
                                        {stats && tab.value !== "all" && (
                                            <span className="ml-2 rounded-full bg-[#0b1d15]/6 px-2 py-0.5 text-[11px] text-[#0b1d15]/60 data-[state=active]:bg-white/15 data-[state=active]:text-[#f4f1ea]/70">
                                                {stats[`${tab.value}_count` as keyof OrderStats] || 0}
                                            </span>
                                        )}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>
                    </div>

                    <div className="space-y-4">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-40 w-full rounded-[1.5rem]" />
                            ))
                        ) : orders.length === 0 ? (
                            <Card className="border-dashed border-[#0b1d15]/15 bg-[#f8f4ec] p-10 text-center">
                                <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                                    <div className="rounded-2xl bg-[#0b1d15]/6 p-3 text-[#0b1d15]">
                                        <ClipboardList className="h-5 w-5" />
                                    </div>
                                    <div className="text-lg font-medium text-[#0b1d15]">No orders found</div>
                                    <div className="text-sm text-[#0b1d15]/58">This stage is currently clear. Switch the filter to inspect another point in the pipeline.</div>
                                </div>
                            </Card>
                        ) : (
                            orders.map((order) => (
                                <Link key={order.id} href={`/management/orders/${order.id}`} className="block">
                                    <Card className="group overflow-hidden rounded-[1.6rem] border-[#0b1d15]/10 bg-white/90 p-0 transition-all duration-300 hover:-translate-y-1 hover:border-[#0b1d15]/18 hover:shadow-[0_24px_70px_rgba(11,29,21,0.1)]">
                                        <div className="grid gap-5 p-5 lg:grid-cols-[1.2fr_0.8fr] lg:p-6">
                                            <div className="space-y-4">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="rounded-full border border-[#0b1d15]/10 bg-[#f4f1ea] px-3 py-1 font-mono text-xs text-[#0b1d15]/65">
                                                        {order.id.slice(0, 8)}...
                                                    </span>
                                                    <Badge variant="outline" className={STATUS_COLORS[order.status] || ""}>
                                                        {formatStatus(order.status)}
                                                    </Badge>
                                                    <Badge variant="outline" className={PAYMENT_COLORS[order.payment_status] || ""}>
                                                        {formatStatus(order.payment_status)}
                                                    </Badge>
                                                </div>

                                                <div className="flex items-start gap-4">
                                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0b1d15] text-base font-semibold text-[#f4f1ea]">
                                                        {(order.customer_name || "U").charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="text-xl font-semibold text-[#0b1d15]">{order.customer_name || "Unknown Customer"}</div>
                                                        <div className="mt-1 text-sm text-[#0b1d15]/56">Placed on {formatDate(order.created_at)}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col justify-between rounded-[1.4rem] bg-[#f8f4ec] p-4">
                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <div className="text-[#0b1d15]/50">Order value</div>
                                                        <div className="mt-1 text-lg font-semibold text-[#0b1d15]">{formatCurrency(order.total_amount)}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[#0b1d15]/50">Received</div>
                                                        <div className="mt-1 text-lg font-semibold text-emerald-600">{formatCurrency(order.amount_paid)}</div>
                                                    </div>
                                                </div>
                                                <div className="mt-6 flex items-center justify-between border-t border-[#0b1d15]/8 pt-4">
                                                    <div>
                                                        <div className="text-sm text-[#0b1d15]/50">Balance due</div>
                                                        <div className={`mt-1 font-semibold ${order.remaining_amount > 0 ? "text-[#d15638]" : "text-emerald-600"}`}>
                                                            {formatCurrency(order.remaining_amount)}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm font-medium text-[#0b1d15]">
                                                        Open details
                                                        <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            </ManagementSectionCard>
        </div>
    );
}
