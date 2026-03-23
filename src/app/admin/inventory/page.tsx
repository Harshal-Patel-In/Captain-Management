"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { Header } from "@/components/layout/Header";
import { PageTransition } from "@/components/layout/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { InventoryItem } from "@/lib/types";
import { Download, Search } from "lucide-react";

export default function InventoryPage() {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        loadInventory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadInventory = async () => {
        try {
            const data = await api.getInventory(search);
            setInventory(data.items || []);
        } catch (err) {
            console.error("Failed to load inventory:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        window.open(api.getInventoryCSVUrl(), "_blank");
    };

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-[#f4f1ea]">
                <Header />
                <main className="container mx-auto px-3 py-6 sm:px-4 sm:py-8">
                    <PageTransition>
                        <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between sm:mb-8">
                            <div>
                                <h2 className="text-2xl font-semibold text-[#0b1d15] mb-2 sm:text-3xl">Inventory</h2>
                                <p className="text-gray-600">Current stock levels</p>
                            </div>
                            <Button onClick={handleExport} variant="outline" className="gap-2">
                                <Download className="h-4 w-4" />
                                Export CSV
                            </Button>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Stock Levels</CardTitle>
                                <div className="flex gap-2 mt-4">
                                    <Input
                                        placeholder="Search products..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="max-w-sm"
                                    />
                                    <Button onClick={loadInventory} className="gap-2">
                                        <Search className="h-4 w-4" />
                                        Search
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <p>Loading...</p>
                                ) : inventory.length === 0 ? (
                                    <p className="text-gray-600 text-center py-8">No inventory items found.</p>
                                ) : (
                                    <>
                                        {/* Mobile: Card layout */}
                                        <div className="space-y-3 md:hidden">
                                            {inventory.map((item) => (
                                                <div key={item.product_id} className="rounded-xl border bg-card p-4">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <div className="font-medium text-[#0b1d15]">{item.product_name}</div>
                                                            <div className="text-sm text-gray-500">{item.category || "Uncategorized"}</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className={`text-xl font-bold ${item.quantity < 5 ? "text-orange-600" : "text-[#0b1d15]"}`}>
                                                                {item.quantity}
                                                            </div>
                                                            <div className="text-xs text-gray-400">in stock</div>
                                                        </div>
                                                    </div>
                                                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                                                        <span className="font-mono">{item.qr_code_value}</span>
                                                        <span>{new Date(item.last_updated).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {/* Desktop: Table layout */}
                                        <div className="hidden md:block">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Product</TableHead>
                                                <TableHead>Category</TableHead>
                                                <TableHead>QR Code</TableHead>
                                                <TableHead className="text-right">Quantity</TableHead>
                                                <TableHead>Last Updated</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {inventory.map((item) => (
                                                <TableRow key={item.product_id}>
                                                    <TableCell className="font-medium">{item.product_name}</TableCell>
                                                    <TableCell>{item.category || "-"}</TableCell>
                                                    <TableCell className="font-mono text-sm">{item.qr_code_value}</TableCell>
                                                    <TableCell className="text-right font-bold">
                                                        <span className={item.quantity < 5 ? "text-orange-600" : ""}>
                                                            {item.quantity}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>{new Date(item.last_updated).toLocaleString()}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </PageTransition>
                </main>
            </div>
        </ProtectedRoute>
    );
}
