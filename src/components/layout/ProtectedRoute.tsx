"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/auth";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        // Mark as client-side mounted
        setIsClient(true);

        // Check authentication
        if (!auth.isAuthenticated()) {
            router.push("/unlock");
        }
    }, [router]);

    // During SSR and initial render, show nothing to avoid hydration mismatch
    if (!isClient) {
        return null;
    }

    // After mounting, check authentication
    if (!auth.isAuthenticated()) {
        return null;
    }

    return <>{children}</>;
}

