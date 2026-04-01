"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { Header } from "@/components/layout/Header";
import { PageTransition } from "@/components/layout/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { InventoryItem } from "@/lib/types";
import { ArrowDownCircle, ArrowUpCircle, ArrowUpDown, Download, Loader2, Search, X } from "lucide-react";

export default function InventoryPage() {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [stockInDialogOpen, setStockInDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [stockOperation, setStockOperation] = useState<"in" | "out">("in");
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

    const handleOpenStockDialog = (item: InventoryItem, operation: "in" | "out" = "in") => {
        setSelectedItem(item);
        setStockOperation(operation);
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
            const stockRequest = {
                qr_code_value: selectedItem.qr_code_value,
                quantity,
                remarks: stockInRemarks || undefined,
            };

            if (stockOperation === "in") {
                await api.stockIn(stockRequest);
            } else {
                await api.stockOut(stockRequest);
            }

            setStockInMessage({
                type: "success",
                text: `${selectedItem.product_name} stock ${stockOperation === "in" ? "in" : "out"} by ${quantity}.`,
            });
            await loadInventory();
            setTimeout(() => {
                handleCloseStockInDialog();
            }, 800);
        } catch (err: any) {
            setStockInMessage({
                type: "error",
                text: err.message || `Failed to stock ${stockOperation === "in" ? "in" : "out"} product.`,
            });
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
                                                            variant="default"
                                                            className="w-full gap-2 border border-black bg-black text-white transition-all duration-150 hover:bg-neutral-800 active:scale-[0.98]"
                                                            onClick={() => handleOpenStockDialog(item, "in")}
                                                        >
                                                            <ArrowUpDown className="h-4 w-4" />
                                                            Update
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
                                                            variant="default"
                                                            className="gap-2 border border-black bg-black text-white transition-all duration-150 hover:bg-neutral-800 active:scale-[0.98]"
                                                            onClick={() => handleOpenStockDialog(item, "in")}
                                                        >
                                                            <ArrowUpDown className="h-4 w-4" />
                                                            Update
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
                            <DialogContent showCloseButton={false} className="sm:max-w-xl overflow-hidden border border-border bg-card p-0">
                                <DialogHeader>
                                    <div className="relative border-b border-border px-6 py-4">
                                        <DialogClose className="absolute right-4 top-4 rounded-md border border-border bg-card p-1 text-foreground opacity-100 transition hover:bg-muted focus:ring-2 focus:ring-ring/60 focus:outline-hidden">
                                            <X className="h-4 w-4" />
                                            <span className="sr-only">Close</span>
                                        </DialogClose>
                                        <DialogTitle className="text-lg font-semibold text-[#0b1d15] sm:text-xl">Manual Stock Update</DialogTitle>
                                        <DialogDescription className="mt-1 text-sm text-gray-600">
                                            Choose operation and enter quantity for {selectedItem?.product_name || "selected product"}.
                                        </DialogDescription>
                                    </div>
                                </DialogHeader>
                                <div className="space-y-4 px-6 pb-6 pt-5">
                                    <div className="rounded-lg border border-border bg-muted/30 p-4">
                                        <div className="text-sm text-gray-600">Current Stock</div>
                                        <div className="mt-1 flex items-center justify-between gap-2">
                                            <div className="text-base font-semibold text-[#0b1d15]">{selectedItem?.product_name || "-"}</div>
                                            <div className="text-lg font-bold text-[#0b1d15]">
                                                {selectedItem ? `${selectedItem.quantity} ${selectedItem.unit_label}` : "-"}
                                            </div>
                                        </div>
                                        <div className="mt-2 text-xs text-gray-500">QR: {selectedItem?.qr_code_value || "-"}</div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/30 p-1.5">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setStockOperation("in")}
                                            disabled={stockInLoading}
                                            className={`h-10 gap-2 rounded-md text-sm font-medium transition-all duration-150 active:scale-[0.98] ${stockOperation === "in"
                                                ? "border-green-200 bg-green-100 text-green-900 shadow-sm ring-1 ring-green-200 hover:bg-green-200"
                                                : "border-green-100 bg-green-50/70 text-green-700 hover:bg-green-100 hover:text-green-800"
                                                }`}
                                        >
                                            <ArrowUpCircle className="h-4 w-4" />
                                            Stock In
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setStockOperation("out")}
                                            disabled={stockInLoading}
                                            className={`h-10 gap-2 rounded-md text-sm font-medium transition-all duration-150 active:scale-[0.98] ${stockOperation === "out"
                                                ? "border-red-200 bg-red-100 text-red-900 shadow-sm ring-1 ring-red-200 hover:bg-red-200"
                                                : "border-red-100 bg-red-50/70 text-red-700 hover:bg-red-100 hover:text-red-800"
                                                }`}
                                        >
                                            <ArrowDownCircle className="h-4 w-4" />
                                            Stock Out
                                        </Button>
                                    </div>

                                    <div className="space-y-2">
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
                                            className="h-11 rounded-md border-border bg-background"
                                        />
                                        {selectedItem?.unit_type === "piece" && (
                                            <p className="mt-1 text-xs text-gray-500">Whole numbers only for piece-based products.</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="stock-in-remarks">Remarks (Optional)</Label>
                                        <textarea
                                            id="stock-in-remarks"
                                            className="flex min-h-24 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                            placeholder="Optional notes (max 500 characters)"
                                            value={stockInRemarks}
                                            onChange={(e) => setStockInRemarks(e.target.value.slice(0, 500))}
                                            maxLength={500}
                                        />
                                    </div>
                                    {stockInMessage && (
                                        <div className={`rounded-md border px-3 py-2 text-sm ${stockInMessage.type === "success" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>
                                            {stockInMessage.text}
                                        </div>
                                    )}

                                    <div className="flex justify-end gap-2 pt-1">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleCloseStockInDialog}
                                            disabled={stockInLoading}
                                            className="rounded-md"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={handleManualStockIn}
                                            disabled={stockInLoading || !selectedItem}
                                            className={`gap-2 rounded-md px-5 ${stockOperation === "in" ? "" : "bg-[#a5412a] text-white hover:bg-[#8d3622]"}`}
                                        >
                                            {stockInLoading ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : stockOperation === "in" ? (
                                                <ArrowUpCircle className="h-4 w-4" />
                                            ) : (
                                                <ArrowDownCircle className="h-4 w-4" />
                                            )}
                                            {stockOperation === "in" ? "Stock In" : "Stock Out"}
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
