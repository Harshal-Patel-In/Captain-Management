"use client";

import useSWR from "swr";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { Header } from "@/components/layout/Header";
import { PageTransition } from "@/components/layout/PageTransition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { Package, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// SWR fetcher function
const dashboardFetcher = () => api.getDashboardStats(5);
const healthFetcher = () => api.getHealth();

export default function DashboardPage() {
    // Use SWR for automatic caching and revalidation
    const { data: stats, error, isLoading } = useSWR('/dashboard/stats', dashboardFetcher, {
        revalidateOnFocus: false, // Don't refetch when window regains focus
        dedupingInterval: 30000, // Dedupe requests within 30 seconds
    });

    const { data: health } = useSWR('/health', healthFetcher, {
        revalidateOnFocus: true,
        dedupingInterval: 10000,
    });

    const backendConnected = Boolean(health);
    const databaseOperational = health?.database === "connected";

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

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-orange-600">
                                        {isLoading ? <Skeleton className="h-8 w-20" /> : stats?.low_stock_count || 0}
                                    </div>
                                    <p className="text-xs text-gray-600 mt-1">Below threshold (5)</p>
                                </CardContent>
                            </Card>

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
                    </PageTransition>
                </main>
            </div>
        </ProtectedRoute>
    );
}
