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
import { useRealtime } from "@/context/realtime";
import { LogsRetentionStatus, StockLog } from "@/lib/types";
import { Download, ArrowUp, ArrowDown, AlertTriangle, Zap } from "lucide-react";

const toDateInputValue = (value: Date) => value.toISOString().slice(0, 10);

const getCurrentMonthRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
        startDate: toDateInputValue(start),
        endDate: toDateInputValue(now),
    };
};

const getPreviousMonthRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return {
        startDate: toDateInputValue(start),
        endDate: toDateInputValue(end),
    };
};

export default function LogsPage() {
    const { on, off, isConnected } = useRealtime();
    const initialRange = getCurrentMonthRange();
    const [logs, setLogs] = useState<StockLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(initialRange.startDate);
    const [endDate, setEndDate] = useState(initialRange.endDate);
    const [retentionStatus, setRetentionStatus] = useState<LogsRetentionStatus | null>(null);
    const [lastDayDialogOpen, setLastDayDialogOpen] = useState(false);

    useEffect(() => {
        loadLogs();
        loadRetentionStatus();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const refreshLogs = async () => {
            await loadLogs();
            await loadRetentionStatus();
        };

        on("log_created", refreshLogs);
        on("stock_changed", refreshLogs);
        on("production_changed", refreshLogs);

        return () => {
            off("log_created", refreshLogs);
            off("stock_changed", refreshLogs);
            off("production_changed", refreshLogs);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [on, off, startDate, endDate]);

    const loadRetentionStatus = async () => {
        try {
            const status = await api.getLogsRetentionStatus();
            setRetentionStatus(status);
            if (status.is_last_export_day && status.has_logs_in_main_db) {
                setLastDayDialogOpen(true);
            }
        } catch (err) {
            console.error("Failed to load logs retention status:", err);
        }
    };

    const loadLogsForRange = async (rangeStart?: string, rangeEnd?: string) => {
        setLoading(true);
        try {
            const data = await api.getLogs({
                start_date: rangeStart || undefined,
                end_date: rangeEnd || undefined,
            });
            setLogs(data.logs || []);
        } catch (err) {
            console.error("Failed to load logs:", err);
        } finally {
            setLoading(false);
        }
    };

    const loadLogs = async () => {
        await loadLogsForRange(startDate, endDate);
    };

    const handleExport = () => {
        window.open(api.getLogsExcelUrl(startDate, endDate), "_blank");
    };

    const handleExportPreviousMonth = () => {
        if (!retentionStatus) return;
        window.open(api.getLogsExcelUrl(retentionStatus.period_start, retentionStatus.period_end), "_blank");
    };

    const handleUseCurrentMonth = async () => {
        const range = getCurrentMonthRange();
        setStartDate(range.startDate);
        setEndDate(range.endDate);
        await loadLogsForRange(range.startDate, range.endDate);
    };

    const handleUseLastMonth = async () => {
        const range = getPreviousMonthRange();
        setStartDate(range.startDate);
        setEndDate(range.endDate);
        await loadLogsForRange(range.startDate, range.endDate);
    };

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-[#f4f1ea]">
                <Header />
                <main className="container mx-auto px-3 py-6 sm:px-4 sm:py-8">
                    <PageTransition>
                        <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between sm:mb-8">
                            <div>
                                <h2 className="text-2xl font-semibold text-[#0b1d15] mb-2 sm:text-3xl">Stock Logs</h2>
                                <p className="text-gray-600">Immutable history of all stock movements</p>
                                <p className={`mt-1 inline-flex items-center gap-1 text-xs ${isConnected ? "text-green-600" : "text-amber-600"}`}>
                                    <Zap className="h-3.5 w-3.5" />
                                    {isConnected ? "Realtime sync connected" : "Realtime sync connecting..."}
                                </p>
                            </div>
                            <Button onClick={handleExport} variant="outline" className="gap-2">
                                <Download className="h-4 w-4" />
                                Export Excel
                            </Button>
                        </div>

                        {retentionStatus?.warning_message && retentionStatus.has_logs_in_main_db && (
                            <Card className="mb-6 border-amber-300 bg-amber-50">
                                <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-700" />
                                        <div>
                                            <p className="text-sm font-semibold text-amber-900">Previous month logs retention</p>
                                            <p className="text-sm text-amber-800">{retentionStatus.warning_message}</p>
                                            <p className="text-xs text-amber-700">
                                                Period: {retentionStatus.period_start} to {retentionStatus.period_end}
                                            </p>
                                        </div>
                                    </div>
                                    <Button onClick={handleExportPreviousMonth} className="gap-2 bg-amber-700 text-white hover:bg-amber-800">
                                        <Download className="h-4 w-4" />
                                        Export Previous Month
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        <Card className="mb-6">
                            <CardHeader>
                                <CardTitle>Filters</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 md:grid-cols-4">
                                    <div>
                                        <Label htmlFor="start">Start Date</Label>
                                        <Input
                                            id="start"
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="end">End Date</Label>
                                        <Input
                                            id="end"
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <Button onClick={loadLogs} className="w-full">Apply Filters</Button>
                                    </div>
                                    <div className="flex items-end">
                                        <div className="w-full space-y-2">
                                            <Button variant="outline" onClick={handleUseCurrentMonth} className="w-full">Current Month</Button>
                                            <Button variant="outline" onClick={handleUseLastMonth} className="w-full">Last Month</Button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>All Logs ({logs.length})</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <p>Loading...</p>
                                ) : logs.length === 0 ? (
                                    <p className="text-gray-600 text-center py-8">No logs found.</p>
                                ) : (
                                    <>
                                        {/* Mobile: Card layout */}
                                        <div className="space-y-3 md:hidden">
                                            {logs.map((log) => (
                                                <div key={log.id} className="rounded-xl border border-[#0b1d15]/14 bg-white/95 p-4 shadow-[0_12px_28px_-20px_rgba(11,29,21,0.45)] space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            {log.action.toLowerCase() === "in" ? (
                                                                <>
                                                                    <ArrowUp className="h-4 w-4 text-green-600" />
                                                                    <span className="text-green-600 font-medium">Stock In</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <ArrowDown className="h-4 w-4 text-red-600" />
                                                                    <span className="text-red-600 font-medium">Stock Out</span>
                                                                </>
                                                            )}
                                                        </div>
                                                        <span className="text-sm font-bold">{log.quantity}</span>
                                                    </div>
                                                    <div className="font-medium text-[#0b1d15]">{log.product_name}</div>
                                                    <div className="flex gap-4 text-sm text-gray-500">
                                                        <span>{log.previous_quantity} → {log.new_quantity}</span>
                                                    </div>
                                                    {log.remarks && <div className="text-sm text-gray-400">{log.remarks}</div>}
                                                    <div className="text-xs text-gray-400">{new Date(log.timestamp).toLocaleString()}</div>
                                                </div>
                                            ))}
                                        </div>
                                        {/* Desktop: Table layout */}
                                        <div className="hidden md:block">
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Timestamp</TableHead>
                                                    <TableHead>Action</TableHead>
                                                    <TableHead>Product</TableHead>
                                                    <TableHead className="text-right">Quantity</TableHead>
                                                    <TableHead className="text-right">Previous</TableHead>
                                                    <TableHead className="text-right">New</TableHead>
                                                    <TableHead>Remarks</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {logs.map((log) => (
                                                    <TableRow key={log.id}>
                                                        <TableCell className="whitespace-nowrap">
                                                            {new Date(log.timestamp).toLocaleString()}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                {log.action.toLowerCase() === "in" ? (
                                                                    <>
                                                                        <ArrowUp className="h-4 w-4 text-green-600" />
                                                                        <span className="text-green-600 font-medium">In</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <ArrowDown className="h-4 w-4 text-red-600" />
                                                                        <span className="text-red-600 font-medium">Out</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="font-medium">{log.product_name}</TableCell>
                                                        <TableCell className="text-right font-bold">{log.quantity}</TableCell>
                                                        <TableCell className="text-right">{log.previous_quantity}</TableCell>
                                                        <TableCell className="text-right font-medium">{log.new_quantity}</TableCell>
                                                        <TableCell className="text-gray-600">{log.remarks || "-"}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        <Dialog open={lastDayDialogOpen} onOpenChange={setLastDayDialogOpen}>
                            <DialogContent className="sm:max-w-lg">
                                <DialogHeader>
                                    <DialogTitle>Last Day To Export Logs</DialogTitle>
                                    <DialogDescription>
                                        This is the final day to export {retentionStatus?.period_start} to {retentionStatus?.period_end} stock logs.
                                        Please export now before archival and deletion workflow begins.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="flex justify-end">
                                    <Button onClick={handleExportPreviousMonth} className="gap-2">
                                        <Download className="h-4 w-4" />
                                        Export Excel
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </PageTransition>
                </main>
            </div>
        </ProtectedRoute>
    );
}
