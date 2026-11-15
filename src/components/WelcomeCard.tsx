import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const KEY = "fitnesscoach.welcomeDismissed";

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** Korte uitleg voor wie nog geen trainingen heeft. Verdwijnt vanzelf na de eerste training. */
export function WelcomeCard() {
  const [hidden, setHidden] = useState(wasDismissed);
  if (hidden) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* geen opslag beschikbaar: de kaart komt dan gewoon terug */
    }
  };

  return (
    <section
      aria-label="Welkom"
      className="relative p-5 rounded-2xl border border-primary/30 bg-primary/10"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-8 w-8"
        aria-label="Uitleg sluiten"
        onClick={dismiss}
      >
        <X className="w-4 h-4" />
      </Button>
      <h2 className="text-base font-semibold text-foreground mb-2">Welkom! Zo werkt het</h2>
      <ol className="list-decimal pl-5 text-sm text-foreground space-y-1">
        <li>Kies een schema of voeg zelf oefeningen toe.</li>
        <li>Vul je gewicht en herhalingen per set in.</li>
        <li>Tik na elke set op het rondje om hem af te vinken.</li>
        <li>Sla op. Volgende keer zie je meteen wat je vorige keer deed.</li>
      </ol>
    </section>
  );
}
