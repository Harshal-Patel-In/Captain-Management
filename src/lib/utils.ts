import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatQuantity(value: number | string | null | undefined, fractionDigits = 3): string {
  const numericValue = typeof value === "string" ? Number(value) : value;

  if (numericValue === null || numericValue === undefined || Number.isNaN(numericValue)) {
    return (0).toFixed(fractionDigits);
  }

  const normalized = Math.abs(numericValue) < 0.0005 ? 0 : numericValue;
  return normalized.toFixed(fractionDigits);
}
