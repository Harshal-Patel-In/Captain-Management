"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Package, QrCode, BarChart3, FileText, ClipboardList, LayoutGrid, X, Factory } from "lucide-react";
import { useEffect } from "react";

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

interface MobileNavProps {
    isOpen: boolean;
    onClose: () => void;
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
    const pathname = usePathname();

    // Close menu on ESC key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
            // Prevent body scroll when menu is open
            document.body.style.overflow = "hidden";
        }

        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "unset";
        };
    }, [isOpen, onClose]);

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                    }`}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Sidebar */}
            <div
                className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-secondary/95 backdrop-blur-md shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"
                    }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-300">
                    <h2 className="text-lg font-semibold text-[#0b1d15]">Menu</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        aria-label="Close menu"
                    >
                        <X className="h-5 w-5 text-gray-700" />
                    </button>
                </div>

                {/* Navigation Links */}
                <nav className="flex flex-col p-4 space-y-2">
                    {navigation.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link key={item.name} href={item.href} onClick={onClose}>
                                <Button
                                    variant={isActive ? "default" : "ghost"}
                                    size="lg"
                                    className="w-full justify-start gap-3 text-base"
                                >
                                    <Icon className="h-5 w-5" />
                                    {item.name}
                                </Button>
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </>
    );
}
