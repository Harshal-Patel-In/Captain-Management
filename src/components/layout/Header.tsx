"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Package, QrCode, BarChart3, FileText, ClipboardList, LogOut, LayoutGrid, Menu, Factory } from "lucide-react";
import { useState, useEffect } from "react";
import { MobileNav } from "./MobileNav";

const navigation = [
    { name: "Dashboard", href: "/admin", icon: LayoutGrid },
    { name: "Products", href: "/admin/products", icon: Package },
    { name: "Inventory", href: "/admin/inventory", icon: ClipboardList },
    { name: "QR Scan", href: "/admin/qr-scan", icon: QrCode },
    { name: "Logs", href: "/admin/logs", icon: FileText },
    { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    { name: "Production", href: "/admin/production", icon: Factory },
    { name: "Management", href: "/management/orders", icon: ClipboardList },
];

export function Header() {
    const pathname = usePathname();
    const [shouldAnimate, setShouldAnimate] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const hasAnimated = sessionStorage.getItem("headerAnimated");
        if (!hasAnimated) {
            setShouldAnimate(true);
            sessionStorage.setItem("headerAnimated", "true");
        }
    }, []);
    const router = useRouter();

    const handleLogout = () => {
        auth.lock();
        router.push("/unlock");
    };

    return (
        <>
            <header
                className={`border-b-0 bg-secondary/80 backdrop-blur-md sticky top-0 z-40 rounded-b-3xl shadow-lg mx-4 transition-all duration-500 ease-out ${shouldAnimate ? 'animate-slideDown' : ''
                    }`}
            >
                <div className="container mx-auto px-3 py-3 sm:px-4 sm:py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 sm:space-x-8">
                            <Link href="/admin" className="shrink-0">
                                <Image
                                    src="/image.png"
                                    alt="Captain Insecticide"
                                    className="h-8 w-auto sm:h-12"
                                    width={240}
                                    height={48}
                                    priority
                                />
                            </Link>

                            <nav className="hidden lg:flex space-x-1">
                                {navigation.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link key={item.name} href={item.href}>
                                            <Button
                                                variant={isActive ? "default" : "ghost"}
                                                size="sm"
                                                className="gap-2"
                                            >
                                                <Icon className="h-4 w-4" />
                                                {item.name}
                                            </Button>
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
                                <LogOut className="h-4 w-4" />
                                <span className="hidden sm:inline">Lock</span>
                            </Button>

                            {/* Hamburger Menu Button - Mobile/Tablet Only */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsMobileMenuOpen(true)}
                                className="lg:hidden gap-2"
                                aria-label="Open menu"
                            >
                                <Menu className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile Navigation */}
            <MobileNav isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
        </>
    );
}
