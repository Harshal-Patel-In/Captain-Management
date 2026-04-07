"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { Header } from "@/components/layout/Header";
import { PageTransition } from "@/components/layout/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { useRealtime } from "@/context/realtime";
import { InventoryItem, LogsRetentionStatus, ProductMonthlySummary } from "@/lib/types";
import { RealtimeEvent } from "@/lib/realtime";
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY, formatQuantity } from "@/lib/utils";
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, ArrowUpDown, Download, Loader2, X, Zap } from "lucide-react";

const TOOLTIP_AUTO_HIDE_MS = 6000;

export default function InventoryPage() {
    const { on, off } = useRealtime();
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFilterLoading, setIsFilterLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("all");
    const [categories, setCategories] = useState<string[]>([]);
    const [stockInDialogOpen, setStockInDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [stockOperation, setStockOperation] = useState<"in" | "out">("in");
    const [stockInQuantity, setStockInQuantity] = useState<number | string>(1);
    const [stockInRemarks, setStockInRemarks] = useState("");
    const [stockInLoading, setStockInLoading] = useState(false);
    const [stockInMessage, setStockInMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [recentUpdate, setRecentUpdate] = useState<number | null>(null); // Product ID recently updated
    const [activeTooltipProductId, setActiveTooltipProductId] = useState<number | null>(null);
    const [monthlySummaryByProduct, setMonthlySummaryByProduct] = useState<Record<number, ProductMonthlySummary>>({});
    const [monthlySummaryLoadingByProduct, setMonthlySummaryLoadingByProduct] = useState<Record<number, boolean>>({});
    const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
    const [isTooltipHovered, setIsTooltipHovered] = useState(false);
    const [retentionStatus, setRetentionStatus] = useState<LogsRetentionStatus | null>(null);
    const [lastDayExportDialogOpen, setLastDayExportDialogOpen] = useState(false);
    const hasLoadedRef = useRef(false);

    const loadInventory = useCallback(async (searchTerm?: string, categoryFilter?: string) => {
        const isInitialRequest = !hasLoadedRef.current;
        if (isInitialRequest) {
            setLoading(true);
        } else {
            setIsFilterLoading(true);
        }

        try {
            const data = await api.getInventory(searchTerm, categoryFilter);
            setInventory(data.items || []);
        } catch (err) {
            console.error("Failed to load inventory:", err);
        } finally {
            if (isInitialRequest) {
                setLoading(false);
                hasLoadedRef.current = true;
            }
            setIsFilterLoading(false);
        }
    }, []);

    useEffect(() => {
        const loadCategories = async () => {
            try {
                const data = await api.getProducts();
                const uniqueCategories = Array.from(
                    new Set(
                        (data.products || [])
                            .map((product) => product.category?.trim())
                            .filter((value): value is string => Boolean(value)),
                    ),
                ).sort((a, b) => a.localeCompare(b));
                setCategories(uniqueCategories);
            } catch (err) {
                console.error("Failed to load categories:", err);
            }
        };

        void loadCategories();
    }, []);

    const loadRetentionStatus = useCallback(async () => {
        try {
            const status = await api.getLogsRetentionStatus();
            setRetentionStatus(status);
            if (status.is_last_export_day && status.has_logs_in_main_db) {
                setLastDayExportDialogOpen(true);
            }
        } catch (err) {
            console.error("Failed to load logs retention status:", err);
        }
    }, []);

    useEffect(() => {
        void loadRetentionStatus();
    }, [loadRetentionStatus]);

    useEffect(() => {
        const activeCategory = category === "all" ? undefined : category;
        const debounceTimer = window.setTimeout(() => {
            void loadInventory(search.trim() || undefined, activeCategory);
        }, 250);

        return () => window.clearTimeout(debounceTimer);
    }, [search, category, loadInventory]);

    // Listen for real-time stock updates
    useEffect(() => {
        const handleStockChanged = async (event: RealtimeEvent) => {
            console.log('[REALTIME] Stock changed:', event);
            const updatedProductId = typeof event.product_id === "number" ? event.product_id : null;
            // Highlight the updated item
            if (updatedProductId !== null) {
                setRecentUpdate(updatedProductId);
            }
            setTimeout(() => setRecentUpdate(null), 2000);
            // Refresh inventory
            const activeCategory = category === "all" ? undefined : category;
            await loadInventory(search.trim() || undefined, activeCategory);
        };

        on('stock_changed', handleStockChanged);

        return () => {
            off('stock_changed', handleStockChanged);
        };
    }, [on, off, search, category, loadInventory]);

    const handleExport = () => {
        window.open(api.getInventoryCSVUrl(), "_blank");
    };

    const handleExportPreviousMonthLogs = () => {
        if (!retentionStatus) return;
        window.open(api.getLogsExcelUrl(retentionStatus.period_start, retentionStatus.period_end), "_blank");
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

    const handleToggleMonthlyTooltip = async (event: React.MouseEvent<HTMLElement>, productId: number) => {
        event.stopPropagation();

        if (activeTooltipProductId === productId) {
            setActiveTooltipProductId(null);
            setTooltipPosition(null);
            return;
        }

        const rect = event.currentTarget.getBoundingClientRect();
        const estimatedTooltipWidth = 240;
        const horizontalPadding = 8;
        const left = Math.min(
            Math.max(horizontalPadding, rect.left),
            window.innerWidth - estimatedTooltipWidth - horizontalPadding,
        );

        const top = Math.max(horizontalPadding, rect.bottom + 8);

        setTooltipPosition({
            top,
            left,
        });
        setIsTooltipHovered(false);

        setActiveTooltipProductId(productId);

        if (monthlySummaryByProduct[productId] || monthlySummaryLoadingByProduct[productId]) {
            return;
        }

        setMonthlySummaryLoadingByProduct((prev) => ({ ...prev, [productId]: true }));
        try {
            const targetDate = new Date().toISOString().slice(0, 10);
            const summary = await api.getProductMonthlySummary(productId, targetDate);
            setMonthlySummaryByProduct((prev) => ({ ...prev, [productId]: summary }));
        } catch (err) {
            console.error("Failed to load product monthly summary:", err);
        } finally {
            setMonthlySummaryLoadingByProduct((prev) => ({ ...prev, [productId]: false }));
        }
    };

    useEffect(() => {
        if (activeTooltipProductId === null || isTooltipHovered) return;

        const timeoutId = window.setTimeout(() => {
            setActiveTooltipProductId(null);
            setTooltipPosition(null);
        }, TOOLTIP_AUTO_HIDE_MS);

        return () => window.clearTimeout(timeoutId);
    }, [activeTooltipProductId, isTooltipHovered]);

    const handleManualStockIn = async () => {
        if (!selectedItem) return;

        const quantity = Number(stockInQuantity);
        if (!quantity || quantity <= 0) {
            setStockInMessage({ type: "error", text: "Please enter a valid quantity." });
            return;
        }

        if (selectedItem.unit_type === "piece" && !Number.isInteger(quantity)) {
            const message = `You entered floating number for piece unit type product ${selectedItem.product_name}.`;
            setStockInMessage({ type: "error", text: message });
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
            const activeCategory = category === "all" ? undefined : category;
            await loadInventory(search.trim() || undefined, activeCategory);
            setTimeout(() => {
                handleCloseStockInDialog();
            }, 800);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error
                ? err.message
                : `Failed to stock ${stockOperation === "in" ? "in" : "out"} product.`;
            setStockInMessage({
                type: "error",
                text: errorMessage,
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

                        {retentionStatus?.warning_message && retentionStatus.has_logs_in_main_db && (
                            <Card className="mb-6 border-amber-300 bg-amber-50">
                                <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-700" />
                                        <div>
                                            <p className="text-sm font-semibold text-amber-900">Export previous month stock logs</p>
                                            <p className="text-sm text-amber-800">{retentionStatus.warning_message}</p>
                                            <p className="text-xs text-amber-700">
                                                Period: {formatDateDDMMYYYY(retentionStatus.period_start)} to {formatDateDDMMYYYY(retentionStatus.period_end)}
                                            </p>
                                        </div>
                                    </div>
                                    <Button onClick={handleExportPreviousMonthLogs} className="gap-2 bg-amber-700 text-white hover:bg-amber-800">
                                        <Download className="h-4 w-4" />
                                        Export Excel
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        <Card>
                            <CardHeader>
                                <CardTitle>Stock Levels</CardTitle>
                                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_220px]">
                                    <Input
                                        placeholder="Search by product, QR, or quantity..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full"
                                    />
                                    <Select value={category} onValueChange={setCategory}>
                                        <SelectTrigger className="border-[#0b1d15]/25 bg-[#e7f2ec] text-[#0b1d15]">
                                            <SelectValue placeholder="All categories" />
                                        </SelectTrigger>
                                        <SelectContent className="border-[#0b1d15]/20 bg-[#f8fbf9]">
                                            <SelectItem value="all" className="text-[#0b1d15]">All categories</SelectItem>
                                            {categories.map((itemCategory) => (
                                                <SelectItem key={itemCategory} value={itemCategory} className="text-[#0b1d15]">
                                                    {itemCategory}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="mt-2 min-h-5 text-xs text-gray-500">
                                    {isFilterLoading && (
                                        <span className="inline-flex items-center gap-1.5">
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            Updating results...
                                        </span>
                                    )}
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
                                                <div key={item.product_id} className="rounded-xl border border-[#0b1d15]/14 bg-white/95 p-4 shadow-[0_12px_28px_-20px_rgba(11,29,21,0.45)]">
                                                    <div className="flex items-start justify-between">
                                                        <div className="relative">
                                                            <button
                                                                type="button"
                                                                className="font-medium text-[#0b1d15] text-left underline-offset-2 hover:underline"
                                                                onClick={(event) => handleToggleMonthlyTooltip(event, item.product_id)}
                                                            >
                                                                {item.product_name}
                                                            </button>
                                                            <div className="text-sm text-gray-500">{item.category || "Uncategorized"}</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className={`text-xl font-bold ${item.quantity < 5 ? "text-orange-600" : "text-[#0b1d15]"}`}>
                                                                {formatQuantity(item.quantity)} {item.unit_label}
                                                            </div>
                                                            <div className="text-xs text-gray-400">in stock</div>
                                                        </div>
                                                    </div>
                                                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                                                        <span className="font-mono">{item.qr_code_value}</span>
                                                        <span>{formatDateTimeDDMMYYYY(item.last_updated)}</span>
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
                                                <TableRow 
                                                    key={item.product_id}
                                                    className={`transition-colors duration-500 ${
                                                        recentUpdate === item.product_id 
                                                          ? 'bg-green-100' 
                                                          : ''
                                                    }`}
                                                >
                                                    <TableCell className="font-medium flex items-center gap-2">
                                                        {recentUpdate === item.product_id && (
                                                            <Zap className="h-4 w-4 text-green-600" />
                                                        )}
                                                        <div className="relative">
                                                            <button
                                                                type="button"
                                                                className="text-left underline-offset-2 hover:underline"
                                                                onClick={(event) => handleToggleMonthlyTooltip(event, item.product_id)}
                                                            >
                                                                {item.product_name}
                                                            </button>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{item.category || "-"}</TableCell>
                                                    <TableCell className="font-mono text-sm">{item.qr_code_value}</TableCell>
                                                    <TableCell className="text-right font-bold">
                                                        <span className={item.quantity < 5 ? "text-orange-600" : ""}>
                                                            {formatQuantity(item.quantity)} <span className="text-sm text-gray-600">{item.unit_label}</span>
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>{formatDateTimeDDMMYYYY(item.last_updated)}</TableCell>
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

                        {typeof document !== "undefined" && activeTooltipProductId !== null && tooltipPosition && createPortal(
                            <>
                                <div
                                    className="fixed inset-0 z-9998"
                                    onClick={() => {
                                        setActiveTooltipProductId(null);
                                        setTooltipPosition(null);
                                        setIsTooltipHovered(false);
                                    }}
                                />
                                <div
                                    className="fixed z-9999 min-w-55 rounded-md border border-gray-200 bg-white p-3 text-xs shadow-lg"
                                    style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
                                    onClick={(event) => event.stopPropagation()}
                                    onMouseEnter={() => setIsTooltipHovered(true)}
                                    onMouseLeave={() => setIsTooltipHovered(false)}
                                >
                                    <div className="mb-2 font-semibold text-[#0b1d15]">Monthly Stock Movement</div>
                                    {monthlySummaryLoadingByProduct[activeTooltipProductId] ? (
                                        <div className="text-gray-500">Loading...</div>
                                    ) : monthlySummaryByProduct[activeTooltipProductId] ? (
                                        <div className="space-y-1">
                                            <div className="text-[11px] text-gray-500 mb-1">
                                                Period: {formatDateDDMMYYYY(monthlySummaryByProduct[activeTooltipProductId].period_start)} to {formatDateDDMMYYYY(monthlySummaryByProduct[activeTooltipProductId].period_end)}
                                            </div>
                                            <div className="flex items-center justify-between gap-4">
                                                <span className="text-gray-600">Stock In</span>
                                                <span className="font-mono text-green-700">+{formatQuantity(monthlySummaryByProduct[activeTooltipProductId].stock_in)}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-4">
                                                <span className="text-gray-600">Stock Out</span>
                                                <span className="font-mono text-red-700">-{formatQuantity(monthlySummaryByProduct[activeTooltipProductId].stock_out)}</span>
                                            </div>
                                            <div className="mt-1 border-t pt-1 flex items-center justify-between gap-4">
                                                <span className="text-gray-700 font-semibold">Net Change</span>
                                                <span className={`font-mono font-semibold ${monthlySummaryByProduct[activeTooltipProductId].net_change >= 0 ? "text-green-700" : "text-red-700"}`}>
                                                    {monthlySummaryByProduct[activeTooltipProductId].net_change >= 0 ? "+" : ""}
                                                    {formatQuantity(monthlySummaryByProduct[activeTooltipProductId].net_change)}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-gray-500">No movement data for this month.</div>
                                    )}
                                </div>
                            </>,
                            document.body
                        )}

                        <Dialog open={lastDayExportDialogOpen} onOpenChange={setLastDayExportDialogOpen}>
                            <DialogContent className="sm:max-w-lg">
                                <DialogHeader>
                                    <DialogTitle>Last Day To Export Stock Logs</DialogTitle>
                                    <DialogDescription>
                                        This is the final day to export {formatDateDDMMYYYY(retentionStatus?.period_start)} to {formatDateDDMMYYYY(retentionStatus?.period_end)} stock logs.
                                        Please export now before archival and deletion workflow starts.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="flex justify-end">
                                    <Button onClick={handleExportPreviousMonthLogs} className="gap-2">
                                        <Download className="h-4 w-4" />
                                        Export Excel
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>

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
