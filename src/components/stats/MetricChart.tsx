import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatNumber } from "@/utils/format";

export interface MetricDatum {
  /** Korte aslabel. */
  label: string;
  /** Uitgebreide titel in de tooltip. */
  tooltipLabel: string;
  /** `null` = geen gegevens: wordt niet getekend en nooit als 0 getoond. */
  value: number | null;
}

interface MetricChartProps {
  kind: "bar" | "line";
  data: MetricDatum[];
  /** Naam van de meting incl. eenheid, bv. "Volume (kg)". Eén meting per grafiek: nooit twee assen. */
  name: string;
  /** Alleen gehele getallen op de as (aantal trainingen, herhalingen). */
  integer?: boolean;
  ariaLabel: string;
}

/** Eén meting, één kleur (het primaire thema), dunne marks en een rustig raster. */
export function MetricChart({ kind, data, name, integer, ariaLabel }: MetricChartProps) {
  const config = { value: { label: name, color: "hsl(var(--primary))" } };
  const common = (
    <>
      <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
      <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" minTickGap={16} />
      <YAxis
        width={48}
        tickLine={false}
        axisLine={false}
        allowDecimals={!integer}
        tickFormatter={(v: number) => formatNumber(v)}
      />
      <ChartTooltip
        cursor={kind === "bar" ? { fill: "hsl(var(--muted) / 0.4)" } : undefined}
        content={
          <ChartTooltipContent
            hideIndicator={false}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.tooltipLabel ?? ""}
            formatter={(value) => (
              <span className="flex w-full justify-between gap-4">
                <span className="text-muted-foreground">{name}</span>
                <span className="font-mono font-medium text-foreground">{formatNumber(Number(value))}</span>
              </span>
            )}
          />
        }
      />
    </>
  );

  return (
    <div role="img" aria-label={ariaLabel}>
      <ChartContainer config={config} className="h-56 w-full">
        {kind === "bar" ? (
          <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
            {common}
            <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        ) : (
          <LineChart data={data} margin={{ left: 0, right: 12, top: 8 }}>
            {common}
            <Line
              dataKey="value"
              type="monotone"
              stroke="var(--color-value)"
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2, className: "fill-background" }}
              activeDot={{ r: 5 }}
              connectNulls={false}
            />
          </LineChart>
        )}
      </ChartContainer>
    </div>
  );
}
