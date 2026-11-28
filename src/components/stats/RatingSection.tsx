import { MetricChart } from "@/components/stats/MetricChart";
import { formatShortDate } from "@/utils/dates";
import { ratingEmoji, ratingLabel, type RatingStats } from "@/utils/rating";

const fmt = (n: number) => n.toLocaleString("nl-BE", { maximumFractionDigits: 1 });

/** "Hoe gingen mijn trainingen?": gemiddelde per week en het verloop van je beoordelingen. Verschijnt pas met beoordelingen. */
export function RatingSection({ stats }: { stats: RatingStats }) {
  if (stats.rated === 0) return null;
  const data = stats.points.map((p) => ({
    label: formatShortDate(p.dateKey),
    tooltipLabel: `${formatShortDate(p.dateKey)} · ${ratingLabel(p.rating)}`,
    value: p.rating,
  }));
  return (
    <div className="p-4 rounded-2xl gradient-card border border-border space-y-3" data-testid="rating-section">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Hoe gingen je trainingen?</h3>
        <p className="text-xs text-muted-foreground">Je eigen cijfers, 1 (zware dag) tot 10 (topdag).</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Deze week", v: stats.thisWeekAvg },
          { label: "Vorige week", v: stats.lastWeekAvg },
        ].map(({ label, v }) => (
          <div key={label}>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold text-foreground">
              {v === null ? "–" : `${ratingEmoji(Math.round(v))} ${fmt(v)}`}
            </p>
          </div>
        ))}
      </div>
      {data.length >= 2 && <MetricChart kind="line" data={data} name="Beoordeling" integer ariaLabel="Verloop van je beoordelingen" />}
    </div>
  );
}
