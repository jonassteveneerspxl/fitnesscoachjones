import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { RATING_MAX, RATING_MIN, ratingColor, ratingEmoji, ratingLabel } from "@/utils/rating";

interface Props {
  open: boolean;
  /** Bestaande beoordeling bij wijzigen; anders een voorgestelde middenwaarde. */
  initial?: number;
  onSave: (rating: number) => void;
  onSkip: () => void;
}

const DEFAULT_RATING = 7;

/** "Hoe ging het?": een grote smiley en schuif van 1 tot 10 na het opslaan van een training. Overslaan kan altijd. */
export function RatingSheet({ open, initial, onSave, onSkip }: Props) {
  const [value, setValue] = useState(initial ?? DEFAULT_RATING);
  useEffect(() => {
    if (open) setValue(initial ?? DEFAULT_RATING);
  }, [open, initial]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onSkip()}>
      <DialogContent className="max-w-sm text-center">
        <DialogTitle>Hoe ging het?</DialogTitle>
        <DialogDescription>Sleep om je training een cijfer te geven. Zo zie je later je goede en slechte dagen.</DialogDescription>
        <div className="py-2" data-testid="rating-preview">
          <div className="text-7xl leading-none" aria-hidden>
            {ratingEmoji(value)}
          </div>
          <p className="mt-3 text-3xl font-bold" style={{ color: ratingColor(value) }}>
            {value}
            <span className="text-base font-normal text-muted-foreground"> / {RATING_MAX}</span>
          </p>
          <p className="text-sm text-muted-foreground">{ratingLabel(value)}</p>
        </div>
        <Slider
          aria-label="Beoordeling van je training"
          min={RATING_MIN}
          max={RATING_MAX}
          step={1}
          value={[value]}
          onValueChange={([v]) => setValue(v)}
          className="py-3"
        />
        <div className="flex justify-between text-xs text-muted-foreground -mt-1">
          <span>Zware dag</span>
          <span>Topdag</span>
        </div>
        <div className="flex gap-2 pt-2">
          <Button type="button" variant="ghost" className="flex-1" onClick={onSkip}>
            Overslaan
          </Button>
          <Button type="button" className="flex-1" onClick={() => onSave(value)}>
            Opslaan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
