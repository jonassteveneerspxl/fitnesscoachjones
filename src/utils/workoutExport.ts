import { Workout } from "@/types/workout";
import { CURRENT_SCHEMA_VERSION } from "@/utils/workoutStorage";
import { getDeviceTimeZone, toDateKey } from "@/utils/dates";

export const EXPORT_APP_ID = "fitnesscoachjones";
export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

export interface ExportPayload {
  app: typeof EXPORT_APP_ID;
  schemaVersion: number;
  exportedAt: string;
  workouts: Workout[];
}

export function buildExport(workouts: Workout[], now: Date = new Date()): ExportPayload {
  return {
    app: EXPORT_APP_ID,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    workouts,
  };
}

export function exportFileName(now: Date = new Date()): string {
  return `${EXPORT_APP_ID}-export-${toDateKey(now, getDeviceTimeZone())}.json`;
}

export interface ParsedImport {
  ok: boolean;
  items: unknown[];
  message?: string;
}

/**
 * Leest de tekst van een importbestand. Accepteert een export van deze app, of een kale array (oud formaat).
 * Alleen structuur wordt hier gecontroleerd; de inhoud wordt per workout gevalideerd bij het importeren.
 */
export function parseImportText(text: string): ParsedImport {
  if (text.length > MAX_IMPORT_BYTES) {
    return { ok: false, items: [], message: "Het bestand is te groot om te importeren." };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, items: [], message: "Dit is geen geldig JSON-bestand." };
  }
  if (Array.isArray(parsed)) return { ok: true, items: parsed };
  if (typeof parsed === "object" && parsed !== null) {
    const obj = parsed as Record<string, unknown>;
    if (typeof obj.schemaVersion === "number" && obj.schemaVersion > CURRENT_SCHEMA_VERSION) {
      return {
        ok: false,
        items: [],
        message: "Dit bestand is gemaakt met een nieuwere versie van de app en kan niet gelezen worden.",
      };
    }
    if (Array.isArray(obj.workouts)) return { ok: true, items: obj.workouts };
  }
  return { ok: false, items: [], message: "Geen workouts gevonden in dit bestand." };
}
