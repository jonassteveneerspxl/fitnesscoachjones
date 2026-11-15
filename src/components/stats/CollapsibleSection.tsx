import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface Props {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  /** Naam van het gebied voor schermlezers; standaard de titel. */
  ariaLabel?: string;
  children: ReactNode;
}

/** Inklapbaar blok op basis van <details>: werkt met toetsenbord en schermlezers zonder extra code. */
export function CollapsibleSection({ title, description, defaultOpen = false, ariaLabel, children }: Props) {
  return (
    <details open={defaultOpen} role="region" aria-label={ariaLabel ?? title} className="group rounded-2xl gradient-card border border-border">
      <summary className="flex items-center justify-between gap-3 p-5 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <ChevronDown className="w-5 h-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-5 pb-5 space-y-3">{children}</div>
    </details>
  );
}
