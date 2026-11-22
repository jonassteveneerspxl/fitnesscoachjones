import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useBackToClose } from "@/hooks/useBackToClose";
import { CARDIO_ACTIVITIES } from "@/types/workout";
import { cardioActivities } from "@/utils/customExercises";

describe("Stairmaster", () => {
  it("staat bij de standaard cardiosoorten, vóór 'Andere'", () => {
    const list = cardioActivities([], CARDIO_ACTIVITIES);
    expect(list).toContain("Stairmaster");
    expect(list.indexOf("Stairmaster")).toBeLessThan(list.indexOf("Andere"));
  });
});

describe("terugknop sluit een open venster", () => {
  it("een terugstap sluit het venster, en sluiten op een andere manier haalt de extra stap weg", () => {
    const close = vi.fn();
    const { rerender, unmount } = renderHook(({ open }) => useBackToClose(open, close), { initialProps: { open: false } });
    const before = window.history.length;
    rerender({ open: true });
    expect(window.history.length).toBe(before + 1);
    expect(window.history.state.__sheet).toBe(true);
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(close).toHaveBeenCalledTimes(1);
    unmount();

    // Zelf sluiten (kruisje of kiezen): de extra geschiedenisstap wordt teruggedraaid.
    const back = vi.spyOn(window.history, "back");
    const second = renderHook(({ open }) => useBackToClose(open, vi.fn()), { initialProps: { open: true } });
    second.rerender({ open: false });
    expect(back).toHaveBeenCalledTimes(1);
    back.mockRestore();
  });
});
