import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Delta } from "@/utils/statistics";
import { formatNumber, formatSigned } from "@/utils/format";
import { cn } from "@/lib/utils";

/** Verschil t.o.v. de vorige sessie. Richting wordt met pijl, teken én tekst getoond, nooit alleen met kleur. */
export function DeltaText({ delta, unit = "" }: { delta: Delta | null; unit?: string }) {
  if (!delta) return <span className="text-muted-foreground">–</span>;
  const dir = delta.diff > 0 ? "up" : delta.diff < 0 ? "down" : "same";
  const Icon = dir === "up" ? ArrowUp : dir === "down" ? ArrowDown : Minus;
  const sr = dir === "up" ? "hoger" : dir === "down" ? "lager" : "gelijk";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap",
        dir === "up" && "text-emerald-400",
        dir === "down" && "text-rose-400",
        dir === "same" && "text-muted-foreground"
      )}
    >
      <Icon className="w-3 h-3" aria-hidden />
      <span className="sr-only">{sr}: </span>
      {formatSigned(delta.diff)}
      {unit}
      {delta.percent !== null && delta.diff !== 0 && (
        <span className="text-muted-foreground"> ({formatSigned(delta.percent)}%)</span>
      )}
    </span>
  );
}
