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

    // Stable ref for callbacks so startScanning doesn't re-create on every render
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
        // Stop scanner controls
        if (controlsRef.current) {
            try { controlsRef.current.stop(); } catch (_) {}
            controlsRef.current = null;
        }
        // Stop every track on the video element
        if (videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => {
                track.stop();
                track.enabled = false;
            });
            videoRef.current.srcObject = null;
        }
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function initDevices() {
            try {
                setError("");

                if (typeof window !== "undefined" && window.isSecureContext === false) {
                    throw new Error("Camera access requires HTTPS or localhost.");
                }

                const devices = await BrowserMultiFormatReader.listVideoInputDevices();
                if (cancelled) return;
                if (devices.length === 0) {
                    throw new Error("No camera found");
                }

                setCameraDevices(devices);
                const preferredDeviceId = getPreferredDeviceId(devices);
                setSelectedDeviceId(preferredDeviceId);
                setCameraDialogOpen(devices.length > 1);
            } catch (err: any) {
                if (cancelled) return;
                const msg = err.message || "Failed to start camera";
                setError(msg);
                onErrorRef.current?.(msg);
            }
        }

        initDevices();

        return () => {
            cancelled = true;
        };
    }, [getPreferredDeviceId]);

    useEffect(() => {
        let cancelled = false;

        async function startScannerForDevice() {
            if (!selectedDeviceId || cameraDialogOpen) return;
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
                const msg = err.message || "Failed to start camera";
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
    }, [cameraDialogOpen, killAllTracks, selectedDeviceId]);

    return (
        <div className="relative space-y-3">
            {cameraDevices.length > 1 && (
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
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                    {error}
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
            {cameraDevices.length > 1 && !cameraDialogOpen && (
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
