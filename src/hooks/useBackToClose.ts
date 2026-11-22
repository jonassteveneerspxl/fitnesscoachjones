import { useEffect, useRef } from "react";

/**
 * Laat de terugknop (Android) of terugveeg (iPhone) een open venster sluiten in plaats van de pagina te verlaten.
 * Bij het openen komt er één extra stap in de geschiedenis; bij sluiten op een andere manier wordt die weer weggehaald.
 */
export function useBackToClose(open: boolean, close: () => void) {
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!open) return;
    window.history.pushState({ ...(window.history.state ?? {}), __sheet: true }, "");
    let closedByBack = false;
    const onPop = () => {
      closedByBack = true;
      closeRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (!closedByBack && window.history.state?.__sheet) window.history.back();
    };
  }, [open]);
}
