"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface QRScannerProps {
    onScan: (result: string) => void;
    onError?: (error: string) => void;
    isActive?: boolean;
}

export function QRScanner({ onScan, onError, isActive = true }: QRScannerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState("");
    const controlsRef = useRef<IScannerControls | null>(null);
    const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
    const [cameraDialogOpen, setCameraDialogOpen] = useState(false);
    const [readyToStart, setReadyToStart] = useState(false);
    const [isPreparing, setIsPreparing] = useState(false);

    // Stable refs for callbacks so effects don't constantly reinitialize
    const onScanRef = useRef(onScan);
    const onErrorRef = useRef(onError);
    const isActiveRef = useRef(isActive);
    useEffect(() => { onScanRef.current = onScan; }, [onScan]);
    useEffect(() => { onErrorRef.current = onError; }, [onError]);
    useEffect(() => { isActiveRef.current = isActive; }, [isActive]);

    const getPreferredDeviceId = useCallback((devices: MediaDeviceInfo[]) => {
        const rearCamera = devices.find((device) => /back|rear|environment/i.test(device.label));
        return rearCamera?.deviceId || devices[0]?.deviceId || "";
    }, []);

    const formatDeviceLabel = useCallback((device: MediaDeviceInfo, index: number) => {
        if (device.label && device.label.trim().length > 0) return device.label;
        return `Camera ${index + 1}`;
    }, []);

    const killAllTracks = useCallback(() => {
        if (controlsRef.current) {
            try { controlsRef.current.stop(); } catch (_) {}
            controlsRef.current = null;
        }

        if (videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach((track) => {
                track.stop();
                track.enabled = false;
            });
            videoRef.current.srcObject = null;
        }
    }, []);

    const prepareCamera = useCallback(async () => {
        try {
            setError("");
            setIsPreparing(true);
            setIsScanning(false);
            killAllTracks();

            if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
                throw new Error("This browser does not support camera access.");
            }

            if (typeof window !== "undefined" && window.isSecureContext === false) {
                throw new Error("Camera needs HTTPS on mobile. Open this app with HTTPS (or localhost) and try again.");
            }

            // Trigger browser permission prompt via user gesture.
            const preflightStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: "environment" } },
                audio: false,
            });
            preflightStream.getTracks().forEach((track) => track.stop());

            const devices = await BrowserMultiFormatReader.listVideoInputDevices();
            if (devices.length === 0) {
                throw new Error("No camera found on this device.");
            }

            setCameraDevices(devices);
            const preferredDeviceId = getPreferredDeviceId(devices);
            setSelectedDeviceId(preferredDeviceId);
            setCameraDialogOpen(devices.length > 1);
            setReadyToStart(true);
        } catch (err: any) {
            let msg = err?.message || "Failed to access camera.";

            if (err?.name === "NotAllowedError") {
                msg = "Camera permission denied. Allow camera permission in browser/site settings and try again.";
            } else if (err?.name === "NotFoundError" || err?.name === "OverconstrainedError") {
                msg = "No usable camera was found on this device.";
            } else if (err?.name === "NotReadableError") {
                msg = "Camera is busy in another app/tab. Close it and try again.";
            }

            setError(msg);
            onErrorRef.current?.(msg);
            setReadyToStart(false);
        } finally {
            setIsPreparing(false);
        }
    }, [getPreferredDeviceId, killAllTracks]);

    useEffect(() => {
        let cancelled = false;

        async function startScannerForDevice() {
            if (!readyToStart || !selectedDeviceId || cameraDialogOpen) return;

            try {
                setError("");
                killAllTracks();

                const codeReader = new BrowserMultiFormatReader();
                const controls = await codeReader.decodeFromVideoDevice(
                    selectedDeviceId,
                    videoRef.current!,
                    (result) => {
                        if (cancelled) return;
                        if (result && isActiveRef.current) {
                            onScanRef.current(result.getText());
                        }
                    }
                );

                if (cancelled) {
                    try { controls.stop(); } catch (_) {}
                    return;
                }

                controlsRef.current = controls;
                setIsScanning(true);
            } catch (err: any) {
                if (cancelled) return;
                const msg = err?.message || "Failed to start camera stream.";
                setError(msg);
                onErrorRef.current?.(msg);
                setIsScanning(false);
            }
        }

        startScannerForDevice();

        return () => {
            cancelled = true;
            killAllTracks();
            setIsScanning(false);
        };
    }, [cameraDialogOpen, killAllTracks, readyToStart, selectedDeviceId]);

    return (
        <div className="relative space-y-3">
            {readyToStart && cameraDevices.length > 1 && (
                <Dialog open={cameraDialogOpen} onOpenChange={setCameraDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Select Camera Source</DialogTitle>
                            <DialogDescription>Choose which camera should be used for QR scanning.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="camera-source" className="text-sm font-medium">Available Cameras</label>
                                <select
                                    id="camera-source"
                                    className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={selectedDeviceId}
                                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                                >
                                    {cameraDevices.map((device, index) => (
                                        <option key={device.deviceId} value={device.deviceId}>
                                            {formatDeviceLabel(device, index)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex justify-end">
                                <Button type="button" onClick={() => setCameraDialogOpen(false)}>
                                    Use Selected Camera
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {error ? (
                <div className="space-y-3">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                        {error}
                    </div>
                    <Button type="button" variant="outline" onClick={prepareCamera} disabled={isPreparing}>
                        {isPreparing ? "Checking Camera..." : "Try Camera Again"}
                    </Button>
                </div>
            ) : !readyToStart ? (
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                    <p className="text-sm text-muted-foreground">
                        Tap below to enable camera and scan QR codes.
                    </p>
                    <Button type="button" onClick={prepareCamera} disabled={isPreparing}>
                        {isPreparing ? "Checking Camera..." : "Enable Camera"}
                    </Button>
                </div>
            ) : (
                <>
                    <video
                        ref={videoRef}
                        className="w-full rounded-lg border bg-black"
                        style={{ maxHeight: "400px" }}
                        autoPlay
                        playsInline
                        muted
                    />
                    {isScanning && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-48 h-48 border-2 border-green-500 rounded-lg"></div>
                        </div>
                    )}
                </>
            )}

            {readyToStart && cameraDevices.length > 1 && !cameraDialogOpen && (
                <div className="flex justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCameraDialogOpen(true)}
                    >
                        Change Camera
                    </Button>
                </div>
            )}
        </div>
    );
}
