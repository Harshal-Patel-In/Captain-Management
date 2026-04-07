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

function parseDateValue(value: string | Date): Date {
  if (value instanceof Date) {
    return value;
  }

  // Keep plain YYYY-MM-DD stable in local timezones.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  return new Date(value);
}

export function formatDateDDMMYYYY(value: string | Date | null | undefined): string {
  if (!value) return "-";

  const date = parseDateValue(value);
  if (Number.isNaN(date.getTime())) return "-";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  return `${day}-${month}-${year}`;
}

export function formatDateTimeDDMMYYYY(value: string | Date | null | undefined): string {
  if (!value) return "-";

  const date = parseDateValue(value);
  if (Number.isNaN(date.getTime())) return "-";

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${formatDateDDMMYYYY(date)} ${hours}:${minutes}`;
}
