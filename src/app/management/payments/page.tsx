"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { ManagementMetricCard, ManagementPageHero, ManagementSectionCard } from "@/components/management/page-chrome";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BanknoteArrowDown, CircleDollarSign, Landmark, WalletCards } from "lucide-react";

interface Payment {
    id: string;
    order_id: string;
    customer_name: string | null;
    customer_email: string | null;
    amount_paid: number;
    payment_method: string;
    created_at: string;
}

interface PaymentStats {
    today_payments: number;
    total_payments: number;
    payment_count: number;
    by_method: Record<string, number>;
}

const METHOD_COLORS: Record<string, string> = {
    cash: "bg-green-100 text-green-700 border-green-200",
    upi: "bg-purple-100 text-purple-700 border-purple-200",
    bank: "bg-blue-100 text-blue-700 border-blue-200",
    other: "bg-gray-100 text-gray-700 border-gray-200",
};

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 0,
    }).format(amount);
}

function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function PaymentsPage() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [stats, setStats] = useState<PaymentStats | null>(null);
    const [methodFilter, setMethodFilter] = useState<string>("all");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPayments();
        loadStats();
    }, [methodFilter]);

    async function loadPayments() {
        setLoading(true);
        try {
            const method = methodFilter === "all" ? undefined : methodFilter;
            const data = await api.getPayments(undefined, method);
            setPayments(data);
        } catch (error) {
            console.error("Failed to load payments:", error);
        } finally {
            setLoading(false);
        }
    }

    async function loadStats() {
        try {
            const data = await api.getPaymentStats();
            setStats(data);
        } catch (error) {
            console.error("Failed to load stats:", error);
        }
    }

    return (
        <div className="space-y-6">
            <ManagementPageHero
                eyebrow="Payments"
                title="Receivables and payment flow"
                description="Track recorded collections, inspect method mix, and jump straight from receipts to the related order for follow-up."
            >
                {stats ? (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <ManagementMetricCard label="Collected today" value={formatCurrency(stats.today_payments)} meta="Same-day intake" icon={BanknoteArrowDown} tint="emerald" />
                        <ManagementMetricCard label="Total collected" value={formatCurrency(stats.total_payments)} meta="All recorded receipts" icon={CircleDollarSign} tint="blue" />
                        <ManagementMetricCard label="Transactions" value={stats.payment_count} meta="Logged payment events" icon={WalletCards} tint="amber" />
                        <ManagementMetricCard label="Primary methods" value={Object.keys(stats.by_method).length} meta="Distinct channels used" icon={Landmark} tint="terracotta" />
                    </div>
                ) : null}
            </ManagementPageHero>

            <ManagementSectionCard
                title="Payment ledger"
                description="Filter the ledger by collection method and follow each receipt back to its order context."
                action={
                    <Select value={methodFilter} onValueChange={setMethodFilter}>
                        <SelectTrigger className="w-52 rounded-xl border-[#0b1d15]/10 bg-[#f8f4ec]">
                            <SelectValue placeholder="Filter by method" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Methods</SelectItem>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="upi">UPI</SelectItem>
                            <SelectItem value="bank">Bank Transfer</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                }
            >
                <div className="space-y-5">
                    {stats ? (
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(stats.by_method).map(([method, amount]) => (
                                <Badge key={method} variant="outline" className={METHOD_COLORS[method] || ""}>
                                    {method}: {formatCurrency(amount)}
                                </Badge>
                            ))}
                        </div>
                    ) : null}

                    {loading ? (
                        <div className="space-y-4">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-18 w-full rounded-2xl" />
                            ))}
                        </div>
                    ) : payments.length === 0 ? (
                        <Card className="border-dashed border-[#0b1d15]/15 bg-[#f8f4ec] p-10 text-center text-[#0b1d15]/58">
                            No payments found for the selected filter.
                        </Card>
                    ) : (
                        <>
                            {/* Mobile: Card layout */}
                            <div className="space-y-3 md:hidden">
                                {payments.map((payment) => (
                                    <div key={payment.id} className="rounded-xl border border-[#0b1d15]/10 bg-[#fbf7ef] p-4 space-y-2">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="font-medium text-[#0b1d15]">{payment.customer_name || "Unknown"}</div>
                                                {payment.customer_email && <div className="text-sm text-[#0b1d15]/54">{payment.customer_email}</div>}
                                            </div>
                                            <div className="text-lg font-semibold text-emerald-600">{formatCurrency(payment.amount_paid)}</div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 text-sm">
                                            <Badge variant="outline" className={METHOD_COLORS[payment.payment_method] || ""}>
                                                {payment.payment_method}
                                            </Badge>
                                            <Link href={`/management/orders/${payment.order_id}`} className="font-mono text-[#0b1d15] underline-offset-4 hover:underline">
                                                {payment.order_id.slice(0, 8)}...
                                            </Link>
                                        </div>
                                        <div className="text-xs text-[#0b1d15]/50">{formatDateTime(payment.created_at)}</div>
                                    </div>
                                ))}
                            </div>
                            {/* Desktop: Table layout */}
                        <div className="hidden md:block overflow-hidden rounded-[1.5rem] border border-[#0b1d15]/10 bg-white/80">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-[#f8f4ec] hover:bg-[#f8f4ec]">
                                        <TableHead>Date & Time</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Order</TableHead>
                                        <TableHead>Method</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payments.map((payment) => (
                                        <TableRow key={payment.id} className="hover:bg-[#fbf7ef]">
                                            <TableCell className="text-[#0b1d15]/56">{formatDateTime(payment.created_at)}</TableCell>
                                            <TableCell>
                                                <div className="font-medium text-[#0b1d15]">{payment.customer_name || "Unknown"}</div>
                                                {payment.customer_email && <div className="text-sm text-[#0b1d15]/54">{payment.customer_email}</div>}
                                            </TableCell>
                                            <TableCell>
                                                <Link href={`/management/orders/${payment.order_id}`} className="font-mono text-sm text-[#0b1d15] underline-offset-4 hover:underline">
                                                    {payment.order_id.slice(0, 8)}...
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={METHOD_COLORS[payment.payment_method] || ""}>
                                                    {payment.payment_method}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right text-lg font-semibold text-emerald-600">
                                                {formatCurrency(payment.amount_paid)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        </>
                    )}
                </div>
            </ManagementSectionCard>
        </div>
    );
}
