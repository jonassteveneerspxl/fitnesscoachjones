import { isValidRating, ratingColor, ratingEmoji, ratingLabel } from "@/utils/rating";

/** Klein label met smiley en cijfer; toont niets zonder geldige beoordeling. */
export function RatingBadge({ rating }: { rating?: number }) {
  if (!isValidRating(rating)) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
      style={{ borderColor: ratingColor(rating) }}
      title={ratingLabel(rating)}
      aria-label={`Beoordeling ${rating} van 10, ${ratingLabel(rating)}`}
    >
      <span aria-hidden>{ratingEmoji(rating)}</span>
      {rating}
    </span>
  );
}
