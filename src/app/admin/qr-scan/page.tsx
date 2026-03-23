"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageTransition } from "@/components/layout/PageTransition";
import { QRScanner } from "@/components/qr/QRScanner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { Product } from "@/lib/types"; // Import Product type
import { Loader2, CheckCircle2, XCircle, Package, Camera, CameraOff } from "lucide-react";

export default function QRScanPage() {
    const [scannedResult, setScannedResult] = useState<string | null>(null);
    const [scannedProduct, setScannedProduct] = useState<Product | null>(null); // Store found product
    const [quantity, setQuantity] = useState<number | string>(1);
    const [remarks, setRemarks] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false); // New state for verification
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [scanKey, setScanKey] = useState(0); // Key to force remount of scanner
    const [cameraOn, setCameraOn] = useState(true);

    const handleScan = async (result: string) => {
        if (!scannedResult) {
            setScannedResult(result);
            verifyProduct(result);
        }
    };

    const verifyProduct = async (qr: string) => {
        setVerifying(true);
        setMessage(null);
        try {
            const product = await api.getProductByQr(qr);
            if (product) {
                setScannedProduct(product);
                // Set default quantity based on unit type (optional, keep 1 for now)
            } else {
                setScannedProduct(null);
                setMessage({ type: 'error', text: "Product not found in registry." });
            }
        } catch (err) {
            console.error("Verification failed", err);
            setMessage({ type: 'error', text: "Failed to verify product." });
        } finally {
            setVerifying(false);
        }
    };

    const handleReset = () => {
        setScannedResult(null);
        setScannedProduct(null);
        setMessage(null);
        setQuantity(1);
        setRemarks("");
        setScanKey(prev => prev + 1); // Force scanner remount
    };

    const handleStockOperation = async (type: 'in' | 'out') => {
        if (!scannedResult) return;

        const finalQuantity = Number(quantity);
        if (!finalQuantity || finalQuantity < 1) {
            setMessage({ type: 'error', text: "Please enter a valid quantity" });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            if (type === 'in') {
                await api.stockIn({ qr_code_value: scannedResult, quantity: finalQuantity, remarks: remarks || undefined });
                setMessage({ type: 'success', text: `Successfully stocked in ${finalQuantity} items.` });
            } else {
                await api.stockOut({ qr_code_value: scannedResult, quantity: finalQuantity, remarks: remarks || undefined });
                setMessage({ type: 'success', text: `Successfully stocked out ${finalQuantity} items.` });
            }
            setTimeout(handleReset, 2000);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || "Operation failed" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-background">
                <Header />
                <main className="container mx-auto px-3 py-6 sm:px-4 sm:py-8">
                    <PageTransition>
                        <div className="max-w-2xl mx-auto">
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle>QR Scanner</CardTitle>
                                            <CardDescription>Scan a product QR code to manage stock</CardDescription>
                                        </div>
                                        {!scannedResult && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setCameraOn(prev => !prev);
                                                    if (!cameraOn) setScanKey(k => k + 1);
                                                }}
                                                className={`gap-2 rounded-lg ${
                                                    cameraOn
                                                        ? "border-red-200 text-red-700 hover:bg-red-50"
                                                        : "border-green-200 text-green-700 hover:bg-green-50"
                                                }`}
                                            >
                                                {cameraOn ? (
                                                    <><CameraOff className="h-4 w-4" /> Turn Off</>
                                                ) : (
                                                    <><Camera className="h-4 w-4" /> Turn On</>
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Only mount scanner when camera is on — unmounting fully stops the camera */}
                                    {!scannedResult && (
                                        <div className="rounded-lg overflow-hidden border">
                                            {cameraOn ? (
                                                <QRScanner key={scanKey} onScan={handleScan} isActive={!scannedResult} />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center gap-3 bg-black/5 py-20 text-muted-foreground">
                                                    <CameraOff className="h-10 w-10 opacity-40" />
                                                    <p className="text-sm">Camera is off</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {scannedResult && (
                                        <div className="space-y-6 text-center animate-in fade-in zoom-in duration-300">
                                            <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                                                <p className="text-sm text-green-800 font-medium mb-1">Scanned Code</p>
                                                <p className="text-2xl font-mono font-bold text-green-900 break-all">{scannedResult}</p>
                                            </div>

                                            {verifying ? (
                                                <div className="flex justify-center py-4">
                                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                                </div>
                                            ) : scannedProduct ? (
                                                <div className="space-y-4 max-w-md mx-auto">
                                                    <div className="bg-blue-50 p-4 rounded-md border border-blue-100 text-left">
                                                        <div className="flex items-center gap-3">
                                                            <div className="bg-blue-100 p-2 rounded-full">
                                                                <Package className="h-5 w-5 text-blue-600" />
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-blue-900">{scannedProduct.name}</p>
                                                                <p className="text-sm text-blue-700 capitalize">
                                                                    Unit: {scannedProduct.unit_label} ({scannedProduct.unit_type})
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="w-full">
                                                        <Label htmlFor="quantity" className="text-left block mb-2">
                                                            Quantity ({scannedProduct.unit_label})
                                                        </Label>
                                                        <Input
                                                            id="quantity"
                                                            type="number"
                                                            min={scannedProduct.unit_type === 'piece' ? "1" : "0.01"}
                                                            step={scannedProduct.unit_type === 'piece' ? "1" : "0.01"}
                                                            value={quantity}
                                                            onChange={(e) => setQuantity(e.target.value)}
                                                        />
                                                        {scannedProduct.unit_type === 'piece' && (
                                                            <p className="text-xs text-gray-500 text-left mt-1">Whole numbers only for pieces</p>
                                                        )}
                                                    </div>
                                                    <div className="w-full">
                                                        <Label htmlFor="remarks" className="text-left block mb-2">Remarks (Optional)</Label>
                                                        <textarea
                                                            id="remarks"
                                                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                            placeholder="Optional notes or comments (max 500 characters)"
                                                            value={remarks}
                                                            onChange={(e) => setRemarks(e.target.value.slice(0, 500))}
                                                            maxLength={500}
                                                        />
                                                    </div>
                                                </div>
                                            ) : null}

                                            {message && (
                                                <div className={`p-4 rounded-lg flex items-center justify-center gap-2 ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {message.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                                                    {message.text}
                                                </div>
                                            )}

                                            {scannedProduct && (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <Button
                                                        onClick={() => handleStockOperation('in')}
                                                        disabled={loading}
                                                        className="w-full bg-green-600 hover:bg-green-700"
                                                    >
                                                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                                        Stock In
                                                    </Button>
                                                    <Button
                                                        onClick={() => handleStockOperation('out')}
                                                        disabled={loading}
                                                        variant="outline"
                                                        className="w-full border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                                                    >
                                                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                                        Stock Out
                                                    </Button>
                                                </div>
                                            )}

                                            <Button variant="ghost" onClick={handleReset} disabled={loading}>
                                                {scannedProduct ? "Cancel / Scan Again" : "Scan Again"}
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </PageTransition>
                </main>
            </div>
        </ProtectedRoute>
    );
}
