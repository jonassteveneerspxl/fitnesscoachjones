import { useEffect, useState } from "react";

export interface ViewportBox {
  /** Hoogte van het zichtbare deel (zonder schermtoetsenbord). */
  height: number;
  /** Afstand van de bovenkant van het zichtbare deel tot de bovenkant van de pagina (iOS verschuift dit bij het toetsenbord). */
  offsetTop: number;
}

const read = (): ViewportBox => {
  const v = typeof window !== "undefined" ? window.visualViewport : null;
  return { height: v?.height ?? (typeof window !== "undefined" ? window.innerHeight : 0), offsetTop: v?.offsetTop ?? 0 };
};

/** Volgt het zichtbare deel van het scherm, dus ook wanneer het toetsenbord een stuk bedekt (iPhone en Android). */
export function useVisualViewport(active = true): ViewportBox {
  const [box, setBox] = useState<ViewportBox>(read);
  useEffect(() => {
    if (!active) return;
    const v = window.visualViewport;
    const update = () => setBox(read());
    update();
    v?.addEventListener("resize", update);
    v?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      v?.removeEventListener("resize", update);
      v?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [active]);
  return box;
}

let tallest = 0;

/** `true` zodra het toetsenbord een groot deel van het scherm bedekt; dan verbergen we de balk onderaan. */
export function useKeyboardOpen(): boolean {
  const { height } = useVisualViewport();
  if (typeof window !== "undefined") tallest = Math.max(tallest, window.innerHeight, height);
  return tallest > 0 && height < tallest * 0.75;
}
