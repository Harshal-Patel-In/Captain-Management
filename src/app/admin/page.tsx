"use client";

import { useState } from "react";
import useSWR from "swr";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { Header } from "@/components/layout/Header";
import { PageTransition } from "@/components/layout/PageTransition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { LowStockMonthlySummaryResponse } from "@/lib/types";
import { formatDateDDMMYYYY, formatQuantity } from "@/lib/utils";
import { Package, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// SWR fetcher function
const dashboardFetcher = () => api.getDashboardStats(5);
const healthFetcher = () => api.getHealth();

export default function DashboardPage() {
    const [lowStockDialogOpen, setLowStockDialogOpen] = useState(false);
    const [lowStockLoading, setLowStockLoading] = useState(false);
    const [lowStockError, setLowStockError] = useState<string | null>(null);
    const [lowStockSummary, setLowStockSummary] = useState<LowStockMonthlySummaryResponse | null>(null);

    // Use SWR for automatic caching and revalidation
    const { data: stats, isLoading } = useSWR('/dashboard/stats', dashboardFetcher, {
        revalidateOnFocus: false, // Don't refetch when window regains focus
        dedupingInterval: 30000, // Dedupe requests within 30 seconds
    });

    const { data: health } = useSWR('/health', healthFetcher, {
        revalidateOnFocus: true,
        dedupingInterval: 10000,
    });

    const backendConnected = Boolean(health);
    const databaseOperational = health?.database === "connected";

    const handleOpenLowStockDialog = async () => {
        setLowStockDialogOpen(true);
        setLowStockLoading(true);
        setLowStockError(null);
        try {
            const data = await api.getLowStockMonthlySummary(5);
            setLowStockSummary(data);
        } catch (err) {
            console.error("Failed to load low-stock monthly summary:", err);
            setLowStockError("Failed to load low stock movement.");
        } finally {
            setLowStockLoading(false);
        }
    };

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-[#f4f1ea]">
                <Header />
                <main className="container mx-auto px-3 py-6 sm:px-4 sm:py-8">
                    <PageTransition>
                        <div className="mb-6 sm:mb-8">
                            <h2 className="text-2xl font-semibold text-[#0b1d15] mb-2 sm:text-3xl">Dashboard</h2>
                            <p className="text-gray-600">Overview of your inventory system</p>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                                    <Package className="h-4 w-4 text-gray-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {isLoading ? <Skeleton className="h-8 w-20" /> : stats?.total_products || 0}
                                    </div>
                                    <p className="text-xs text-gray-600 mt-1">Registered in system</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
                                    <TrendingUp className="h-4 w-4 text-green-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {isLoading ? <Skeleton className="h-8 w-20" /> : stats?.total_inventory || 0}
                                    </div>
                                    <p className="text-xs text-gray-600 mt-1">Items in inventory</p>
                                </CardContent>
                            </Card>

                            <button type="button" onClick={handleOpenLowStockDialog} className="text-left">
                                <Card className="transition-shadow hover:shadow-md">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-orange-600">
                                            {isLoading ? <Skeleton className="h-8 w-20" /> : stats?.low_stock_count || 0}
                                        </div>
                                        <p className="text-xs text-gray-600 mt-1">Below threshold (5), tap to view month movement</p>
                                    </CardContent>
                                </Card>
                            </button>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Active Products</CardTitle>
                                    <TrendingDown className="h-4 w-4 text-blue-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {isLoading ? <Skeleton className="h-8 w-20" /> : stats?.active_products || 0}
                                    </div>
                                    <p className="text-xs text-gray-600 mt-1">With stock movements</p>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="mt-8 grid gap-6 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Quick Actions</CardTitle>
                                    <CardDescription>Common tasks</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <a href="/admin/qr-scan" className="block p-4 border rounded-lg hover:bg-gray-50 transition">
                                        <div className="font-medium">Scan QR Code</div>
                                        <div className="text-sm text-gray-600">Stock in or stock out items</div>
                                    </a>
                                    <a href="/admin/products" className="block p-4 border rounded-lg hover:bg-gray-50 transition">
                                        <div className="font-medium">Manage Products</div>
                                        <div className="text-sm text-gray-600">Add or view products</div>
                                    </a>
                                    <a href="/admin/analytics" className="block p-4 border rounded-lg hover:bg-gray-50 transition">
                                        <div className="font-medium">View Analytics</div>
                                        <div className="text-sm text-gray-600">Stock trends and insights</div>
                                    </a>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>System Status</CardTitle>
                                    <CardDescription>Current system health</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">Backend API</span>
                                        <span className={`text-sm font-medium ${backendConnected ? "text-green-600" : "text-red-600"}`}>
                                            {backendConnected ? "Connected" : "Disconnected"}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">Database</span>
                                        <span className={`text-sm font-medium ${databaseOperational ? "text-green-600" : "text-red-600"}`}>
                                            {databaseOperational ? "Operational" : "Unavailable"}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">Session</span>
                                        <span className="text-sm font-medium text-green-600">Active</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <Dialog open={lowStockDialogOpen} onOpenChange={setLowStockDialogOpen}>
                            <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden">
                                <DialogHeader>
                                    <DialogTitle>All Low Stock Products</DialogTitle>
                                    <DialogDescription>
                                        Showing all currently low-stock products. Stock In/Out/Net values are for {lowStockSummary
                                            ? `${formatDateDDMMYYYY(lowStockSummary.period_start)} to ${formatDateDDMMYYYY(lowStockSummary.period_end)}`
                                            : "the current calendar month"}.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
                                    {lowStockLoading && <p className="text-sm text-gray-600">Loading...</p>}
                                    {lowStockError && <p className="text-sm text-red-600">{lowStockError}</p>}
                                    {!lowStockLoading && !lowStockError && lowStockSummary && (
                                        <p className="text-xs text-gray-500">Total low-stock products: {lowStockSummary.items.length}</p>
                                    )}
                                    {!lowStockLoading && !lowStockError && lowStockSummary?.items.length === 0 && (
                                        <p className="text-sm text-gray-600">No low stock products found.</p>
                                    )}
                                    {lowStockSummary?.items.map((item) => (
                                        <div key={item.product_id} className="rounded-xl border border-[#0b1d15]/14 bg-white/95 p-3 shadow-[0_12px_28px_-20px_rgba(11,29,21,0.45)]">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-medium text-[#0b1d15]">{item.product_name}</p>
                                                    <p className="text-xs text-gray-500">{item.category || "Uncategorized"}</p>
                                                </div>
                                                <p className="text-sm font-semibold">
                                                    {formatQuantity(item.quantity)} {item.unit_label}
                                                </p>
                                            </div>
                                            <div className="mt-2 grid grid-cols-3 gap-2 text-xs sm:text-sm">
                                                <div className="rounded-md bg-green-50 p-2 text-green-700">
                                                    In: +{formatQuantity(item.stock_in)}
                                                </div>
                                                <div className="rounded-md bg-red-50 p-2 text-red-700">
                                                    Out: -{formatQuantity(item.stock_out)}
                                                </div>
                                                <div className={`rounded-md p-2 ${item.net_change >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                                                    Net: {item.net_change >= 0 ? "+" : ""}{formatQuantity(item.net_change)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </DialogContent>
                        </Dialog>
                    </PageTransition>
                </main>
            </div>
        </ProtectedRoute>
    );
}
