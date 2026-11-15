import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Props {
  /** Het begrip dat wordt uitgelegd, bv. "1RM". Komt in de knopnaam voor schermlezers. */
  term: string;
  children: ReactNode;
}

/** Klein infoknopje dat bij tikken een korte uitleg toont (tikbaar, dus ook bruikbaar op een telefoon). */
export function InfoTip({ term, children }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Uitleg: ${term}`}
          className="inline-flex items-center justify-center align-middle ml-1 h-5 w-5 rounded-full text-muted-foreground hover:text-foreground"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 text-xs leading-relaxed text-foreground" side="top">
        <p className="font-semibold mb-1">{term}</p>
        {children}
      </PopoverContent>
    </Popover>
  );
}
