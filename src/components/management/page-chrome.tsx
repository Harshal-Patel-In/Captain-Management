import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ManagementPageHero({
    eyebrow,
    title,
    description,
    actions,
    children,
}: {
    eyebrow: string;
    title: string;
    description: string;
    actions?: ReactNode;
    children?: ReactNode;
}) {
    return (
        <section className="relative overflow-hidden rounded-[1.4rem] border border-[#0b1d15]/10 bg-linear-to-br from-[#fbf7ef] via-[#f4f1ea] to-[#eaddcf] p-4 shadow-[0_24px_80px_rgba(11,29,21,0.08)] sm:rounded-[2rem] sm:p-6 md:p-8">
            <div className="absolute -right-16 top-0 h-40 w-40 rounded-full bg-[#d15638]/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-36 w-36 rounded-full bg-[#0b1d15]/6 blur-3xl" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl space-y-3">
                    <div className="inline-flex items-center rounded-full border border-[#0b1d15]/10 bg-white/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-[#0b1d15]/65">
                        {eyebrow}
                    </div>
                    <div className="space-y-2">
                        <h1 className="font-serif text-2xl leading-none text-[#0b1d15] sm:text-3xl md:text-5xl">
                            {title}
                        </h1>
                        <p className="max-w-xl text-sm leading-6 text-[#0b1d15]/68 md:text-base">
                            {description}
                        </p>
                    </div>
                </div>
                {actions ? <div className="relative flex flex-wrap items-center gap-3">{actions}</div> : null}
            </div>
            {children ? <div className="relative mt-6">{children}</div> : null}
        </section>
    );
}

export function ManagementMetricCard({
    label,
    value,
    meta,
    icon: Icon,
    tint = "emerald",
}: {
    label: string;
    value: ReactNode;
    meta?: ReactNode;
    icon: LucideIcon;
    tint?: "emerald" | "amber" | "blue" | "terracotta";
}) {
    const tintClasses = {
        emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
        amber: "bg-amber-50 text-amber-700 border-amber-100",
        blue: "bg-sky-50 text-sky-700 border-sky-100",
        terracotta: "bg-[#f7e1da] text-[#b24c34] border-[#efc5b8]",
    };

    return (
        <Card className="border-[#0b1d15]/10 bg-white/80 shadow-[0_10px_30px_rgba(11,29,21,0.06)] backdrop-blur-sm">
            <CardContent className="flex items-start justify-between gap-3 p-4 sm:gap-4 sm:p-5">
                <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#0b1d15]/55">{label}</p>
                    <div className="text-2xl font-semibold text-[#0b1d15]">{value}</div>
                    {meta ? <div className="text-sm text-[#0b1d15]/58">{meta}</div> : null}
                </div>
                <div className={cn("rounded-2xl border p-3", tintClasses[tint])}>
                    <Icon className="h-5 w-5" />
                </div>
            </CardContent>
        </Card>
    );
}

export function ManagementSectionCard({
    title,
    description,
    action,
    children,
    className,
}: {
    title: string;
    description?: string;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <Card className={cn("border-[#0b1d15]/10 bg-white/82 shadow-[0_18px_60px_rgba(11,29,21,0.06)] backdrop-blur-sm", className)}>
            <CardHeader className="flex flex-col gap-3 border-b border-[#0b1d15]/8 pb-5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="space-y-1.5">
                    <CardTitle className="text-xl text-[#0b1d15]">{title}</CardTitle>
                    {description ? <CardDescription className="text-[#0b1d15]/60">{description}</CardDescription> : null}
                </div>
                {action ? <div className="shrink-0">{action}</div> : null}
            </CardHeader>
            <CardContent className="p-4 sm:p-6">{children}</CardContent>
        </Card>
    );
}