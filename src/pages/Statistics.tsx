import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Dumbbell } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartCard } from "@/components/stats/ChartCard";
import { MetricChart, MetricDatum } from "@/components/stats/MetricChart";
import { StatsFilters } from "@/components/stats/StatsFilters";
import { DEFAULT_FILTERS, FilterState } from "@/components/stats/filterState";
import { RecordsTable } from "@/components/stats/RecordsTable";
import { ComparisonList } from "@/components/stats/ComparisonList";
import { SessionHistoryList } from "@/components/stats/SessionHistoryList";
import { useWorkoutLogs } from "@/hooks/useWorkoutLogs";
import { TrainingType } from "@/types/workout";
import {
  assessDataQuality,
  buildSessions,
  compareWithPrevious,
  compareWorkoutTotals,
  countPerPeriod,
  exerciseProgression,
  filterSessions,
  listExercises,
  personalRecords,
  resolvePeriod,
  summarize,
  volumePerPeriod,
  volumePerSession,
} from "@/utils/statistics";
import {
  describeWorkoutMoment,
  formatMonthLabel,
  formatShortDate,
  formatWeekLabel,
  getDeviceTimeZone,
  toDateKey,
} from "@/utils/dates";
import { dayAxisLabel, formatKg, formatNumber, monthAxisLabel, weekAxisLabel } from "@/utils/format";

type Granularity = "week" | "month";
type VolumeGranularity = "session" | Granularity;

const Statistics = () => {
  const { workouts, isLoading, storageInfo } = useWorkoutLogs();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [countBy, setCountBy] = useState<Granularity>("week");
  const [volumeBy, setVolumeBy] = useState<VolumeGranularity>("session");
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);

  const built = useMemo(() => buildSessions(workouts), [workouts]);
  const quality = useMemo(() => assessDataQuality(built), [built]);
  const today = toDateKey(new Date(), getDeviceTimeZone());
  const range = useMemo(
    () => resolvePeriod(filters.preset, today, { from: filters.customFrom, to: filters.customTo }),
    [filters.preset, filters.customFrom, filters.customTo, today]
  );

  // Oefeningenlijst en types volgen periode en type, niet het oefeningfilter zelf.
  const periodSessions = useMemo(
    () => filterSessions(built.sessions, { ...range, trainingTypes: filters.types }),
    [built.sessions, range, filters.types]
  );
  const exerciseOptions = useMemo(() => listExercises(periodSessions), [periodSessions]);
  const availableTypes = useMemo(
    () => [...new Set(built.sessions.map((s) => s.trainingType))] as TrainingType[],
    [built.sessions]
  );
  const sessions = useMemo(
    () => filterSessions(built.sessions, { ...range, trainingTypes: filters.types, exerciseKey: filters.exerciseKey }),
    [built.sessions, range, filters.types, filters.exerciseKey]
  );
  const newestFirst = useMemo(() => [...sessions].reverse(), [sessions]);
  const summary = useMemo(() => summarize(sessions), [sessions]);

  const periodRange = useMemo(
    () => (filters.preset === "all" ? undefined : { from: range.from, to: range.to ?? today }),
    [filters.preset, range.from, range.to, today]
  );

  // --- Aantal trainingen
  const counts = useMemo(() => countPerPeriod(sessions, countBy, periodRange), [sessions, countBy, periodRange]);
  const countData: MetricDatum[] = counts.map((c) => ({
    label: countBy === "week" ? weekAxisLabel(c.key) : monthAxisLabel(c.key),
    tooltipLabel: countBy === "week" ? formatWeekLabel(c.key) : formatMonthLabel(c.key),
    value: c.count,
  }));

  // --- Volume
  const volumeData: MetricDatum[] = useMemo(() => {
    if (volumeBy === "session") {
      return volumePerSession(sessions)
        .filter((p) => p.volume !== null)
        .map((p) => ({ label: dayAxisLabel(p.dateKey), tooltipLabel: formatShortDate(p.dateKey) + (p.trainingType !== "Onbekend" ? ` · ${p.trainingType}` : ""), value: p.volume }));
    }
    return volumePerPeriod(sessions, volumeBy, periodRange).map((p) => ({
      label: volumeBy === "week" ? weekAxisLabel(p.key) : monthAxisLabel(p.key),
      tooltipLabel: volumeBy === "week" ? formatWeekLabel(p.key) : formatMonthLabel(p.key),
      value: p.volume,
    }));
  }, [sessions, volumeBy, periodRange]);

  // --- Progressie
  const progression = useMemo(
    () => (filters.exerciseKey ? exerciseProgression(sessions, filters.exerciseKey) : []),
    [sessions, filters.exerciseKey]
  );
  const selectedExercise = exerciseOptions.find((o) => o.key === filters.exerciseKey);
  const progressionData = (pick: (p: (typeof progression)[number]) => number): MetricDatum[] =>
    progression.map((p) => ({ label: dayAxisLabel(p.dateKey), tooltipLabel: formatShortDate(p.dateKey), value: pick(p) }));

  // --- Records
  const records = useMemo(() => personalRecords(sessions, filters.exerciseKey), [sessions, filters.exerciseKey]);

  // --- Vergelijking met vorige sessie
  const selectedSession =
    newestFirst.find((s) => s.workoutId === selectedWorkoutId) ?? newestFirst[0] ?? null;
  const comparison = useMemo(
    () => (selectedSession ? compareWithPrevious(built.sessions, selectedSession) : []),
    [built.sessions, selectedSession]
  );
  const workoutComparison = useMemo(
    () => (selectedSession ? compareWorkoutTotals(built.sessions, selectedSession) : undefined),
    [built.sessions, selectedSession]
  );

  const header = <AppHeader containerClassName="max-w-3xl" />;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        {header}
        <main className="container max-w-3xl py-6">
          <p className="text-sm text-muted-foreground">Gegevens laden…</p>
        </main>
      </div>
    );
  }

  if (workouts.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        {header}
        <main className="container max-w-3xl py-6">
          <section className="p-8 rounded-2xl gradient-card border border-border text-center space-y-3">
            <BarChart3 className="w-10 h-10 mx-auto text-muted-foreground" aria-hidden />
            <h2 className="text-lg font-semibold text-foreground">Nog geen statistieken</h2>
            <p className="text-sm text-muted-foreground">Log je eerste workout om je voortgang te zien.</p>
            <Button asChild>
              <Link to="/">
                <Dumbbell className="w-4 h-4 mr-2" />
                Naar je training
              </Link>
            </Button>
          </section>
        </main>
      </div>
    );
  }

  const volumeEmptyMessage =
    sessions.length === 0 ? "Geen workouts voor deze selectie." : "Geen setgegevens (gewicht en herhalingen) voor deze selectie.";

  return (
    <div className="min-h-screen bg-background">
      {header}

      <main className="container max-w-3xl py-6 space-y-6">
        {(storageInfo.warnings.length > 0 || storageInfo.readOnly) && (
          <Alert variant="destructive">
            <AlertTitle>Let op bij het laden van je gegevens</AlertTitle>
            <AlertDescription className="text-xs">
              {storageInfo.warnings.slice(0, 3).join(" ")} Er is niets verwijderd.
            </AlertDescription>
          </Alert>
        )}

        <StatsFilters
          value={filters}
          onChange={setFilters}
          exerciseOptions={exerciseOptions}
          availableTypes={availableTypes}
        />

        {(quality.withoutDate > 0 || quality.withoutSetData > 0) && (
          <Alert>
            <AlertTitle>Niet alle workouts kunnen volledig meetellen</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4 text-xs space-y-0.5">
                {quality.withoutDate > 0 && (
                  <li>
                    {quality.withoutDate} workout{quality.withoutDate === 1 ? "" : "s"} zonder geldige datum zijn niet
                    opgenomen in de grafieken en filters.
                  </li>
                )}
                {quality.withoutSetData > 0 && (
                  <li>
                    {quality.withoutSetData} workout{quality.withoutSetData === 1 ? "" : "s"} zonder setgegevens tellen
                    mee als training, maar niet in volume en progressie.
                  </li>
                )}
              </ul>
              <p className="text-xs mt-1">Er worden geen waarden ingevuld die niet geregistreerd zijn.</p>
            </AlertDescription>
          </Alert>
        )}

        <section className="grid grid-cols-3 gap-3" aria-label="Samenvatting">
          {[
            { label: "Trainingen", value: formatNumber(summary.sessions) },
            { label: "Totaal volume", value: formatKg(summary.totalVolume) },
            { label: "Oefeningen", value: formatNumber(summary.exercises) },
          ].map((k) => (
            <div key={k.label} className="p-4 rounded-xl gradient-card border border-border">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{k.label}</p>
              <p className="text-xl font-bold text-foreground mt-1">{k.value}</p>
            </div>
          ))}
        </section>

        <ChartCard
          title="Trainingen per periode"
          description="Aantal opgeslagen trainingen. Meerdere trainingen op één dag tellen afzonderlijk; weken lopen van maandag tot zondag."
          isEmpty={sessions.length === 0}
          emptyMessage="Geen workouts voor deze selectie."
          tableHeaders={[countBy === "week" ? "Week" : "Maand", "Trainingen"]}
          tableRows={countData.map((d) => [d.tooltipLabel, d.value ?? 0])}
          actions={
            <Tabs value={countBy} onValueChange={(v) => setCountBy(v as Granularity)}>
              <TabsList aria-label="Indeling van het aantal trainingen">
                <TabsTrigger value="week">Per week</TabsTrigger>
                <TabsTrigger value="month">Per maand</TabsTrigger>
              </TabsList>
            </Tabs>
          }
        >
          <MetricChart kind="bar" data={countData} name="Trainingen" integer ariaLabel={`Staafgrafiek: aantal trainingen per ${countBy === "week" ? "week" : "maand"}`} />
        </ChartCard>

        <ChartCard
          title="Trainingsvolume over tijd"
          description="Volume = gewicht × herhalingen, opgeteld over alle sets (kg). Dit is iets anders dan het gewicht van één set."
          isEmpty={volumeData.length === 0}
          emptyMessage={volumeEmptyMessage}
          tableHeaders={[volumeBy === "session" ? "Training" : volumeBy === "week" ? "Week" : "Maand", "Volume (kg)"]}
          tableRows={volumeData.map((d) => [d.tooltipLabel, d.value === null ? "–" : formatNumber(d.value)])}
          actions={
            <Tabs value={volumeBy} onValueChange={(v) => setVolumeBy(v as VolumeGranularity)}>
              <TabsList aria-label="Indeling van het trainingsvolume">
                <TabsTrigger value="session">Per training</TabsTrigger>
                <TabsTrigger value="week">Per week</TabsTrigger>
                <TabsTrigger value="month">Per maand</TabsTrigger>
              </TabsList>
            </Tabs>
          }
        >
          <MetricChart
            kind={volumeBy === "session" ? "line" : "bar"}
            data={volumeData}
            name="Volume (kg)"
            ariaLabel="Grafiek: totaal trainingsvolume in kg over tijd"
          />
        </ChartCard>

        <section className="space-y-3" aria-label="Progressie per oefening">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Progressie{selectedExercise ? `: ${selectedExercise.name}` : " per oefening"}
            </h2>
            <p className="text-xs text-muted-foreground">
              Per sessie van de gekozen oefening. Gewicht = zwaarste set; herhalingen = totaal over alle sets; volume =
              gewicht × herhalingen over alle sets.
            </p>
          </div>

          {!filters.exerciseKey ? (
            <div className="p-5 rounded-2xl gradient-card border border-border space-y-3">
              <p className="text-sm text-muted-foreground">Kies een oefening om de progressie te zien.</p>
              <div className="flex flex-wrap gap-2">
                {exerciseOptions.slice(0, 6).map((o) => (
                  <Button
                    key={o.key}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setFilters({ ...filters, exerciseKey: o.key })}
                  >
                    {o.name}
                  </Button>
                ))}
                {exerciseOptions.length === 0 && (
                  <span className="text-xs text-muted-foreground">Geen oefeningen met setgegevens in deze selectie.</span>
                )}
              </div>
            </div>
          ) : (
            <>
              <ChartCard
                title="Gewicht (zwaarste set)"
                isEmpty={progression.length === 0}
                emptyMessage="Geen setgegevens voor deze oefening in deze selectie."
                tableHeaders={["Datum", "Zwaarste set (kg)"]}
                tableRows={progression.map((p) => [formatShortDate(p.dateKey), formatNumber(p.maxWeight)])}
              >
                <MetricChart kind="line" data={progressionData((p) => p.maxWeight)} name="Gewicht (kg)" ariaLabel="Lijngrafiek: zwaarste set per sessie in kg" />
              </ChartCard>
              <ChartCard
                title="Herhalingen (totaal per sessie)"
                isEmpty={progression.length === 0}
                tableHeaders={["Datum", "Herhalingen", "Sets"]}
                tableRows={progression.map((p) => [formatShortDate(p.dateKey), formatNumber(p.totalReps), p.setCount])}
              >
                <MetricChart kind="line" data={progressionData((p) => p.totalReps)} name="Herhalingen" integer ariaLabel="Lijngrafiek: totaal aantal herhalingen per sessie" />
              </ChartCard>
              <ChartCard
                title="Volume van de oefening"
                isEmpty={progression.length === 0}
                tableHeaders={["Datum", "Volume (kg)"]}
                tableRows={progression.map((p) => [formatShortDate(p.dateKey), formatNumber(p.exerciseVolume)])}
              >
                <MetricChart kind="line" data={progressionData((p) => p.exerciseVolume)} name="Volume (kg)" ariaLabel="Lijngrafiek: volume van de oefening per sessie in kg" />
              </ChartCard>
            </>
          )}
        </section>

        <section className="p-5 rounded-2xl gradient-card border border-border space-y-3" aria-label="Persoonlijke records">
          <div>
            <h2 className="text-base font-semibold text-foreground">Persoonlijke records</h2>
            <p className="text-xs text-muted-foreground">
              Binnen de gekozen filters. Zwaarste set: hoogste gewicht in één set. Beste set: hoogste gewicht × reps in
              één set. Oefeningvolume: hoogste totaal in één sessie. Bij gelijke waarden telt de eerste.
            </p>
          </div>
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nog geen records in deze selectie.</p>
          ) : (
            <RecordsTable records={records} />
          )}
        </section>

        <section className="p-5 rounded-2xl gradient-card border border-border space-y-3" aria-label="Vooruitgang ten opzichte van de vorige sessie">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-base font-semibold text-foreground">Vooruitgang t.o.v. vorige sessie</h2>
              <p className="text-xs text-muted-foreground">
                Elke oefening wordt vergeleken met de vorige keer dat je die deed, ook buiten de gekozen periode.
              </p>
            </div>
            {newestFirst.length > 0 && selectedSession && (
              <Select value={selectedSession.workoutId} onValueChange={setSelectedWorkoutId}>
                <SelectTrigger className="w-64 bg-background border-border" aria-label="Kies een sessie">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {newestFirst.slice(0, 50).map((s) => (
                    <SelectItem key={s.workoutId} value={s.workoutId}>
                      {describeWorkoutMoment(s.startedAt, s.timeZone)}
                      {s.trainingType !== "Onbekend" ? ` · ${s.trainingType}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          {selectedSession ? (
            <ComparisonList rows={comparison} workout={workoutComparison} />
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center">Geen workouts voor deze selectie.</p>
          )}
        </section>

        <section className="p-5 rounded-2xl gradient-card border border-border space-y-3" aria-label="Historiek">
          <div>
            <h2 className="text-base font-semibold text-foreground">Historiek</h2>
            <p className="text-xs text-muted-foreground">
              Eerdere sessies, nieuwste eerst. Open een sessie voor de sets en de vergelijking met de vorige keer.
            </p>
          </div>
          {newestFirst.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Geen workouts voor deze selectie.</p>
          ) : (
            <SessionHistoryList sessions={newestFirst} allSessions={built.sessions} />
          )}
        </section>
      </main>
    </div>
  );
};

export default Statistics;
