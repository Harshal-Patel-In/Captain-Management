"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Unlock } from "lucide-react";

export default function UnlockPage() {
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [error, setError] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // If already authenticated, redirect to dashboard
    useEffect(() => {
        if (auth.isAuthenticated()) {
            router.push("/admin");
        }
    }, [router]);

    const handleUnlock = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(false);

        // Small delay to simulate processing
        setTimeout(() => {
            if (auth.unlock(password)) {
                router.push("/admin");
            } else {
                setError(true);
                setIsLoading(false);
            }
        }, 500);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md shadow-lg border-2 bg-gray-100">
                <CardHeader className="text-center">
                    <div className="mx-auto bg-primary/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                        <Lock className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Unlock Dashboard</CardTitle>
                    <CardDescription>
                        Enter the access code to manage inventory.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleUnlock}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">Access Code</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setError(false);
                                }}
                                className={error ? "border-red-500 focus-visible:ring-red-500" : ""}
                                autoFocus
                            />
                            {error && (
                                <p className="text-sm text-red-500 font-medium animate-pulse">
                                    Incorrect access code
                                </p>
                            )}
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button
                            type="submit"
                            className="w-full gap-2 mt-4"
                            disabled={isLoading || !password}
                        >
                            {isLoading ? (
                                "Unlocking..."
                            ) : (
                                <>
                                    Unlock <Unlock className="w-4 h-4 ml-1" />
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
