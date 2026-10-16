import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Workout } from "@/types/workout";
import { ImportResult } from "@/utils/workoutStorage";
import { buildExport, exportFileName, parseImportText } from "@/utils/workoutExport";

interface DataManagerProps {
  workouts: Workout[];
  onImport: (items: unknown[]) => Promise<ImportResult>;
  disabled?: boolean;
}

export function DataManager({ workouts, onImport, disabled }: DataManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [report, setReport] = useState<{ title: string; lines: string[] } | null>(null);

  const handleExport = () => {
    const payload = buildExport(workouts);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportFileName();
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`${workouts.length} workout${workouts.length === 1 ? "" : "s"} geëxporteerd.`);
  };

  const handleFile = async (file: File) => {
    const parsed = parseImportText(await file.text());
    if (!parsed.ok) {
      setReport({ title: "Import mislukt", lines: [parsed.message ?? "Onbekende fout."] });
      return;
    }
    const result = await onImport(parsed.items);
    if (!result.ok) {
      setReport({ title: "Import mislukt", lines: [result.message ?? "Onbekende fout."] });
      return;
    }
    const lines = [
      `${result.imported} geïmporteerd`,
      `${result.skippedDuplicates} stonden er al (identiek)`,
      `${result.conflicts} niet overgenomen omdat het id al bestaat met andere inhoud`,
      `${result.invalid} ongeldig`,
      ...result.warnings.slice(0, 5),
    ];
    setReport({ title: "Import klaar", lines });
    if (result.imported > 0) toast.success(`${result.imported} workout(s) geïmporteerd.`);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Button type="button" variant="outline" onClick={handleExport} disabled={disabled || workouts.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          Exporteer (JSON)
        </Button>
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={disabled}>
          <Upload className="w-4 h-4 mr-2" />
          Importeer (JSON)
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          aria-label="Importeer JSON-bestand"
          data-testid="import-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void handleFile(file);
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Importeren voegt alleen toe: bestaande workouts worden nooit overschreven of verwijderd.
      </p>
      {report && (
        <Alert>
          <AlertTitle>{report.title}</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4 text-xs space-y-0.5">
              {report.lines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
            <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setReport(null)}>
              Sluiten
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
