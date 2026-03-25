"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { Header } from "@/components/layout/Header";
import { PageTransition } from "@/components/layout/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { InventoryItem } from "@/lib/types";
import { Download, Loader2, Plus, Search } from "lucide-react";

export default function InventoryPage() {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [stockInDialogOpen, setStockInDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [stockInQuantity, setStockInQuantity] = useState<number | string>(1);
    const [stockInRemarks, setStockInRemarks] = useState("");
    const [stockInLoading, setStockInLoading] = useState(false);
    const [stockInMessage, setStockInMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

    const handleOpenStockInDialog = (item: InventoryItem) => {
        setSelectedItem(item);
        setStockInQuantity(1);
        setStockInRemarks("");
        setStockInMessage(null);
        setStockInDialogOpen(true);
    };

    const handleCloseStockInDialog = () => {
        setStockInDialogOpen(false);
        setSelectedItem(null);
        setStockInQuantity(1);
        setStockInRemarks("");
        setStockInMessage(null);
    };

    const handleManualStockIn = async () => {
        if (!selectedItem) return;

        const quantity = Number(stockInQuantity);
        if (!quantity || quantity <= 0) {
            setStockInMessage({ type: "error", text: "Please enter a valid quantity." });
            return;
        }

        if (selectedItem.unit_type === "piece" && !Number.isInteger(quantity)) {
            setStockInMessage({ type: "error", text: "This product accepts whole numbers only." });
            return;
        }

        setStockInLoading(true);
        setStockInMessage(null);
        try {
            await api.stockIn({
                qr_code_value: selectedItem.qr_code_value,
                quantity,
                remarks: stockInRemarks || undefined,
            });
            setStockInMessage({
                type: "success",
                text: `${selectedItem.product_name} stocked in by ${quantity}.`,
            });
            await loadInventory();
            setTimeout(() => {
                handleCloseStockInDialog();
            }, 800);
        } catch (err: any) {
            setStockInMessage({ type: "error", text: err.message || "Failed to stock in product." });
        } finally {
            setStockInLoading(false);
        }
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
                                                                {item.quantity} {item.unit_label}
                                                            </div>
                                                            <div className="text-xs text-gray-400">in stock</div>
                                                        </div>
                                                    </div>
                                                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                                                        <span className="font-mono">{item.qr_code_value}</span>
                                                        <span>{new Date(item.last_updated).toLocaleString()}</span>
                                                    </div>
                                                    <div className="mt-3">
                                                        <Button
                                                            size="sm"
                                                            className="w-full gap-2"
                                                            onClick={() => handleOpenStockInDialog(item)}
                                                        >
                                                            <Plus className="h-4 w-4" />
                                                            Stock In
                                                        </Button>
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
                                                <TableHead className="text-right">Actions</TableHead>
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
                                                            {item.quantity} <span className="text-sm text-gray-600">{item.unit_label}</span>
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>{new Date(item.last_updated).toLocaleString()}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            size="sm"
                                                            className="gap-2"
                                                            onClick={() => handleOpenStockInDialog(item)}
                                                        >
                                                            <Plus className="h-4 w-4" />
                                                            Stock In
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        <Dialog open={stockInDialogOpen} onOpenChange={(open) => (open ? setStockInDialogOpen(true) : handleCloseStockInDialog())}>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Manual Stock In</DialogTitle>
                                    <DialogDescription>
                                        Add stock for {selectedItem?.product_name || "selected product"}.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="stock-in-quantity">
                                            Quantity ({selectedItem?.unit_label || "unit"})
                                        </Label>
                                        <Input
                                            id="stock-in-quantity"
                                            type="number"
                                            min={selectedItem?.unit_type === "piece" ? "1" : "0.01"}
                                            step={selectedItem?.unit_type === "piece" ? "1" : "0.01"}
                                            value={stockInQuantity}
                                            onChange={(e) => setStockInQuantity(e.target.value)}
                                        />
                                        {selectedItem?.unit_type === "piece" && (
                                            <p className="mt-1 text-xs text-gray-500">Whole numbers only for piece-based products.</p>
                                        )}
                                    </div>
                                    <div>
                                        <Label htmlFor="stock-in-remarks">Remarks (Optional)</Label>
                                        <textarea
                                            id="stock-in-remarks"
                                            className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                            placeholder="Optional notes (max 500 characters)"
                                            value={stockInRemarks}
                                            onChange={(e) => setStockInRemarks(e.target.value.slice(0, 500))}
                                            maxLength={500}
                                        />
                                    </div>
                                    {stockInMessage && (
                                        <div className={`rounded-md border px-3 py-2 text-sm ${stockInMessage.type === "success" ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700"}`}>
                                            {stockInMessage.text}
                                        </div>
                                    )}
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleCloseStockInDialog}
                                            disabled={stockInLoading}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={handleManualStockIn}
                                            disabled={stockInLoading || !selectedItem}
                                            className="gap-2"
                                        >
                                            {stockInLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                            Stock In
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </PageTransition>
                </main>
            </div>
        </ProtectedRoute>
    );
}
