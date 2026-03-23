"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/layout/PageTransition";
import { ArrowLeft, ClipboardList, CreditCard, MessageSquare, Package, ShieldCheck, Users } from "lucide-react";

const navItems = [
    { href: "/management/orders", label: "Orders", icon: ClipboardList, hint: "Review, approve, and dispatch" },
    { href: "/management/products", label: "Products", icon: Package, hint: "Publish catalog and stock" },
    { href: "/management/payments", label: "Payments", icon: CreditCard, hint: "Track receipts and dues" },
    { href: "/management/users", label: "Users", icon: Users, hint: "Manage customer accounts" },
    { href: "/management/chat", label: "Chat", icon: MessageSquare, hint: "Message customers directly" },
];

export default function ManagementLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    const activeItem = navItems.find((item) => pathname.startsWith(item.href)) ?? navItems[0];

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#f4f1ea]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(209,86,56,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(11,29,21,0.08),transparent_24%)]" />
            <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-white/45 blur-3xl" />

            <header className="sticky top-0 z-50 px-2 pt-2 sm:px-4 sm:pt-4">
                <div className="mx-auto max-w-7xl overflow-hidden rounded-[1.4rem] border border-[#0b1d15]/10 bg-[#f4f1ea]/86 shadow-[0_20px_80px_rgba(11,29,21,0.08)] backdrop-blur-md sm:rounded-[2rem]">
                    <div className="border-b border-[#0b1d15]/8 px-4 py-3 sm:px-5 sm:py-4 md:border-b-0 md:px-6">
                        <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-center gap-3 sm:gap-4">
                                <Link href="/management/orders" className="shrink-0 rounded-xl bg-white/80 p-1.5 shadow-sm sm:rounded-2xl sm:p-2">
                                    <Image src="/image.png" alt="Captain Insecticide" className="h-8 w-auto sm:h-12" width={240} height={48} priority />
                                </Link>
                                <div className="space-y-0.5 sm:space-y-1">
                                    <div className="inline-flex items-center gap-1.5 rounded-full border border-[#0b1d15]/10 bg-white/70 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.2em] text-[#0b1d15]/60 sm:gap-2 sm:px-3 sm:py-1 sm:text-xs">
                                        <ShieldCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                        Management Console
                                    </div>
                                    <div>
                                        <h1 className="text-lg font-semibold text-[#0b1d15] sm:text-2xl">Operations and commerce control</h1>
                                        <p className="hidden text-sm text-[#0b1d15]/62 sm:block">Aligned with the admin theme, but focused on approvals, receivables, and catalog publishing.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                <div className="hidden rounded-2xl border border-[#0b1d15]/8 bg-white/60 px-4 py-3 text-sm text-[#0b1d15]/68 sm:block">
                                    <div className="font-medium text-[#0b1d15]">Active area</div>
                                    <div>{activeItem.label} • {activeItem.hint}</div>
                                </div>
                                <Link href="/admin">
                                    <Button variant="outline" className="gap-2 rounded-xl border-[#0b1d15]/15 bg-white/75 text-sm text-[#0b1d15] hover:bg-white">
                                        <ArrowLeft className="h-4 w-4" />
                                        <span className="hidden sm:inline">Back to Admin</span>
                                        <span className="sm:hidden">Admin</span>
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Desktop inline nav — hidden on mobile (bottom bar used instead) */}
                    <nav className="hidden md:block md:px-6 md:pb-3 md:pt-1">
                        <div className="flex gap-2">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname.startsWith(item.href);
                                return (
                                    <Link key={item.href} href={item.href} className="flex-1">
                                        <div className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-all duration-200 ${isActive
                                            ? "border-[#0b1d15] bg-[#0b1d15] text-[#f4f1ea] shadow-[0_8px_24px_rgba(11,29,21,0.15)]"
                                            : "border-[#0b1d15]/10 bg-white/72 text-[#0b1d15] hover:border-[#0b1d15]/20 hover:bg-white"
                                            }`}>
                                            <Icon className="h-4 w-4" />
                                            <span>{item.label}</span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </nav>
                </div>
            </header>

            <main className="relative mx-auto max-w-7xl px-3 py-4 pb-20 sm:px-4 sm:py-6 md:py-8 md:pb-8">
                <PageTransition>{children}</PageTransition>
            </main>

            {/* Fixed bottom tab bar — mobile only */}
            <nav className="fixed inset-x-0 bottom-0 z-50 md:hidden">
                <div className="pointer-events-none px-3 pb-[max(0.7rem,env(safe-area-inset-bottom))] pt-1.5">
                    <div
                        className="pointer-events-auto relative isolate mx-auto flex max-w-md items-stretch justify-around overflow-hidden rounded-4xl border border-white/65 bg-white/20 shadow-[0_18px_42px_rgba(11,29,21,0.26),0_6px_18px_rgba(11,29,21,0.18),inset_0_1px_0_rgba(255,255,255,0.8)] ring-1 ring-black/10"
                        style={{
                            backdropFilter: "blur(30px) saturate(185%)",
                            WebkitBackdropFilter: "blur(30px) saturate(185%)",
                        }}
                    >
                        <span className="pointer-events-none absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-white/95 to-transparent" />
                        <span className="pointer-events-none absolute -left-12 -top-16 h-32 w-44 rotate-12 rounded-full bg-white/55 blur-2xl" />
                        <span className="pointer-events-none absolute -bottom-10 -right-10 h-24 w-32 rounded-full bg-white/35 blur-2xl" />
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname.startsWith(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`relative flex flex-1 flex-col items-center gap-0.5 pb-1.5 pt-1.5 text-[10px] font-medium transition-all duration-200 ${
                                        isActive
                                            ? "text-[#1f2937]"
                                            : "text-[#0b1d15]/44 active:text-[#0b1d15]/70"
                                    }`}
                                >
                                    {isActive && (
                                        <>
                                            <span className="absolute inset-x-2 inset-y-1 rounded-3xl border border-white/75 bg-white/52 shadow-[inset_0_1px_0_rgba(255,255,255,0.98),0_8px_18px_rgba(11,29,21,0.15)]" />
                                            <span className="absolute top-0.5 h-0.5 w-10 rounded-full bg-[#111827]/70" />
                                        </>
                                    )}
                                    <span className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200 ${isActive ? "bg-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.96),0_4px_10px_rgba(11,29,21,0.14)]" : ""}`}>
                                        <Icon className={`h-4.5 w-4.5 transition-transform duration-200 ${isActive ? "scale-105 text-[#111827]" : "text-[#0b1d15]/65"}`} />
                                    </span>
                                    <span className={`relative z-10 tracking-tight ${isActive ? "opacity-95" : "opacity-75"}`}>{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </nav>
        </div>
    );
}
