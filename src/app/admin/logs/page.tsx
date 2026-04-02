"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { Header } from "@/components/layout/Header";
import { PageTransition } from "@/components/layout/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { useRealtime } from "@/context/realtime";
import { StockLog } from "@/lib/types";
import { Download, ArrowUp, ArrowDown, Zap } from "lucide-react";

export default function LogsPage() {
    const { on, off, isConnected } = useRealtime();
    const [logs, setLogs] = useState<StockLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    useEffect(() => {
        loadLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const refreshLogs = async () => {
            await loadLogs();
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

    const loadLogs = async () => {
        setLoading(true);
        try {
            const data = await api.getLogs({
                start_date: startDate || undefined,
                end_date: endDate || undefined,
            });
            setLogs(data.logs || []);
        } catch (err) {
            console.error("Failed to load logs:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        window.open(api.getLogsCSVUrl(startDate, endDate), "_blank");
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
                                Export CSV
                            </Button>
                        </div>

                        <Card className="mb-6">
                            <CardHeader>
                                <CardTitle>Filters</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 md:grid-cols-3">
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
                                                <div key={log.id} className="rounded-xl border bg-card p-4 space-y-2">
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
                    </PageTransition>
                </main>
            </div>
        </ProtectedRoute>
    );
}
