"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";

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
    const isMounted = useRef(false);

    // Stable ref for callbacks so startScanning doesn't re-create on every render
    const onScanRef = useRef(onScan);
    const onErrorRef = useRef(onError);
    const isActiveRef = useRef(isActive);
    useEffect(() => { onScanRef.current = onScan; }, [onScan]);
    useEffect(() => { onErrorRef.current = onError; }, [onError]);
    useEffect(() => { isActiveRef.current = isActive; }, [isActive]);

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
        isMounted.current = true;
        let cancelled = false;

        async function start() {
            try {
                setError("");

                if (typeof window !== "undefined" && window.isSecureContext === false) {
                    throw new Error("Camera access requires HTTPS or localhost.");
                }

                const codeReader = new BrowserMultiFormatReader();
                const devices = await BrowserMultiFormatReader.listVideoInputDevices();

                if (cancelled) { return; }
                if (devices.length === 0) throw new Error("No camera found");

                const controls = await codeReader.decodeFromVideoDevice(
                    devices[0].deviceId,
                    videoRef.current!,
                    (result) => {
                        if (cancelled) return;
                        if (result && isActiveRef.current) {
                            onScanRef.current(result.getText());
                        }
                    }
                );

                if (cancelled) {
                    // Component was unmounted while we were setting up — kill immediately
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
            }
        }

        start();

        return () => {
            cancelled = true;
            isMounted.current = false;
            killAllTracks();
            setIsScanning(false);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount, cleanup on unmount

    return (
        <div className="relative">
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
        </div>
    );
}
