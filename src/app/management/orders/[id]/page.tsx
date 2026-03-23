"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { ManagementMetricCard, ManagementPageHero, ManagementSectionCard } from "@/components/management/page-chrome";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, CircleDollarSign, FileText, MapPin, PackageCheck, UserRound } from "lucide-react";

interface OrderItem {
    id: string;
    product_id: string;
    product_name: string;
    quantity: number;
    delivered_quantity: number;
    remaining_quantity: number;
    unit_price: number;
    line_total: number;
}

interface Customer {
    id: string;
    full_name: string;
    email: string;
    phone_number: string;
}

interface OrderDetail {
    id: string;
    user_id: string;
    status: string;
    payment_status: string;
    total_amount: number;
    amount_paid: number;
    remaining_amount: number;
    shipping_address: any;
    created_at: string;
    updated_at: string;
    customer: Customer | null;
    items: OrderItem[];
}

interface DeliveryStatus {
    order_item_id: string;
    product_id: string;
    product_name: string;
    ordered_quantity: number;
    delivered_quantity: number;
    remaining_quantity: number;
    available_stock: number;
    is_fully_delivered: boolean;
}

const STATUS_COLORS: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
    approved: "bg-blue-100 text-blue-700 border-blue-200",
    partially_delivered: "bg-orange-100 text-orange-700 border-orange-200",
    fully_delivered: "bg-emerald-100 text-emerald-700 border-emerald-200",
    rejected: "bg-red-100 text-red-700 border-red-200",
    cancelled: "bg-gray-100 text-gray-700 border-gray-200",
};

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 0,
    }).format(amount);

}

function formatStatus(status: string) {
    return status
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Modal states
    const [showDeliverModal, setShowDeliverModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);

    // Delivery form
    const [deliveryInputs, setDeliveryInputs] = useState<Record<string, number>>({});

    // Payment form
    const [paymentAmount, setPaymentAmount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [paymentRemarks, setPaymentRemarks] = useState("");

    // Reject reason
    const [rejectReason, setRejectReason] = useState("");

    useEffect(() => {
        loadOrder();
    }, [id]);

    async function loadOrder() {
        setLoading(true);
        try {
            const data = await api.getOrderDetail(id);
            setOrder(data);

            // Load delivery status if order is approved or partially delivered
            if (["approved", "partially_delivered"].includes(data.status)) {
                const status = await api.getDeliveryStatus(id);
                setDeliveryStatus(status.items || []);
            }
        } catch (error) {
            console.error("Failed to load order:", error);
        } finally {
            setLoading(false);
        }
    }

    async function handleApprove() {
        setActionLoading(true);
        try {
            await api.approveOrder(id);
            await loadOrder();
        } catch (error) {
            console.error("Failed to approve:", error);
        } finally {
            setActionLoading(false);
        }
    }

    async function handleReject() {
        setActionLoading(true);
        try {
            await api.rejectOrder(id, rejectReason);
            setShowRejectModal(false);
            await loadOrder();
        } catch (error) {
            console.error("Failed to reject:", error);
        } finally {
            setActionLoading(false);
        }
    }

    async function handleDeliver() {
        const deliveries = Object.entries(deliveryInputs)
            .filter(([_, qty]) => qty > 0)
            .map(([itemId, qty]) => ({
                order_item_id: itemId,
                delivered_quantity: qty,
            }));

        if (deliveries.length === 0) return;

        setActionLoading(true);
        try {
            const result = await api.deliverItems(id, deliveries);
            if (result.success) {
                setShowDeliverModal(false);
                setDeliveryInputs({});
                await loadOrder();
            } else {
                alert(result.message || "Delivery failed");
            }
        } catch (error: any) {
            alert(error.message || "Delivery failed");
        } finally {
            setActionLoading(false);
        }
    }

    async function handlePayment() {
        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) return;

        setActionLoading(true);
        try {
            await api.recordPayment(id, {
                amount,
                payment_method: paymentMethod,
                remarks: paymentRemarks || undefined,
            });
            setShowPaymentModal(false);
            setPaymentAmount("");
            setPaymentRemarks("");
            await loadOrder();
        } catch (error: any) {
            alert(error.message || "Payment failed");
        } finally {
            setActionLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-48" />
                <Skeleton className="h-64" />
            </div>
        );
    }

    if (!order) {
        return <div className="text-zinc-400">Order not found</div>;
    }

    const isPending = order.status === "pending";
    const canDeliver = ["approved", "partially_delivered"].includes(order.status);
    const canPay = ["approved", "partially_delivered", "fully_delivered"].includes(order.status) && order.remaining_amount > 0;

    return (
        <div className="space-y-6">
            <ManagementPageHero
                eyebrow="Order Detail"
                title={`Order ${order.id.slice(0, 8)}...`}
                description="Inspect customer details, delivery progress, and receivables from one focused control surface."
                actions={
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => router.back()} className="rounded-xl border-[#0b1d15]/12 bg-white/75 text-[#0b1d15] hover:bg-white">
                            <ArrowLeft className="h-4 w-4" />
                            Back to Orders
                        </Button>
                        {isPending && (
                            <>
                                <Button onClick={handleApprove} disabled={actionLoading} className="rounded-xl bg-emerald-600 hover:bg-emerald-700">Approve</Button>
                                <Button onClick={() => setShowRejectModal(true)} disabled={actionLoading} variant="destructive" className="rounded-xl">Reject</Button>
                            </>
                        )}
                        {canDeliver && (
                            <Button onClick={() => setShowDeliverModal(true)} disabled={actionLoading} className="rounded-xl bg-sky-600 hover:bg-sky-700">Deliver Items</Button>
                        )}
                        {canPay && (
                            <Button onClick={() => setShowPaymentModal(true)} disabled={actionLoading} className="rounded-xl bg-[#d15638] hover:bg-[#b9482d]">Record Payment</Button>
                        )}
                        <Button
                            variant="outline"
                            className="rounded-xl border-[#0b1d15]/12 bg-white/75 text-[#0b1d15] hover:bg-white"
                            onClick={() => window.open(`/api/management/orders/${order.id}/bill`, "_blank")}
                        >
                            <FileText className="h-4 w-4" />
                            Download Bill
                        </Button>
                    </div>
                }
            >
                <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="outline" className={STATUS_COLORS[order.status]}>{formatStatus(order.status)}</Badge>
                    <Badge variant="outline" className="bg-[#f4f1ea] text-[#0b1d15] border-[#0b1d15]/10">Payment: {formatStatus(order.payment_status)}</Badge>
                </div>
            </ManagementPageHero>

            <div className="grid gap-4 md:grid-cols-3">
                <ManagementMetricCard label="Order value" value={formatCurrency(order.total_amount)} meta="Current invoice total" icon={PackageCheck} tint="blue" />
                <ManagementMetricCard label="Paid so far" value={formatCurrency(order.amount_paid)} meta="Confirmed collections" icon={CircleDollarSign} tint="emerald" />
                <ManagementMetricCard label="Remaining due" value={formatCurrency(order.remaining_amount)} meta={order.remaining_amount > 0 ? "Still awaiting payment" : "Fully settled"} icon={MapPin} tint={order.remaining_amount > 0 ? "terracotta" : "emerald"} />
            </div>

            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <ManagementSectionCard title="Customer and shipping" description="Stored buyer identity and delivery location for this order.">
                    {order.customer ? (
                        <div className="space-y-5">
                            <div className="flex items-start gap-4 rounded-[1.4rem] bg-[#f8f4ec] p-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0b1d15] text-[#f4f1ea]">
                                    <UserRound className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="text-lg font-semibold text-[#0b1d15]">{order.customer.full_name}</div>
                                    <div className="mt-1 text-sm text-[#0b1d15]/58">{order.customer.email}</div>
                                    <div className="text-sm text-[#0b1d15]/58">{order.customer.phone_number}</div>
                                </div>
                            </div>
                            <div className="grid gap-4 text-sm md:grid-cols-2">
                                <div className="rounded-2xl border border-[#0b1d15]/8 bg-white p-4">
                                    <div className="text-xs uppercase tracking-[0.16em] text-[#0b1d15]/45">Shipping city</div>
                                    <div className="mt-2 font-medium text-[#0b1d15]">{order.shipping_address?.city || "Not available"}</div>
                                </div>
                                <div className="rounded-2xl border border-[#0b1d15]/8 bg-white p-4">
                                    <div className="text-xs uppercase tracking-[0.16em] text-[#0b1d15]/45">State</div>
                                    <div className="mt-2 font-medium text-[#0b1d15]">{order.shipping_address?.state || "Not available"}</div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-[1.5rem] border border-dashed border-[#0b1d15]/12 bg-[#f8f4ec] p-8 text-center text-[#0b1d15]/58">No customer info available.</div>
                    )}
                </ManagementSectionCard>

                <ManagementSectionCard title="Payment summary" description="Live settlement status for this order.">
                    <div className="space-y-4 rounded-[1.5rem] bg-[#f8f4ec] p-5">
                        <div className="flex items-center justify-between text-sm text-[#0b1d15]/58">
                            <span>Total amount</span>
                            <span className="text-lg font-semibold text-[#0b1d15]">{formatCurrency(order.total_amount)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-[#0b1d15]/58">
                            <span>Paid amount</span>
                            <span className="text-lg font-semibold text-emerald-600">{formatCurrency(order.amount_paid)}</span>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between text-sm text-[#0b1d15]/58">
                            <span>Balance due</span>
                            <span className={`text-lg font-semibold ${order.remaining_amount > 0 ? "text-[#d15638]" : "text-emerald-600"}`}>{formatCurrency(order.remaining_amount)}</span>
                        </div>
                    </div>
                </ManagementSectionCard>
            </div>

            <ManagementSectionCard title="Order items" description="Line-level delivery status, pricing, and outstanding quantity.">
                {/* Mobile: Card layout */}
                <div className="space-y-3 md:hidden">
                    {order.items.map((item) => (
                        <div key={item.id} className="rounded-xl border border-[#0b1d15]/10 bg-[#fbf7ef] p-4 space-y-2">
                            <div className="font-medium text-[#0b1d15]">{item.product_name}</div>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                                <div>
                                    <div className="text-[#0b1d15]/50 text-xs">Ordered</div>
                                    <div className="font-medium">{item.quantity}</div>
                                </div>
                                <div>
                                    <div className="text-[#0b1d15]/50 text-xs">Delivered</div>
                                    <div className="font-medium text-emerald-600">{item.delivered_quantity}</div>
                                </div>
                                <div>
                                    <div className="text-[#0b1d15]/50 text-xs">Remaining</div>
                                    <div className="font-medium text-[#d15638]">{item.remaining_quantity}</div>
                                </div>
                            </div>
                            <div className="flex justify-between text-sm pt-1 border-t border-[#0b1d15]/8">
                                <span className="text-[#0b1d15]/56">{formatCurrency(item.unit_price)} / unit</span>
                                <span className="font-medium text-[#0b1d15]">{formatCurrency(item.line_total)}</span>
                            </div>
                        </div>
                    ))}
                </div>
                {/* Desktop: Table layout */}
                <div className="hidden md:block overflow-hidden rounded-[1.5rem] border border-[#0b1d15]/10 bg-white/80">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-[#f8f4ec] hover:bg-[#f8f4ec]">
                                <TableHead>Product</TableHead>
                                <TableHead className="text-right">Ordered</TableHead>
                                <TableHead className="text-right">Delivered</TableHead>
                                <TableHead className="text-right">Remaining</TableHead>
                                <TableHead className="text-right">Unit Price</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {order.items.map((item) => (
                                <TableRow key={item.id} className="hover:bg-[#fbf7ef]">
                                    <TableCell className="font-medium text-[#0b1d15]">{item.product_name}</TableCell>
                                    <TableCell className="text-right">{item.quantity}</TableCell>
                                    <TableCell className="text-right font-medium text-emerald-600">{item.delivered_quantity}</TableCell>
                                    <TableCell className="text-right font-medium text-[#d15638]">{item.remaining_quantity}</TableCell>
                                    <TableCell className="text-right text-[#0b1d15]/56">{formatCurrency(item.unit_price)}</TableCell>
                                    <TableCell className="text-right font-medium text-[#0b1d15]">{formatCurrency(item.line_total)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </ManagementSectionCard>

            {/* Reject Modal */}
            <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
                <DialogContent className="rounded-[1.6rem] border-[#0b1d15]/10 bg-[#fbf7ef]">
                    <DialogHeader>
                        <DialogTitle>Reject Order</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Reason (optional)</Label>
                            <Textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Enter rejection reason..."
                                className="mt-2"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRejectModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleReject} disabled={actionLoading}>
                            Reject Order
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Deliver Modal */}
            <Dialog open={showDeliverModal} onOpenChange={setShowDeliverModal}>
                <DialogContent className="max-w-2xl rounded-[1.6rem] border-[#0b1d15]/10 bg-[#fbf7ef]">
                    <DialogHeader>
                        <DialogTitle>Deliver Items</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                        {deliveryStatus.map((item) => (
                            <div key={item.order_item_id} className="p-4 border rounded-lg bg-muted/50">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="font-medium">{item.product_name}</div>
                                        <div className="text-sm text-muted-foreground">
                                            Ordered: {item.ordered_quantity} | Delivered: {item.delivered_quantity}
                                        </div>
                                    </div>
                                    {item.is_fully_delivered ? (
                                        <Badge className="bg-emerald-100 text-emerald-700">✓ Complete</Badge>
                                    ) : (
                                        <Badge className="bg-yellow-100 text-yellow-700">
                                            Remaining: {item.remaining_quantity}
                                        </Badge>
                                    )}
                                </div>
                                {!item.is_fully_delivered && (
                                    <div className="flex items-center gap-4">
                                        <div className="text-sm text-muted-foreground">
                                            Stock: {item.available_stock}
                                        </div>
                                        <div className="flex-1">
                                            <Input
                                                type="number"
                                                min="0"
                                                max={Math.min(item.remaining_quantity, item.available_stock)}
                                                placeholder="Qty to deliver"
                                                value={deliveryInputs[item.order_item_id] || ""}
                                                onChange={(e) => setDeliveryInputs(prev => ({
                                                    ...prev,
                                                    [item.order_item_id]: parseInt(e.target.value) || 0
                                                }))}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeliverModal(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleDeliver} disabled={actionLoading} className="bg-blue-600 hover:bg-blue-700">
                            Confirm Delivery
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Payment Modal */}
            <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
                <DialogContent className="rounded-[1.6rem] border-[#0b1d15]/10 bg-[#fbf7ef]">
                    <DialogHeader>
                        <DialogTitle>Record Payment</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Total Amount</span>
                                <span>{formatCurrency(order.total_amount)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Paid So Far</span>
                                <span className="text-emerald-600 font-medium">{formatCurrency(order.amount_paid)}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Remaining Due</span>
                                <span className="text-orange-600 font-bold">{formatCurrency(order.remaining_amount)}</span>
                            </div>
                        </div>

                        <div>
                            <Label>Payment Amount (₹)</Label>
                            <Input
                                type="number"
                                min="1"
                                max={order.remaining_amount}
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                placeholder="Enter amount"
                                className="mt-2"
                            />
                        </div>

                        <div>
                            <Label>Payment Method</Label>
                            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                <SelectTrigger className="mt-2">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cash">Cash</SelectItem>
                                    <SelectItem value="upi">UPI</SelectItem>
                                    <SelectItem value="bank">Bank Transfer</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Remarks (optional)</Label>
                            <Textarea
                                value={paymentRemarks}
                                onChange={(e) => setPaymentRemarks(e.target.value)}
                                placeholder="Optional note..."
                                className="mt-2"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handlePayment} disabled={actionLoading} className="bg-purple-600 hover:bg-purple-700">
                            Save Payment
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
