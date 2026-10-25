import { useEffect, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export const DEFAULT_REST_SECONDS = 90;
const STEP_SECONDS = 30;

export function formatRest(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

interface RestTimerProps {
  /** Moment (ms sinds epoch) waarop de rust voorbij is. */
  endsAt: number;
  onChange: (endsAt: number) => void;
  onClose: () => void;
  now?: () => number;
}

/** Rusttimer onderaan het scherm. Rekent op de eindtijd, dus blijft kloppen als de telefoon even in slaap valt. */
export function RestTimer({ endsAt, onChange, onClose, now = Date.now }: RestTimerProps) {
  const [current, setCurrent] = useState(now());
  useEffect(() => {
    setCurrent(now());
    const id = setInterval(() => setCurrent(now()), 250);
    return () => clearInterval(id);
  }, [endsAt, now]);

  const remaining = (endsAt - current) / 1000;
  const done = remaining <= 0;

  useEffect(() => {
    if (done && typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate([200, 100, 200]);
      } catch {
        // Trillen is een extraatje; niet alle toestellen ondersteunen het.
      }
    }
  }, [done]);

  return (
    <div
      role="timer"
      aria-live="off"
      className="fixed inset-x-0 bottom-20 z-20 mx-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-primary/40 bg-card/95 backdrop-blur-sm shadow-lg p-3 flex items-center gap-2"
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{done ? "Rust voorbij" : "Rust"}</p>
        <p className={`text-2xl font-bold tabular-nums ${done ? "text-primary" : "text-foreground"}`} data-testid="rest-time">
          {done ? "Volgende set!" : formatRest(remaining)}
        </p>
      </div>
      <Button type="button" variant="outline" size="icon" aria-label="30 seconden korter" onClick={() => onChange(endsAt - STEP_SECONDS * 1000)}>
        <Minus className="w-4 h-4" />
      </Button>
      <Button type="button" variant="outline" size="icon" aria-label="30 seconden langer" onClick={() => onChange(Math.max(endsAt, now()) + STEP_SECONDS * 1000)}>
        <Plus className="w-4 h-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" aria-label="Rusttimer sluiten" onClick={onClose}>
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
