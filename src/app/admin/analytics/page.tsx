"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { Header } from "@/components/layout/Header";
import { PageTransition } from "@/components/layout/PageTransition";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useRealtime } from "@/context/realtime";
import { StockTrends } from "@/lib/types";
import { Download, Zap } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";

export default function AnalyticsPage() {
    const { on, off, isConnected } = useRealtime();
    const [data, setData] = useState<StockTrends | null>(null);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [threshold, setThreshold] = useState("5");

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const handleRealtimeAnalyticsRefresh = async () => {
            await loadData();
        };

        on("analytics_updated", handleRealtimeAnalyticsRefresh);
        on("stock_changed", handleRealtimeAnalyticsRefresh);
        on("production_changed", handleRealtimeAnalyticsRefresh);

        return () => {
            off("analytics_updated", handleRealtimeAnalyticsRefresh);
            off("stock_changed", handleRealtimeAnalyticsRefresh);
            off("production_changed", handleRealtimeAnalyticsRefresh);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [on, off, startDate, endDate, threshold]);

    const loadData = async () => {
        setLoading(true);
        try {
            const result = await api.getStockTrends({
                start_date: startDate || undefined,
                end_date: endDate || undefined,
                low_stock_threshold: parseInt(threshold) || 5,
            });
            setData(result);
        } catch (err) {
            console.error("Failed to load analytics:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        window.open(api.getAnalyticsCSVUrl(startDate, endDate, parseInt(threshold)), "_blank");
    };

    // Combine daily series by date key to avoid index-mismatch across sparse datasets.
    const combinedDailyData = (() => {
        if (!data) return [];

        const byDate = new Map<string, { date: string; stock_in: number; stock_out: number; net_change: number }>();

        const ensureRow = (dateValue: string | Date) => {
            const key = String(dateValue);
            if (!byDate.has(key)) {
                byDate.set(key, { date: key, stock_in: 0, stock_out: 0, net_change: 0 });
            }
            return byDate.get(key)!;
        };

        data.daily_stock_in.forEach((item) => {
            const row = ensureRow(item.date);
            row.stock_in = Number(item.quantity) || 0;
        });

        data.daily_stock_out.forEach((item) => {
            const row = ensureRow(item.date);
            row.stock_out = Number(item.quantity) || 0;
        });

        data.net_stock_change.forEach((item) => {
            const row = ensureRow(item.date);
            row.net_change = Number(item.quantity) || 0;
        });

        return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
    })();

    const chartConfig = {
        stock_in: {
            label: "Stock In",
            color: "var(--chart-2)",
        },
        stock_out: {
            label: "Stock Out",
            color: "var(--chart-1)",
        },
        net_change: {
            label: "Net Change",
            color: "var(--chart-3)",
        },
    } satisfies ChartConfig;

    const activityChartConfig = {
        total_in: {
            label: "Total In",
            color: "var(--chart-2)",
        },
        total_out: {
            label: "Total Out",
            color: "var(--chart-1)",
        },
    } satisfies ChartConfig;


    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-[#f4f1ea]">
                <Header />
                <main className="container mx-auto px-3 py-6 sm:px-4 sm:py-8">
                    <PageTransition>
                        <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between sm:mb-8">
                            <div>
                                <h2 className="text-2xl font-semibold text-[#0b1d15] mb-2 sm:text-3xl">Analytics</h2>
                                <p className="text-gray-600">Stock trends and insights</p>
                                <p className={`mt-1 inline-flex items-center gap-1 text-xs ${isConnected ? "text-green-600" : "text-amber-600"}`}>
                                    <Zap className="h-3.5 w-3.5" />
                                    {isConnected ? "Realtime sync connected" : "Realtime sync connecting..."}
                                </p>
                            </div>
                            <Button onClick={handleExport} variant="outline" className="gap-2">
                                <Download className="h-4 w-4" />
                                export CSV
                            </Button>
                        </div>

                        <Card className="mb-6">
                            <CardHeader>
                                <CardTitle>Filters</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
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
                                    <div>
                                        <Label htmlFor="threshold">Low Stock Threshold</Label>
                                        <Input
                                            id="threshold"
                                            type="number"
                                            min="1"
                                            value={threshold}
                                            onChange={(e) => setThreshold(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <Button onClick={loadData} className="w-full">Apply Filters</Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {loading ? (
                            <p>Loading analytics...</p>
                        ) : (
                            <div className="space-y-6">
                                {/* Stock Trends Chart */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Stock Movement Trends</CardTitle>
                                        <CardDescription>Daily stock in, out, and net change</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {combinedDailyData.length > 0 ? (
                                            <div className="h-[300px] w-full">
                                                <ChartContainer config={chartConfig} className="h-full w-full">
                                                    <LineChart data={combinedDailyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                                        <XAxis
                                                            dataKey="date"
                                                            tickLine={false}
                                                            axisLine={false}
                                                            tickMargin={8}
                                                        />
                                                        <YAxis
                                                            tickLine={false}
                                                            axisLine={false}
                                                            tickMargin={8}
                                                        />
                                                        <ChartTooltip content={<ChartTooltipContent />} />
                                                        <ChartLegend content={<ChartLegendContent />} />
                                                        <Line
                                                            type="monotone"
                                                            dataKey="stock_in"
                                                            stroke="var(--color-stock_in)"
                                                            strokeWidth={2}
                                                            dot={{ r: 4, strokeWidth: 2 }}
                                                            activeDot={{ r: 6, strokeWidth: 0 }}
                                                        />
                                                        <Line
                                                            type="monotone"
                                                            dataKey="stock_out"
                                                            stroke="var(--color-stock_out)"
                                                            strokeWidth={2}
                                                            dot={{ r: 4, strokeWidth: 2 }}
                                                            activeDot={{ r: 6, strokeWidth: 0 }}
                                                        />
                                                        <Line
                                                            type="monotone"
                                                            dataKey="net_change"
                                                            stroke="var(--color-net_change)"
                                                            strokeWidth={2}
                                                            dot={{ r: 4, strokeWidth: 2 }}
                                                            activeDot={{ r: 6, strokeWidth: 0 }}
                                                        />
                                                    </LineChart>
                                                </ChartContainer>
                                            </div>
                                        ) : (
                                            <p className="text-center text-gray-600 py-8">No data available</p>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Most Active Products */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Most Active Products</CardTitle>
                                        <CardDescription>Products with most stock movements</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {data && data.most_active_products.length > 0 ? (
                                            <div className="h-[300px] w-full">
                                                <ChartContainer config={activityChartConfig} className="h-full w-full">
                                                    <BarChart data={data.most_active_products} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                                        <XAxis
                                                            dataKey="product_name"
                                                            tickLine={false}
                                                            axisLine={false}
                                                            tickMargin={8}
                                                        />
                                                        <YAxis
                                                            tickLine={false}
                                                            axisLine={false}
                                                            tickMargin={8}
                                                        />
                                                        <ChartTooltip content={<ChartTooltipContent />} />
                                                        <ChartLegend content={<ChartLegendContent />} />
                                                        <Bar dataKey="total_in" fill="var(--color-total_in)" radius={[4, 4, 0, 0]} />
                                                        <Bar dataKey="total_out" fill="var(--color-total_out)" radius={[4, 4, 0, 0]} />
                                                    </BarChart>
                                                </ChartContainer>
                                            </div>
                                        ) : (
                                            <p className="text-center text-gray-600 py-8">No active products</p>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Low Stock Alert */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Low Stock Alert</CardTitle>
                                        <CardDescription>Products below threshold ({threshold})</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {data && data.low_stock_products.length > 0 ? (
                                            <div className="space-y-2">
                                                {data.low_stock_products.map((product) => (
                                                    <div
                                                        key={product.product_id}
                                                        className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg"
                                                    >
                                                        <div>
                                                            <div className="font-medium">{product.product_name}</div>
                                                            <div className="text-sm text-gray-600">{product.category || "Uncategorized"}</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-2xl font-bold text-orange-600">{product.quantity}</div>
                                                            <div className="text-xs text-gray-600">in stock</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-center text-gray-600 py-8">No low stock items</p>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </PageTransition>
                </main>
            </div>
        </ProtectedRoute>
    );
}
