const nf = new Intl.NumberFormat("nl-BE", { maximumFractionDigits: 1 });
const nfSigned = new Intl.NumberFormat("nl-BE", { maximumFractionDigits: 1, signDisplay: "exceptZero" });

/** 1234.5 → "1.234,5" (nl-BE), maximaal één decimaal. */
export const formatNumber = (n: number): string => nf.format(n);
/** Met teken: +5, −3, 0. */
export const formatSigned = (n: number): string => nfSigned.format(n);

export function formatKg(n: number): string {
  return `${formatNumber(n)} kg`;
}

/** Korte aslabels. */
export function dayAxisLabel(dateKey: string): string {
  return `${Number(dateKey.slice(8, 10))}/${Number(dateKey.slice(5, 7))}`;
}
export function weekAxisLabel(weekKey: string): string {
  return `wk ${Number(weekKey.split("-W")[1])}`;
}
export function monthAxisLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const month = new Intl.DateTimeFormat("nl-BE", { timeZone: "UTC", month: "short" }).format(
    new Date(Date.UTC(y, m - 1, 1))
  );
  return `${month} ${String(y).slice(2)}`;
}
